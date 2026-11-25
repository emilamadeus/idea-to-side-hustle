import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, LOOK } from '../engine/characters.js';
import { speech, attempt, FILL } from '../engine/props.js';

/*
  Tip: let the AI check its own work. Ping-pong.
    0. Attempt 1: you check every return. "Ferdig!" → "Nei." four times; the clock runs,
       you wilt, the AI gets more cheerful.
    1. Attempt 2: half the table folds up into a wall. The AI rallies against it on its own
       (skjermbilde, test, fiks). The ball comes to you once. "Ja."

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    attempt    x 560–900, y 120–154
    bubbles    you x 80–440, y 300–354 · AI x 1060–1480, y 300–354
    clock      centre (860, 300), r 40
    table      x 420–1300, top y 600; you x 300, AI x 1400 (necks y 470)
*/

const YOU = 300, AI = 1400, NECK = 470, TOP = 600, NET = 860;
const PAD_YOU = [390, 560], PAD_AI = [1310, 560];
const RALLY = [
  ['Ferdig!', 'Nei, knappen er borte.'],
  ['Ferdig! Knappen er tilbake.', 'Nå er teksten borte.'],
  ['Ferdig! Alt virker.', 'Nei.'],
  ['Ferdig! Nå virker alt!', '…'],
];

export default {
  id: 'self-check',
  title: 'Sjekk selv',
  steps: 2,
  notes: [
    'Uten: hver ball kommer til deg. Ferdig, nei, ferdig, nei.',
    'Med: den spiller mot sin egen vegg. Skjermbilde, test, fiks. Du får ballen én gang.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Verifisering</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">La AI-en sjekke<br><em>sitt eget arbeid</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    function table(g) {
      const t = D.g(g, { 'data-bg': '' });
      D.el('rect', { x: 420, y: TOP, width: 880, height: 20, rx: 3, ...FILL('#2f5b5a', 2.5) }, t);
      D.p(t, `M440 ${TOP + 20} V760 M1280 ${TOP + 20} V760`, 'ln');
      D.p(t, `M420 ${TOP + 2} H1300`, '', { style: 'fill: none; stroke: #e7dccb', 'stroke-width': 2 });
      return t;
    }
    function clock(g) {
      const c = D.g(g, { 'data-bg': '' });
      D.el('circle', { cx: NET, cy: 300, r: 40, ...FILL('#fff3e3', 3) }, c);
      const hand = D.p(c, `M${NET} 300 L${NET} 268`, '', { style: 'fill: none; stroke: #ff5a1f', 'stroke-width': 4, 'stroke-linecap': 'round' });
      D.el('circle', { cx: NET, cy: 300, r: 4, style: 'fill: #1a120c' }, c);
      return { g: c, hand };
    }
    const paddle = (g, [x, y], color) => {
      const p = D.g(g, { 'data-bg': '' });
      D.p(p, `M${x} ${y + 14} L${x} ${y + 40}`, '', { style: 'fill: none; stroke: #6b4a30', 'stroke-width': 7, 'stroke-linecap': 'round' });
      D.el('ellipse', { cx: x, cy: y, rx: 18, ry: 22, ...FILL(color, 2) }, p);
      return p;
    };
    // ball flies on an arc from a to b
    const hit = (tl, ball, a, b, at, d = 0.7, peak = 430) => {
      const s = { t: 0 };
      tl.to(s, {
        t: 1, duration: d, ease: 'none',
        onUpdate: () => {
          const x = a[0] + (b[0] - a[0]) * s.t;
          const y = a[1] + (b[1] - a[1]) * s.t - 4 * (Math.min(a[1], b[1]) - peak) * s.t * (1 - s.t);
          ball.setAttribute('cx', x); ball.setAttribute('cy', y);
        },
      }, at);
    };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'FORSØK 1 · DU SJEKKER', 0.3);
        P.scene = D.g(svg);
        P.table = table(P.scene);
        P.clock = clock(P.scene);
        P.you = figure(P.scene, { x: YOU, y: NECK, s: 0.72, pose: 'stand', arms: 'open', ...LOOK.me });
        P.ai = figure(P.scene, { x: AI, y: NECK, s: 0.72, pose: 'stand', arms: 'open', flip: true, ...LOOK.claude, mouth: 'smile' });
        paddle(P.scene, PAD_YOU, '#c4405e'); paddle(P.scene, PAD_AI, '#c4405e');
        P.ball = D.el('circle', { cx: PAD_AI[0], cy: PAD_AI[1], r: 10, style: 'fill: #fff3e3; stroke: #1a120c', 'stroke-width': 2, 'data-bg': '' }, P.scene);
        tl.fromTo(P.scene, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.2);
        // every return comes to you
        let t = 0.9;
        RALLY.forEach(([ai, you], k) => {
          const a = speech(P.scene, 1480 - (ai.length * 20 * 0.59 + 40), 300, ai, [AI - 20, NECK - 90], { size: 20 });
          tl.fromTo(a, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t);
          hit(tl, P.ball, PAD_AI, PAD_YOU, t + 0.2);
          tl.to(a, { opacity: 0, duration: 0.2 }, t + 1.2);
          const y = speech(P.scene, 80, 300, you, [YOU + 10, NECK - 90], { size: 20 });
          tl.fromTo(y, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t + 1.0);
          hit(tl, P.ball, PAD_YOU, PAD_AI, t + 1.0);
          tl.to(y, { opacity: 0, duration: 0.2 }, t + 2.0);
          tl.to(P.clock.hand, { rotation: `+=${150}`, svgOrigin: `${NET} 300`, duration: 1.8, ease: 'none' }, t);
          P.you.expr(tl, [{ mouth: 'neutral' }, { brows: 'tired' }, { brows: 'annoyed', mouth: 'frown' }, { eyes: 'closed', brows: 'tired', mouth: 'frown' }][k], t + 1.0);
          t += 2.1;
        });
        // the last one: you don't even swing
        tl.to(P.you.root, { rotation: 6, svgOrigin: `${YOU} ${NECK + 180}`, duration: 0.6 }, t - 0.6);
        P.ai.expr(tl, { mouth: 'grin' }, t - 1.2);
      }

      if (i === 1) {
        // attempt 2: clear the table; the AI rallies against its own wall
        P.att.show(tl, 'FORSØK 2 · DEN SJEKKER SELV', 0);
        tl.to(P.scene, { opacity: 0, duration: 0.4 }, 0);
        const sc = D.g(svg);
        table(sc);
        const ck = clock(sc);
        const you = figure(sc, { x: YOU, y: NECK, s: 0.72, pose: 'stand', arms: 'phoneLow', ...LOOK.me, mouth: 'smile' });
        const ai = figure(sc, { x: AI, y: NECK, s: 0.72, pose: 'stand', arms: 'open', flip: true, ...LOOK.claude });
        paddle(sc, PAD_AI, '#c4405e');
        // the wall: AI's own checks
        const wall = D.g(sc, { 'data-unit': '' });
        D.el('rect', { x: 980, y: 400, width: 22, height: 200, rx: 3, ...FILL('#2f5b5a', 2.5) }, wall);
        const ball = D.el('circle', { cx: PAD_AI[0], cy: PAD_AI[1], r: 10, style: 'fill: #fff3e3; stroke: #1a120c', 'stroke-width': 2, 'data-bg': '' }, sc);
        tl.fromTo(sc, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.4);
        const tags = ['skjermbilde', 'test', 'fiks', 'skjermbilde', 'test', 'fiks', 'skjermbilde', 'test'];
        const tag = D.text(sc, 1150, 380, '', 'tg', { 'text-anchor': 'middle', style: 'font: 700 22px var(--font-mono); fill: #8fe3a2' });
        let t = 1.0;
        tags.forEach((w, k) => {
          const d = Math.max(0.16, 0.34 - k * 0.025);
          hit(tl, ball, PAD_AI, [1004, 520], t, d, 470);
          tl.call(() => { tag.textContent = w; }, null, t + d);
          hit(tl, ball, [1004, 520], PAD_AI, t + d, d, 470);
          t += d * 2;
        });
        tl.call(() => { tag.textContent = ''; }, null, t);
        tl.to(ck.hand, { rotation: 20, svgOrigin: `${NET} 300`, duration: t - 1, ease: 'none' }, 1.0);
        // the wall folds down; one ball to you
        tl.to(wall, { opacity: 0, duration: 0.3 }, t + 0.1);
        const msg = speech(sc, 1480 - ('Ferdig. Testet og sjekket.'.length * 20 * 0.59 + 40), 300, 'Ferdig. Testet og sjekket.', [AI - 20, NECK - 90], { size: 20 });
        tl.fromTo(msg, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t + 0.3);
        hit(tl, ball, PAD_AI, [PAD_YOU[0] + 30, TOP - 10], t + 0.4, 0.9);
        you.expr(tl, { eyes: 'down' }, t + 1.2);
        const yes = speech(sc, 80, 300, 'Ja.', [YOU + 10, NECK - 90], { size: 20 });
        tl.fromTo(yes, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t + 1.6);
        ai.expr(tl, { mouth: 'smile' }, t + 1.8);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
