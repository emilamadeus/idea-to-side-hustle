import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone } from '../engine/props.js';

/*
  Tip: build several throwaway versions and pick one, instead of debating one.
  The example is this deck's own visual identity.
    0. Asked for four real directions.
    1. They flip past one at a time: Observatoriet, Arkade, Blåkopi, Arbeidstegning.
    2. Side by side for the pick. Three go in the bin; the chosen one comes back, stamped:
       the style of the deck you are watching.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–560
    card       x 620–1460, y 160–632 (one direction at a time); label y 680
    pick row   y 300–520 (step 2); bin x 1360–1460, y 600–760
*/

const DIRS = [
  { name: 'Observatoriet', bg: '#0b1020', fg: '#e8eefc', acc: '#7fb2ff', font: "800 64px 'Inter Tight', var(--font-display)", deco: 'stars' },
  { name: 'Arkade', bg: '#1a0f08', fg: '#ffd23f', acc: '#ff5a1f', font: '800 58px var(--font-display)', deco: 'blocks' },
  { name: 'Blåkopi', bg: '#1d3a6b', fg: '#eaf2ff', acc: '#ff6f6f', font: '700 40px var(--font-mono)', deco: 'grid' },
  { name: 'Arbeidstegning', bg: '#16100b', fg: '#fff3e3', acc: '#ff5a1f', font: '800 64px var(--font-display)', deco: 'sheet' },
];
const CW = 840, CH = 472;

export default {
  id: 'prototypes',
  title: 'Prototyper',
  steps: 3,
  notes: [
    'Fire ekte retninger i stedet for et møte om én.',
    'Observatoriet, Arkade, Blåkopi, Arbeidstegning.',
    'Velg én. Resten kastes. Det er den dere ser på nå.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Prototyper</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Lag fire.<br>Velg <em>én</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    // a mini title slide drawn in each direction's own style (0,0 → CW×CH)
    function card(g, d) {
      const c = D.g(g, { 'data-unit': '' });
      D.el('rect', { x: 0, y: 0, width: CW, height: CH, rx: 14, style: `fill: ${d.bg}; stroke: #6b5a48`, 'stroke-width': 3, 'data-bg': '' }, c);
      const deco = D.g(c, { 'data-bg': '' });
      const grid = (color, step = 40) => {
        let p = '';
        for (let x = step; x < CW; x += step) p += `M${x} 0 V${CH} `;
        for (let y = step; y < CH; y += step) p += `M0 ${y} H${CW} `;
        D.p(deco, p, '', { style: `fill: none; stroke: ${color}`, 'stroke-width': 1.5 });
      };
      if (d.deco === 'stars') {
        // night sky: a big moon, stars, a thin horizon of hills
        D.el('circle', { cx: 690, cy: 120, r: 70, style: 'fill: #e8eefc', opacity: 0.9 }, deco);
        D.el('circle', { cx: 668, cy: 104, r: 64, style: `fill: ${d.bg}` }, deco);
        for (let k = 0; k < 46; k++) D.el('circle', { cx: (k * 197) % CW, cy: (k * 89) % (CH - 120), r: (k % 3) * 0.8 + 1.4, style: `fill: ${d.fg}`, opacity: 0.35 + (k % 4) * 0.15 }, deco);
        D.p(deco, `M0 ${CH - 70} Q200 ${CH - 120} 420 ${CH - 80} T${CW} ${CH - 96} V${CH} H0 Z`, '', { style: 'fill: #141c33' });
      }
      if (d.deco === 'blocks') {
        // loud flat colour: huge number, stacked blocks
        D.el('rect', { x: 620, y: 0, width: CW - 620, height: CH, style: `fill: ${d.acc}` }, deco);
        D.text(deco, 730, 320, '80', 'big', { 'text-anchor': 'middle', style: `font: 800 200px var(--font-display); fill: ${d.bg}` });
        D.el('rect', { x: 60, y: 330, width: 120, height: 60, style: `fill: ${d.fg}` }, deco);
        D.el('rect', { x: 190, y: 330, width: 60, height: 60, style: `fill: ${d.acc}` }, deco);
      }
      if (d.deco === 'grid') {
        // blueprint: grid, a white technical drawing of a house, a red pencil correction
        grid('#2f5590');
        D.p(deco, 'M560 380 V250 L660 190 L760 250 V380 Z M600 380 V320 H640 V380 M680 280 h50 v40 h-50 Z', '', { style: 'fill: none; stroke: #eaf2ff', 'stroke-width': 3 });
        D.p(deco, 'M540 400 H780 M540 395 v10 M780 395 v10', '', { style: 'fill: none; stroke: #eaf2ff', 'stroke-width': 2 });
        D.p(deco, D.roughEllipse(705, 300, 50, 34), '', { style: 'fill: none; stroke: #ff6f6f', 'stroke-width': 3 });
      }
      if (d.deco === 'sheet') {
        // working drawing: warm grid, crop marks, title block, a dimension line
        grid('#2a1f17');
        D.p(deco, 'M24 44 V24 H44 M796 24 H816 V44 M24 428 V448 H44 M796 448 H816 V428', '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 2.5 });
        D.el('rect', { x: CW - 280, y: CH - 80, width: 250, height: 54, style: 'fill: none; stroke: #6b5a48', 'stroke-width': 2 }, deco);
        D.p(deco, `M${CW - 200} ${CH - 80} V${CH - 26} M${CW - 110} ${CH - 80} V${CH - 26}`, '', { style: 'fill: none; stroke: #6b5a48', 'stroke-width': 2 });
        D.p(deco, `M60 ${CH / 2 + 40} H500 M60 ${CH / 2 + 32} v16 M500 ${CH / 2 + 32} v16`, '', { style: 'fill: none; stroke: #ffd23f', 'stroke-width': 3 });
      }
      D.text(c, 60, CH / 2, 'Fra idé til startup', 'ct', { style: `font: ${d.font}; fill: ${d.fg}` });
      D.text(c, 60, CH / 2 + 90, d.name.toUpperCase(), 'cn', { style: `font: 700 22px var(--font-mono); letter-spacing: .14em; fill: ${d.acc}` });
      return c;
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 440, 300, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, 'Lag fire visuelle retninger for presentasjonen. Ekte, som jeg kan klikke i.', 0.8);
        const t = P.chat.think(tl, 1.6, 1.4);
        P.chat.reply(tl, 'Fire retninger klare.', t);
        P.cards = DIRS.map((d) => { const c = card(svg, d); gsap.set(c, { x: 620, y: 160, opacity: 0 }); return c; });
      }

      if (i === 1) {
        // one at a time
        P.cards.forEach((c, k) => {
          const at = k * 1.3;
          tl.fromTo(c, { opacity: 0, x: 700, rotation: 3, transformOrigin: '50% 50%' }, { opacity: 1, x: 620, rotation: 0, duration: 0.45, ease: 'power2.out' }, at);
          if (k < P.cards.length - 1) tl.to(c, { opacity: 0, x: 560, duration: 0.3, ease: 'power2.in' }, at + 0.85); // gone before the next arrives
        });
      }

      if (i === 2) {
        // side by side for the pick; three in the bin; one fills the frame
        const s = 0.24;
        // the shown card shrinks into its slot; the other three fade in at theirs (no fanning through each other)
        P.cards.forEach((c, k) => {
          tl.set(c, { transformOrigin: '0% 0%' }, 0);
          if (k === P.cards.length - 1) tl.to(c, { x: 600 + k * 222, y: 320, scale: s, rotation: 0, opacity: 1, duration: 0.6, ease: 'power2.inOut' }, 0);
          else {
            tl.set(c, { x: 600 + k * 222, y: 320, scale: s, rotation: 0, opacity: 0 }, 0);
            tl.to(c, { opacity: 1, duration: 0.3 }, 0.6 + k * 0.1);
          }
        });
        const bin = D.g(svg, { 'data-bg': '' });
        D.p(bin, 'M1370 620 L1385 760 H1455 L1470 620 Z', 'ln');
        D.p(bin, 'M1360 612 H1480 M1400 612 V600 H1440 V612', 'ln');
        tl.fromTo(bin, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.8);
        const pick = 3;
        P.cards.forEach((c, k) => {
          if (k === pick) return;
          // crumple in place (no flight across the other cards), a paper ball drops in the bin
          tl.to(c, { scale: 0.02, x: `+=${100}`, y: `+=${56}`, rotation: 20, opacity: 0, duration: 0.45, ease: 'power2.in' }, 1.6 + k * 0.3);
          const ball = D.el('circle', { cx: 1420, cy: 560, r: 12, style: 'fill: #e7dccb; stroke: #1a120c', 'stroke-width': 2, opacity: 0, 'data-bg': '' }, svg);
          tl.to(ball, { opacity: 1, duration: 0.05 }, 1.95 + k * 0.3);
          tl.to(ball, { attr: { cy: 650 }, duration: 0.35, ease: 'power2.in' }, 1.95 + k * 0.3);
          tl.to(ball, { opacity: 0, duration: 0.1 }, 2.3 + k * 0.3);
        });
                tl.to(bin, { opacity: 0, duration: 0.3 }, 2.6);
        // the chosen one grows to the full frame: this deck
        tl.to(P.cards[pick], { x: 620, y: 160, scale: 1, duration: 1.0, ease: 'power2.inOut' }, 3.0); // after the others are in the bin
        const st = D.stamp(D.g(svg, { 'data-unit': '' }), 1290, 560, 'VALGT', { size: 40, rotate: -6 });
        tl.add(D.slam(st), 4.1);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
