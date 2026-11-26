import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { PALETTE } from '../engine/characters.js';
import { speech, chatPhone, meter } from '../engine/props.js';
import { K, room, station, serve, cookFor, runner, guard, plate, clipToKitchen } from '../engine/kitchen.js';

/*
  Tip: a watchdog checks every session every 10 minutes. Same kitchen, night shift.
    0. Asked in plain words (chat). Lights go down, the clock starts at 22:00.
    1. 23:40 two sessions wait for each other. The guard breaks the tie.
    2. 02:20 one session is asleep. Woken up.
    3. 03:30 RAM lock: a new job can't start; finished jobs still hold the RAM. Released, it starts.
    4. 04:20 a session's context fills up to 400k and auto-compacts, instead of a new session.
    5. 05:10 the corridor: a helper holds a finished plate; the lead waits. Delivered.
    6. 06:00 lights up, everything goes out.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–430
    clock      x 80–520, y 470–610 (time + round)
    ram        x 80–530, y 640–720 (step 3)
    kitchen    x 560–1480 (corridor x 560–730); bubbles and meter y 296–356 above the cooks
*/

// spaced so the guard (149 wide with his torch arm) fits between two cooks without touching either
const SX = [858, 1114, 1368];
const LOOKS = [
  { hair: 'curly', hairColor: PALETTE.hair.dark, skin: PALETTE.skin[3] },
  { hair: 'messy', hairColor: PALETTE.hair.brown, skin: PALETTE.skin[0], glasses: true },
  { hair: 'bun', hairColor: PALETTE.hair.blonde, skin: PALETTE.skin[2] },
];
const ROUNDS = [22 * 60, 23 * 60 + 40, 26 * 60 + 20, 27 * 60 + 30, 28 * 60 + 20, 29 * 60 + 10, 30 * 60];
const G0 = 960, G2 = 760; // guard (facing right) and guard2 (facing left) starting x
const RUN_X = 620, RUN_NECK = K.floor - 252 * 0.6;

export default {
  id: 'watchdog',
  title: 'Vakta',
  steps: 7,
  notes: [
    'Bare be om det: sjekk alle økter hvert 10. minutt. Så går natta.',
    'To økter venter på hverandre. Vakta bryter låsen.',
    'En økt har sovnet. Vekkes.',
    'RAM-lås: ny jobb får ikke starte. Ferdige jobber holder fortsatt minnet. Vakta frigjør.',
    'Context fylles. Auto-compact ved 400k i stedet for ny økt.',
    'Gangen: hjelperen er ferdig, men har ikke sagt fra. Hovedøkten venter. Vakta leverer.',
    'Morgen. Alt er ferdig.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Økter</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">La en vakt gå runden<br>hvert <em>10. minutt</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };
    const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
    const showTime = (m) => {
      P.time.textContent = hhmm(m);
      P.round.textContent = `RUNDE ${Math.floor((m - ROUNDS[0]) / 10)}`;
    };
    // the clock runs; the guard patrols while it does
    const night = (tl, k, at, d = 1.6) => {
      const s = { m: ROUNDS[k - 1] };
      tl.to(s, { m: ROUNDS[k], duration: d, ease: 'power1.inOut', onUpdate: () => showTime(s.m) }, at);
      tl.call(() => showTime(ROUNDS[k]), null, at + d);
    };
    // between rounds the clock jumps ahead, so the guard cuts to his next spot instead of
    // walking across the cooks
    // spots: x 960 / 1214 facing right, 1015 / 760 facing left; each clear of every cook and the helper
    const walk = (tl, x, at, left = false) => {
      const g = left ? P.guard2 : P.guard;
      tl.to([P.guard.root, P.guard2.root], { opacity: 0, duration: 0.25 }, at);
      tl.set(g.root, { x: x - (left ? G2 : G0) }, at + 0.25);
      tl.to(g.root, { opacity: 1, duration: 0.35 }, at + 0.3);
    };
    // P.guard faces right; P.guard2 is the same guard facing left (swapped in for the corridor)
    const beam = (tl, on, at) => {
      tl.to([P.guard.beam, P.guard2.beam], { opacity: on ? 1 : 0.35, duration: 0.3 }, at);
      tl.to(P.dark, { opacity: on ? 0.22 : 0.55, duration: 0.4 }, at);
    };
    const pop = (tl, node, at) => tl.fromTo(node, { opacity: 0, scale: 0.7, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.5)' }, at);

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 440, 168, { app: 'Claude', compact: true, size: 19 });
        tl.fromTo(P.chat.root, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, 'Sjekk alle økter hvert 10. minutt.', 0.7);
        const t = P.chat.think(tl, 1.3, 1.0);
        P.chat.reply(tl, 'Ok. Første runde 22:10.', t);
        // clock
        const ck = D.g(svg, { 'data-unit': '' });
        P.time = D.text(ck, 80, 548, '22:00', 'tm', { style: 'font: 800 72px var(--font-display); fill: var(--fg)' });
        P.round = D.text(ck, 84, 604, 'RUNDE 0', 'rd', { style: 'font: 700 20px var(--font-mono); letter-spacing: .14em; fill: var(--accent-2)' });
        tl.fromTo(ck, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
        // kitchen, three sessions, a helper in the corridor
        P.R = room(svg, { corridor: true });
        tl.fromTo([P.R.back, P.R.front], { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.1);
        P.st = SX.map((x, k) => station(P.R.mid, x, LOOKS[k]));
        P.lead = P.st[1];
        P.run = runner(P.R.mid, RUN_X, { arms: 'phone' });
        P.plate = plate(P.R.mid, '#c4562a');
        gsap.set(P.plate, { x: RUN_X, y: RUN_NECK + 26 });
        tl.fromTo([...P.st.map((s) => s.g), P.run.root, P.plate], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3);
        // night falls; the guard starts his round
        P.dark = D.el('rect', { x: K.x0, y: 150, width: K.x1 - K.x0, height: 630, rx: 10, style: 'fill: #04060d; stroke: none', opacity: 0, 'data-bg': '' }, svg);
        const gl = clipToKitchen(D.g(svg));
        P.guard = guard(gl, G0);
        P.guard2 = guard(gl, G2, { flip: true });
        gsap.set(P.guard2.root, { opacity: 0 });
        svg.appendChild(P.R.top);
        tl.to(P.dark, { opacity: 0.55, duration: 1.0 }, 2.4);
        tl.fromTo(P.guard.root, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 2.8);
        tl.fromTo(P.guard.beam, { opacity: 0 }, { opacity: 0.35, duration: 0.4 }, 3.2);
        P.st.forEach((s, k) => cookFor(tl, s, 2.6 + k * 0.2, 1.2));
      }

      if (i === 1) {
        // 23:40 two sessions wait for each other
        night(tl, 1, 0);
        const [a, , b] = P.st;
        P.w1 = speech(P.R.top, SX[0] - 110, 296, 'Venter på deg.', [SX[0] - 10, 380], { size: 20 });
        P.w2 = speech(P.R.top, SX[2] - 96, 296, 'Venter på deg.', [SX[2] + 10, 380], { size: 20 });
        pop(tl, P.w1, 1.8); pop(tl, P.w2, 2.0);
        a.cook.expr(tl, { brows: 'annoyed' }, 1.8); b.cook.expr(tl, { brows: 'annoyed' }, 2.0);
        P.loop = D.g(P.R.top, { 'data-bg': '' });
        D.arrow(P.loop, [SX[0] + 110, 300], [SX[2] - 104, 300], 'acc2');
        D.arrow(P.loop, [SX[2] - 104, 350], [SX[0] + 110, 350], 'acc2');
        tl.fromTo(P.loop, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 2.3);
        // the guard breaks the tie: one of them goes first
        beam(tl, true, 2.8);
        tl.to([P.loop, P.w2], { opacity: 0, duration: 0.3 }, 3.4);
        tl.to(P.w1, { opacity: 0, duration: 0.3 }, 3.4);
        a.cook.expr(tl, { brows: 'neutral', mouth: 'smile' }, 3.6);
        b.cook.expr(tl, { brows: 'neutral' }, 3.6);
        cookFor(tl, a, 3.7, 1.2); cookFor(tl, b, 4.2, 1.2);
        beam(tl, false, 4.4);
        ctx.focus(tl, [a.g, b.g, P.w1, P.w2, P.loop, P.guard.root, P.time.parentNode], 1.6);
      }

      if (i === 2) {
        // 02:20 asleep at the station
        const s = P.st[2];
        s.cook.expr(tl, { eyes: 'closed', mouth: 'neutral', brows: 'neutral' }, 0);
        night(tl, 2, 0);
        walk(tl, 1214, 0.3);
        P.z = D.g(P.R.top, { 'data-bg': '' });
        ['z', 'z', 'Z'].forEach((c, k) => D.text(P.z, s.x + 40 + k * 18, 390 - k * 22, c, 'zz', { style: `font: 800 ${20 + k * 6}px var(--font-display); fill: #9fd3ff` }));
        tl.fromTo(P.z, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 0.6);
        P.note = D.pencil(P.R.top, s.x - 120, 330, 'inaktiv siden 02:14', { size: 32, rotate: -4 });
        tl.fromTo(P.note, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.8);
        beam(tl, true, 1.6);
        // woken up
        tl.to([P.z, P.note], { opacity: 0, duration: 0.3 }, 2.8);
        s.cook.expr(tl, { eyes: 'wide', brows: 'raised' }, 2.8);
        s.cook.expr(tl, { eyes: 'open', brows: 'neutral' }, 3.4);
        cookFor(tl, s, 3.4, 1.2);
        beam(tl, false, 4.0);
        ctx.focus(tl, [s.g, P.z, P.note, P.guard.root, P.time.parentNode], 0.4);
      }

      if (i === 3) {
        // 03:30 RAM lock: a new job waits; finished jobs still hold their RAM
        night(tl, 3, 0);
        const RX = 80, RY = 676, SEG = 75;
        const ram = D.g(svg, { 'data-unit': '' });
        D.text(ram, RX, RY - 12, 'RAM', 'rl', { style: 'font: 700 16px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        D.el('rect', { x: RX, y: RY, width: SEG * 4, height: 44, rx: 6, style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2, 'data-bg': '' }, ram);
        const held = [];
        ['AKTIV', 'AKTIV', 'FERDIG', 'FERDIG'].forEach((l, k) => {
          const g = D.g(ram);
          const on = k < 2;
          D.el('rect', { x: RX + 4 + k * SEG, y: RY + 4, width: SEG - 8, height: 36, rx: 4, style: `fill: ${on ? '#a8774c' : '#4a3c30'}`, 'data-bg': '' }, g);
          D.text(g, RX + k * SEG + SEG / 2, RY + 27, l, 'rs', { 'text-anchor': 'middle', style: `font: 700 12px var(--font-mono); letter-spacing: .06em; fill: ${on ? '#1a120c' : '#cfc3b2'}` });
          if (!on) held.push(g);
        });
        tl.fromTo(ram, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        // the new job, waiting at the end of the bar
        const job = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: RX + SEG * 4 + 14, y: RY - 2, width: 136, height: 48, rx: 6, style: 'fill: #fff3e3; stroke: #1a120c', 'stroke-width': 2.5 }, job);
        D.text(job, RX + SEG * 4 + 82, RY + 18, 'NY JOBB', 'jn', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); fill: #1a120c' });
        D.text(job, RX + SEG * 4 + 82, RY + 37, 'VENTER', 'js', { 'text-anchor': 'middle', style: 'font: 700 12px var(--font-mono); letter-spacing: .1em; fill: #c4562a' });
        tl.fromTo(job, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 0.9);
        tl.to(job, { x: 3, duration: 0.05, repeat: 5, yoyo: true }, 1.4);
        beam(tl, true, 1.8);
        // released; the waiting job takes the freed space (a cut, not a slide through the bar)
        tl.to(held, { opacity: 0, duration: 0.4 }, 2.4);
        const run = D.g(ram);
        D.el('rect', { x: RX + 4 + SEG * 2, y: RY + 4, width: SEG * 2 - 8, height: 36, rx: 4, style: 'fill: var(--accent)', 'data-bg': '' }, run);
        D.text(run, RX + SEG * 3, RY + 27, 'NY JOBB', 'rj', { 'text-anchor': 'middle', style: 'font: 700 13px var(--font-mono); letter-spacing: .06em; fill: #1a120c' });
        tl.to(job, { opacity: 0, duration: 0.3 }, 3.0);
        tl.fromTo(run, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 3.3);
        beam(tl, false, 4.2);
        P.ram = [ram, job];
        ctx.focus(tl, [ram, job, P.guard.root, P.time.parentNode], 0.4);
      }

      if (i === 4) {
        // 04:20 a session's context fills up; it auto-compacts at 400k and carries on
        tl.to(P.ram, { opacity: 0, duration: 0.3 }, 0);
        const s = P.st[0];
        night(tl, 4, 0);
        walk(tl, 1015, 0.2, true);
        const m = meter(P.R.top, s.x - 100, 262, 200, 'CONTEXT · COMPACT VED 400k', 'var(--accent)');
        const mx = s.x - 98 + m.w * 0.4;
        D.p(m.grp, `M${mx} 256 V284`, '', { style: 'fill: none; stroke: #ffd23f', 'stroke-width': 3, 'data-bg': '' });
        const v = { k: 80 };
        const show = () => { m.value.textContent = `${Math.round(v.k)}k`; };
        tl.fromTo(m.grp, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4);
        tl.fromTo(m.fill, { attr: { width: m.w * 0.08 } }, { attr: { width: m.w * 0.4 }, duration: 1.4, ease: 'power1.in' }, 0.5);
        tl.fromTo(v, { k: 80 }, { k: 400, duration: 1.4, ease: 'power1.in', onUpdate: show }, 0.5);
        s.cook.expr(tl, { eyes: 'wide' }, 1.6);
        beam(tl, true, 1.6);
        // compact: the context shrinks, same session keeps going
        tl.to(m.fill, { attr: { width: m.w * 0.06 }, duration: 0.5, ease: 'power2.out' }, 2.3);
        tl.to(v, { k: 60, duration: 0.5, ease: 'power2.out', onUpdate: show }, 2.3);
        s.cook.expr(tl, { eyes: 'open', mouth: 'smile' }, 2.8);
        cookFor(tl, s, 3.0, 1.2);
        tl.to(m.fill, { attr: { width: m.w * 0.16 }, duration: 1.4 }, 3.0);
        tl.to(v, { k: 150, duration: 1.4, onUpdate: show }, 3.0);
        beam(tl, false, 4.4);
        P.ctxm = m.grp;
        ctx.focus(tl, [s.g, m.grp, P.guard2.root, P.time.parentNode], 0.4);
      }

      if (i === 5) {
        // 05:10 the corridor: a helper finished long ago and never said so
        night(tl, 5, 0);
        tl.to(P.ctxm, { opacity: 0, duration: 0.3 }, 0);
        P.wait = speech(P.R.top, SX[1] - 120, 296, 'Venter på hjelperen.', [SX[1] - 10, 380], { size: 20 });
        pop(tl, P.wait, 0.3);
        P.lead.cook.expr(tl, { brows: 'annoyed', mouth: 'frown' }, 0.3);
        // the guard looks into the corridor from the kitchen side
        walk(tl, G2, 0.6, true);
        tl.to(P.dark, { opacity: 0.22, duration: 0.4 }, 1.6);
        P.run.expr(tl, { eyes: 'wide', brows: 'raised' }, 1.9);
        // takes the plate and carries it to the lead's counter
        tl.to(P.plate, { x: 760 - 96, y: K.floor - 252 * 0.72 - 42, duration: 0.4 }, 2.4);
        tl.to(P.dark, { opacity: 0.55, duration: 0.4 }, 2.9);
        // the plate cuts to the lead's counter (no flight across the cooks)
        tl.to(P.plate, { opacity: 0, duration: 0.25 }, 3.0);
        tl.set(P.plate, { x: SX[1] + 60, y: K.top - 14 }, 3.3);
        tl.to(P.plate, { opacity: 1, duration: 0.4 }, 3.35);
        tl.to(P.wait, { opacity: 0, duration: 0.3 }, 3.6);
        P.lead.cook.expr(tl, { brows: 'neutral', mouth: 'smile' }, 4.6);
        P.run.expr(tl, { eyes: 'down', brows: 'tired' }, 4.6);
        cookFor(tl, P.lead, 4.7, 1.2);
        ctx.focus(tl, [P.run.root, P.plate, P.lead.g, P.wait, P.guard.root, P.guard2.root, P.time.parentNode, P.R.corr], 0.3);
      }

      if (i === 6) {
        // 06:00 morning: lights up, everything goes out
        night(tl, 6, 0, 1.0);
        tl.to(P.dark, { opacity: 0, duration: 1.2 }, 0.8);
        tl.to([P.guard.root, P.guard2.root], { opacity: 0, duration: 0.6 }, 0.8);
        tl.to(P.plate, { opacity: 0, duration: 0.3 }, 1.6);
        P.st.forEach((s, k) => serve(tl, P.R.top, s.x, 1.8 + k * 0.25, { color: ['#ff7a2f', '#c4562a', '#ffd23f'][k] }));
        P.st.forEach(({ cook: c }) => c.expr(tl, { mouth: 'smile', eyes: 'open' }, 2.2));
        P.chat.reply(tl, '06:00. Alt ferdig.', 2.6);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
