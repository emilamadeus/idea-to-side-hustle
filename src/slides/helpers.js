import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, PALETTE } from '../engine/characters.js';
import { speech, paperCard, FILL } from '../engine/props.js';
import { K, room, door, station, ticket, plate, serve, cookFor, toque, cap, runner, guard, clipToKitchen } from '../engine/kitchen.js';

/*
  Tip: do the work in the session itself; helpers (subagents) for research only.
  Same kitchen, now with a corridor.
    1. The head chef (session) cooks; plates go out steadily.
    2. Research errand: the runner (helper) checks the store room and is back at once.
    3. A whole dish handed to the runner: done, but it stands in the corridor holding
       the plate and never reports back. The chef waits; tickets pile up; the clock spins.
    4. The night guard (watchdog) finds the runner and carries the plate to the pass.

  Layout zones (svg units):
    tip        x 80–540, y 110–260
    legend     x 80–520, y 300–520
    corridor   x 560–730 (pencil note y 280–340), runner x ~670
    kitchen    x 740–1480: station x 1100, rail slots RX, clock (1430, 380)
*/

const RX = [790, 935, 1080, 1225];
const SX = 1100, HOME = 830, CORR = 670;
const CHEF = { hair: 'curly', hairColor: PALETTE.hair.brown, skin: PALETTE.skin[0] };
const RUN_NECK = K.floor - 252 * 0.6;

export default {
  id: 'helpers',
  title: 'Hjelpere',
  steps: 4,
  notes: [
    'Økten lager maten selv. Jevn flyt.',
    'Hjelper til research: henter og sjekker, tilbake med en gang.',
    'Hjelper som lager en hel rett: ferdig, men sier aldri fra. Hovedøkten venter.',
    'Vakta finner den. Mer om vakta på neste.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Økter</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Gjør jobben<br>i økten selv.<br><em>Hjelpere</em> til research.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    let loops = [];

    const reset = () => { loops.forEach((l) => l.kill()); loops = []; svg.innerHTML = ''; P = {}; };
    const slot = (k) => ({ x: RX[k], y: K.rail + 6 });
    const arrive = (tl, label, k, at) => {
      const t = ticket(P.R.top, label);
      gsap.set(t, { x: RX[k], y: K.rail + 6 });
      tl.fromTo(t, { y: K.rail - 90, opacity: 0 }, { y: K.rail + 6, opacity: 1, duration: 0.45, ease: 'bounce.out' }, at);
      return t;
    };
    const fly = (tl, t, pos, at, d = 0.5) => tl.to(t, { x: pos.x, y: pos.y, duration: d, ease: 'power2.inOut' }, at);
    // a ticket going to a station lifts off the rail and drops in there: it never travels
    // through the other tickets
    const hop = (tl, t, pos, at) => {
      tl.to(t, { opacity: 0, y: '-=24', duration: 0.2, ease: 'power2.in' }, at);
      tl.set(t, { x: pos.x, y: pos.y - 24 }, at + 0.2);
      tl.to(t, { opacity: 1, y: pos.y, duration: 0.3, ease: 'bounce.out' }, at + 0.25);
    };
    const openDoor = (tl, at, hold = 0.6) => {
      tl.to(P.door.leaf, { scaleX: 0.15, transformOrigin: '0% 50%', duration: 0.2 }, at);
      tl.to(P.door.leaf, { scaleX: 1, duration: 0.2 }, at + hold);
    };
    // runner x is an offset from HOME
    const walk = (tl, x, at, d = 0.6) => tl.to(P.run.root, { x: x - HOME, duration: d, ease: 'power1.inOut' }, at);

    function legend(g) {
      const rows = [
        { y: 360, label: 'ØKT', sub: 'du startet den', make: (x, y) => { const f = figure(g, { x, y, s: 0.5, pose: 'sit', arms: 'table', outfit: 'shirt', color: '#e9e2d6', ...CHEF }); toque(f); } },
        { y: 490, label: 'HJELPER', sub: 'økten startet den', make: (x, y) => { const f = figure(g, { x, y, s: 0.5, pose: 'sit', arms: 'down', outfit: 'hoodie', color: PALETTE.cloth.teal, hair: 'short', hairColor: PALETTE.hair.red, skin: PALETTE.skin[2] }); cap(f, '#ffd23f'); } },
      ];
      rows.forEach((r) => {
        const fg = D.g(g, { 'data-bg': '' });
        r.make.call(null, 0, 0);
        const made = g.lastChild; fg.appendChild(made); made.setAttribute('transform', `translate(130 ${r.y})`);
        D.text(g, 200, r.y - 18, r.label, 'lg', { style: 'font: 800 28px var(--font-display); fill: var(--accent-2)' });
        D.text(g, 200, r.y + 14, r.sub, 'ls', { style: 'font: 400 19px var(--font-mono); fill: var(--muted)' });
      });
    }

    function clock(parent, cx, cy) {
      const g = D.g(parent, { 'data-bg': '' });
      D.el('circle', { cx, cy, r: 44, ...FILL('#fff3e3', 3) }, g);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        D.p(g, `M${cx + Math.cos(a) * 34} ${cy + Math.sin(a) * 34} L${cx + Math.cos(a) * 40} ${cy + Math.sin(a) * 40}`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 3 });
      }
      const hour = D.p(g, `M${cx} ${cy} L${cx + 18} ${cy - 14}`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 5, 'stroke-linecap': 'round' });
      const min = D.p(g, `M${cx} ${cy} L${cx} ${cy - 32}`, '', { style: 'fill: none; stroke: #ff5a1f', 'stroke-width': 4, 'stroke-linecap': 'round' });
      return { g, hour, min, cx, cy };
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const lg = D.g(svg);
        legend(lg);
        tl.fromTo(lg, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.6 }, 0.4);
        P.R = room(svg, { corridor: true });
        P.door = door(P.R.back);
        tl.fromTo([P.R.back, P.R.front], { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.1);
        P.clock = clock(P.R.back, 1430, 380);
        P.st = station(P.R.mid, SX, CHEF);
        P.run = runner(P.R.mid, HOME, { arms: 'phone' });
        tl.fromTo([P.st.g, P.run.root], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3);
        // the session cooks; a steady flow
        P.cur = ticket(P.R.top, 'Innlogging'); gsap.set(P.cur, { x: P.st.clip.x, y: P.st.clip.y });
        P.rail = [ticket(P.R.top, 'Varsler'), ticket(P.R.top, 'Kamera-API')];
        P.rail.forEach((t, k) => gsap.set(t, slot(k)));
        tl.fromTo([P.cur, ...P.rail], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4);
        const cycle = (at, label) => {
          cookFor(tl, P.st, at, 1.2);
          serve(tl, P.R.top, SX, at + 1.2, { color: '#ffd23f' });
          tl.to(P.cur, { y: '-=40', opacity: 0, duration: 0.3 }, at + 1.3);
          P.cur = P.rail.shift();
          hop(tl, P.cur, P.st.clip, at + 1.7);
          P.rail.forEach((t, k) => fly(tl, t, slot(k), at + 2.0, 0.4));
          P.rail.push(arrive(tl, label, P.rail.length, at + 2.3));
        };
        cycle(0.4, 'Tester');
        cycle(3.0, 'Eksport');
        cookFor(tl, P.st, 5.6, 1.0);
      }

      if (i === 1) {
        // research errand: quick and useful
        P.say = speech(P.R.top, 800, 300, 'Sjekk lageret.', [1040, 420], { size: 20 });
        tl.fromTo(P.say, { opacity: 0, scale: 0.8, transformOrigin: '100% 100%' }, { opacity: 1, scale: 1, duration: 0.3 }, 0);
        tl.to(P.say, { opacity: 0, duration: 0.25 }, 1.2);
        P.run.expr(tl, { brows: 'raised', mouth: 'smile' }, 0.4);
        walk(tl, CORR, 0.6);
        openDoor(tl, 0.7);
        tl.to(P.run.root, { x: 500 - HOME, opacity: 0, duration: 0.4 }, 1.2);
        // back with the answer
        tl.to(P.run.root, { x: CORR - HOME, opacity: 1, duration: 0.4 }, 2.0);
        openDoor(tl, 2.3);
        walk(tl, HOME, 2.4);
        P.list = paperCard(P.R.top, 1166, 300, 210, 'LAGER', ['egg  12', 'smør  2', 'mel  4 kg'], { size: 19 });
        tl.fromTo(P.list, { opacity: 0, x: -400, y: 260, scale: 0.4, transformOrigin: '0% 0%' }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.6, ease: 'power2.out' }, 3.1);
        P.ok = D.p(P.R.top, 'M1334 318 l10 12 l22 -26', '', { style: 'fill: none; stroke: #1f9d63', 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0 });
        tl.to(P.ok, { opacity: 1, duration: 0.2 }, 3.8);
        P.st.cook.expr(tl, { mouth: 'smile' }, 3.8);
        cookFor(tl, P.st, 3.8, 1.0);
        ctx.focus(tl, [P.run.root, P.say, P.list, P.ok, P.st.g, P.cur], 0.2);
      }

      if (i === 2) {
        // a whole dish handed to the helper
        tl.to([P.list, P.ok], { opacity: 0, duration: 0.3 }, 0);
        P.st.cook.expr(tl, { mouth: 'neutral' }, 0);
        P.say2 = speech(P.R.top, 800, 300, 'Lag denne.', [1040, 420], { size: 20 });
        tl.fromTo(P.say2, { opacity: 0, scale: 0.8, transformOrigin: '100% 100%' }, { opacity: 1, scale: 1, duration: 0.3 }, 0.1);
        tl.to(P.say2, { opacity: 0, duration: 0.25 }, 1.3);
        const job = P.rail.shift();
        hop(tl, job, { x: HOME - 60, y: 560 }, 0.5); // into the runner's hands, below the chef's bubble
        P.rail.forEach((t, k) => fly(tl, t, slot(k), 0.9, 0.4));
        // the ticket goes with the runner into the corridor
        walk(tl, CORR, 1.2, 0.7);
        tl.to(job, { x: CORR - 60, duration: 0.7, ease: 'power1.inOut' }, 1.2);
        openDoor(tl, 1.3);
        tl.to(job, { opacity: 0, duration: 0.3 }, 2.0);
        // done: plate in hand, standing in the corridor, never says so
        P.plate = plate(P.R.top, '#c4562a');
        gsap.set(P.plate, { x: CORR, y: RUN_NECK + 26, opacity: 0 });
        tl.to(P.plate, { opacity: 1, duration: 0.3 }, 2.4);
        P.run.expr(tl, { mouth: 'smile', brows: 'neutral' }, 2.4);
        // the session waits: tickets pile up, the clock spins
        P.st.cook.expr(tl, { brows: 'annoyed', mouth: 'frown', eyes: 'down' }, 2.6);
        tl.to(P.clock.min, { rotation: 1080, svgOrigin: `${P.clock.cx} ${P.clock.cy}`, duration: 3.2, ease: 'power1.inOut' }, 2.6);
        tl.to(P.clock.hour, { rotation: 90, svgOrigin: `${P.clock.cx} ${P.clock.cy}`, duration: 3.2, ease: 'power1.inOut' }, 2.6);
        ['Mørk modus', 'Fakturaer'].forEach((label, k) => P.rail.push(arrive(tl, label, P.rail.length, 3.0 + k * 0.6)));
        P.pile = [0, 1, 2].map((k) => {
          const t = ticket(P.R.top, '', { blank: true });
          gsap.set(t, { x: 1300 + k * 20, y: 600 - k * 4, rotation: -26 + k * 24, transformOrigin: '50% 50%' });
          tl.fromTo(t, { y: K.rail - 80, opacity: 0, rotation: 0 }, { y: 600 - k * 4, rotation: -26 + k * 24, opacity: 1, duration: 0.7, ease: 'bounce.out' }, 4.4 + k * 0.4);
          return t;
        });
        P.note = D.g(P.R.top, { transform: 'rotate(-5 574 300)' });
        D.pencil(P.note, 574, 296, 'ferdig for', { size: 30, rotate: 0 });
        D.pencil(P.note, 574, 352, '40 min siden', { size: 30, rotate: 0 });
        tl.fromTo(P.note, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 5.6);
        ctx.focus(tl, [P.run.root, P.plate, P.note, P.st.g, P.clock.g, P.cur, ...P.rail, ...P.pile, P.R.corr], 2.4);
      }

      if (i === 3) {
        // the night guard checks the corridor
        tl.to(P.note, { opacity: 0, duration: 0.3 }, 0);
        P.guard = guard(clipToKitchen(D.g(P.R.mid)), 600);
        tl.fromTo(P.guard.root, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.2);
        P.run.expr(tl, { eyes: 'wide', mouth: 'neutral', brows: 'raised' }, 1.0);
        // takes the plate and walks it to the pass
        const handX = 600 + 96, handY = K.floor - 252 * 0.72 - 42;
        tl.to(P.plate, { x: handX, y: handY, duration: 0.4 }, 1.4);
        tl.to(P.guard.beam, { opacity: 0, duration: 0.3 }, 1.4);
        // he cuts to the pass with the plate (no walking through the runner and the cook)
        tl.to([P.guard.root, P.plate], { opacity: 0, duration: 0.3 }, 1.9);
        tl.set(P.guard.root, { x: 620 }, 2.2);
        tl.set(P.plate, { x: handX + 620 }, 2.2);
        tl.to([P.guard.root, P.plate], { opacity: 1, duration: 0.4 }, 2.3);
        tl.to(P.plate, { y: K.pass - 2, duration: 0.3, ease: 'power2.in' }, 3.4);
        tl.to(P.plate, { x: K.x1 + 10, duration: 0.8, ease: 'power2.in' }, 3.8);
        tl.to(P.plate, { opacity: 0, duration: 0.2 }, 4.5);
        tl.to(P.guard.root, { opacity: 0, duration: 0.5 }, 4.6);
        // the session picks up again
        P.st.cook.expr(tl, { brows: 'neutral', mouth: 'smile', eyes: 'open' }, 3.8);
        tl.to(P.pile, { opacity: 0, duration: 0.3 }, 4.0);
        P.run.expr(tl, { eyes: 'down', brows: 'tired', mouth: 'frown' }, 3.0);
        tl.to(P.cur, { y: '-=40', opacity: 0, duration: 0.3 }, 4.2);
        serve(tl, P.R.top, SX, 4.2, { color: '#ffd23f' });
        const nx = P.rail.shift();
        hop(tl, nx, P.st.clip, 4.6);
        P.rail.forEach((t, k) => fly(tl, t, slot(k), 4.9, 0.4));
        cookFor(tl, P.st, 5.0, 1.2);
        ctx.focus(tl, [P.guard.root, P.run.root, P.plate, P.st.g, P.R.corr], 0.2);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); } };
  },
};
