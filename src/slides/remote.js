import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { attempt, rr, wrap } from '../engine/props.js';
import { codeApp } from '../engine/console.js';

/*
  Tip: let it notify you, and reach it from anywhere. Shown in the Claude Code app on the
  laptop, and on your phone.
    0. Attempt 1, no notifications: Kamera-API stops on a question. The phone stays dark;
       the wait runs to 2 h 40 min.
    1. Attempt 2 (new session), notifications: same question; the phone lights up, you open
       it there and answer "Ja"; the laptop session carries on.
    2. Cloud sessions when the machine isn't running: you start one from the phone; it runs in
       the cloud (clone, edit, test) and delivers a pull request on GitHub; the phone shows it.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    phone      x 126–394, y 248–768 (screen inset 8; status bar y +24–40; home bar y PH-18)
    attempt    x 560–960, y 120–154
    app        x 560–1480, y 170–760
    step 2     arrow x 404–486; cloud x 470–1140, y 240–650 with Claude's spinner (y 360–480),
               status line y 528, step pills x 640–1060, y 560–600, progress bar y 612; arrow x 1140–1180; GitHub x 1186–1480, y 360–590
*/

const AX = 560, AY = 170, AW = 920, AH = 590;
const PX = 130, PY = 248, PW = 260, PH = 520;
const OK = '#8fe3a2', WARN = '#ffd23f', FG = '#f3e9da', MUTED = '#9a8a78';
const TIP0 = 'Remote sessions<br>med <em>notifikasjoner</em>.';
const TIP2 = '<em>Cloud sessions</em> når<br>maskinen ikke kjører.';

export default {
  id: 'remote',
  title: 'Varsler og fjernstyring',
  steps: 3,
  notes: [
    'Uten varsler: sessionen spør om noe og venter. Du er et annet sted. To timer og førti minutter.',
    'Med varsler: telefonen lyser opp, du svarer ja derfra, sessionen går videre.',
    'Maskinen er av? Start en cloud session fra telefonen. Den kloner, retter, tester og leverer en PR på GitHub.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Fjernstyring</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">${TIP0}</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    let loops = [];

    const reset = () => { loops.forEach((l) => l.kill()); loops = []; svg.innerHTML = ''; P = {}; tip.innerHTML = TIP0; gsap.set(tip, { opacity: 1 }); };
    const mono = (wt, sz, c) => ({ style: `font: ${wt} ${sz}px var(--font-mono); fill: ${c}` });

    // your phone: lock screen, notifications, and the session opened remotely
    function phone() {
      const g = D.g(svg, { 'data-unit': '' });
      // side buttons, behind the body
      [[PX - 4, PY + 104, 30], [PX - 4, PY + 146, 46], [PX - 4, PY + 200, 46]].forEach(([x, y, h]) => D.el('rect', { x, y, width: 6, height: h, rx: 2, style: 'fill: #4b4f57' }, g));
      D.el('rect', { x: PX + PW - 2, y: PY + 160, width: 6, height: 74, rx: 2, style: 'fill: #4b4f57' }, g);
      D.el('rect', { x: PX, y: PY, width: PW, height: PH, rx: 40, style: 'fill: #0a0705; stroke: #8b8f96', 'stroke-width': 3, 'data-body': '' }, g);
      // screen with a warm wallpaper
      const gid = `wp-${Math.random().toString(36).slice(2, 7)}`;
      const defs = D.el('defs', {}, g);
      const lg = D.el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0.4, y2: 1 }, defs);
      D.el('stop', { offset: '0%', 'stop-color': '#3a2416' }, lg);
      D.el('stop', { offset: '100%', 'stop-color': '#120c09' }, lg);
      D.el('rect', { x: PX + 8, y: PY + 8, width: PW - 16, height: PH - 16, rx: 33, style: `fill: url(#${gid})` }, g);
      const appBg = D.el('rect', { x: PX + 8, y: PY + 8, width: PW - 16, height: PH - 16, rx: 33, style: 'fill: #1c140e', opacity: 0 }, g);
      // dynamic island
      D.el('rect', { x: PX + PW / 2 - 42, y: PY + 18, width: 84, height: 24, rx: 12, style: 'fill: #000' }, g);
      // status bar: time (when unlocked), signal, wifi, battery
      const sbTime = D.text(g, PX + 40, PY + 36, '14:05', 'sbt', { style: 'font: 700 14px var(--font-display); fill: #f3e9da', opacity: 0 });
      const ix = PX + PW - 84;
      [0, 1, 2, 3].forEach((k) => D.el('rect', { x: ix + k * 5, y: PY + 36 - (4 + k * 2.5), width: 3.5, height: 4 + k * 2.5, rx: 1, style: 'fill: #f3e9da' }, g));
      D.p(g, `M${ix + 26} ${PY + 30} q7 -6 14 0 M${ix + 29} ${PY + 33} q4 -3 8 0`, '', { style: 'fill: none; stroke: #f3e9da', 'stroke-width': 2, 'stroke-linecap': 'round' });
      D.el('circle', { cx: ix + 33, cy: PY + 35.5, r: 1.6, style: 'fill: #f3e9da' }, g);
      D.el('rect', { x: ix + 46, y: PY + 27, width: 22, height: 11, rx: 3, style: 'fill: none; stroke: #f3e9da', 'stroke-width': 1.5 }, g);
      D.el('rect', { x: ix + 48, y: PY + 29, width: 14, height: 7, rx: 1.5, style: 'fill: #f3e9da' }, g);
      // lock screen
      const lock = D.g(g);
      D.el('rect', { x: PX + PW / 2 - 7, y: PY + 62, width: 14, height: 11, rx: 2, style: 'fill: #f3e9da' }, lock);
      D.p(lock, `M${PX + PW / 2 - 4.5} ${PY + 62} v-4 a4.5 4.5 0 0 1 9 0 v4`, '', { style: 'fill: none; stroke: #f3e9da', 'stroke-width': 2 });
      D.text(lock, PX + PW / 2, PY + 98, 'tirsdag 10. desember', 'pd', { 'text-anchor': 'middle', style: 'font: 600 15px var(--font-display); fill: #e6d8c6' });
      const time = D.text(lock, PX + PW / 2, PY + 164, '14:05', 'pt', { 'text-anchor': 'middle', style: 'font: 800 66px var(--font-display); fill: #f3e9da' });
      [[PX + 46, 'M-5 -8 h10 l-2 6 v10 h-6 v-10 Z'], [PX + PW - 46, 'M-9 -5 h4 l2 -3 h6 l2 3 h4 v12 h-18 Z']].forEach(([cx, d]) => {
        D.el('circle', { cx, cy: PY + PH - 62, r: 21, style: 'fill: #2c2119' }, lock);
        D.p(lock, d, '', { transform: `translate(${cx} ${PY + PH - 62})`, style: 'fill: none; stroke: #f3e9da', 'stroke-width': 1.8, 'stroke-linejoin': 'round' });
      });
      // the session, opened on the phone
      const app = D.g(g, { opacity: 0 });
      D.text(app, PX + 26, PY + 70, '‹ Sessions', 'pb', { style: 'font: 600 15px var(--font-display); fill: var(--accent)' });
      D.text(app, PX + 26, PY + 100, 'Kamera-API', 'ph', { style: 'font: 800 22px var(--font-display); fill: #f3e9da' });
      D.p(app, `M${PX + 20} ${PY + 114} H${PX + PW - 20}`, '', { style: 'fill: none; stroke: #33271d', 'stroke-width': 2 });
      D.p(app, rr(PX + 18, PY + PH - 92, PW - 36, 38, [19, 19, 19, 19]), '', { style: 'fill: #241b15; stroke: #4a3c30', 'stroke-width': 2 });
      D.text(app, PX + 36, PY + PH - 67, 'Svar til Claude …', 'pc', mono(400, 14, MUTED));
      // home indicator
      D.el('rect', { x: PX + PW / 2 - 52, y: PY + PH - 20, width: 104, height: 5, rx: 2.5, style: 'fill: #f3e9da' }, g);
      return { g, lock, time, app, appBg, sbTime };
    }
    // a notification banner with the app icon
    function notif(parent, y, title, body) {
      const n = D.g(parent);
      D.p(n, rr(PX + 16, y, PW - 32, 118, [18, 18, 18, 18]), '', { style: 'fill: #3a2c22; stroke: #5a4636', 'stroke-width': 2 });
      D.p(n, rr(PX + 28, y + 12, 26, 26, [7, 7, 7, 7]), '', { style: 'fill: #d97757' });
      D.text(n, PX + 41, y + 31, '✻', 'ni', { 'text-anchor': 'middle', style: 'font: 700 17px var(--font-mono); fill: #fff3e3' });
      D.text(n, PX + 62, y + 30, 'Claude', 'nl', { style: 'font: 700 14px var(--font-display); fill: #e6d8c6' });
      D.text(n, PX + PW - 30, y + 30, 'nå', 'nn', { 'text-anchor': 'end', style: 'font: 400 13px var(--font-display); fill: #b9a88f' });
      D.text(n, PX + 28, y + 62, title, 'nt', { style: 'font: 700 16px var(--font-display); fill: #f3e9da' });
      wrap(body, 22).forEach((l, i) => D.text(n, PX + 28, y + 84 + i * 20, l, 'nb', { style: 'font: 400 15px var(--font-display); fill: #e6d8c6' }));
      return n;
    }
    // the app on the laptop, with Kamera-API stopping on a question
    function laptop(tl, at) {
      const app = codeApp(svg, AX, AY, AW, AH, { size: 18, sidebar: 200 });
      tl.fromTo(app.root, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, at);
      app.session('varsler', 'Varsler', 'done');
      const k = app.session('kamera', 'Kamera-API', 'work');
      app.show(tl, 'kamera', at);
      k.user(tl, 'Lag kamera-API.', at + 0.4);
      k.tool(tl, 'Bash', 'npm run db:migrate', 'Endrer tabellen cameras', at + 0.9);
      const ask = k.ask(tl, 'Kjøre migreringen mot prod?', ['Ja', 'Nei'], at + 1.5);
      k.state(tl, 'wait', at + 1.5);
      k.ctx(tl, 140, at + 0.4, 1.0);
      return { app, k, ask };
    }

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'FORSØK 1 · UTEN VARSLER', 0.3);
        P.ph = phone();
        tl.fromTo(P.ph.g, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.L = laptop(tl, 0.3);
        // nothing reaches you; the wait goes on
        const w = P.L.k.spin(tl, 'Venter på svar', 2.2, { from: 0, to: 2 * 3600 + 40 * 60, dur: 3.6 });
        const clock = { m: 14 * 60 + 5 };
        tl.to(clock, { m: 16 * 60 + 45, duration: 3.6, ease: 'none', onUpdate: () => { P.ph.time.textContent = `${Math.floor(clock.m / 60)}:${String(Math.floor(clock.m % 60)).padStart(2, '0')}`; } }, 2.2);
        P.wait = w;
      }

      if (i === 1) {
        // attempt 2, a new session: the phone lights up, you answer from there
        P.att.show(tl, 'FORSØK 2 · NY SESSION, MED VARSLER', 0);
        tl.to(P.L.app.root, { opacity: 0, duration: 0.4 }, 0);
        tl.call(() => { P.ph.time.textContent = '14:05'; }, null, 0.2);
        P.L = laptop(tl, 0.5);
        const n = notif(P.ph.g, PY + 214, 'Kamera-API venter på deg', 'Kjøre migreringen mot prod?');
        tl.fromTo(n, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)' }, 2.3);
        tl.to(P.ph.g, { x: 4, duration: 0.05, repeat: 7, yoyo: true }, 2.4);
        // open it on the phone: the same session
        const a = P.ph.app;
        D.p(a, rr(PX + 18, PY + 132, PW - 36, 116, [14, 14, 14, 14]), '', { style: `fill: #2a2412; stroke: ${WARN}`, 'stroke-width': 2.5 });
        ['Kjøre migreringen', 'mot prod?'].forEach((l, k) => D.text(a, PX + 34, PY + 162 + k * 24, l, 'pq', mono(700, 16, WARN)));
        const yes = D.g(a);
        D.p(yes, rr(PX + 34, PY + 198, 80, 36, [18, 18, 18, 18]), '', { style: 'fill: var(--accent)' });
        D.text(yes, PX + 74, PY + 222, 'Ja', 'py', { 'text-anchor': 'middle', style: 'font: 700 16px var(--font-display); fill: #1a120c' });
        D.p(a, rr(PX + 124, PY + 198, 80, 36, [18, 18, 18, 18]), '', { style: 'fill: #3a2f18; stroke: #6b5a2a', 'stroke-width': 2 });
        D.text(a, PX + 164, PY + 222, 'Nei', 'pn', { 'text-anchor': 'middle', style: 'font: 700 16px var(--font-display); fill: #f3e9da' });
        tl.to([P.ph.lock, n], { opacity: 0, duration: 0.3 }, 3.2);
        tl.to([a, P.ph.appBg, P.ph.sbTime], { opacity: 1, duration: 0.3 }, 3.4);
        tl.to(yes, { scale: 1.12, transformOrigin: '50% 50%', duration: 0.15, yoyo: true, repeat: 1 }, 4.0);
        const you = D.g(a);
        D.p(you, rr(PX + PW - 18 - 64, PY + 262, 64, 34, [16, 16, 4, 16]), '', { style: 'fill: #3a2d22' });
        D.text(you, PX + PW - 50, PY + 285, 'Ja', 'pu', { 'text-anchor': 'middle', style: 'font: 400 16px var(--font-display); fill: #f3e9da' });
        tl.fromTo(you, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 4.3);
        // the laptop session gets the answer and carries on
        P.L.k.user(tl, 'Ja (fra telefonen)', 4.3);
        P.L.k.state(tl, 'work', 4.4);
        P.run = P.L.k.spin(tl, 'Migrerer', 4.6, { from: 0, to: 30, dur: 1.0 });
        P.run.end(tl, 5.7, '✓ Migrert', 'ok');
        P.L.k.tool(tl, 'Bash', 'npm test', 'Kjører …', 6.0);
        P.n = n;
      }

      if (i === 2) {
        // cloud sessions: started from the phone, run in the cloud, delivered to GitHub
        tl.to(tip, { opacity: 0, duration: 0.25 }, 0);
        tl.call(() => { tip.innerHTML = TIP2; }, null, 0.25);
        tl.to(tip, { opacity: 1, duration: 0.35 }, 0.3);
        tl.to([P.L.app.root, P.att.g], { opacity: 0, duration: 0.4 }, 0);
        // the phone: a new session, in the cloud
        const a = P.ph.app;
        tl.to([...a.children].slice(5), { opacity: 0, duration: 0.3 }, 0.3);
        const ph = D.g(a);
        const head = D.text(ph, PX + 26, PY + 100, 'Varsel-feil', 'ph2', { style: 'font: 800 22px var(--font-display); fill: #f3e9da' });
        D.p(ph, rr(PX + 18, PY + 130, 110, 28, [14, 14, 14, 14]), '', { style: 'fill: #22303a; stroke: #6fa8c8', 'stroke-width': 2 });
        D.text(ph, PX + 73, PY + 149, 'i skyen', 'pc', { 'text-anchor': 'middle', ...mono(700, 14, '#9fd3ff') });
        const bub = D.g(ph);
        D.p(bub, rr(PX + 54, PY + 176, PW - 72, 60, [16, 16, 4, 16]), '', { style: 'fill: #3a2d22' });
        ['Fiks varsel-feilen.', 'Lag en PR.'].forEach((l, k) => D.text(bub, PX + 68, PY + 200 + k * 22, l, 'pu2', { style: 'font: 400 16px var(--font-display); fill: #f3e9da' }));
        tl.to(a.children[1], { opacity: 0, duration: 0.2 }, 0.3);
        tl.fromTo([head, ...[...ph.children].slice(1, 3)], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.5);
        tl.fromTo(bub, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }, 0.8);
        // phone → cloud
        const arrow = (x1, x2, y) => {
          const g = D.g(svg, { 'data-bg': '' });
          D.p(g, `M${x1} ${y} H${x2 - 12}`, '', { style: 'fill: none; stroke: #6fa8c8', 'stroke-width': 3, 'stroke-dasharray': '8 7' });
          D.p(g, `M${x2 - 14} ${y - 8} L${x2} ${y} L${x2 - 14} ${y + 8} Z`, '', { style: 'fill: #6fa8c8' });
          return g;
        };
        const a1 = arrow(PX + PW + 14, 486, 470);
        tl.fromTo(a1, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.2);
        // the cloud, working
        const sky = D.g(svg, { 'data-bg': '' });
        D.p(sky, 'M560 640 C480 640 470 540 540 520 C510 420 600 350 690 382 C700 270 860 240 900 320 C950 240 1090 270 1080 370 C1130 380 1140 470 1100 510 C1140 560 1120 650 1060 640 Z', '', { style: 'fill: #121a20; stroke: #6fa8c8', 'stroke-width': 3 });
        tl.fromTo(sky, { opacity: 0, scale: 0.9, transformOrigin: '50% 60%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.3);
        // inside the cloud: no window, just Claude at work. It keeps running: the spinner turns,
        // the status line moves through the stages, the active stage travels along, data flows.
        const GL = ['✻', '✶', '✳', '✢', '✳', '✶'];
        const work = D.g(svg, { 'data-unit': '' });
        const star = D.text(work, 800, 446, '✻', 'cs', { 'text-anchor': 'middle', style: 'font: 700 100px var(--font-mono); fill: #ff7a2f' });
        const say = D.text(work, 800, 524, '', 'cw', { 'text-anchor': 'middle', style: 'font: 700 24px var(--font-mono); fill: #ff7a2f' });
        tl.fromTo(work, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.6);
        const STAGES = [['klon', 'Kloner kamera-api'], ['rett', 'Retter varsler.ts'], ['test', 'Kjører testene'], ['PR', 'Lager PR']];
        const pills = STAGES.map(([l], k) => {
          const x = 640 + k * 108, y = 556;
          const sg = D.g(svg, { 'data-unit': '' });
          const pill = D.p(sg, rr(x, y, 96, 38, [19, 19, 19, 19]), '', { style: 'fill: #121a20; stroke: #4a6a80', 'stroke-width': 2.5 });
          const label = D.text(sg, x + 48, y + 26, l, 'cl', { 'text-anchor': 'middle', style: 'font: 700 17px var(--font-display); fill: #9fb8c8' });
          tl.fromTo(sg, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.7 + k * 0.08);
          return { sg, pill, label };
        });
        const bar = D.g(svg, { 'data-bg': '' });
        D.p(bar, rr(640, 608, 420, 8, [4, 4, 4, 4]), '', { style: 'fill: #1c2a34' });
        const fill = D.el('rect', { x: 640, y: 608, width: 0, height: 8, rx: 4, style: 'fill: #ff7a2f' }, bar);
        tl.fromTo(bar, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.7);
        const paint = (t) => {
          // t: seconds of running time
          const cyc = 2.8, ph = (t % cyc) / cyc, k = Math.min(3, Math.floor(ph * 4));
          star.textContent = GL[Math.floor(t * 10) % GL.length];
          say.textContent = `${STAGES[k][1]} … ${Math.floor(t * 1.5)}m`;
          fill.setAttribute('width', 420 * ph);
          pills.forEach((p, n) => {
            const on = n === k, done = n < k;
            p.pill.setAttribute('style', on ? 'fill: #2a1d12; stroke: #ff7a2f' : done ? `fill: #142218; stroke: ${OK}` : 'fill: #121a20; stroke: #4a6a80');
            p.label.setAttribute('style', `font: 700 17px var(--font-display); fill: ${on ? '#ffb08a' : done ? OK : '#9fb8c8'}`);
          });
          star.setAttribute('transform', `scale(${1 + 0.06 * Math.sin(t * 6)})`);
          star.setAttribute('transform-origin', '800 412');
        };
        paint(0);
        // data flowing along an arrow, on a loop
        const flow = (x1, x2, y) => {
          const dots = [0, 1, 2].map(() => D.el('circle', { cx: x1, cy: y, r: 5, style: 'fill: #e6f2fa', opacity: 0, 'data-bg': '' }, svg));
          return () => dots.forEach((d, k) => loops.push(gsap.fromTo(d, { attr: { cx: x1 }, opacity: 1 }, { attr: { cx: x2 - 14 }, opacity: 0.2, duration: 0.9, ease: 'none', repeat: -1, delay: k * 0.3 })));
        };
        const flow1 = flow(PX + PW + 14, 486, 470), flow2 = flow(1140, 1180, 470);
        tl.call(() => {
          flow1();
          const run = { t: 0 };
          loops.push(gsap.to(run, { t: 600, duration: 600, ease: 'none', onUpdate: () => paint(run.t) }));
        }, null, 1.6);
        // cloud → GitHub
        const a2 = arrow(1140, 1180, 470);
        tl.fromTo(a2, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 3.9);
        tl.call(() => flow2(), null, 4.0);
        const gh = D.g(svg, { 'data-unit': '' });
        D.p(gh, rr(1186, 360, 294, 230, [12, 12, 12, 12]), '', { style: 'fill: #0d1117; stroke: var(--fg)', 'stroke-width': 2.5 });
        D.text(gh, 1206, 396, 'GitHub', 'gh', { style: 'font: 800 22px var(--font-display); fill: #f3e9da' });
        D.text(gh, 1206, 420, 'kamera-api', 'gr', mono(400, 15, MUTED));
        D.p(gh, `M1200 436 H1466`, '', { style: 'fill: none; stroke: #30363d', 'stroke-width': 2 });
        D.p(gh, rr(1206, 452, 76, 26, [13, 13, 13, 13]), '', { style: 'fill: #238636' });
        D.text(gh, 1244, 470, 'Open', 'go', { 'text-anchor': 'middle', style: 'font: 700 14px var(--font-display); fill: #fff' });
        D.text(gh, 1292, 471, '#142', 'gn', mono(700, 16, MUTED));
        D.text(gh, 1206, 508, 'Fiks varsel-feilen', 'gt', { style: 'font: 700 17px var(--font-display); fill: #f3e9da' });
        D.text(gh, 1206, 540, '✓ 41 tester bestått', 'gc', mono(700, 15, OK));
        D.text(gh, 1206, 566, '+6 −2 · 1 fil', 'gf', mono(400, 14, MUTED));
        tl.fromTo(gh, { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.4 }, 4.1);
        // and back on the phone
        const done = D.g(ph);
        D.text(done, PX + 26, PY + 274, '✓ PR #142 klar', 'pd2', mono(700, 16, OK));
        D.text(done, PX + 26, PY + 298, '41 tester bestått.', 'pd3', mono(400, 15, '#cfc3b2'));
        tl.fromTo(done, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 4.6);
        tl.to(P.ph.g, { x: 4, duration: 0.05, repeat: 7, yoyo: true }, 4.6);
      }
      return tl;
    };

    const st = D.stepper(ctx, { reset, play });
    return { ...st, dispose() { loops.forEach((l) => l.kill()); } };
  },
};
