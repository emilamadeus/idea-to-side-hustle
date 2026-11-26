import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, PALETTE, LOOK } from '../engine/characters.js';
import { FILL } from '../engine/props.js';

/*
  Tip: let Claude and ChatGPT work through one shared file.
  Two workshops and an order board between them (asset-queue.md).
    0. Claude (3D workshop) pins an order: reference images for a medieval cart.
    1. ChatGPT (image studio) reads the board, paints exactly that, puts the sheets on
       the agreed shelf, marks the order done.
    2. Claude builds from the sheets and pins the next order. The loop speeds up.
    3. The carts are real: published on Fab, and they break along the grain.
       The game they were made for is still at 80 %.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    game bar   x 80–520, y 600–680 (step 3)
    claude     x 560–880  (sign y 170, worker, bench y 600)
    board      x 900–1160 (y 170–520), shelf y 600–640
    chatgpt    x 1180–1480 (sign y 170, easel)
*/

const CL = '#ff7a2f', GPT = '#74aa9c';
const ORDERS = ['Referanser: vogn', 'Referanser: hjul', 'Referanser: kjerre', 'Referanser: tønner'];

export default {
  id: 'asset-loop',
  title: 'Claude ↔ ChatGPT',
  steps: 4,
  notes: [
    'Claude bygger 3D. Den skriver en bestilling i en delt fil.',
    'ChatGPT sjekker fila, lager akkurat det, legger det der Claude sa, merker ferdig.',
    'Claude bygger, bestiller neste. Sånn går det i loop til alt er ferdig.',
    'Atladeus Studio på Fab. Og spillet de var til? 80 %.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">To modeller</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">La Claude og ChatGPT<br>jobbe via <em>én fil</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    const sign = (g, x, label, color) => {
      const s = D.g(g, { 'data-unit': '' });
      D.el('rect', { x, y: 168, width: 300, height: 44, rx: 8, style: `fill: #1a120c; stroke: ${color}`, 'stroke-width': 3 }, s);
      D.text(s, x + 150, 198, label, 'sg', { 'text-anchor': 'middle', style: `font: 700 18px var(--font-mono); letter-spacing: .12em; fill: ${color}` });
    };
    // a medieval cart as a drawing (wheels, bed, shafts); returns the group and its plank lines
    const cart = (g, x, y, s = 1, color = '#c98f5a') => {
      const c = D.g(g, { transform: `translate(${x} ${y}) scale(${s})` });
      const planks = [0, 1, 2].map((k) => D.el('rect', { x: -70, y: -46 + k * 14, width: 140, height: 12, rx: 2, ...FILL(color, 2) }, c));
      const shaft = D.p(c, 'M70 -30 L130 -40', '', { style: 'fill: none; stroke: var(--fg)', 'stroke-width': 5, 'stroke-linecap': 'round' });
      const wheels = [-40, 40].map((wx) => {
        const w = D.g(c);
        D.el('circle', { cx: wx, cy: 0, r: 26, style: 'fill: none; stroke: var(--fg)', 'stroke-width': 5 }, w);
        D.p(w, `M${wx - 26} 0 H${wx + 26} M${wx} -26 V26 M${wx - 18} -18 L${wx + 18} 18 M${wx + 18} -18 L${wx - 18} 18`, '', { style: 'fill: none; stroke: var(--fg)', 'stroke-width': 3 });
        return w;
      });
      return { g: c, planks, wheels, shaft };
    };
    const card = (g, label, k) => {
      const c = D.g(g, { 'data-unit': '' });
      const y = 262 + k * 62;
      D.el('rect', { x: 916, y, width: 228, height: 52, rx: 4, style: 'fill: #fff3e3' }, c);
      D.text(c, 928, y + 22, `#${k + 1}`, 'cn', { style: 'font: 700 13px var(--font-mono); fill: #7a5a3a' });
      D.text(c, 928, y + 42, label, 'cl', { style: 'font: 700 15px var(--font-mono); fill: #1a120c' });
      const st = D.text(c, 1132, y + 22, 'bestilt', 'cs', { 'text-anchor': 'end', style: 'font: 700 13px var(--font-mono); fill: #c4562a' });
      c.done = (tl, at) => tl.call(() => { st.textContent = 'levert'; st.setAttribute('style', 'font: 700 13px var(--font-mono); fill: #1f9d63'); }, null, at);
      return c;
    };
    const sheet = (g) => {
      const s = D.g(g, { 'data-bg': '' });
      D.el('rect', { x: -26, y: -34, width: 52, height: 68, rx: 2, ...FILL('#fff3e3', 2) }, s);
      D.p(s, 'M-16 12 h32 M-16 4 h32 M-12 12 a5 5 0 1 0 0.1 0 M12 12 a5 5 0 1 0 0.1 0', '', { style: 'fill: none; stroke: #7a4a2c', 'stroke-width': 2.5 });
      return s;
    };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const room = D.g(svg, { 'data-bg': '' });
        D.p(room, 'M560 740 H1480', 'thin');
        tl.fromTo(room, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.2);
        const signs = D.g(svg);
        sign(signs, 570, 'CLAUDE · 3D', CL);
        sign(signs, 1175, 'CHATGPT · BILDER', GPT);
        tl.fromTo(signs, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 }, 0.3);
        // the shared file as a board
        const board = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 900, y: 168, width: 260, height: 390, rx: 8, style: 'fill: #2a1f17; stroke: var(--deco)', 'stroke-width': 2.5, 'data-bg': '' }, board);
        D.text(board, 1030, 214, 'asset-queue.md', 'bt', { 'text-anchor': 'middle', style: 'font: 700 18px var(--font-mono); fill: var(--accent-2)' });
        D.p(board, 'M916 232 H1144', '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2 });
        tl.fromTo(board, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        // shelf: the delivery place Claude chose
        const shelf = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 900, y: 650, width: 260, height: 14, rx: 3, ...FILL('#6b4a30', 2) }, shelf);
        D.text(shelf, 1030, 692, 'refs/carts/', 'sh', { 'text-anchor': 'middle', style: 'font: 700 17px var(--font-mono); fill: var(--muted)' });
        tl.fromTo(shelf, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
        // workers
        const look = { pose: 'stand', s: 0.85 };
        P.claude = figure(svg, { x: 618, y: 740 - 252 * 0.85, arms: 'table', ...look, ...LOOK.claude });
        P.gpt = figure(svg, { x: 1428, y: 740 - 252 * 0.85, arms: 'point', flip: true, ...look, ...LOOK.gpt });
        tl.fromTo([P.claude.root, P.gpt.root], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.5);
        // claude's bench, ChatGPT's easel
        const bench = D.g(svg, { 'data-bg': '' });
        D.el('rect', { x: 670, y: 600, width: 210, height: 16, rx: 3, ...FILL('#6b4a30', 2) }, bench);
        D.p(bench, 'M680 616 V740 M870 616 V740', 'ln');
        // a wall shelf where finished models collect
        D.el('rect', { x: 580, y: 338, width: 300, height: 12, rx: 3, ...FILL('#6b4a30', 2) }, bench);
        const easel = D.g(svg, { 'data-bg': '' });
        D.p(easel, 'M1240 740 L1295 300 L1350 740 M1295 300 V740', 'ln');
        D.el('rect', { x: 1195, y: 300, width: 200, height: 250, rx: 3, ...FILL('#fff3e3', 2.5) }, easel);
        P.canvas = D.g(svg, { 'data-bg': '' });
        tl.fromTo([bench, easel], { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.6);
        // the first order
        P.cards = [card(svg, ORDERS[0], 0)];
        const note = P.cards[0];
        tl.fromTo(note, { opacity: 0, x: -300, y: 280, scale: 0.5, transformOrigin: '0% 0%' }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.7, ease: 'power2.out' }, 1.4);
        P.claude.expr(tl, { mouth: 'smile' }, 1.4);
      }

      if (i === 1) {
        // ChatGPT reads the board, paints exactly that, delivers, marks it
        P.gpt.expr(tl, { brows: 'raised' }, 0);
        const ring = D.el('rect', { x: 910, y: 256, width: 240, height: 64, rx: 6, style: `fill: none; stroke: ${GPT}`, 'stroke-width': 3, opacity: 0, 'data-bg': '' }, svg);
        tl.to(ring, { opacity: 1, duration: 0.2, repeat: 3, yoyo: true }, 0.2);
        const art = cart(P.canvas, 1288, 470, 0.95, '#b07a4a');
        const parts = [...art.planks, ...art.wheels, art.shaft];
        tl.fromTo(parts, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.18 }, 1.0);
        P.gpt.expr(tl, { mouth: 'smile', brows: 'neutral' }, 2.2);
        // sheets go to the agreed shelf
        P.sheets = [0, 1, 2].map((k) => {
          const s = sheet(svg);
          gsap.set(s, { x: 1295, y: 450, opacity: 0 });
          tl.to(s, { opacity: 1, duration: 0.1 }, 2.4 + k * 0.25);
          tl.to(s, { x: 960 + k * 70, y: 612, duration: 0.6, ease: 'power2.inOut' }, 2.4 + k * 0.25);
          return s;
        });
        P.cards[0].done(tl, 3.4);
        ctx.focus(tl, [P.gpt.root, P.canvas, ...P.sheets, P.cards[0], ring], 0.2);
        tl.fromTo(P.cards[0], { scale: 1.08, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.3, immediateRender: false }, 3.4);
      }

      if (i === 2) {
        // Claude builds from the sheets, orders the next; the loop speeds up
        tl.to(P.sheets, { x: 775, y: 560, opacity: 0, duration: 0.5, stagger: 0.1 }, 0);
        P.claude.expr(tl, { eyes: 'down' }, 0.3);
        const built = cart(svg, 775, 562, 0.8);
        const bp = [...built.planks, ...built.wheels, built.shaft];
        tl.fromTo(bp, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.12 }, 0.6);
        P.built = built;
        P.claude.expr(tl, { eyes: 'open', mouth: 'smile' }, 1.6);
        // the first finished model goes up on the shelf
        const model = (k, at) => {
          const m = cart(svg, 620 + k * 82, 322, 0.32);
          tl.fromTo(m.g, { opacity: 0 }, { opacity: 1, duration: 0.25 }, at);
        };
        model(0, 1.7);
        // three more rounds, each quicker
        let t = 1.8;
        for (let k = 1; k < ORDERS.length; k++) {
          const c = card(svg, ORDERS[k], k);
          P.cards.push(c);
          const d = 1.2 / k;
          tl.fromTo(c, { opacity: 0, x: -200 }, { opacity: 1, x: 0, duration: 0.3 }, t);
          const s = sheet(svg);
          gsap.set(s, { x: 1295, y: 450, opacity: 0 });
          tl.fromTo(P.canvas, { opacity: 0.2 }, { opacity: 1, duration: d * 0.4 }, t + 0.1);
          tl.to(s, { opacity: 1, duration: 0.1 }, t + d * 0.5);
          tl.to(s, { x: 1030, y: 612, duration: d * 0.5, ease: 'power1.inOut' }, t + d * 0.5);
          c.done(tl, t + d);
          tl.to(s, { x: 775, y: 560, opacity: 0, duration: d * 0.4 }, t + d * 1.1);
          model(k, t + d * 1.4);
          t += d * 1.4;
        }
      }

      if (i === 3) {
        // the carts are real; and they break the way wood does
        const fab = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 80, y: 290, width: 440, height: 250, rx: 12, style: 'fill: #1a120c; stroke: var(--deco)', 'stroke-width': 2.5, 'data-bg': '' }, fab);
        D.text(fab, 104, 332, 'FAB · ATLADEUS STUDIO', 'fb', { style: 'font: 700 15px var(--font-mono); letter-spacing: .12em; fill: var(--muted)' });
        D.text(fab, 104, 374, 'Destructible Medieval', 'f1', { style: 'font: 800 28px var(--font-display); fill: var(--fg)' });
        D.text(fab, 104, 408, 'Cart and Wagon Props', 'f2', { style: 'font: 800 28px var(--font-display); fill: var(--fg)' });
        tl.fromTo(fab, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0);
        const st = D.stamp(D.g(svg, { 'data-unit': '' }), 300, 480, 'PUBLISERT', { size: 30, rotate: -6 });
        tl.add(D.slam(st), 0.6);
        // the built cart breaks along the grain
        const b = P.built;
        tl.to(b.planks[0], { x: -30, y: -40, rotation: -24, transformOrigin: '50% 50%', duration: 0.5, ease: 'power2.out' }, 1.4);
        tl.to(b.planks[1], { x: 40, y: -30, rotation: 18, transformOrigin: '50% 50%', duration: 0.5, ease: 'power2.out' }, 1.4);
        tl.to(b.planks[2], { y: 20, rotation: -6, transformOrigin: '50% 50%', duration: 0.5, ease: 'bounce.out' }, 1.45);
        tl.to(b.wheels[0], { x: -60, rotation: -200, transformOrigin: '50% 50%', duration: 0.8, ease: 'power2.out' }, 1.4);
        tl.to(b.shaft, { rotation: 30, transformOrigin: '0% 50%', duration: 0.4 }, 1.4);
        P.claude.expr(tl, { eyes: 'wide', mouth: 'grin' }, 1.5);
        // the game these were for
        const game = D.g(svg, { 'data-unit': '' });
        D.text(game, 80, 616, 'Spillet', 'gl', { style: 'font: 700 22px var(--font-mono); fill: var(--fg)' });
        D.el('rect', { x: 80, y: 634, width: 360, height: 26, rx: 6, style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2 }, game);
        const fill = D.el('rect', { x: 83, y: 637, width: 0, height: 20, rx: 4, style: 'fill: var(--accent)' }, game);
        const pct = D.text(game, 456, 655, '80 %', 'gp', { style: 'font: 700 22px var(--font-mono); fill: var(--fg)' });
        tl.fromTo(game, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 2.6);
        tl.to(fill, { attr: { width: 354 * 0.8 }, duration: 0.8, ease: 'power2.out' }, 2.8);
        tl.to(fill, { attr: { width: 354 * 0.81 }, duration: 0.25, yoyo: true, repeat: 3, ease: 'power1.inOut' }, 3.7);
        tl.call(() => { pct.textContent = '81 %'; }, null, 3.75);
        tl.call(() => { pct.textContent = '80 %'; }, null, 4.0);
        tl.call(() => { pct.textContent = '81 %'; }, null, 4.25);
        tl.call(() => { pct.textContent = '80 %'; }, null, 4.5);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
