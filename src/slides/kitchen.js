import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { speech } from '../engine/props.js';
import { K, RAIL_X, room, station, ticket, serve, cookFor, board, boss, METAL } from '../engine/kitchen.js';

/*
  Tip: one session per task, plus one lead session that keeps track.
    The mine: robot miners are sessions, work orders hang from the beam, you hold the whip.
    1. One robot digs every order in turn; orders pile up and overflow the beam.
    2. One rock face per task; you (whip) arrive; the lead session's board shows
       digging, waiting for you, done. One row blinks "venter på deg".
    3. You answer (whip crack); carts go out in parallel; the beam empties.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    board      x 80–520, y 290–732
    mine       x 560–1480, y 150–780 (see engine/kitchen.js); you x 600, lash reaches x ~775
*/

const TASKS = ['Innlogging', 'Varsler', 'Kamera-API', 'Tester', 'Eksport', 'Mørk modus', 'Fakturaer', 'Søk'];
const SX = [840, 1075, 1310];
const LOOKS = [{ metal: METAL[0] }, { metal: METAL[1], glasses: true }, { metal: METAL[2] }];
const FOOD = ['#ff7a2f', '#ffd23f', '#c4562a'];

export default {
  id: 'kitchen',
  title: 'Parallelle sessions',
  steps: 3,
  notes: [
    'Én session graver alt i rekkefølge. Ordrene hoper seg opp.',
    'Én session per oppgave. Hovedsessionen har tavla: lager, venter på deg, ferdig.',
    'Du svarer på den ene, og svinger pisken. Alt går ut samtidig.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Sessions</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*2.7)">Én session per oppgave.<br>Én <em>hovedsession</em><br>som følger med.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    let loops = [];

    const reset = () => { loops.forEach((l) => l.kill()); loops = []; svg.innerHTML = ''; P = {}; };
    const slot = (k) => ({ x: RAIL_X[k], y: K.rail + 6 });
    const place = (t, pos) => gsap.set(t, { x: pos.x, y: pos.y });
    const fly = (tl, t, pos, at, d = 0.5) => tl.to(t, { x: pos.x, y: pos.y, duration: d, ease: 'power2.inOut' }, at);
    // a ticket going to a station lifts off the rail and drops in there: it never travels
    // through the other tickets
    const hop = (tl, t, pos, at) => {
      tl.to(t, { opacity: 0, y: '-=24', duration: 0.2, ease: 'power2.in' }, at);
      tl.set(t, { x: pos.x, y: pos.y - 24 }, at + 0.2);
      tl.to(t, { opacity: 1, y: pos.y, duration: 0.3, ease: 'bounce.out' }, at + 0.25);
    };
    const arrive = (tl, label, k, at) => {
      const t = ticket(P.R.top, label);
      place(t, slot(k));
      tl.fromTo(t, { y: K.rail - 90, opacity: 0 }, { y: K.rail + 6, opacity: 1, duration: 0.45, ease: 'bounce.out' }, at);
      return t;
    };
    const off = (tl, t, at) => tl.to(t, { y: '-=40', opacity: 0, duration: 0.35 }, at);

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.R = room(svg);
        tl.fromTo([P.R.back, P.R.front], { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.1);
        P.st = SX.map((x, k) => station(P.R.mid, x, LOOKS[k]));
        gsap.set([P.st[0].g, P.st[2].g], { opacity: 0 });
        const solo = P.st[1];
        tl.fromTo(solo.g, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3);
        // one cook, every ticket in order
        const t0 = ticket(P.R.top, TASKS[0]); place(t0, solo.clip);
        tl.fromTo(t0, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4);
        P.rail = [ticket(P.R.top, TASKS[1]), ticket(P.R.top, TASKS[2])];
        P.rail.forEach((t, k) => place(t, slot(k)));
        tl.fromTo(P.rail, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4);
        cookFor(tl, solo, 0.4, 2.0);
        P.rail.push(arrive(tl, TASKS[3], 2, 0.8));
        P.rail.push(arrive(tl, TASKS[4], 3, 1.6));
        serve(tl, P.R.top, solo.x, 2.5, { color: FOOD[1] });
        off(tl, t0, 2.6);
        // Varsler moves to the station, the rest shift left
        const next = P.rail.shift();
        hop(tl, next, solo.clip, 2.8);
        P.rail.forEach((t, k) => fly(tl, t, slot(k), 3.1, 0.4));
        P.at = [null, next, null];
        solo.cook.expr(tl, { brows: 'tired', mouth: 'frown' }, 3.0);
        cookFor(tl, solo, 3.2, 3.4);
        P.rail.push(arrive(tl, TASKS[5], 3, 3.4));
        P.rail.push(arrive(tl, TASKS[6], 4, 3.9));
        P.rail.push(arrive(tl, TASKS[7], 5, 4.4));
        // the rail is full: new tickets fall to the floor
        P.pile = [0, 1, 2, 3].map((k) => {
          const t = ticket(P.R.top, '', { blank: true });
          gsap.set(t, { x: 1340 + k * 18, y: 600 - k * 4, rotation: -30 + k * 22, transformOrigin: '50% 50%', opacity: 0 });
          tl.fromTo(t, { y: K.rail - 80, opacity: 0, rotation: 0 }, { y: 600 - k * 4, rotation: -30 + k * 22, opacity: 1, duration: 0.7, ease: 'bounce.out' }, 4.9 + k * 0.45);
          return t;
        });
        const sweat = D.p(P.R.top, `M${solo.x + 34} 424 q-6 10 0 14 q6 -4 0 -14 Z`, '', { style: 'fill: #9fd3ff; stroke: none', opacity: 0, 'data-bg': '' });
        tl.fromTo(sweat, { opacity: 0, y: 0 }, { opacity: 1, y: 24, duration: 0.8, repeat: 2, ease: 'power1.in' }, 5.0);
        tl.to(sweat, { opacity: 0, duration: 0.2 }, 7.4);
      }

      if (i === 1) {
        // the brigade: one station per task, the head chef keeps the board
        tl.fromTo([P.st[0].g, P.st[2].g], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.15 }, 0);
        tl.to(P.pile, { opacity: 0, duration: 0.3 }, 0);
        P.st[1].cook.expr(tl, { brows: 'neutral', mouth: 'neutral' }, 0.3);
        // you: the boss with the whip
        P.head = boss(P.R.mid, 600);
        tl.fromTo(P.head.root, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6 }, 0.4);
        P.board = board(svg, 80, 290, 440, TASKS.map((name, k) => ({ name, status: k === 0 ? 'done' : k === 1 ? 'cook' : 'queue' })));
        tl.fromTo(P.board.g, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.6 }, 0.6);
        // Kamera-API and Tester go to the new stations
        const [a, b] = [P.rail.shift(), P.rail.shift()];
        hop(tl, a, P.st[0].clip, 1.1); hop(tl, b, P.st[2].clip, 1.2);
        P.rail.forEach((t, k) => fly(tl, t, slot(k), 1.6, 0.4));
        P.at = [a, P.at[1], b];
        P.board.set(tl, 2, 'cook', 1.5); P.board.set(tl, 3, 'cook', 1.6);
        P.st.forEach((s, k) => cookFor(tl, s, 1.7 + k * 0.1, 1.4));
        // one of them needs an answer from you
        P.ask = speech(P.R.top, SX[0] + 56, 372, '?', [SX[0] + 34, 440], { size: 30 });
        tl.fromTo(P.ask, { opacity: 0, scale: 0.6, transformOrigin: '0% 100%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, 2.6);
        P.st[0].cook.expr(tl, { brows: 'raised' }, 2.6);
        P.board.set(tl, 2, 'wait', 2.6);
        ctx.focus(tl, [P.board.g, P.st[0].g, P.at[0], P.ask], 2.6);
        const row = P.board.rows[2];
        loops.push(gsap.to([row.st, row.lamp], { opacity: 0.25, duration: 0.45, repeat: -1, yoyo: true, delay: instant ? 0 : 3.0 }));
      }

      if (i === 2) {
        // you answer; everything goes out in parallel
        const row = P.board.rows[2];
        tl.call(() => { loops.forEach((l) => l.kill()); loops = []; gsap.set([row.st, row.lamp], { opacity: 1 }); }, null, 0);
        tl.to(P.ask, { opacity: 0, duration: 0.25 }, 0.2);
        P.st[0].cook.expr(tl, { brows: 'neutral' }, 0.3);
        P.board.set(tl, 2, 'cook', 0.4);
        P.head.whip.crack(tl, 0.3);
        const round = (at, picks, rows) => {
          P.st.forEach((s, k) => { if (P.at[k]) cookFor(tl, s, at, 0.9); });
          P.st.forEach((s, k) => {
            if (!P.at[k]) return;
            serve(tl, P.R.top, s.x, at + 1.0, { color: FOOD[k] });
            off(tl, P.at[k], at + 1.1);
            P.at[k] = null;
          });
          rows.forEach((r) => P.board.set(tl, r, 'done', at + 1.1));
          picks.forEach(([k, row], n) => {
            const t = P.rail.shift();
            hop(tl, t, P.st[k].clip, at + 1.5 + n * 0.12);
            P.at[k] = t;
            P.board.set(tl, row, 'cook', at + 1.9);
          });
          P.rail.forEach((t, k) => fly(tl, t, slot(k), at + 1.9, 0.4));
        };
        round(0.6, [[0, 4], [1, 5], [2, 6]], [1, 2, 3]);
        round(2.8, [[1, 7]], [4, 5, 6]);
        round(5.0, [], [7]);
        P.head.expr(tl, { mouth: 'smile' }, 6.2);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); } };
  },
};
