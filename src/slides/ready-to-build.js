import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone } from '../engine/props.js';

/*
  Transition from Plan to Bygg. The plan is a drawing sheet; like a real working drawing it
  gets stamped approved for construction before anyone starts building.
    0. The finished plan: six tasks in build order, all planned.
    1. Stamped GODKJENT FOR BYGGING. "Start." and the first task, Datamodell, is under way.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782 (step 1)
    sheet      x 640–1440, y 150–740 (header y 206, rows y 270–590, sheet no. y 700)
    stamp      centred x 1040, y 640 (lower part of the sheet, under the rows)
*/

const SX = 640, SY = 150, SW = 800, SH = 590;
// a generic product plan, in build order
const ROWS = ['Datamodell', 'Innlogging', 'Kjernefunksjon', 'Betaling', 'Varsler', 'Lansering'];

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
        // the plan: six tasks in build order
        P.rows = ROWS.map((r, k) => {
          const y = SY + 110 + k * 56;
          const row = D.g(sheet);
          D.text(row, SX + 40, y + 26, String(k + 1).padStart(2, '0'), 'rn', { style: 'font: 700 20px var(--font-mono); fill: #8a6a4a' });
          D.text(row, SX + 100, y + 27, r, 'rt', { style: 'font: 800 28px var(--font-display); fill: #1a120c' });
          const st = D.text(row, SX + SW - 40, y + 26, 'PLANLAGT', 'rs', { 'text-anchor': 'end', style: 'font: 700 16px var(--font-mono); letter-spacing: .12em; fill: #8a6a4a' });
          tl.fromTo(row, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.7 + k * 0.15);
          return { row, st, y };
        });
        P.sheet = sheet;
      }

      if (i === 1) {
        // approved for construction, then the first build prompt
        const st = D.stamp(D.g(svg, { 'data-unit': '' }), SX + SW / 2 - 60, SY + 505, 'GODKJENT FOR BYGGING', { size: 30, rotate: -6 });
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
        P.chat.reply(tl, 'Begynner på første oppgave: datamodellen.', t);
        // the first task starts
        const r0 = P.rows[0];
        const bar = D.el('rect', { x: SX + 24, y: r0.y - 4, width: SW - 48, height: 44, rx: 6, style: 'fill: none; stroke: var(--accent)', 'stroke-width': 3, 'data-bg': '' }, r0.row);
        tl.fromTo(bar, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 0.3);
        tl.to(r0.st, { opacity: 0, duration: 0.15 }, t + 0.3);
        tl.call(() => { r0.st.textContent = 'I GANG'; r0.st.style.fill = 'var(--accent)'; }, null, t + 0.45);
        tl.to(r0.st, { opacity: 1, duration: 0.2 }, t + 0.45);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
