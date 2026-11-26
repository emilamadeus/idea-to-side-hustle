import gsap from 'gsap';
import { el, g as group, p as path, text, inkFor } from './draw.js';
import { figure, PALETTE } from './characters.js';
import { FILL } from './props.js';

/*
  Shared restaurant kitchen for the session slides (parallel sessions, helpers, watchdog).
  Stations are sessions, the head chef is the lead session, the runner is a helper,
  the night guard is the watchdog.

  Fixed geometry (svg units):
    kitchen    x 560–1480, y 150–780
    rail       y 190 (tickets hang y 196–270), slots RAIL_X
    station    counter top y 540, floor y 680; ticket clip above the cook at y 286–360
    pass       front counter y 690–740; plates slide out to the right
    corridor   (optional) x 560–730, door at x 700–730
*/

export const K = { x0: 560, x1: 1480, rail: 190, top: 540, floor: 680, pass: 690 };
export const RAIL_X = [600, 745, 890, 1035, 1180, 1325];
export const TW = 120, TH = 74;
const TILE = '#241a13', TILE_LINE = '#33261b', STEEL = '#8b8f96', STEEL_DARK = '#4b4f57';

/** Room with three layers: back (walls), mid (stations, people), front (pass counter). */
export function room(svg, { corridor = false } = {}) {
  const back = group(svg, { 'data-bg': '' });
  const x0 = corridor ? 740 : K.x0;
  el('rect', { x: K.x0, y: 150, width: K.x1 - K.x0, height: 630, rx: 10, style: `fill: ${TILE}; stroke: var(--deco)`, 'stroke-width': 2 }, back);
  for (let y = 300; y < K.floor; y += 48) path(back, `M${x0} ${y} H${K.x1}`, '', { style: `fill: none; stroke: ${TILE_LINE}`, 'stroke-width': 2 });
  for (let x = x0 + 60; x < K.x1; x += 80) path(back, `M${x} 290 V${K.floor}`, '', { style: `fill: none; stroke: ${TILE_LINE}`, 'stroke-width': 2 });
  el('rect', { x: K.x0, y: K.floor, width: K.x1 - K.x0, height: 100, style: 'fill: #1b130e' }, back);
  // ticket rail
  path(back, `M${x0 + 20} ${K.rail} H${K.x1 - 20}`, '', { style: `fill: none; stroke: ${STEEL}`, 'stroke-width': 6, 'stroke-linecap': 'round' });
  let corr = null;
  if (corridor) {
    corr = group(back);
    el('rect', { x: K.x0, y: 150, width: 170, height: 630, rx: 10, style: 'fill: #120d0a; stroke: var(--deco)', 'stroke-width': 2 }, corr);
    el('rect', { x: K.x0 + 170, y: 150, width: 10, height: 630, style: 'fill: #3a2b20' }, corr);
    text(corr, K.x0 + 85, 196, 'GANG', 'kc', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); letter-spacing: .2em; fill: var(--muted)' });
  }
  const mid = group(svg);
  const front = group(svg, { 'data-bg': '' });
  el('rect', { x: K.x0, y: K.pass, width: K.x1 - K.x0, height: 18, rx: 3, style: `fill: ${STEEL}; stroke: ${inkFor(STEEL)}`, 'stroke-width': 2 }, front);
  el('rect', { x: K.x0 + 10, y: K.pass + 18, width: K.x1 - K.x0 - 20, height: 46, style: `fill: ${STEEL_DARK}; stroke: ${inkFor(STEEL_DARK)}`, 'stroke-width': 2 }, front);
  const top = group(svg); // plates, tickets in flight, bubbles
  return { back, mid, front, top, corr };
}

/** Door in the corridor wall (closed by default); returns { g, leaf }. */
export function door(parent) {
  const g = group(parent, { 'data-bg': '' });
  el('rect', { x: 728, y: 430, width: 12, height: 250, style: 'fill: #120d0a' }, g);
  const leaf = el('rect', { x: 730, y: 430, width: 10, height: 250, style: 'fill: #6b4a30; stroke: #1a120c', 'stroke-width': 2 }, g);
  return { g, leaf };
}

/** Chef's toque, drawn on the head (local figure units). */
export function toque(f) {
  path(f.head, 'M-30 -92 C-46 -98 -44 -134 -20 -128 C-16 -150 16 -150 20 -128 C44 -134 46 -98 30 -92 Z', '', FILL('#fff3e3'));
  el('rect', { x: -31, y: -100, width: 62, height: 14, rx: 3, ...FILL('#fff3e3') }, f.head);
}
/** Peaked cap. */
export function cap(f, color) {
  path(f.head, 'M-33 -84 C-33 -118 33 -118 33 -84 Z', '', FILL(color));
  path(f.head, 'M26 -86 H56 q6 6 -4 9 H26 Z', '', FILL(color));
}

/** One cooking station: cook behind a counter with a stove and pan. */
export function station(parent, x, look = {}) {
  const g = group(parent);
  const s = 0.85;
  const cook = figure(g, { x, y: 492, s, pose: 'sit', arms: 'table', outfit: 'shirt', color: '#e9e2d6', ...look });
  toque(cook);
  const counter = group(g, { 'data-bg': '' });
  el('rect', { x: x - 100, y: K.top, width: 200, height: K.floor - K.top, rx: 4, style: `fill: ${STEEL_DARK}; stroke: ${inkFor(STEEL_DARK)}`, 'stroke-width': 2.4 }, counter);
  el('rect', { x: x - 106, y: K.top - 8, width: 212, height: 14, rx: 3, style: `fill: ${STEEL}; stroke: ${inkFor(STEEL)}`, 'stroke-width': 2.4 }, counter);
  el('rect', { x: x - 60, y: K.top + 34, width: 120, height: 60, rx: 4, style: 'fill: #2a2d33; stroke: #6b5a48', 'stroke-width': 2 }, counter);
  [-30, 0, 30].forEach((d) => el('circle', { cx: x + d, cy: K.top + 112, r: 7, style: 'fill: #2a2d33; stroke: #6b5a48', 'stroke-width': 2 }, counter));
  const pan = group(g, { 'data-bg': '' });
  el('ellipse', { cx: x - 20, cy: K.top - 12, rx: 46, ry: 12, ...FILL('#2a2d33') }, pan);
  path(pan, `M${x + 24} ${K.top - 14} L${x + 84} ${K.top - 30}`, '', { style: 'fill: none; stroke: #8b8f96', 'stroke-width': 7, 'stroke-linecap': 'round' });
  el('ellipse', { cx: x - 20, cy: K.top - 16, rx: 30, ry: 6, style: 'fill: #ff7a2f' }, pan);
  const steam = path(g, `M${x - 36} ${K.top - 34} q-8 -12 0 -24 q8 -12 0 -24 M${x - 6} ${K.top - 36} q-8 -12 0 -24 q8 -12 0 -24`, '', { style: 'fill: none; stroke: #cfc3b2', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0, 'data-bg': '' });
  return { g, cook, pan, steam, x, clip: { x: x - TW / 2, y: 286 } };
}

/** Order ticket; group positioned with gsap x/y (top-left corner). */
export function ticket(parent, label, { blank = false } = {}) {
  const g = group(parent, blank ? { 'data-bg': '' } : { 'data-unit': '' });
  el('rect', { x: 0, y: 0, width: TW, height: TH, rx: 3, style: 'fill: #fff3e3; stroke: #b9a88f', 'stroke-width': 2 }, g);
  el('rect', { x: TW / 2 - 14, y: -8, width: 28, height: 14, rx: 2, style: `fill: ${STEEL}; stroke: ${inkFor(STEEL)}`, 'stroke-width': 2 }, g);
  if (blank) path(g, 'M14 30 H96 M14 48 H70', '', { style: 'fill: none; stroke: #b9a88f', 'stroke-width': 4, 'stroke-linecap': 'round' });
  else {
    text(g, 12, 26, 'BONG', 'tk', { style: 'font: 700 11px var(--font-mono); letter-spacing: .14em; fill: #7a5a3a' });
    text(g, 12, 54, label, 'tl', { style: 'font: 700 17px var(--font-mono); fill: #1a120c' });
  }
  return g;
}

/** Plate with food, centred on (0,0) at the pass surface. */
export function plate(parent, color = '#ff7a2f') {
  const g = group(parent, { 'data-bg': '' });
  el('ellipse', { cx: 0, cy: 0, rx: 38, ry: 11, ...FILL('#fff3e3') }, g);
  path(g, 'M-20 -2 C-18 -22 18 -22 20 -2 Z', '', FILL(color, 2));
  el('circle', { cx: 6, cy: -14, r: 5, style: 'fill: #8fe3a2' }, g);
  return g;
}

/** Slide a plate from a station along the pass and out of the kitchen. */
export function serve(tl, parent, x, at, { color, hold = 0.35 } = {}) {
  const pl = plate(parent, color);
  gsap.set(pl, { x, y: K.pass - 2, opacity: 0 });
  tl.to(pl, { opacity: 1, duration: 0.2 }, at);
  tl.fromTo(pl, { y: K.pass - 40 }, { y: K.pass - 2, duration: 0.3, ease: 'bounce.out' }, at);
  tl.to(pl, { x: K.x1 + 10, duration: 1.1, ease: 'power2.in' }, at + 0.3 + hold);
  tl.to(pl, { opacity: 0, duration: 0.2 }, at + 1.25 + hold);
  return pl;
}

/** Stir: pan wobble + steam, as a finite tween on the timeline. */
export function cookFor(tl, st, at, dur) {
  tl.to(st.steam, { opacity: 0.8, duration: 0.3 }, at);
  tl.to(st.pan, { y: -5, duration: 0.18, repeat: Math.max(1, Math.round(dur / 0.36)) * 2 - 1, yoyo: true, ease: 'sine.inOut' }, at);
  tl.to(st.steam, { opacity: 0, duration: 0.3 }, at + dur);
}

/** Lead session's status board. rows: [{ name, status }]; returns { rows, set(tl, i, status, at) }. */
export const STATUS = {
  queue: ['i kø', 'var(--muted)'],
  cook: ['lager', '#ff7a2f'],
  wait: ['venter på deg', '#ffd23f'],
  done: ['ferdig', '#8fe3a2'],
};
export function board(parent, x, y, w, rows, { title = 'HOVEDSESSION' } = {}) {
  const g = group(parent, { 'data-unit': '' });
  const h = 74 + rows.length * 46;
  el('rect', { x, y, width: w, height: h, rx: 10, style: 'fill: #0f0a07; stroke: var(--fg)', 'stroke-width': 2.5 }, g);
  text(g, x + 22, y + 36, title, 'bt', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--accent)' });
  path(g, `M${x + 20} ${y + 52} H${x + w - 20}`, '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2 });
  const out = rows.map((r, i) => {
    const ry = y + 90 + i * 46;
    const lamp = el('circle', { cx: x + 32, cy: ry - 6, r: 8, style: `fill: ${STATUS[r.status][1]}` }, g);
    const name = text(g, x + 52, ry, r.name, 'bn', { style: 'font: 700 19px var(--font-mono); fill: var(--fg)' });
    const st = text(g, x + w - 22, ry, STATUS[r.status][0], 'bs', { 'text-anchor': 'end', style: `font: 700 17px var(--font-mono); fill: ${STATUS[r.status][1]}` });
    return { lamp, name, st, y: ry };
  });
  const apply = (i, s) => {
    const [label, color] = STATUS[s];
    out[i].st.textContent = label;
    out[i].st.setAttribute('style', `font: 700 17px var(--font-mono); fill: ${color}`);
    out[i].lamp.setAttribute('style', `fill: ${color}`);
  };
  return {
    g, rows: out, height: h,
    set(tl, i, s, at) {
      tl.call(() => apply(i, s), null, at);
      tl.fromTo(out[i].lamp, { scale: 1.8, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, at);
    },
  };
}

/** Night guard (watchdog): cap, torch with a beam. Stands at (x, floor). */
export function guard(parent, x, { flip = false } = {}) {
  const s = 0.72;
  const f = figure(parent, { x, y: K.floor - 252 * s, s, pose: 'stand', arms: 'point', outfit: 'shirt', color: PALETTE.cloth.navy, hair: 'short', hairColor: PALETTE.hair.grey, skin: PALETTE.skin[1], flip });
  cap(f, '#1f2740');
  // torch in the raised hand, beam ahead of it (behind the body)
  const beam = path(null, 'M140 -62 L520 -230 L560 40 Z', '', { style: 'fill: #ffd23f; fill-opacity: .2; stroke: none', 'data-bg': '' });
  f.inner.insertBefore(beam, f.inner.firstChild);
  el('rect', { x: 124, y: -72, width: 30, height: 16, rx: 3, transform: 'rotate(-40 134 -60)', ...FILL('#2a2d33', 2) }, f.inner);
  f.beam = beam;
  return f;
}

/** Runner (helper): small figure with a cap, standing. */
export function runner(parent, x, { flip = false, arms = 'down' } = {}) {
  const s = 0.6;
  const f = figure(parent, { x, y: K.floor - 252 * s, s, pose: 'stand', arms, outfit: 'hoodie', color: PALETTE.cloth.teal, hair: 'short', hairColor: PALETTE.hair.red, skin: PALETTE.skin[2], flip });
  cap(f, '#ffd23f');
  return f;
}

/** Clip a layer to the kitchen walls (torch beams stop at the edge). */
export function clipToKitchen(g) {
  const id = `kclip-${Math.random().toString(36).slice(2, 8)}`;
  const cp = el('clipPath', { id }, g.ownerSVGElement || g);
  el('rect', { x: K.x0, y: 150, width: K.x1 - K.x0, height: 630, rx: 10 }, cp);
  g.setAttribute('clip-path', `url(#${id})`);
  return g;
}
