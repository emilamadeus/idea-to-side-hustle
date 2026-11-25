import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, LOOK } from '../engine/characters.js';

/*
  Cold open, right after the title: where the journey starts and where it ended up.
    0. You, and the wish: one hobby project over the finish line (a checkered flag in a thought).
    1. Fifteen projects later: one is over the line, fourteen stop just short of it.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    you        x 200–420, y 330–760; thought cloud x 380–780, y 180–440
    projects   x 860–1480: header y 176; 15 bars x 860–1400, y 210–692; finish line x 1400
*/

const BX = 860, FINISH = 1400, BW = FINISH - BX, BY = 210, ROW = 33, BH = 20;
// how far each unfinished project got: all close, none over
const DONE = 6; // the finished one, seventh on the list
const NEAR = [0.9, 0.84, 0.94, 0.88, 0.92, 0.86, 0.95, 0.83, 0.9, 0.93, 0.87, 0.91, 0.85, 0.96];

export default {
  id: 'opening',
  title: 'Utgangspunktet',
  steps: 2,
  notes: [
    'Jeg ville finne ut om AI kunne hjelpe meg å få ett hobbyprosjekt i mål.',
    '15 prosjekter senere: ett i mål, fjorten nesten. Resten av foredraget: hvordan.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Utgangspunktet</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2);max-width:calc(var(--u)*34)">Jeg ville finne ut om AI kunne bidra til et <em>hobbyprosjekt</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    // a checkered finish flag
    function flag(g, x, y, s) {
      const f = D.g(g, { transform: `translate(${x} ${y}) scale(${s})` });
      D.p(f, 'M0 0 V150', '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 10, 'stroke-linecap': 'round' });
      D.p(f, 'M0 0 V150', '', { style: 'fill: none; stroke: #cfc3b2', 'stroke-width': 5, 'stroke-linecap': 'round' });
      const sq = 22;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        D.el('rect', { x: 4 + c * sq, y: 4 + r * sq, width: sq, height: sq, style: `fill: ${(r + c) % 2 ? '#1a120c' : '#fff3e3'}` }, f);
      }
      D.el('rect', { x: 4, y: 4, width: 5 * sq, height: 3 * sq, style: 'fill: none; stroke: #1a120c', 'stroke-width': 3 }, f);
      return f;
    }

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.you = figure(svg, { x: 300, y: 760 - 252 * 0.9, s: 0.9, pose: 'stand', arms: 'down', ...LOOK.me, mouth: 'smile', eyes: 'open' });
        tl.fromTo(P.you.root, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3);
        // the wish: one project over the line
        const cloud = D.g(svg, { 'data-unit': '' });
        D.p(cloud, 'M430 430 C380 430 372 370 420 360 C400 312 452 270 500 290 C512 236 600 226 626 276 C670 246 742 270 730 322 C780 334 780 424 724 430 Z', '', { style: 'fill: #241a13; stroke: var(--fg)', 'stroke-width': 2.6 });
        flag(cloud, 530, 290, 0.78);
        [[392, 458, 10], [366, 484, 7]].forEach(([cx, cy, r]) => D.el('circle', { cx, cy, r, style: 'fill: #241a13; stroke: var(--fg)', 'stroke-width': 2 }, cloud));
        tl.fromTo(cloud, { opacity: 0, scale: 0.7, transformOrigin: '0% 100%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, 0.9);
        P.cloud = cloud;
      }

      if (i === 1) {
        // fifteen projects: one over the line, fourteen just short
        const g = D.g(svg);
        D.text(g, BX, 186, '15 PROSJEKTER', 'ph', { style: 'font: 700 16px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        const line = D.g(g, { 'data-bg': '' });
        D.p(line, `M${FINISH} 200 V${BY + 14 * ROW + BH + 10}`, '', { style: 'fill: none; stroke: var(--fg)', 'stroke-width': 3, 'stroke-dasharray': '10 8' });
        D.text(g, FINISH, 186, 'MÅL', 'fl', { 'text-anchor': 'middle', style: 'font: 700 16px var(--font-mono); letter-spacing: .14em; fill: var(--fg)' });
        tl.fromTo([g.children[0], line, g.children[2]], { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.2);
        const fills = [];
        for (let k = 0; k < 15; k++) {
          const y = BY + k * ROW;
          const bar = D.g(g, { 'data-bg': '' });
          D.el('rect', { x: BX, y, width: BW, height: BH, rx: 6, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2 }, bar);
          const done = k === DONE;
          const f = D.el('rect', { x: BX + 2, y: y + 2, width: 0, height: BH - 4, rx: 4, style: `fill: ${done ? '#8fe3a2' : '#a8774c'}` }, bar);
          fills.push([f, done ? 1 : NEAR[k - (k > DONE ? 1 : 0)]]);
          tl.fromTo(bar, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.4 + k * 0.05);
        }
        // they all slow down just before the line; only one gets there
        fills.forEach(([f, v], k) => tl.to(f, { attr: { width: (BW - 4) * v }, duration: k === DONE ? 2.2 : 1.8, ease: k === DONE ? 'power1.inOut' : 'expo.out' }, 1.2 + k * 0.04));
        const check = D.g(g, { 'data-unit': '' });
        D.el('circle', { cx: FINISH + 40, cy: BY + DONE * ROW + BH / 2, r: 16, style: 'fill: #8fe3a2; stroke: #1a120c', 'stroke-width': 2.5 }, check);
        D.p(check, `M${FINISH + 32} ${BY + DONE * ROW + 10} l6 6 l10 -11`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        tl.fromTo(check, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' }, 3.4);
        P.you.expr(tl, { mouth: 'grin', brows: 'raised' }, 3.6);
        ctx.focus(tl, [g, P.you.root], 0.2);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
