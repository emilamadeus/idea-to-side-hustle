import gsap from 'gsap';

/*
  Drafting toolkit: SVG line drawings that draw themselves, pencil notes, stamps,
  and a stepper that makes build steps reversible.

  Coordinates: every slide SVG uses viewBox 0 0 1600 900 over the 16:9 frame,
  so 16 units = 1 --u.
*/

const NS = 'http://www.w3.org/2000/svg';

/*
  Outline colour for a filled object: dark ink, like a rendered illustration (a cream
  outline reads as clip-art). Very dark fills get a soft warm outline instead, so they
  don't disappear into the dark background. UI chrome (phones, bubbles, boards) keeps
  its own light outline and doesn't use this.
*/
export function inkFor(fill) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(fill ?? '').trim());
  if (!m) return '#1a120c';
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.03 ? '#6b5a48' : '#1a120c';
}

export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

/** Full-frame SVG layer inside a slide. */
export function stage(container, cls = '') {
  return el('svg', { viewBox: '0 0 1600 900', class: `draw full ${cls}`, preserveAspectRatio: 'xMidYMid meet' }, container);
}

export const rect = (x, y, w, h) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`;

/** Add a path. cls: ln (main ink) | thin | acc (orange) | acc2 (yellow) | water | dash | pencil */
export function p(parent, d, cls = 'ln', attrs = {}) {
  return el('path', { d, class: cls, ...attrs }, parent);
}

export function text(parent, x, y, str, cls = 'mono', attrs = {}) {
  const t = el('text', { x, y, class: cls, ...attrs }, parent);
  t.textContent = str;
  return t;
}

export function g(parent, attrs = {}) { return el('g', attrs, parent); }

/** Paths inside a node (or the node itself) that can be drawn on. */
const strokes = (nodes) => {
  const list = nodes instanceof Element ? [nodes] : [...nodes];
  return list.flatMap((n) => (n.tagName === 'path' ? [n] : [...n.querySelectorAll('path')]));
};

/** Hide strokes so drawOn can reveal them. */
export function hide(nodes) {
  for (const s of strokes(nodes)) {
    const len = s.getTotalLength() + 2;
    s.style.strokeDasharray = `${len} ${len}`;
    s.style.strokeDashoffset = len;
  }
}

/** Animate strokes as if drawn by hand. Returns a tween. */
export function drawOn(nodes, { duration = 1.2, stagger = 0.06, ease = 'power2.inOut', delay = 0 } = {}) {
  const ss = strokes(nodes);
  hide(ss);
  return gsap.to(ss, { strokeDashoffset: 0, duration, stagger, ease, delay });
}

/** Pencil handwriting (Caveat, pink). */
export function pencil(parent, x, y, str, { size = 46, rotate = -4, anchor = 'start' } = {}) {
  const t = text(parent, x, y, str, 'pencil-text', {
    'font-size': size, 'text-anchor': anchor, transform: `rotate(${rotate} ${x} ${y})`,
  });
  return t;
}

/** Hand-drawn line through points with slight wobble. */
export function rough(points, { jitter = 2.5, seed = 1 } = {}) {
  let r = seed;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 - 0.5; };
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x + rnd() * jitter} ${y + rnd() * jitter}`).join(' ');
}

/** Hand-drawn arrow from a to b with a small curve. */
export function arrow(parent, [x1, y1], [x2, y2], cls = 'pencil') {
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.15, my = (y1 + y2) / 2 - (x2 - x1) * 0.15;
  const grp = g(parent);
  p(grp, `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, cls);
  const a = Math.atan2(y2 - my, x2 - mx);
  const h = 18;
  p(grp, `M${x2 - h * Math.cos(a - 0.45)} ${y2 - h * Math.sin(a - 0.45)} L${x2} ${y2} L${x2 - h * Math.cos(a + 0.45)} ${y2 - h * Math.sin(a + 0.45)}`, cls);
  return grp;
}

/** Hand-drawn ellipse that overshoots its start, like a pencil circle. */
export function roughEllipse(cx, cy, rx, ry, { turns = 1.12 } = {}) {
  const pts = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2 * turns - 0.4;
    const k = 1 + Math.sin(i * 0.7) * 0.03;
    pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
  }
  return rough(pts, { jitter: 1.5 });
}

/** Rubber stamp: bordered word, slams in. */
export function stamp(parent, x, y, str, { rotate = -9, size = 54 } = {}) {
  const grp = g(parent, { class: 'stamp', transform: `translate(${x} ${y}) rotate(${rotate})` });
  const t = text(grp, 0, 0, str, 'stamp-text', { 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
  const w = str.length * size * 0.66 + 40, h = size * 1.5;
  el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, class: 'stamp-box', rx: 6 }, grp);
  grp.appendChild(t); // text above box
  return grp;
}

export function slam(node, { delay = 0 } = {}) {
  return gsap.fromTo(node, { opacity: 0, scale: 2.4, transformOrigin: '50% 50%', transformBox: 'fill-box' },
    { opacity: 1, scale: 1, duration: 0.45, delay, ease: 'back.out(2.2)' });
}

export function fadeIn(node, { duration = 0.6, delay = 0, y = 0 } = {}) {
  return gsap.fromTo(node, { opacity: 0, y }, { opacity: 1, y: 0, duration, delay, ease: 'power2.out' });
}

/*
  Focus: one thing per build step at full strength, the rest of the drawing steps back.
  focus(ctx, tl, nodes, at) dims every element of the slide's drawing that is not one of
  `nodes` (or an ancestor/descendant of one) with a CSS filter, so it never fights the
  opacity animations. A step that sets no focus clears it (the stepper does that).
*/
const DIM = 'fx-dim';
function drawingOf(ctx) { return ctx.el.querySelector('svg.draw'); }
export function clearFocus(ctx) {
  drawingOf(ctx)?.querySelectorAll(`.${DIM}`).forEach((n) => n.classList.remove(DIM));
}
export function focus(ctx, tl, nodes, at = 0) {
  ctx._focused = true;
  tl.call(() => {
    const root = drawingOf(ctx);
    if (!root) return;
    const keep = new Set([nodes].flat(Infinity).filter(Boolean).flatMap((n) => (n instanceof Element ? [n] : [...n])));
    const path = new Set();
    keep.forEach((n) => { for (let p = n.parentNode; p && p !== root; p = p.parentNode) path.add(p); });
    root.querySelectorAll(`.${DIM}`).forEach((n) => n.classList.remove(DIM));
    const walk = (parent) => {
      for (const c of parent.children) {
        if (keep.has(c) || c.tagName === 'defs' || c.tagName === 'clipPath') continue;
        if (path.has(c)) walk(c); else c.classList.add(DIM);
      }
    };
    walk(root);
  }, null, at);
}

/** Inverse of focus: dim exactly `nodes` (array or function returning one), keep the rest. */
export function dimOnly(ctx, tl, nodes, at = 0) {
  ctx._focused = true;
  tl.call(() => {
    const root = drawingOf(ctx);
    if (!root) return;
    root.querySelectorAll(`.${DIM}`).forEach((n) => n.classList.remove(DIM));
    [typeof nodes === 'function' ? nodes() : nodes].flat(Infinity).filter(Boolean).forEach((n) => n.classList?.add(DIM));
  }, null, at);
}

/**
 * Reversible build steps.
 *   reset()              clear the slide to its empty state
 *   play(i, instant)     build step i; return a timeline. When instant is true the
 *                        timeline is jumped to its end, so skip slow side effects.
 * Forward one step animates; anything else rebuilds instantly.
 */
export function stepper(ctx, { reset, play }) {
  let current = -1;
  let tl = null;
  const run = (i, instant) => {
    ctx._focused = false;
    const t = play(i, instant) || gsap.timeline();
    // a step without its own focus shows everything at full strength
    if (!ctx._focused) t.call(() => clearFocus(ctx), null, 0);
    ctx.track(t);
    if (instant) t.progress(1);
    return t;
  };
  const go = (n, animate) => {
    tl?.progress(1);
    if (ctx.deck?.instant) animate = false; // audit mode: always jump to end states
    if (current === -1 && animate && n === 0) reset();
    if (animate && n === current + 1) { tl = run(n, false); current = n; ctx.deck?.trackStep?.(tl); return; }
    reset();
    for (let i = 0; i <= n; i++) run(i, true);
    tl = null;
    current = n;
  };
  return {
    enter({ step }) {
      if (step === 0) go(0, true);
      else { go(step, false); if (!ctx.deck?.instant) gsap.fromTo(ctx.el, { opacity: 0 }, { opacity: 1, duration: 0.6 }); }
    },
    step(n, dir) { go(n, dir > 0); },
  };
}
