import gsap from 'gsap';
import * as D from './draw.js';

/*
  A small, rigged developer for scenes where he works on a chart (the side quest). About 66 units
  tall, feet at (0, 0), facing right, with a standing desk and laptop to his right.

    const dev = miniDev(parent, { idPrefix })
    dev.g                         move him with gsap x / y / opacity
    dev.pose(tl, name, at, dur)   idle · type · think · chopUp · chopDown · push · drag · scratch ·
                                  facepalm · fist · wipe · slumpDesk · lookL · lookR
    dev.face(tl, name, at)        smile · flat · frown · tired · o
    dev.slump(tl, deg, at, dur)   how low he carries himself (added to every pose)
    dev.walk(tl, from, to, at, { speed, push })   strides, hip bob, swinging arms; push = short
                                  strides with effort
    dev.typing(speed) → loop      arms tap, head nods, code scrolls; kill() to stop
    dev.breathe() → loop          always-on idle breathing
    dev.sigh(tl, at)              shoulders up, then a long drop
    dev.think(tl, str, at, hold)  a thought cloud by his head (inside his group, so it follows him)
    dev.desk(tl, on, at)          show or hide the desk and laptop
    dev.screen                    the laptop's 16:9 bezel (for the endless zoom)

  Parts are rotated through stored angles (rotate about a joint), so they animate inside a
  moving group. Every line is at least 2 units (AirPlay).
*/

const INK = '#1a120c';
const S = (fill, w = 2) => ({ style: `fill: ${fill}; stroke: ${INK}; stroke-width: ${w}; stroke-linejoin: round; stroke-linecap: round` });

export function miniDev(parent, { idPrefix = 'md' } = {}) {
  const svg = parent.ownerSVGElement || parent;
  const id = (n) => `${idPrefix}-${n}`;
  // gradients: a soft light from the upper left, and the laptop's glow
  if (!svg.querySelector(`#${id('hood')}`)) {
    const d = svg.querySelector('defs') || D.el('defs', {}, svg);
    const lin = (n, a, b, [x1, y1, x2, y2] = [0, 0, 1, 1]) => {
      const g = D.el('linearGradient', { id: id(n), x1, y1, x2, y2 }, d);
      D.el('stop', { offset: 0, 'stop-color': a }, g); D.el('stop', { offset: 1, 'stop-color': b }, g);
    };
    lin('hood', '#5d7290', '#2c3a4d');
    lin('jeans', '#3d4c6e', '#232c44', [0, 0, 1, 0]);
    lin('skin', '#f0c9a2', '#d39a72');
    lin('hair', '#8a5634', '#5a3420', [0, 0, 0, 1]);
    lin('wood', '#8a6040', '#5e3e26', [0, 0, 0, 1]);
    lin('alu', '#d9dbe0', '#9a9ca4', [0, 0, 0, 1]);
    const r = D.el('radialGradient', { id: id('glow'), cx: 0.5, cy: 0.5, r: 0.5 }, d);
    D.el('stop', { offset: 0, 'stop-color': '#9fffc0', 'stop-opacity': 0.45 }, r);
    D.el('stop', { offset: 1, 'stop-color': '#9fffc0', 'stop-opacity': 0 }, r);
  }
  const u = (n) => `url(#${id(n)})`;

  const g = D.g(parent, { 'data-unit': '', 'data-overlap-ok': '' });
  D.el('ellipse', { cx: 6, cy: 0.5, rx: 26, ry: 3.2, style: 'fill: #000', opacity: 0.35 }, g);

  // ---- desk and laptop ----
  const deskG = D.g(g);
  D.el('rect', { x: 17, y: -31, width: 3, height: 31, style: 'fill: #6f6358' }, deskG);
  D.el('rect', { x: 47, y: -31, width: 3, height: 31, style: 'fill: #6f6358' }, deskG);
  D.el('rect', { x: 13, y: -34, width: 41, height: 4.5, rx: 1.5, ...S(u('wood')) }, deskG);
  D.el('rect', { x: 20, y: -37, width: 28, height: 3, rx: 1, ...S(u('alu')) }, deskG);
  const glow = D.el('ellipse', { cx: 22, cy: -48, rx: 22, ry: 14, style: `fill: ${u('glow')}` }, deskG);
  const screen = D.g(deskG);
  D.el('rect', { x: 18, y: -56, width: 32, height: 18, rx: 1.5, ...S('#16161b') }, screen);
  const code = D.g(screen);
  const lines = [[22, 16, '#8fe3a2'], [25, 10, '#ffd23f'], [22, 19, '#7fd0ff'], [25, 12, '#8fe3a2'], [22, 8, '#ff6f9c'], [25, 15, '#fff3e3']];
  lines.forEach(([x, w, c], k) => D.el('rect', { x, y: -53 + k * 2.7, width: w, height: 1.6, rx: 0.8, style: `fill: ${c}`, opacity: 0.9 }, code));
  const cupsG = D.g(deskG);

  // ---- the rig ----
  const body = D.g(g);
  const part = (node, cx, cy) => ({ node, cx, cy, r: 0, tx: 0, ty: 0, base: 0,
    apply() { node.setAttribute('transform', `translate(${this.tx} ${this.ty}) rotate(${this.r + this.base} ${this.cx} ${this.cy})`); } });
  const leg = (dx, shade, sole) => {
    const n = D.g(body);
    D.p(n, `M${dx - 5.4} -24.5 L${dx - 4.8} -5 L${dx + 3.4} -5 L${dx + 4.2} -24.5 Z`, '', S(shade));
    D.p(n, `M${dx - 5.6} -5.6 H${dx + 4.4} Q${dx + 9.6} -5.6 ${dx + 9.6} -1.6 V0 H${dx - 5.6} Z`, '', S(sole));
    D.p(n, `M${dx - 5.4} -1.2 H${dx + 9}`, '', { style: `fill: none; stroke: #c9ad92; stroke-width: 2` });
    return part(n, dx, -24);
  };
  const legB = leg(-2.5, '#252f48', '#cfc6b8'), legF = leg(2, u('jeans'), '#f1ebe0');
  const torsoN = D.g(body);
  const torso = part(torsoN, 0, -24);
  const arm = (shade) => {
    const n = D.g(torsoN);
    D.el('rect', { x: -2.8, y: -42, width: 5.6, height: 12, rx: 2.8, ...S(shade) }, n);
    const fn = D.g(n);
    D.el('rect', { x: -2.5, y: -31.5, width: 5, height: 10.5, rx: 2.5, ...S(shade) }, fn);
    D.el('circle', { cx: 0, cy: -20.6, r: 2.7, ...S(u('skin')) }, fn);
    return { upper: part(n, 0, -40), fore: part(fn, 0, -31) };
  };
  const armB = arm('#34445a');
  // hoodie: tapered, with a pocket, drawstrings and the hood behind the neck
  D.p(torsoN, 'M-8 -45.5 Q-12 -46 -11 -41 L-9 -42 Z', '', S('#2c3a4d'));
  D.p(torsoN, 'M-9.5 -23.5 C-11.5 -31 -10.5 -41 -6.5 -45.5 L6.5 -45.5 C10.5 -41 11.5 -31 9.5 -23.5 Z', '', S(u('hood')));
  D.p(torsoN, 'M-6 -30.5 Q0 -28.5 6 -30.5 L5 -26 H-5 Z', '', { style: 'fill: #2c3a4d', opacity: 0.8 });
  D.p(torsoN, 'M-1.8 -45 V-38.5 M1.8 -45 V-39.5', '', { style: 'fill: none; stroke: #e9e2d6; stroke-width: 2; stroke-linecap: round' });
  // headphones resting on his neck
  D.p(torsoN, 'M-7 -45.5 Q0 -40 7 -45.5', '', { style: `fill: none; stroke: ${INK}; stroke-width: 2.4; stroke-linecap: round` });
  const headN = D.g(torsoN);
  const head = part(headN, 0, -46);
  D.el('rect', { x: -2.4, y: -49.5, width: 4.8, height: 5, style: 'fill: #d39a72' }, headN);
  D.el('ellipse', { cx: 1, cy: -56, rx: 8.6, ry: 9.4, ...S(u('skin')) }, headN);
  D.el('circle', { cx: -5.4, cy: -55.5, r: 2.3, ...S('#d39a72') }, headN);
  // hair: tousled, with a lighter strand on top
  D.p(headN, 'M-8 -56 C-10 -63 -6 -68 1 -68 C6 -69 11 -66 10.5 -60 C9 -62 6 -63.5 3 -62 C1 -64.5 -2 -63.5 -3.5 -61.5 C-5 -60.5 -6 -58.5 -6.5 -55.5 Z', '', S(u('hair')));
  D.p(headN, 'M-3 -66.2 Q1 -68 5 -66.4', '', { style: 'fill: none; stroke: #b07a4e; stroke-width: 2; stroke-linecap: round' });
  // glasses (3/4 view), eye, brow, mouth
  D.el('rect', { x: 3, y: -58.6, width: 5.6, height: 4.4, rx: 1.6, style: `fill: #cfe8ff; fill-opacity: .2; stroke: ${INK}; stroke-width: 2` }, headN);
  D.p(headN, 'M3 -57 H-3.6', '', { style: `fill: none; stroke: ${INK}; stroke-width: 2` });
  const eye = D.el('circle', { cx: 5.6, cy: -56.2, r: 1.2, style: `fill: ${INK}` }, headN);
  const lid = D.p(headN, 'M3.6 -57 H7.6', '', { style: `fill: none; stroke: ${INK}; stroke-width: 2; stroke-linecap: round`, opacity: 0 });
  const brow = D.p(headN, 'M2.6 -61 Q5.6 -62.6 8.6 -61', '', { style: `fill: none; stroke: #5a3420; stroke-width: 2; stroke-linecap: round` });
  const mouth = D.p(headN, 'M3.4 -50.6 Q5.8 -48.8 8.2 -50.6', '', { style: `fill: none; stroke: ${INK}; stroke-width: 2; stroke-linecap: round` });
  const armF = arm(u('hood'));
  [legB, legF, torso, head, armB.upper, armB.fore, armF.upper, armF.fore].forEach((p) => p.apply());

  // ---- motion helpers ----
  const tw = (tl, p, vars, dur, at, ease = 'power2.inOut') => tl.to(p, { ...vars, duration: dur, ease, onUpdate: () => p.apply() }, at);
  let lean = 0; // the slump carried into every pose
  const POSES = {
    idle: { t: 0, h: 0, fu: 8, ff: -6, bu: -6, bf: -4 },
    type: { t: 4, h: 10, fu: -38, ff: -64, bu: -32, bf: -60 },
    think: { t: -4, h: -12, fu: -150, ff: -128, bu: -6, bf: -4 },
    scratch: { t: 0, h: -8, fu: -160, ff: -150, bu: -6, bf: -4 },
    chopUp: { t: -10, h: -6, fu: -175, ff: -20, bu: 20, bf: -10 },
    chopDown: { t: 14, h: 8, fu: -78, ff: 4, bu: -20, bf: -10 },
    push: { t: 26, h: -10, fu: -86, ff: -6, bu: -80, bf: -8 },
    drag: { t: -16, h: 6, fu: -60, ff: -24, bu: -54, bf: -22 },
    facepalm: { t: 8, h: 20, fu: -128, ff: -130, bu: -6, bf: -4 },
    fist: { t: -6, h: -14, fu: -172, ff: -6, bu: -10, bf: -40 },
    wipe: { t: 2, h: -4, fu: -150, ff: -150, bu: -6, bf: -4 },
    slumpDesk: { t: 30, h: 26, fu: -62, ff: -40, bu: -58, bf: -36 },
    lookL: { t: 0, h: -18, fu: 8, ff: -6, bu: -6, bf: -4 },
    lookR: { t: 0, h: 16, fu: 8, ff: -6, bu: -6, bf: -4 },
  };
  function pose(tl, name, at, dur = 0.4, ease = 'power2.inOut') {
    const p = POSES[name];
    tw(tl, torso, { r: p.t + lean }, dur, at, ease);
    tw(tl, head, { r: p.h + lean * 0.6 }, dur, at, ease);
    tw(tl, armF.upper, { r: p.fu }, dur, at, ease); tw(tl, armF.fore, { r: p.ff }, dur, at, ease);
    tw(tl, armB.upper, { r: p.bu }, dur, at, ease); tw(tl, armB.fore, { r: p.bf }, dur, at, ease);
  }
  function slump(tl, deg, at, dur = 0.9) {
    tl.call(() => { lean = deg; }, null, at);
    lean = deg;
    tw(tl, torso, { r: deg + 2 }, dur, at, 'sine.inOut');
    tw(tl, head, { r: deg * 0.6 + 6 }, dur, at, 'sine.inOut');
  }
  const FACES = {
    smile: { m: 'M3.4 -50.6 Q5.8 -48.6 8.2 -50.6', b: 'M2.6 -61 Q5.6 -62.6 8.6 -61', lid: 0 },
    flat: { m: 'M3.6 -50 H8', b: 'M2.6 -60.6 H8.6', lid: 0 },
    frown: { m: 'M3.4 -49.2 Q5.8 -51 8.2 -49.2', b: 'M2.6 -60 L8.6 -61.4', lid: 0 },
    tired: { m: 'M3.6 -49.6 Q5.8 -50.4 8 -49.6', b: 'M2.6 -60.4 Q5.6 -59.6 8.6 -60.6', lid: 1 },
    o: { m: 'M5.6 -50.4 m-1.4 0 a1.4 1.6 0 1 0 2.8 0 a1.4 1.6 0 1 0 -2.8 0', b: 'M2.6 -62 Q5.6 -63.6 8.6 -62', lid: 0 },
  };
  function face(tl, name, at) {
    const f = FACES[name];
    tl.call(() => { mouth.setAttribute('d', f.m); brow.setAttribute('d', f.b); lid.setAttribute('opacity', f.lid); eye.setAttribute('opacity', f.lid ? 0 : 1); }, null, at);
  }
  // walk: strides with a hip bob and swinging arms; push = short, heavy strides
  function walk(tl, from, to, at, { speed = 90, push = false } = {}) {
    const dur = Math.max(0.5, Math.abs(to - from) / speed);
    tl.fromTo(g, { x: from }, { x: to, duration: dur, ease: push ? 'none' : 'sine.inOut', immediateRender: false }, at);
    const stride = push ? 0.5 : 0.34, swing = push ? 12 : 20;
    const n = Math.max(1, Math.round(dur / stride));
    const st = dur / n;
    for (let k = 0; k < n; k++) {
      const t0 = at + k * st, s = k % 2 ? 1 : -1;
      tw(tl, legF, { r: swing * s }, st * 0.5, t0, 'sine.inOut');
      tw(tl, legB, { r: -swing * s }, st * 0.5, t0, 'sine.inOut');
      tw(tl, legF, { r: swing * s * 0.4 }, st * 0.5, t0 + st * 0.5, 'sine.inOut');
      tw(tl, legB, { r: -swing * s * 0.4 }, st * 0.5, t0 + st * 0.5, 'sine.inOut');
      tl.to(body, { y: push ? -0.6 : -1.6, duration: st * 0.5, ease: 'sine.out' }, t0);
      tl.to(body, { y: 0, duration: st * 0.5, ease: 'sine.in' }, t0 + st * 0.5);
      if (!push) { tw(tl, armF.upper, { r: -16 * s }, st, t0, 'sine.inOut'); tw(tl, armB.upper, { r: 16 * s }, st, t0, 'sine.inOut'); }
      else tw(tl, torso, { r: 26 + lean + (k % 2 ? 1.5 : -1.5) }, st, t0, 'sine.inOut'); // straining
    }
    tw(tl, legF, { r: 0 }, 0.2, at + dur); tw(tl, legB, { r: 0 }, 0.2, at + dur);
    return at + dur;
  }
  // typing: alternate taps, a small nod, the code scrolls; tempo drops as he tires
  function typing(speed = 1) {
    const t = gsap.timeline({ repeat: -1 });
    const tap = 0.11 / speed;
    [[armF.fore, -64], [armB.fore, -60]].forEach(([p, r0], k) => {
      t.to(p, { r: r0 - 12, duration: tap, ease: 'power2.out', onUpdate: () => p.apply() }, k * tap)
        .to(p, { r: r0, duration: tap, ease: 'power2.in', onUpdate: () => p.apply() }, k * tap + tap);
    });
    t.to(head, { r: 10 + lean * 0.6 + 2, duration: tap * 2, yoyo: true, repeat: 1, ease: 'sine.inOut', onUpdate: () => head.apply() }, 0);
    t.to(code, { y: -2.7, duration: tap * 4, ease: 'none' }, 0).set(code, { y: 0 }, tap * 4);
    t.to(glow, { opacity: 0.7, duration: tap * 2, yoyo: true, repeat: 1 }, 0);
    return t;
  }
  function breathe() {
    return gsap.timeline({ repeat: -1, yoyo: true }).to(torsoN, { y: -0.7, duration: 1.7, ease: 'sine.inOut' });
  }
  // a sigh: shoulders up and head back, then a long drop
  function sigh(tl, at) {
    tl.to(torsoN, { y: -2, duration: 0.5, ease: 'sine.out' }, at);
    tw(tl, head, { r: -16 }, 0.5, at, 'sine.out');
    tl.to(torsoN, { y: 0.6, duration: 0.9, ease: 'power2.in' }, at + 0.6);
    tw(tl, head, { r: lean * 0.6 + 14 }, 0.9, at + 0.6, 'power2.in');
    return at + 1.5;
  }
  // thought cloud: three rising dots, a bumpy cloud with a soft shadow, a gentle float
  function think(tl, str, at, hold = 0) {
    const t = D.g(g, { 'data-overlap-ok': '' });
    const w = Math.max(70, str.length * 9 + 30), x0 = 22, y0 = -79, h = 28; // clear of a chart's header above
    const dots = [[10, -60, 2], [15, -66, 2.8], [21, -72, 3.6]].map(([cx, cy, r]) => D.el('circle', { cx, cy, r, style: 'fill: #fff3e3' }, t));
    const cloud = D.g(t);
    const blob = (dx, dy, fill, op = 1) => {
      const b = D.g(cloud, { opacity: op });
      D.el('rect', { x: x0 + dx, y: y0 + dy, width: w, height: h, rx: h / 2, style: `fill: ${fill}` }, b);
      [0.22, 0.5, 0.76].forEach((f, k) => D.el('circle', { cx: x0 + dx + w * f, cy: y0 + dy + 2, r: [7, 9, 7][k], style: `fill: ${fill}` }, b));
    };
    blob(2, 3, '#000', 0.3);
    blob(0, 0, '#fff3e3');
    D.text(cloud, x0 + w / 2, y0 + 19, str, 'th', { 'text-anchor': 'middle', style: `font: 700 16px var(--font-display); fill: ${INK}` });
    gsap.set(t, { opacity: 1 });
    tl.fromTo(dots, { opacity: 0, scale: 0.2, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.18, stagger: 0.09, ease: 'back.out(3)' }, at);
    tl.fromTo(cloud, { opacity: 0, scale: 0.4, transformOrigin: '10% 90%' }, { opacity: 1, scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.6)' }, at + 0.25);
    tl.to(cloud, { y: -1.6, duration: 1.2, yoyo: true, repeat: 3, ease: 'sine.inOut' }, at + 0.8);
    if (hold) tl.to(t, { opacity: 0, duration: 0.35 }, at + hold);
    return t;
  }
  const pop = (tl, t, at) => t && tl.to(t, { opacity: 0, scale: 1.12, transformOrigin: '20% 80%', duration: 0.28, ease: 'power2.in' }, at);
  const desk = (tl, on, at) => tl.to(deskG, { opacity: on ? 1 : 0, duration: 0.35 }, at);
  function cup(k) {
    const c = D.g(cupsG);
    D.el('rect', { x: 50 - k * 6, y: -41.5, width: 5, height: 7.5, rx: 1.2, ...S('#fff3e3') }, c);
    return c;
  }
  return { g, deskG, screen: screen.firstChild, pose, face, slump, walk, typing, breathe, sigh, think, pop, desk, cup, torso, head, legF, legB, tw };
}
