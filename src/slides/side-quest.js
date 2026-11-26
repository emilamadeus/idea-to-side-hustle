import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, LOOK } from '../engine/characters.js';
import { miniDev } from '../engine/minidev.js';

/*
  Tip: side quests multiply. A Gantt chart, built and broken by the developer himself: a small
  figure (about one and a half bars tall) who types at a laptop while a bar fills, gets an idea
  in a thought bubble, splits the bar, leans into the rest of it and pushes it to its new
  estimate, then drags in the next pipeline. He gets slower and more slumped each time.
    0. Typing: the game bar fills to 40 %. Thought: "Trenger: 50 assets".
    1. He splits the bar and pushes the rest out; the launch moves. He drags in the asset pipeline.
    2. Typing: assets to 20 %. Thought: "Trenger: 20 teksturer".
    3. Split, push; the game's rest is knocked along too. A sigh. He drags in the texture pipeline.
    4. Textures: needed 20, made 500.
    5. Assets: needed 50, made 20 000+, published.
    6. Back to the game: 80 %, and it stalls. He slumps over the laptop.
    7. Three pipelines, one developer: he hops between rows. "Hvilken nå?"
    8. His answer: a pipeline that picks the pipeline. He types at it, and the camera dives into
       his laptop screen, which shows this chart, with him typing at it … an endless zoom.

  Layout zones (svg units, 1600×900 frame):
    tip            y  95–235  (left)
    month header   y 285–305
    rows           game 370 · asset 470 · texture 570 · picker 652 (bars 44 tall, x 460–1516)
    developer      on a row: feet at row + 22, 66 tall; desk and laptop to his right (+14…+50)
    thoughts       right of his head, over the empty part of his row (deliberate overlap)
    deadline label y 672 (below the chart), multiplier y 708
    counters       x 700–1130, y 700–800
    title block    x ≥ 1160, y ≥ 790 (engine)
*/

const U = (v) => `calc(var(--u) * ${(v / 16).toFixed(2)})`;

const X0 = 460, MW = 88, BH = 44;
const ROW = { game: 370, asset: 470, tex: 570 };
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];
const MONTH_NAMES = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const monthAt = (x) => MONTH_NAMES[Math.min(11, Math.max(0, Math.ceil((x - X0) / MW) - 1))];

// Pipelines: planned length and where each one blocks
const GAME = { x: X0, w: 3 * MW, block: 0.4, final: 0.8 };
const ASSET = { x: GAME.x + GAME.w * GAME.block, w: 4 * MW, block: 0.2 };
const TEX = { x: ASSET.x + ASSET.w * ASSET.block, w: 3 * MW };
const GAME_REM = GAME.w * (1 - GAME.block);
const ASSET_REM = ASSET.w * (1 - ASSET.block);
// Where the blocked remainders end up after each spill
const AFTER1 = { gameRest: ASSET.x + ASSET.w };
const AFTER3 = { assetRest: TEX.x + TEX.w, gameRest: TEX.x + TEX.w + ASSET_REM };
const DEADLINE = [GAME.x + GAME.w, AFTER1.gameRest + GAME_REM, AFTER3.gameRest + GAME_REM];

const CSS = `
.slide-side-quest .sq-tip { position: absolute; left: var(--pad); top: ${U(118)}; font-size: calc(var(--u) * 3.6); }
.slide-side-quest .zone { position: absolute; left: ${U(700)}; top: ${U(700)}; width: ${U(430)}; opacity: 0; }
.slide-side-quest .zone .counter { font-size: calc(var(--u) * 4.2); }
.slide-side-quest .zone .ask { font: var(--display-weight) calc(var(--u) * 2.6) / 1.05 var(--font-display); letter-spacing: var(--display-tracking); color: var(--fg); }
.slide-side-quest canvas.avalanche { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
`;

export default {
  id: 'side-quest',
  title: 'Sideprosjektet',
  steps: 9,
  helpAt: 'top', // the bottom edge is the developer portrait and the deadline
  notes: [
    'Spillet. Tre måneder. Ved 40 % stopper det: jeg trenger 50 ødeleggbare assets, og de finnes ikke.',
    'Så jeg lager en pipeline for det. Lanseringen flytter seg.',
    'Asset-pipelinen stopper ved 20 %: den trenger 20 teksturer. Teksturer er dyre.',
    'Ny pipeline. Lanseringen flytter seg igjen.',
    'Jeg trengte 20 teksturer.',
    'Jeg trengte 50 assets. Den ble et produkt på Fab.',
    'Tilbake til spillet. 80 %. Og der står det.',
    'Tre pipelines, én utvikler. Hvilken kjører jeg nå?',
    'Løsningen: en pipeline som velger pipeline.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <style>${CSS}</style>
      <div class="pin-tl label">Sideprosjekter</div>
      <h2 class="tip sq-tip">Ett prosjekt.<br><em>Tre</em> pipelines.</h2>
      <div class="zone zone-tex"><div class="counter">0</div><div class="counter-label">teksturer laget · trengte 20</div></div>
      <div class="zone zone-asset"><div class="counter">0</div><div class="counter-label">assets laget · trengte 50</div></div>
`;
    const svg = D.stage(el);
    const tip = ctx.$('.sq-tip');
    const zTex = ctx.$('.zone-tex'), zAsset = ctx.$('.zone-asset');

    let P = {};
    let loops = [];
    let loops2 = []; // breathing: runs across steps
    let canvas = null;
    let zoomer = null;

    // ---------- building blocks ----------
    function defs() {
      const d = D.el('defs', {}, svg);
      const pat = D.el('pattern', { id: 'sq-hatch', width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
      D.el('rect', { x: 0, y: 0, width: 4, height: 12, style: 'fill: var(--note)', opacity: 0.55 }, pat);
    }

    // A pipeline bar: outline track + done fill + % label inside the fill.
    function pipeline(p, y, color, name) {
      const grp = D.g(svg, { 'data-unit': '' });
      const track = D.el('rect', { x: p.x, y: y - BH / 2, width: p.w, height: BH, rx: 6, fill: 'none', style: 'stroke: var(--deco)', 'stroke-width': 3 }, grp);
      const fill = D.el('rect', { x: p.x, y: y - BH / 2, width: 0, height: BH, rx: 6, style: `fill: ${color}` }, grp);
      const pct = D.text(grp, p.x + 10, y + 7, '', 'bar-pct', { style: 'font: 700 18px var(--font-mono); fill: #1a0d05' });
      const lbl = D.text(svg, 120, y + 11, name, 'head');
      return { grp, track, fill, pct, lbl, p, y, color };
    }
    const setPct = (bar, v) => {
      bar.pct.textContent = `${Math.round(v * 100)} %`;
      const w = +bar.fill.getAttribute('width');
      bar.pct.setAttribute('x', bar.p.x + Math.max(10, w - 62));
    };
    const fillTo = (bar, frac, dur, ease = 'power2.out') => {
      const s = { v: (+bar.fill.getAttribute('width')) / bar.p.w };
      return gsap.to(s, {
        v: frac, duration: dur, ease,
        onUpdate: () => { bar.fill.setAttribute('width', bar.p.w * s.v); setPct(bar, s.v); },
      });
    };
    // Block: zigzag break at the fill end + hatched, dashed remainder that moves later.
    function block(bar, frac) {
      const bx = bar.p.x + bar.p.w * frac, y = bar.y;
      const zig = D.p(svg, `M${bx} ${y - 26} l7 8 l-7 8 l7 8 l-7 8 l7 8 l-7 8`, 'pencil');
      const rem = D.g(svg, { 'data-unit': '' });
      const w = bar.p.w * (1 - frac);
      const hatch = D.el('rect', { x: bx, y: y - BH / 2, width: w, height: BH, rx: 6, fill: 'url(#sq-hatch)' }, rem);
      D.el('rect', { x: bx, y: y - BH / 2, width: w, height: BH, rx: 6, fill: 'none', style: 'stroke: var(--fg)', 'stroke-width': 2.5, 'stroke-dasharray': '8 7' }, rem);
      const rfill = D.el('rect', { x: bx, y: y - BH / 2, width: 0, height: BH, rx: 6, style: `fill: ${bar.color}` }, rem);
      gsap.set([zig, rem], { opacity: 0 });
      return { zig, rem, hatch, rfill, x: bx, w, cut: () => bar.track.setAttribute('width', bar.p.w * frac) };
    }
    const showBlock = (b) => gsap.timeline()
      .call(b.cut, null, 0)
      .set(b.zig, { opacity: 1 }, 0)
      .add(D.drawOn(b.zig, { duration: 0.3 }), 0)
      .fromTo(b.rem, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0);
    // Deadline: dashed vertical line + label under the chart + pencil multiplier.
    function deadline() {
      const grp = D.g(svg);
      D.p(grp, 'M0 318 V640', 'acc', { 'stroke-dasharray': '10 8' });
      const txt = D.text(grp, 0, 672, 'LANSERING: MARS', 'mono', { 'text-anchor': 'middle', style: 'font: 400 19px var(--font-mono); fill: var(--accent); letter-spacing: .06em' });
      const mult = D.pencil(grp, 130, 684, '', { size: 42, rotate: -6, anchor: 'start' });
      gsap.set(grp, { x: DEADLINE[0] });
      return { grp, txt, mult };
    }
    const moveDeadline = (tl, k, at) => {
      tl.to(P.dl.grp, { x: DEADLINE[k], duration: 1.1, ease: 'power3.inOut' }, at);
      tl.call(() => fx.scramble(P.dl.txt, `LANSERING: ${monthAt(DEADLINE[k]).toUpperCase()}`, { duration: 0.7 }), null, at + 0.4);
      tl.call(() => { P.dl.txt.textContent = `LANSERING: ${monthAt(DEADLINE[k]).toUpperCase()}`; P.dl.mult.textContent = `×${k + 1}`; }, null, at + 1.15);
      tl.fromTo(P.dl.mult, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at + 1.15);
    };

    // ---------- motivation: the portrait bottom left ----------
    const DEV = { hx: 190, hy: 790 };
    function portrait() {
      const grp = D.g(svg);
      D.text(grp, 120, 700, 'UTVIKLER', 'mono', { style: 'font: 400 16px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      const fig = figure(grp, { x: DEV.hx, y: DEV.hy + 40, s: 0.56, pose: 'sit', arms: 'down', ...LOOK.me, mouth: 'smile' });
      const sweat = D.p(grp, `M${DEV.hx + 30} ${DEV.hy - 26} q-6 10 0 14 q6 -4 0 -14 Z`, '', { style: 'fill: #9fd3ff; stroke: none', opacity: 0 });
      D.text(grp, 330, 742, 'MOTIVASJON', 'mono', { style: 'font: 400 16px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      const meter = D.g(grp, { 'data-unit': '' });
      D.el('rect', { x: 330, y: 754, width: 220, height: 14, rx: 3, fill: 'none', style: 'stroke: var(--deco)', 'stroke-width': 2 }, meter);
      const energy = D.el('rect', { x: 332, y: 756, width: 216, height: 10, rx: 2, style: 'fill: var(--accent-2)' }, meter);
      const cups = D.g(grp);
      for (let k = 0; k < 7; k++) {
        const c = D.g(cups, { opacity: 0 });
        const cx = 332 + k * 32;
        D.p(c, `M${cx} 800 h20 v26 q0 6 -6 6 h-8 q-6 0 -6 -6 Z M${cx + 20} 806 q10 0 10 8 q0 8 -10 8`, 'thin');
        D.p(c, `M${cx + 6} 794 q-3 -6 0 -12 M${cx + 14} 794 q-3 -6 0 -12`, 'thin', { opacity: 0.6 });
      }
      return { grp, head: fig.root, fig, sweat, energy, cups: [...cups.children] };
    }
    // 0 fresh · 1 first detour · 2 second detour · 3 stuck at 80 % · 4 a lift: it got published
    const MOOD = [
      { energy: 1.0, cups: 1, color: 'var(--accent-2)', tilt: 0, face: { eyes: 'open', brows: 'neutral', mouth: 'smile' } },
      { energy: 0.65, cups: 2, color: 'var(--accent-2)', tilt: 0, face: { eyes: 'open', brows: 'tired', mouth: 'neutral' } },
      { energy: 0.3, cups: 4, color: 'var(--accent)', tilt: -6, face: { eyes: 'down', brows: 'tired', mouth: 'frown' } },
      { energy: 0.06, cups: 7, color: 'var(--note)', tilt: -14, face: { eyes: 'closed', brows: 'tired', mouth: 'frown' } },
      { energy: 0.5, cups: 5, color: 'var(--accent-2)', tilt: -2, face: { eyes: 'open', brows: 'raised', mouth: 'smile' } },
    ];
    function mood(tl, k, at = 0) {
      const m = MOOD[k];
      P.port.fig.expr(tl, m.face, at);
      tl.to(P.port.sweat, { opacity: k === 2 || k === 3 ? 1 : 0, duration: 0.3 }, at + 0.2);
      tl.to(P.port.energy, { attr: { width: 216 * m.energy }, duration: 0.9, ease: 'power2.inOut' }, at);
      tl.call(() => { P.port.energy.style.fill = m.color; }, null, at);
      P.port.cups.forEach((c, i) => tl.to(c, { opacity: i < m.cups ? 1 : 0, duration: 0.2 }, at + 0.1 + i * 0.06));
      tl.to(P.port.head, { rotation: m.tilt, svgOrigin: `${DEV.hx} ${DEV.hy + 90}`, duration: 0.8, ease: 'power2.inOut' }, at);
    }

    // ---------- the developer on the chart (src/engine/minidev.js) ----------
    let typer = null, breath = null;
    const startTyping = (speed) => { typer?.kill(); typer = P.dev.typing(speed); };
    const stopTyping = () => { typer?.kill(); typer = null; loops.forEach((l) => l.kill()); loops = []; };
    const here = () => gsap.getProperty(P.dev.g, 'x');
    // to another row: a cut (out, move, in), never a walk through the chart
    function cutTo(tl, x, row, at) {
      tl.to(P.dev.g, { opacity: 0, duration: 0.25 }, at);
      tl.set(P.dev.g, { x, y: row + BH / 2 }, at + 0.25);
      tl.to(P.dev.g, { opacity: 1, duration: 0.25 }, at + 0.3);
      return at + 0.55;
    }

    // ---------- avalanche of texture swatches ----------
    function avalanche() {
      canvas = document.createElement('canvas');
      canvas.className = 'avalanche';
      el.appendChild(canvas);
      const g2 = canvas.getContext('2d');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
      const W = canvas.width, H = canvas.height, s = W / 1600;
      const COLORS = ['#ff5a1f', '#ffd23f', '#ff6f9c', '#7fd0ff', '#c9ad92', '#8fe3a2', '#b98cff', '#fff3e3'];
      const COLW = 16 * s;
      const heights = new Float32Array(Math.ceil(W / COLW) + 1);
      const items = [];
      let spawned = 0, last = performance.now();
      const mine = canvas;
      const step = () => {
        if (canvas !== mine) return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        const want = Math.min(900, spawned + Math.ceil(dt * 420));
        while (spawned < want) {
          items.push({ x: (520 + Math.random() * 1060) * s, y: -40 * s - Math.random() * 300 * s, vy: 0, size: (16 + Math.random() * 16) * s, r: Math.random() * 6, vr: (Math.random() - 0.5) * 6, c: COLORS[(Math.random() * COLORS.length) | 0], rest: false });
          spawned++;
        }
        g2.clearRect(0, 0, W, H);
        for (const it of items) {
          if (!it.rest) {
            it.vy += 2600 * s * dt; it.y += it.vy * dt; it.r += it.vr * dt;
            const col = Math.min(heights.length - 1, Math.max(0, (it.x / COLW) | 0));
            const floor = H - heights[col];
            if (it.y + it.size / 2 >= floor) {
              it.y = floor - it.size / 2; it.rest = true;
              heights[col] += it.size * 0.55;
              if (col > 0) heights[col - 1] += it.size * 0.2;
              if (col < heights.length - 1) heights[col + 1] += it.size * 0.2;
            }
          }
          g2.save(); g2.translate(it.x, it.y); g2.rotate(it.r);
          g2.fillStyle = it.c; g2.fillRect(-it.size / 2, -it.size / 2, it.size, it.size);
          g2.strokeStyle = 'rgba(0,0,0,.35)'; g2.lineWidth = 2 * s; g2.strokeRect(-it.size / 2, -it.size / 2, it.size, it.size);
          g2.restore();
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    // ---------- the finale: an endless zoom into the developer's laptop screen ----------
    // Everything on the chart moves into one world group. Copies of it are nested into the
    // laptop screen, each inside the last (the transform T maps the frame onto the screen).
    // The camera zooms about T's fixed point by 1/k, the scale of T, and loops: after one
    // loop the first copy fills the frame exactly as the original did, so the seam is invisible.
    function dive() {
      const scr = P.dev.screen.getBoundingClientRect();
      const box = svg.getBoundingClientRect();
      const f = 1600 / box.width;
      const sx = (scr.left - box.left) * f, sy = (scr.top - box.top) * f, sw = scr.width * f;
      const k = sw / 1600;                     // the screen is 16:9, like the frame
      // the dive stays inside the frame: an untransformed, clipped wrapper around the world
      const defsEl = svg.querySelector('defs') || D.el('defs', {}, svg);
      if (!svg.querySelector('#sq-frame')) D.el('rect', { x: 0, y: 0, width: 1600, height: 900 }, D.el('clipPath', { id: 'sq-frame' }, defsEl));
      const wrap = D.g(svg, { 'clip-path': 'url(#sq-frame)' });
      const world = D.g(wrap);
      [...svg.childNodes].filter((n) => n !== wrap && n.tagName !== 'defs').forEach((n) => world.append(n));
      const T = (n) => `translate(${sx * (1 - k ** n) / (1 - k)} ${sy * (1 - k ** n) / (1 - k)}) scale(${k ** n})`;
      const base = world.cloneNode(true);
      [1, 2, 3].forEach((n) => {
        const c = base.cloneNode(true);
        c.setAttribute('transform', T(n));
        c.setAttribute('data-bg', '');
        world.append(c);
      });
      const F = [sx / (1 - k), sy / (1 - k)];   // fixed point of T
      const z = { p: 0 };
      zoomer = gsap.to(z, {
        p: 1, duration: 4.5, ease: 'none', repeat: -1,
        onUpdate: () => {
          const S = (1 / k) ** z.p;
          world.setAttribute('transform', `translate(${F[0]} ${F[1]}) scale(${S}) translate(${-F[0]} ${-F[1]})`);
        },
      });
      ctx.track(zoomer);
      gsap.to(tip, { opacity: 0, duration: 0.6 }); // the title would sit still over the dive
    }

    const counter = (zone, to, dur, ease, at, tl, suffix = '') => {
      const c = zone.querySelector('.counter');
      const s = { v: 0 };
      tl.fromTo(zone, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, at);
      tl.to(s, { v: to, duration: dur, ease, onUpdate: () => { c.textContent = Math.round(s.v).toLocaleString('nb-NO') + (s.v >= to ? suffix : ''); } }, at + 0.2);
    };

    // ---------- steps ----------
    const reset = () => {
      loops.forEach((l) => l.kill()); loops = [];
      loops2.forEach((l) => l.kill()); loops2 = [];
      typer?.kill(); typer = null;
      svg.innerHTML = '';
      canvas?.remove(); canvas = null;
      gsap.set([zTex, zAsset], { opacity: 0, x: 0, y: 0 });
      zoomer?.kill(); zoomer = null;
      gsap.set(tip, { opacity: 1 });
      P = {};
      defs();
    };

    const play = (i, instant) => {
      const tl = gsap.timeline();

      const d = P.dev;
      // a split and a push: crack on, chop, step up, brace, and push the rest out to its new place
      const splitPush = (bar, frac, key, to, at, { speed, tired }) => {
        const bx = bar.p.x + bar.p.w * frac;
        tl.call(stopTyping, null, at);
        d.desk(tl, false, at);
        d.pose(tl, 'idle', at, 0.3);
        d.pose(tl, 'chopUp', at + 0.35, 0.45, 'power2.out');            // anticipation
        d.pose(tl, 'chopDown', at + 0.85, 0.12, 'power4.in');           // the chop
        P[key] = block(bar, frac);
        tl.add(showBlock(P[key]), at + 0.95);
        tl.fromTo(bar.grp, { x: 0 }, { x: 2, duration: 0.05, yoyo: true, repeat: 3, immediateRender: false }, at + 0.97);
        d.pose(tl, 'idle', at + 1.15, 0.35);
        let t = d.walk(tl, bx + 2, bx - 12, at + 1.4, { speed: 60 });
        d.pose(tl, 'push', t, 0.45, 'power2.out');                     // brace
        d.face(tl, tired ? 'tired' : 'frown', t);
        const dist = Math.abs(to - bx);
        const end = d.walk(tl, bx - 12, to - 12, t + 0.5, { speed, push: true });
        tl.to(P[key].rem, { x: to - bx, duration: end - t - 0.5, ease: 'none' }, t + 0.5);
        void dist;
        return { t: t + 0.5, end };
      };
      // the next pipeline: he drags it in, leaning back, then steps to its start and types
      const place = (pipe, x, row, at, { tired }) => {
        let t = cutTo(tl, x + pipe.p.w * 0.45, row, at);
        d.desk(tl, false, at);
        d.pose(tl, 'drag', t, 0.35);
        tl.to(pipe.track, { attr: { width: pipe.p.w }, duration: 1.2, ease: 'power2.out' }, t + 0.15);
        tl.add(D.fadeIn(pipe.lbl), t + 0.2);
        t = d.walk(tl, x + pipe.p.w * 0.45, x + 2, t + 0.3, { speed: tired ? 70 : 95 });
        d.pose(tl, 'idle', t, 0.3);
        d.desk(tl, true, t);
        d.pose(tl, 'type', t + 0.3, 0.35);
        return t + 0.65;
      };

      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const grid = D.g(svg, { 'data-bg': '' });
        MONTHS.forEach((m, k) => {
          D.text(grid, X0 + k * MW + MW / 2, 300, m, 'mono', { 'text-anchor': 'middle', style: 'font: 400 18px var(--font-mono); fill: var(--muted); letter-spacing: .06em' });
          D.p(grid, `M${X0 + k * MW} 318 V640`, 'thin', { opacity: 0.3 });
        });
        D.p(grid, `M${X0 + 12 * MW} 318 V640`, 'thin', { opacity: 0.3 });
        tl.add(D.fadeIn(grid), 0.3);
        P.game = pipeline(GAME, ROW.game, 'var(--accent)', 'Game pipeline');
        tl.add(D.fadeIn([P.game.grp, P.game.lbl]), 0.5);
        P.dl = deadline();
        tl.add(D.fadeIn(P.dl.grp), 0.7);
        P.port = portrait();
        tl.add(D.fadeIn(P.port.grp), 0.8);
        mood(tl, 0, 0.8);
        P.dev = miniDev(svg, { idPrefix: 'sq-dev' });
        const dd = P.dev;
        gsap.set(dd.g, { x: GAME.x + 2, y: ROW.game + BH / 2 });
        dd.cup(0);
        breath = dd.breathe(); loops2.push(breath);
        tl.fromTo(dd.g, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.8);
        // eager: he cracks on, typing fast, nodding along; the bar fills under his hands
        dd.pose(tl, 'type', 1.0, 0.35);
        tl.call(() => startTyping(1.25), null, 1.2);
        tl.add(fillTo(P.game, GAME.block, 2.4), 1.2);
        tl.to(dd.g, { x: GAME.x + GAME.w * GAME.block + 2, duration: 2.4, ease: 'power2.out' }, 1.2);
        // he stops, leans back, scratches his head: something is missing
        tl.call(stopTyping, null, 3.6);
        dd.pose(tl, 'scratch', 3.7, 0.4);
        dd.face(tl, 'o', 3.8);
        P.th = dd.think(tl, 'Trenger: 50 assets', 4.0);
      }

      if (i === 1) {
        d.pop(tl, P.th, 0);
        d.face(tl, 'flat', 0.1);
        P.asset = pipeline(ASSET, ROW.asset, 'var(--accent-2)', '3D asset pipeline');
        gsap.set(P.asset.track, { attr: { width: 0 } }); gsap.set(P.asset.lbl, { opacity: 0 });
        const { t, end } = splitPush(P.game, GAME.block, 'gameBlock', AFTER1.gameRest, 0.3, { speed: 85 });
        tl.to(P.dl.grp, { x: DEADLINE[1], duration: end - t, ease: 'none' }, t);
        tl.call(() => { P.dl.txt.textContent = `LANSERING: ${monthAt(DEADLINE[1]).toUpperCase()}`; P.dl.mult.textContent = '×2'; }, null, end);
        tl.fromTo(P.dl.mult, { opacity: 0 }, { opacity: 1, duration: 0.4 }, end);
        // he straightens up and wipes his brow
        d.pose(tl, 'wipe', end + 0.1, 0.35);
        d.pose(tl, 'idle', end + 0.6, 0.35);
        d.slump(tl, 4, end + 0.6);
        mood(tl, 1, end);
        const fin = place(P.asset, ASSET.x, ROW.asset, end + 1.1, { tired: false });
        tl.call(() => startTyping(1.0), null, fin);
        tl.call(() => d.cup(1), null, fin);
        d.face(tl, 'flat', fin);
      }

      if (i === 2) {
        tl.call(() => startTyping(0.95), null, 0.1);
        tl.add(fillTo(P.asset, ASSET.block, 2.0), 0.1);
        tl.to(d.g, { x: ASSET.x + ASSET.w * ASSET.block + 2, duration: 2.0, ease: 'power2.out' }, 0.1);
        tl.call(stopTyping, null, 2.2);
        // not again: a hand to the face
        d.pose(tl, 'facepalm', 2.3, 0.4);
        d.face(tl, 'frown', 2.3);
        P.th = d.think(tl, 'Trenger: 20 teksturer', 2.7);
      }

      if (i === 3) {
        d.pop(tl, P.th, 0);
        P.tex = pipeline(TEX, ROW.tex, 'var(--accent)', 'Texture pipeline');
        gsap.set(P.tex.track, { attr: { width: 0 } }); gsap.set(P.tex.lbl, { opacity: 0 });
        const { t, end } = splitPush(P.asset, ASSET.block, 'assetBlock', AFTER3.assetRest, 0.3, { speed: 62, tired: true });
        // the game's rest gets knocked along too
        tl.to(P.gameBlock.rem, { x: AFTER3.gameRest - P.gameBlock.x, duration: end - t, ease: 'none' }, t + 0.15);
        tl.to(P.dl.grp, { x: DEADLINE[2], duration: end - t, ease: 'none' }, t + 0.15);
        tl.call(() => { P.dl.txt.textContent = `LANSERING: ${monthAt(DEADLINE[2]).toUpperCase()}`; P.dl.mult.textContent = '×3'; }, null, end + 0.15);
        // he looks up at it, and sighs
        d.pose(tl, 'idle', end + 0.1, 0.4);
        d.pose(tl, 'lookL', end + 0.5, 0.35);
        d.slump(tl, 10, end + 0.9);
        const s1 = d.sigh(tl, end + 1.0);
        d.think(tl, 'Pff.', end + 1.1, 1.4);
        mood(tl, 2, end + 0.9);
        const fin = place(P.tex, TEX.x, ROW.tex, s1 + 0.4, { tired: true });
        tl.call(() => startTyping(0.8), null, fin);
        tl.call(() => d.cup(2), null, fin);
        d.face(tl, 'tired', fin);
      }

      if (i === 4) {
        // textures: needed 20, made 500. A burst of the old energy.
        tl.call(() => startTyping(1.6), null, 0);
        d.face(tl, 'smile', 0.2);
        tl.add(fillTo(P.tex, 1, 2.4, 'power1.inOut'), 0);
        tl.to(d.g, { x: TEX.x + TEX.w + 12, duration: 2.4, ease: 'power1.inOut' }, 0);
        tl.call(stopTyping, null, 2.4);
        d.pose(tl, 'idle', 2.5, 0.3);
        counter(zTex, 500, 2.4, 'power2.in', 0.3, tl);
        if (!instant) tl.call(() => avalanche(), null, 0.4);
        P.subT = D.text(svg, 120, ROW.tex + 40, '500 teksturer', 'mono', { style: 'font: 400 18px var(--font-mono); fill: var(--accent)' });
        tl.add(D.fadeIn(P.subT), 2.6);
      }

      if (i === 5) {
        // assets resume: needed 50, made 20 000+, published. He allows himself a fist pump.
        if (canvas) tl.to(canvas, { opacity: 0, duration: 0.6 }, 0);
        tl.to(zTex, { opacity: 0, duration: 0.3 }, 0);
        const rem = P.assetBlock;
        cutTo(tl, AFTER3.assetRest + 2, ROW.asset, 0.1);              // the pushed rest starts here
        d.pose(tl, 'type', 0.5, 0.3);
        tl.call(() => startTyping(1.3), null, 0.7);
        tl.to([rem.hatch, rem.zig], { opacity: 0, duration: 0.4 }, 0.3);
        const sv = { v: 0 };
        tl.to(sv, { v: 1, duration: 2.4, ease: 'power1.inOut', onUpdate: () => { rem.rfill.setAttribute('width', rem.w * sv.v); setPct(P.asset, ASSET.block + (1 - ASSET.block) * sv.v); } }, 0.7);
        tl.to(d.g, { x: AFTER3.assetRest + rem.w + 2, duration: 2.4, ease: 'power1.inOut' }, 0.7);
        tl.call(stopTyping, null, 3.1);
        counter(zAsset, 20000, 3, 'expo.in', 0.4, tl, '+');
        P.subA = D.text(svg, 120, ROW.asset + 40, '20 000+ assets', 'mono', { style: 'font: 400 18px var(--font-mono); fill: var(--accent-2)' });
        tl.add(D.fadeIn(P.subA), 2.8);
        P.stamp = D.stamp(svg, (ASSET.x + ASSET.w * ASSET.block + AFTER3.assetRest) / 2, ROW.asset, 'PUBLISERT', { size: 24, rotate: -6 });
        P.stamp.setAttribute('data-unit', '');
        tl.add(D.slam(P.stamp), 3.3);
        d.pose(tl, 'fist', 3.45, 0.25, 'back.out(3)');
        d.face(tl, 'smile', 3.45);
        tl.to(d.g, { y: `-=6`, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, 3.5);
        d.pose(tl, 'idle', 4.2, 0.5);
        mood(tl, 4, 3.4);
        tl.call(() => d.cup(3), null, 3.4);
      }

      if (i === 6) {
        // back to the game: resumes to 80 % and stalls; he jabs at it, then sinks onto the laptop
        tl.call(stopTyping, null, 0);
        tl.to(zAsset, { opacity: 0, duration: 0.3 }, 0);
        const rem = P.gameBlock;
        const gx = AFTER3.gameRest;                                 // the pushed rest starts here
        cutTo(tl, gx + 2, ROW.game, 0.1);
        tl.to([rem.hatch, rem.zig], { opacity: 0, duration: 0.4 }, 0.2);
        const target = (GAME.final - GAME.block) / (1 - GAME.block);
        d.pose(tl, 'type', 0.5, 0.3);
        d.face(tl, 'flat', 0.5);
        tl.call(() => startTyping(1.0), null, 0.7);
        const sv = { v: 0 };
        tl.to(sv, { v: target, duration: 2, ease: 'power2.out', onUpdate: () => { rem.rfill.setAttribute('width', rem.w * sv.v); setPct(P.game, GAME.block + (1 - GAME.block) * sv.v); } }, 0.7);
        tl.to(d.g, { x: gx + rem.w * target + 2, duration: 2, ease: 'power2.out' }, 0.7);
        tl.call(stopTyping, null, 2.7);
        d.face(tl, 'frown', 2.7);
        d.pose(tl, 'chopDown', 2.9, 0.12, 'power4.in');               // jab, jab
        d.pose(tl, 'type', 3.05, 0.15);
        d.pose(tl, 'chopDown', 3.3, 0.12, 'power4.in');
        d.pose(tl, 'type', 3.45, 0.15);
        d.slump(tl, 30, 3.8, 1.6);
        d.pose(tl, 'slumpDesk', 3.8, 1.6, 'sine.inOut');
        d.face(tl, 'tired', 4.2);
        mood(tl, 3, 3.6);
        // the bar keeps trying for 81 %
        const cs = { v: target };
        const nudge = target + 5 / rem.w;
        tl.call(() => loops.push(gsap.timeline({ repeat: -1, repeatDelay: 1.6 })
          .to(cs, { v: nudge, duration: 1.1, ease: 'sine.inOut', onUpdate: () => rem.rfill.setAttribute('width', rem.w * cs.v) })
          .to(cs, { v: target, duration: 0.2, ease: 'power3.in', onUpdate: () => rem.rfill.setAttribute('width', rem.w * cs.v) })), null, instant ? 0 : 5.4);
      }

      if (i === 7) {
        // three pipelines, one developer: a spotlight hops between rows, and so does he
        tl.call(stopTyping, null, 0);
        const spot = D.el('rect', { x: 100, y: ROW.game - 40, width: 1430, height: 80, rx: 10, style: 'fill: var(--accent-2)', opacity: 0, 'data-bg': '' }, svg);
        svg.insertBefore(spot, svg.firstChild.nextSibling);
        tl.to(spot, { opacity: 0.08, duration: 0.4 }, 0);
        d.slump(tl, 12, 0, 0.6);
        d.pose(tl, 'idle', 0, 0.6);
        d.desk(tl, false, 0.2);
        const gEnd = AFTER3.gameRest + P.gameBlock.w * ((GAME.final - GAME.block) / (1 - GAME.block));
        const at = { game: [gEnd + 2, ROW.game], asset: [AFTER3.assetRest + P.assetBlock.w + 2, ROW.asset], tex: [TEX.x + TEX.w + 12, ROW.tex] };
        const order = ['asset', 'tex', 'game', 'tex', 'asset', 'game'];
        P.th = d.think(tl, 'Hvilken nå?', 0.6);
        const hop = gsap.timeline({ repeat: -1 });
        order.forEach((r, k) => {
          const t0 = k * 1.1 + 0.4;
          hop.to(spot, { attr: { y: at[r][1] - 40 }, duration: 0.35, ease: 'power3.inOut' }, t0);
          hop.to(d.g, { opacity: 0, duration: 0.15 }, t0);
          hop.set(d.g, { x: at[r][0], y: at[r][1] + BH / 2 }, t0 + 0.15);
          hop.to(d.g, { opacity: 1, duration: 0.15 }, t0 + 0.2);
          // a look left, a look right: which one?
          [['lookL', 0.45], ['lookR', 0.75]].forEach(([n, dt]) => {
            const sub = gsap.timeline(); d.pose(sub, n, 0, 0.2); hop.add(sub, t0 + dt);
          });
        });
        tl.call(() => loops.push(hop), null, 1.2);
        if (instant) hop.pause(0);
        P.spot = spot;
      }

      if (i === 8) {
        // his answer to too many pipelines: another pipeline. Then the dive into his screen.
        tl.call(stopTyping, null, 0);
        tl.to([P.dl.grp, P.th], { opacity: 0, duration: 0.4 }, 0);
        const R4 = 652;
        tl.to(P.spot, { attr: { y: R4 - 40 }, duration: 0.5, ease: 'power3.inOut' }, 0.2);
        P.pick = pipeline({ x: TEX.x + TEX.w, w: 3 * MW }, R4, '#7fd0ff', 'Pipeline-velger');
        gsap.set(P.pick.track, { attr: { width: 0 } }); gsap.set(P.pick.lbl, { opacity: 0 });
        // an idea: he straightens up
        d.slump(tl, 2, 0.3, 0.5);
        d.face(tl, 'o', 0.3);
        const t = place(P.pick, TEX.x + TEX.w, R4, 0.5, { tired: false });
        d.face(tl, 'smile', t);
        tl.call(() => startTyping(1.4), null, t);
        tl.set(P.pick.pct, { opacity: 0 }, t); // 6 % is too short for a label, and he stands there
        tl.add(fillTo(P.pick, 0.06, 0.8), t);
        P.th = d.think(tl, 'Løsningen: én pipeline til.', t + 0.4, 2.0); // gone before the dive
        tl.call(() => { if (!instant && !ctx.deck?.instant) dive(); }, null, t + 2.6);
      }

      // focus: the pipeline this step is about; the other rows step back
      const ROWN = {
        game: () => [P.game?.grp, P.game?.lbl, P.gameBlock?.zig, P.gameBlock?.rem],
        asset: () => [P.asset?.grp, P.asset?.lbl, P.assetBlock?.zig, P.assetBlock?.rem, P.subA, P.stamp],
        tex: () => [P.tex?.grp, P.tex?.lbl, P.subT],
      };
      const ACTIVE = { 1: 'game', 2: 'asset', 3: 'asset', 4: 'tex', 5: 'asset', 6: 'game' };
      if (ACTIVE[i]) ctx.dim(tl, () => Object.keys(ROWN).filter((k) => k !== ACTIVE[i]).flatMap((k) => ROWN[k]()), 0.3);
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); loops2.forEach((l) => l.kill()); typer?.kill(); zoomer?.kill(); canvas = null; } };
  },
};
