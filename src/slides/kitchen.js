import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { codeApp } from '../engine/console.js';

/*
  Tip: one session per task, plus one master session that talks to the others and keeps the
  overview. Shown in the Claude Code app. (The id stays 'kitchen' from an older version.)
    0. One session gets everything: eight tasks, one done; the timer runs, the context fills,
       and your own messages pile up.
    1. A new window: one session per task in the sidebar, and a master session that follows
       them. Kamera-API stops on a question; its row turns "venter på deg".
    2. You open Kamera-API and answer; all of them finish; the master reports.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    app        x 560–1480, y 150–760 (sidebar x 562–812, conversation x 814–1478)
*/

const AX = 560, AY = 150, AW = 920, AH = 610;
const TASKS = ['Innlogging', 'Varsler', 'Kamera-API', 'Tester', 'Eksport', 'Mørk modus', 'Fakturaer', 'Søk'];

export default {
  id: 'kitchen',
  title: 'Parallelle sessions',
  steps: 3,
  notes: [
    'Én session får alt. Én oppgave ferdig, sju igjen, og du står i kø med dine egne meldinger.',
    'Én session per oppgave. Master-sessionen snakker med de andre og vet hvem som venter på deg.',
    'Du svarer der det trengs. Resten jobber parallelt.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Sessions</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*2.7)">Én session per oppgave.<br>Én <em>master session</em><br>som gir oversikt.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    let loops = [];

    const reset = () => { loops.forEach((l) => l.kill()); loops = []; svg.innerHTML = ''; P = {}; };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const app = codeApp(svg, AX, AY, AW, AH, { size: 18 });
        tl.fromTo(app.root, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.2);
        const s = app.session('all', 'Alt i én', 'work');
        app.show(tl, 'all', 0.2);
        s.user(tl, 'Lag innlogging, varsler, kamera-API, tester, eksport, mørk modus, fakturaer og søk.', 0.7);
        s.list(tl, TASKS.slice(0, 5).map((t, k) => [t, k === 0]).concat([['… og tre til', false]]), 1.2);
        s.ctx(tl, 120, 1.2, 0.6);
        s.spin(tl, 'Lager varsler', 1.8, { from: 0, to: 47 * 60, dur: 4.4 });
        s.ctx(tl, 690, 1.8, 4.4);
        ['Hvor langt har du kommet?', 'Hallo?'].forEach((m, k) => s.user(tl, m, 3.0 + k * 1.4));
        P.app = app;
      }

      if (i === 1) {
        // one session per task, and a master session that follows them
        tl.to(P.app.root, { opacity: 0, duration: 0.4 }, 0);
        const app = codeApp(svg, AX, AY, AW, AH, { size: 18 });
        tl.fromTo(app.root, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.4);
        const m = app.session('master', 'Master', 'work');
        const rows = [['innlogging', 'Innlogging', 'done'], ['varsler', 'Varsler', 'work'], ['kamera', 'Kamera-API', 'work'], ['tester', 'Tester', 'work']];
        rows.forEach(([key, name, st]) => app.session(key, name, st));
        app.show(tl, 'master', 0.4);
        m.user(tl, 'Følg med på de andre sessionene.', 0.9);
        m.say(tl, 'Innlogging er ferdig. Varsler, kamera-API og tester jobber.', 1.5);
        // inside Kamera-API (not open yet): it stops on a question
        const k = app.sessions.kamera;
        k.user(tl, 'Lag kamera-API.', 0);
        k.tool(tl, 'Bash', 'npm run db:migrate', 'Endrer tabellen cameras', 0);
        k.ctx(tl, 140, 0, 0.1);
        P.ask = k.ask(tl, 'Kjøre migreringen mot prod?', ['Ja', 'Nei'], 0);
        k.state(tl, 'wait', 2.6);
        m.say(tl, 'Kamera-API venter på deg: migrering mot prod.', 2.9, { color: '#ffd23f' });
        m.ctx(tl, 60, 0.9, 0.5);
        loops.push(gsap.to(k.blinkRow(), { opacity: 0.3, duration: 0.45, repeat: -1, yoyo: true, delay: instant ? 0 : 3.2 }));
        P.app = app; P.m = m; P.k = k;
      }

      if (i === 2) {
        // you open Kamera-API and answer; everything finishes
        const { app, m, k } = P;
        tl.call(() => { loops.forEach((l) => l.kill()); loops = []; gsap.set(k.blinkRow(), { opacity: 1 }); }, null, 0);
        app.show(tl, 'kamera', 0.2);
        tl.to(P.ask.options[0], { scale: 1.08, transformOrigin: '50% 50%', duration: 0.15, yoyo: true, repeat: 1 }, 0.9);
        k.user(tl, 'Ja', 1.1);
        k.state(tl, 'work', 1.2);
        const sp = k.spin(tl, 'Migrerer', 1.4, { from: 0, to: 40, dur: 1.2 });
        sp.end(tl, 2.7, '✓ Ferdig', 'ok');
        ['varsler', 'tester', 'kamera'].forEach((key, n) => app.sessions[key].state(tl, 'done', 2.7 + n * 0.4));
        app.show(tl, 'master', 3.9);
        m.say(tl, 'Alle fire ferdige.', 4.3, { color: '#8fe3a2' });
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); } };
  },
};
