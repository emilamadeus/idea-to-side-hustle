import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, FILL } from '../engine/props.js';

/*
  Check the idea before building it. A market map in four squares: modern / medieval props,
  static / destructible. Claude fills it with what already exists; the empty square is the
  gap worth building for.
    0. The question, in the chat.
    1. The map fills: plenty of static packs, some destructible modern ones.
    2. Medieval and destructible: nearly empty. That is the one to build.
  The market picture is illustrative.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782
    map        column heads y 180–200; row heads x 580–700; cells x 720–1460, y 220–680
*/

const CELLS = [
  { col: 0, row: 0, n: 14 }, { col: 1, row: 0, n: 12 },
  { col: 0, row: 1, n: 5 }, { col: 1, row: 1, n: 0 },
];
const CX = [720, 1100], CY = [220, 460], CW = 360, CH = 220;

export default {
  id: 'validate',
  title: 'Sjekk ideen først',
  steps: 3,
  notes: [
    'Før jeg bygger noe: finnes det fra før, hva koster det, og hva mangler?',
    'Kartet fylles. Massevis av statiske pakker. Noen som kan knuses, men moderne.',
    'Middelalder som kan knuses: nesten ingenting. Den bygger jeg.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Idé</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Sjekk ideen<br>før du <em>bygger</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };
    const pack = (g, x, y) => {
      const b = D.g(g, { 'data-bg': '' });
      D.el('rect', { x, y, width: 46, height: 36, rx: 3, ...FILL('#8a6a4a', 2) }, b);
      D.p(b, `M${x} ${y + 10} H${x + 46}`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 2 });
      return b;
    };

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, 'Ødeleggbare props til Unreal. Finnes det fra før, hva koster det, og hva mangler?', 0.8);
        // the empty map
        const map = D.g(svg);
        ['Moderne', 'Middelalder'].forEach((h, k) => D.text(map, CX[k] + CW / 2, 196, h, 'ch', { 'text-anchor': 'middle', style: 'font: 700 18px var(--font-mono); letter-spacing: .12em; fill: var(--muted)' }));
        ['Statiske', 'Kan knuses'].forEach((h, k) => D.text(map, 700, CY[k] + CH / 2 + 6, h, 'rh', { 'text-anchor': 'end', style: 'font: 700 18px var(--font-mono); letter-spacing: .06em; fill: var(--muted)' }));
        P.cells = CELLS.map((c) => {
          const cell = D.g(map, { 'data-unit': '' });
          D.el('rect', { x: CX[c.col], y: CY[c.row], width: CW, height: CH, rx: 10, style: 'fill: #1d1510; stroke: #4a3c30', 'stroke-width': 2, 'data-bg': '' }, cell);
          return { ...c, g: cell };
        });
        tl.fromTo(map, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.5);
        P.map = map;
      }

      if (i === 1) {
        // the map fills with what exists
        const t = P.chat.think(tl, 0.1, 1.2);
        P.chat.reply(tl, 'Mange middelalderpakker, men statiske. Noen kan knuses, men de er moderne.', t + 1.6);
        P.cells.forEach((c, k) => {
          for (let n = 0; n < c.n; n++) {
            const x = CX[c.col] + 22 + (n % 6) * 56, y = CY[c.row] + 24 + Math.floor(n / 6) * 52;
            const b = pack(c.g, x, y);
            tl.fromTo(b, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'bounce.out' }, t + 0.1 + k * 0.3 + n * 0.04);
          }
        });
      }

      if (i === 2) {
        // the gap
        const gap = P.cells[3];
        const ring = D.el('rect', { x: CX[1] - 6, y: CY[1] - 6, width: CW + 12, height: CH + 12, rx: 14, style: 'fill: none; stroke: var(--accent-2)', 'stroke-width': 5, opacity: 0, 'data-bg': '' }, svg);
        tl.fromTo(ring, { opacity: 0 }, { opacity: 1, duration: 0.2, repeat: 3, yoyo: true }, 0.2);
        tl.set(ring, { opacity: 1 }, 1.0);
        const label = D.g(svg, { 'data-unit': '' });
        D.text(label, CX[1] + CW / 2, CY[1] + CH / 2 - 4, 'Nesten tomt', 'gl', { 'text-anchor': 'middle', style: 'font: 800 30px var(--font-display); fill: var(--accent-2)' });
        D.text(label, CX[1] + CW / 2, CY[1] + CH / 2 + 30, 'middelalder som kan knuses', 'gs', { 'text-anchor': 'middle', style: 'font: 600 19px var(--font-display); fill: var(--fg)' });
        tl.fromTo(label, { opacity: 0, scale: 0.9, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0.6);
        P.chat.reply(tl, 'Middelalder som kan knuses: nesten ingenting. Prisnivå: midt i markedet.', 0.8);
        P.chat.user(tl, 'Da bygger vi den.', 2.0);
        ctx.focus(tl, [gap.g, ring, label, P.chat.root], 0.2);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
