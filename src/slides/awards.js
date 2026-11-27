import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { relaySend, relayState } from '../engine/relay.js';

/*
  The evening's awards, from what the room did on its phones tonight: who joined first, the
  fastest bug finder, the shop's orders, the arena's winner. Nothing is staged: an award nobody
  earned stays empty.
    0. Six medals hang from a rail on their ribbons, face down: an outline with a question mark,
       the award's name and what it is for.
    1. The relay works out the winners. One by one a light comes down on a medal, it turns to
       gold, its ribbon fills, sparks fly, and the winner's name rises under it in their colour.
       The winners' phones light up gold.

  Layout zones (svg units):
    tip      x 80–540, y 110–240
    rail     y 286, x 80–1520 (background)
    medals   six columns 240 wide, centres x 200 … 1400; ribbon y 286–392, medal centre y 448 (r 56)
    words    title y 560, name y 612, detail y 648 (each column 220 wide)
*/

const AWARDS = [
  ['Først inne', 'Først til å bli med'],
  ['Skarpeste øye', 'Fant feilen raskest'],
  ['Første kunde', 'Første bestilling'],
  ['Lengst unna', 'Lengst fra lageret'],
  ['Mest ved', 'Flest sekker'],
  ['Sist igjen', 'Vant arenaen'],
];
const DOT = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
const RAIL = 286, MY = 448, MR = 56;
const cxOf = (k) => 200 + k * 240;
const INK = '#1a120c';

export default {
  id: 'awards',
  room: true, // the room takes part from their phones (a badge in the zoom-out)
  title: 'Kveldens priser',
  steps: 2,
  notes: [
    'Prisene kommer fra det salen faktisk gjorde i kveld.',
    'Medaljene snus. Vinnerne får det på telefonen.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Salen</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Kveldens <em>priser</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    // a ribbon: two straps from the rail to the medal; dashed outline face down, striped colour won
    const ribbon = (g, cx, won) => {
      [[-1, '#ff5a1f'], [1, '#ffb25e']].forEach(([side, fill]) => {
        const x0 = cx + side * 34, x1 = cx + side * 6;
        const d = `M${x0 - 11} ${RAIL} L${x0 + 11} ${RAIL} L${x1 + 9} ${MY - MR + 6} L${x1 - 9} ${MY - MR + 6} Z`;
        D.p(g, d, '', won
          ? { style: `fill: ${fill}; stroke: ${INK}; stroke-linejoin: round`, 'stroke-width': 2.5 }
          : { style: 'fill: none; stroke: var(--deco); stroke-dasharray: 6 6', 'stroke-width': 2 });
      });
    };
    // the medal: an outline with a question mark, or gold with a star
    const medal = (g, cx, won) => {
      if (!won) {
        D.el('circle', { cx, cy: MY, r: MR, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 3 }, g);
        D.el('circle', { cx, cy: MY, r: MR - 14, style: 'fill: none; stroke: var(--deco); stroke-dasharray: 4 6', 'stroke-width': 2 }, g);
        D.text(g, cx, MY + 15, '?', 'mq', { 'text-anchor': 'middle', style: 'font: 800 44px var(--font-display); fill: var(--deco)' });
        return;
      }
      D.el('circle', { cx, cy: MY, r: MR, style: `fill: #ffd23f; stroke: ${INK}`, 'stroke-width': 3.5 }, g);
      D.el('circle', { cx, cy: MY, r: MR - 14, style: 'fill: none; stroke: #b8860b', 'stroke-width': 3 }, g);
      const s = 1.5;
      const star = [[0, -15], [5, -5], [16, -4], [8, 4], [10, 15], [0, 9], [-10, 15], [-8, 4], [-16, -4], [-5, -5]]
        .map(([x, y], i) => `${i ? 'L' : 'M'}${cx + x * s} ${MY + y * s}`).join(' ') + 'Z';
      D.p(g, star, '', { style: `fill: #fff3c0; stroke: ${INK}; stroke-linejoin: round`, 'stroke-width': 2.5 });
      // a highlight, as on polished metal
      D.p(g, `M${cx - 38} ${MY - 18} A40 40 0 0 1 ${cx - 14} ${MY - 40}`, '', { style: 'fill: none; stroke: #fff8d8; stroke-linecap: round; opacity: .8', 'stroke-width': 4 });
    };

    const colorOf = (a) => {
      const id = a?.voter ? String(a.voter).slice(0, 6) : null;
      const p = id && (relayState.people || []).find((q) => q.id === id);
      return p ? DOT[(p.n - 1) % DOT.length] : '#fff3e3';
    };
    const fit = (str, px, w) => Math.min(px, Math.floor((w / Math.max(1, String(str).length)) * 1.85));

    const build = () => {
      const bg = D.g(svg, { 'data-bg': '' });
      D.p(bg, `M80 ${RAIL} H1520`, '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 3 });
      for (let k = 0; k < AWARDS.length; k++) D.el('circle', { cx: cxOf(k), cy: RAIL, r: 5, style: 'fill: var(--deco)' }, bg);
      P.light = D.g(svg, { 'data-bg': '' });
      P.cols = AWARDS.map(([title, what], k) => {
        const cx = cxOf(k);
        const col = { k, cx };
        // the light that comes down on a winner (behind everything else in the column)
        const lg = D.g(P.light, { opacity: 0 });
        const grad = D.el('linearGradient', { id: `aw-l${k}`, x1: 0, y1: 0, x2: 0, y2: 1 }, lg);
        D.el('stop', { offset: 0, 'stop-color': '#ffd23f', 'stop-opacity': 0.0 }, grad);
        D.el('stop', { offset: 0.35, 'stop-color': '#ffd23f', 'stop-opacity': 0.16 }, grad);
        D.el('stop', { offset: 1, 'stop-color': '#ffd23f', 'stop-opacity': 0 }, grad);
        D.p(lg, `M${cx - 30} ${RAIL} L${cx + 30} ${RAIL} L${cx + 112} 690 L${cx - 112} 690 Z`, '', { style: `fill: url(#aw-l${k})` });
        col.light = lg;
        col.rib = D.g(svg, { 'data-bg': '' }); ribbon(col.rib, cx, false);
        col.med = D.g(svg, { 'data-unit': '' }); medal(col.med, cx, false);
        col.words = D.g(svg, { 'data-unit': '' });
        D.text(col.words, cx, 560, title.toUpperCase(), 'at', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); letter-spacing: .12em; fill: var(--accent-2)' });
        col.what = D.text(col.words, cx, 600, what, 'aw', { 'text-anchor': 'middle', style: 'font: 600 17px var(--font-display); fill: var(--muted)' });
        col.sparks = D.g(svg, { 'data-bg': '', opacity: 0 });
        for (let j = 0; j < 10; j++) {
          const a = (j / 10) * Math.PI * 2 + 0.3;
          D.p(col.sparks, `M${cx + Math.cos(a) * (MR + 10)} ${MY + Math.sin(a) * (MR + 10)} L${cx + Math.cos(a) * (MR + 26)} ${MY + Math.sin(a) * (MR + 26)}`, '', { style: `fill: none; stroke: ${j % 2 ? '#ffd23f' : '#ff7a2f'}; stroke-linecap: round`, 'stroke-width': 3.5 });
        }
        return col;
      });
    };

    // a column turns: the medal flips to gold, the ribbon fills, the name rises
    const reveal = (tl, col, a, at, animate) => {
      const won = !!a;
      const turn = () => {
        col.med.innerHTML = ''; medal(col.med, col.cx, won);
        if (won) { col.rib.innerHTML = ''; ribbon(col.rib, col.cx, true); }
        col.what.remove();
        if (won) {
          const name = String(a.name || 'Gjest');
          D.text(col.words, col.cx, 612, name, 'an', { 'text-anchor': 'middle', style: `font: 800 ${fit(name, 36, 220)}px var(--font-display); letter-spacing: -.02em; fill: ${colorOf(a)}` });
          const det = String(a.detail || '').slice(0, 28);
          if (det) D.text(col.words, col.cx, 648, det, 'ad', { 'text-anchor': 'middle', style: `font: 700 ${fit(det, 14, 220)}px var(--font-mono); fill: var(--muted)` });
        } else {
          D.text(col.words, col.cx, 612, 'Ingen', 'an', { 'text-anchor': 'middle', style: 'font: 800 28px var(--font-display); fill: var(--muted)' });
        }
      };
      if (!animate) { turn(); if (won) gsap.set(col.light, { opacity: 1 }); return; }
      if (won) tl.to(col.light, { opacity: 1, duration: 0.5 }, at - 0.2);
      tl.to(col.med, { scaleX: 0, svgOrigin: `${col.cx} ${MY}`, duration: 0.22, ease: 'power2.in' }, at);
      tl.call(turn, null, at + 0.22);
      tl.to(col.med, { scaleX: 1, svgOrigin: `${col.cx} ${MY}`, duration: 0.45, ease: 'back.out(2.2)' }, at + 0.22);
      tl.fromTo(col.words, { y: 8, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' }, at + 0.3);
      if (won) {
        tl.fromTo(col.sparks, { opacity: 1, scale: 0.7, svgOrigin: `${col.cx} ${MY}` }, { scale: 1.35, svgOrigin: `${col.cx} ${MY}`, duration: 0.6, ease: 'power2.out' }, at + 0.3);
        tl.to(col.sparks, { opacity: 0, duration: 0.35 }, at + 0.65);
      }
    };

    const winner = (k) => (relayState.awards || []).find((a) => a.title === AWARDS[k][0]) || null;
    const reset = () => { svg.innerHTML = ''; P = {}; };
    const play = (i, instant) => {
      const tl = gsap.timeline();
      const live = !instant && !ctx.deck?.instant;
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        build();
        P.cols.forEach((c, k) => tl.fromTo([c.rib, c.med, c.words], { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }, 0.4 + k * 0.1));
      }
      if (i === 1) {
        if (live) relayState.awards = null;
        tl.call(() => relaySend({ type: 'awards' }, live), null, 0);
        // the winners arrive from the relay within a moment; each medal turns in its own beat
        P.cols.forEach((c, k) => {
          const at = 1.0 + k * 1.05;
          if (instant) reveal(tl, c, winner(k), at, false);
          else tl.call(() => { const t2 = gsap.timeline(); reveal(t2, c, winner(k), 0.2, true); ctx.track(t2); }, null, at);
        });
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
