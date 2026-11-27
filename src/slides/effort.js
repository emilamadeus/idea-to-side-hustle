import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, tokenMeter, FILL, vedTruck } from '../engine/props.js';

/*
  Tip: Opus 5.5 on medium is enough. More effort isn't better.
    0. Attempt 1, medium: "Bygg en bro, så vedbilen kommer over elva." A clean bridge, done; the
       firewood truck drives across.
    1. Attempt 2 (new session), dial at max: same request. It builds the same clean bridge,
       then keeps going: extra pillars, a second deck, a tower. The bridge sags, and the truck
       stops on the bank. Pencil: it was done three rounds ago.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782
    attempt    x 560–960, y 120–154
    dial       centre (1340, 250), r 90 (labels inside x 1220–1460, y 150–290)
    river      x 600–1480, y 560–760; bridge deck y 520
    pencil     x 600–1000, y 200–260
*/

const DY = 520, X0 = 640, X1 = 1440;

export default {
  id: 'effort',
  title: 'Modell og effort',
  steps: 2,
  notes: [
    'Opus 5.5 på medium. Rask og stødig. Broen står.',
    'Samme oppgave på maks. Den tviler på en løsning som var ferdig. Til slutt henger den.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Modell</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Medium effort<br>er <em>nok</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    function dial(g) {
      const d = D.g(g, { 'data-unit': '' });
      const cx = 1340, cy = 270, r = 100;
      D.p(d, `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`, '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 14, 'stroke-linecap': 'round' });
      const labels = ['lav', 'medium', 'høy', 'maks'];
      labels.forEach((l, k) => {
        const a = Math.PI - (k / 3) * Math.PI;
        D.text(d, cx + Math.cos(a) * (r + 34), cy - Math.sin(a) * (r + 34) + 6, l, 'dl', { 'text-anchor': 'middle', style: 'font: 700 16px var(--font-mono); fill: var(--muted)' });
      });
      D.text(d, cx, cy + 40, 'OPUS 5.5', 'dm', { 'text-anchor': 'middle', style: 'font: 700 18px var(--font-mono); letter-spacing: .12em; fill: var(--accent-2)' });
      const needle = D.p(d, `M${cx} ${cy} L${cx - r + 20} ${cy}`, '', { style: 'fill: none; stroke: #ff5a1f', 'stroke-width': 6, 'stroke-linecap': 'round' });
      D.el('circle', { cx, cy, r: 9, style: 'fill: #fff3e3' }, d);
      d.set = (tl, k, at) => tl.to(needle, { rotation: (k / 3) * 180, svgOrigin: `${cx} ${cy}`, duration: 0.6, ease: 'back.out(1.6)' }, at);
      return d;
    }
    // the river in section: earth banks with grass, water with slow waves
    function river(g) {
      const r = D.g(g, { 'data-bg': '' });
      const grad = D.el('linearGradient', { id: 'ef-water', x1: 0, y1: 0, x2: 0, y2: 1 }, r);
      D.el('stop', { offset: 0, 'stop-color': '#3a7196' }, grad);
      D.el('stop', { offset: 1, 'stop-color': '#1d3a52' }, grad);
      D.p(r, `M${X0 + 76} 640 H${X1 - 76} L${X1 - 84} 756 H${X0 + 84} Z`, '', { style: 'fill: url(#ef-water); stroke: none' });
      // the banks, earth with a grass edge
      const bank = (side) => {
        const d = side < 0
          ? `M600 ${DY + 30} H${X0 + 40} L${X0 + 84} 760 H600 Z`
          : `M1480 ${DY + 30} H${X1 - 40} L${X1 - 84} 760 H1480 Z`;
        D.p(r, d, '', { style: 'fill: #3a2a1e; stroke: #1a120c; stroke-linejoin: round', 'stroke-width': 2.5 });
        D.p(r, side < 0 ? `M600 ${DY + 30} H${X0 + 40}` : `M1480 ${DY + 30} H${X1 - 40}`, '', { style: 'fill: none; stroke: #6b8a3a', 'stroke-width': 6, 'stroke-linecap': 'round' });
        for (let k = 0; k < 4; k++) {
          const y = DY + 70 + k * 46, x = side < 0 ? 612 + (k % 2) * 18 : 1440 - (k % 2) * 18;
          D.p(r, `M${x} ${y} l18 -10`, '', { style: 'fill: none; stroke: #5a4430', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
        }
      };
      bank(-1); bank(1);
      r.waves = [0, 1, 2].map((k) => D.p(r, '', '', { style: 'fill: none; stroke: #bfe0f2; opacity: .45', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
      return r;
    }
    // the waves drift, slowly
    const waveTick = (t) => {
      if (!P.river) return;
      P.river.waves.forEach((w, k) => {
        const y = 664 + k * 30, x0 = X0 + 110 + k * 30, x1 = X1 - 110 - k * 20;
        let d = `M${x0} ${y}`;
        for (let x = x0; x <= x1; x += 20) d += ` L${x} ${y + Math.sin(x * 0.04 + t * 1.4 + k) * 4}`;
        w.setAttribute('d', d);
      });
    };
    ctx.tick(waveTick);
    // the clean bridge: deck + two pillars
    function bridge(g) {
      const b = D.g(g, { 'data-bg': '' });
      const pillars = [X0 + 260, X1 - 260].map((x) => {
        const p = D.g(b);
        D.el('rect', { x: x - 16, y: DY + 22, width: 32, height: 232, ...FILL('#8a7660', 2.5) }, p);
        D.el('rect', { x: x - 24, y: DY + 22, width: 48, height: 14, rx: 2, ...FILL('#a8927a', 2.5) }, p);
        return p;
      });
      const deck = D.g(b);
      D.el('rect', { x: X0, y: DY, width: X1 - X0, height: 22, rx: 3, ...FILL('#c98f5a', 2.5) }, deck);
      // a railing along the deck
      D.p(deck, `M${X0 + 6} ${DY - 22} H${X1 - 6}`, '', { style: 'fill: none; stroke: #e7dccb', 'stroke-width': 3, 'stroke-linecap': 'round' });
      for (let x = X0 + 20; x < X1; x += 48) D.p(deck, `M${x} ${DY - 22} V${DY}`, '', { style: 'fill: none; stroke: #e7dccb', 'stroke-width': 2.5 });
      return { b, deck, pillars };
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'FORSØK 1 · MEDIUM', 0.3);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.dial = dial(svg);
        P.tok = tokenMeter(svg, 1220, 370, 240, { max: 50 });
        tl.fromTo(P.tok.grp, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        tl.fromTo(P.dial, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        P.dial.set(tl, 1, 0.8);
        P.river = river(svg);
        tl.fromTo(P.river, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        P.chat.user(tl, 'Bygg en bro, så vedbilen kommer over elva.', 1.0);
        const t = P.chat.think(tl, 1.5, 1.0);
        P.b1 = bridge(svg);
        tl.fromTo(P.b1.pillars, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.4, stagger: 0.1 }, t);
        tl.fromTo(P.b1.deck, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.6 }, t + 0.3);
        P.chat.reply(tl, 'Ferdig.', t + 0.8);
        P.tok.set(tl, 6, t - 0.6, 1.2);
        // and the truck drives across
        P.truck = vedTruck(svg, { 'data-bg': '' });
        tl.fromTo(P.truck, { x: 604, y: DY + 30, opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 1.2);
        tl.to(P.truck, { x: 640, y: DY, duration: 0.3, ease: 'power1.in' }, t + 1.5);
        tl.to(P.truck, { x: X1 - 80, duration: 2.2, ease: 'power1.inOut' }, t + 1.8);
        tl.to(P.truck, { x: 1396, y: DY + 30, duration: 0.3, ease: 'power1.out' }, t + 4.0);
      }

      if (i === 1) {
        // attempt 2: same request, a new session, dial at max
        P.att.show(tl, 'FORSØK 2 · NY SESSION, MAKS', 0);
        tl.to([P.b1.b, P.truck], { opacity: 0, duration: 0.3 }, 0);
        P.chat.clear(tl, 0.1);
        P.dial.set(tl, 3, 0.3);
        P.tok.reset(tl, 0.2);
        P.chat.user(tl, 'Bygg en bro, så vedbilen kommer over elva.', 0.6);
        let t = P.chat.think(tl, 1.1, 1.0);
        const b = bridge(svg);
        tl.fromTo(b.pillars, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.4, stagger: 0.1 }, t);
        tl.fromTo(b.deck, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.6 }, t + 0.3);
        // done here. It keeps going.
        P.chat.reply(tl, 'Men tåler den en storm?', t + 1.0);
        t = P.chat.think(tl, t + 1.6, 1.0);
        const extra = D.g(b.b);
        [X0 + 130, X0 + 400, X1 - 400, X1 - 130].forEach((x, k) => {
          const p = D.el('rect', { x: x - 10, y: DY + 22, width: 20, height: 230, ...FILL('#8a7660', 2) }, extra);
          tl.fromTo(p, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.3 }, t + k * 0.1);
        });
        P.chat.reply(tl, 'Og om det kommer mer trafikk?', t + 0.6);
        t = P.chat.think(tl, t + 1.2, 1.0);
        const deck2 = D.g(b.b);
        D.el('rect', { x: X0 + 40, y: DY - 110, width: X1 - X0 - 80, height: 20, rx: 3, ...FILL('#c98f5a', 2.5) }, deck2);
        [X0 + 100, X0 + 360, X1 - 360, X1 - 100].forEach((x) => D.p(deck2, `M${x} ${DY - 90} V${DY}`, '', { style: 'fill: none; stroke: var(--fg)', 'stroke-width': 4 }));
        tl.fromTo(deck2, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.4 }, t);
        P.chat.reply(tl, 'Et tårn, for sikkerhets skyld.', t + 0.5);
        t = P.chat.think(tl, t + 1.0, 0.8);
        const tower = D.g(b.b);
        D.el('rect', { x: 1020, y: DY - 300, width: 60, height: 190, ...FILL('#8a7660', 2.5) }, tower);
        D.p(tower, `M1010 ${DY - 300} L1050 ${DY - 350} L1090 ${DY - 300} Z`, '', FILL('#c4562a', 2.5));
        D.p(tower, `M1050 ${DY - 350} V${DY - 380} l26 8 l-26 8`, '', { style: 'fill: #ffd23f; stroke: #1a120c', 'stroke-width': 2 });
        tl.fromTo(tower, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2)' }, t);
        // and it sags
        tl.to(b.b, { y: 72, rotation: 1.6, transformOrigin: '0% 100%', duration: 0.9, ease: 'power2.in' }, t + 0.8); // drops below the road
        P.chat.reply(tl, 'Ferdig. Mer robust nå.', t + 1.2);
        P.tok.set(tl, 48, 1.1, t + 0.6);
        // the truck waits on the bank: it won't drive onto that
        P.truck2 = vedTruck(svg, { 'data-bg': '' });
        tl.fromTo(P.truck2, { x: 600, y: DY + 30, opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 1.6);
        tl.to(P.truck2, { x: 604, duration: 0.4, ease: 'power2.out' }, t + 1.9);
        P.note = D.pencil(svg, 600, 240, 'ferdig for tre runder siden', { size: 40, rotate: -3 });
        tl.fromTo(P.note, { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 2.0);
        ctx.focus(tl, [b.b, P.note, P.chat.root, P.dial, P.tok.grp, P.att.g, P.truck2], 1.0);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
