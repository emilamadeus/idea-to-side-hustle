import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, FILL } from '../engine/props.js';

/*
  Tip: let the AI keep a living HTML spec.
    0. A spec page; statuses change by themselves while the AI works.
    1. A blocked task opens: why it is blocked, and the line to what it waits for lights up.
    2. X-ray: a scan bar sweeps down and shows the layer only agents read.
    3. A colleague asks for status; "Kopier status" drops a short summary into the reply. 👍
    4. They ask about one task; that row's own copy button drops all of it: status, why, what
       it waits for, the plan.
    5. Each task also has "✻ prompt": a one-line prompt with the task's id (check its status in
       the spec and go from there). Pasted into Claude, which reads the spec and picks it up.
    6. The page becomes the real spec of this talk, live.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    colleague  x 80–520, y 280–700 (step 3 only)
    page       x 600–1480, y 130–770 (browser frame; rows y 250–700)
*/

const PX = 600, PY = 130, PW = 880, PH = 640;
const ROWS = [
  { id: 'K1', name: 'Innstillinger → opptaksregler', st: 'aktiv', to: 'ferdig' },
  { id: 'K2', name: 'Privacy mode', st: 'todo', to: 'aktiv' },
  { id: 'K3', name: 'Varsel når kamera går offline', st: 'blokkert' },
  { id: 'K4', name: 'Opptak i appen', st: 'todo' },
  { id: 'G7', name: 'Gateway build 412', st: 'venter' },
];
const ST = { ferdig: '#8fe3a2', aktiv: '#ff7a2f', todo: '#9b8f83', blokkert: '#ff6f9c', venter: '#ffd23f' };
const HIDDEN = [
  '<!-- KUN FOR AGENTER',
  'Oppdater status når en oppgave endres.',
  'Én logglinje per session.',
  'Blokkert? Skriv hvorfor og hva den venter på.',
  'Ikke spør om det som står her.',
  '-->',
];

export default {
  id: 'spec',
  title: 'Levende spec',
  steps: 7,
  notes: [
    'En spec i HTML. AI-en oppdaterer den mens den jobber.',
    'Åpne en oppgave: hvorfor den er blokkert, og hva den venter på.',
    'Røntgen: det skjulte laget som bare agentene leser.',
    'Kollega spør om status. Kopier, lim inn.',
    'Spør de om én oppgave, kopierer du den: status, hvorfor, hva den venter på, planen.',
    'Hver oppgave har også en prompt-knapp: «Sjekk status på K3 og fortsett derfra.» Claude leser specen selv.',
    'Og dette er specen for denne presentasjonen.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Spec</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">La AI-en føre en<br><em>levende spec</em>.</h2>
      <iframe class="sp-real" src="" style="position:absolute;left:calc(var(--u)*${(PX + 2) / 16});top:calc(var(--u)*${(PY + 46) / 16});width:calc(var(--u)*${(PW - 4) / 16});height:calc(var(--u)*${(PH - 48) / 16});border:0;border-radius:0 0 calc(var(--u)*.6) calc(var(--u)*.6);opacity:0;pointer-events:none;background:#16100b"></iframe>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    const frame = ctx.$('.sp-real');
    // DOM layers sit above the drawing so the drawn window frames them
    [frame].forEach((n) => el.appendChild(n));
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; gsap.set(frame, { opacity: 0, pointerEvents: 'none' }); };
    const chip = (g, x, y, st) => {
      const c = D.g(g);
      const w = st.length * 10.2 + 26;
      const box = D.el('rect', { x: x - w, y: y - 22, width: w, height: 30, rx: 15, style: `fill: none; stroke: ${ST[st]}`, 'stroke-width': 2.5 }, c);
      const t = D.text(c, x - w / 2, y - 1, st, 'chip', { 'text-anchor': 'middle', style: `font: 700 17px var(--font-mono); fill: ${ST[st]}` });
      c.set = (s) => {
        const w2 = s.length * 10.2 + 26;
        box.setAttribute('x', x - w2); box.setAttribute('width', w2); box.setAttribute('style', `fill: none; stroke: ${ST[s]}`);
        t.setAttribute('x', x - w2 / 2); t.textContent = s; t.setAttribute('style', `font: 700 17px var(--font-mono); fill: ${ST[s]}`);
      };
      return c;
    };
    const cursor = (g) => {
      const c = D.g(g, { 'data-bg': '' });
      D.p(c, 'M0 0 L0 30 L8 23 L14 36 L20 33 L14 21 L24 21 Z', '', FILL('#fff3e3', 2));
      return c;
    };

    function page() {
      const g = D.g(svg);
      const chrome = D.g(g, { 'data-unit': '' });
      D.el('rect', { x: PX, y: PY, width: PW, height: PH, rx: 12, style: 'fill: #1d1510; stroke: var(--fg)', 'stroke-width': 2.5, 'data-bg': '' }, chrome);
      D.el('rect', { x: PX, y: PY, width: PW, height: 46, rx: 12, style: 'fill: #2a1f17' }, chrome);
      [0, 1, 2].forEach((k) => D.el('circle', { cx: PX + 24 + k * 22, cy: PY + 23, r: 7, style: `fill: ${['#ff6f9c', '#ffd23f', '#8fe3a2'][k]}` }, chrome));
      D.el('rect', { x: PX + 110, y: PY + 10, width: 420, height: 26, rx: 13, style: 'fill: #16100b' }, chrome);
      P.url = D.text(chrome, PX + 128, PY + 29, 'kamera-tjenesten/spec.html', 'url', { style: 'font: 400 15px var(--font-mono); fill: var(--muted)' });
      const body = D.g(g);
      D.text(body, PX + 40, PY + 96, 'Kamera-tjenesten', 'pt', { style: 'font: 800 34px var(--font-display); fill: var(--fg)' });
      P.copy = D.g(body, { 'data-unit': '' });
      D.el('rect', { x: PX + PW - 230, y: PY + 70, width: 190, height: 38, rx: 8, style: 'fill: var(--accent); stroke: none' }, P.copy);
      D.text(P.copy, PX + PW - 135, PY + 95, 'Kopier status', 'cp', { 'text-anchor': 'middle', style: 'font: 700 17px var(--font-mono); fill: #1a120c' });
      P.rows = ROWS.map((r, k) => {
        const rg = D.g(body, { 'data-unit': '' });
        const y = PY + 170 + k * 74;
        D.el('rect', { x: PX + 30, y: y - 36, width: PW - 60, height: 60, rx: 8, style: 'fill: #241a13; stroke: none', 'data-bg': '' }, rg);
        D.text(rg, PX + 50, y + 2, r.id, 'rid', { style: 'font: 700 17px var(--font-mono); fill: var(--muted)' });
        D.text(rg, PX + 110, y + 2, r.name, 'rn', { style: 'font: 600 22px var(--font-display); fill: var(--fg)' });
        const c = chip(rg, PX + PW - 50, y + 2, r.st);
        // per task: copy everything about this one task
        const cpy = D.g(rg);
        D.el('rect', { x: PX + PW - 214, y: y - 22, width: 34, height: 32, rx: 7, style: 'fill: #2c2119; stroke: #6b5a48', 'stroke-width': 2 }, cpy);
        D.el('rect', { x: PX + PW - 205, y: y - 16, width: 13, height: 15, rx: 2, style: 'fill: none; stroke: #cfc3b2', 'stroke-width': 2 }, cpy);
        D.el('rect', { x: PX + PW - 200, y: y - 11, width: 13, height: 15, rx: 2, style: 'fill: #2c2119; stroke: #cfc3b2', 'stroke-width': 2 }, cpy);
        // and a ready prompt for this task, written from where it stands
        const ai = D.g(rg);
        D.el('rect', { x: PX + PW - 318, y: y - 22, width: 94, height: 32, rx: 16, style: 'fill: #2c2119; stroke: #ff7a2f', 'stroke-width': 2 }, ai);
        D.text(ai, PX + PW - 271, y, '✻ prompt', 'aip', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); fill: #ff9a5f' });
        return { g: rg, chip: c, y, cpy, ai };
      });
      return { g, body };
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.page = page();
        tl.fromTo(P.page.g, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, 0.3);
        tl.fromTo(P.rows.map((r) => r.g), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.08 }, 0.6);
        // the AI updates it while it works: nobody touches the page
        ROWS.forEach((r, k) => {
          if (!r.to) return;
          const at = 1.8 + k * 0.9;
          tl.call(() => P.rows[k].chip.set(r.to), null, at);
          tl.fromTo(P.rows[k].chip, { scale: 1.25, transformOrigin: '100% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(3)', immediateRender: false }, at);
        });
      }

      if (i === 1) {
        // a blocked task opens; the dependency lights up
        const r = P.rows[2];
        const below = P.rows.slice(3).map((x) => x.g);
        tl.to(below, { y: 104, duration: 0.4, ease: 'power2.inOut' }, 0);
        const det = D.g(P.page.body, { 'data-unit': '' });
        D.el('rect', { x: PX + 30, y: r.y + 30, width: PW - 60, height: 96, rx: 8, style: 'fill: #1a120c; stroke: #ff6f9c', 'stroke-width': 2, 'data-bg': '' }, det);
        D.text(det, PX + 50, r.y + 66, 'Gatewayen sender ingen hendelse når et kamera faller ut.', 'd1', { style: 'font: 400 18px var(--font-mono); fill: var(--fg)' });
        D.text(det, PX + 50, r.y + 102, 'Avhenger av: G7 Gateway build 412', 'd2', { style: 'font: 700 18px var(--font-mono); fill: #ffd23f' });
        tl.fromTo(det, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.35 }, 0.35);
        const g7 = P.rows[4];
        const line = D.p(P.page.body, `M${PX + 30} ${r.y + 94} C${PX - 20} ${r.y + 94} ${PX - 20} ${g7.y + 104} ${PX + 30} ${g7.y + 104}`, '', { style: 'fill: none; stroke: #ffd23f', 'stroke-width': 4, 'stroke-dasharray': '2 10', 'stroke-linecap': 'round', 'data-bg': '' });
        tl.add(D.drawOn(line, { duration: 0.6 }), 0.8);
        tl.to(g7.g.querySelector('rect'), { attr: { style: 'fill: #3a2c12; stroke: #ffd23f; stroke-width: 2' }, duration: 0.3 }, 1.3);
        P.det = det; P.line = line;
        ctx.focus(tl, [r.g, g7.g, det, line], 0.3);
      }

      if (i === 2) {
        // x-ray: what only the agents read
        const xr = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: PX + 2, y: PY + 48, width: PW - 4, height: PH - 50, style: 'fill: #0b1510; stroke: none', 'data-bg': '' }, xr);
        HIDDEN.forEach((l, k) => D.text(xr, PX + 50, PY + 130 + k * 56, l, 'hx', { style: `font: ${k === 0 || k === HIDDEN.length - 1 ? 700 : 400} 24px var(--font-mono); fill: ${k === 0 || k === HIDDEN.length - 1 ? '#5fae74' : '#8fe3a2'}` }));
        const cp = D.el('clipPath', { id: 'sp-xr' }, svg);
        const cr = D.el('rect', { x: PX, y: PY + 48, width: PW, height: 0 }, cp);
        xr.setAttribute('clip-path', 'url(#sp-xr)');
        const bar = D.el('rect', { x: PX, y: PY + 46, width: PW, height: 6, style: 'fill: #8fe3a2', opacity: 0, 'data-bg': '' }, svg);
        tl.to(bar, { opacity: 1, duration: 0.1 }, 0);
        tl.to(bar, { attr: { y: PY + PH - 6 }, duration: 1.6, ease: 'power1.inOut' }, 0.1);
        tl.to(cr, { attr: { height: PH - 50 }, duration: 1.6, ease: 'power1.inOut' }, 0.1);
        tl.to(bar, { opacity: 0, duration: 0.2 }, 1.7);
        tl.set(P.page.body, { opacity: 0 }, 1.7);
        tl.call(() => { P.url.textContent = 'kamera-tjenesten/spec.html  ·  kildekode'; }, null, 0.1);
        P.xr = xr; P.cr = cr;
      }

      if (i === 3) {
        // back to the page; a colleague asks
        tl.to(P.cr, { attr: { height: 0 }, duration: 0.6, ease: 'power1.inOut' }, 0);
        tl.set(P.xr, { opacity: 0 }, 0.6);
        tl.set(P.page.body, { opacity: 1 }, 0);
        tl.call(() => { P.url.textContent = 'kamera-tjenesten/spec.html'; }, null, 0);
        tl.to([P.det, P.line], { opacity: 0, duration: 0.3 }, 0.1);
        tl.to(P.rows.slice(3).map((x) => x.g), { y: 0, duration: 0.4 }, 0.2);
        const chat = chatPhone(svg, 80, 280, 440, 440, { app: 'Meldinger', size: 18 });
        tl.fromTo(chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        chat.reply(tl, 'Hvordan ligger kamera-tjenesten an?', 0.8);
        // copy status: a cursor clicks, the text drops into the reply
        const cur = cursor(svg);
        tl.fromTo(cur, { x: PX + 500, y: PY + 400, opacity: 0 }, { x: PX + PW - 140, y: PY + 92, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 1.5);
        tl.to(P.copy, { scale: 0.92, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1 }, 2.35);
        const lines = ['Opptaksregler: ferdig.', 'Privacy mode: i arbeid.', 'Offline-varsel: venter på', 'gateway build 412.'];
        const fly = D.g(svg, { 'data-bg': '' });
        D.el('rect', { x: PX + PW - 230, y: PY + 70, width: 190, height: 38, rx: 8, style: 'fill: #e7dccb' }, fly);
        tl.fromTo(fly, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 2.5);
        tl.to(fly, { x: -760, y: 220, scale: 0.6, opacity: 0, duration: 0.6, ease: 'power2.in' }, 2.6);
        tl.to(cur, { opacity: 0, duration: 0.3 }, 2.8);
        const msg = chat.user(tl, lines, 3.1);
        // the colleague reacts with a thumbs up on the message
        const bb = msg.getBBox();
        const thumb = D.g(msg);
        D.el('circle', { cx: bb.x - 4, cy: bb.y + bb.height - 4, r: 19, style: 'fill: #2c2119; stroke: var(--fg)', 'stroke-width': 2 }, thumb);
        D.text(thumb, bb.x - 4, bb.y + bb.height + 3, '👍', 'th', { 'text-anchor': 'middle', style: 'font-size: 20px' });
        tl.fromTo(thumb, { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' }, 4.3);
        ctx.focus(tl, [chat.root, P.copy, cur, fly], 1.4);
        P.chat = chat;
      }

      if (i === 4) {
        // one task in depth: that row's own copy button
        const chat = P.chat;
        chat.reply(tl, 'Hva venter offline-varselet på?', 0.3);
        const r = P.rows[2];
        const cur = cursor(svg);
        tl.fromTo(cur, { x: PX + 500, y: PY + 500, opacity: 0 }, { x: PX + PW - 200, y: r.y - 8, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 1.0);
        tl.to(r.cpy, { scale: 0.85, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1 }, 1.85);
        tl.to(r.g.querySelector('rect'), { attr: { style: 'fill: #2c2119; stroke: #ff7a2f; stroke-width: 2' }, duration: 0.2 }, 1.85);
        const fly = D.g(svg, { 'data-bg': '' });
        D.el('rect', { x: PX + PW - 214, y: r.y - 22, width: 34, height: 32, rx: 7, style: 'fill: #e7dccb' }, fly);
        tl.fromTo(fly, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 2.0);
        tl.to(fly, { x: -720, y: 180, scale: 2, opacity: 0, duration: 0.6, ease: 'power2.in' }, 2.1);
        tl.to(cur, { opacity: 0, duration: 0.3 }, 2.3);
        chat.user(tl, ['Varsel når kamera går offline:', 'blokkert. Gatewayen sender ingen', 'hendelse når et kamera faller ut.', 'Venter på gateway build 412.', 'Plan: varsle innen ett minutt.'], 2.6);
        ctx.focus(tl, [chat.root, r.g, cur, fly], 0.3);
      }

      if (i === 5) {
        // the task's own prompt, into Claude
        tl.to(P.chat.root, { opacity: 0, duration: 0.3 }, 0);
        const claude = chatPhone(svg, 80, 280, 440, 440, { app: 'Claude', size: 18 });
        tl.fromTo(claude.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        const r = P.rows[2];
        const cur = cursor(svg);
        tl.fromTo(cur, { x: PX + 500, y: PY + 500, opacity: 0 }, { x: PX + PW - 290, y: r.y - 8, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 0.7);
        tl.to(r.ai, { scale: 0.88, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1 }, 1.55);
        const fly = D.g(svg, { 'data-bg': '' });
        D.el('rect', { x: PX + PW - 318, y: r.y - 22, width: 94, height: 32, rx: 16, style: 'fill: #ff7a2f' }, fly);
        tl.fromTo(fly, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 1.7);
        tl.to(fly, { x: -640, y: 160, opacity: 0, duration: 0.6, ease: 'power2.in' }, 1.8);
        tl.to(cur, { opacity: 0, duration: 0.3 }, 2.0);
        claude.user(tl, ['Sjekk status på K3 i spec.html', 'og fortsett derfra.'], 2.3);
        const t = claude.think(tl, 3.1, 1.0);
        claude.reply(tl, 'K3 venter på G7. Build 412 er ute nå, så jeg starter på K3.', t);
        ctx.focus(tl, [claude.root, r.g, cur, fly], 0.3);
        P.chat = claude;
      }

      if (i === 6) {
        // this talk's own spec, live
        tl.to(P.chat.root, { opacity: 0, duration: 0.3 }, 0);
        tl.to(P.page.body, { opacity: 0, duration: 0.4 }, 0.1);
        tl.call(() => {
          P.url.textContent = 'ai-workflow-talk/docs/spec.html';
          if (!frame.getAttribute('src')) frame.setAttribute('src', '/docs/spec.html');
        }, null, 0.3);
        tl.to(frame, { opacity: 1, duration: 0.6, onComplete: () => gsap.set(frame, { pointerEvents: 'auto' }) }, 0.5);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { frame.removeAttribute('src'); } };
  },
};
