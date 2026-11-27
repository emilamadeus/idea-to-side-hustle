import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { FILL } from '../engine/props.js';
import { onRelay, relaySend, relayState } from '../engine/relay.js';

/*
  The room sets the price. Right after the idea check: what would you pay for a sack of
  firewood, delivered? Every phone gets a slider (50–300 kr); each answer is a dot in the
  person's colour, stacked over its price, and the room's middle answer is the price, live.
    0. The question; the dots arrive and move as people drag. The number follows the median.
    1. Locked: the price is stamped, and the shop opens at that price later (go-live, the phones).
  No answers: the price stays 129 kr.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    price      x 80–540, y 280–580: label y 280, number y 470 (x 80–360), kr beside it (x 372), count y 560;
               stamp above the kr (x 382–528, y 365–425)
    chart      x 600–1480, y 200–700: dots stacked up from y 640 (r 11), axis y 660, ticks y 690;
               median line x at the median, label above the tallest stack (y ≥ 206)
*/

const MIN = 50, MAX = 300, STEP = 10;
const X0 = 630, X1 = 1450, BASE = 640, TOP = 240;
const xOf = (kr) => X0 + ((kr - MIN) / (MAX - MIN)) * (X1 - X0);
const DOT = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
const median = (vals) => {
  if (!vals.length) return null;
  const v = [...vals].sort((a, b) => a - b), m = v.length >> 1;
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 20) * 10;
};

export default {
  id: 'price',
  room: true, // the room takes part from their phones (a badge in the zoom-out)
  title: 'Salen setter prisen',
  steps: 2,
  notes: [
    'Ta frem telefonen. Hva ville dere betalt for en sekk ved, levert på døra? Dra.',
    'Låst. Det er prisen når butikken åpner.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Idé</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Salen setter<br><em>prisen</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    const votes = new Map();   // id → { kr, n, dot }
    let opened = false, closed = false;

    const reset = () => { svg.innerHTML = ''; P = {}; votes.clear(); };

    // stack every column, cutting a dot to its new place (never sliding it through others)
    const layout = (animate) => {
      if (!P.dots) return;
      const cols = new Map();
      [...votes.values()].sort((a, b) => a.n - b.n).forEach((v) => { if (!cols.has(v.kr)) cols.set(v.kr, []); cols.get(v.kr).push(v); });
      let tallest = BASE;
      cols.forEach((list, kr) => {
        const gap = Math.min(26, (BASE - TOP) / Math.max(1, list.length));
        list.forEach((v, k) => {
          const x = xOf(kr), y = BASE - 11 - k * gap;
          tallest = Math.min(tallest, y);
          const moved = v.x !== undefined && v.x !== x, rose = v.y !== undefined && v.y !== y;
          const from = { x: v.x, y: v.y };
          v.x = x; v.y = y;
          const put = (px, py) => v.dot.setAttribute('transform', `translate(${px} ${py})`);
          const was = v.tl;
          v.tl?.kill(); v.tl = null;          // a newer answer wins over a move still playing
          if (was) gsap.set(v.dot, { opacity: 1 });
          if (!animate || (!moved && !rose)) { put(x, y); return; }
          if (moved) {
            // a new price: the dot is cut to its new column, never slid through the others
            v.tl = gsap.timeline()
              .to(v.dot, { opacity: 0, duration: 0.12 })
              .call(() => put(x, y))
              .to(v.dot, { opacity: 1, duration: 0.25 });
          } else {
            // same price, the stack below it changed: it settles within its own column
            const pos = { y: from.y };
            v.tl = gsap.to(pos, { y, duration: 0.25, onUpdate: () => put(x, pos.y) });
          }
        });
      });
      // the room's price, live
      const med = median([...votes.values()].map((v) => v.kr));
      // before anyone answers: no number (an old run's price would look like an answer)
      const shown = med ?? (closed ? relayState.price || 129 : '–');
      P.num.textContent = shown;
      P.kr.style.opacity = shown === '–' ? 0 : 1;
      P.count.textContent = votes.size ? `${votes.size} ${votes.size === 1 ? 'svar' : 'svar'} · midten av salen` : 'Venter på svar';
      if (med != null) {
        const x = xOf(med);
        P.med.style.opacity = 1;
        gsap.to(P.medPos, { x, duration: animate ? 0.4 : 0, ease: 'power2.out', onUpdate: () => P.med.setAttribute('transform', `translate(${P.medPos.x} 0)`) });
        P.medLabel.setAttribute('y', Math.max(206, tallest - 26));
        P.medLine.setAttribute('y1', Math.max(222, tallest - 18));
      } else P.med.style.opacity = 0;
    };
    const vote = (p, kr, animate = true) => {
      if (!P.dots) return;
      let v = votes.get(p.id);
      if (!v) {
        const dot = D.g(P.dots, { 'data-unit': '' });
        const c = DOT[((p.n || 1) - 1) % DOT.length];
        D.el('circle', { r: 11, ...FILL(c, 2.5) }, dot);
        v = { kr, n: p.n || 999, dot };
        votes.set(p.id, v);
        v.kr = kr;
        layout(false);
        if (animate) gsap.fromTo(dot, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        layout(animate);
        return;
      }
      v.kr = kr;
      layout(animate);
    };

    const offRelay = onRelay((m) => {
      if (m.type === 'price-vote' && m.p && !closed) vote(m.p, m.kr);
      if (m.type === 'price-state') { votes.forEach((v) => v.dot.remove()); votes.clear(); layout(false); }
      if (m.type === 'price-set' && P.num) { P.num.textContent = m.price; P.kr.style.opacity = 1; }
    });

    const play = (i, instant) => {
      const tl = gsap.timeline();
      const live = !instant && !ctx.deck?.instant;
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        // the price, big, on the left
        const left = D.g(svg, { 'data-unit': '' });
        D.text(left, 80, 280, 'EN SEKK VED, LEVERT', 'pl', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
        P.num = D.text(left, 80, 470, '–', 'pn', { style: 'font: 700 150px var(--font-mono); letter-spacing: -.05em; fill: var(--accent-2)' });
        P.kr = D.text(left, 372, 470, 'kr', 'pu', { style: 'font: 800 34px var(--font-display); fill: var(--fg); opacity: 0' });
        P.count = D.text(left, 80, 560, 'Venter på svar', 'pc', { style: 'font: 700 17px var(--font-mono); fill: var(--muted)' });
        tl.fromTo(left, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 0.4);
        // the chart: an axis in kroner, the dots stack over it
        const axis = D.g(svg, { 'data-bg': '' });
        D.p(axis, `M${X0 - 20} 660 H${X1 + 20}`, '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2.5 });
        for (let kr = MIN; kr <= MAX; kr += 50) {
          D.p(axis, `M${xOf(kr)} 652 V668`, '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2.5 });
          D.text(axis, xOf(kr), 694, `${kr}`, 'tk', { 'text-anchor': 'middle', style: 'font: 700 16px var(--font-mono); fill: var(--muted)' });
        }
        D.text(axis, X1 + 20, 724, 'kr', 'tu', { 'text-anchor': 'end', style: 'font: 700 14px var(--font-mono); fill: var(--muted)' });
        tl.fromTo(axis, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.6);
        // the median: a dashed line and the room's number over the stacks
        P.med = D.g(svg, { 'data-unit': '', style: 'opacity: 0' });
        P.medPos = { x: xOf(130) };
        P.medLine = D.el('line', { x1: 0, y1: 222, x2: 0, y2: 650, style: 'stroke: var(--accent); stroke-dasharray: 8 7', 'stroke-width': 2.5 }, P.med);
        P.medLabel = D.text(P.med, 0, 206, 'MIDTEN', 'ml', { 'text-anchor': 'middle', style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--accent)' });
        P.med.setAttribute('transform', `translate(${P.medPos.x} 0)`);
        P.dots = D.g(svg);
        // whoever answered already (a replay), then the phones open
        layout(false);
        if (live) { opened = true; closed = false; tl.call(() => relaySend({ type: 'price-open' }), null, 0.8); }
      }
      if (i === 1) {
        closed = true;
        layout(false); // no answers: the price it opens with
        if (live) { relaySend({ type: 'price-close' }); opened = false; }
        P.stamp = D.g(svg, { 'data-bg': '' });
        D.stamp(P.stamp, 455, 392, 'SATT', { size: 40, rotate: -8 });
        tl.add(D.slam(P.stamp), 0.3);
        ctx.focus(tl, [P.num.parentNode, P.stamp, P.med], 0.2);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { offRelay(); if (opened && !closed) relaySend({ type: 'price-close' }); } };
  },
};
