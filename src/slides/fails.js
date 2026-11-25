import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, tokenMeter, FILL } from '../engine/props.js';

/*
  Where it fails: confident wrong answers, and patching symptoms instead of the cause.
  Illustrative story: the living-room lamp shows off in the 3D app while it is on.
    0. The bug: the real house (left half) vs the app (right half).
    1. Patch 1: poll every second. Still off. FIKSET!
    2. Patch 2: reload the whole model. Still off. FIKSET! (bigger)
    3. Patch 3: invert the state in the UI. Living room right, kitchen now wrong. FIKSET!!
    4. New session, asked for the cause: two device IDs swapped in the mapping. One line.
       The stamps fall off; both rooms match.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782
    attempt    x 560–1000, y 120–154
    house      x 600–1020, y 190–520 (real)     app x 1060–1480, y 190–520 (model)
    stamps     x 1080–1460, y 560–760 (a deliberate pile) · mapping table x 600–1480, y 560–760 (step 4)
*/

const ROOMS = [{ key: 'stue', label: 'Stue', dx: 0 }, { key: 'kjokken', label: 'Kjøkken', dx: 210 }];

export default {
  id: 'fails',
  title: 'Der den feiler',
  steps: 5,
  notes: [
    'Lampa i stua er på. I appen er den av.',
    'Lapp 1: spør enheten hvert sekund. Fikset. Ikke fikset.',
    'Lapp 2: last hele modellen på nytt. Fikset. Ikke fikset.',
    'Lapp 3: snu statusen i UI-et. Stua stemmer. Nå er kjøkkenet feil. Fikset.',
    'Ny økt: finn årsaken. To ID-er byttet om. Én linje. Alle lappene ut.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Der den feiler</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Lapper fikser<br>ikke <em>årsaken</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    // a lamp: shade + bulb glow; set(on)
    function lamp(g, x, y, on) {
      const l = D.g(g, { 'data-bg': '' });
      D.p(l, `M${x} ${y - 70} V${y - 30}`, '', { style: 'fill: none; stroke: var(--fg)', 'stroke-width': 3 });
      const glow = D.el('circle', { cx: x, cy: y + 4, r: 46, style: 'fill: #ffd23f', opacity: on ? 0.28 : 0 }, l);
      D.p(l, `M${x - 30} ${y} L${x - 16} ${y - 30} H${x + 16} L${x + 30} ${y} Z`, '', FILL('#c4562a', 2.5));
      const bulb = D.el('circle', { cx: x, cy: y + 6, r: 8, style: `fill: ${on ? '#ffd23f' : '#4a3c30'}` }, l);
      l.set = (tl, v, at) => {
        tl.to(glow, { opacity: v ? 0.28 : 0, duration: 0.2 }, at);
        tl.to(bulb, { attr: { style: `fill: ${v ? '#ffd23f' : '#4a3c30'}` }, duration: 0.2 }, at);
      };
      return l;
    }
    function panel(g, x, label, model) {
      const p = D.g(g, { 'data-unit': '' });
      D.el('rect', { x, y: 190, width: 420, height: 330, rx: 10, style: `fill: ${model ? '#121a24' : '#241a13'}; stroke: ${model ? '#7fd0ff' : 'var(--fg)'}`, 'stroke-width': 2.5, 'data-bg': '' }, p);
      D.text(p, x + 20, 222, label, 'pl', { style: `font: 700 16px var(--font-mono); letter-spacing: .14em; fill: ${model ? '#7fd0ff' : 'var(--muted)'}` });
      ROOMS.forEach((r) => {
        D.el('rect', { x: x + 20 + r.dx, y: 250, width: 190, height: 250, rx: 4, style: `fill: none; stroke: ${model ? '#7fd0ff' : 'var(--deco)'}`, 'stroke-width': 2, 'data-bg': '' }, p);
        D.text(p, x + 115 + r.dx, 486, r.label, 'rm', { 'text-anchor': 'middle', style: 'font: 700 20px var(--font-mono); fill: var(--fg)' });
      });
      return p;
    }
    const stampAt = (k, size) => {
      // the stamps pile up on purpose
      const g = D.g(svg, { 'data-bg': '' });
      D.stamp(g, 1240 + (k - 1) * 40, [560, 642, 730][k - 1], k === 3 ? 'FIKSET!!' : 'FIKSET!', { size, rotate: [-3, 2, -2][k - 1] });
      return g;
    };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'FORSØK 1 · SAMME ØKT', 0.3);
        P.tok = tokenMeter(svg, 1180, 140, 280, { max: 60 });
        tl.fromTo(P.tok.grp, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        P.tok.set(tl, 8, 1.8);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.real = panel(svg, 600, 'HUSET', false);
        P.app = panel(svg, 1060, 'APPEN · 3D', true);
        P.lamps = {
          real: ROOMS.map((r) => lamp(svg, 715 + r.dx, 340, true)),
          app: ROOMS.map((r, k) => lamp(svg, 1175 + r.dx, 340, k === 1)),
        };
        tl.fromTo([P.real, P.app, ...P.lamps.real, ...P.lamps.app], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.5);
        // the mismatch
        P.ring = D.g(svg, { 'data-bg': '' });
        D.p(P.ring, D.roughEllipse(1175, 350, 70, 64), 'pencil');
        tl.fromTo(P.ring, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.4);
        P.chat.user(tl, 'Lampa i stua vises som av i appen, men den er på.', 1.8);
      }

      const patch = (reply, at) => {
        const t = P.chat.think(tl, at, 1.0);
        P.chat.reply(tl, reply, t);
        P.tok.set(tl, { 1: 21, 2: 36, 3: 54 }[i], at, t - at + 0.4);
        return t;
      };
      if (i === 1) {
        const t = patch('Fikset! Appen spør nå lampa hvert sekund.', 0.1);
        // a stopwatch spins; nothing changes
        const sw = D.g(svg, { 'data-bg': '' });
        D.el('circle', { cx: 1400, cy: 260, r: 24, ...FILL('#fff3e3', 2) }, sw);
        const hand = D.p(sw, 'M1400 260 L1400 242', '', { style: 'fill: none; stroke: #ff5a1f', 'stroke-width': 3, 'stroke-linecap': 'round' });
        tl.fromTo(sw, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t);
        tl.to(hand, { rotation: 1080, svgOrigin: '1400 260', duration: 1.4, ease: 'none' }, t);
        P.s1 = stampAt(1, 32);
        ctx.focus(tl, [P.chat.root, P.app, ...P.lamps.app, P.ring, P.s1, sw, P.tok.grp], t);
        tl.add(D.slam(P.s1), t + 0.6);
        P.chat.user(tl, 'Fortsatt av.', t + 1.6);
        P.sw = sw;
      }

      if (i === 2) {
        const t = patch('Fikset! Laster hele modellen på nytt.', 0.1);
        tl.to(P.app, { opacity: 0.2, duration: 0.15, yoyo: true, repeat: 3 }, t);
        tl.to(P.lamps.app, { opacity: 0.2, duration: 0.15, yoyo: true, repeat: 3 }, t);
        P.s2 = stampAt(2, 42);
        ctx.focus(tl, [P.chat.root, P.app, ...P.lamps.app, P.ring, P.s1, P.s2, P.tok.grp], t);
        tl.add(D.slam(P.s2), t + 0.8);
        P.chat.user(tl, 'Fortsatt av.', t + 1.8);
      }

      if (i === 3) {
        // inverting the state: the living room is right, the kitchen is now wrong
        const t = patch('Fikset! Snur lampestatusen i appen.', 0.1);
        P.lamps.app[0].set(tl, true, t + 0.3);
        P.lamps.app[1].set(tl, false, t + 0.3);
        tl.to(P.ring, { x: 210, duration: 0.5, ease: 'power2.inOut' }, t + 0.8);
        P.s3 = stampAt(3, 54);
        ctx.focus(tl, [P.chat.root, P.app, ...P.lamps.app, P.ring, P.s1, P.s2, P.s3, P.tok.grp], t);
        tl.add(D.slam(P.s3), t + 1.2);
      }

      if (i === 4) {
        // attempt 2: a new session asked for the cause
        P.att.show(tl, 'FORSØK 2 · NY ØKT', 0);
        P.tok.reset(tl, 0.1);
        P.chat.clear(tl, 0.1);
        P.chat.user(tl, 'Finn årsaken. Ikke lapp symptomet.', 0.5);
        const t = P.chat.think(tl, 1.1, 1.4);
        P.chat.reply(tl, 'Stue og kjøkken har byttet enhets-ID i oppsettet. Én linje.', t);
        P.tok.set(tl, 7, 1.1, t - 1.1);
        // the mapping
        const map = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 600, y: 560, width: 420, height: 170, rx: 8, style: 'fill: #fff3e3', 'data-bg': '' }, map);
        D.text(map, 620, 590, 'devices.json', 'mf', { style: 'font: 700 15px var(--font-mono); fill: #7a5a3a' });
        const rows = [['stue', '"lamp-17"'], ['kjøkken', '"lamp-12"']];
        const vals = rows.map(([k, v], n) => {
          D.text(map, 620, 640 + n * 50, `${k}:`, 'mk', { style: 'font: 700 22px var(--font-mono); fill: #1a120c' });
          return D.text(map, 800, 640 + n * 50, v, 'mv', { style: 'font: 700 22px var(--font-mono); fill: #c4405e' });
        });
        tl.fromTo(map, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, t + 0.2);
        // swap the two values
        tl.to(vals[0], { y: 50, duration: 0.5, ease: 'power2.inOut' }, t + 1.0);
        tl.to(vals[1], { y: -50, duration: 0.5, ease: 'power2.inOut' }, t + 1.0);
        tl.to(vals, { attr: { style: 'font: 700 22px var(--font-mono); fill: #1f9d63' }, duration: 0.2 }, t + 1.5);
        // every patch comes off; both rooms match
        tl.to([P.s3, P.s2, P.s1], { y: 400, rotation: 20, opacity: 0, duration: 0.6, ease: 'power2.in', stagger: 0.12 }, t + 1.7);
        tl.to([P.ring, P.sw], { opacity: 0, duration: 0.3 }, t + 1.7);
        P.lamps.app[1].set(tl, true, t + 2.2);
        ctx.focus(tl, [P.chat.root, map, P.real, P.app, ...P.lamps.real, ...P.lamps.app, P.tok.grp], t);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
