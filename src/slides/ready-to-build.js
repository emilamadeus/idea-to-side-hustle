import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, FILL } from '../engine/props.js';
import { relayState } from '../engine/relay.js';

/*
  Transition from Plan to Bygg. Everything Idé and Plan produced, collected on one drawing
  sheet; like a real working drawing it gets stamped approved for construction before anyone
  starts building.
    0. The sheet fills: one row per result, each with its own small drawing and the real value
       (the customer from validate, the room's price, the spec, the instruction files, the
       build order from planning), each ticked. The build order is drawn at the bottom.
    1. Stamped GODKJENT FOR BYGGING. Then the first build prompt: "Start."

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782 (step 1)
    sheet      x 640–1440, y 150–740 (header y 206, rows y 236–520, build order y 556–600, sheet no. y 700)
    stamp      centred x 980, y 655 (lower part of the sheet, beside the sheet number)
*/

const SX = 640, SY = 150, SW = 800, SH = 590;
// what is in place when planning is done: label, value (a function, for the room's price), icon
const ROWS = [
  ['IDÉ', () => 'Ved på døra, som abonnement', 'house'],
  ['KUNDE', () => 'By, peis, uten bil', 'person'],
  ['PRIS', () => `${relayState.price || 129} kr per sekk`, 'tag'],
  ['SPEC', () => 'vedabonnement/spec.html', 'doc'],
  ['INSTRUKSJONER', () => 'AGENTS.md + 7 filer', 'drawers'],
];
const ORDER = [['Bydeler', '#7e2f45'], ['Kunder', '#55603a'], ['Abonnement', '#2f5b5a'], ['Pause', '#3c4a5c'], ['Bestilling', '#c4562a'], ['Varsler', '#9a4a22']];
const INK = '#1a120c';

export default {
  id: 'ready-to-build',
  title: 'Klar til å bygge',
  steps: 2,
  notes: [
    'Planen er ferdig.',
    'Godkjent. Første oppgave starter.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Bygg</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Fra plan<br>til <em>bygg</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    // small working-drawing icons, ink on paper
    const drawIcon = (g, kind, x, y) => {
      const ln = { style: `fill: none; stroke: ${INK}; stroke-linejoin: round; stroke-linecap: round`, 'stroke-width': 2.5 };
      if (kind === 'house') { D.p(g, `M${x - 16} ${y + 14} V${y - 2} L${x} ${y - 16} L${x + 16} ${y - 2} V${y + 14} Z`, '', { ...FILL('#ffb25e', 2.5) }); D.el('rect', { x: x - 5, y: y + 2, width: 10, height: 12, ...FILL('#7a4a2a', 2) }, g); }
      if (kind === 'person') { D.el('circle', { cx: x, cy: y - 8, r: 7, ...FILL('#ffd23f', 2.5) }, g); D.p(g, `M${x - 13} ${y + 15} C${x - 13} ${y + 2} ${x + 13} ${y + 2} ${x + 13} ${y + 15} Z`, '', { ...FILL('#7fd0ff', 2.5) }); }
      if (kind === 'tag') { D.p(g, `M${x - 15} ${y - 10} H${x + 6} L${x + 16} ${y} L${x + 6} ${y + 10} H${x - 15} Z`, '', { ...FILL('#ff7a2f', 2.5) }); D.el('circle', { cx: x + 5, cy: y, r: 2.5, style: `fill: ${INK}` }, g); }
      if (kind === 'doc') { D.p(g, `M${x - 12} ${y - 16} H${x + 5} L${x + 12} ${y - 9} V${y + 16} H${x - 12} Z`, '', { ...FILL('#fff8ee', 2.5) }); [-4, 2, 8].forEach((d) => D.p(g, `M${x - 6} ${y + d} H${x + 6}`, '', ln)); }
      if (kind === 'drawers') { D.el('rect', { x: x - 15, y: y - 16, width: 30, height: 32, rx: 2, ...FILL('#b07a4a', 2.5) }, g); [-5, 5].forEach((d) => D.p(g, `M${x - 15} ${y + d} H${x + 15}`, '', ln)); [-10, 0, 10].forEach((d) => D.p(g, `M${x - 3} ${y + d} H${x + 3}`, '', ln)); }
    };

    const reset = () => { svg.innerHTML = ''; P = {}; };

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        // the plan, as a drawing sheet
        const sheet = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: SX, y: SY, width: SW, height: SH, rx: 4, style: 'fill: #fff3e3; stroke: #1a120c', 'stroke-width': 3, 'data-bg': '' }, sheet);
        D.text(sheet, SX + 40, SY + 56, 'PRODUKTET · PLAN', 'sh', { style: 'font: 700 18px var(--font-mono); letter-spacing: .14em; fill: #8a6a4a' });
        D.p(sheet, `M${SX + 40} ${SY + 76} H${SX + SW - 40}`, '', { style: 'fill: none; stroke: #d8c8b2', 'stroke-width': 2, 'data-bg': '' });
        // sheet number, like a title block
        D.el('rect', { x: SX + SW - 200, y: SY + SH - 64, width: 180, height: 44, rx: 2, style: 'fill: none; stroke: #b9a88f', 'stroke-width': 2, 'data-bg': '' }, sheet);
        D.text(sheet, SX + SW - 110, SY + SH - 36, 'ARK P-01', 'sn', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: #8a6a4a' });
        tl.fromTo(sheet, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.3);
        // one row per result: a small drawing, the label, the real value, a tick
        ROWS.forEach(([label, value, icon], k) => {
          const y = SY + 92 + k * 58;
          const row = D.g(sheet);
          drawIcon(row, icon, SX + 64, y + 24);
          D.text(row, SX + 108, y + 13, label, 'rl', { style: 'font: 700 13px var(--font-mono); letter-spacing: .14em; fill: #8a6a4a' });
          D.text(row, SX + 108, y + 47, value(), 'rv', { style: `font: 800 ${value().length > 24 ? 22 : 25}px var(--font-display); fill: ${INK}` });
          D.p(row, `M${SX + 40} ${y + 56} H${SX + SW - 40}`, '', { style: 'fill: none; stroke: #e6d8c4', 'stroke-width': 2, 'data-bg': '' });
          D.el('circle', { cx: SX + SW - 70, cy: y + 26, r: 15, style: 'fill: none; stroke: #2f8a4a', 'stroke-width': 2.5 }, row);
          const tick = D.p(row, `M${SX + SW - 78} ${y + 26} l6 7 l11 -13`, '', { style: 'fill: none; stroke: #2f8a4a', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
          tl.fromTo(row, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35 }, 0.7 + k * 0.15);
          tl.add(D.drawOn(tick, { duration: 0.25 }), 1.6 + k * 0.3);
        });
        // the build order from planning, drawn as blocks in a row
        const order = D.g(sheet);
        D.text(order, SX + 40, SY + 404, 'BYGGEREKKEFØLGE', 'bo', { style: 'font: 700 13px var(--font-mono); letter-spacing: .14em; fill: #8a6a4a' });
        const BW = 104, GAPX = 18;
        ORDER.forEach(([n, c], k) => {
          const x = SX + 40 + k * (BW + GAPX), y = SY + 418;
          const b = D.g(order);
          D.el('rect', { x, y, width: BW, height: 40, rx: 4, ...FILL(c, 2.5) }, b);
          D.text(b, x + BW / 2, y + 26, n, 'bn', { 'text-anchor': 'middle', style: 'font: 700 14px var(--font-display); fill: #fff3e3' });
          if (k) D.p(order, `M${x - GAPX + 4} ${y + 20} H${x - 4}`, '', { style: `fill: none; stroke: ${INK}`, 'stroke-width': 2.5, 'data-bg': '' });
          tl.fromTo(b, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }, 3.2 + k * 0.1);
        });
        P.sheet = sheet;
      }

      if (i === 1) {
        // approved for construction, then the first build prompt
        const st = D.stamp(D.g(svg, { 'data-unit': '' }), SX + SW / 2 - 70, SY + 512, 'GODKJENT FOR BYGGING', { size: 30, rotate: -6 });
        // long text: fit the box to the measured text
        try {
          const bb = st.querySelector('text').getBBox(), box = st.querySelector('rect');
          if (bb.width) { box.setAttribute('x', -bb.width / 2 - 22); box.setAttribute('width', bb.width + 44); }
        } catch { /* not rendered yet: keep the default box */ }
        tl.add(D.slam(st.parentNode), 0.2);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 1.0);
        P.chat.user(tl, 'Start.', 1.5);
        const t = P.chat.think(tl, 1.9, 1.0);
        P.chat.reply(tl, 'Leste spec og instruksjonsfiler. Begynner på Bydeler.', t);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
