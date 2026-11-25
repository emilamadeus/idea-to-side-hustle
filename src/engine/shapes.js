/*
  Shape generators for the particle field.
  Every generator returns { positions: Float32Array(N*3), alphas: Float32Array(N) }
  for the stage's full particle count. Particles a shape doesn't need become
  background dust, so nothing ever pops in or out of existence.

  Compose shapes with `combine(stage, [shapeA, 0.6], [shapeB, 0.4])`.
*/

const rand = (a, b) => a + Math.random() * (b - a);

function out(stage) {
  const n = stage.particles.count;
  return { n, positions: new Float32Array(n * 3), alphas: new Float32Array(n) };
}

/** Fill indices [from, n) with distant dust. */
function dust(o, from, { rMin = 18, rMax = 45, alpha = [0.04, 0.18] } = {}) {
  for (let i = from; i < o.n; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = rand(rMin, rMax);
    const s = Math.sqrt(1 - u * u);
    o.positions[i * 3] = r * s * Math.cos(th);
    o.positions[i * 3 + 1] = r * u * 0.6;
    o.positions[i * 3 + 2] = r * s * Math.sin(th) - 12;
    o.alphas[i] = rand(alpha[0], alpha[1]);
  }
  return o;
}

/** Writes a list of points (array of [x,y,z]) into the first slots, shuffled, then dust. */
function fromPoints(stage, pts, { alpha = 1, share = 0.8, jitter = 0 } = {}) {
  const o = out(stage);
  const budget = Math.floor(o.n * share);
  // Shuffle so subsets stay evenly distributed.
  for (let i = pts.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  const used = Math.min(budget, pts.length ? budget : 0);
  for (let i = 0; i < used; i++) {
    const p = pts[i % pts.length];
    o.positions[i * 3] = p[0] + rand(-jitter, jitter);
    o.positions[i * 3 + 1] = p[1] + rand(-jitter, jitter);
    o.positions[i * 3 + 2] = p[2] + rand(-jitter, jitter);
    o.alphas[i] = typeof alpha === 'function' ? alpha(p, i) : alpha;
  }
  return dust(o, used);
}

/* ---------------------------------------------------------------- */

/** Nebula: the resting state between ideas. */
export function nebula(stage) {
  const o = out(stage);
  for (let i = 0; i < o.n; i++) {
    const arm = i % 3;
    const t = Math.pow(Math.random(), 0.7);
    const r = 1.5 + t * 22;
    const a = arm * (Math.PI * 2 / 3) + r * 0.22 + rand(-0.4, 0.4);
    o.positions[i * 3] = Math.cos(a) * r + rand(-1, 1);
    o.positions[i * 3 + 1] = rand(-1, 1) * (2.2 - t * 1.4);
    o.positions[i * 3 + 2] = Math.sin(a) * r - 14 + rand(-1, 1);
    o.alphas[i] = rand(0.15, 0.6) * (1 - t * 0.6);
  }
  return o;
}

/**
 * Text rendered in particles.
 *   width: fraction of the 16:9 frame width the text block spans
 *   x, y : centre offset in fractions of the frame (-0.5..0.5)
 */
export function text(stage, str, {
  width = 0.75, x = 0, y = 0, z = 0, weight, lineHeight = 0.95,
  share = 0.82, align = 'center', dist = 14,
} = {}) {
  const lines = String(str).split('\n');
  const fontPx = 220;
  const d = stage.theme.display;
  const font = `${weight ?? d.weight} ${fontPx}px "${d.family}", system-ui, sans-serif`;
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = font;
  const widths = lines.map((l) => g.measureText(l).width);
  const cw = Math.ceil(Math.max(...widths) + fontPx * 0.2);
  const lh = fontPx * lineHeight;
  const ch = Math.ceil(lh * lines.length + fontPx * 0.3);
  c.width = cw; c.height = ch;
  g.font = font;
  g.fillStyle = '#fff';
  g.textBaseline = 'middle';
  g.textAlign = align;
  const ax = align === 'center' ? cw / 2 : align === 'right' ? cw - fontPx * 0.1 : fontPx * 0.1;
  lines.forEach((l, i) => g.fillText(l, ax, fontPx * 0.15 + lh * (i + 0.5)));

  const data = g.getImageData(0, 0, cw, ch).data;
  const pts = [];
  const view = stage.viewSize(dist);
  const scale = (view.w * width) / cw;
  const ox = x * view.w, oy = y * view.h;
  for (let py = 0; py < ch; py += 2) {
    for (let px = 0; px < cw; px += 2) {
      if (data[(py * cw + px) * 4 + 3] > 140) {
        pts.push([
          (px + Math.random() * 2 - cw / 2) * scale + ox,
          -(py + Math.random() * 2 - ch / 2) * scale + oy,
          z + rand(-0.04, 0.04),
        ]);
      }
    }
  }
  return fromPoints(stage, pts, { share, alpha: 0.9 });
}

/** Fibonacci sphere. */
export function sphere(stage, { r = 3.2, share = 0.7, center = [0, 0, 0] } = {}) {
  const pts = [];
  const m = Math.floor(stage.particles.count * share);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < m; i++) {
    const y = 1 - (i / (m - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = ga * i;
    pts.push([center[0] + Math.cos(th) * rr * r, center[1] + y * r, center[2] + Math.sin(th) * rr * r]);
  }
  return fromPoints(stage, pts, { share, alpha: 0.75 });
}

/** Flat grid floor, optionally with a height function h(x, z). */
export function grid(stage, { w = 18, d = 12, y = -2, step = 0.22, share = 0.75, h = null } = {}) {
  const pts = [];
  for (let x = -w / 2; x <= w / 2; x += step) {
    for (let z = -d / 2; z <= d / 2; z += step) {
      pts.push([x, y + (h ? h(x, z) : 0), z]);
    }
  }
  return fromPoints(stage, pts, { share, alpha: (p) => 0.35 + 0.6 * (1 - Math.abs(p[2]) / (d / 2)) });
}

/** Points sampled along line segments [[a,b], ...], density proportional to length. */
export function edges(stage, segments, { share = 0.7, jitter = 0.015, alpha = 0.9 } = {}) {
  const m = Math.floor(stage.particles.count * share);
  const lens = segments.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  const total = lens.reduce((s, l) => s + l, 0);
  const pts = [];
  segments.forEach(([a, b], si) => {
    const k = Math.max(2, Math.round((lens[si] / total) * m));
    for (let i = 0; i < k; i++) {
      const t = Math.random();
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  });
  return fromPoints(stage, pts, { share, jitter, alpha });
}

/** Wireframe house: a nod to the smart-home domain. */
export function house(stage, { s = 1, share = 0.72 } = {}) {
  const W = 2.4 * s, D = 1.8 * s, H = 2.6 * s, R = 1.6 * s, y0 = -1.6 * s;
  const P = (x, y, z) => [x, y + y0, z];
  const c = [
    P(-W, 0, -D), P(W, 0, -D), P(W, 0, D), P(-W, 0, D),
    P(-W, H, -D), P(W, H, -D), P(W, H, D), P(-W, H, D),
  ];
  const ridgeA = P(-W, H + R, 0), ridgeB = P(W, H + R, 0);
  const seg = [
    [c[0], c[1]], [c[1], c[2]], [c[2], c[3]], [c[3], c[0]],
    [c[4], c[5]], [c[5], c[6]], [c[6], c[7]], [c[7], c[4]],
    [c[0], c[4]], [c[1], c[5]], [c[2], c[6]], [c[3], c[7]],
    [c[4], ridgeA], [c[7], ridgeA], [c[5], ridgeB], [c[6], ridgeB], [ridgeA, ridgeB],
    // door
    [P(-0.4 * s, 0, D), P(-0.4 * s, 1.5 * s, D)], [P(0.4 * s, 0, D), P(0.4 * s, 1.5 * s, D)],
    [P(-0.4 * s, 1.5 * s, D), P(0.4 * s, 1.5 * s, D)],
    // windows
    ...rect(P(-1.9 * s, 1.1 * s, D), 0.9 * s, 0.8 * s),
    ...rect(P(1.0 * s, 1.1 * s, D), 0.9 * s, 0.8 * s),
  ];
  return edges(stage, seg, { share });
}

function rect([x, y, z], w, h) {
  return [
    [[x, y, z], [x + w, y, z]], [[x + w, y, z], [x + w, y + h, z]],
    [[x + w, y + h, z], [x, y + h, z]], [[x, y + h, z], [x, y, z]],
  ];
}

/** Ring / torus. */
export function ring(stage, { r = 4, tube = 0.25, share = 0.7, tilt = 1.1 } = {}) {
  const m = Math.floor(stage.particles.count * share);
  const pts = [];
  for (let i = 0; i < m; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.random() * Math.PI * 2;
    const rr = r + Math.cos(b) * tube;
    const x = Math.cos(a) * rr, y = Math.sin(b) * tube, z = Math.sin(a) * rr;
    pts.push([x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)]);
  }
  return fromPoints(stage, pts, { share, alpha: 0.7 });
}

/** Everything as background dust. */
export function scatter(stage) {
  return dust(out(stage), 0, { rMin: 6, rMax: 40, alpha: [0.1, 0.45] });
}

/**
 * Blend several shapes into one target: combine(stage, [a, 0.5], [b, 0.3]).
 * Fractions are of the total particle count; the remainder becomes dust.
 * Each shape keeps its own particles' leading (non-dust) slots.
 */
export function combine(stage, ...parts) {
  const o = out(stage);
  let at = 0;
  for (const [shape, frac] of parts) {
    const k = Math.floor(o.n * frac);
    o.positions.set(shape.positions.subarray(0, k * 3), at * 3);
    o.alphas.set(shape.alphas.subarray(0, k), at);
    at += k;
  }
  return dust(o, at);
}
