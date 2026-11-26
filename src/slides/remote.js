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
    2. You close the laptop. The session runs on in the cloud; the phone shows it finishing.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    phone      x 126–394, y 248–768 (screen inset 8; status bar y +24–40; home bar y PH-18)
    attempt    x 560–960, y 120–154
    app        x 560–1480, y 170–760 (step 2: closed laptop y 712–742; cloud x 600–1420,
               y 220–640, with the session inside x 760–1280, y 330–600)
*/

const AX = 560, AY = 170, AW = 920, AH = 590;
const PX = 130, PY = 248, PW = 260, PH = 520;
const OK = '#8fe3a2', WARN = '#ffd23f', FG = '#f3e9da', MUTED = '#9a8a78';

export default {
  id: 'remote',
  title: 'Varsler og fjernstyring',
  steps: 3,
  notes: [
    'Uten varsler: sessionen spør om noe og venter. Du er et annet sted. To timer og førti minutter.',
    'Med varsler: telefonen lyser opp, du svarer ja derfra, sessionen går videre.',
    'Lukk laptopen. Den fortsetter i skyen, og du ser den bli ferdig på telefonen.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Fjernstyring</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Få beskjed når den<br><em>trenger deg</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };
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
        // close the laptop: the session moves to the cloud and finishes there
        const r = P.L.app.root;
        tl.to(r, { scaleY: 0.03, transformOrigin: '50% 100%', duration: 0.6, ease: 'power2.in' }, 0.3);
        tl.to(r, { opacity: 0, duration: 0.3 }, 0.9);
        // the closed laptop, and the session carrying on in the cloud
        const lap = D.g(svg, { 'data-bg': '' });
        D.p(lap, rr(860, 712, 320, 14, [4, 4, 2, 2]), '', { style: 'fill: #4b4f57; stroke: #1a120c', 'stroke-width': 2.5 });
        D.p(lap, 'M840 726 H1200 L1186 742 H854 Z', '', { style: 'fill: #3a3d44; stroke: #1a120c', 'stroke-width': 2.5 });
        tl.fromTo(lap, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.9);
        const sky = D.g(svg, { 'data-bg': '' });
        D.p(sky, 'M690 630 C610 630 600 520 680 500 C650 400 740 330 830 362 C850 250 1010 220 1060 300 C1110 220 1290 250 1290 350 C1380 350 1420 470 1350 515 C1420 560 1380 640 1300 630 Z', '', { style: 'fill: #121a20; stroke: #6fa8c8', 'stroke-width': 3 });
        tl.fromTo(sky, { opacity: 0, scale: 0.9, transformOrigin: '50% 60%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.1);
        const C = codeApp(svg, 760, 330, 520, 270, { size: 16, sidebar: 150, title: 'Claude Code · sky' });
        const ck = C.session('kamera', 'Kamera-API', 'work');
        ck.ctx(tl, 160, 1.4, 0.1);
        C.show(tl, 'kamera', 1.4);
        tl.fromTo(C.root, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.4);
        const cs = ck.spin(tl, 'npm test', 1.6, { from: 0, to: 9 * 60, dur: 1.6 });
        cs.end(tl, 3.3, '✓ Ferdig. 41 bestått.', 'ok');
        ck.state(tl, 'done', 3.3);
        const a = P.ph.app;
        tl.to([...a.children].slice(5), { opacity: 0.3, duration: 0.3 }, 1.0);
        const cloud = D.g(a);
        D.p(cloud, rr(PX + 18, PY + 310, 110, 28, [14, 14, 14, 14]), '', { style: 'fill: #22303a; stroke: #6fa8c8', 'stroke-width': 2 });
        D.text(cloud, PX + 73, PY + 329, 'i skyen', 'pc', { 'text-anchor': 'middle', ...mono(700, 14, '#9fd3ff') });
        tl.fromTo(cloud, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.3);
        const lines = D.g(a);
        const sp = D.text(lines, PX + 26, PY + 370, '', 'ps', mono(700, 16, '#ff7a2f'));
        const st = { v: 0 };
        tl.fromTo(lines, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 1.6);
        tl.fromTo(st, { v: 0 }, { v: 9 * 60, duration: 1.6, ease: 'none', onUpdate: () => { sp.textContent = `✻ npm test … ${Math.floor(st.v / 60)}m`; } }, 1.6);
        tl.call(() => { sp.textContent = '✓ Ferdig'; sp.setAttribute('style', `font: 700 16px var(--font-mono); fill: ${OK}`); }, null, 3.3);
        const done = D.text(lines, PX + 26, PY + 396, '41 tester bestått.', 'pf', mono(400, 15, '#cfc3b2'));
        tl.fromTo(done, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 3.3);
        tl.to(P.ph.g, { x: 4, duration: 0.05, repeat: 7, yoyo: true }, 3.4);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
