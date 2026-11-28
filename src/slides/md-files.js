import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, PALETTE } from '../engine/characters.js';
import { chatPhone, FILL } from '../engine/props.js';

/*
  Tip: split the instructions. The same task ("add a new district") in three setups, then what
  happens when the next session takes over. The story runs in the Claude chat on the left; the
  scene shows Claude at a desk and the project's file tree, where every file it reads lights up.
  Each file has a bar for its size, and the tokens in the case list are the sum of what is lit:
  the cost is literally what it read.

    0 files    : no map, so it searches: most of src/ lights up before it finds zones.ts. Nobody
                 told it about pnpm, so it installs with npm.
    1 file     : one huge CLAUDE.md, opened as a block under its row (Vipps, Release, Design, …),
                 read top to bottom, then the right code.
    several    : the block splits: CLAUDE.md shrinks to an index and docs/ appears where the
                 block was. A nested src/CLAUDE.md opens under src/ (the rows below slide down one).
                 It reads three docs; the moment it enters src/, the nested file loads by itself
                 (tagged AUTO); then straight to zones.ts and its test.
    new session: every light goes out (a session remembers nothing); it reads STATUS and HANDOFF.
    stale      : STATUS is three days old; it starts on finished work. "Du har helt rett!"
    fix        : updating STATUS is part of finishing a task.

  Each case is a clean session: the lights go out first. CLAUDE.md and docs/ sit at the bottom
  of the tree, so nothing above them ever moves.

  Layout zones (svg units):
    tip          x 80–540, y 110–240
    chat phone   x 80–520, y 262–568 (the app flow)
    case list    x 80–520, y 600–790 (active row highlighted, tokens, ✗ / ✓ when a case ends)
    desk scene   x 600–990, y 300–770 (Claude, desk, the terminal in case 0, the ✓)
    file tree    x 1020–1480, y 150–770 (header, then one row per file)
*/

const AGENT = { hair: 'short', hairColor: PALETTE.hair.dark, skin: PALETTE.skin[0], outfit: 'hoodie', color: '#c4562a' };
const WOOD = '#4a3020';
const CASES = [{ label: '0 FILER' }, { label: '1 FIL', sub: 'CLAUDE.md / AGENTS.md' }, { label: 'FLERE FILER' }];

// the tree: [id, label, depth, size in k tokens]; folders have no size
const TREE = [
  ['src', 'src/', 0],
  ['nested', 'CLAUDE.md', 1, 1],
  ['orders', 'api/orders.ts', 1, 6],
  ['delivery', 'api/delivery.ts', 1, 5],
  ['map', 'ui/Map.tsx', 1, 7],
  ['order', 'ui/Order.tsx', 1, 6],
  ['routes', 'routes.ts', 1, 4],
  ['vipps', 'vipps.ts', 1, 5],
  ['zones', 'zones.ts', 1, 3],
  ['schema', 'db/schema.sql', 1, 4],
  ['tests', 'tests/', 0],
  ['ordersT', 'orders.test.ts', 1, 4],
  ['zonesT', 'zones.test.ts', 1, 2],
  ['pkg', 'package.json', 0, 1],
  ['claude', 'CLAUDE.md', 0, 1],
  ['docs', 'docs/', 0],
  ['ARCHITECTURE', 'ARCHITECTURE.md', 1, 2],
  ['GOTCHAS', 'GOTCHAS.md', 1, 1],
  ['TESTING', 'TESTING.md', 1, 1],
  ['STATUS', 'STATUS.md', 1, 1],
  ['HANDOFF', 'HANDOFF.md', 1, 1],
];
const DOCS = ['docs', 'ARCHITECTURE', 'GOTCHAS', 'TESTING', 'STATUS', 'HANDOFF'];
const TX = 1020, TW = 460, TY = 186, RH = 28;
const NEST = 1; // the nested src/CLAUDE.md: its row opens (the rows below slide down) in case 2
const BX = 1380, KPX = 12; // size bar: 12 units per k tokens (the largest code file is 7k)
const BIG = 30; // the one big CLAUDE.md, in k tokens
const SECTIONS = ['## Vipps', '## Release', '## Design', '## Bydeler', '## Ruter', '## Gamle notater'];

const LIT = {
  read: { row: '#ffd23f' },
  mem: { row: '#7fd0ff' },
  stale: { row: '#8a847c' },
  ok: { row: '#8fe3a2' },
};

const CSS = `
.slide-md-files .md-tip { position: absolute; left: var(--pad); top: calc(var(--u) * 7); font-size: calc(var(--u) * 3.6); }
`;

export default {
  id: 'md-files',
  pocket: true, // its tip goes to the phones' list (see deck.js)
  title: 'Instruksjonsfiler',
  steps: 7,
  notes: [
    'Samme oppgave, tre oppsett. Til høyre: prosjektet. Det som lyser, er det Claude leser. Tokens er summen.',
    'Ingen filer: den leter seg gjennom koden. Nesten alt lyser. Og den installerer med feil verktøy.',
    'Én fil: den får det til, men leser hele den lange CLAUDE.md hver gang. Dyrt.',
    'Flere filer: samme innhold, delt opp. En kort CLAUDE.md peker videre, tre filer i docs. CLAUDE.md i src/ lastes av seg selv når den går inn der.',
    'Ny session: alt slukker, den husker ingenting. Den leser STATUS og HANDOFF og fortsetter.',
    'STATUS er tre dager gammel. Den starter på pause, som er ferdig. «Du har helt rett!»',
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
    const lit = new Set();
    let spent = 0;

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
    // the case's tokens: bar max 50k, pink near the top
    const setTokens = (tl, k, v, at, d = 0.25) => {
      const t = P.tabs[k];
      const paint = () => {
        const f = Math.min(1, t.tok.v / 50);
        t.tf.setAttribute('width', 116 * f);
        t.tf.setAttribute('style', `fill: ${f > 0.8 ? '#ff6f9c' : '#ffd23f'}`);
        t.tv.textContent = `${Math.round(t.tok.v)}k`;
      };
      tl.to(t.tok, { v, duration: d, ease: 'power1.out', onUpdate: paint, onComplete: paint }, at);
    };

    // ---------- the file tree ----------
    const buildTree = () => {
      const root = D.g(svg);
      const head = D.g(root, { 'data-unit': '' });
      D.text(head, TX, 160, 'PROSJEKTET', 'th', { style: 'font: 700 14px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
      P.count = D.text(head, TX + TW, 160, '', 'tc', { 'text-anchor': 'end', style: 'font: 700 14px var(--font-mono); letter-spacing: .08em; fill: var(--accent-2)' });
      D.p(root, `M${TX} 172 H${TX + TW}`, '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2, 'data-bg': '' });
      P.rows = {};
      TREE.forEach(([id, label, depth, size], k) => {
        // rows below the nested file sit one row up until it opens
        const y = TY + (k > NEST ? k - 1 : k) * RH;
        const g = D.g(root, { 'data-unit': '' });
        const hl = D.el('rect', { x: TX, y: y - 2, width: TW, height: RH - 4, rx: 4, style: 'fill: #ffd23f', opacity: 0, 'data-bg': '' }, g);
        const folder = size == null;
        const x = TX + 12 + depth * 24;
        if (folder) D.p(g, `M${x} ${y + 6} h7 l3 3 h10 v11 h-20 Z`, '', { style: 'fill: #a8774c; stroke: none' });
        else D.p(g, `M${x + 2} ${y + 4} h11 l5 5 v14 h-16 Z`, '', { style: 'fill: #6f5848; stroke: none' });
        const name = D.text(g, x + 30, y + 19, label, 'tn', { style: `font: 700 16px var(--font-mono); fill: ${folder ? 'var(--fg)' : 'var(--muted)'}` });
        let bar = null, fill = null;
        if (!folder) {
          bar = D.el('rect', { x: BX, y: y + 8, width: size * KPX, height: 10, rx: 3, style: 'fill: #2a1f17' }, g);
          fill = D.el('rect', { x: BX, y: y + 8, width: 0, height: 10, rx: 3, style: 'fill: #ffd23f', 'data-bg': '' }, g);
        }
        P.rows[id] = { g, hl, name, bar, fill, size, folder, y };
        if (id === 'claude' || id === 'nested' || DOCS.includes(id)) gsap.set(g, { opacity: 0 });
      });
      // case 1: the one big CLAUDE.md, opened under its row (where docs/ will be later)
      const r = P.rows.claude;
      const blk = D.g(root, { 'data-unit': '', opacity: 0 });
      const by = r.y + RH, bh = 6 * 28 + 8;
      D.el('rect', { x: TX + 30, y: by, width: TW - 30, height: bh, rx: 6, style: 'fill: #fff3e3' }, blk);
      const sweep = D.el('rect', { x: TX + 30, y: by + 4, width: TW - 30, height: 26, style: 'fill: #ffd23f', opacity: 0, 'data-bg': '' }, blk);
      SECTIONS.forEach((s, k) => {
        D.text(blk, TX + 46, by + 24 + k * 28, s, 'sec', { style: 'font: 700 15px var(--font-mono); fill: #7a5a3a' });
        D.p(blk, `M${TX + 250} ${by + 19 + k * 28} H${TX + 300 + ((k * 37) % 120)}`, '', { style: 'fill: none; stroke: #c9b79c', 'stroke-width': 4, 'stroke-linecap': 'round', 'data-bg': '' });
      });
      P.block = { g: blk, sweep, by, bh };
      return root;
    };
    // light a file: its row, its name, its size bar; the case's tokens follow
    const read = (tl, id, at, kind = 'read', k = P.case, d = 0.25) => {
      const r = P.rows[id];
      const c = LIT[kind];
      tl.to(r.hl, { opacity: 0.22, attr: { style: `fill: ${c.row}` }, duration: 0.2 }, at);
      tl.to(r.name, { attr: { style: `font: 700 16px var(--font-mono); fill: ${r.folder ? 'var(--fg)' : c.row}` }, duration: 0.2 }, at);
      if (r.fill) tl.to(r.fill, { attr: { width: Math.min(r.size, 8) * KPX, style: `fill: ${c.row}` }, duration: d }, at);
      if (!r.folder && !lit.has(id)) {
        lit.add(id); spent += r.size;
        const n = lit.size;
        tl.call(() => { P.count.textContent = `LEST: ${n} ${n === 1 ? 'FIL' : 'FILER'}`; }, null, at);
        if (k != null) setTokens(tl, k, spent, at, d);
      }
    };
    // a new session: every light goes out
    const lightsOut = (tl, at) => {
      Object.values(P.rows).forEach((r) => {
        tl.to(r.hl, { opacity: 0, duration: 0.35 }, at);
        tl.to(r.name, { attr: { style: `font: 700 16px var(--font-mono); fill: ${r.folder ? 'var(--fg)' : 'var(--muted)'}` }, duration: 0.35 }, at);
        if (r.fill) tl.to(r.fill, { attr: { width: 0 }, duration: 0.35 }, at);
      });
      tl.call(() => { P.count.textContent = ''; }, null, at);
      lit.clear(); spent = 0;
    };
    const showRows = (tl, ids, at) => ids.forEach((id, k) => tl.to(P.rows[id].g, { opacity: 1, duration: 0.3 }, at + k * 0.08));

    // ---------- the desk ----------
    const buildDesk = () => {
      const g = D.g(svg);
      D.p(g, 'M600 760 H990', 'thin');
      const agent = figure(g, { x: 770, y: 470, s: 0.95, arms: 'table', ...AGENT });
      D.el('rect', { x: 610, y: 600, width: 360, height: 22, rx: 4, ...FILL(WOOD) }, g);
      D.p(g, 'M626 622 V760 M954 622 V760', 'ln');
      return { g, agent };
    };
    const check = (tl, at) => {
      const ok = D.g(svg, { 'data-unit': '' });
      D.el('circle', { cx: 650, cy: 380, r: 24, style: 'fill: #1f9d63; stroke: #1a120c', 'stroke-width': 2.5 }, ok);
      D.p(ok, 'M639 380 l8 9 l15 -17', '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 4, 'stroke-linecap': 'round' });
      tl.fromTo(ok, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' }, at);
      return ok;
    };
    // the next case: a clean session with the same prompt
    const nextCase = (tl, k) => {
      const gone = [P.ok, P.term].filter(Boolean);
      if (gone.length) tl.to(gone, { opacity: 0, duration: 0.3 }, 0);
      P.ok = null;
      lightsOut(tl, 0);
      activate(tl, k, 0.2);
      P.case = k;
      P.chat.clear(tl, 0);
      P.chat.user(tl, 'Legg til en ny bydel.', 0.2, { label: 'NY SESSION' });
    };

    const reset = () => { svg.innerHTML = ''; P = {}; lit.clear(); spent = 0; };

    const play = (i) => {
      const tl = gsap.timeline();

      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const chat = chatPhone(svg, 80, 262, 440, 306, { app: 'Claude', compact: true, size: 18 });
        tl.fromTo(chat.root, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, 0.3);
        chat.user(tl, 'Legg til en ny bydel.', 0.7);
        P.chat = chat;
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
          const tb = D.g(g, { 'data-unit': '' });
          D.el('rect', { x: 300, y: y - 24, width: 120, height: 16, rx: 5, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2 }, tb);
          const tf = D.el('rect', { x: 302, y: y - 22, width: 0, height: 12, rx: 3, style: 'fill: #ffd23f', 'data-bg': '' }, tb);
          const tv = D.text(tb, 466, y - 10, '', 'tv', { 'text-anchor': 'end', style: 'font: 800 20px var(--font-display); fill: var(--fg)' });
          tl.fromTo(g, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, 0.5 + k * 0.12);
          return { g, bar, label, bad, good, tf, tv, tok: { v: 0 } };
        });
        P.tokHead = D.text(svg, 300, 600, 'TOKENS', 'th', { style: 'font: 700 13px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        tl.fromTo(P.tokHead, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.6);
        P.desk = buildDesk();
        P.tree = buildTree();
        tl.fromTo(P.desk.g, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.6);
        tl.fromTo(P.tree, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.8);
        activate(tl, 0, 0.6);
        P.case = 0;
      }

      if (i === 1) {
        // 0 files: no map, so it searches the code until it finds the districts
        const c = P.chat, agent = P.desk.agent;
        c.reply(tl, 'Leter etter hvor bydelene ligger.', 0.2);
        agent.expr(tl, { eyes: 'down', brows: 'tired' }, 0.3);
        const search = ['orders', 'delivery', 'map', 'order', 'routes', 'vipps', 'schema', 'zones', 'ordersT', 'zonesT'];
        search.forEach((id, k) => read(tl, id, 0.6 + k * 0.3));
        const t = 0.6 + search.length * 0.3;
        c.reply(tl, 'Fant src/zones.ts. Installerer først.', t + 0.2);
        // nobody told it about pnpm: the terminal on the desk, wrong command, crossed out
        const term = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 846, y: 532, width: 128, height: 60, rx: 6, ...FILL('#120c08') }, term);
        D.text(term, 858, 569, '$ npm i', 'tm', { style: 'font: 700 18px var(--font-mono); fill: #8fe3a2' });
        const strike = D.p(term, 'M852 560 L966 568', 'pencil');
        tl.fromTo(term, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 0.6);
        tl.add(D.drawOn(strike, { duration: 0.35 }), t + 1.2);
        agent.expr(tl, { eyes: 'open', brows: 'neutral', mouth: 'smile' }, t + 0.6);
        verdict(tl, 0, false, t + 1.6);
        P.term = term;
      }

      if (i === 2) {
        // 1 file: one long CLAUDE.md, read top to bottom every time; then the right code
        nextCase(tl, 1);
        showRows(tl, ['claude'], 0.4);
        const r = P.rows.claude, b = P.block;
        r.size = BIG;
        tl.to(r.bar, { attr: { width: 8 * KPX }, duration: 0.3 }, 0.5);
        tl.fromTo(b.g, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 }, 0.6);
        const c = P.chat, agent = P.desk.agent;
        c.reply(tl, 'Leser hele CLAUDE.md.', 0.9);
        agent.expr(tl, { eyes: 'down', brows: 'tired' }, 1.0);
        // the reading highlight sweeps every section; the tokens climb with it
        tl.to(b.sweep, { opacity: 0.4, duration: 0.2 }, 1.1);
        tl.to(b.sweep, { attr: { y: b.by + 4 + 5 * 28 }, duration: 2.2, ease: 'none' }, 1.1);
        tl.to(b.sweep, { opacity: 0, duration: 0.2 }, 3.3);
        read(tl, 'claude', 1.1, 'read', 1, 2.2);
        ['zones', 'zonesT'].forEach((id, k) => read(tl, id, 3.5 + k * 0.3));
        c.reply(tl, 'Ferdig. Bydelen er lagt til.', 4.1);
        agent.expr(tl, { eyes: 'open', brows: 'neutral', mouth: 'smile' }, 4.1);
        P.ok = check(tl, 4.3);
        verdict(tl, 1, true, 4.4);
      }

      if (i === 3) {
        // several files: the block splits; CLAUDE.md shrinks to an index and docs/ takes its place
        nextCase(tl, 2);
        const r = P.rows.claude, b = P.block;
        tl.to(b.g, { opacity: 0, y: 10, duration: 0.4 }, 0.3);
        r.size = 1;
        tl.to(r.bar, { attr: { width: KPX }, duration: 0.4, ease: 'power2.out' }, 0.4);
        // the nested file opens a row under src/: everything below slides down together
        const below = TREE.slice(NEST + 1).map(([id]) => P.rows[id].g);
        tl.to(below, { y: RH, duration: 0.45, ease: 'power2.inOut' }, 0.7);
        showRows(tl, ['nested'], 1.1);
        showRows(tl, DOCS, 1.2);
        const c = P.chat, agent = P.desk.agent;
        read(tl, 'claude', 1.7);
        ['ARCHITECTURE', 'GOTCHAS', 'TESTING'].forEach((id, k) => read(tl, id, 2.0 + k * 0.3));
        c.reply(tl, 'Leste ARCHITECTURE, GOTCHAS og TESTING.', 2.3);
        // entering src/ loads its CLAUDE.md by itself; nobody had to point to it
        read(tl, 'nested', 3.0);
        const nr = P.rows.nested;
        const auto = D.text(nr.g, BX - 14, nr.y + 19, 'AUTO', 'auto', { 'text-anchor': 'end', style: 'font: 700 14px var(--font-mono); letter-spacing: .1em; fill: var(--accent-2)' });
        tl.fromTo(auto, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 3.0);
        P.auto = auto;
        ['zones', 'zonesT'].forEach((id, k) => read(tl, id, 3.4 + k * 0.3));
        c.reply(tl, 'Legger bydelen i zones.ts, med test, slik TESTING beskriver.', 3.7);
        agent.expr(tl, { eyes: 'open', mouth: 'smile' }, 3.7);
        P.ok = check(tl, 4.0);
        verdict(tl, 2, true, 4.1);
      }

      if (i === 4) {
        // the session ends: Claude remembers nothing. A new one (teal) reads the memory files.
        const { g, agent } = P.desk;
        lightsOut(tl, 0);
        tl.to(P.auto, { attr: { style: 'font: 700 14px var(--font-mono); letter-spacing: .1em; fill: var(--muted)' }, duration: 0.35 }, 0);
        tl.to([agent.root, P.ok].filter(Boolean), { opacity: 0, duration: 0.4 }, 0.3);
        P.ok = null;
        const s1 = figure(g, { x: 770, y: 470, s: 0.95, arms: 'table', ...AGENT, color: '#2f5b5a' });
        g.insertBefore(s1.root, agent.root.nextSibling); // behind the desk, like the first one
        tl.fromTo(s1.root, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.8);
        P.chat.clear(tl, 0.2);
        P.chat.user(tl, 'Fortsett.', 0.6, { label: 'NY SESSION' });
        const t = P.chat.think(tl, 1.0, 0.8);
        ['STATUS', 'HANDOFF'].forEach((id, k) => read(tl, id, 1.5 + k * 0.3, 'mem', null));
        P.chat.reply(tl, 'Leser STATUS og HANDOFF. Fortsetter der forrige session slapp.', t);
        s1.expr(tl, { eyes: 'open', mouth: 'smile' }, t);
        P.s1 = s1;
      }

      if (i === 5) {
        // STATUS was never updated. The new session trusts it and starts on finished work.
        const r = P.rows.STATUS;
        P.age = D.text(r.g, BX - 14, r.y + 19, '3 DAGER', 'age', { 'text-anchor': 'end', style: 'font: 700 15px var(--font-mono); fill: var(--note)' });
        tl.fromTo(P.age, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
        read(tl, 'STATUS', 0.2, 'stale', null);
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
        const c = P.chat;
        c.user(tl, 'Oppdater STATUS når du er ferdig med en oppgave.', 0.2);
        const t = c.think(tl, 0.8, 0.8);
        c.reply(tl, 'Gjort. STATUS: pause ferdig, neste er bestilling.', t);
        read(tl, 'STATUS', t + 0.2, 'ok', null);
        tl.call(() => { P.age.textContent = 'I DAG'; P.age.setAttribute('style', 'font: 700 15px var(--font-mono); fill: #8fe3a2'); }, null, t + 0.3);
        tl.fromTo(P.age, { scale: 1.3, transformOrigin: '100% 50%' }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, t + 0.3);
        P.s1.expr(tl, { eyes: 'open', brows: 'neutral', mouth: 'smile' }, t + 0.4);
        P.ok = check(tl, t + 0.6);
        verdict(tl, 2, true, t + 0.7);
      }
      // focus: the scene, the chat and the active case; the other cases step back
      if (i >= 1) ctx.focus(tl, [P.desk.g, P.tree, P.chat.root, P.tabs[Math.min(2, i - 1)].g, P.term, P.ok].filter(Boolean), 0.3);
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
