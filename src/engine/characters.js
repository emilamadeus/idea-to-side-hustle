import gsap from 'gsap';
import { el, g as group, p as path, inkFor } from './draw.js';

/*
  Character kit: flat-filled figures with light ink outlines (reads well on a TV).

  figure(parent, {
    x, y          neck base position (svg units)
    s             scale (1 ≈ head 70 units tall)
    pose          'sit' (upper body) | 'stand' | 'lie'
    arms          'phone' | 'phoneLow' | 'phoneHigh' | 'table' | 'cross' | 'point' | 'fork' | 'down' | 'open'
    hair          'short' | 'messy' | 'long' | 'bun' | 'curly'
    hairColor, skin, outfit ('hoodie'|'shirt'|'sweater'|'dress'|'blazer'), color
    glasses       boolean
    slim          narrower body and arms
    lashes        eyelashes and a touch of blush
    flip          mirror horizontally (faces the other way for 'point')
  })
  → { root, head, phone: {x, y} | null, expr(tl, {eyes, mouth, brows}, at), set({eyes,mouth,brows}) }

  Expressions:
    eyes   'open' | 'down' | 'closed' | 'wide'
    mouth  'smile' | 'neutral' | 'frown' | 'talk' | 'grin'
    brows  'neutral' | 'annoyed' | 'raised' | 'tired'
*/

export const PALETTE = {
  ink: 'var(--fg)',
  skin: ['#e2b48f', '#c98f66', '#f0caa6', '#a8704b'],
  hair: { dark: '#2b1d14', brown: '#6b4128', blonde: '#d4a35a', golden: '#ecc874', grey: '#a9a09a', red: '#a8482a' },
  cloth: { slate: '#3c4a5c', wine: '#7e2f45', olive: '#55603a', rust: '#9a4a22', navy: '#2c3550', sand: '#9c8466', teal: '#2f5b5a' },
};

// Recurring cast, so the same person looks the same on every slide.
export const LOOK = {
  me: { hair: 'messy', hairColor: '#6b4128', skin: '#e2b48f', outfit: 'hoodie', color: '#3c4a5c', glasses: true },
  claude: { hair: 'short', hairColor: '#2b1d14', skin: '#f0caa6', outfit: 'hoodie', color: '#c4562a' },
  gpt: { hair: 'bun', hairColor: '#2b1d14', skin: '#c98f66', outfit: 'sweater', color: '#2f5b5a' },
};

// Fills go in style: the deck stylesheet sets fill:none on svg paths, which beats attributes.
// dark ink outlines, like a rendered illustration; very dark fills get a soft warm edge
const INK = { style: 'fill: none; stroke: #1a120c', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
const fillInk = (fill) => ({ ...INK, style: `fill: ${fill}; stroke: ${inkFor(fill)}` });

function limb(parent, d, color, w = 20) {
  // thick sleeve with an ink outline: ink stroke underneath, cloth stroke on top
  path(parent, d, '', { fill: 'none', style: `stroke: ${inkFor(color)}`, 'stroke-width': w + 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  path(parent, d, '', { fill: 'none', style: `stroke: ${color}`, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
}
const hand = (parent, x, y, skin, r = 8.5) => el('circle', { cx: x, cy: y, r, ...fillInk(skin) }, parent);

function hairBack(g, style, color) {
  if (style === 'long') path(g, 'M-35 -72 C-42 -112 42 -112 35 -72 C37 -40 42 -6 32 12 L-32 12 C-42 -6 -37 -40 -35 -72 Z', '', fillInk(color));
  if (style === 'curly') path(g, 'M-38 -70 C-50 -96 -30 -120 0 -114 C30 -120 50 -96 38 -70 C46 -58 40 -44 30 -44 L-30 -44 C-40 -44 -46 -58 -38 -70 Z', '', fillInk(color));
}
function hairFront(g, style, color) {
  if (style === 'short' || style === 'bun') path(g, 'M-32 -72 C-36 -104 -2 -118 24 -106 C38 -98 38 -84 32 -70 C26 -86 10 -94 -6 -89 C-18 -86 -27 -80 -32 -72 Z', '', fillInk(color));
  if (style === 'bun') el('circle', { cx: 4, cy: -112, r: 12, ...fillInk(color) }, g);
  if (style === 'messy') path(g, 'M-33 -70 l-6 -20 l12 6 l-2 -20 l14 12 l4 -18 l10 14 l10 -16 l4 18 l12 -10 l-2 18 l10 -2 l-6 18 C24 -86 10 -94 -6 -89 C-18 -86 -27 -80 -33 -70 Z', '', fillInk(color));
  if (style === 'long') path(g, 'M-31 -74 C-26 -104 22 -108 31 -76 C18 -90 -6 -92 -31 -74 Z', '', fillInk(color));
  if (style === 'curly') {
    for (const [cx, cy, r] of [[-22, -92, 11], [-6, -100, 12], [12, -98, 12], [26, -86, 10]]) el('circle', { cx, cy, r, ...fillInk(color) }, g);
  }
}

function outfit(g, kind, color, skin) {
  // neck
  path(g, 'M-10 -32 V-4 H10 V-32', '', fillInk(skin));
  // torso
  path(g, 'M-12 -8 C-42 -6 -60 6 -62 42 L-64 124 H64 L62 42 C60 6 42 -6 12 -8 Z', '', fillInk(color));
  if (kind === 'hoodie') {
    path(g, 'M-28 -10 C-34 -30 34 -30 28 -10', '', fillInk(color));
    path(g, 'M-8 2 v26 M8 2 v26', '', { ...INK, 'stroke-width': 2 });
    path(g, 'M-30 84 H30 L24 108 H-24 Z', '', { ...fillInk('none'), 'stroke-width': 2 });
  }
  if (kind === 'shirt' || kind === 'blazer') {
    path(g, 'M-12 -8 L0 10 L12 -8', '', fillInk('#e9e2d6'));
    if (kind === 'blazer') path(g, 'M-12 -8 L-4 40 L-26 120 M12 -8 L4 40 L26 120', '', { ...fillInk('none'), 'stroke-width': 2 });
    else path(g, 'M0 12 V120', '', { ...INK, 'stroke-width': 1.6 });
  }
  if (kind === 'sweater') path(g, 'M-14 -8 Q0 10 14 -8 M-50 112 H50', '', { ...fillInk('none'), 'stroke-width': 2 });
  if (kind === 'dress') {
    path(g, 'M-14 -8 Q0 14 14 -8', '', fillInk(skin));
    el('circle', { cx: 0, cy: 12, r: 4, ...fillInk('#e9e2d6'), 'stroke-width': 1.6 }, g);
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
    path(g, 'M50 104 L82 80 M78 76 l8 6 M82 72 l8 6', '', { ...INK });
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

function face(g, { glasses, lashes }) {
  const parts = { eyes: {}, mouth: {}, brows: {} };
  const mk = (bucket, name) => (parts[bucket][name] = group(g, { opacity: 0 }));
  const eyeW = (grp, dy = 0, r = 2.4) => {
    for (const x of [-11, 11]) {
      el('ellipse', { cx: x, cy: -66, rx: 5.2, ry: 3.8, fill: '#fff3e3' }, grp);
      el('circle', { cx: x, cy: -66 + dy, r, fill: '#1a120c' }, grp);
    }
  };
  eyeW(mk('eyes', 'open'));
  eyeW(mk('eyes', 'down'), 1.8);
  eyeW(mk('eyes', 'wide'), 0, 1.6);
  path(mk('eyes', 'closed'), 'M-16 -66 q5 4 10 0 M6 -66 q5 4 10 0', '', fillInk('none'));
  path(mk('brows', 'neutral'), 'M-17 -76 q6 -3 12 0 M5 -76 q6 -3 12 0', '', fillInk('none'));
  path(mk('brows', 'annoyed'), 'M-18 -79 l12 5 M18 -79 l-12 5', '', { ...fillInk('none'), 'stroke-width': 3.2 });
  path(mk('brows', 'raised'), 'M-17 -81 q6 -5 12 0 M5 -81 q6 -5 12 0', '', fillInk('none'));
  path(mk('brows', 'tired'), 'M-17 -75 q6 2 12 -1 M5 -76 q6 3 12 1', '', fillInk('none'));
  path(mk('mouth', 'smile'), 'M-9 -46 q9 8 18 0', '', fillInk('none'));
  path(mk('mouth', 'grin'), 'M-11 -47 q11 12 22 0 Z', '', fillInk('#4a1f1a'));
  path(mk('mouth', 'neutral'), 'M-7 -44 h14', '', fillInk('none'));
  path(mk('mouth', 'frown'), 'M-9 -42 q9 -6 18 0', '', fillInk('none'));
  path(mk('mouth', 'talk'), 'M-7 -47 q7 9 14 0 Z', '', fillInk('#4a1f1a'));
  path(g, 'M1 -64 q5 8 -2 11', '', { ...fillInk('none'), 'stroke-width': 2 });
  if (lashes) {
    path(g, 'M-16 -68 l-4 -4 M-15 -70 l-2 -5 M16 -68 l4 -4 M15 -70 l2 -5', '', { ...fillInk('none'), 'stroke-width': 2 });
    for (const x of [-18, 18]) el('ellipse', { cx: x, cy: -54, rx: 6, ry: 3.5, fill: '#e8848a', opacity: 0.45 }, g);
  }
  if (glasses) {
    path(g, 'M-20 -66 a9 8 0 1 0 18 0 a9 8 0 1 0 -18 0 M2 -66 a9 8 0 1 0 18 0 a9 8 0 1 0 -18 0 M-2 -67 h4', '', { ...fillInk('none'), 'stroke-width': 2.2 });
  }
  return parts;
}

export function figure(parent, opts = {}) {
  const {
    x = 0, y = 0, s = 1, pose = 'sit', arms: armKind = 'table', hair = 'short',
    hairColor = PALETTE.hair.dark, skin = PALETTE.skin[0], outfit: kind = 'shirt',
    color = PALETTE.cloth.slate, glasses = false, flip = false, slim = false, lashes = false,
    eyes = 'open', mouth = 'neutral', brows = 'neutral',
  } = opts;
  const wrap = group(parent, { 'data-figure': '' });
  const root = group(wrap, { transform: `translate(${x} ${y}) scale(${flip ? -s : s} ${s})` });
  // long hair sits behind the body, not in front of it
  const back = group(root);
  hairBack(back, hair, hairColor);
  const body = group(root, slim ? { transform: 'scale(0.84 1)' } : {});
  if (pose === 'stand') {
    limb(body, 'M-20 118 L-24 246', PALETTE.cloth.navy, 24);
    limb(body, 'M20 118 L24 246', PALETTE.cloth.navy, 24);
    el('ellipse', { cx: -30, cy: 252, rx: 18, ry: 8, ...fillInk('#1a120c') }, body);
    el('ellipse', { cx: 30, cy: 252, rx: 18, ry: 8, ...fillInk('#1a120c') }, body);
  }
  let phone = null;
  if (pose !== 'lie') {
    outfit(body, kind, color, skin);
    phone = arms(body, armKind, color, skin).phone;
  }
  const head = group(root, { 'data-head': '' });
  // ears + face
  path(head, 'M-30 -68 q-10 2 -7 15 q3 6 9 4 M30 -68 q10 2 7 15 q-3 6 -9 4', '', fillInk(skin));
  path(head, 'M-31 -70 C-31 -106 31 -106 31 -70 C31 -44 18 -27 0 -25 C-18 -27 -31 -44 -31 -70 Z', '', fillInk(skin));
  const parts = face(head, { glasses, lashes });
  hairFront(head, hair, hairColor);

  const state = { eyes, mouth, brows };
  const show = (bucket, name) => {
    for (const [k, node] of Object.entries(parts[bucket])) node.setAttribute('opacity', k === name ? 1 : 0);
  };
  show('eyes', eyes); show('mouth', mouth); show('brows', brows);

  return {
    root: wrap, inner: root, head,
    phone: phone && { x: x + (flip ? -phone.x : phone.x) * s, y: y + phone.y * s },
    set(next) { for (const b of ['eyes', 'mouth', 'brows']) if (next[b]) { state[b] = next[b]; show(b, next[b]); } },
    expr(tl, next, at) { tl.call(() => this.set(next), null, at); },
    /** looping talk animation; returns the tween */
    talk(speed = 0.18) {
      return gsap.timeline({ repeat: -1 })
        .call(() => show('mouth', 'talk')).to({}, { duration: speed })
        .call(() => show('mouth', state.mouth === 'talk' ? 'neutral' : state.mouth)).to({}, { duration: speed * 1.4 });
    },
  };
}

/** Lying figure: head on a pillow (rotated), body under a blanket drawn by the scene. */
export function lyingHead(parent, { x, y, s = 1, hair = 'short', hairColor = PALETTE.hair.dark, skin = PALETTE.skin[0], glasses = false, lashes = false, eyes = 'closed' }) {
  const f = figure(parent, { x, y, s, pose: 'lie', hair, hairColor, skin, glasses, lashes, eyes, mouth: 'neutral' });
  f.inner.setAttribute('transform', `translate(${x} ${y}) rotate(-78) scale(${s})`);
  return f;
}
