import gsap from 'gsap';
import { el, g as group, p as path } from './draw.js';

/*
  The outline-free look (prototype, ?look=new; L toggles it). Same figures, same options and the
  same API as figure() in characters.js, but no ink lines: every shape is built from light.

    key light   warm, from the top left: each part has a lit side and a shadow side (a cel shape,
                hue-shifted toward plum rather than just darker), plus a soft highlight
    rim light   cool, from behind on the right: a thin bright edge that lifts the figure off the
                dark background where the outline used to do it
    occlusion   soft dark where parts meet: under the chin, under the hair, under the body
    lines       only for features (eyes, brows, mouth, glasses), in a dark tone of the part they
                sit on, never black

  Built for the TV: large shapes, no hairlines, no gradients that band.
*/

// ---------- colour ----------
const hex = (c) => {
  let h = String(c).replace('#', '');
  if (h.length === 3) h = [...h].map((x) => x + x).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
export function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export const shadowOf = (c, t = 0.34) => mix(c, '#2a1426', t);   // plum shadow
export const lightOf = (c, t = 0.2) => mix(c, '#fff1dc', t);      // warm key light
export const rimOf = (c) => mix(c, '#d8e6ff', 0.62);              // cool rim
const SHADOW = 'rgba(14,6,4,.38)';

let uid = 0;
// +1, or -1 while a mirrored figure is built: the light stays in the world's top left either way
let SIDE = 1;
const id = (k) => `l2${k}${++uid}`;

/*
  A solid part: base colour, then (clipped to the part) a shadow shape, a highlight shape and a
  rim along its right edge. d is the part's outline; sh / hl are shapes in the same coordinates.
*/
export function solid(parent, d, color, { sh, hl, rim = 3.2, tShadow, tLight, mirror = true, attrs = {} } = {}) {
  const flipT = mirror && SIDE < 0 ? { transform: 'scale(-1 1)' } : {};
  const g = group(parent, attrs);
  path(g, d, '', { style: `fill: ${color}; stroke: none` });
  const cid = id('c');
  const cp = el('clipPath', { id: cid }, g);
  path(cp, d, '');
  const inside = group(g, { 'clip-path': `url(#${cid})` });
  if (sh) path(inside, sh, '', { style: `fill: ${shadowOf(color, tShadow)}; stroke: none`, ...flipT });
  if (hl) path(inside, hl, '', { style: `fill: ${lightOf(color, tLight)}; stroke: none`, ...flipT });
  if (rim) {
    // the part minus itself nudged left: a crescent on the right edge
    const mid = id('m');
    const m = el('mask', { id: mid, maskUnits: 'userSpaceOnUse', x: -400, y: -400, width: 800, height: 800 }, g);
    path(m, d, '', { style: 'fill: #fff; stroke: none' });
    path(m, d, '', { style: 'fill: #000; stroke: none', transform: `translate(${-rim * SIDE} ${rim * 0.35})` });
    path(g, d, '', { style: `fill: ${rimOf(color)}; stroke: none`, mask: `url(#${mid})` });
  }
  return g;
}
const circ = (x, y, r) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const ell = (x, y, rx, ry) => `M${x - rx} ${y} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;

// a sleeve or leg: a thick stroke in the part's shadow tone with a lit stripe along its upper left
function limb(parent, d, color, w = 20) {
  path(parent, d, '', { style: `fill: none; stroke: ${shadowOf(color, 0.16)}`, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  path(parent, d, '', { style: `fill: none; stroke: ${lightOf(color, 0.14)}`, 'stroke-width': w * 0.42, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: `translate(${-w * 0.2 * SIDE} ${-w * 0.16})` });
}
const hand = (parent, x, y, skin, r = 8.5) =>
  solid(parent, circ(x, y, r), skin, { sh: circ(x + r * 0.3 * SIDE, y + r * 0.3, r * 0.7), rim: 0, tShadow: 0.26, mirror: false });

// ---------- hair ----------
const HAIR = {
  short: 'M-32 -72 C-36 -104 -2 -118 24 -106 C38 -98 38 -84 32 -70 C26 -86 10 -94 -6 -89 C-18 -86 -27 -80 -32 -72 Z',
  messy: 'M-33 -70 l-6 -20 l12 6 l-2 -20 l14 12 l4 -18 l10 14 l10 -16 l4 18 l12 -10 l-2 18 l10 -2 l-6 18 C24 -86 10 -94 -6 -89 C-18 -86 -27 -80 -33 -70 Z',
  long: 'M-31 -74 C-26 -104 22 -108 31 -76 C18 -90 -6 -92 -31 -74 Z',
  longBack: 'M-35 -72 C-42 -112 42 -112 35 -72 C37 -40 42 -6 32 12 L-32 12 C-42 -6 -37 -40 -35 -72 Z',
  curlyBack: 'M-38 -70 C-50 -96 -30 -120 0 -114 C30 -120 50 -96 38 -70 C46 -58 40 -44 30 -44 L-30 -44 C-40 -44 -46 -58 -38 -70 Z',
};
// shading shapes stay inside their part's box (they are clipped, but layout checks measure them unclipped)
const HAIR_SH = 'M10 -110 C26 -96 30 -80 38 -60 H38 V-110 Z';
const HAIR_HL = 'M-24 -94 C-14 -104 2 -108 16 -104 C4 -100 -10 -96 -20 -88 Z';
function hairBack(g, style, color) {
  if (style === 'long') solid(g, HAIR.longBack, shadowOf(color, 0.2), { sh: 'M14 -106 C30 -60 30 0 26 12 H40 V-106 Z' });
  if (style === 'curly') solid(g, HAIR.curlyBack, shadowOf(color, 0.12), { sh: HAIR_SH });
}
function hairFront(g, style, color) {
  const d = style === 'bun' ? HAIR.short : HAIR[style];
  if (d) solid(g, d, color, { sh: HAIR_SH, hl: HAIR_HL, tLight: 0.3 });
  if (style === 'bun') solid(g, circ(4, -112, 12), color, { sh: circ(4 + 4 * SIDE, -108, 8), hl: circ(4 - 4 * SIDE, -116, 5), mirror: false });
  if (style === 'curly') {
    for (const [cx, cy, r] of [[-22, -92, 11], [-6, -100, 12], [12, -98, 12], [26, -86, 10]]) {
      solid(g, circ(cx, cy, r), color, { sh: circ(cx + r * 0.3 * SIDE, cy + r * 0.3, r * 0.7), hl: circ(cx - r * 0.35 * SIDE, cy - r * 0.4, r * 0.35), tLight: 0.35, rim: 1.8, mirror: false });
    }
  }
  return d;
}

// ---------- body ----------
const TORSO = 'M-12 -8 C-42 -6 -60 6 -62 42 L-64 124 H64 L62 42 C60 6 42 -6 12 -8 Z';
const TORSO_SH = 'M16 -8 C44 24 40 90 30 124 H64 V-8 Z';
const TORSO_HL = 'M-56 30 C-52 6 -36 -2 -20 -6 C-36 8 -46 22 -50 44 Z';
function outfit(g, kind, color, skin) {
  solid(g, 'M-10 -32 V-4 H10 V-32 Z', shadowOf(skin, 0.3), { rim: 0 });           // neck, in the head's shadow
  solid(g, TORSO, color, { sh: TORSO_SH, hl: TORSO_HL });
  const fold = (d, w = 2.6) => path(g, d, '', { style: `fill: none; stroke: ${shadowOf(color, 0.42)}`, 'stroke-width': w, 'stroke-linecap': 'round' });
  // the chin's shadow on the chest
  path(g, ell(0, -4, 24, 9), '', { style: `fill: ${shadowOf(color, 0.3)}; stroke: none`, opacity: 0.8 });
  if (kind === 'hoodie') {
    solid(g, 'M-28 -10 C-34 -30 34 -30 28 -10 C14 -2 -14 -2 -28 -10 Z', shadowOf(color, 0.1), { sh: 'M8 -26 V-4 H34 V-26 Z', rim: 0 });
    path(g, 'M-8 2 v26 M8 2 v26', '', { style: `fill: none; stroke: ${lightOf(color, 0.45)}`, 'stroke-width': 3, 'stroke-linecap': 'round' });
    path(g, 'M-30 84 H30 L24 108 H-24 Z', '', { style: `fill: ${shadowOf(color, 0.14)}; stroke: none` });
  }
  if (kind === 'shirt' || kind === 'blazer') {
    solid(g, 'M-12 -8 L0 10 L12 -8 Z', '#e9e2d6', { sh: 'M0 -8 V10 H12 V-8 Z', rim: 0, tShadow: 0.2 });
    if (kind === 'blazer') {
      path(g, 'M-12 -8 L-4 40 L-26 124 H-6 L0 40 Z', '', { style: `fill: ${shadowOf(color, 0.2)}; stroke: none` });
      path(g, 'M12 -8 L4 40 L26 124 H40 L16 -8 Z', '', { style: `fill: ${lightOf(color, 0.1)}; stroke: none` });
    } else fold('M0 12 V120', 2.4);
  }
  if (kind === 'sweater') { fold('M-14 -8 Q0 10 14 -8'); path(g, 'M-58 106 H58 V124 H-58 Z', '', { style: `fill: ${shadowOf(color, 0.18)}; stroke: none` }); }
  if (kind === 'dress') {
    solid(g, 'M-14 -8 Q0 14 14 -8 Z', skin, { rim: 0 });
    solid(g, circ(0, 12, 4), '#e9e2d6', { rim: 0 });
  }
}

function arms(g, kind, color, skin) {
  const out = { phone: null };
  const L = [-52, 14], R = [52, 14];
  if (kind === 'phone' || kind === 'phoneLow' || kind === 'phoneHigh') {
    const hy = { phone: 46, phoneLow: 104, phoneHigh: 22 }[kind];
    limb(g, `M${L[0]} ${L[1]} Q-70 70 -40 ${hy + 8} L-18 ${hy}`, color);
    limb(g, `M${R[0]} ${R[1]} Q70 70 40 ${hy + 8} L16 ${hy}`, color);
    hand(g, -16, hy, skin); hand(g, 14, hy, skin);
    out.phone = { x: -12, y: hy - 30 };
  }
  if (kind === 'table') {
    limb(g, `M${L[0]} ${L[1]} Q-66 80 -30 104`, color); limb(g, `M${R[0]} ${R[1]} Q66 80 30 104`, color);
    hand(g, -26, 106, skin); hand(g, 26, 106, skin);
  }
  if (kind === 'fork') {
    limb(g, `M${L[0]} ${L[1]} Q-70 70 -40 54 L-18 46`, color);
    hand(g, -16, 46, skin);
    out.phone = { x: -12, y: 16 };
    limb(g, `M${R[0]} ${R[1]} Q68 80 44 104`, color);
    hand(g, 44, 106, skin);
    path(g, 'M50 104 L82 80 M78 76 l8 6 M82 72 l8 6', '', { style: 'fill: none; stroke: #cfc6bb', 'stroke-width': 3, 'stroke-linecap': 'round' });
  }
  if (kind === 'cross') {
    limb(g, `M${L[0]} ${L[1]} Q-74 64 -40 78 L34 70`, color);
    limb(g, `M${R[0]} ${R[1]} Q74 64 40 82 L-30 78`, color);
    hand(g, 36, 68, skin); hand(g, -34, 80, skin);
  }
  if (kind === 'point') {
    limb(g, `M${L[0]} ${L[1]} Q-70 70 -50 110`, color); hand(g, -50, 114, skin);
    limb(g, `M${R[0]} ${R[1]} L96 -20 L130 -54`, color); hand(g, 134, -58, skin);
  }
  if (kind === 'down') {
    limb(g, `M${L[0]} ${L[1]} Q-70 70 -62 118`, color); hand(g, -62, 122, skin);
    limb(g, `M${R[0]} ${R[1]} Q70 70 62 118`, color); hand(g, 62, 122, skin);
  }
  if (kind === 'open') {
    limb(g, `M${L[0]} ${L[1]} Q-80 50 -70 90 L-40 104`, color); hand(g, -36, 104, skin);
    limb(g, `M${R[0]} ${R[1]} Q80 50 70 90 L40 104`, color); hand(g, 36, 104, skin);
  }
  return out;
}

// ---------- face ----------
function face(g, { glasses, lashes, skin, hairColor }) {
  const parts = { eyes: {}, mouth: {}, brows: {} };
  const mk = (bucket, name) => (parts[bucket][name] = group(g, { opacity: 0 }));
  const line = (grp, d, color, w = 2.8) => path(grp, d, '', { style: `fill: none; stroke: ${color}`, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const brow = shadowOf(hairColor, 0.25), lid = shadowOf(skin, 0.55), lip = mix(skin, '#5a1e1e', 0.6);
  const eyeW = (grp, dy = 0, r = 2.6) => {
    for (const x of [-11, 11]) {
      el('ellipse', { cx: x, cy: -66, rx: 5.4, ry: 4, style: 'fill: #fff7ec; stroke: none' }, grp);
      el('circle', { cx: x + 0.4, cy: -66 + dy, r, style: 'fill: #22140e; stroke: none' }, grp);
      el('circle', { cx: x - 0.8, cy: -67.2 + dy, r: 0.9, style: 'fill: #fff; stroke: none' }, grp);
    }
  };
  eyeW(mk('eyes', 'open'));
  eyeW(mk('eyes', 'down'), 1.8);
  eyeW(mk('eyes', 'wide'), 0, 1.7);
  line(mk('eyes', 'closed'), 'M-16 -66 q5 4 10 0 M6 -66 q5 4 10 0', lid);
  line(mk('brows', 'neutral'), 'M-17 -76 q6 -3 12 0 M5 -76 q6 -3 12 0', brow, 3.4);
  line(mk('brows', 'annoyed'), 'M-18 -79 l12 5 M18 -79 l-12 5', brow, 3.6);
  line(mk('brows', 'raised'), 'M-17 -81 q6 -5 12 0 M5 -81 q6 -5 12 0', brow, 3.4);
  line(mk('brows', 'tired'), 'M-17 -75 q6 2 12 -1 M5 -76 q6 3 12 1', brow, 3.4);
  line(mk('mouth', 'smile'), 'M-9 -46 q9 8 18 0', lip);
  path(mk('mouth', 'grin'), 'M-11 -47 q11 12 22 0 Z', '', { style: 'fill: #4a1a18; stroke: none' });
  line(mk('mouth', 'neutral'), 'M-7 -44 h14', lip);
  line(mk('mouth', 'frown'), 'M-9 -42 q9 -6 18 0', lip);
  path(mk('mouth', 'talk'), 'M-7 -47 q7 9 14 0 Z', '', { style: 'fill: #4a1a18; stroke: none' });
  // the nose: a small shadow shape, not a line
  path(g, 'M2 -62 q6 7 0 10 q-3 1 -5 -1 q4 -2 5 -9 Z', '', { style: `fill: ${shadowOf(skin, 0.3)}; stroke: none` });
  // a touch of warmth on the cheeks, for everyone
  for (const x of [-17, 17]) el('ellipse', { cx: x, cy: -53, rx: 6.5, ry: 3.6, style: 'fill: #e8705e; stroke: none', opacity: lashes ? 0.42 : 0.2 }, g);
  if (lashes) line(g, 'M-16 -68 l-4 -4 M-15 -70 l-2 -5 M16 -68 l4 -4 M15 -70 l2 -5', '#22140e', 2.2);
  if (glasses) {
    path(g, 'M-20 -66 a9 8 0 1 0 18 0 a9 8 0 1 0 -18 0 M2 -66 a9 8 0 1 0 18 0 a9 8 0 1 0 -18 0', '', { style: 'fill: rgba(200,225,255,.16); stroke: none' });
    line(g, 'M-20 -66 a9 8 0 1 0 18 0 a9 8 0 1 0 -18 0 M2 -66 a9 8 0 1 0 18 0 a9 8 0 1 0 -18 0 M-2 -67 h4', '#24150f', 2.8);
    line(g, 'M-14 -70 l4 -2 M8 -70 l4 -2', 'rgba(255,255,255,.7)', 2);
  }
  return parts;
}

const FACE = 'M-31 -70 C-31 -106 31 -106 31 -70 C31 -44 18 -27 0 -25 C-18 -27 -31 -44 -31 -70 Z';
const FACE_SH = 'M12 -97 C30 -86 30 -46 0 -25 H31 V-97 Z';

export function figure2(parent, opts = {}) {
  const {
    x = 0, y = 0, s = 1, pose = 'sit', arms: armKind = 'table', hair = 'short',
    hairColor = '#2b1d14', skin = '#e2b48f', outfit: kind = 'shirt',
    color = '#3c4a5c', glasses = false, flip = false, slim = false, lashes = false,
    eyes = 'open', mouth = 'neutral', brows = 'neutral',
  } = opts;
  SIDE = flip ? -1 : 1;
  const wrap = group(parent, { 'data-figure': '' });
  const root = group(wrap, { transform: `translate(${x} ${y}) scale(${flip ? -s : s} ${s})` });
  // contact shadow: a wide soft one and a darker core where the body sits or stands
  const sy = pose === 'stand' ? 256 : 126;
  if (pose !== 'lie') {
    path(root, ell(6, sy, 92, 13), '', { style: `fill: ${SHADOW}; stroke: none`, opacity: 0.55 });
    path(root, ell(4, sy, 62, 7), '', { style: `fill: ${SHADOW}; stroke: none` });
  }
  const back = group(root);
  hairBack(back, hair, hairColor);
  const body = group(root, slim ? { transform: 'scale(0.84 1)' } : {});
  if (pose === 'stand') {
    limb(body, 'M-20 118 L-24 246', '#2c3550', 24);
    limb(body, 'M20 118 L24 246', '#2c3550', 24);
    solid(body, ell(-30, 252, 18, 8), '#241812', { rim: 2 });
    solid(body, ell(30, 252, 18, 8), '#241812', { rim: 2 });
  }
  let phone = null;
  if (pose !== 'lie') {
    outfit(body, kind, color, skin);
    phone = arms(body, armKind, color, skin).phone;
  }
  const head = group(root, { 'data-head': '' });
  // ears, in the shadow of the head
  solid(head, 'M-30 -68 q-10 2 -7 15 q3 6 9 4 Z', shadowOf(skin, SIDE > 0 ? 0.12 : 0.24), { rim: SIDE > 0 ? 0 : 2 });
  solid(head, 'M30 -68 q10 2 7 15 q-3 6 -9 4 Z', shadowOf(skin, SIDE > 0 ? 0.24 : 0.12), { rim: SIDE > 0 ? 2 : 0 });
  const f = solid(head, FACE, skin, { sh: FACE_SH, tShadow: 0.26 });
  const parts = face(head, { glasses, lashes, skin, hairColor });
  // the hair's shadow on the forehead
  const hd = hair === 'bun' ? HAIR.short : HAIR[hair];
  if (hd) {
    const cid = id('h');
    const cp = el('clipPath', { id: cid }, f);
    path(cp, FACE, '');
    path(f, hd, '', { style: `fill: ${shadowOf(skin, 0.32)}; stroke: none`, transform: 'translate(2 6)', 'clip-path': `url(#${cid})` });
  }
  hairFront(head, hair, hairColor);

  SIDE = 1;
  const state = { eyes, mouth, brows };
  const show = (bucket, name) => {
    for (const [k, node] of Object.entries(parts[bucket])) node.setAttribute('opacity', k === name ? 1 : 0);
  };
  show('eyes', eyes); show('mouth', mouth); show('brows', brows);
  if (pose !== 'lie') idle(body, head, parts, state, wrap);

  return {
    root: wrap, inner: root, head,
    phone: phone && { x: x + (flip ? -phone.x : phone.x) * s, y: y + phone.y * s },
    set(next) { for (const b of ['eyes', 'mouth', 'brows']) if (next[b]) { state[b] = next[b]; show(b, next[b]); } },
    expr(tl, next, at) { tl.call(() => this.set(next), null, at); },
    talk(speed = 0.18) {
      return gsap.timeline({ repeat: -1 })
        .call(() => show('mouth', 'talk')).to({}, { duration: speed })
        .call(() => show('mouth', state.mouth === 'talk' ? 'neutral' : state.mouth)).to({}, { duration: speed * 1.4 });
    },
  };
}

// a slow breath (the chest rises, the head rides on it) and a blink now and then; both stop once
// the figure has left the page
function idle(body, head, parts, state, wrap) {
  const T = 3.2 + Math.random() * 0.8;
  const d = Math.random() * T;
  const br = gsap.to(body, { scaleY: 1.016, scaleX: 1.006, transformOrigin: '50% 100%', duration: T / 2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: d,
    onRepeat: () => { if (!wrap.isConnected) br.kill(); } });
  const hb = gsap.to(head, { y: -1.6, duration: T / 2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: d,
    onRepeat: () => { if (!wrap.isConnected) hb.kill(); } });
  const blink = () => {
    if (!wrap.isConnected) return;
    if (state.eyes === 'open' || state.eyes === 'down') {
      const was = state.eyes;
      for (const [k, n] of Object.entries(parts.eyes)) n.setAttribute('opacity', k === 'closed' ? 1 : 0);
      setTimeout(() => { if (state.eyes === was) for (const [k, n] of Object.entries(parts.eyes)) n.setAttribute('opacity', k === was ? 1 : 0); }, 130);
    }
    setTimeout(blink, 2600 + Math.random() * 3400);
  };
  setTimeout(blink, 1500 + Math.random() * 3000);
}
