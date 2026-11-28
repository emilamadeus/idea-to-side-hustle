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

  The context window is a box above Claude's head. Everything it reads drops in as a page:
  cream for what you had to tell it, grey for text the task didn't need, yellow for what it
  did need, blue for memory (STATUS, HANDOFF). The box is why the cases differ: empty and
  guessing, full of grey, or a few yellow pages and room to spare. A session's box empties when
  it ends; the next one starts blank and has only the files.

  Layout zones (svg units):
    tip          x 80–540, y 110–240
    chat phone   x 80–520, y 262–568 (the app flow)
    case list    x 80–520, y 600–790 (active row highlighted, tokens, ✗ / ✓ when a case ends)
    scene        x 600–1480, y 150–780: a column (local x0..x0+440, y 300–760) scaled by S
    context box  local x cx-110..cx+30, y 300–476 (above the head); label above it
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
  pocket: true, // its tip goes to the phones' list (see deck.js)
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

    // the context window above Claude's head; pages stack up from the bottom
    const KIND = {
      you: { fill: '#fff3e3', ink: '#1a120c' },
      noise: { fill: '#4d4640', ink: '#b8aea3' },
      need: { fill: '#ffd23f', ink: '#1a120c' },
      mem: { fill: '#7fd0ff', ink: '#1a120c' },
      stale: { fill: '#6f6a63', ink: '#1a120c' },
      ok: { fill: '#8fe3a2', ink: '#1a120c' },
    };
    const PH = 21, PG = 3;
    const ctxBox = (g, cx) => {
      const x = cx - 110, y = 318, w = 140, h = 158;
      const root = D.g(g, { 'data-unit': '' });
      D.text(root, x, y - 9, 'CONTEXT', 'cx', { style: 'font: 700 12px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
      D.el('rect', { x, y, width: w, height: h, rx: 8, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2.5 }, root);
      const pages = [];
      const box = { root, pages, x, y, w, h };
      // a page pops in on the next free shelf (a cut, not a flight: nothing crosses the scene)
      box.add = (tl, label, kind, at) => {
        const k = pages.length;
        const py = y + h - 6 - (k + 1) * (PH + PG) + PG;
        const pg = D.g(root);
        const c = KIND[kind];
        const r = D.el('rect', { x: x + 6, y: py, width: w - 12, height: PH, rx: 3, style: `fill: ${c.fill}` }, pg);
        const t = D.text(pg, x + 13, py + 15, label, 'pl', { style: `font: 700 12px var(--font-mono); fill: ${c.ink}` });
        tl.fromTo(pg, { opacity: 0, scale: 0.6, svgOrigin: `${x + w / 2} ${py + PH / 2}` }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.4)' }, at);
        const page = { g: pg, r, t, kind };
        pages.push(page);
        return page;
      };
      box.recolor = (tl, page, kind, label, at) => {
        const c = KIND[kind];
        tl.to(page.r, { attr: { style: `fill: ${c.fill}` }, duration: 0.3 }, at);
        tl.call(() => { if (label) page.t.textContent = label; page.t.setAttribute('style', `font: 700 12px var(--font-mono); fill: ${c.ink}`); }, null, at + 0.15);
      };
      // the session ends: everything in it dissolves, top page first
      box.clear = (tl, at) => {
        const old = pages.splice(0).reverse(); // the shelves are free for what comes next
        old.forEach((pg, k) => tl.to(pg.g, { opacity: 0, y: -10, duration: 0.35, ease: 'power2.in' }, at + k * 0.08));
      };
      return box;
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
          const box = ctxBox(g, c.cx);
          gsap.set(g, { opacity: 0 });
          return { g, agent, box, ...c };
        });
        tl.fromTo(P.cols[0].g, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.6);
        activate(tl, 0, 0.6);
      }

      if (i === 1) {
        // 0 files: it asks what it knows to ask; every answer is a page you had to write
        // into its context (one of them twice), and what it didn't know to ask, it guesses
        const { g, agent, cx, box } = P.cols[0];
        const QA = [
          ['Hvor ligger testene?', 'I tests/.', 'tests/'],
          ['Hvor ligger bydelene?', 'I src/zones.ts.', 'src/zones.ts'],
          ['Hvordan kjører jeg testene?', 'Med vitest.', 'vitest'],
          ['Hvor ligger testene?', 'I tests/. Igjen.', 'tests/ igjen'],
        ];
        const c = P.chat;
        QA.forEach(([q, a, page], k) => {
          const t0 = 0.3 + k * 1.15;
          c.reply(tl, q, t0);
          agent.expr(tl, { mouth: 'talk', brows: 'raised' }, t0);
          agent.expr(tl, { mouth: 'neutral', brows: 'neutral' }, t0 + 0.4);
          c.user(tl, a, t0 + 0.55);
          box.add(tl, page, 'you', t0 + 0.7);
          tokens(tl, 0, 6 * (k + 1), t0 + 0.7, 0.4);
        });
        // the terminal on the desk, wrong command, crossed out
        const term = D.g(g, { 'data-unit': '' });
        D.el('rect', { x: cx - 150, y: 584, width: 200, height: 48, rx: 6, ...FILL('#120c08') }, term);
        D.text(term, cx - 138, 614, '$ npm install', 'tm', { style: 'font: 700 18px var(--font-mono); fill: #8fe3a2' });
        const strike = D.p(term, `M${cx - 144} 606 L${cx + 44} 614`, 'pencil');
        tl.fromTo(term, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 5.0);
        tl.add(D.drawOn(strike, { duration: 0.35 }), 5.6);
        agent.expr(tl, { mouth: 'smile', eyes: 'down' }, 5.1);
        verdict(tl, 0, false, 6.0);
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
        const NEEDED = ['Bydeler'];
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
        // every section it passes lands in the context, needed or not
        SECTIONS.forEach((h, k) => P.cols[1].box.add(tl, h, NEEDED.includes(h) ? 'need' : 'noise', 0.3 + (k + 0.6) * (2.6 / 6)));
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
        P.cols[2].box.add(tl, 'CLAUDE.md', 'you', 0.5);
        open.forEach((name, k) => P.cols[2].box.add(tl, name, 'need', 1.35 + k * 0.35));
        agent.expr(tl, { eyes: 'open', mouth: 'smile' }, 2.4);
        const ok = D.g(g, { 'data-bg': '' });
        D.el('circle', { cx: cx + 55, cy: 520, r: 22, style: 'fill: #1f9d63; stroke: #1a120c', 'stroke-width': 2.5 }, ok);
        D.p(ok, `M${cx + 45} 520 l7 8 l14 -16`, '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 4, 'stroke-linecap': 'round' });
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
        // the first worker is done and leaves; a new session takes the same chair (a cut, not a
        // walk: one fades out, then the other fades in), in another colour so it reads as new
        const { cx } = P.cols[2];
        const box = P.cols[2].box;
        box.clear(tl, 0);
        tl.to([agent.root, P.ok, P.card], { opacity: 0, duration: 0.4 }, 0.4);
        const s1 = figure(g, { x: cx - 40, y: 570, s: 0.72, arms: 'table', ...AGENT, color: '#2f5b5a' });
        g.insertBefore(s1.root, agent.root.nextSibling); // behind the desk, like the first one
        tl.fromTo(s1.root, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.9);
        ['STATUS', 'HANDOFF'].forEach((name, k) => {
          const dr = P.drawers.find((d) => d.name === name);
          tl.to(dr.dg, { x: -26, duration: 0.3, ease: 'back.out(2)' }, 1.6 + k * 0.3);
          tl.to(dr.face, { attr: { style: 'fill: #7fd0ff; stroke: #1a120c' }, duration: 0.2 }, 1.6 + k * 0.3);
          dr.dg.querySelector('text').setAttribute('style', 'font: 700 12px var(--font-mono); letter-spacing: .04em; fill: #1a120c');
          P[name] = box.add(tl, name, 'mem', 1.75 + k * 0.3);
        });
        // the drawers that the first session opened close again
        ['ARCHITECTURE', 'GOTCHAS', 'TESTING'].forEach((name) => {
          const dr = P.drawers.find((d) => d.name === name);
          tl.to(dr.dg, { x: 0, duration: 0.3 }, 0.4);
          tl.to(dr.face, { attr: { style: 'fill: #6a452c; stroke: #1a120c' }, duration: 0.2 }, 0.4);
          tl.call(() => dr.dg.querySelector('text').setAttribute('style', 'font: 700 12px var(--font-mono); letter-spacing: .04em; fill: #fff3e3'), null, 0.5);
        });
        s1.expr(tl, { eyes: 'open', mouth: 'smile' }, 2.0);
        // the app flow: a new session, no explaining needed
        P.chat.clear(tl, 0.2);
        P.chat.user(tl, 'Fortsett.', 0.6, { label: 'NY SESSION' });
        const t = P.chat.think(tl, 1.0, 0.8);
        P.chat.reply(tl, 'Leser STATUS og HANDOFF. Fortsetter der forrige session slapp.', t);
        P.s1 = s1;
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
        // the same page in its head: three days old, and it is all the session knows
        P.cols[2].box.recolor(tl, P.STATUS, 'stale', 'STATUS 3 DAGER', 0.4);
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
        P.cols[2].box.recolor(tl, P.STATUS, 'ok', 'STATUS I DAG', t + 0.3);
        tl.fromTo(P.STATUS.g, { scale: 1.15, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, t + 0.3);
        P.s1.expr(tl, { eyes: 'open', brows: 'neutral', mouth: 'smile' }, t + 0.4);
        const ok = D.g(g, { 'data-bg': '' });
        D.el('circle', { cx: 1110, cy: 520, r: 22, style: 'fill: #1f9d63; stroke: #1a120c', 'stroke-width': 2.5 }, ok);
        D.p(ok, 'M1100 520 l7 8 l14 -16', '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 4, 'stroke-linecap': 'round' });
        tl.fromTo(ok, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' }, t + 0.6);
        verdict(tl, 2, true, t + 0.7);
      }
      // focus: the case being shown and its row in the list; the rest steps back
      const F = { 1: 0, 2: 1, 3: 2, 4: 2, 5: 2, 6: 2 };
      if (F[i] !== undefined) ctx.focus(main, [P.cols[F[i]].g, P.tabs[F[i]].g, i >= 1 ? P.chat.root : null], 0.3);
      return main;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); } };
  },
};
