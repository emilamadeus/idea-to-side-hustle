// A mirror ball and a DJ table, drawn in SVG and animated by update(t) from a tick.
// The ball is a real sphere of mirror facets: each facet is projected every frame as the ball
// turns, lit from the top left, and now and then one catches the light and glints.
import * as D from './draw.js';
import { FILL } from './props.js';

const NS = 'http://www.w3.org/2000/svg';
const TILT = 0.32;                                   // we look slightly down on the ball
const LIGHT = (() => { const v = [-0.55, 0.65, 0.55]; const l = Math.hypot(...v); return v.map((c) => c / l); })();

/** Mirror ball hanging at (cx, cy), radius r, on a string from y = top. */
export function discoBall(parent, cx, cy, r, { top = cy - r - 60 } = {}) {
  const g = D.g(parent);                    // wrapper: the glow is background, the ball itself is the unit
  // the room's light behind it
  const id = `db${Math.random().toString(36).slice(2, 7)}`;
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `
    <radialGradient id="${id}-glow"><stop offset="0" stop-color="#ffd23f" stop-opacity=".38"/><stop offset=".45" stop-color="#ff5a1f" stop-opacity=".14"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-shade" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
    <clipPath id="${id}-clip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`;
  g.append(defs);
  const glow = D.el('circle', { cx, cy, r: r * 2.6, style: `fill: url(#${id}-glow)` }, D.g(g, { 'data-bg': '' }));
  const unit = D.g(g, { 'data-unit': '' });
  // string and cap
  D.el('line', { x1: cx, y1: top, x2: cx, y2: cy - r, style: 'stroke: #c9ad92', 'stroke-width': 2.5 }, unit);
  D.el('rect', { x: cx - 9, y: cy - r - 10, width: 18, height: 14, rx: 3, ...FILL('#8a7a6a', 2.4) }, unit);
  // the sphere: dark grout, facets on top, a shading pass, an ink outline
  const body = D.g(unit, { 'clip-path': `url(#${id}-clip)` });
  D.el('circle', { cx, cy, r, style: 'fill: #4a3f36' }, body);
  const LAT = 11, LON = 22;
  const facets = [];
  for (let i = 0; i < LAT; i++) for (let j = 0; j < LON; j++) {
    const poly = document.createElementNS(NS, 'polygon');
    body.append(poly);
    facets.push({ poly, i, j, ph: Math.random() * 1000, sp: 0.6 + Math.random() * 1.4, jit: (Math.random() - 0.5) * 0.3 });
  }
  D.el('circle', { cx, cy, r, style: `fill: url(#${id}-shade)` }, body);
  D.el('circle', { cx, cy, r, style: 'fill: none; stroke: #1a120c', 'stroke-width': 3 }, unit);
  // glints: four-point stars that flare where a facet catches the light
  const glints = [0, 1, 2].map(() => {
    const s = document.createElementNS(NS, 'path');
    s.setAttribute('d', 'M0 -16 L3 -3 L16 0 L3 3 L0 16 L-3 3 L-16 0 L-3 -3 Z');
    s.setAttribute('style', 'fill: #fff8e8; opacity: 0');
    unit.append(s);
    return { s, t0: -10, x: 0, y: 0 };
  });

  const project = (phi, lam, rot) => {
    const x = Math.cos(phi) * Math.sin(lam + rot), y = Math.sin(phi), z = Math.cos(phi) * Math.cos(lam + rot);
    const y2 = y * Math.cos(TILT) + z * Math.sin(TILT), z2 = z * Math.cos(TILT) - y * Math.sin(TILT);
    return [x, y2, z2];
  };
  let lastGlint = 0;
  function update(t) {
    const rot = t * 0.55;
    for (const f of facets) {
      const p0 = -Math.PI / 2 + (f.i / LAT) * Math.PI, p1 = -Math.PI / 2 + ((f.i + 1) / LAT) * Math.PI;
      const l0 = (f.j / LON) * Math.PI * 2, l1 = ((f.j + 1) / LON) * Math.PI * 2;
      const pm = (p0 + p1) / 2, lm = (l0 + l1) / 2;
      const n = project(pm, lm, rot);
      if (n[2] < 0.02) { f.poly.setAttribute('visibility', 'hidden'); continue; }
      f.poly.setAttribute('visibility', 'visible');
      // shrink each facet toward its centre so the grout shows between mirrors
      const k = 0.92;
      const pts = [[p0, l0], [p0, l1], [p1, l1], [p1, l0]].map(([a, b]) => {
        const q = project(pm + (a - pm) * k, lm + (b - lm) * k, rot);
        return `${(cx + q[0] * r).toFixed(1)},${(cy - q[1] * r).toFixed(1)}`;
      });
      f.poly.setAttribute('points', pts.join(' '));
      const lam = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      const spark = Math.max(0, Math.sin(t * f.sp + f.ph)) ** 40;     // brief flashes
      const v = Math.max(0, Math.min(1, 0.28 + 0.62 * lam + f.jit + spark * 0.9));
      // silver, warmed by the room: a little orange in the shadows, cream in the light
      const R = Math.round(70 + 185 * v), G = Math.round(58 + 180 * v), B = Math.round(48 + 160 * v ** 1.3);
      f.poly.setAttribute('fill', `rgb(${R},${G},${B})`);
      if (spark > 0.6 && t - lastGlint > 0.35) {
        const free = glints.find((q) => t - q.t0 > 0.6);
        if (free) { free.t0 = t; free.x = cx + n[0] * r; free.y = cy - n[1] * r; lastGlint = t; }
      }
    }
    for (const q of glints) {
      const a = (t - q.t0) / 0.6;
      if (a > 1) { q.s.style.opacity = 0; continue; }
      const s = Math.sin(a * Math.PI);
      q.s.style.opacity = s;
      q.s.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) rotate(${(a * 45).toFixed(1)}) scale(${(0.4 + s).toFixed(2)})`);
    }
    glow.setAttribute('r', (r * (2.5 + 0.2 * Math.sin(t * 2.2))).toFixed(1));
  }
  update(0);
  return { g, update };
}

/** Light spots thrown by the ball, drifting over a rectangle (x, y, w, h). Background only. */
export function discoSpots(parent, x, y, w, h, n = 9) {
  const g = D.g(parent, { 'data-bg': '' });
  const cols = ['#ffd23f', '#ff7a2f', '#ff6f9c', '#7fd0ff', '#8fe3a2', '#fff3e3'];
  const spots = Array.from({ length: n }, (_, k) => ({
    c: D.el('circle', { r: 5 + (k % 3) * 2, style: `fill: ${cols[k % cols.length]}` }, g),
    a: (k / n) * Math.PI * 2, ry: 0.35 + ((k * 37) % 50) / 100, ph: k * 1.7,
  }));
  function update(t) {
    for (const s of spots) {
      const a = s.a + t * 0.35;
      s.c.setAttribute('cx', (x + w / 2 + Math.cos(a) * w * 0.48).toFixed(1));
      s.c.setAttribute('cy', (y + h / 2 + Math.sin(a) * h * 0.5 * s.ry).toFixed(1));
      s.c.style.opacity = (0.35 + 0.5 * Math.max(0, Math.sin(t * 1.3 + s.ph))).toFixed(2);
    }
  }
  update(0);
  return { g, update };
}

/** A DJ table: two turntables and a mixer on top, a level meter on the front. x0–x0+w, top y0. */
export function djTable(parent, x0, y0, w = 430) {
  const g = D.g(parent, { 'data-unit': '' });
  const x1 = x0 + w, top = y0, edge = y0 + 56, foot = y0 + 186;
  // the deck top, seen slightly from above, and the front panel
  D.p(g, `M${x0 + 18} ${top} H${x1 - 18} L${x1} ${edge} H${x0} Z`, '', FILL('#3b2d23'));
  D.el('rect', { x: x0, y: edge, width: w, height: foot - edge, rx: 6, ...FILL('#231912') }, g);
  const strip = D.el('rect', { x: x0 + 14, y: edge + 10, width: w - 28, height: 5, rx: 2.5, style: 'fill: #ff5a1f' }, g);
  // turntables
  const decks = [x0 + 108, x1 - 108].map((cx) => {
    const cy = top + 30;
    D.el('ellipse', { cx, cy, rx: 82, ry: 25, ...FILL('#4b3a2d', 2.4) }, g);
    D.el('ellipse', { cx, cy, rx: 70, ry: 20, style: 'fill: #120d0a; stroke: #1a120c', 'stroke-width': 2 }, g);
    [56, 44, 32].forEach((rr) => D.el('ellipse', { cx, cy, rx: rr, ry: rr * 0.29, style: 'fill: none; stroke: #2b221c', 'stroke-width': 1.5 }, g));
    D.el('ellipse', { cx, cy, rx: 17, ry: 5, style: 'fill: #ff7a2f' }, g);
    const shine = D.el('line', { style: 'stroke: rgba(255,243,227,.35); stroke-linecap: round', 'stroke-width': 3 }, g);
    // tonearm from the back corner
    D.p(g, `M${cx + 72} ${cy - 16} L${cx + 58} ${cy - 2} L${cx + 30} ${cy + 6}`, '', { style: 'fill: none; stroke: #c9ad92; stroke-linecap: round; stroke-linejoin: round', 'stroke-width': 3.5 });
    D.el('circle', { cx: cx + 72, cy: cy - 16, r: 5, ...FILL('#8a7a6a', 2) }, g);
    return { cx, cy, shine };
  });
  // mixer
  const mx = (x0 + x1) / 2;
  D.el('rect', { x: mx - 26, y: top + 6, width: 52, height: 42, rx: 5, ...FILL('#2f241c', 2.4) }, g);
  [-12, 0, 12].forEach((dx) => D.el('circle', { cx: mx + dx, cy: top + 17, r: 3.5, style: 'fill: #c9ad92' }, g));
  D.el('line', { x1: mx - 15, y1: top + 37, x2: mx + 15, y2: top + 37, style: 'stroke: #120d0a; stroke-linecap: round', 'stroke-width': 4 }, g);
  const fader = D.el('rect', { x: mx - 4, y: top + 31, width: 8, height: 12, rx: 2, style: 'fill: #ffd23f' }, g);
  // the level meter on the front
  const BARS = 16, bw = (w - 80) / BARS;
  const bars = Array.from({ length: BARS }, (_, k) => {
    const b = D.el('rect', { x: x0 + 40 + k * bw + 3, width: bw - 6, rx: 3, style: `fill: ${k < 6 ? '#ffd23f' : k < 12 ? '#ff9a2a' : '#ff5a1f'}` }, g);
    return { b, ph: k * 0.9 };
  });
  const base = foot - 22, maxH = foot - edge - 56;
  function update(t) {
    decks.forEach((d, k) => {
      const a = t * (k ? 3.1 : 3.4);
      const ca = Math.cos(a), sa = Math.sin(a);
      d.shine.setAttribute('x1', (d.cx + ca * 26).toFixed(1)); d.shine.setAttribute('y1', (d.cy + sa * 7.5).toFixed(1));
      d.shine.setAttribute('x2', (d.cx + ca * 62).toFixed(1)); d.shine.setAttribute('y2', (d.cy + sa * 18).toFixed(1));
    });
    fader.setAttribute('x', (mx - 4 + Math.sin(t * 0.9) * 10).toFixed(1));
    const beat = Math.max(0, Math.sin(t * Math.PI * 2 * 2)) ** 3;       // 120 bpm
    bars.forEach(({ b, ph }, k) => {
      const shape = 0.35 + 0.65 * Math.exp(-(((k - 4) / 5) ** 2));       // the low end is the loudest
      const v = Math.min(1, shape * (0.45 + 0.35 * Math.abs(Math.sin(t * 3.7 + ph)) + 0.35 * beat));
      const h = Math.max(6, v * maxH);
      b.setAttribute('y', (base - h).toFixed(1)); b.setAttribute('height', h.toFixed(1));
    });
    strip.style.opacity = (0.55 + 0.45 * beat).toFixed(2);
  }
  update(0);
  return { g, update };
}

/** Soft coloured beams sweeping out of the ball at (cx, cy), clipped to a rectangle. Background only. */
export function discoBeams(parent, cx, cy, clip, n = 6, len = 300) {
  const id = `bm${Math.random().toString(36).slice(2, 7)}`;
  const g = D.g(parent, { 'data-bg': '', 'clip-path': `url(#${id}-c)`, style: 'mix-blend-mode: screen' });
  const cols = ['#ffd23f', '#ff7a2f', '#ff6f9c', '#7fd0ff', '#8fe3a2', '#c9a6ff'];
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `<clipPath id="${id}-c"><rect x="${clip.x}" y="${clip.y}" width="${clip.w}" height="${clip.h}"/></clipPath>` +
    cols.map((c, k) => `<radialGradient id="${id}-${k}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${len}"><stop offset="0" stop-color="${c}" stop-opacity=".42"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('');
  g.append(defs);
  const beams = Array.from({ length: n }, (_, k) => ({ p: D.el('path', { style: `fill: url(#${id}-${k % cols.length})` }, g), a: (k / n) * Math.PI * 2, w: 0.06 + (k % 3) * 0.025 }));
  function update(t) {
    for (const b of beams) {
      const a = b.a + t * 0.45, w = b.w * (0.8 + 0.2 * Math.sin(t * 1.7 + b.a * 3));
      const p = (q) => `${(cx + Math.cos(q) * len).toFixed(1)} ${(cy + Math.sin(q) * len).toFixed(1)}`;
      b.p.setAttribute('d', `M${cx} ${cy} L${p(a - w)} L${p(a + w)} Z`);
    }
  }
  update(0);
  return { g, update };
}
