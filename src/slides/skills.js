import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, FILL } from '../engine/props.js';

/*
  Tip: turn what you repeat into a skill. The real one from the 3D asset pipeline: Claude needs
  concept images in one exact style, so it wrote a skill for ChatGPT.
    0. Without a skill: the same long prompt every time (style, angles, size, file name, folder).
       Four requests come back in four different looks, saved under four random names.
    1. Claude writes the skill once: concept-image-skill, the recipe on one card.
    2. New session, one line: "concept-image-skill medieval castle furniture 50". Fifty different
       pieces (chairs, tables, chests, beds, shelves …), all in the same style, land in
       medieval/castle/furniture/.
    3. Nobody has to type it: ChatGPT reads the order in the shared file and runs the skill.
       (Sets up the Claude ↔ ChatGPT loop in Bak kulissene.)

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    attempt    x 560–960, y 120–154
    phone      x 80–520, y 262–782 (ChatGPT)
    step 0     four sheets x 620–1458, y 210–450; file names y 486
    step 1     skill card x 760–1320, y 196–606
    step 2     50 tiles x 624–1456, y 200–522; folder strip x 624–1456, y 560–640
    step 3     shared file x 700–1380, y 220–470
*/

// one sheet: a chair drawn in a given style
function chair(g, x, y, w, h, st) {
  D.el('rect', { x, y, width: w, height: h, rx: Math.min(10, w * 0.06), style: `fill: ${st.sheet}; stroke: ${st.edge || 'none'}`, 'stroke-width': 2 }, g);
  const cx = x + w / 2, cy = y + h * 0.56, s = Math.min(w, h) / 120;
  const ink = { style: `fill: ${st.fill}; stroke: ${st.ink}`, 'stroke-width': st.sw * s + 0.6, 'stroke-linejoin': 'round' };
  if (st.pixel) {
    const p = 8 * s;
    [[-2, -5], [-2, -4], [-2, -3], [-2, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [-2, 0], [1, 0], [-2, 1], [1, 1]]
      .forEach(([i, j]) => D.el('rect', { x: cx + i * p, y: cy + j * p, width: p, height: p, style: `fill: ${st.fill}` }, g));
    return;
  }
  D.el('rect', { x: cx - 26 * s, y: cy - 52 * s, width: 10 * s, height: 62 * s, rx: 2 * s, ...ink }, g); // back post
  D.el('rect', { x: cx - 26 * s, y: cy - 4 * s, width: 50 * s, height: 10 * s, rx: 2 * s, ...ink }, g);  // seat
  D.el('rect', { x: cx - 26 * s, y: cy + 6 * s, width: 7 * s, height: 30 * s, rx: 2 * s, ...ink }, g);  // legs
  D.el('rect', { x: cx + 17 * s, y: cy + 6 * s, width: 7 * s, height: 30 * s, rx: 2 * s, ...ink }, g);
  D.el('rect', { x: cx - 26 * s, y: cy - 46 * s, width: 30 * s, height: 8 * s, rx: 2 * s, ...ink }, g);  // back rail
}
// fifty different pieces in one style: the same palette and line on every sheet, a new piece each time
const PIECES = [
  // [x, y, w, h] rects in a 100×100 box, bottom at y 80
  [[18, 20, 10, 60], [18, 46, 50, 10], [18, 56, 7, 24], [61, 56, 7, 24], [18, 24, 34, 8]],         // chair
  [[12, 40, 76, 10], [18, 50, 8, 30], [74, 50, 8, 30]],                                            // table
  [[30, 46, 40, 9], [33, 55, 6, 25], [61, 55, 6, 25], [47, 55, 6, 25]],                            // stool
  [[8, 50, 84, 9], [12, 59, 7, 21], [81, 59, 7, 21], [8, 38, 84, 6]],                              // bench
  [[16, 40, 68, 40], [16, 34, 68, 10], [46, 46, 8, 10]],                                           // chest
  [[24, 12, 52, 68], [49, 16, 2, 60], [40, 42, 6, 8], [54, 42, 6, 8]],                             // cabinet
  [[8, 50, 84, 16], [8, 30, 10, 50], [82, 44, 10, 36], [20, 44, 22, 8]],                           // bed
  [[20, 12, 60, 68], [24, 30, 52, 4], [24, 48, 52, 4], [24, 64, 52, 4]],                           // shelf
  [[30, 24, 40, 56], [27, 34, 46, 5], [27, 66, 46, 5]],                                            // barrel
  [[46, 22, 8, 50], [34, 72, 32, 8], [40, 14, 20, 8], [47, 4, 6, 10]],                             // candle stand
];
function piece(g, x, y, w, h, k, st) {
  D.el('rect', { x, y, width: w, height: h, rx: 4, style: `fill: ${st.sheet}` }, g);
  const parts = PIECES[k % PIECES.length];
  const sc = Math.min(w, h) / 100 * (0.82 + ((k * 37) % 5) * 0.04); // a little variety in size
  const ox = x + w / 2 - 50 * sc, oy = y + h * 0.5 - 46 * sc;
  parts.forEach(([px, py, pw, ph]) => D.el('rect', { x: ox + px * sc, y: oy + py * sc, width: pw * sc, height: ph * sc, rx: 1.5, style: `fill: ${st.fill}; stroke: ${st.ink}`, 'stroke-width': 1.4 }, g));
}
// the house style the skill fixes
const HOUSE = { sheet: '#efe4d2', fill: '#c9935a', ink: '#3a2416', sw: 3 };
// what four free-hand requests came back as
const DRIFT = [
  { sheet: '#dfe9f2', fill: '#7fa7c9', ink: '#2c4a66', sw: 1.5 },
  { sheet: '#3a3a3a', fill: '#9a9a9a', ink: '#1a1a1a', sw: 2 },
  { sheet: '#f7e9a8', fill: '#e05a3a', ink: '#5a1a0a', sw: 0, pixel: true },
  { sheet: '#fff3e3', fill: 'none', ink: '#6b5a48', sw: 2.5, edge: '#cdbfae' },
];

export default {
  id: 'skills',
  title: 'Skills',
  steps: 4,
  notes: [
    'Uten skill: samme lange prompt hver gang. Fire bestillinger, fire stiler, fire tilfeldige filnavn.',
    'Claude skriver oppskriften én gang: stil, vinkler, format, filnavn, mappe.',
    'Nå er det én linje. Femti forskjellige møbler, samme stil, rett i riktig mappe.',
    'Og ingen trenger å skrive den: ChatGPT leser bestillingen i den delte fila. Mer om den sløyfa senere.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Arbeidsflyt</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Gjør det du gjentar<br>til en <em>skill</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    const reset = () => { svg.innerHTML = ''; P = {}; };
    const mono = (size, fill) => `font: 700 ${size}px var(--font-mono); fill: ${fill}`;

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'UTEN SKILL', 0.3);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'ChatGPT', size: 17 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, 'Konseptark av en middelaldersk stol. Tegnet stil, varm palett, tre vinkler, lys bakgrunn, 2048 px. Kall den stol_01 og legg den i medieval/castle/furniture.', 0.8);
        const t = P.chat.think(tl, 1.6, 1.0);
        P.chat.reply(tl, 'Her er konseptarket.', t);
        // four requests, four looks, four names
        P.sheets = D.g(svg);
        const names = ['IMG_2231.png', 'stol (2).png', 'download.png', 'konsept_ny.png'];
        DRIFT.forEach((st, k) => {
          const x = 620 + k * 216;
          const g = D.g(P.sheets, { 'data-unit': '' });
          chair(g, x, 210, 190, 240, st);
          D.text(g, x + 95, 486, names[k], 'fn', { 'text-anchor': 'middle', style: mono(15, 'var(--muted)') });
          tl.fromTo(g, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4 }, t + 0.3 + k * 0.45);
        });
      }

      if (i === 1) {
        // Claude writes the recipe once
        tl.to(P.sheets, { opacity: 0, duration: 0.4 }, 0);
        const c = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 760, y: 196, width: 560, height: 410, rx: 16, style: 'fill: #1d1510; stroke: var(--accent)', 'stroke-width': 2.5 }, c);
        D.text(c, 790, 240, 'concept-image-skill', 'sk', { style: 'font: 800 28px var(--font-mono); fill: var(--accent)' });
        D.text(c, 790, 270, 'SKREVET AV CLAUDE', 'sb', { style: 'font: 700 13px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
        D.p(c, 'M790 290 H1290', '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2 });
        const rows = [
          ['Stil', 'tegnet, varm palett, lys bakgrunn'],
          ['Vinkler', 'front, side, tre kvart'],
          ['Format', '2048 px, PNG'],
          ['Filnavn', '<underkategori>_<nr>.png'],
          ['Mappe', '<era>/<kategori>/<underkategori>/'],
          ['Inn', '<era> <kategori> <underkategori> <antall>'],
        ];
        rows.forEach(([k, v], j) => {
          const y = 334 + j * 46;
          const r = D.g(c);
          D.text(r, 790, y, k, 'rk', { style: mono(15, 'var(--muted)') });
          D.text(r, 900, y, v, 'rv', { style: 'font: 600 19px var(--font-display); fill: var(--fg)' });
          tl.fromTo(r, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3 }, 0.9 + j * 0.25);
        });
        tl.fromTo(c, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.5);
        P.card = c;
      }

      if (i === 2) {
        // a new session: one line
        P.att.show(tl, 'MED SKILL · NY SESSION', 0);
        P.chat.clear(tl, 0);
        tl.to(P.card, { opacity: 0, duration: 0.4 }, 0);
        P.chat.user(tl, 'concept-image-skill medieval castle furniture 50', 0.6);
        const t = P.chat.think(tl, 1.2, 1.0);
        P.chat.reply(tl, '50 konseptark lagret i medieval/castle/furniture/.', t);
        // fifty sheets, one style
        P.grid = D.g(svg, { 'data-unit': '' });
        const tiles = [];
        for (let r = 0; r < 5; r++) for (let q = 0; q < 10; q++) {
          const g = D.g(P.grid);
          piece(g, 624 + q * 84, 200 + r * 66, 76, 58, r * 10 + q * 3 + r, HOUSE);
          tiles.push(g);
        }
        tl.fromTo(tiles, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.25, stagger: 0.03, ease: 'back.out(2)' }, t + 0.3);
        const f = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 624, y: 560, width: 832, height: 80, rx: 12, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2 }, f);
        D.text(f, 648, 592, 'medieval/castle/furniture/', 'fp', { style: mono(18, 'var(--accent)') });
        D.text(f, 648, 622, 'furniture_01.png   furniture_02.png   …   furniture_50.png', 'ff', { style: mono(16, 'var(--fg)') });
        tl.fromTo(f, { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 1.9);
        P.folder = f;
      }

      if (i === 3) {
        // nobody types it: ChatGPT reads the order in the shared file
        tl.to([P.grid, P.folder], { opacity: 0, duration: 0.4 }, 0);
        const q = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 700, y: 220, width: 680, height: 250, rx: 14, style: 'fill: #fff3e3' }, q);
        D.text(q, 726, 256, 'asset-queue.md', 'qf', { style: mono(16, '#7a5a3a') });
        D.text(q, 726, 300, 'Bestilt av Claude:', 'qh', { style: 'font: 700 18px var(--font-display); fill: #1a120c' });
        const lines = ['medieval castle furniture 50', 'medieval castle kitchen 30', 'medieval village tools 40'];
        const marks = lines.map((l, k) => {
          const y = 346 + k * 40;
          // the box ticks in place: [ ] becomes [x]
          const m = D.text(q, 726, y, k === 0 ? '[x]' : '[ ]', 'qb', { style: mono(18, k === 0 ? '#1f9d63' : '#7a5a3a') });
          D.text(q, 776, y, `concept-image-skill ${l}`, 'ql', { style: 'font: 700 18px var(--font-mono); fill: #1a120c' });
          return m;
        });
        tl.fromTo(q, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.5);
        // no prompt from anyone: ChatGPT checks the file on its own
        let t = P.chat.think(tl, 1.2, 1.4, { label: 'Leser asset-queue.md' });
        P.chat.reply(tl, 'medieval castle kitchen 30: ferdig.', t);
        tl.call(() => { marks[1].textContent = '[x]'; marks[1].setAttribute('style', mono(18, '#1f9d63')); }, null, t + 0.1);
        t = P.chat.think(tl, t + 0.8, 1.2, { label: 'Leser asset-queue.md' });
        P.chat.reply(tl, 'medieval village tools 40: ferdig.', t);
        tl.call(() => { marks[2].textContent = '[x]'; marks[2].setAttribute('style', mono(18, '#1f9d63')); }, null, t + 0.1);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
