import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { codeApp } from '../engine/console.js';

/*
  Tip: a watchdog checks every session every 10 minutes. Shown in the Claude Code app: the
  master session runs the check, the sidebar shows what each session is doing. Night shift.
    0. Asked in plain words in the master session. The clock starts at 22:00.
    1. 23:40 two sessions wait for each other. The master breaks the tie.
    2. 02:20 one session has gone quiet. Told to continue.
    3. 03:30 RAM lock: a session can't run its tests; finished sessions still hold dev servers.
    4. 04:20 Varsler (opened) reaches 400k and auto-compacts, instead of a new session.
    5. 05:10 a helper finished without saying so; the master tells its lead.
    6. 06:00 everything done.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    clock      x 80–520, y 470–610 (time + round)
    app        x 560–1480, y 150–760
*/

const AX = 560, AY = 150, AW = 920, AH = 610;
const ROUNDS = [22 * 60, 23 * 60 + 40, 26 * 60 + 20, 27 * 60 + 30, 28 * 60 + 20, 29 * 60 + 10, 30 * 60];
const OK = '#8fe3a2', WARN = '#ffd23f';

export default {
  id: 'watchdog',
  title: 'Vakta',
  steps: 7,
  notes: [
    'Bare be om det i master-sessionen: sjekk alle sessions hvert 10. minutt. Så går natta.',
    'To sessions venter på hverandre. Master bryter låsen.',
    'En session har stoppet uten å si fra. Den får beskjed om å fortsette.',
    'RAM-lås: testene får ikke kjøre, ferdige sessions holder fortsatt dev-servere. Master stopper dem.',
    'Context fylles. Auto-compact ved 400k i stedet for ny session.',
    'Hjelperen ble ferdig uten å si fra. Master sier fra til leaden.',
    'Morgen. Alt er ferdig.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Sessions</div>
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
    const night = (tl, k, at, d = 1.4) => {
      const s = { m: ROUNDS[k - 1] };
      tl.to(s, { m: ROUNDS[k], duration: d, ease: 'power1.inOut', onUpdate: () => showTime(s.m) }, at);
      tl.call(() => showTime(ROUNDS[k]), null, at + d);
    };

    const play = (i) => {
      const tl = gsap.timeline();
      const S = P.app?.sessions;
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        // clock
        const ck = D.g(svg, { 'data-unit': '' });
        P.time = D.text(ck, 80, 548, '22:00', 'tm', { style: 'font: 800 72px var(--font-display); fill: var(--fg)' });
        P.round = D.text(ck, 84, 604, 'RUNDE 0', 'rd', { style: 'font: 700 20px var(--font-mono); letter-spacing: .14em; fill: var(--accent-2)' });
        tl.fromTo(ck, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
        // the app: a master session and three working sessions
        const app = codeApp(svg, AX, AY, AW, AH, { size: 18 });
        tl.fromTo(app.root, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.2);
        const m = app.session('master', 'Master', 'work');
        [['varsler', 'Varsler'], ['kamera', 'Kamera-API'], ['tester', 'Tester']].forEach(([k, n]) => app.session(k, n, 'work'));
        app.show(tl, 'master', 0.2);
        m.user(tl, 'Sjekk alle sessions hvert 10. minutt.', 0.8);
        m.say(tl, 'Ok. Første runde 22:10.', 1.5);
        m.ctx(tl, 40, 0.8, 0.5);
        // inside Varsler (opened in step 4)
        const v = app.sessions.varsler;
        v.user(tl, 'Lag varsler.', 0);
        v.tool(tl, 'Edit', 'src/varsler/push.ts', '+64 −8', 0);
        v.tool(tl, 'Bash', 'npm test', '18 bestått', 0);
        v.ctx(tl, 340, 0, 0.1);
        P.app = app; P.m = m;
      }

      if (i === 1) {
        // 23:40 two sessions wait for each other
        night(tl, 1, 0);
        S.varsler.state(tl, 'block', 0.8); S.kamera.state(tl, 'block', 1.0);
        P.m.fadeOld(tl, 1.4);
        P.m.say(tl, 'Runde 10: Varsler og Kamera-API venter på hverandre.', 1.6, { color: WARN });
        P.m.say(tl, '→ Varsler: ta migreringen først.', 2.6);
        S.varsler.state(tl, 'work', 3.2); S.kamera.state(tl, 'work', 3.8);
      }

      if (i === 2) {
        // 02:20 one session has gone quiet
        night(tl, 2, 0);
        S.tester.state(tl, 'idle', 0.8);
        P.m.fadeOld(tl, 1.2);
        P.m.say(tl, 'Runde 26: Tester har stått stille siden 02:14.', 1.4, { color: WARN });
        P.m.say(tl, '→ Tester: fortsett.', 2.4);
        S.tester.state(tl, 'work', 3.0);
      }

      if (i === 3) {
        // 03:30 RAM lock
        night(tl, 3, 0);
        S.kamera.state(tl, 'block', 0.8);
        P.m.fadeOld(tl, 1.2);
        P.m.say(tl, 'Runde 33: Kamera-API får ikke kjørt testene. For lite ledig minne.', 1.4, { color: WARN });
        P.m.tool(tl, 'Bash', 'ps: 2 dev-servere fra ferdige sessions', '6,1 GB', 2.4);
        P.m.tool(tl, 'Bash', 'kill 4121 4388', '6,1 GB frigjort', 3.2, { tone: OK });
        S.kamera.state(tl, 'work', 3.9);
      }

      if (i === 4) {
        // 04:20 Varsler fills its context; auto-compact at 400k
        night(tl, 4, 0);
        const v = S.varsler;
        P.app.show(tl, 'varsler', 0.4);
        P.mk = P.app.mark(400);
        tl.fromTo(P.mk, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.8);
        v.fadeOld(tl, 0.8);
        v.ctx(tl, 400, 1.0, 1.2);
        const sp = v.spin(tl, 'Compacting conversation', 2.2, { from: 0, to: 14, dur: 1.0 });
        sp.end(tl, 3.3, '✓ Komprimert: 400k → 60k', 'ok');
        v.ctx(tl, 60, 3.3, 0.5);
        v.say(tl, 'Fortsetter med push-varsler.', 4.0);
      }

      if (i === 5) {
        // 05:10 a helper finished and never said so
        night(tl, 5, 0);
        P.app.show(tl, 'master', 0.4);
        tl.to(P.mk, { opacity: 0, duration: 0.3 }, 0.4);
        S.kamera.state(tl, 'block', 0.9);
        P.m.fadeOld(tl, 1.2);
        P.m.say(tl, 'Runde 43: hjelperen til Kamera-API ble ferdig 04:32 uten å si fra.', 1.4, { color: WARN });
        P.m.say(tl, '→ Kamera-API: hent resultatet.', 2.6);
        S.kamera.state(tl, 'work', 3.2);
      }

      if (i === 6) {
        // 06:00 morning
        night(tl, 6, 0, 1.0);
        ['varsler', 'kamera', 'tester'].forEach((k, n) => S[k].state(tl, 'done', 1.0 + n * 0.35));
        P.m.fadeOld(tl, 1.8);
        P.m.say(tl, '06:00. Alt ferdig.', 2.2, { color: OK });
        S.master.state(tl, 'done', 2.4);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
