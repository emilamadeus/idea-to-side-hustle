import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { onRelay, relaySend } from '../engine/relay.js';
import { pageSVG, BUGS, W as PW, H as PH } from '../../ved/public/js/healpage.js';

/*
  Ring rundt feilen: the room shows the bugs instead of describing them. Every phone gets the
  firewood order page with five planted bugs; a ring round one heals it, on every phone and here.
  The relay judges each ring (ved/public/js/healpage.js): exactly one bug inside, and not much
  bigger than it, so a ring round half the page is a miss.
    0. The page, big. Every ring from the room shows on it: a miss flashes pink and fades, a hit
       turns green and stays, with a numbered tag in the margin (who, which bug, how fast). The
       counters on the left climb. When all five are found, step 1's view plays by itself.
    1. Side by side: the healed page with the five hits, and the broken page with every ring the
       room drew. The finders are listed on the left.

  Layout zones (svg units):
    tip       x 80–540, y 110–240
    counters  x 80–520, y 300–730 (game: found, tries, the clock) · finder list x 80–540, y 290–690 (final)
    page      x 720–994, y 172–765 (game, scale .76; the page is 360 × 780)
    tags      x 1060–1400, at each bug's height (y 270–764, kept above the title block), a dashed lead from the page edge
    final     two pages at scale .68: x 620–865 and x 980–1225, y 230–760, labels y 214
*/

const DOT = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
const OK = '#8fe3a2', MISS = '#ff6f9c', INK = '#1a120c';
const G = { x: 720, y: 172, s: 0.76 };
const F = [{ x: 620, y: 230, s: 0.68 }, { x: 980, y: 230, s: 0.68 }];
// each bug's tag sits at its height in the margin, nudged apart and kept above the title block
const SLOT = (() => {
  const ys = BUGS.map((b) => ({ id: b.id, y: G.y + (b.box[1] + b.box[3] / 2) * G.s })).sort((a, b) => a.y - b.y);
  let next = 736;
  for (let k = ys.length - 1; k >= 0; k--) { ys[k].slot = Math.min(ys[k].y, next); next = ys[k].slot - 66; }
  return Object.fromEntries(ys.map((q) => [q.id, q]));
})();
const colorOf = (p) => (p?.n ? DOT[(p.n - 1) % DOT.length] : '#fff3e3');
const secs = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
const bugBy = (id) => BUGS.find((b) => b.id === id);
const pathOf = (pts) => (pts.length ? 'M' + pts.map((q) => `${q[0]} ${q[1]}`).join(' L') + ' Z' : '');

// the last round, for going back to this slide: every ring, and the hits by bug
let memo = { tries: [], hits: {}, t0: 0, t1: 0 };   // t0: the game opened, t1: the last bug found (or the game closed)

export default {
  id: 'heal',
  room: true, // the room takes part from their phones (a badge in the zoom-out)
  title: 'Ring rundt feilen',
  steps: 2,
  notes: [
    'Ta frem telefonen. Ring rundt en feil på siden. Én feil per ring.',
    'Alle forsøkene ved siden av de fem som traff.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Kvalitet</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Ring rundt<br><em>feilen</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    let open = false;   // the game is running on the phones
    let autoFinal = null;

    // a page at (x, y, scale): the order page and an ink layer on top, both in page units
    const page = (parent, { x, y, s }, uid) => {
      const g = D.g(parent, { 'data-picture': '' });
      // the phone's edge, so the page reads as a screen
      D.el('rect', { x: x - 6, y: y - 6, width: PW * s + 12, height: PH * s + 12, rx: 26 * s + 6, style: 'fill: #0c0705; stroke: var(--deco)', 'stroke-width': 3 }, g);
      const holder = D.g(g);
      holder.innerHTML = pageSVG(uid);
      const pg = holder.firstElementChild;
      Object.entries({ x, y, width: PW * s, height: PH * s }).forEach(([k, v]) => pg.setAttribute(k, v));
      const ink = D.el('svg', { x, y, width: PW * s, height: PH * s, viewBox: `0 0 ${PW} ${PH}`, overflow: 'visible' }, g);
      return { g, pg, ink, s, x, y };
    };
    const heal = (pg, id, instant) => {
      const b = pg.pg.querySelector(`[data-bug="${id}"]`);
      if (!b) return;
      if (instant) { b.querySelectorAll('*').forEach((n) => { n.style.transition = 'none'; }); b.classList.add('hp-fixed'); b.getBoundingClientRect(); b.querySelectorAll('*').forEach((n) => { n.style.transition = ''; }); }
      else b.classList.add('hp-fixed');
    };
    // a ring on a page's ink layer; a hit gets its number on the rim
    const ring = (pg, t, { faint = false } = {}) => {
      const g = D.g(pg.ink);
      D.p(g, pathOf(t.pts), '', { style: `fill: none; stroke: ${t.ok ? OK : MISS}; stroke-linecap: round; stroke-linejoin: round; opacity: ${faint ? 0.5 : 1}`, 'stroke-width': (t.ok ? 4.5 : 3.5) / Math.max(0.75, pg.s) });
      if (t.ok) {
        const xs = t.pts.map((q) => q[0]), ys = t.pts.map((q) => q[1]);
        const bx = Math.min(PW - 14, Math.max(...xs)), by = Math.max(14, Math.min(...ys));
        D.el('circle', { cx: bx, cy: by, r: 13, style: `fill: ${colorOf(t.p)}; stroke: ${INK}`, 'stroke-width': 2.5 }, g);
        D.text(g, bx, by + 5, String(t.rank), 'rn', { 'text-anchor': 'middle', style: `font: 800 14px var(--font-display); fill: ${INK}` });
      }
      return g;
    };
    // the margin tag for a hit, at the bug's height
    const tag = (t, animate) => {
      const b = bugBy(t.bug);
      const { y: by, slot: cy } = SLOT[t.bug];
      const g = D.g(svg, { 'data-unit': '' });
      D.p(g, `M${G.x + PW * G.s + 8} ${by} L1056 ${cy}`, '', { style: `fill: none; stroke: ${OK}; stroke-dasharray: 5 6`, 'stroke-width': 2.5, 'data-bg': '' });
      D.el('rect', { x: 1060, y: cy - 28, width: 340, height: 56, rx: 12, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 2 }, g);
      D.el('circle', { cx: 1088, cy, r: 15, style: `fill: ${colorOf(t.p)}; stroke: ${INK}`, 'stroke-width': 2.5 }, g);
      D.text(g, 1088, cy + 5, String(t.rank), 'tn', { 'text-anchor': 'middle', style: `font: 800 15px var(--font-display); fill: ${INK}` });
      D.text(g, 1116, cy - 4, (t.p?.name || 'Gjest').slice(0, 16), 'tw', { style: 'font: 800 21px var(--font-display); fill: var(--fg)' });
      D.text(g, 1116, cy + 18, `${b.label} · ${secs(t.ms)}`, 'tb', { style: 'font: 700 13px var(--font-mono); fill: var(--muted)' });
      if (animate) gsap.fromTo(g, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' });
      return g;
    };
    const elapsed = () => (memo.t0 ? (memo.t1 || Date.now()) - memo.t0 : 0);
    const counts = () => {
      if (P.clock) P.clock.textContent = secs(elapsed());
      if (!P.found) return;
      P.found.textContent = `${Object.keys(memo.hits).length} / ${BUGS.length}`;
      P.tries.textContent = String(memo.tries.length);
    };

    // the game view: the page, the counters, the hits so far
    const game = (tl) => {
      P.view = 'game';
      P.pg = page(svg, G, 'tv');
      tl.fromTo(P.pg.g, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.3);
      const c = D.g(svg, { 'data-unit': '' });
      D.text(c, 80, 330, 'FUNNET', 'cl', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--accent)' });
      P.found = D.text(c, 80, 412, '', 'cf', { style: 'font: 800 84px var(--font-display); letter-spacing: -.04em; fill: var(--fg)' });
      D.text(c, 80, 490, 'FORSØK', 'ct', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
      P.tries = D.text(c, 80, 564, '', 'cn', { style: 'font: 800 64px var(--font-display); letter-spacing: -.04em; fill: var(--muted)' });
      // the clock runs until the last bug is found
      D.text(c, 80, 642, 'TID', 'ck', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
      P.clock = D.text(c, 80, 716, '', 'cc', { style: 'font: 700 60px var(--font-mono); letter-spacing: -.04em; fill: var(--accent-2)' });
      clearInterval(P.tick);
      P.tick = setInterval(counts, 100);
      P.counters = c;
      tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.5);
      P.tags = [];
      Object.values(memo.hits).sort((a, b) => a.rank - b.rank).forEach((t) => { heal(P.pg, t.bug, true); ring(P.pg, t); P.tags.push(tag(t, false)); });
      counts();
    };

    // the final view: the healed page and every ring, side by side, and who found what
    const final = (tl, animate) => {
      if (P.view === 'final') return;
      P.view = 'final';
      clearInterval(P.tick);
      if (memo.t0 && !memo.t1) memo.t1 = Date.now();
      clearTimeout(autoFinal);
      const old = [P.pg?.g, P.counters, ...(P.tags || [])].filter(Boolean);
      const t0 = animate ? 0.5 : 0;
      if (animate) { tl.to(old, { opacity: 0, duration: 0.4 }, 0); tl.call(() => old.forEach((n) => n.remove()), null, 0.45); }
      else old.forEach((n) => n.remove());
      const head = (x, text, color) => D.text(svg, x, 214, text, 'fh', { 'data-unit': '', style: `font: 700 15px var(--font-mono); letter-spacing: .16em; fill: ${color}` });
      const fixedPg = page(svg, F[0], 'fa'), allPg = page(svg, F[1], 'fb');
      BUGS.forEach((b) => { if (memo.hits[b.id]) heal(fixedPg, b.id, true); });
      allPg.pg.style.opacity = 0.55;
      const h1 = head(F[0].x, `FIKSET · ${Object.keys(memo.hits).length} AV ${BUGS.length}`, OK), h2 = head(F[1].x, `ALLE FORSØK · ${memo.tries.length}`, MISS);
      const hits = Object.values(memo.hits).sort((a, b) => a.rank - b.rank);
      hits.forEach((t) => ring(fixedPg, t));
      const all = memo.tries.map((t) => ring(allPg, t, { faint: !t.ok }));
      // the finders
      const list = D.g(svg, { 'data-unit': '' });
      D.text(list, 80, 300, 'FUNNET AV', 'lh', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--accent)' });
      const missing = BUGS.filter((b) => !memo.hits[b.id]);
      [...hits, ...missing].forEach((t, k) => {
        const y = 352 + k * 62;
        if (!t.pts) {   // a bug nobody found
          D.el('circle', { cx: 96, cy: y, r: 15, style: 'fill: none; stroke: var(--deco); stroke-dasharray: 4 5', 'stroke-width': 2.5 }, list);
          D.text(list, 126, y - 2, 'Ikke funnet', 'lw', { style: 'font: 800 22px var(--font-display); fill: var(--muted)' });
          D.text(list, 126, y + 20, t.label, 'lb', { style: 'font: 700 13px var(--font-mono); fill: var(--muted)' });
        } else {
          D.el('circle', { cx: 96, cy: y, r: 16, style: `fill: ${colorOf(t.p)}; stroke: ${INK}`, 'stroke-width': 2.5 }, list);
          D.text(list, 96, y + 5, String(t.rank), 'ln', { 'text-anchor': 'middle', style: `font: 800 15px var(--font-display); fill: ${INK}` });
          D.text(list, 126, y - 2, (t.p?.name || 'Gjest').slice(0, 16), 'lw', { style: 'font: 800 22px var(--font-display); fill: var(--fg)' });
          D.text(list, 126, y + 20, `${bugBy(t.bug).label} · ${secs(t.ms)}`, 'lb', { style: 'font: 700 13px var(--font-mono); fill: var(--muted)' });
        }
      });
      if (memo.t0) D.text(list, 80, 682, missing.length ? `Stoppet etter ${secs(elapsed())}` : `Alle fem på ${secs(elapsed())}`, 'lt', { style: 'font: 700 22px var(--font-mono); fill: var(--accent-2)' });
      const fresh = [fixedPg.g, allPg.g, h1, h2, list];
      if (!animate) return;
      tl.fromTo(fresh, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08 }, t0);
      // every ring again, in the order they were drawn
      const span = Math.min(3, 0.04 * all.length + 0.6);
      all.forEach((r, k) => tl.fromTo(r, { opacity: 0 }, { opacity: 1, duration: 0.25 }, t0 + 0.6 + (k / Math.max(1, all.length)) * span));
    };

    // every ring from the room, live
    const offRelay = onRelay((m) => {
      if (m.type !== 'heal-try' || P.view !== 'game' || !open) return;
      const t = { pts: m.pts || [], ok: !!m.ok, bug: m.bug, rank: m.rank, ms: m.ms, p: m.p };
      memo.tries.push(t);
      if (t.ok && !memo.hits[t.bug]) {
        memo.hits[t.bug] = t;
        if (Object.keys(memo.hits).length >= BUGS.length) memo.t1 = Date.now();
        heal(P.pg, t.bug);
        const r = ring(P.pg, t);
        gsap.fromTo(r, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        P.tags.push(tag(t, true));
        if (Object.keys(memo.hits).length >= BUGS.length) autoFinal = setTimeout(() => { if (P.view !== 'game') return; const t2 = gsap.timeline(); final(t2, true); ctx.track(t2); }, 1800);
      } else if (!t.ok) {
        const r = ring(P.pg, t);
        gsap.timeline().fromTo(r, { opacity: 0 }, { opacity: 1, duration: 0.15 }).to(r, { opacity: 0, duration: 0.9, delay: 1.1, onComplete: () => r.remove() });
      }
      counts();
    });

    const reset = () => { clearInterval(P.tick); svg.innerHTML = ''; P = {}; clearTimeout(autoFinal); };
    const play = (i, instant) => {
      const tl = gsap.timeline();
      const live = !instant && !ctx.deck?.instant;
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        if (live) { memo = { tries: [], hits: {}, t0: Date.now(), t1: 0 }; open = true; tl.call(() => relaySend({ type: 'heal-start' }), null, 0.4); }
        game(tl);
      }
      if (i === 1) {
        if (open) { open = false; relaySend({ type: 'heal-end' }, live); }
        if (!P.view) game(gsap.timeline());
        final(tl, !instant);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { offRelay(); clearTimeout(autoFinal); clearInterval(P.tick); if (open) { open = false; relaySend({ type: 'heal-end' }); } s.dispose?.(); } };
  },
};
