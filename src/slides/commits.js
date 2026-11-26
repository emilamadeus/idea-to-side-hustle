import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone } from '../engine/props.js';

/*
  Tip: commit after every finished step. Each one is a save point; when the AI takes a wrong
  turn you go one step back instead of untangling it. The firewood subscription.
    0. "Commit etter hvert ferdige steg." Bydeler, Kunder, Abonnement become save points on a
       line; HEAD follows; the tests are green.
    1. "Lag pause-funksjonen." Done, committed, but two tests turn red: pause changed how the
       delivery days are worked out.
    2. "Gå tilbake ett steg." The bad commit leaves, HEAD is back on Abonnement, all green.
       Then pause again, without touching the delivery days: committed, green.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782
    history    x 600–1480: HEAD tag y 252–284, line and nodes y 330, hash y 378, message y 404
    tests      x 600–1060, y 470–720
*/

const NX = [680, 860, 1040, 1220]; // commit slots
const NY = 330;
const COMMITS = [['a3f9c12', 'Bydeler'], ['7d21e04', 'Kunder'], ['1c88b9a', 'Abonnement']];
const TESTS = ['Bestilling', 'Abonnement', 'Leveringsdager'];
const OK = '#8fe3a2', BAD = '#ff6f9c';

export default {
  id: 'commits',
  title: 'Commit etter hvert steg',
  steps: 3,
  notes: [
    'Be om en commit etter hvert ferdige steg. Hver blir et lagringspunkt.',
    'Pause-funksjonen er ferdig, men den har endret hvordan leveringsdagene regnes ut. To tester røde.',
    'Ett steg tilbake, i stedet for å rydde opp. Så pause på nytt, uten å røre leveringsdagene.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Bygg</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Commit etter<br>hvert <em>steg</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    // a commit: a node on the line, its hash and message underneath
    function node(k, hash, msg, color = 'var(--accent)') {
      const g = D.g(svg, { 'data-unit': '' });
      D.el('circle', { cx: NX[k], cy: NY, r: 20, style: `fill: #1d1510; stroke: ${color}`, 'stroke-width': 5 }, g);
      D.el('circle', { cx: NX[k], cy: NY, r: 8, style: `fill: ${color}` }, g);
      D.text(g, NX[k], NY + 48, hash, 'ch', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); fill: var(--muted)' });
      D.text(g, NX[k], NY + 76, msg, 'cm', { 'text-anchor': 'middle', style: 'font: 700 20px var(--font-display); fill: var(--fg)' });
      return g;
    }
    function edge(k, color = '#6b5a48') {
      return D.p(svg, `M${NX[k] + 24} ${NY} H${NX[k + 1] - 24}`, '', { style: `fill: none; stroke: ${color}`, 'stroke-width': 4, 'stroke-linecap': 'round', 'data-bg': '' });
    }
    const pop = (tl, g, at) => tl.fromTo(g, { opacity: 0, scale: 0.4, transformOrigin: '50% 30%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, at);
    // HEAD: where you are
    function head() {
      const g = D.g(svg, { 'data-unit': '' });
      D.el('rect', { x: -38, y: 252, width: 76, height: 30, rx: 15, style: 'fill: var(--accent)' }, g);
      D.text(g, 0, 273, 'HEAD', 'hd', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); letter-spacing: .1em; fill: #1a120c' });
      D.p(g, 'M0 284 V302', '', { style: 'fill: none; stroke: var(--accent)', 'stroke-width': 3 });
      return g;
    }
    // the tests: one row per feature, ✓ or ✗
    function tests() {
      const g = D.g(svg, { 'data-unit': '' });
      D.el('rect', { x: 600, y: 470, width: 460, height: 60 + TESTS.length * 50 + 50, rx: 12, style: 'fill: #0f0a07; stroke: var(--fg)', 'stroke-width': 2.5 }, g);
      D.text(g, 624, 506, 'TESTER', 'tt', { style: 'font: 700 15px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
      const rows = [...TESTS, 'Pause'].map((name, k) => {
        const y = 552 + k * 50;
        const r = D.g(g, { opacity: k < TESTS.length ? 1 : 0 });
        const mark = D.text(r, 630, y, '✓', 'tm', { style: `font: 700 22px var(--font-mono); fill: ${OK}` });
        D.text(r, 666, y, name, 'tn', { style: 'font: 700 20px var(--font-display); fill: var(--fg)' });
        return { r, mark };
      });
      return { g, rows };
    }
    const setTest = (tl, k, ok, at) => tl.call(() => {
      const m = P.tests.rows[k].mark;
      m.textContent = ok ? '✓' : '✗';
      m.setAttribute('style', `font: 700 22px var(--font-mono); fill: ${ok ? OK : BAD}`);
    }, null, at);

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, 'Commit etter hvert ferdige steg.', 0.8);
        const t = P.chat.think(tl, 1.3, 0.8);
        P.chat.reply(tl, 'Ok.', t);
        // the save points, one per finished step; HEAD follows the latest
        P.head = head();
        gsap.set(P.head, { x: NX[0] });
        P.nodes = COMMITS.map(([h, m], k) => node(k, h, m));
        P.edges = [edge(0), edge(1)];
        COMMITS.forEach((c, k) => {
          const at = t + 0.5 + k * 0.8;
          if (k) tl.add(D.drawOn(P.edges[k - 1], { duration: 0.3 }), at - 0.3);
          pop(tl, P.nodes[k], at);
          if (k === 0) tl.fromTo(P.head, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at + 0.1);
          else tl.to(P.head, { x: NX[k], duration: 0.4, ease: 'power2.inOut' }, at + 0.1);
        });
        P.tests = tests();
        tl.fromTo(P.tests.g, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, t + 2.8);
      }

      if (i === 1) {
        // a wrong turn: done and committed, but it broke what worked
        P.chat.user(tl, 'Lag pause-funksjonen.', 0.2);
        const t = P.chat.think(tl, 0.7, 1.2);
        P.chat.reply(tl, 'Ferdig. Committet.', t);
        P.badEdge = edge(2);
        P.bad = node(3, '4e07f3d', 'Pause');
        tl.add(D.drawOn(P.badEdge, { duration: 0.3 }), t + 0.2);
        pop(tl, P.bad, t + 0.4);
        tl.to(P.head, { x: NX[3], duration: 0.4, ease: 'power2.inOut' }, t + 0.5);
        // the tests run: two go red
        setTest(tl, 1, false, t + 1.4);
        setTest(tl, 2, false, t + 1.7);
        tl.fromTo([P.tests.rows[1].r, P.tests.rows[2].r], { x: 0 }, { x: 4, duration: 0.05, repeat: 5, yoyo: true, immediateRender: false }, t + 1.8);
        tl.call(() => {
          P.bad.querySelectorAll('circle').forEach((c, j) => c.setAttribute('style', j ? `fill: ${BAD}` : `fill: #1d1510; stroke: ${BAD}`));
        }, null, t + 1.8);
        ctx.focus(tl, [P.bad, P.tests.g, P.chat.root, P.head], t + 1.3);
      }

      if (i === 2) {
        // one step back, then the same feature again, done differently
        P.chat.user(tl, 'Gå tilbake ett steg.', 0.2);
        let t = P.chat.think(tl, 0.6, 0.8);
        P.chat.reply(tl, 'Tilbake på «Abonnement». Alt er grønt.', t);
        tl.to([P.bad, P.badEdge], { opacity: 0, duration: 0.4 }, t);
        tl.to(P.head, { x: NX[2], duration: 0.4, ease: 'power2.inOut' }, t + 0.3);
        setTest(tl, 1, true, t + 0.6);
        setTest(tl, 2, true, t + 0.8);
        P.chat.user(tl, 'Prøv pause igjen, uten å røre leveringsdagene.', t + 1.6);
        t = P.chat.think(tl, t + 2.2, 1.2);
        P.chat.reply(tl, 'Ferdig. Committet.', t);
        const e = edge(2), n = node(3, '9b2c4a0', 'Pause', OK);
        tl.add(D.drawOn(e, { duration: 0.3 }), t + 0.2);
        pop(tl, n, t + 0.4);
        tl.to(P.head, { x: NX[3], duration: 0.4, ease: 'power2.inOut' }, t + 0.5);
        tl.to(P.tests.rows[3].r, { opacity: 1, duration: 0.3 }, t + 1.0);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
