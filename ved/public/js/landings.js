import * as D from './draw.js';
import { varmPeis } from './varmpeis.js';

/*
  The four visual directions for the firewood shop's front page, all equally finished, so a vote
  between them is a real choice. Drawn in the same 840×472 design space as varmPeis, scaled and
  centred into (x, y, w, h).

    LANDINGS: [{ key, name, draw(g, x, y, w, h) }]
    skog       deep forest at night: layered pines in mist, a moon, a cabin with a lit window
    nordisk    light and calm: lots of air, hairlines, a finely shaded stack of log ends
    rask       loud yellow, huge type, a black truck at speed, a "24 t" sticker
    peis       the warm fireplace (varmpeis.js)
*/

const W = 840, H = 472;

// shared frame: background fill, then a scaled design group
function frame(g, x, y, w, h, bg) {
  const svg = g.ownerSVGElement || g;
  D.el('rect', { x, y, width: w, height: h, rx: Math.min(8, w * 0.02), style: `fill: ${bg}` }, g);
  const k = Math.min(w / W, h / H);
  const p = D.g(g, { transform: `translate(${x + (w - W * k) / 2} ${y + (h - H * k) / 2}) scale(${k})`, 'data-picture': '' });
  return { svg, p, k };
}
const defs = (svg) => svg.querySelector('defs') || D.el('defs', {}, svg);
function grad(svg, id, stops, [x1, y1, x2, y2] = [0, 0, 0, 1], radial = false) {
  if (svg.querySelector(`#${id}`)) return `url(#${id})`;
  const gEl = radial
    ? D.el('radialGradient', { id, cx: x1, cy: y1, r: x2 }, defs(svg))
    : D.el('linearGradient', { id, x1, y1, x2, y2 }, defs(svg));
  stops.forEach(([o, c, a = 1]) => D.el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, gEl));
  return `url(#${id})`;
}
const T = (p, x, y, str, style, attrs = {}) => D.text(p, x, y, str, 'ld', { style, ...attrs });
const uid = () => Math.random().toString(36).slice(2, 7);
function clipRect(p, x, y, w, h, r) {
  const id = `ld-clip-${uid()}`;
  D.el('rect', { x, y, width: w, height: h, rx: r }, D.el('clipPath', { id }, p));
  return D.g(p, { 'clip-path': `url(#${id})` });
}

// ---------------------------------------------------------------- Skog
export function skog(g, x, y, w, h, { bar = true, chip = true } = {}) {
  const CREAM = '#eef3e6', SAGE = '#a8d08d', MOSS = '#6f9a5c', SOFT = '#b9c7b0';
  const f = frame(g, x, y, w, h, grad(g.ownerSVGElement || g, 'sk-bg', [[0, '#0d1a12'], [1, '#1b3023']]));
  const { svg, p } = f;
  if (bar) {
    T(p, 40, 46, 'Ved.', `font: 800 28px var(--font-display); fill: ${CREAM}; letter-spacing: -0.02em`);
    D.el('circle', { cx: 101, cy: 41, r: 4, style: `fill: ${SAGE}` }, p);
    ['Skogen', 'Priser', 'Logg inn'].forEach((l, i) => T(p, [520, 602, 672][i], 44, l, `font: 500 14px var(--font-display); fill: ${SOFT}`));
    D.el('rect', { x: 746, y: 24, width: 74, height: 32, rx: 16, style: `fill: none; stroke: ${SAGE}; stroke-width: 1.5` }, p);
    T(p, 783, 45, 'Bestill', `font: 700 13px var(--font-display); fill: ${SAGE}`, { 'text-anchor': 'middle' });
  }
  T(p, 40, 118, 'VEDLEVERING · HELE NORGE', `font: 700 13px var(--font-mono); letter-spacing: .18em; fill: ${SAGE}`);
  T(p, 40, 192, 'Fra skogen,', `font: 800 58px var(--font-display); fill: ${CREAM}; letter-spacing: -0.03em`);
  T(p, 40, 256, 'til døra di.', `font: 800 58px var(--font-display); fill: ${SAGE}; letter-spacing: -0.03em`);
  T(p, 40, 300, 'Bjørk hogd, kløyvd og tørket lokalt.', `font: 500 17px var(--font-display); fill: ${SOFT}`);
  T(p, 40, 328, 'Levert hver 14. dag, hele vinteren.', `font: 500 17px var(--font-display); fill: ${SOFT}`);
  D.el('rect', { x: 40, y: 360, width: 150, height: 50, rx: 25, style: `fill: ${grad(svg, 'sk-btn', [[0, '#bfe3a4'], [1, '#86b86b']], [0, 0, 1, 0])}` }, p);
  T(p, 115, 391, 'Bestill', 'font: 800 17px var(--font-display); fill: #0d1a12', { 'text-anchor': 'middle' });
  T(p, 212, 391, 'Slik gjør vi det  →', `font: 600 16px var(--font-display); fill: ${CREAM}`);
  T(p, 40, 448, 'Hogd i Hedmark · Tørket i 12 måneder', `font: 500 13px var(--font-display); fill: ${MOSS}`);

  // the picture: a night forest in layers of mist
  const ix = 476, iy = bar ? 92 : 64, iw = 330, ih = 340;
  const pic = clipRect(p, ix, iy, iw, ih, 22);
  D.el('rect', { x: ix, y: iy, width: iw, height: ih, style: `fill: ${grad(svg, 'sk-sky', [[0, '#0a1a24'], [0.6, '#183427'], [1, '#22412c']])}` }, pic);
  [[ix + 40, iy + 40], [ix + 120, iy + 24], [ix + 300, iy + 56], [ix + 70, iy + 96], [ix + 210, iy + 30], [ix + 260, iy + 110]].forEach(([cx, cy], k) =>
    D.el('circle', { cx, cy, r: k % 2 ? 1.6 : 2.2, style: 'fill: #eef3e6', opacity: 0.8 }, pic));
  D.el('circle', { cx: ix + 238, cy: iy + 88, r: 70, style: `fill: ${grad(svg, 'sk-moonglow', [[0, '#f4f0d8', 0.35], [1, '#f4f0d8', 0]], [0.5, 0.5, 0.5], true)}` }, pic);
  D.el('circle', { cx: ix + 238, cy: iy + 88, r: 30, style: 'fill: #f1edd6' }, pic);
  D.el('circle', { cx: ix + 228, cy: iy + 80, r: 6, style: 'fill: #dcd6b8', opacity: 0.6 }, pic);
  // a tiered pine
  const pine = (cx, base, hgt, fill) => {
    const tiers = 4, wd = hgt * 0.42;
    let d = '';
    for (let t = 0; t < tiers; t++) {
      const top = base - hgt + (t * hgt) / (tiers + 0.6), bot = top + hgt / 2.4, ww = wd * (0.45 + t * 0.2);
      d += `M${cx} ${top} L${cx + ww} ${bot} L${cx - ww} ${bot} Z `;
    }
    D.p(pic, d, '', { style: `fill: ${fill}` });
    D.el('rect', { x: cx - hgt * 0.025, y: base - hgt * 0.08, width: hgt * 0.05, height: hgt * 0.1, style: 'fill: #1a140e' }, pic);
  };
  const mist = (yy, op) => D.el('rect', { x: ix, y: iy + yy, width: iw, height: 60, style: `fill: ${grad(svg, 'sk-mist', [[0, '#cfe3d4', 0], [0.5, '#cfe3d4', 0.16], [1, '#cfe3d4', 0]])}`, opacity: op }, pic);
  [[30, 170], [90, 200], [150, 160], [210, 190], [270, 175], [320, 200]].forEach(([dx, hh]) => pine(ix + dx, iy + 250, hh, '#2b4a35'));
  mist(190, 1);
  [[0, 230], [60, 260], [130, 220], [200, 250], [290, 240]].forEach(([dx, hh]) => pine(ix + dx, iy + 300, hh, '#1c3426'));
  mist(250, 0.9);
  // the cabin, its window lit, smoke rising
  D.p(pic, `M${ix + 150} ${iy + 296} V${iy + 262} L${ix + 182} ${iy + 238} L${ix + 214} ${iy + 262} V${iy + 296} Z`, '', { style: 'fill: #3b2a1c' });
  D.el('rect', { x: ix + 166, y: iy + 268, width: 14, height: 12, rx: 1.5, style: 'fill: #ffcf6a' }, pic);
  D.el('circle', { cx: ix + 173, cy: iy + 274, r: 18, style: `fill: ${grad(svg, 'sk-win', [[0, '#ffcf6a', 0.5], [1, '#ffcf6a', 0]], [0.5, 0.5, 0.5], true)}` }, pic);
  D.p(pic, `M${ix + 200} ${iy + 240} q-8 -14 2 -26 q10 -12 0 -26`, '', { style: 'fill: none; stroke: #9fb4a6; stroke-width: 3; stroke-linecap: round', opacity: 0.6 });
  [[-10, 300, 280], [80, 316, 300], [190, 300, 260], [280, 320, 290]].forEach(([dx, b, hh]) => pine(ix + dx, iy + b + 40, hh, '#0e1d14'));
  // a frosted chip: the next delivery (left out when the site shows its own)
  if (chip) D.el('rect', { x: ix + 18, y: iy + 18, width: 150, height: 48, rx: 14, style: 'fill: #ffffff; stroke: #ffffff; stroke-width: 1; fill-opacity: .1; stroke-opacity: .25' }, pic);
  if (chip) T(pic, ix + 34, iy + 38, 'Neste levering', `font: 500 11px var(--font-display); fill: ${SOFT}`);
  if (chip) T(pic, ix + 34, iy + 57, 'Torsdag 12. des', `font: 700 14px var(--font-display); fill: ${CREAM}`);
  D.el('rect', { x: ix, y: iy, width: iw, height: ih, rx: 22, style: 'fill: none; stroke: #ffffff; stroke-width: 1.5; stroke-opacity: .12' }, p);
  return p;
}

// ---------------------------------------------------------------- Nordisk enkel
export function nordisk(g, x, y, w, h, { bar = true } = {}) {
  const INK = '#1a120c', GREY = '#6e655c', LINE = '#d9cfc1', RUST = '#b9542a';
  const { svg, p } = frame(g, x, y, w, h, '#f4efe7');
  if (bar) {
    T(p, 40, 46, 'ved', `font: 700 26px var(--font-display); fill: ${INK}; letter-spacing: -0.02em`);
    ['Sortiment', 'Om oss', 'Logg inn'].forEach((l, i) => T(p, [560, 650, 728][i], 44, l, `font: 500 14px var(--font-display); fill: ${GREY}`));
    D.p(p, 'M40 70 H800', '', { style: `fill: none; stroke: ${LINE}; stroke-width: 1.5` });
  }
  T(p, 40, 122, 'VED · ABONNEMENT', `font: 700 12px var(--font-mono); letter-spacing: .22em; fill: ${RUST}`);
  T(p, 40, 206, 'Ved.', `font: 700 76px var(--font-display); fill: ${INK}; letter-spacing: -0.04em`);
  T(p, 40, 286, 'Enkelt.', `font: 700 76px var(--font-display); fill: ${RUST}; letter-spacing: -0.04em`);
  T(p, 40, 328, 'Tørr bjørk, stablet ved døra di.', `font: 500 17px var(--font-display); fill: ${GREY}`);
  T(p, 40, 354, 'Hver 14. dag. Pause når du vil.', `font: 500 17px var(--font-display); fill: ${GREY}`);
  D.el('rect', { x: 40, y: 380, width: 132, height: 46, rx: 23, style: `fill: ${INK}` }, p);
  T(p, 106, 409, 'Bestill', 'font: 700 16px var(--font-display); fill: #f4efe7', { 'text-anchor': 'middle' });
  T(p, 194, 409, 'Se sortiment', `font: 600 15px var(--font-display); fill: ${INK}`);
  D.p(p, 'M194 415 H286', '', { style: `fill: none; stroke: ${INK}; stroke-width: 1.5` });
  // the picture: a light room and a neat, shaded stack of log ends in a rack
  const ix = 470, iy = bar ? 96 : 66, iw = 336, ih = 336;
  const pic = clipRect(p, ix, iy, iw, ih, 6);
  D.el('rect', { x: ix, y: iy, width: iw, height: ih, style: `fill: ${grad(svg, 'nd-room', [[0, '#ebe3d7'], [1, '#ddd2c2']])}` }, pic);
  D.el('rect', { x: ix, y: iy + 262, width: iw, height: 74, style: 'fill: #cfc2ae' }, pic);
  D.el('ellipse', { cx: ix + 168, cy: iy + 266, rx: 140, ry: 10, style: 'fill: #000', opacity: 0.12 }, pic);
  // rack
  D.el('rect', { x: ix + 46, y: iy + 52, width: 6, height: 214, style: `fill: ${INK}` }, pic);
  D.el('rect', { x: ix + 284, y: iy + 52, width: 6, height: 214, style: `fill: ${INK}` }, pic);
  D.el('rect', { x: ix + 46, y: iy + 262, width: 244, height: 6, style: `fill: ${INK}` }, pic);
  const ring = grad(svg, 'nd-end', [[0, '#f0d9b0'], [0.55, '#dcb57e'], [1, '#a9773f']], [0.45, 0.42, 0.6], true);
  const rows = 7, cols = 8;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols - (r % 2 ? 1 : 0); c++) {
    const cx = ix + 70 + c * 28.4 + (r % 2 ? 14 : 0) + ((r * 7 + c * 3) % 5) - 2;
    const cy = iy + 244 - r * 27 + ((c * 5 + r) % 3) - 1;
    const rr = 12.5 + ((r + c * 2) % 3);
    D.el('circle', { cx, cy, r: rr + 1.6, style: 'fill: #6b4a2c' }, pic);
    D.el('circle', { cx, cy, r: rr, style: `fill: ${ring}` }, pic);
    D.el('circle', { cx: cx + 1, cy: cy - 0.5, r: rr * 0.55, style: 'fill: none; stroke: #b98b52; stroke-width: 1.3', opacity: 0.7 }, pic);
    D.el('circle', { cx: cx + 1, cy: cy - 0.5, r: rr * 0.18, style: 'fill: #a5763f', opacity: 0.8 }, pic);
  }
  // a small price tag hanging on the rack
  D.el('rect', { x: ix + 214, y: iy + 22, width: 92, height: 50, rx: 4, style: 'fill: #ffffff' }, pic);
  T(pic, ix + 228, iy + 42, '40 L', `font: 700 14px var(--font-display); fill: ${INK}`);
  T(pic, ix + 228, iy + 62, '129 kr', `font: 600 13px var(--font-display); fill: ${RUST}`);
  return p;
}

// ---------------------------------------------------------------- Rask levering
export function rask(g, x, y, w, h, { bar = true, art = false } = {}) {
  // art: only the picture (truck, speed lines, sticker), for a crop where the page's own text would intrude
  const INK = '#14110c', Y = '#ffd23f';
  const { svg, p } = frame(g, x, y, w, h, Y);
  if (bar && !art) {
    D.el('rect', { x: 0, y: 0, width: W, height: 30, style: `fill: ${INK}` }, p);
    T(p, 20, 20, 'LEVERING I MORGEN  ·  HELE NORGE  ·  BESTILL FØR 22:00  ·  LEVERING I MORGEN  ·  HELE NORGE', `font: 700 11px var(--font-mono); letter-spacing: .14em; fill: ${Y}`);
    T(p, 40, 68, 'VED!', `font: 800 26px var(--font-display); fill: ${INK}; letter-spacing: -0.02em`);
    D.el('rect', { x: 690, y: 46, width: 110, height: 34, rx: 17, style: `fill: ${INK}` }, p);
    T(p, 745, 68, 'Bestill nå', `font: 800 13px var(--font-display); fill: ${Y}`, { 'text-anchor': 'middle' });
  }
  if (!art) {
  T(p, 40, 166, 'VED PÅ DØRA', `font: 800 64px var(--font-display); fill: ${INK}; letter-spacing: -0.045em`);
  D.el('rect', { x: 34, y: 186, width: 312, height: 70, rx: 4, style: `fill: ${INK}` }, p);
  T(p, 48, 242, 'I MORGEN.', `font: 800 64px var(--font-display); fill: ${Y}; letter-spacing: -0.045em`);
  T(p, 40, 296, 'Bestill før 22:00. Vi kjører i natt.', `font: 600 18px var(--font-display); fill: ${INK}`);
  D.el('rect', { x: 40, y: 324, width: 186, height: 54, rx: 27, style: `fill: ${INK}` }, p);
  T(p, 133, 357, 'Bestill nå  →', `font: 800 18px var(--font-display); fill: ${Y}`, { 'text-anchor': 'middle' });
  T(p, 40, 416, '★ 4,9 · 18 000 leveringer i år', `font: 600 14px var(--font-display); fill: ${INK}`, { opacity: 0.75 });
  }
  // the picture: a black truck at speed, a round sticker
  const tx = 470;
  const ty = bar ? 150 : 120;
  [[0, 40, 140], [10, 70, 110], [24, 100, 150], [6, 130, 90]].forEach(([dx, dy, len]) =>
    D.p(p, `M${tx + dx - len} ${ty + dy} H${tx + dx - 12}`, '', { style: `fill: none; stroke: ${INK}; stroke-width: 7; stroke-linecap: round` }));
  const tr = D.g(p, { transform: `rotate(-4 ${tx + 160} ${ty + 120})` });
  D.el('rect', { x: tx, y: ty + 20, width: 220, height: 120, rx: 10, style: `fill: ${INK}` }, tr);
  // logs on the flatbed
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6 - r; c++) {
    const cx = tx + 30 + c * 32 + r * 16, cy = ty + 2 - r * 26;
    D.el('circle', { cx, cy, r: 15, style: `fill: #f4dfb8; stroke: ${INK}; stroke-width: 4` }, tr);
    D.el('circle', { cx, cy, r: 5, style: 'fill: none; stroke: #c49a62; stroke-width: 2.5' }, tr);
  }
  D.p(tr, `M${tx + 222} ${ty + 46} H${tx + 288} L${tx + 330} ${ty + 92} V${ty + 140} H${tx + 222} Z`, '', { style: `fill: ${INK}` });
  D.p(tr, `M${tx + 240} ${ty + 58} H${tx + 284} L${tx + 312} ${ty + 90} H${tx + 240} Z`, '', { style: `fill: ${Y}`, opacity: 0.85 });
  [tx + 60, tx + 270].forEach((cx) => {
    D.el('circle', { cx, cy: ty + 146, r: 30, style: `fill: ${INK}; stroke: ${Y}; stroke-width: 6` }, tr);
    D.el('circle', { cx, cy: ty + 146, r: 9, style: `fill: ${Y}` }, tr);
  });
  T(tr, tx + 110, ty + 98, 'VED!', `font: 800 40px var(--font-display); fill: ${Y}; letter-spacing: -0.02em`, { 'text-anchor': 'middle' });
  // sticker
  const sx = tx + 286, sy = ty - 16;
  const st = D.g(p, { transform: `rotate(12 ${sx} ${sy})` });
  D.el('circle', { cx: sx, cy: sy, r: 46, style: `fill: #ffffff; stroke: ${INK}; stroke-width: 4` }, st);
  T(st, sx, sy + 4, '24 t', `font: 800 30px var(--font-display); fill: ${INK}`, { 'text-anchor': 'middle' });
  T(st, sx, sy + 24, 'LEVERING', `font: 800 10px var(--font-mono); letter-spacing: .14em; fill: ${INK}`, { 'text-anchor': 'middle' });
  // bottom stripe
  if (!art) D.el('rect', { x: 0, y: H - 36, width: W, height: 36, style: `fill: ${INK}` }, p);
  if (!art) T(p, 20, H - 13, 'RASK · TØRR · VED · RASK · TØRR · VED · RASK · TØRR · VED · RASK · TØRR · VED · RASK', `font: 800 15px var(--font-display); letter-spacing: .1em; fill: ${Y}`);
  return p;
}

export const LANDINGS = [
  { key: 'skog', name: 'Skog', draw: skog },
  { key: 'nordisk', name: 'Nordisk enkel', draw: nordisk },
  { key: 'rask', name: 'Rask levering', draw: rask },
  { key: 'peis', name: 'Varm peis', draw: (g, x, y, w, h, o) => varmPeis(g, x, y, w, h, o) },
];
