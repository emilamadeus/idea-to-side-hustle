import gsap from 'gsap';
import { el, g as group, p as path, text, inkFor } from './draw.js';
import { figure, PALETTE, LOOK } from './characters.js';
import { FILL } from './props.js';

/*
  Shared mine for the session slides (parallel sessions, helpers, watchdog).
  (The file keeps its old name and API from when the scene was a kitchen.)
  Each rock face is a session, worked by a robot miner; the helper is a small robot in the
  side tunnel; the overseer with the whip and headlamp is the watchdog; you are the boss
  with the whip. Work orders hang from the beam; finished ore leaves in carts on the track.

  Fixed geometry (svg units):
    mine       x 560–1480, y 150–780
    beam       y 190 (work orders hang y 196–270), slots RAIL_X
    rock face  top y 540, floor y 680; work order clip above the miner at y 286–360
    track      front y 690–740; carts roll out to the right
    side tunnel (optional) x 560–730, door at x 700–730
*/

export const K = { x0: 560, x1: 1480, rail: 190, top: 540, floor: 680, pass: 690 };
export const RAIL_X = [600, 745, 890, 1035, 1180, 1325];
export const TW = 120, TH = 74;
const ROCK = '#1f1711', ROCK_A = '#2b2018', ROCK_B = '#33271d', WOOD = '#6b4a30', STEEL = '#8b8f96';
const METAL = ['#a7b0ba', '#c2ab84', '#8fb0aa'];

// a lumpy rock outline around (cx, cy), radius r, deterministic
function lump(cx, cy, r, seed = 1, squash = 0.7) {
  const n = 9, pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const j = 0.78 + 0.22 * Math.abs(Math.sin(seed * 12.9898 + k * 78.233));
    pts.push(`${(cx + Math.cos(a) * r * j).toFixed(1)} ${(cy + Math.sin(a) * r * j * squash).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/** Mine with three layers: back (rock walls, beam), mid (miners), front (track). */
export function room(svg, { corridor = false } = {}) {
  const back = group(svg, { 'data-bg': '' });
  const x0 = corridor ? 740 : K.x0;
  el('rect', { x: K.x0, y: 150, width: K.x1 - K.x0, height: 630, rx: 10, style: `fill: ${ROCK}; stroke: var(--deco)`, 'stroke-width': 2 }, back);
  // rock wall: blocks of stone
  let seed = 1;
  for (let y = 300; y < K.floor; y += 70) {
    for (let x = x0 + 40 + ((y / 70) % 2) * 50; x < K.x1 - 20; x += 110) {
      path(back, lump(x, y, 46, seed++, 0.6), '', { style: `fill: ${seed % 2 ? ROCK_A : ROCK_B}; stroke: #120c08`, 'stroke-width': 2 });
    }
  }
  // timber supports: posts and the beam the work orders hang from
  for (const x of [x0 + 14, K.x1 - 26]) el('rect', { x, y: K.rail - 6, width: 14, height: K.floor - K.rail + 6, style: `fill: ${WOOD}; stroke: #1a120c`, 'stroke-width': 2 }, back);
  el('rect', { x: x0 + 6, y: K.rail - 10, width: K.x1 - x0 - 12, height: 14, rx: 2, style: `fill: ${WOOD}; stroke: #1a120c`, 'stroke-width': 2 }, back);
  // lamps on the beam
  for (let x = x0 + 120; x < K.x1 - 60; x += 260) {
    path(back, `M${x} ${K.rail + 4} V${K.rail + 70}`, '', { style: 'fill: none; stroke: #4b4f57', 'stroke-width': 2 });
    el('circle', { cx: x, cy: K.rail + 78, r: 9, style: 'fill: #ffd23f; stroke: #1a120c', 'stroke-width': 2 }, back);
  }
  el('rect', { x: K.x0, y: K.floor, width: K.x1 - K.x0, height: 100, style: 'fill: #150f0b' }, back);
  let corr = null;
  if (corridor) {
    corr = group(back);
    el('rect', { x: K.x0, y: 150, width: 170, height: 630, rx: 10, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2 }, corr);
    el('rect', { x: K.x0 + 170, y: 150, width: 10, height: 630, style: `fill: ${WOOD}` }, corr);
    text(corr, K.x0 + 85, 196, 'SIDEGANG', 'kc', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
  }
  const mid = group(svg);
  const front = group(svg, { 'data-bg': '' });
  // the track: sleepers and two rails
  el('rect', { x: K.x0, y: K.pass + 6, width: K.x1 - K.x0, height: 58, style: 'fill: #150f0b' }, front);
  for (let x = K.x0 + 16; x < K.x1 - 10; x += 44) el('rect', { x, y: K.pass + 10, width: 26, height: 44, rx: 2, style: `fill: ${WOOD}; stroke: #1a120c`, 'stroke-width': 2 }, front);
  for (const y of [K.pass + 14, K.pass + 40]) el('rect', { x: K.x0 + 4, y, width: K.x1 - K.x0 - 8, height: 7, rx: 2, style: `fill: ${STEEL}; stroke: ${inkFor(STEEL)}`, 'stroke-width': 2 }, front);
  const top = group(svg); // ore, work orders in flight, bubbles
  return { back, mid, front, top, corr };
}

/** Door in the side-tunnel wall (closed by default); returns { g, leaf }. */
export function door(parent) {
  const g = group(parent, { 'data-bg': '' });
  el('rect', { x: 728, y: 430, width: 12, height: 250, style: 'fill: #0f0a07' }, g);
  const leaf = el('rect', { x: 730, y: 430, width: 10, height: 250, style: `fill: ${WOOD}; stroke: #1a120c`, 'stroke-width': 2 }, g);
  return { g, leaf };
}

/** Miner's helmet with a lamp, drawn on the head (local figure units). */
export function toque(f, color = '#ffd23f') {
  path(f.head, 'M-36 -80 C-38 -124 38 -124 36 -80 Z', '', FILL(color));
  el('rect', { x: -42, y: -86, width: 84, height: 11, rx: 4, ...FILL(color) }, f.head);
  el('circle', { cx: 0, cy: -104, r: 9, ...FILL('#fff3e3', 2) }, f.head);
}
/** Peaked cap. */
export function cap(f, color) {
  path(f.head, 'M-33 -84 C-33 -118 33 -118 33 -84 Z', '', FILL(color));
  path(f.head, 'M26 -86 H56 q6 6 -4 9 H26 Z', '', FILL(color));
}
/** Robot details on a figure's head: rivets and a jaw seam. */
function bolts(f) {
  for (const x of [-24, 24]) el('circle', { cx: x, cy: -46, r: 3.5, style: 'fill: #4b4f57' }, f.head);
  path(f.head, 'M-20 -34 H20', '', { style: 'fill: none; stroke: #4b4f57', 'stroke-width': 2 });
}
/** A robot miner (an AI session): metal skin, bolts, helmet. */
export function robot(parent, { x, y, s = 0.85, pose = 'sit', arms = 'table', metal = METAL[0], helmet = '#ffd23f', flip = false, goggles = false, ...face } = {}) {
  const f = figure(parent, { x, y, s, pose, arms, outfit: 'shirt', color: '#5f6772', hair: 'none', skin: metal, glasses: goggles, flip, ...face });
  bolts(f);
  toque(f, helmet);
  return f;
}

/**
 * Whip in the raised hand of a figure with arms 'point' (local units). The lash is
 * background (not part of the figure's body box). Returns { g, crack(tl, at) }.
 */
export function whip(f) {
  const g = group(null, { 'data-bg': '' });
  f.inner.appendChild(g);
  el('rect', { x: 126, y: -96, width: 12, height: 44, rx: 4, transform: 'rotate(18 132 -74)', ...FILL('#3a2416', 2) }, g);
  const LASH = 'M138 -96 C170 -170 250 -170 270 -110 C282 -74 252 -60 236 -84';
  path(g, LASH, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 10, 'stroke-linecap': 'round' });
  const lash = path(g, LASH, '', { style: 'fill: none; stroke: #c08a52', 'stroke-width': 5, 'stroke-linecap': 'round' });
  const burst = path(g, 'M236 -84 l10 -22 l4 18 l20 -8 l-12 16 l18 10 l-22 0 l2 20 l-12 -16 l-14 14 l4 -20 l-20 -4 l20 -8 Z', '', { style: 'fill: #ffd23f; stroke: #1a120c', 'stroke-width': 2, opacity: 0 });
  return {
    g, lash, burst,
    crack(tl, at) {
      tl.fromTo(g, { rotation: -14, svgOrigin: '132 -74' }, { rotation: 0, duration: 0.18, ease: 'power3.in', immediateRender: false }, at);
      tl.fromTo(burst, { opacity: 0, scale: 0.4, svgOrigin: '246 -84' }, { opacity: 1, scale: 1.2, duration: 0.15, immediateRender: false }, at + 0.16);
      tl.to(burst, { opacity: 0, duration: 0.25 }, at + 0.4);
    },
  };
}

/** You, the boss: hard hat and a whip. */
export function boss(parent, x, { s = 0.72, flip = false } = {}) {
  const f = figure(parent, { x, y: K.floor - 252 * s, s, pose: 'stand', arms: 'point', ...LOOK.me, flip });
  toque(f, '#fff3e3');
  f.whip = whip(f);
  return f;
}

/** One rock face: a robot miner behind a boulder, swinging a pickaxe. */
export function station(parent, x, look = {}) {
  const g = group(parent);
  const cook = robot(g, { x, y: 492, metal: look.metal ?? METAL[0], goggles: look.glasses });
  // pickaxe: pivots at the hands behind the rock; the head swings down onto it
  const pan = group(g, { 'data-bg': '' });
  path(pan, `M${x + 10} ${K.top + 30} L${x + 64} ${K.top - 86}`, '', { style: 'fill: none; stroke: #8a5a34', 'stroke-width': 8, 'stroke-linecap': 'round' });
  path(pan, `M${x + 28} ${K.top - 92} Q${x + 66} ${K.top - 108} ${x + 104} ${K.top - 74}`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 12, 'stroke-linecap': 'round' });
  path(pan, `M${x + 28} ${K.top - 92} Q${x + 66} ${K.top - 108} ${x + 104} ${K.top - 74}`, '', { style: 'fill: none; stroke: #9aa3ad', 'stroke-width': 7, 'stroke-linecap': 'round' });
  gsap.set(pan, { svgOrigin: `${x + 10} ${K.top + 30}` });
  const counter = group(g, { 'data-bg': '' });
  path(counter, `M${x - 104} ${K.floor} L${x - 100} ${K.top + 20} L${x - 70} ${K.top - 6} L${x - 20} ${K.top - 12} L${x + 30} ${K.top - 4} L${x + 80} ${K.top - 10} L${x + 104} ${K.top + 24} L${x + 108} ${K.floor} Z`, '', { style: 'fill: #4a3a2c; stroke: #120c08', 'stroke-width': 2.4 });
  path(counter, `M${x - 60} ${K.top + 60} l30 -20 l26 26 M${x + 20} ${K.top + 100} l34 -14 l20 30`, '', { style: 'fill: none; stroke: #2a2018', 'stroke-width': 3, 'stroke-linecap': 'round' });
  [[-40, 40], [44, 66], [-6, 112]].forEach(([dx, dy]) => path(counter, lump(x + dx, K.top + dy, 12, dx + dy, 0.8), '', { style: 'fill: #ff7a2f; stroke: #1a120c', 'stroke-width': 2 }));
  // chips flying off the rock while digging
  const steam = path(g, `M${x + 70} ${K.top - 30} l8 -8 l6 8 Z M${x + 92} ${K.top - 46} l7 -7 l5 7 Z M${x + 54} ${K.top - 52} l6 -6 l5 6 Z`, '', { style: 'fill: #cfc3b2; stroke: #1a120c', 'stroke-width': 1.5, opacity: 0, 'data-bg': '' });
  return { g, cook, pan, steam, x, clip: { x: x - TW / 2, y: 286 } };
}

/** Work order; group positioned with gsap x/y (top-left corner). */
export function ticket(parent, label, { blank = false } = {}) {
  const g = group(parent, blank ? { 'data-bg': '' } : { 'data-unit': '' });
  el('rect', { x: 0, y: 0, width: TW, height: TH, rx: 3, style: 'fill: #fff3e3; stroke: #b9a88f', 'stroke-width': 2 }, g);
  el('rect', { x: TW / 2 - 14, y: -8, width: 28, height: 14, rx: 2, style: `fill: ${STEEL}; stroke: ${inkFor(STEEL)}`, 'stroke-width': 2 }, g);
  if (blank) path(g, 'M14 30 H96 M14 48 H70', '', { style: 'fill: none; stroke: #b9a88f', 'stroke-width': 4, 'stroke-linecap': 'round' });
  else {
    text(g, 12, 26, 'ORDRE', 'tk', { style: 'font: 700 11px var(--font-mono); letter-spacing: .14em; fill: #7a5a3a' });
    text(g, 12, 54, label, 'tl', { style: 'font: 700 17px var(--font-mono); fill: #1a120c' });
  }
  return g;
}

/** A chunk of ore, centred on (0,0) at the surface it rests on. */
export function plate(parent, color = '#ff7a2f') {
  const g = group(parent, { 'data-bg': '' });
  path(g, lump(0, -14, 30, 3, 0.62), '', FILL('#5a4636', 2));
  path(g, lump(-6, -18, 11, 5, 0.8), '', FILL(color, 2));
  path(g, lump(12, -10, 7, 7, 0.8), '', FILL(color, 2));
  return g;
}

/** A mine cart full of ore, centred on (0,0) on the track. */
function cart(parent, color) {
  const g = group(parent, { 'data-bg': '' });
  [-20, 6, 26].forEach((dx, k) => path(g, lump(dx - 4, -40, 14, k + 2, 0.8), '', FILL(k === 1 ? color : '#5a4636', 2)));
  path(g, 'M-42 -40 H42 L34 -10 H-34 Z', '', FILL('#4b4f57', 2.4));
  [-22, 22].forEach((dx) => el('circle', { cx: dx, cy: -6, r: 8, ...FILL('#2a2d33', 2) }, g));
  return g;
}

/** Drop a cart of ore from a rock face onto the track and roll it out of the mine. */
export function serve(tl, parent, x, at, { color, hold = 0.35 } = {}) {
  const pl = cart(parent, color);
  gsap.set(pl, { x, y: K.pass + 10, opacity: 0 });
  tl.to(pl, { opacity: 1, duration: 0.2 }, at);
  tl.fromTo(pl, { y: K.pass - 30 }, { y: K.pass + 10, duration: 0.3, ease: 'bounce.out' }, at);
  tl.to(pl, { x: K.x1 + 10, duration: 1.1, ease: 'power2.in' }, at + 0.3 + hold);
  tl.to(pl, { opacity: 0, duration: 0.2 }, at + 1.25 + hold);
  return pl;
}

/** Dig: the pickaxe swings and chips fly, as a finite tween on the timeline. */
export function cookFor(tl, st, at, dur) {
  tl.to(st.steam, { opacity: 0.9, duration: 0.2 }, at);
  tl.fromTo(st.pan, { rotation: 0 }, { rotation: 24, duration: 0.18, repeat: Math.max(1, Math.round(dur / 0.36)) * 2 - 1, yoyo: true, ease: 'power2.in', immediateRender: false }, at);
  tl.to(st.steam, { opacity: 0, duration: 0.3 }, at + dur);
}

/** Lead session's status board. rows: [{ name, status }]; returns { rows, set(tl, i, status, at) }. */
export const STATUS = {
  queue: ['i kø', 'var(--muted)'],
  cook: ['graver', '#ff7a2f'],
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

/** The overseer (watchdog): a robot with a whip and a headlamp. Stands at (x, floor). */
export function guard(parent, x, { flip = false } = {}) {
  const s = 0.72;
  const f = robot(parent, { x, y: K.floor - 252 * s, s, pose: 'stand', arms: 'point', metal: '#6f7a86', helmet: '#c4562a', flip });
  // headlamp beam, behind the body
  const beam = path(null, 'M30 -104 L520 -250 L560 30 Z', '', { style: 'fill: #ffd23f; fill-opacity: .2; stroke: none', 'data-bg': '' });
  f.inner.insertBefore(beam, f.inner.firstChild);
  f.beam = beam;
  f.whip = whip(f);
  return f;
}

/** Helper: a small robot with a cap, standing. */
export function runner(parent, x, { flip = false, arms = 'down' } = {}) {
  const s = 0.6;
  const f = robot(parent, { x, y: K.floor - 252 * s, s, pose: 'stand', arms, metal: METAL[2], helmet: '#2f8a4a', flip });
  return f;
}

/** Clip a layer to the mine walls (headlamp beams stop at the edge). */
export function clipToKitchen(g) {
  const id = `kclip-${Math.random().toString(36).slice(2, 8)}`;
  const cp = el('clipPath', { id }, g.ownerSVGElement || g);
  el('rect', { x: K.x0, y: 150, width: K.x1 - K.x0, height: 630, rx: 10 }, cp);
  g.setAttribute('clip-path', `url(#${id})`);
  return g;
}

export { METAL };
