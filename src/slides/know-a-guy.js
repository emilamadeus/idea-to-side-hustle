import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, LOOK } from '../engine/characters.js';
import { speech, FILL } from '../engine/props.js';

/*
  Tip: side projects widen what you know exists. You become the one people ask.
  A map under fog.
    0. Only "Backend" (work) is uncovered. You stand on it.
    1. Each project clears a region: 3D / WebGL, spillmotor, Blender og destruksjon,
       bildegenerering, webapper, smarthjem.
    2. Colleagues' questions land as pins; lines run from each pin to you.
       The last one lands in the fog: the printer.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    you        x 120–480, y 300–760 (figure + bubble)
    map        x 560–1480, y 150–770; region labels inside their own region
*/

const REGIONS = [
  { key: 'backend', label: 'Backend', sub: 'jobb', x: 760, y: 470, r: 110, color: '#3c4a5c', open: true },
  { key: '3d', label: '3D / WebGL', sub: 'home.atladeus.com', x: 1000, y: 290, r: 105, color: '#7a4a2c' },
  { key: 'game', label: 'Spillmotor', sub: 'Unreal', x: 1270, y: 300, r: 100, color: '#55603a' },
  { key: 'blender', label: 'Destruksjon', sub: 'Blender · Fab', x: 1290, y: 560, r: 105, color: '#7e2f45' },
  { key: 'img', label: 'Bildegenerering', sub: 'ChatGPT', x: 1030, y: 640, r: 100, color: '#2f5b5a' },
  { key: 'web', label: 'Webapper', sub: 'wish.atladeus.com', x: 700, y: 680, r: 85, color: '#2c3550' },
  { key: 'home', label: 'Smarthjem', sub: 'app.atladeus.com', x: 1050, y: 470, r: 70, color: '#9a4a22' },
];
const ASKS = [
  { to: 'img', q: 'Illustrasjoner til kampanjen?' },
  { to: '3d', q: '3D-modell av huset i appen?' },
  { to: 'game', q: 'Noen som kan Unreal?' },
];
const YOU = { x: 300, neck: 520 };

export default {
  id: 'know-a-guy',
  title: 'Jeg kjenner en',
  steps: 3,
  notes: [
    'Før: jeg kjente backend. Resten var tåke.',
    'Hvert prosjekt rydder et område: 3D, spillmotor, Blender, bildegenerering, webapper, smarthjem.',
    'Nå kommer spørsmålene til meg. Nesten alle.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Sideprosjekter</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Sideprosjekter<br>gjør deg til<br><em>den man spør</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };
    const R = (k) => REGIONS.find((r) => r.key === k);

    function region(g, r) {
      const rg = D.g(g, { 'data-unit': '' });
      const d = D.roughEllipse(r.x, r.y, r.r, r.r * 0.72, { turns: 1 });
      D.p(rg, d + ' Z', '', { style: `fill: ${r.color}; stroke: #1a120c`, 'stroke-width': 2.5 });
      D.text(rg, r.x, r.y - 4, r.label, 'rl', { 'text-anchor': 'middle', style: `font: 800 ${r.r < 80 ? 20 : 24}px var(--font-display); fill: #fff3e3` });
      D.text(rg, r.x, r.y + 24, r.sub, 'rs', { 'text-anchor': 'middle', style: 'font: 400 14px var(--font-mono); fill: #f0e4d2' });
      return rg;
    }
    function fog(g, r) {
      const f = D.g(g, { 'data-bg': '' });
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        D.el('circle', { cx: r.x + Math.cos(a) * r.r * 0.55, cy: r.y + Math.sin(a) * r.r * 0.4, r: r.r * 0.62, style: 'fill: #2b2420' }, f);
      }
      D.el('circle', { cx: r.x, cy: r.y, r: r.r * 0.8, style: 'fill: #2b2420' }, f);
      return f;
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const map = D.g(svg, { 'data-bg': '' });
        D.el('rect', { x: 560, y: 150, width: 920, height: 620, rx: 10, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 2 }, map);
        tl.fromTo(map, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.2);
        P.regions = {}; P.fogs = {};
        REGIONS.forEach((r) => { P.regions[r.key] = region(svg, r); });
        REGIONS.forEach((r) => { if (!r.open) P.fogs[r.key] = fog(svg, r); });
        // fog covers everything but backend; a mist layer over the whole map
        tl.fromTo(Object.values(P.regions), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.4);
        tl.fromTo(Object.values(P.fogs), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.4);
        // you
        P.you = figure(svg, { x: YOU.x, y: YOU.neck, s: 0.75, pose: 'stand', arms: 'down', ...LOOK.me });
        tl.fromTo(P.you.root, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.6);
        // a line from you to the one region you know
        P.link = D.p(svg, `M${YOU.x + 60} ${YOU.neck} Q 560 ${YOU.neck - 60} ${R('backend').x - R('backend').r + 6} ${R('backend').y}`, '', { style: 'fill: none; stroke: var(--accent-2)', 'stroke-width': 3, 'stroke-dasharray': '2 10', 'stroke-linecap': 'round', 'data-bg': '' });
        tl.add(D.drawOn(P.link, { duration: 0.6 }), 1.0);
      }

      if (i === 1) {
        // each project clears a region
        const order = ['3d', 'web', 'home', 'game', 'blender', 'img'];
        order.forEach((k, n) => {
          const at = 0.2 + n * 0.55;
          tl.to(P.fogs[k], { opacity: 0, scale: 1.4, transformOrigin: '50% 50%', duration: 0.6, ease: 'power2.out' }, at);
          tl.fromTo(P.regions[k], { scale: 0.9, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.4, ease: 'back.out(2)', immediateRender: false }, at + 0.2);
          // you now know this area too: another line from you
          const r = R(k);
          const ln = D.p(svg, `M${YOU.x + 60} ${YOU.neck} Q 560 ${YOU.neck - 80 + n * 30} ${r.x - r.r + 6} ${r.y}`, '', { style: 'fill: none; stroke: var(--accent-2)', 'stroke-width': 3, 'stroke-dasharray': '2 10', 'stroke-linecap': 'round', 'data-bg': '' });
          svg.insertBefore(ln, svg.children[1]);
          tl.add(D.drawOn(ln, { duration: 0.5 }), at + 0.3);
        });
        P.you.expr(tl, { mouth: 'smile' }, 3.4);
      }

      if (i === 2) {
        // colleagues ask; every line runs to you
        const fogSpot = { x: 1400, y: 720 };
        const mist = D.g(svg, { 'data-bg': '' });
        [[1400, 720, 52], [1440, 700, 40], [1360, 735, 38]].forEach(([cx, cy, r]) => D.el('circle', { cx, cy, r, style: 'fill: #2b2420' }, mist));
        tl.fromTo(mist, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0);
        const pin = (g, x, y) => {
          const p = D.g(g, { 'data-bg': '' });
          D.p(p, `M${x} ${y} c-12 -18 -16 -26 -16 -34 a16 16 0 1 1 32 0 c0 8 -4 16 -16 34 Z`, '', FILL('#ffd23f', 2));
          return p;
        };
        let t = 0.3;
        const foc = [P.you.root, mist];
        ASKS.forEach((a, k) => {
          const r = R(a.to);
          const px = r.x + r.r * 0.55, py = r.y - r.r * 0.35;
          const p = pin(svg, px, py);
          foc.push(p);
          tl.fromTo(p, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.4, ease: 'bounce.out' }, t);
          const line = D.p(svg, `M${px} ${py - 30} Q ${(px + YOU.x) / 2} ${180 + k * 30} ${YOU.x + 30} ${YOU.neck - 100}`, '', { style: 'fill: none; stroke: #ffd23f', 'stroke-width': 3, opacity: 0.8, 'data-bg': '' });
          tl.add(D.drawOn(line, { duration: 0.6 }), t + 0.3);
          foc.push(line);
          const b = speech(svg, 90, 320, a.q, [YOU.x - 10, YOU.neck - 110], { size: 20 });
          tl.fromTo(b, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 }, t + 0.5);
          foc.push(b);
          tl.to(b, { opacity: 0, duration: 0.2 }, t + 1.5);
          P.you.expr(tl, { mouth: 'smile', brows: 'raised' }, t + 0.6);
          t += 1.6;
        });
        // the last one lands in the fog
        const p = pin(svg, fogSpot.x, fogSpot.y - 20);
        tl.fromTo(p, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.4, ease: 'bounce.out' }, t);
        const line = D.p(svg, `M${fogSpot.x} ${fogSpot.y - 50} Q 900 820 ${YOU.x + 30} ${YOU.neck - 100}`, '', { style: 'fill: none; stroke: #ffd23f', 'stroke-width': 3, opacity: 0.8, 'data-bg': '' });
        tl.add(D.drawOn(line, { duration: 0.7 }), t + 0.3);
        const b = speech(svg, 90, 320, 'Kan du fikse printeren?', [YOU.x - 10, YOU.neck - 110], { size: 20 });
        tl.fromTo(b, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 }, t + 0.6);
        P.you.expr(tl, { mouth: 'neutral', brows: 'annoyed', eyes: 'closed' }, t + 1.0);
        ctx.focus(tl, [...foc, p, line, b], 0.3);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
