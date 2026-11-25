import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, LOOK } from '../engine/characters.js';
import { FILL } from '../engine/props.js';

/*
  Cold open, right after the title: where the journey starts and where it ended up.
    0. You, and the idea: a game where everything can break.
    1. What it turned into: a product on Fab, three live sites, and the game, still at 80 %.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    you        x 200–420, y 330–760; thought cloud x 380–780, y 180–440
    outcomes   x 860–1480: Fab card y 200–360, sites card y 390–560, game bar y 600–700
*/

export default {
  id: 'opening',
  title: 'Jeg ville lage et spill',
  steps: 2,
  notes: [
    'Det startet med en idé: et spill der alt kan knuses.',
    'Det ble noe annet. Et produkt på Fab, tre nettsider. Og spillet? 80 %. Resten av foredraget: hvordan.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Utgangspunktet</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Jeg ville lage<br>et <em>spill</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    // a cart breaking along the grain, drawn small
    function brokenCart(g, x, y, s) {
      const c = D.g(g, { transform: `translate(${x} ${y}) scale(${s})` });
      D.el('rect', { x: -70, y: -46, width: 64, height: 12, rx: 2, transform: 'rotate(-14 -38 -40)', ...FILL('#c98f5a', 2) }, c);
      D.el('rect', { x: 4, y: -50, width: 66, height: 12, rx: 2, transform: 'rotate(12 37 -44)', ...FILL('#c98f5a', 2) }, c);
      D.el('rect', { x: -70, y: -24, width: 140, height: 12, rx: 2, ...FILL('#c98f5a', 2) }, c);
      [-40, 40].forEach((wx, k) => {
        D.el('circle', { cx: wx + (k ? 16 : 0), cy: 4, r: 24, style: 'fill: none; stroke: #fff3e3', 'stroke-width': 5 }, c);
        D.p(c, `M${wx + (k ? 16 : 0) - 24} 4 H${wx + (k ? 16 : 0) + 24} M${wx + (k ? 16 : 0)} -20 V28`, '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 3 });
      });
      D.p(c, 'M-10 -64 l6 -14 M8 -66 l-2 -16 M24 -60 l10 -10', '', { style: 'fill: none; stroke: #ffd23f', 'stroke-width': 4, 'stroke-linecap': 'round' });
      return c;
    }
    function card(g, x, y, w, h) {
      D.el('rect', { x, y, width: w, height: h, rx: 12, style: 'fill: #1a120c; stroke: #6b5a48', 'stroke-width': 2.5, 'data-bg': '' }, g);
    }

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.you = figure(svg, { x: 300, y: 760 - 252 * 0.9, s: 0.9, pose: 'stand', arms: 'down', ...LOOK.me, mouth: 'smile', eyes: 'open' });
        tl.fromTo(P.you.root, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3);
        // the idea, as a thought
        const cloud = D.g(svg, { 'data-unit': '' });
        D.p(cloud, 'M430 430 C380 430 372 370 420 360 C400 312 452 270 500 290 C512 236 600 226 626 276 C670 246 742 270 730 322 C780 334 780 424 724 430 Z', '', { style: 'fill: #241a13; stroke: var(--fg)', 'stroke-width': 2.6 });
        brokenCart(cloud, 575, 360, 0.9);
        [[392, 458, 10], [366, 484, 7]].forEach(([cx, cy, r]) => D.el('circle', { cx, cy, r, style: 'fill: #241a13; stroke: var(--fg)', 'stroke-width': 2 }, cloud));
        tl.fromTo(cloud, { opacity: 0, scale: 0.7, transformOrigin: '0% 100%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, 0.9);
        P.cloud = cloud;
      }

      if (i === 1) {
        // what it turned into
        const fab = D.g(svg, { 'data-unit': '' });
        card(fab, 860, 190, 620, 170);
        D.text(fab, 890, 232, 'FAB · ATLADEUS STUDIO', 'fb', { style: 'font: 700 15px var(--font-mono); letter-spacing: .12em; fill: var(--muted)' });
        D.text(fab, 890, 278, 'Destructible Medieval', 'f1', { style: 'font: 800 30px var(--font-display); fill: var(--fg)' });
        D.text(fab, 890, 316, 'Cart and Wagon Props', 'f2', { style: 'font: 800 30px var(--font-display); fill: var(--fg)' });
        const st = D.stamp(D.g(fab, { 'data-unit': '' }), 1350, 300, 'PUBLISERT', { size: 24, rotate: -6 });
        const sites = D.g(svg, { 'data-unit': '' });
        card(sites, 860, 390, 620, 170);
        D.text(sites, 890, 432, 'LIVE', 'sl', { style: 'font: 700 15px var(--font-mono); letter-spacing: .12em; fill: #8fe3a2' });
        ['home.atladeus.com', 'wish.atladeus.com', 'app.atladeus.com'].forEach((u, k) => D.text(sites, 890, 474 + k * 34, u, 'su', { style: 'font: 700 24px var(--font-mono); fill: var(--fg)' }));
        const game = D.g(svg, { 'data-unit': '' });
        D.text(game, 860, 616, 'Spillet', 'gl', { style: 'font: 700 22px var(--font-mono); fill: var(--fg)' });
        D.el('rect', { x: 860, y: 634, width: 520, height: 28, rx: 7, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2 }, game);
        const fill = D.el('rect', { x: 863, y: 637, width: 0, height: 22, rx: 5, style: 'fill: var(--accent)', 'data-bg': '' }, game);
        D.text(game, 1400, 656, '80 %', 'gp', { style: 'font: 800 24px var(--font-display); fill: var(--fg)' });
        tl.fromTo(fab, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.2);
        tl.add(D.slam(st.parentNode), 0.8);
        tl.fromTo(sites, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 1.3);
        tl.fromTo(game, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 2.0);
        tl.to(fill, { attr: { width: 514 * 0.8 }, duration: 1.0, ease: 'power2.out' }, 2.3);
        P.you.expr(tl, { mouth: 'grin', brows: 'raised' }, 3.0);
        ctx.focus(tl, [fab, sites, game, P.you.root], 0.2);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
