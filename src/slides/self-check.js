import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure } from '../engine/characters.js';
import { chatPhone, attempt, FILL } from '../engine/props.js';

/*
  Tip: let the AI check its own work. The founder is out delivering firewood while the AI
  builds the order page; every "Ferdig!" that isn't finished stops the truck.
    0. Attempt 1: "Lag bestillingssiden." The truck sets out. Stop 1: the phone buzzes,
       "Ferdig!", the page has Bestill cut off on mobile. "Nei, …"
    1. Stop 2: price 0 kr. Stop 3: delivery on a Sunday. The last stop comes after dark; the
       customer has been waiting in the doorway.
    2. Attempt 2 (new session): "… sjekk den selv på mobil og kjør bestillingstesten …". The
       truck drives the whole route; the AI catches the same three faults on its own in the
       background. One notification at the end, the page is right. "Ja."

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    attempt    x 560–1000, y 120–154
    chat       x 80–520, y 262–782
    checks     x 600–1140, y 190–470 (step 2)
    page       x 1180–1440, y 176–470
    route      houses x 695–1435, y 520–640 · road y 646–680 · names y 708
               truck front at F, body F-150..F, y 599–672 · customer x 1470–1530, y 470–640
*/

const F = [820, 1030, 1240, 1450];              // truck front at each stop
const START = 700;
const NAMES = ['Majorstua', 'Frogner', 'Grünerløkka', 'Sagene'];
const ROAD = 672;
const OK = '#8fe3a2', BAD = '#ff6f9c';
const KUNDE = { hair: 'bun', hairColor: '#8a5a34', skin: '#e8b894', outfit: 'sweater', color: '#5a6b3c' };

export default {
  id: 'self-check',
  title: 'La AI-en sjekke sitt eget arbeid',
  steps: 3,
  thumbStep: 2,
  notes: [
    'Du er ute og kjører ved. Den sier ferdig, du stopper, siden er ikke ferdig.',
    'Stopp etter stopp. Siste kunde har stått og ventet.',
    'Samme feil, men den finner dem selv. Du blir avbrutt én gang, og da er det ferdig.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Kvalitet</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">La AI-en sjekke<br><em>sitt eget arbeid</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    // the route: four houses along a road, a log stack waiting at each door
    function route(customer) {
      const g = D.g(svg);
      const bg = D.g(g, { 'data-bg': '' });
      D.el('rect', { x: 590, y: 646, width: 900, height: 34, rx: 4, ...FILL('#2a1d14', 2) }, bg);
      D.p(bg, 'M600 663 H1480', '', { style: 'fill: none; stroke: #6b5a48', 'stroke-width': 3, 'stroke-dasharray': '16 14' });
      const lit = [], logs = [];
      F.forEach((f, k) => {
        const x = f - 125;
        D.el('rect', { x, y: 560, width: 110, height: 80, rx: 3, ...FILL(['#7a4a2e', '#4f5f6b', '#8a6a3a', '#5a4a6b'][k], 2.5) }, bg);
        D.p(bg, `M${x - 8} 562 L${x + 55} 522 L${x + 118} 562 Z`, '', FILL('#3a2416', 2.5));
        D.el('rect', { x: x + 14, y: 576, width: 30, height: 26, rx: 2, ...FILL('#2a1d14', 2) }, bg);
        lit.push(D.el('rect', { x: x + 14, y: 576, width: 30, height: 26, rx: 2, ...FILL('#ffb04a', 2), opacity: 0 }, bg));
        D.el('rect', { x: x + 66, y: 590, width: 28, height: 50, rx: 2, ...FILL('#2a1d14', 2) }, bg);
        D.text(g, f - 70, 708, NAMES[k].toUpperCase(), 'rn', { 'text-anchor': 'middle', style: 'font: 700 14px var(--font-mono); letter-spacing: .1em; fill: var(--muted)', 'data-unit': '' });
        const l = D.g(g, { 'data-bg': '', opacity: 0 });
        [[f - 44, 631], [f - 26, 631], [f - 35, 615]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 9, ...FILL('#c9935a', 2) }, l));
        logs.push(l);
      });
      const cust = figure(g, { x: 1500, y: 545, s: 0.38, pose: 'stand', ...customer, ...KUNDE });
      const tr = truck(g);
      return { g, lit, logs, cust, tr };
    }
    // the delivery truck from the idea slide, smaller; its front bumper sits at (0, 0)
    function truck(parent) {
      const o = D.g(parent, { 'data-unit': '' });
      const t = D.g(o, { transform: 'translate(-634.8 -373.2) scale(0.6)' });
      D.el('rect', { x: 808, y: 578, width: 182, height: 20, rx: 3, ...FILL('#6b4a30', 4) }, t);
      [812, 976].forEach((x) => D.el('rect', { x, y: 500, width: 10, height: 80, rx: 2, ...FILL('#4a3020', 3.5) }, t));
      D.p(t, 'M992 598 V538 H1030 L1058 566 V598 Z', '', FILL('#ff5a1f', 4));
      D.el('rect', { x: 1000, y: 546, width: 26, height: 20, rx: 3, style: 'fill: #a9c6d6; stroke: #1a120c', 'stroke-width': 3.5 }, t);
      [[862, 514], [890, 514], [918, 514], [848, 539], [876, 539], [904, 539], [932, 539], [834, 564], [862, 564], [890, 564], [918, 564], [946, 564]]
        .forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 13, ...FILL('#c9935a', 3.5) }, t));
      [850, 1020].forEach((cx) => D.el('circle', { cx, cy: 606, r: 16, ...FILL('#2a1d14', 4) }, t));
      gsap.set(o, { x: START, y: ROAD });
      return o;
    }
    const drive = (tl, tr, k, at, d = 1.2) => tl.to(tr, { x: F[k], duration: d, ease: 'power1.inOut' }, at);
    const buzz = (tl, at) => tl.fromTo(P.chat.root, { x: 0 }, { x: 4, duration: 0.05, repeat: 7, yoyo: true, immediateRender: false }, at);

    // the order page as you see it on your phone; one fault at a time
    function page(flaw) {
      const g = D.g(svg, { 'data-unit': '' });
      const x = 1180, y = 190, w = 260, h = 280;
      D.text(g, x, y - 14, 'BESTILLINGSSIDEN', 'pl', { style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      D.el('rect', { x, y, width: w, height: h, rx: 18, style: 'fill: #1a0d07; stroke: var(--fg)', 'stroke-width': 2.5 }, g);
      const id = `sc-clip-${Math.random().toString(36).slice(2, 7)}`;
      const cp = D.el('clipPath', { id }, g);
      D.el('rect', { x: x + 3, y: y + 3, width: w - 6, height: h - 6, rx: 16 }, cp);
      const c = D.g(g, { 'clip-path': `url(#${id})` });
      D.text(c, x + 20, y + 38, 'Ved.', 'pv', { style: 'font: 800 20px var(--font-display); fill: #fff3e3' });
      D.text(c, x + 20, y + 80, 'Bestill ved', 'pt', { style: 'font: 800 24px var(--font-display); fill: #fff3e3' });
      D.text(c, x + 20, y + 118, '40 L sekk', 'pr', { style: 'font: 600 18px var(--font-display); fill: #d9c6b0' });
      D.text(c, x + 20, y + 150, flaw === 'price' ? '0 kr' : '590 kr', 'pr', { style: `font: 700 18px var(--font-display); fill: ${flaw === 'price' ? BAD : '#d9c6b0'}` });
      D.text(c, x + 20, y + 182, flaw === 'day' ? 'Søndag 15. des' : 'Torsdag 12. des', 'pr', { style: `font: 700 18px var(--font-display); fill: ${flaw === 'day' ? BAD : '#d9c6b0'}` });
      const bx = flaw === 'btn' ? x + 172 : x + 20;
      D.el('rect', { x: bx, y: y + 210, width: 220, height: 44, rx: 22, style: 'fill: #ff8a3d' }, c);
      D.text(c, bx + 110, y + 238, 'Bestill', 'pb', { 'text-anchor': 'middle', style: 'font: 800 18px var(--font-display); fill: #1a0d07' });
      const ring = { btn: [x + 218, y + 232, 52, 32], price: [x + 42, y + 144, 40, 22], day: [x + 90, y + 176, 86, 22] }[flaw];
      if (ring) D.p(g, D.roughEllipse(...ring), '', { style: `fill: none; stroke: ${BAD}`, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
      return g;
    }
    const swapPage = (tl, flaw, at) => {
      if (P.page) tl.to(P.page, { opacity: 0, duration: 0.25 }, at);
      P.page = page(flaw);
      tl.fromTo(P.page, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at + 0.3);
    };

    // one interruption: drive to the stop, the phone buzzes, open the page, answer, unload
    const ROUNDS = [
      ['Ferdig!', 'btn', 'Nei, Bestill-knappen er kuttet på mobil.'],
      ['Ferdig! Knappen er fikset.', 'price', 'Nå står prisen på 0 kr.'],
      ['Ferdig! Prisen er fikset.', 'day', 'Levering på søndag? Vi kjører ikke da.'],
    ];
    const round = (tl, k, t) => {
      const [done, flaw, no] = ROUNDS[k];
      drive(tl, P.r.tr, k, t);
      t += 1.3;
      buzz(tl, t);
      P.chat.reply(tl, done, t + 0.1);
      swapPage(tl, flaw, t + 0.5);
      P.chat.user(tl, no, t + 1.7);
      tl.to(P.r.logs[k], { opacity: 1, duration: 0.3 }, t + 2.4);
      return t + 2.9;
    };

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'FORSØK 1', 0.3);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.r = route({ arms: 'down' });
        tl.fromTo(P.r.g, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.4);
        P.chat.user(tl, 'Lag bestillingssiden.', 0.9);
        const t = P.chat.think(tl, 1.4, 0.8);
        P.chat.reply(tl, 'Ok. Jeg sier fra når den er ferdig.', t);
        round(tl, 0, t + 0.6);
      }

      if (i === 1) {
        let t = round(tl, 1, 0.2);
        t = round(tl, 2, t);
        // the last stop, after dark: the customer has been waiting
        drive(tl, P.r.tr, 3, t);
        tl.to(P.r.lit, { opacity: 1, duration: 0.8, stagger: 0.1 }, t + 0.2);
        P.r.cust.expr(tl, { brows: 'annoyed', mouth: 'frown' }, t + 0.6);
        tl.to(P.r.logs[3], { opacity: 1, duration: 0.3 }, t + 1.8);
        ctx.focus(tl, [P.r.cust.root, P.r.tr, ...P.r.lit, P.r.logs[3]], t + 1.0);
      }

      if (i === 2) {
        // a new session; the same day again
        P.att.show(tl, 'FORSØK 2 · NY SESSION', 0);
        P.chat.clear(tl, 0);
        tl.to([P.r.g, P.page], { opacity: 0, duration: 0.4 }, 0);
        P.page = null;
        const r = route({ arms: 'down' });
        tl.fromTo(r.g, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.5);
        P.chat.user(tl, 'Lag bestillingssiden. Sjekk den selv på mobil og kjør bestillingstesten før du sier ferdig.', 0.8);
        let t = P.chat.think(tl, 1.4, 0.8);
        P.chat.reply(tl, 'Ok.', t);
        // the AI works in the background and catches the same faults itself
        const chk = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 600, y: 190, width: 540, height: 280, rx: 14, style: 'fill: #0f0a07; stroke: var(--fg)', 'stroke-width': 2.5 }, chk);
        D.text(chk, 624, 226, 'CLAUDE · I BAKGRUNNEN', 'ck', { style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--accent)' });
        tl.fromTo(chk, { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 0.3);
        const ROWS = [['Skjermbilde mobil', 'Bestill kuttet'], ['Bestillingstest', 'Pris 0 kr'], ['Bestillingstest', 'Søndag'], ['Bestillingstest', '']];
        ROWS.forEach(([act, found], k) => {
          const y = 276 + k * 50, at = t + 0.8 + k * 1.4;
          const a = D.text(chk, 624, y, act, 'ca', { style: 'font: 700 18px var(--font-display); fill: var(--fg)', opacity: 0 });
          tl.to(a, { opacity: 1, duration: 0.2 }, at);
          if (found) {
            const f = D.text(chk, 830, y, found, 'cf', { style: `font: 700 18px var(--font-display); fill: ${BAD}`, opacity: 0 });
            const x = D.text(chk, 1010, y, 'fikset', 'cx', { style: `font: 700 16px var(--font-mono); fill: ${OK}`, opacity: 0 });
            tl.to(f, { opacity: 1, duration: 0.2 }, at + 0.4);
            tl.to(x, { opacity: 1, duration: 0.2 }, at + 0.9);
          } else {
            const g2 = D.text(chk, 830, y, 'grønn', 'cg', { style: `font: 700 18px var(--font-display); fill: ${OK}`, opacity: 0 });
            tl.to(g2, { opacity: 1, duration: 0.2 }, at + 0.4);
          }
        });
        // meanwhile the truck drives the whole route without stopping for the phone
        let d = t + 0.6;
        F.forEach((f, k) => {
          drive(tl, r.tr, k, d, 1.0);
          tl.to(r.logs[k], { opacity: 1, duration: 0.3 }, d + 1.1);
          d += 1.5;
        });
        r.cust.expr(tl, { mouth: 'smile' }, d - 0.3);
        // one notification, and it is finished
        t = Math.max(d, t + 0.8 + 4 * 1.4) + 0.3;
        buzz(tl, t);
        P.chat.reply(tl, 'Ferdig. Sjekket på mobil, bestillingen er testet.', t + 0.1);
        swapPage(tl, null, t + 0.5);
        P.chat.user(tl, 'Ja.', t + 1.6);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
