import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, tokenMeter, FILL } from '../engine/props.js';

/*
  Tip: Opus 5.5 on medium is enough. More effort isn't better.
    0. Attempt 1, medium: "Bygg en bro over elva." A clean bridge, done.
    1. Attempt 2 (new session), dial at max: same request. It builds the same clean bridge,
       then keeps going: extra pillars, a second deck, a tower, ornaments. The bridge sags.
       Pencil: it was done three attempts ago.

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
    function river(g) {
      const r = D.g(g, { 'data-bg': '' });
      D.p(r, `M600 ${DY + 30} H${X0 + 40} L${X0 + 80} 760 H${X1 - 80} L${X1 - 40} ${DY + 30} H1480`, '', { style: 'fill: none; stroke: var(--fg)', 'stroke-width': 3 });
      D.el('rect', { x: X0 + 70, y: 650, width: X1 - X0 - 140, height: 100, style: 'fill: #2f5b7a' }, r);
      return r;
    }
    // the clean bridge: deck + two pillars
    function bridge(g) {
      const b = D.g(g, { 'data-bg': '' });
      const deck = D.el('rect', { x: X0, y: DY, width: X1 - X0, height: 22, rx: 3, ...FILL('#c98f5a', 2.5) }, b);
      const pillars = [X0 + 260, X1 - 260].map((x) => D.el('rect', { x: x - 14, y: DY + 22, width: 28, height: 230, ...FILL('#8a7660', 2.5) }, b));
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
        P.chat.user(tl, 'Bygg en bro over elva.', 1.0);
        const t = P.chat.think(tl, 1.5, 1.0);
        P.b1 = bridge(svg);
        tl.fromTo(P.b1.pillars, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.4, stagger: 0.1 }, t);
        tl.fromTo(P.b1.deck, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.6 }, t + 0.3);
        P.chat.reply(tl, 'Ferdig.', t + 0.8);
        P.tok.set(tl, 6, t - 0.6, 1.2);
      }

      if (i === 1) {
        // attempt 2: same request, a new session, dial at max
        P.att.show(tl, 'FORSØK 2 · NY ØKT, MAKS', 0);
        tl.to(P.b1.b, { opacity: 0, duration: 0.3 }, 0);
        P.chat.clear(tl, 0.1);
        P.dial.set(tl, 3, 0.3);
        P.tok.reset(tl, 0.2);
        P.chat.user(tl, 'Bygg en bro over elva.', 0.6);
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
        tl.to(b.b, { y: 46, rotation: 2.5, transformOrigin: '50% 100%', duration: 0.9, ease: 'power2.in' }, t + 0.8);
        P.chat.reply(tl, 'Ferdig. Mer robust nå.', t + 1.2);
        P.tok.set(tl, 48, 1.1, t + 0.6);
        P.note = D.pencil(svg, 600, 240, 'ferdig for tre forsøk siden', { size: 40, rotate: -3 });
        tl.fromTo(P.note, { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 2.0);
        ctx.focus(tl, [b.b, P.note, P.chat.root, P.dial, P.tok.grp, P.att.g], 1.0);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
