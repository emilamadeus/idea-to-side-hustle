import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, LOOK } from '../engine/characters.js';
import { attempt, FILL } from '../engine/props.js';

/*
  Tip: let it notify you, and reach it from anywhere.
  A production line that runs on your laptop; you are at a café.
    0. Attempt 1, no notifications: the line reaches a gate, red lamp, and waits. You sit at
       the café, unaware. Cups pile up, night falls outside, dust settles on the line.
    1. Attempt 2, notifications: your phone buzzes on the café table. "Ja." The gate opens.
    2. You close the laptop. The line lifts into a cloud and keeps going. "Ferdig."

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    attempt    x 560–960, y 120–154
    café       x 80–540, y 250–770 (notification card y 250–410, you, table, cups, phone)
    line       x 600–1480, belt y 600; gate x 1180; laptop x 610–720; cloud y 180–420
*/

const BELT = 600, GATE = 1180;

export default {
  id: 'remote',
  title: 'Varsler og fjernstyring',
  steps: 3,
  notes: [
    'Uten varsler: linja venter på en beslutning. Du er på kafé.',
    'Med varsler: telefonen surrer, du svarer ja, linja går.',
    'Lukk laptopen. Den fortsetter i skyen.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Fjernstyring</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Få beskjed når den<br><em>trenger deg</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    let loops = [];

    const reset = () => { loops.forEach((l) => l.kill()); loops = []; svg.innerHTML = ''; P = {}; };

    function line(g) {
      const l = D.g(g);
      const belt = D.g(l, { 'data-bg': '' });
      D.el('rect', { x: 760, y: BELT, width: 700, height: 22, rx: 11, ...FILL('#4b4f57', 2.5) }, belt);
      for (let x = 780; x < 1460; x += 40) D.el('circle', { cx: x, cy: BELT + 11, r: 6, style: 'fill: #8b8f96' }, belt);
      D.p(belt, `M780 ${BELT + 22} V700 M1440 ${BELT + 22} V700`, 'ln');
      // the build machine: work comes out of it
      const mach = D.g(l, { 'data-bg': '' });
      D.el('rect', { x: 850, y: 430, width: 190, height: 170, rx: 8, ...FILL('#3c4a5c', 2.5) }, mach);
      D.el('rect', { x: 1000, y: 540, width: 46, height: 60, ...FILL('#2a2d33', 2) }, mach);
      D.el('rect', { x: 872, y: 452, width: 110, height: 60, rx: 4, style: 'fill: #0f0a07; stroke: var(--fg)', 'stroke-width': 2 }, mach);
      D.p(mach, 'M884 492 l14 -14 l14 10 l16 -22 l14 12 l18 -6', '', { style: 'fill: none; stroke: #8fe3a2', 'stroke-width': 3 });
      [0, 1, 2].forEach((k) => D.el('circle', { cx: 880 + k * 26, cy: 560, r: 7, style: `fill: ${['#ff5a1f', '#ffd23f', '#8fe3a2'][k]}` }, mach));
      // gate with a lamp
      const gate = D.g(l, { 'data-bg': '' });
      D.p(gate, `M${GATE - 50} ${BELT} V${BELT - 150} H${GATE + 50} V${BELT}`, '', { style: 'fill: none; stroke: var(--fg)', 'stroke-width': 5 });
      const bar = D.el('rect', { x: GATE - 6, y: BELT - 140, width: 12, height: 140, style: 'fill: #ffd23f; stroke: #1a120c', 'stroke-width': 2 }, gate);
      const lamp = D.el('circle', { cx: GATE, cy: BELT - 175, r: 18, style: 'fill: #ff3b2f; stroke: #1a120c', 'stroke-width': 2.5 }, gate);
      // laptop driving it
      const lap = D.g(l, { 'data-bg': '' });
      D.el('rect', { x: 610, y: BELT - 6, width: 130, height: 14, rx: 3, ...FILL('#8b8f96', 2) }, lap);
      const lid = D.el('rect', { x: 618, y: BELT - 96, width: 114, height: 90, rx: 6, ...FILL('#2a2d33', 2.5) }, lap);
      D.p(lap, `M740 ${BELT} Q 752 ${BELT + 40} 770 ${BELT + 12}`, '', { style: 'fill: none; stroke: var(--fg)', 'stroke-width': 3 });
      return { l, bar, lamp, lid, lap };
    }
    const box = (g) => {
      const b = D.g(g, { 'data-bg': '' });
      D.el('rect', { x: -26, y: -46, width: 52, height: 46, rx: 3, ...FILL('#c98f5a', 2) }, b);
      D.p(b, 'M-26 -30 H26 M0 -46 V-30', '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 2 });
      return b;
    };
    function cafe(g) {
      const c = D.g(g);
      const bg = D.g(c, { 'data-bg': '' });
      // café window behind you
      const glass = D.el('rect', { x: 96, y: 300, width: 440, height: 250, rx: 6, style: 'fill: #5d7d9a; stroke: #1a120c', 'stroke-width': 3 }, bg);
      const moon = D.el('circle', { cx: 470, cy: 350, r: 18, style: 'fill: #fff3e3', opacity: 0 }, bg);
      D.p(bg, 'M316 300 V550 M96 425 H536', '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 3 });
      D.p(bg, 'M110 300 h412 l-22 -36 h-368 Z', '', FILL('#c4562a', 2.5));
      D.p(bg, 'M140 300 l-6 -36 M190 300 l-4 -36 M240 300 l-2 -36 M290 300 v-36 M340 300 v-36 M390 300 l2 -36 M440 300 l4 -36 M490 300 l6 -36', '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 3 });
      D.el('rect', { x: 160, y: 600, width: 330, height: 16, rx: 4, ...FILL('#6b4a30', 2.5) }, bg);
      D.p(bg, 'M325 616 V760 M265 760 H385', 'ln');
      const you = figure(c, { x: 220, y: 508, s: 0.9, pose: 'sit', arms: 'table', ...LOOK.me, mouth: 'smile' });
      // a cup
      const cup = (x) => {
        const k = D.g(c, { 'data-bg': '' });
        D.p(k, `M${x} 600 l4 -34 h32 l4 34 Z`, '', FILL('#fff3e3', 2));
        D.p(k, `M${x + 38} 576 q14 2 2 16`, '', { style: 'fill: none; stroke: var(--fg)', 'stroke-width': 2.5 });
        return k;
      };
      const phone = D.g(c, { 'data-bg': '' });
      D.el('rect', { x: 400, y: 588, width: 62, height: 12, rx: 3, ...FILL('#1a120c', 2) }, phone);
      const screen = D.el('rect', { x: 404, y: 590, width: 54, height: 8, rx: 2, style: 'fill: #2a2d33' }, phone);
      return { c, you, cup, phone, screen, glass, moon };
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'FORSØK 1 · UTEN VARSLER', 0.3);
        P.L = line(svg);
        P.C = cafe(svg);
        tl.fromTo([P.L.l, P.C.c], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3);
        P.C.cup(330);
        // boxes roll to the gate and stop
        P.boxes = [0, 1, 2].map((k) => {
          const b = box(svg);
          gsap.set(b, { x: 1050, y: BELT });
          tl.to(b, { x: GATE - 80 - k * 60, duration: 1.4 + k * 0.4, ease: 'power1.out' }, 0.8 + k * 0.5);
          return b;
        });
        const sign = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: GATE - 130, y: BELT - 262, width: 260, height: 40, rx: 6, style: 'fill: #1a120c; stroke: #ff3b2f', 'stroke-width': 2.5 }, sign);
        D.text(sign, GATE, BELT - 236, 'VENTER PÅ BESLUTNING', 'ws', { 'text-anchor': 'middle', style: 'font: 700 16px var(--font-mono); fill: #ff3b2f' });
        tl.fromTo(sign, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.6);
        P.sign = sign;
        // the café afternoon: more coffee, dust on the line, chairs up
        P.cups = [];
        [270, 220, 170].forEach((x, k) => {
          const c = P.C.cup(x);
          P.cups.push(c);
          tl.fromTo(c, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3 }, 3.4 + k * 0.6);
        });
        const dust = D.g(svg, { 'data-bg': '' });
        for (let k = 0; k < 14; k++) D.el('circle', { cx: 1000 + (k * 53) % 180, cy: BELT - 50 - (k * 17) % 10, r: 3, style: 'fill: #9b8f83' }, dust);
        D.p(dust, `M${GATE - 50} ${BELT - 150} q 30 30 60 0 M${GATE - 40} ${BELT - 150} l 20 22 M${GATE - 50} ${BELT - 128} l 30 -4`, '', { style: 'fill: none; stroke: #cfc3b2', 'stroke-width': 2 });
        tl.fromTo(dust, { opacity: 0 }, { opacity: 0.9, duration: 1.2 }, 4.0);
        // day turns to night outside the café window
        tl.to(P.C.glass, { attr: { style: 'fill: #121a2a; stroke: #1a120c' }, duration: 2.4, ease: 'none' }, 3.4);
        tl.to(P.C.moon, { opacity: 1, duration: 0.6 }, 5.4);
        P.C.you.expr(tl, { mouth: 'smile', eyes: 'closed' }, 5.0);
        P.extra = [dust, ...P.cups];
      }

      if (i === 1) {
        // attempt 2: the phone buzzes; you answer; the gate opens
        P.att.show(tl, 'FORSØK 2 · MED VARSLER', 0);
        tl.to(P.extra, { opacity: 0, duration: 0.4 }, 0);
        tl.to(P.C.glass, { attr: { style: 'fill: #5d7d9a; stroke: #1a120c' }, duration: 0.4 }, 0);
        tl.to(P.C.moon, { opacity: 0, duration: 0.3 }, 0);
        P.C.you.expr(tl, { eyes: 'open', mouth: 'neutral' }, 0.4);
        tl.to(P.C.screen, { attr: { style: 'fill: #ffd23f' }, duration: 0.1 }, 0.8);
        tl.to(P.C.phone, { x: 3, duration: 0.05, repeat: 9, yoyo: true }, 0.8);
        // the notification, enlarged
        const note = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 100, y: 250, width: 420, height: 160, rx: 22, style: 'fill: #0f0a07; stroke: var(--fg)', 'stroke-width': 3 }, note);
        D.text(note, 126, 290, 'CLAUDE', 'nl', { style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--accent)' });
        D.text(note, 126, 324, 'Trenger beslutning:', 'n1', { style: 'font: 600 21px var(--font-display); fill: var(--fg)' });
        D.text(note, 126, 352, 'publisere til test nå?', 'n2', { style: 'font: 600 21px var(--font-display); fill: var(--fg)' });
        const yes = D.g(note);
        D.el('rect', { x: 400, y: 360, width: 96, height: 36, rx: 18, style: 'fill: #8fe3a2' }, yes);
        D.text(yes, 448, 384, 'Ja', 'ny', { 'text-anchor': 'middle', style: 'font: 700 18px var(--font-mono); fill: #1a120c' });
        const zoom = D.p(svg, 'M432 588 L410 410', 'dash', { opacity: 0.6, 'data-bg': '' });
        tl.fromTo([note, zoom], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.0);
        P.C.you.expr(tl, { eyes: 'down' }, 1.0);
        tl.to(yes, { scale: 0.9, transformOrigin: '50% 50%', duration: 0.1, yoyo: true, repeat: 1 }, 2.0);
        tl.to([note, zoom], { opacity: 0, duration: 0.3 }, 2.6);
        tl.to(P.sign, { opacity: 0, duration: 0.3 }, 2.4);
        tl.to(P.L.lamp, { attr: { style: 'fill: #8fe3a2; stroke: #1a120c' }, duration: 0.2 }, 2.3);
        tl.to(P.L.bar, { scaleY: 0, transformOrigin: '50% 0%', duration: 0.4 }, 2.4);
        P.boxes.forEach((b, k) => tl.to(b, { x: 1500, duration: 1.4, ease: 'power1.in' }, 2.6 + k * 0.25));
        tl.to(P.boxes, { opacity: 0, duration: 0.2 }, 4.2);
        P.C.you.expr(tl, { eyes: 'open', mouth: 'smile' }, 2.6);
        ctx.focus(tl, [P.C.c, note, zoom, P.L.l, ...P.boxes, P.att.g], 0.4);
      }

      if (i === 2) {
        // close the laptop: the line goes to the cloud and keeps going
        tl.to(P.L.lid, { scaleY: 0.08, transformOrigin: '50% 100%', duration: 0.3, ease: 'power2.in' }, 0.2);
        const cloud = D.g(svg, { 'data-bg': '' });
        D.p(cloud, 'M760 400 C700 400 700 320 770 320 C770 250 870 240 900 290 C930 200 1060 210 1070 290 C1120 230 1260 250 1240 320 C1340 320 1340 400 1260 400 Z', '', { style: 'fill: #241a13; stroke: var(--fg)', 'stroke-width': 3 });
        tl.fromTo(cloud, { opacity: 0, scale: 0.6, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 0.6);
        // the line leaves the floor and runs up there
        const moving = [P.L.l.children[0], P.L.l.children[1], P.L.l.children[2]]; // belt, machine and gate go up together
        tl.to(moving, { y: -40, opacity: 0, duration: 0.6, ease: 'power2.in' }, 0.9);
        const up = D.g(svg, { 'data-bg': '' });
        D.el('rect', { x: 820, y: 372, width: 400, height: 14, rx: 7, ...FILL('#4b4f57', 2) }, up);
        for (let x = 834; x < 1210; x += 28) D.el('circle', { cx: x, cy: 379, r: 4, style: 'fill: #8b8f96' }, up);
        tl.fromTo(up, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.3);
        const bs = [0, 1, 2, 3].map(() => { const b = box(svg); gsap.set(b, { x: 850, y: 372, scale: 0.62, opacity: 0 }); return b; });
        bs.forEach((b, k) => {
          tl.to(b, { opacity: 1, duration: 0.1 }, 2.0 + k * 0.5);
          tl.to(b, { x: 1190, duration: 1.4, ease: 'none' }, 2.0 + k * 0.5);
          tl.to(b, { opacity: 0, duration: 0.2 }, 3.3 + k * 0.5);
        });
        tl.to(P.C.screen, { attr: { style: 'fill: #8fe3a2' }, duration: 0.1 }, 4.4);
        tl.to(P.C.phone, { x: 3, duration: 0.05, repeat: 7, yoyo: true }, 4.4);
        const done = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 100, y: 250, width: 420, height: 100, rx: 22, style: 'fill: #0f0a07; stroke: var(--fg)', 'stroke-width': 3 }, done);
        D.text(done, 126, 290, 'CLAUDE · SKY', 'nl', { style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--accent)' });
        D.text(done, 126, 326, 'Ferdig. Alt publisert til test.', 'n1', { style: 'font: 600 21px var(--font-display); fill: var(--fg)' });
        tl.fromTo(done, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, 4.6);
        ctx.focus(tl, [cloud, up, ...bs, P.L.lap, P.C.phone, done], 0.2);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
