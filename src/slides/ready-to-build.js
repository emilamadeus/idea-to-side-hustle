import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone } from '../engine/props.js';

/*
  Transition from Plan to Bygg. The plan is a drawing sheet; like a real working drawing it
  gets stamped approved for construction before anyone starts building.
    0. Status sheet: what is decided and ready when planning is done, one line at a time.
    1. Stamped GODKJENT FOR BYGGING. Then the first build prompt: "Start."

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782 (step 1)
    sheet      x 640–1440, y 150–740 (header y 206, rows y 270–590, sheet no. y 700)
    stamp      centred x 1040, y 640 (lower part of the sheet, under the rows)
*/

const SX = 640, SY = 150, SW = 800, SH = 590;
// where the project stands when planning is done
const ROWS = [
  ['PRODUKT', 'Kamera i appen, seks funksjoner'],
  ['OPPGAVER', 'I rekkefølge, roller først'],
  ['AVKLART', 'Alle produktvalg er tatt'],
  ['VENTER PÅ', 'Gateway build 412'],
  ['FERDIG NÅR', 'Varsel innen ett minutt ved offline'],
];

export default {
  id: 'ready-to-build',
  title: 'Klar til å bygge',
  steps: 2,
  notes: [
    'Planen er ferdig. Alt den trenger står på ett ark.',
    'Godkjent for bygging. Nå starter vi.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Bygg</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Fra plan<br>til <em>bygg</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

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
        D.text(sheet, SX + 40, SY + 56, 'KAMERA I APPEN · STATUS', 'sh', { style: 'font: 700 18px var(--font-mono); letter-spacing: .14em; fill: #8a6a4a' });
        D.p(sheet, `M${SX + 40} ${SY + 76} H${SX + SW - 40}`, '', { style: 'fill: none; stroke: #d8c8b2', 'stroke-width': 2, 'data-bg': '' });
        // sheet number, like a title block
        D.el('rect', { x: SX + SW - 200, y: SY + SH - 64, width: 180, height: 44, rx: 2, style: 'fill: none; stroke: #b9a88f', 'stroke-width': 2, 'data-bg': '' }, sheet);
        D.text(sheet, SX + SW - 110, SY + SH - 36, 'ARK P-01', 'sn', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: #8a6a4a' });
        tl.fromTo(sheet, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.3);
        // one line per thing that is ready (or still waiting)
        ROWS.forEach((r, k) => {
          const y = SY + 120 + k * 64;
          const row = D.g(sheet);
          D.text(row, SX + 40, y + 25, r[0], 'rf', { style: 'font: 700 18px var(--font-mono); letter-spacing: .1em; fill: #8a6a4a' });
          D.text(row, SX + 250, y + 26, r[1], 'rt', { style: 'font: 700 28px var(--font-display); fill: #1a120c' });
          tl.fromTo(row, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.7 + k * 0.35);
        });
        P.sheet = sheet;
      }

      if (i === 1) {
        // approved for construction, then the first build prompt
        const st = D.stamp(D.g(svg, { 'data-unit': '' }), SX + SW / 2 - 60, SY + 490, 'GODKJENT FOR BYGGING', { size: 30, rotate: -6 });
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
        P.chat.reply(tl, 'Leste spec, plan og instruksjonsfiler. Begynner på første oppgave: roller.', t);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
