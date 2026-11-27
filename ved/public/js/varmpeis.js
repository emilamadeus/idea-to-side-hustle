import * as D from './draw.js';

/*
  "Varm peis": the firewood subscription's landing page, as a polished modern site. Shared by
  the prototypes slide (the chosen direction) and visual-ref (the picture in your head, the
  ChatGPT reference, and the built page).

    varmPeis(g, x, y, w, h, { plain, bar })
      plain  the built version: a little less than the reference (no glow, embers or chip)
      bar    draw the site's own nav bar (off when it sits inside a drawn browser window,
             which has its own)

  Drawn in an 840×472 design space, scaled uniformly and centred; the page background fills
  the whole frame. At very small sizes text becomes bars (nothing readable that small).
*/

const W = 840, H = 472;
const CREAM = '#fff3e3', SOFT = '#d9c6b0', MUTED = '#a8927c', ORANGE = '#ff8a3d';

function defs(svg) {
  if (svg.querySelector('#vp-bg')) return;
  const d = D.el('defs', {}, svg);
  const lin = (id, stops, [x1, y1, x2, y2] = [0, 0, 1, 1]) => {
    const g = D.el('linearGradient', { id, x1, y1, x2, y2 }, d);
    stops.forEach(([o, c, a = 1]) => D.el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  };
  const rad = (id, stops, cx = 0.5, cy = 0.5, r = 0.5) => {
    const g = D.el('radialGradient', { id, cx, cy, r }, d);
    stops.forEach(([o, c, a = 1]) => D.el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  };
  lin('vp-bg', [[0, '#1a0d07'], [1, '#2b160c']]);
  lin('vp-btn', [[0, '#ff9a4a'], [1, '#ff5a1f']], [0, 0, 1, 0]);
  rad('vp-room', [[0, '#ff9a4a', 0.55], [0.35, '#7a3412', 0.6], [1, '#160a05', 1]], 0.5, 0.72, 0.75);
  lin('vp-stone', [[0, '#4a3a30'], [1, '#2a201a']], [0, 0, 0, 1]);
  lin('vp-flame-a', [[0, '#ffd23f'], [0.5, '#ff8a3d'], [1, '#d9431a']], [0, 1, 0, 0]);
  lin('vp-flame-b', [[0, '#fff3c0'], [1, '#ffb347']], [0, 1, 0, 0]);
  rad('vp-floor', [[0, '#ffb347', 0.55], [1, '#ffb347', 0]]);
}

export function varmPeis(g, x, y, w, h, { plain = false, bar = true } = {}) {
  const svg = g.ownerSVGElement || g;
  defs(svg);
  // the page background fills the frame; the design is centred inside it
  D.el('rect', { x, y, width: w, height: h, rx: Math.min(8, w * 0.02), style: 'fill: url(#vp-bg)' }, g);
  const k = Math.min(w / W, h / H);
  const p = D.g(g, { transform: `translate(${x + (w - W * k) / 2} ${y + (h - H * k) / 2}) scale(${k})`, 'data-picture': '' });
  const tiny = k < 0.15;
  const T = (tx, ty, str, style, attrs = {}) => {
    if (tiny) return; // too small to read: leave the shapes
    D.text(p, tx, ty, str, 'vp', { style, ...attrs });
  };
  const bars = (tx, ty, ws, hgt, color) => tiny && ws.forEach((bw, i) => D.el('rect', { x: tx, y: ty + i * (hgt + 10), width: bw, height: hgt, rx: hgt / 2, style: `fill: ${color}` }, p));

  // nav
  if (bar) {
    T(40, 46, 'Ved.', `font: 800 28px var(--font-display); fill: ${CREAM}; letter-spacing: -0.02em`);
    D.el('circle', { cx: 101, cy: 41, r: 4, style: `fill: ${ORANGE}` }, p);
    ['Slik fungerer det', 'Priser', 'Logg inn'].forEach((l, i) => T([470, 612, 682][i], 44, l, `font: 500 14px var(--font-display); fill: ${SOFT}`));
    D.el('rect', { x: 746, y: 24, width: 74, height: 32, rx: 16, style: `fill: none; stroke: ${ORANGE}`, 'stroke-width': 1.5 }, p);
    T(783, 45, 'Bestill', `font: 700 13px var(--font-display); fill: ${ORANGE}`, { 'text-anchor': 'middle' });
    D.p(p, 'M40 74 H800', '', { style: 'fill: none; stroke: #ffffff', 'stroke-width': 1, opacity: 0.07 });
  }

  // hero copy
  T(40, 118, 'VEDLEVERING · HELE NORGE', `font: 700 13px var(--font-mono); letter-spacing: .18em; fill: ${ORANGE}`);
  T(40, 194, 'Ved på døra,', `font: 800 60px var(--font-display); fill: ${CREAM}; letter-spacing: -0.03em`);
  T(40, 276, 'hele vinteren.', `font: 800 60px var(--font-display); fill: ${ORANGE}; letter-spacing: -0.03em`);
  T(40, 316, 'Tørr bjørkeved levert hver 14. dag.', `font: 500 17px var(--font-display); fill: ${SOFT}`);
  T(40, 346, 'Pause når du vil. Ingen binding.', `font: 500 17px var(--font-display); fill: ${SOFT}`);
  bars(40, 160, [300, 260], 34, CREAM);
  bars(40, 300, [240, 200], 10, SOFT);
  D.el('rect', { x: 40, y: 370, width: 150, height: 50, rx: 25, style: plain ? `fill: ${ORANGE}` : 'fill: url(#vp-btn)' }, p);
  T(115, 401, 'Bestill', 'font: 800 17px var(--font-display); fill: #1a0d07', { 'text-anchor': 'middle' });
  T(212, 401, 'Se priser  →', `font: 600 16px var(--font-display); fill: ${CREAM}`);
  T(40, 452, '★★★★★  4,9 · 1 200 hjem i Oslo', `font: 500 13px var(--font-display); fill: ${MUTED}`);

  // hero picture: a fireplace in a warm room
  const ix = 476, iy = bar ? 100 : 72, iw = 330, ih = 330;
  const id = `vp-clip-${Math.random().toString(36).slice(2, 7)}`;
  const cp = D.el('clipPath', { id }, p);
  D.el('rect', { x: ix, y: iy, width: iw, height: ih, rx: 22 }, cp);
  const pic = D.g(p, { 'clip-path': `url(#${id})` });
  D.el('rect', { x: ix, y: iy, width: iw, height: ih, style: plain ? 'fill: #2a140b' : 'fill: url(#vp-room)' }, pic);
  // stone surround and the firebox
  const fx = ix + 75, fy = iy + 110;
  D.p(pic, `M${fx} ${fy + 210} V${fy + 30} Q${fx} ${fy} ${fx + 30} ${fy} H${fx + 150} Q${fx + 180} ${fy} ${fx + 180} ${fy + 30} V${fy + 210} Z`, '', { style: 'fill: url(#vp-stone)' });
  D.el('rect', { x: fx - 16, y: fy - 14, width: 212, height: 18, rx: 6, style: 'fill: #5a463a' }, pic);
  D.p(pic, `M${fx + 30} ${fy + 210} V${fy + 92} Q${fx + 90} ${fy + 40} ${fx + 150} ${fy + 92} V${fy + 210} Z`, '', { style: 'fill: #0c0603' });
  // flames
  D.p(pic, `M${fx + 52} ${fy + 196} C${fx + 40} ${fy + 160} ${fx + 64} ${fy + 140} ${fx + 70} ${fy + 116} C${fx + 76} ${fy + 140} ${fx + 86} ${fy + 146} ${fx + 88} ${fy + 160} C${fx + 92} ${fy + 132} ${fx + 104} ${fy + 116} ${fx + 112} ${fy + 98} C${fx + 120} ${fy + 130} ${fx + 140} ${fy + 152} ${fx + 128} ${fy + 196} Z`, '', { style: plain ? 'fill: #ff7a2f' : 'fill: url(#vp-flame-a)' });
  if (!plain) D.p(pic, `M${fx + 72} ${fy + 196} C${fx + 66} ${fy + 176} ${fx + 80} ${fy + 166} ${fx + 86} ${fy + 152} C${fx + 92} ${fy + 170} ${fx + 104} ${fy + 166} ${fx + 108} ${fy + 150} C${fx + 116} ${fy + 172} ${fx + 116} ${fy + 186} ${fx + 108} ${fy + 196} Z`, '', { style: 'fill: url(#vp-flame-b)' });
  // logs, end-on rings
  D.p(pic, `M${fx + 40} ${fy + 202} L${fx + 140} ${fy + 188}`, '', { style: 'fill: none; stroke: #6a4228', 'stroke-width': 16, 'stroke-linecap': 'round' });
  D.p(pic, `M${fx + 44} ${fy + 188} L${fx + 138} ${fy + 204}`, '', { style: 'fill: none; stroke: #7e5232', 'stroke-width': 16, 'stroke-linecap': 'round' });
  D.el('circle', { cx: fx + 40, cy: fy + 202, r: 8, style: 'fill: #c9935a; stroke: #6a4228', 'stroke-width': 2 }, pic);
  D.el('circle', { cx: fx + 138, cy: fy + 204, r: 8, style: 'fill: #c9935a; stroke: #6a4228', 'stroke-width': 2 }, pic);
  if (!plain) {
    // floor glow and embers
    D.el('ellipse', { cx: fx + 90, cy: fy + 222, rx: 150, ry: 26, style: 'fill: url(#vp-floor)' }, pic);
    [[fx + 70, fy + 100, 2.5], [fx + 118, fy + 84, 2], [fx + 96, fy + 70, 1.8], [fx + 132, fy + 112, 2.2], [fx + 58, fy + 124, 1.6]].forEach(([cx, cy, r]) => D.el('circle', { cx, cy, r, style: 'fill: #ffd23f', opacity: 0.85 }, pic));
    // a stacked basket of wood beside the hearth
    for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 3 - r2; c++) D.el('circle', { cx: ix + 28 + c * 18 + r2 * 9, cy: iy + ih - 22 - r2 * 16, r: 8, style: 'fill: #c9935a; stroke: #5a3a22', 'stroke-width': 2 }, pic);
    // glass chip: the next delivery
    D.el('rect', { x: ix + 150, y: iy + 18, width: 162, height: 50, rx: 14, style: 'fill: #ffffff; stroke: #ffffff', 'stroke-width': 1, 'fill-opacity': 0.1, 'stroke-opacity': 0.25 }, pic);
    T(ix + 166, iy + 39, 'Neste levering', `font: 500 11px var(--font-display); fill: ${SOFT}`);
    T(ix + 166, iy + 58, 'Torsdag 12. des', `font: 700 14px var(--font-display); fill: ${CREAM}`);
  }
  D.el('rect', { x: ix, y: iy, width: iw, height: ih, rx: 22, style: 'fill: none; stroke: #ffffff', 'stroke-width': 1.5, 'stroke-opacity': 0.12 }, p);
  return p;
}
