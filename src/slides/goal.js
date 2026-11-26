import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, FILL } from '../engine/props.js';

/*
  Tip: describe the goal, not the route. A city map and a navigation app.
    1. You dictate every turn (each turn is a technical choice). The car goes round the
       roundabout three times and ends at road works.
    2. Attempt 2, a new session: the first route is cleared. You give only the destination
       (the requirement). The AI takes a road you didn't know about (the route plan already
       has the delivery days).

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat phone x 80–520, y 262–782
    attempt    x 560–900, y 106–140
    map        x 560–1480, y 150–770 (title block x ≥ 1160 only below y 790)
*/

const ROADS_V = [600, 760, 920, 1080, 1240, 1400];
const ROADS_H = [240, 400, 560, 720];
const A = [600, 720], B = [1400, 240];
const ROUTE1 = 'M600 720 V560 H722 a38 38 0 1 1 0.1 0 a38 38 0 1 1 -0.1 0 a38 38 0 1 1 0.1 0 H760 V400 H1240 V318';
const ROUTE2 = 'M600 720 H760 L1240 240 H1400';
const TURNS = [[600, 560], [760, 560], [760, 400], [1240, 400]];
// the firewood subscription: the customer should get a text the day before delivery
const DICTATED = ['1. Hent alle bestillinger hver natt.', '2. Lagre dem i en ny tabell.', '3. Lag en egen cron-jobb for SMS.', '4. Sjekk ruten manuelt.'];

export default {
  id: 'goal',
  title: 'Mål, ikke vei',
  steps: 3,
  notes: [
    'Du skal fra A til B. To måter å be om det på.',
    'Du dikterer hver sving. Rundkjøringen tre ganger. Veiarbeid.',
    'Forsøk 2, ny session. Du sier bare hvor du skal. Den finner en vei du ikke visste om.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Prompting</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Beskriv målet,<br>ikke <em>veien</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    let loops = [];

    function car(g, color) {
      const c = D.g(g);
      D.el('rect', { x: -18, y: -11, width: 36, height: 22, rx: 6, ...FILL(color, 2) }, c);
      D.el('rect', { x: 0, y: -8, width: 12, height: 16, rx: 3, style: 'fill: #1b2330' }, c);
      // a load of logs on the back (seen from above)
      [-8, -2.5, 3].forEach((y) => D.el('rect', { x: -17, y, width: 15, height: 5, rx: 2.5, style: 'fill: #c9935a; stroke: #5a3a22', 'stroke-width': 1 }, c));
      return c;
    }
    // Move a car along a path: progress 0..1, rotate with the road.
    function drive(carEl, pathEl, prog) {
      const L = pathEl.getTotalLength();
      const p = pathEl.getPointAtLength(L * prog), q = pathEl.getPointAtLength(Math.min(L, L * prog + 2));
      const a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      carEl.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${a}) scale(1.6)`);
    }
    function pin(g, [x, y], label, color) {
      const pg = D.g(g, { 'data-unit': '' });
      D.p(pg, `M${x} ${y} c-18 -26 -24 -38 -24 -50 a24 24 0 1 1 48 0 c0 12 -6 24 -24 50 Z`, '', FILL(color));
      D.text(pg, x, y - 44, label, 'pin', { 'text-anchor': 'middle', style: 'font: 800 22px var(--font-display); fill: #1a120c' });
      return pg;
    }

    const reset = () => { loops.forEach((l) => l.kill()); loops = []; svg.innerHTML = ''; P = {}; };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        // the map
        const map = D.g(svg, { 'data-bg': '' });
        D.el('rect', { x: 560, y: 150, width: 920, height: 620, rx: 10, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 2 }, map);
        for (let xi = 0; xi < ROADS_V.length - 1; xi++) for (let yi = 0; yi < ROADS_H.length - 1; yi++) {
          D.el('rect', { x: ROADS_V[xi] + 22, y: ROADS_H[yi] + 22, width: 116, height: 116, rx: 6, style: 'fill: #2a1f17' }, map);
        }
        ROADS_V.forEach((x) => D.p(map, `M${x} 160 V760`, '', { style: 'fill: none; stroke: #4a3c30', 'stroke-width': 30 }));
        ROADS_H.forEach((y) => D.p(map, `M570 ${y} H1470`, '', { style: 'fill: none; stroke: #4a3c30', 'stroke-width': 30 }));
        // river and its normal bridges
        D.p(map, 'M985 150 V770', '', { style: 'fill: none; stroke: #2f5b7a', 'stroke-width': 44 });
        ROADS_H.forEach((y) => { if (y === 400) D.p(map, `M955 ${y} H1015`, '', { style: 'fill: none; stroke: #6b5a48', 'stroke-width': 34 }); });
        // the shortcut nobody told you about (hidden at first)
        P.short = D.p(map, 'M760 720 L1240 240', '', { style: 'fill: none; stroke: #4a3c30', 'stroke-width': 30, opacity: 0.18 });
        P.bridge = D.g(map, { opacity: 0 });
        D.p(P.bridge, 'M950 530 L1020 460', '', { style: 'fill: none; stroke: #8a7660', 'stroke-width': 42 });
        D.p(P.bridge, 'M936 516 L1006 446 M964 544 L1034 474', '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 3 });
        // roundabout
        D.el('circle', { cx: 760, cy: 560, r: 38, style: 'fill: #2a1f17; stroke: #4a3c30', 'stroke-width': 26 }, map);
        tl.fromTo(map, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.3);
        // road works at the end of the dictated route
        const works = D.g(svg, { 'data-unit': '' });
        [[1222, 296], [1258, 296], [1240, 280]].forEach(([x, y]) => D.p(works, `M${x - 10} ${y + 16} L${x} ${y - 12} L${x + 10} ${y + 16} Z`, '', FILL('#ff5a1f', 2)));
        D.el('rect', { x: 1186, y: 230, width: 108, height: 34, rx: 4, ...FILL('#ffd23f', 2.5) }, works);
        D.text(works, 1240, 254, 'STENGT', 'st', { 'text-anchor': 'middle', style: 'font: 800 20px var(--font-mono); fill: #1a120c' });
        P.works = works;
        tl.fromTo(works, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.8);
        P.pinA = pin(svg, A, 'A', '#fff3e3');
        P.pinB = pin(svg, B, 'B', '#ffd23f');
        tl.fromTo([P.pinA, P.pinB], { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.2, ease: 'bounce.out' }, 0.9);
        // your instructions
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 1.0);
        P.card1 = P.chat.user(tl, DICTATED, 1.5);
        P.att = attempt(svg, 560, 106);
        P.att.show(tl, 'FORSØK 1', 1.0);
      }

      if (i === 1) {
        const o = P.chat.think(tl, 0.1, 1.3);
        P.chat.reply(tl, 'Ok. Følger stegene.', o);
        // the dictated route: every turn, the roundabout three times, then road works
        const r1 = D.p(svg, ROUTE1, '', { style: 'fill: none; stroke: #ff7a2f', 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '18 10' });
        const c1 = car(svg, '#ff5a1f');
        const nums = TURNS.map(([x, y], k) => {
          const n = D.g(svg, { 'data-unit': '' });
          D.el('circle', { cx: x + 30, cy: y - 30, r: 20, ...FILL('#fff3e3', 2.5) }, n);
          D.text(n, x + 30, y - 22, String(k + 1), 'n', { 'text-anchor': 'middle', style: 'font: 800 22px var(--font-mono); fill: #1a120c' });
          return n;
        });
        const s = { p: 0 };
        tl.to(s, { p: 1, duration: 5.2, ease: 'power1.inOut', onUpdate: () => drive(c1, r1, s.p) }, o + 0.3);
        drive(c1, r1, 0);
        [0.12, 0.3, 0.62, 0.86].forEach((t, k) => {
          tl.fromTo(nums[k], { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, o + 0.3 + 5.2 * t);
          tl.to(P.card1.rows[k], { attr: { style: 'font: 600 18px var(--font-display); fill: #c4562a' }, duration: 0.1 }, o + 0.3 + 5.2 * t);
        });
        // stuck: shake and honk
        tl.to(c1, { x: '+=3', duration: 0.05, repeat: 7, yoyo: true }, o + 5.6);
        const honk = D.p(svg, 'M1262 340 q10 -8 0 -16 M1274 346 q16 -14 0 -28', 'acc2', { opacity: 0, 'stroke-width': 3 });
        tl.to(honk, { opacity: 1, duration: 0.15, repeat: 5, yoyo: true }, o + 5.6);
        P.first = [r1, c1, honk, ...nums];
        ctx.focus(tl, [...P.first, P.works, P.pinA, P.pinB, P.chat.root, P.att.g], o);
      }

      if (i === 2) {
        // attempt 2 is a new session: the first route goes, the chat starts over
        P.att.show(tl, 'FORSØK 2 · NY SESSION', 0);
        tl.to(P.first, { opacity: 0, duration: 0.4 }, 0);
        tl.to(P.card1.rows, { attr: { style: 'font: 600 18px var(--font-display); fill: #1a120c' }, duration: 0.1 }, 0);
        P.chat.clear(tl, 0);
        P.chat.user(tl, 'Kunden skal få SMS dagen før veden kommer.', 0.4);
        const T = P.chat.think(tl, 1.1, 1.5);
        P.chat.reply(tl, 'Ruteplanen har allerede leveringsdagene. Jeg sender fra den.', T);
        tl.to(P.short, { attr: { style: 'fill: none; stroke: #6b5a48', 'stroke-width': 30 }, opacity: 1, duration: 0.6 }, T);
        tl.to(P.bridge, { opacity: 1, duration: 0.5 }, T);
        const r2 = D.p(svg, ROUTE2, '', { style: 'fill: none; stroke: #8fe3a2', 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': '18 10' });
        tl.add(D.drawOn(r2, { duration: 1.0 }), T + 0.2);
        const c2 = car(svg, '#8fe3a2');
        drive(c2, r2, 0);
        const s = { p: 0 };
        tl.to(s, { p: 1, duration: 1.8, ease: 'power2.inOut', onUpdate: () => drive(c2, r2, s.p) }, T + 0.6);
        tl.to(P.pinB, { y: -14, duration: 0.18, yoyo: true, repeat: 3, ease: 'power2.out' }, T + 2.4);
        ctx.focus(tl, [r2, c2, P.short, P.bridge, P.pinA, P.pinB, P.chat.root, P.att.g], T);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); } };
  },
};
