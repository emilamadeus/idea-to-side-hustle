import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, PALETTE } from '../engine/characters.js';
import { speech, chatPhone, meter, FILL } from '../engine/props.js';

/*
  Tip: split the instructions. The same task, three setups. The story runs in the app flow
  (the Claude chat on the left); the scene shows what Claude does.
    0 files  : asks everything, gets told four times, still installs with the wrong tool.
    1 file   : reads one long CLAUDE.md top to bottom (tokens climb). It works, but it is
               expensive: everything is read every time.
    several  : a short CLAUDE.md points to a cabinet; opens three drawers; done.
               A new session continues from STATUS / HANDOFF.
  Example: the firewood subscription (a new district). Twist: STATUS is three days old; the
  new session starts on pause, which is done.
         "Du har helt rett!" The fix: updating STATUS is part of finishing a task.

  One case at a time: each case is drawn in its own column coordinates (below) and
  shown scaled up in the scene area; the next case slides in and replaces it.

  Layout zones (svg units):
    tip          x 80–540, y 110–240
    chat phone   x 80–520, y 262–568 (the app flow)
    case list    x 80–520, y 600–790 (active row highlighted, tokens, ✗ / ✓ when a case ends)
    scene        x 600–1480, y 150–780: a column (local x0..x0+440, y 300–760) scaled by S
*/

const COL = [{ cx: 300, x0: 80 }, { cx: 780, x0: 560 }, { cx: 1260, x0: 1040 }];
const AGENT = { hair: 'short', hairColor: PALETTE.hair.dark, skin: PALETTE.skin[0], outfit: 'hoodie', color: '#c4562a' };
const DRAWERS = ['AGENTS.md', 'ARCHITECTURE', 'STATUS', 'HANDOFF', 'SPEC', 'DECISIONS', 'GOTCHAS', 'TESTING'];
const WOOD = '#4a3020', PAPER = '#fff3e3';
const S = 1.35, TX = 743, TY = 150;
const CASES = [{ label: '0 FILER' }, { label: '1 FIL', sub: 'CLAUDE.md / AGENTS.md' }, { label: 'FLERE FILER' }];

const CSS = `
.slide-md-files .md-tip { position: absolute; left: var(--pad); top: calc(var(--u) * 7); font-size: calc(var(--u) * 3.6); }
`;

export default {
  id: 'md-files',
  title: 'Instruksjonsfiler',
  steps: 7,
  notes: [
    'Tre like AI-arbeidere, samme oppgave. Forskjellen er instruksjonsfilene.',
    'Ingen filer: den spør om alt. Du forklarer fire ganger. Den installerer med feil verktøy.',
    'Én fil: bedre, den får det til. Men den leser hele CLAUDE.md hver gang, også Vipps og release. Dyrt.',
    'Flere filer: en kort CLAUDE.md peker videre. Den åpner bare skuffene den trenger.',
    'Nye sessions fortsetter der forrige slapp, fra STATUS og HANDOFF.',
    'STATUS er tre dager gammel. Ny session starter på pause, som er ferdig. «Du har helt rett!»',
    'Derfor: oppdatering av filene er en del av oppgaven. Da stemmer de for neste session.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <style>${CSS}</style>
      <div class="pin-tl label">Instruksjonsfiler</div>
      <h2 class="tip md-tip">Del opp<br><em>instruksjonene</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.md-tip');
    let P = {};
    let loops = [];

    const desk = (g, cx) => {
      D.el('rect', { x: cx - 160, y: 640, width: 240, height: 20, rx: 4, ...FILL(WOOD) }, g);
      D.p(g, `M${cx - 150} 660 V760 M${cx + 70} 660 V760`, 'ln');
    };

    // highlight one row of the case list; a case ends with ✗ or ✓
    const activate = (tl, k, at) => P.tabs.forEach((t, j) => {
      tl.to(t.bar, { opacity: j === k ? 1 : 0, duration: 0.3 }, at);
      tl.to(t.label, { attr: { style: `font: 700 24px var(--font-mono); letter-spacing: .06em; fill: ${j === k ? 'var(--accent-2)' : 'var(--muted)'}` }, duration: 0.2 }, at);
    });
    const verdict = (tl, k, ok, at) => {
      const t = P.tabs[k];
      tl.to(ok ? t.bad : t.good, { opacity: 0, duration: 0.15 }, at);
      tl.fromTo(ok ? t.good : t.bad, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' }, at);
    };
    // token usage for a case, in k tokens (bar max 50k; pink near the top)
    const tokens = (tl, k, v, at, d = 0.6) => {
      const t = P.tabs[k];
      const paint = () => {
        const f = Math.min(1, t.tok.v / 50);
        t.tf.setAttribute('width', 116 * f);
        t.tf.setAttribute('style', `fill: ${f > 0.8 ? '#ff6f9c' : '#ffd23f'}`);
        t.tv.textContent = `${Math.round(t.tok.v)}k`;
      };
      tl.to(t.tok, { v, duration: d, ease: 'power1.inOut', onUpdate: paint, onComplete: paint }, at);
    };
    // swap the scene to the next case
    const swap = (tl, from, to) => {
      tl.to(P.cols[from].g, { opacity: 0, x: -60, duration: 0.45, ease: 'power2.in' }, 0);
      tl.fromTo(P.cols[to].g, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 0.4);
      activate(tl, to, 0.3);
    };

    const reset = () => {
      loops.forEach((l) => l.kill()); loops = [];
      svg.innerHTML = '';
      P = {};
    };

    const play = (i, instant) => {
      let tl = gsap.timeline();
      const main = tl;

      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        // the same prompt, three setups
        // the app flow: what Claude says while it works lives in this conversation
        const chat = chatPhone(svg, 80, 262, 440, 306, { app: 'Claude', compact: true, size: 18 });
        tl.fromTo(chat.root, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, 0.3);
        chat.user(tl, 'Legg til en ny bydel.', 0.7);
        P.chat = chat;
        // the case list
        P.tabs = CASES.map((c, k) => {
          const g = D.g(svg);
          const y = 636 + k * 64 + (k === 2 ? 8 : 0);
          const bar = D.el('rect', { x: 80, y: y - 24, width: 6, height: c.sub ? 52 : 30, rx: 3, style: 'fill: var(--accent)', opacity: 0 }, g);
          const label = D.text(g, 104, y, c.label, 'tb', { style: 'font: 700 24px var(--font-mono); letter-spacing: .06em; fill: var(--muted)' });
          if (c.sub) D.text(g, 104, y + 27, c.sub, 'ts', { style: 'font: 400 15px var(--font-mono); fill: var(--muted)' });
          const bad = D.g(g, { opacity: 0 });
          D.el('circle', { cx: 494, cy: y - 9, r: 17, style: 'fill: #c4405e; stroke: #1a120c', 'stroke-width': 2 }, bad);
          D.p(bad, `M${487} ${y - 16} l14 14 M${501} ${y - 16} l-14 14`, '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 3.5, 'stroke-linecap': 'round' });
          const good = D.g(g, { opacity: 0 });
          D.el('circle', { cx: 494, cy: y - 9, r: 17, style: 'fill: #1f9d63; stroke: #1a120c', 'stroke-width': 2 }, good);
          D.p(good, `M${486} ${y - 9} l6 7 l12 -13`, '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 3.5, 'stroke-linecap': 'round' });
          // tokens this setup burns for the same task
          const tb = D.g(g, { 'data-unit': '' });
          D.el('rect', { x: 300, y: y - 24, width: 120, height: 16, rx: 5, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2 }, tb);
          const tf = D.el('rect', { x: 302, y: y - 22, width: 0, height: 12, rx: 3, style: 'fill: #ffd23f', 'data-bg': '' }, tb);
          const tv = D.text(tb, 466, y - 10, '', 'tv', { 'text-anchor': 'end', style: 'font: 800 20px var(--font-display); fill: var(--fg)' });
          tl.fromTo(g, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, 0.5 + k * 0.12);
          return { g, bar, label, bad, good, tf, tv, tok: { v: 0 } };
        });
        P.tokHead = D.text(svg, 300, 600, 'TOKENS', 'th', { style: 'font: 700 13px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        tl.fromTo(P.tokHead, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.6);
        // each case lives in its own column coordinates, shown scaled up in the scene
        P.cols = COL.map((c, k) => {
          const outer = D.g(svg, { transform: `translate(${TX - c.x0 * S} ${TY - 300 * S}) scale(${S})` });
          const g = D.g(outer);
          D.p(g, `M${c.x0} 760 H${c.x0 + 440}`, 'thin');
          const agent = figure(g, { x: c.cx - 40, y: 570, s: 0.72, arms: 'table', ...AGENT });
          desk(g, c.cx);
          gsap.set(g, { opacity: 0 });
          return { g, agent, ...c };
        });
        tl.fromTo(P.cols[0].g, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.6);
        activate(tl, 0, 0.6);
      }

      if (i === 1) {
        // 0 files: asks everything; you explain again and again; wrong tool anyway
        const { g, agent, cx } = P.cols[0];
        const qs = ['pnpm eller npm?', 'Hvor ligger testene?', 'Hvor ligger bydelene?', 'Hvor ligger testene?'];
        const tally = D.g(g, { 'data-unit': '', opacity: 0 });
        D.text(tally, 400, 456, 'FORKLART', 'cnl', { style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--note)' });
        const counter = D.text(tally, 400, 506, '', 'cnt', { style: 'font: 800 48px var(--font-display); fill: var(--note)' });
        tl.to(tally, { opacity: 1, duration: 0.2 }, 0.6);
        qs.forEach((q, k) => {
          const b = speech(g, 90, 370, q, [cx - 40, 478], { size: 20 }); // tail stops above the head
          const t0 = 0.2 + k * 1.0;
          tl.fromTo(b, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 }, t0);
          tl.to(b, { opacity: 0, duration: 0.2 }, t0 + 0.8);
          tl.call(() => { counter.textContent = `${k + 1}×`; }, null, t0 + 0.4);
          tokens(tl, 0, 6 * (k + 1), t0 + 0.4, 0.4);
          tl.fromTo(counter, { scale: 1.5, transformOrigin: '0% 100%' }, { scale: 1, duration: 0.3, ease: 'back.out(3)', immediateRender: false }, t0 + 0.4);
          agent.expr(tl, { mouth: 'talk', brows: 'raised' }, t0);
          agent.expr(tl, { mouth: 'neutral', brows: 'neutral' }, t0 + 0.6);
        });
        // the terminal on the desk, wrong command, crossed out
        const term = D.g(g, { 'data-unit': '' });
        D.el('rect', { x: cx - 150, y: 584, width: 200, height: 48, rx: 6, ...FILL('#120c08') }, term);
        D.text(term, cx - 138, 614, '$ npm install', 'tm', { style: 'font: 700 18px var(--font-mono); fill: #8fe3a2' });
        const strike = D.p(term, `M${cx - 144} 606 L${cx + 44} 614`, 'pencil');
        tl.fromTo(term, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 4.3);
        tl.add(D.drawOn(strike, { duration: 0.35 }), 4.9);
        agent.expr(tl, { mouth: 'smile', eyes: 'down' }, 4.4);
        verdict(tl, 0, false, 5.3);
      }

      if (i === 2) {
        // 1 file: everything in one long CLAUDE.md. It reads all of it, every time,
        // and an outdated line in a section nobody maintains decides what it does.
        swap(tl, 0, 1);
        tl = gsap.timeline(); main.add(tl, 0.9);
        const { g, agent } = P.cols[1];
        const doc = D.g(g, { 'data-unit': '' });
        const DX = 870, DW = 125, DY = 318, DH = 436;
        D.el('rect', { x: DX, y: DY, width: DW, height: DH, rx: 4, style: `fill: ${PAPER}` }, doc);
        D.el('rect', { x: DX, y: DY, width: DW, height: 24, rx: 4, style: 'fill: #c9ad92' }, doc);
        D.text(doc, DX + DW / 2, DY + 17, 'CLAUDE.md', 'dn', { 'text-anchor': 'middle', style: 'font: 700 13px var(--font-mono); fill: #1a120c' });
        const SECTIONS = ['Vipps', 'Release', 'Design', 'Bydeler', 'Ruter', 'Gamle notater'];
        let lines = '';
        SECTIONS.forEach((h, k) => {
          const y = DY + 46 + k * 68;
          D.text(doc, DX + 10, y, `## ${h}`, 'dh', { style: 'font: 700 12px var(--font-mono); fill: #7a5a3a' });
          for (let r = 0; r < 4; r++) lines += `M${DX + 10} ${y + 12 + r * 11} H${DX + 70 + ((k * 31 + r * 17) % 45)} `;
        });
        D.p(doc, lines, '', { style: 'fill: none; stroke: #b9a88f', 'stroke-width': 3, 'stroke-linecap': 'round' });
        tl.fromTo(doc, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0);
        // the reading highlight sweeps through every section; the tokens follow
        const read = D.el('rect', { x: DX, y: DY + 26, width: DW, height: 26, style: 'fill: #ffd23f', opacity: 0, 'data-bg': '' }, g);
        g.insertBefore(read, doc.nextSibling);
        tl.to(read, { opacity: 0.35, duration: 0.2 }, 0.3);
        tl.to(read, { attr: { y: DY + DH - 28 }, duration: 2.6, ease: 'none' }, 0.3);
        tl.to(read, { opacity: 0, duration: 0.2 }, 2.9);
        tokens(tl, 1, 46, 0.3, 2.6);
        agent.expr(tl, { eyes: 'down', brows: 'tired' }, 0.3);
        const c = P.chat;
        // each case is its own clean session with the same prompt
        c.clear(tl, 0);
        c.user(tl, 'Legg til en ny bydel.', 0.15, { label: 'NY SESSION' });
        c.reply(tl, 'Leser hele CLAUDE.md.', 0.5);
        // it works, but it read everything to get there
        c.reply(tl, 'Ferdig. Bydelen er lagt til.', 3.2);
        agent.expr(tl, { eyes: 'open', brows: 'neutral', mouth: 'smile' }, 3.2);
        verdict(tl, 1, true, 3.6);
      }

      if (i === 3) {
        // several files: a short CLAUDE.md points into a cabinet; only three drawers open
        swap(tl, 1, 2);
        tl = gsap.timeline(); main.add(tl, 0.9);
        const { g, agent, cx } = P.cols[2];
        P.chat.clear(tl, 0);
        P.chat.user(tl, 'Legg til en ny bydel.', 0.15, { label: 'NY SESSION' });
        const card = D.g(g, { 'data-unit': '' });
        D.el('rect', { x: cx - 150, y: 588, width: 110, height: 44, rx: 3, style: `fill: ${PAPER}` }, card);
        D.text(card, cx - 142, 606, 'CLAUDE.md', 'cm', { style: 'font: 700 12px var(--font-mono); fill: #1a120c' });
        D.p(card, `M${cx - 142} 616 h60 M${cx - 142} 624 h44`, '', { style: 'stroke: #8a7a66', 'stroke-width': 2.5 });
        tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.2);
        P.card = card;
        // cabinet
        const cab = D.g(g, { 'data-unit': '' });
        D.el('rect', { x: 1340, y: 390, width: 136, height: 370, rx: 4, ...FILL(WOOD) }, cab);
        P.drawers = DRAWERS.map((name, k) => {
          const dg = D.g(cab, { 'data-unit': '' });
          const y = 398 + k * 45;
          const face = D.el('rect', { x: 1346, y, width: 124, height: 39, rx: 3, ...FILL('#6a452c', 2) }, dg);
          D.text(dg, 1408, y + 25, name, 'dr', { 'text-anchor': 'middle', style: 'font: 700 12px var(--font-mono); letter-spacing: .04em; fill: #fff3e3' });
          return { dg, face, name };
        });
        tl.fromTo(cab, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.5 }, 0.4);
        const open = ['ARCHITECTURE', 'GOTCHAS', 'TESTING'];
        open.forEach((name, k) => {
          const dr = P.drawers.find((d) => d.name === name);
          tl.to(dr.dg, { x: -26, duration: 0.3, ease: 'back.out(2)' }, 1.2 + k * 0.35);
          tl.to(dr.face, { attr: { style: 'fill: #ffd23f; stroke: #1a120c' }, duration: 0.2 }, 1.2 + k * 0.35);
        });
        P.drawers.filter((d) => open.includes(d.name)).forEach((d) => d.dg.querySelector('text').setAttribute('style', 'font: 700 12px var(--font-mono); letter-spacing: .04em; fill: #1a120c'));
        tokens(tl, 2, 7, 1.2, 0.8);
        agent.expr(tl, { eyes: 'open', mouth: 'smile' }, 2.4);
        const ok = D.g(g, { 'data-bg': '' });
        D.el('circle', { cx: cx - 40, cy: 452, r: 22, style: 'fill: #1f9d63; stroke: #1a120c', 'stroke-width': 2.5 }, ok);
        D.p(ok, `M${cx - 50} 452 l7 8 l14 -16`, '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 4, 'stroke-linecap': 'round' });
        tl.fromTo(ok, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' }, 2.6);
        // it reads only the relevant files, and works from what they say
        P.chat.reply(tl, 'Leste ARCHITECTURE, GOTCHAS og TESTING.', 1.4);
        P.chat.reply(tl, 'Legger bydelen i sone-tabellen, med migrering og test, slik TESTING beskriver.', 2.4);
        verdict(tl, 2, true, 2.8);
        P.ok = ok;
      }

      if (i === 4) {
        // new sessions pick up where the last one stopped
        const { g, agent } = P.cols[2];
        // the first worker is done and leaves; two new sessions take over
        tl.to([agent.root, P.ok, P.card], { opacity: 0, duration: 0.4 }, 0);
        // new sessions stand on the floor in front of the desk (feet at y 760)
        const s1 = figure(g, { x: 1580, y: 621, s: 0.55, pose: 'stand', arms: 'down', ...AGENT, color: '#8a4a2a' });
        const s2 = figure(g, { x: 1640, y: 621, s: 0.55, pose: 'stand', arms: 'down', ...AGENT, color: '#a35a2e' });
        tl.fromTo(s1.root, { opacity: 0, x: -410 }, { x: -410, opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.5); // fades in where it stands
        tl.fromTo(s2.root, { opacity: 0, x: -380 }, { x: -380, opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.7);
        ['STATUS', 'HANDOFF'].forEach((name, k) => {
          const dr = P.drawers.find((d) => d.name === name);
          tl.to(dr.dg, { x: -26, duration: 0.3, ease: 'back.out(2)' }, 1.3 + k * 0.3);
          tl.to(dr.face, { attr: { style: 'fill: #7fd0ff; stroke: #1a120c' }, duration: 0.2 }, 1.3 + k * 0.3);
          dr.dg.querySelector('text').setAttribute('style', 'font: 700 12px var(--font-mono); letter-spacing: .04em; fill: #1a120c');
        });
        s1.expr(tl, { eyes: 'open', mouth: 'smile' }, 1.6);
        s2.expr(tl, { eyes: 'open', mouth: 'smile' }, 1.9);
        // the app flow: a new session, no explaining needed
        P.chat.clear(tl, 0.2);
        P.chat.user(tl, 'Fortsett.', 0.6, { label: 'NY SESSION' });
        const t = P.chat.think(tl, 1.0, 0.8);
        P.chat.reply(tl, 'Leser STATUS og HANDOFF. Fortsetter der forrige session slapp.', t);
        P.s1 = s1; P.s2 = s2;
      }

      if (i === 5) {
        // STATUS was never updated. A new session trusts it and starts on finished work.
        const { g } = P.cols[2];
        const dr = P.drawers.find((d) => d.name === 'STATUS');
        const dust = D.g(g, { 'data-bg': '' });
        D.p(dust, 'M1322 488 q14 -2 22 -14 M1322 488 q6 10 22 12 M1322 488 l22 -4 M1330 486 q4 6 2 12 M1336 480 q6 4 6 10', 'thin', { opacity: 0.9 });
        tl.to(dr.face, { attr: { style: 'fill: #6f6a63; stroke: #1a120c' }, duration: 0.6 }, 0);
        tl.fromTo(dust, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.2);
        P.dust = dust;
        P.tag = D.text(g, 1476, 378, 'STATUS · 3 DAGER GAMMEL', 'tag', { 'text-anchor': 'end', style: 'font: 700 14px var(--font-mono); letter-spacing: .06em; fill: var(--note)' });
        tl.fromTo(P.tag, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4);
        const c = P.chat;
        c.clear(tl, 0.2);
        c.user(tl, 'Fortsett.', 0.6, { label: 'NY SESSION' });
        let t = c.think(tl, 1.0, 0.8);
        c.reply(tl, 'STATUS sier «Jobber med pause». Starter på pause-funksjonen.', t);
        P.s1.expr(tl, { eyes: 'open', mouth: 'smile', brows: 'neutral' }, t);
        c.user(tl, 'Pause ble ferdig for tre dager siden.', t + 1.4);
        t = c.think(tl, t + 2.0, 0.8);
        c.reply(tl, 'Du har helt rett! Pause ble fullført for tre dager siden. Jeg ruller tilbake det jeg startet og tar neste oppgave på listen: bestilling.', t);
        P.s1.expr(tl, { eyes: 'down', brows: 'raised', mouth: 'neutral' }, t);
        verdict(tl, 2, false, t + 0.4);
      }

      if (i === 6) {
        // the fix: updating the files is part of finishing a task
        const { g } = P.cols[2];
        const dr = P.drawers.find((d) => d.name === 'STATUS');
        const c = P.chat;
        c.user(tl, 'Oppdater STATUS når du er ferdig med en oppgave.', 0.2);
        const t = c.think(tl, 0.8, 0.8);
        c.reply(tl, 'Gjort. STATUS: pause ferdig, neste er bestilling.', t);
        tl.to(dr.face, { attr: { style: 'fill: #7fd0ff; stroke: #1a120c' }, duration: 0.3 }, t + 0.2);
        tl.to(P.dust, { opacity: 0, duration: 0.3 }, t + 0.2);
        tl.call(() => { P.tag.textContent = 'STATUS · OPPDATERT I DAG'; P.tag.setAttribute('style', 'font: 700 14px var(--font-mono); letter-spacing: .06em; fill: #8fe3a2'); }, null, t + 0.3);
        tl.fromTo(P.tag, { scale: 1.3, transformOrigin: '100% 50%' }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, t + 0.3);
        P.s1.expr(tl, { eyes: 'open', brows: 'neutral', mouth: 'smile' }, t + 0.4);
        P.s2.expr(tl, { mouth: 'smile' }, t + 0.5);
        const ok = D.g(g, { 'data-bg': '' });
        D.el('circle', { cx: 1180, cy: 516, r: 20, style: 'fill: #1f9d63; stroke: #1a120c', 'stroke-width': 2.5 }, ok);
        D.p(ok, 'M1171 516 l6 7 l13 -14', '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 4, 'stroke-linecap': 'round' });
        tl.fromTo(ok, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' }, t + 0.6);
        verdict(tl, 2, true, t + 0.7);
      }
      // focus: the case being shown and its row in the list; the rest steps back
      const F = { 1: 0, 2: 1, 3: 2, 4: 2, 5: 2, 6: 2 };
      if (F[i] !== undefined) ctx.focus(main, [P.cols[F[i]].g, P.tabs[F[i]].g, i >= 2 ? P.chat.root : null], 0.3);
      return main;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); } };
  },
};
