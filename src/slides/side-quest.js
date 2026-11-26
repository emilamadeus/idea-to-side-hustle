import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, LOOK } from '../engine/characters.js';

/*
  Tip: side quests multiply. A Gantt chart that spills like a waterfall.

  Game pipeline runs to 40 % and blocks: it prints an order ("50 assets").
  The order drips into a new row: 3D asset pipeline. That runs to 20 % and blocks:
  "20 teksturer". Texture pipeline. Then the chain unwinds: textures finish
  (3 000 of them), assets finish (5 000 000, published on Fab), the game resumes
  to 80 % and stalls. Finally: three pipelines, one developer. Which one now?
  A developer portrait burns out as the launch date slides.

  Layout zones (svg units, 1600×900 frame), kept apart so nothing overlaps:
    tip            y  95–235  (left)
    month header   y 285–305
    rows           game 370 · asset 470 · texture 570   (bars 44 tall, x 460–1516)
    deadline label y 672 (below the chart), multiplier y 708
    developer      x 110–520, y 700–870
    counter/ask    x 700–1130, y 700–800
    4th row        y 652 (final step only; deadline label hidden then)
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
.slide-side-quest .slip { opacity: 0; transform-origin: 50% 0; font-size: calc(var(--u) * 1.25); padding: calc(var(--u) * .7) calc(var(--u) * 1); }
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
      <div class="slip slip-assets"><small>Bestilling</small>Trenger: 50 assets</div>
      <div class="slip slip-tex"><small>Bestilling</small>Trenger: 20 teksturer</div>
      <div class="zone zone-tex"><div class="counter">0</div><div class="counter-label">teksturer laget · trengte 20</div></div>
      <div class="zone zone-asset"><div class="counter">0</div><div class="counter-label">assets laget · trengte 50</div></div>
      <div class="zone zone-ask"><div class="ask">Hvilken kjører<br>jeg nå?</div><div class="counter-label" style="margin-top:calc(var(--u)*.8)">1 utvikler · 3 pipelines</div></div>
      <div class="zone zone-fix"><div class="ask">Løsningen:<br>én pipeline til.</div></div>`;
    const svg = D.stage(el);
    const tip = ctx.$('.sq-tip');
    const slipA = ctx.$('.slip-assets'), slipT = ctx.$('.slip-tex');
    const zTex = ctx.$('.zone-tex'), zAsset = ctx.$('.zone-asset'), zAsk = ctx.$('.zone-ask'), zFix = ctx.$('.zone-fix');
    // order slips print out under the bar, at the point where it blocks
    Object.assign(slipA.style, { left: U(GAME.x + GAME.w * GAME.block - 34), top: U(ROW.game + BH / 2 + 16) });
    Object.assign(slipT.style, { left: U(ASSET.x + ASSET.w * ASSET.block - 34), top: U(ROW.asset + BH / 2 + 16) });

    let P = {};
    let loops = [];
    let canvas = null;

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
      bar.track.setAttribute('width', bar.p.w * frac);
      return { zig, rem, hatch, rfill, x: bx, w };
    }
    const showBlock = (b) => gsap.timeline()
      .add(D.drawOn(b.zig, { duration: 0.3 }), 0)
      .fromTo(b.rem, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0);
    // Water drops from a bar down to the next row.
    function drip(x, y1, y2) {
      const grp = D.g(svg);
      const drops = Array.from({ length: 7 }, () => D.el('ellipse', { cx: x, cy: y1, rx: 6, ry: 9, fill: '#7fd0ff', opacity: 0 }, grp));
      const tl = gsap.timeline();
      drops.forEach((d, k) => {
        tl.fromTo(d, { attr: { cy: y1 }, opacity: 1 }, { attr: { cy: y2 }, duration: 0.4, ease: 'power2.in' }, k * 0.11)
          .to(d, { opacity: 0, duration: 0.1 }, k * 0.11 + 0.4);
      });
      const splash = D.p(grp, `M${x - 30} ${y2 + 4} q15 -14 30 0 q15 -14 30 0`, 'water');
      tl.add(D.drawOn(splash, { duration: 0.3 }), 0.45);
      tl.to(splash, { opacity: 0, duration: 0.4 }, 1.2);
      return tl;
    }
    // Slip feeds out of the bar (a smooth top-down reveal, settling at a slight tilt); later it
    // falls into the drip.
    const printSlip = (slip, rot) => gsap.timeline()
      .fromTo(slip, { opacity: 1, clipPath: 'inset(0 0 100% 0)', rotation: 0, y: -6 },
        { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.0, ease: 'power2.out' }, 0)
      .to(slip, { rotation: rot, duration: 0.6, ease: 'back.out(2)' }, 0.75);
    const dropSlip = (slip) => gsap.to(slip, { y: 60, opacity: 0, rotation: '+=14', duration: 0.5, ease: 'power2.in' });

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

    // ---------- developer portrait: burns out as the launch slides ----------
    const DEV = { hx: 190, hy: 790 };
    function developer() {
      const grp = D.g(svg);
      D.text(grp, 120, 700, 'UTVIKLER', 'mono', { style: 'font: 400 16px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      // the developer: the same 'you' as the rest of the talk, as a bust; moods are expressions
      const fig = figure(grp, { x: DEV.hx, y: DEV.hy + 40, s: 0.56, pose: 'sit', arms: 'down', ...LOOK.me, mouth: 'smile' });
      const head = fig.root;
      const sweat = D.p(grp, `M${DEV.hx + 30} ${DEV.hy - 26} q-6 10 0 14 q6 -4 0 -14 Z`, '', { style: 'fill: #9fd3ff; stroke: none', opacity: 0 });
      // coffee and energy
      D.text(grp, 330, 742, 'ENERGI', 'mono', { style: 'font: 400 16px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
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
      const flag = D.g(grp, { opacity: 0 });
      D.p(flag, 'M262 872 V752', 'ln');
      D.p(flag, 'M262 752 h40 l-8 13 l8 13 h-40', 'ln');
      return { grp, head, fig, sweat, energy, cups: [...cups.children], flag };
    }
    const MOOD = [
      { energy: 1.0, cups: 1, color: 'var(--accent-2)', tilt: 0 },
      { energy: 0.65, cups: 2, color: 'var(--accent-2)', tilt: 0 },
      { energy: 0.3, cups: 4, color: 'var(--accent)', tilt: -6 },
      { energy: 0.06, cups: 7, color: 'var(--note)', tilt: -14 },
    ];
    function mood(tl, k, at = 0) {
      const m = MOOD[k];
      const FACE = [
        { eyes: 'open', brows: 'neutral', mouth: 'smile' },
        { eyes: 'open', brows: 'tired', mouth: 'neutral' },
        { eyes: 'down', brows: 'tired', mouth: 'frown' },
        { eyes: 'closed', brows: 'tired', mouth: 'frown' },
      ];
      P.dev.fig.expr(tl, FACE[k], at);
      tl.to(P.dev.sweat, { opacity: k >= 2 ? 1 : 0, duration: 0.3 }, at + 0.2);
      tl.to(P.dev.energy, { attr: { width: 216 * m.energy }, duration: 0.9, ease: 'power2.inOut' }, at);
      tl.call(() => { P.dev.energy.style.fill = m.color; }, null, at);
      P.dev.cups.forEach((c, i) => tl.to(c, { opacity: i < m.cups ? 1 : 0, duration: 0.2 }, at + 0.1 + i * 0.06));
      tl.to(P.dev.head, { rotation: m.tilt, svgOrigin: `${DEV.hx} ${DEV.hy + 90}`, duration: 0.8, ease: 'power2.inOut' }, at);
      tl.to(P.dev.flag, { opacity: k === 3 ? 1 : 0, duration: 0.4 }, at + 0.6);
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

    const counter = (zone, to, dur, ease, at, tl) => {
      const c = zone.querySelector('.counter');
      const s = { v: 0 };
      tl.fromTo(zone, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, at);
      tl.to(s, { v: to, duration: dur, ease, onUpdate: () => { c.textContent = Math.round(s.v).toLocaleString('nb-NO'); } }, at + 0.2);
    };

    // ---------- steps ----------
    const reset = () => {
      loops.forEach((l) => l.kill()); loops = [];
      svg.innerHTML = '';
      canvas?.remove(); canvas = null;
      gsap.set([slipA, slipT, zTex, zAsset, zAsk, zFix], { opacity: 0, x: 0, y: 0, rotation: 0, clearProps: 'clipPath' });
      P = {};
      defs();
    };

    const play = (i, instant) => {
      const tl = gsap.timeline();

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
        P.dev = developer();
        tl.add(D.fadeIn(P.dev.grp), 0.8);
        mood(tl, 0, 0.8);
        tl.add(fillTo(P.game, GAME.block, 1.8), 1.0);
        tl.call(() => { P.gameBlock = block(P.game, GAME.block); showBlock(P.gameBlock); }, null, 2.8);
        tl.add(printSlip(slipA, -3), 3.1);
      }

      if (i === 1) {
        // the order falls and spills into a new pipeline
        tl.add(dropSlip(slipA), 0);
        tl.add(drip(GAME.x + GAME.w * GAME.block, ROW.game + BH / 2, ROW.asset - BH / 2), 0.2);
        P.asset = pipeline(ASSET, ROW.asset, 'var(--accent-2)', '3D asset pipeline');
        gsap.set(P.asset.track, { attr: { width: 0 } });
        tl.add(D.fadeIn(P.asset.lbl), 0.9);
        tl.to(P.asset.track, { attr: { width: ASSET.w }, duration: 1, ease: 'power2.out' }, 0.9);
        tl.to(P.gameBlock.rem, { x: AFTER1.gameRest - P.gameBlock.x, duration: 1.1, ease: 'power3.inOut' }, 1.3);
        moveDeadline(tl, 1, 1.3);
        mood(tl, 1, 2.2);
      }

      if (i === 2) {
        tl.add(fillTo(P.asset, ASSET.block, 1.2), 0);
        tl.call(() => { P.assetBlock = block(P.asset, ASSET.block); showBlock(P.assetBlock); }, null, 1.2);
        tl.add(printSlip(slipT, 3), 1.5);
      }

      if (i === 3) {
        tl.add(dropSlip(slipT), 0);
        tl.add(drip(TEX.x, ROW.asset + BH / 2, ROW.tex - BH / 2), 0.2);
        P.tex = pipeline(TEX, ROW.tex, 'var(--accent)', 'Texture pipeline');
        gsap.set(P.tex.track, { attr: { width: 0 } });
        tl.add(D.fadeIn(P.tex.lbl), 0.9);
        tl.to(P.tex.track, { attr: { width: TEX.w }, duration: 1, ease: 'power2.out' }, 0.9);
        tl.to(P.assetBlock.rem, { x: AFTER3.assetRest - P.assetBlock.x, duration: 1.1, ease: 'power3.inOut' }, 1.3);
        tl.to(P.gameBlock.rem, { x: AFTER3.gameRest - P.gameBlock.x, duration: 1.1, ease: 'power3.inOut' }, 1.4);
        moveDeadline(tl, 2, 1.4);
        mood(tl, 2, 2.3);
      }

      if (i === 4) {
        // textures: needed 20, made 3 000
        tl.add(fillTo(P.tex, 1, 2.4, 'power1.inOut'), 0);
        counter(zTex, 3000, 2.8, 'power2.in', 0.3, tl);
        if (!instant) tl.call(() => avalanche(), null, 0.4);
        P.subT = D.text(svg, 120, ROW.tex + 40, '3 000 teksturer', 'mono', { style: 'font: 400 18px var(--font-mono); fill: var(--accent)' });
        tl.add(D.fadeIn(P.subT), 2.6);
      }

      if (i === 5) {
        // assets resume: needed 50, made 5 000 000
        if (canvas) tl.to(canvas, { opacity: 0, duration: 0.6 }, 0);
        tl.to(zTex, { opacity: 0, duration: 0.3 }, 0);
        const rem = P.assetBlock;
        tl.to([rem.hatch, rem.zig], { opacity: 0, duration: 0.4 }, 0.3);
        const s = { v: 0 };
        tl.to(s, { v: 1, duration: 2.4, ease: 'power1.inOut', onUpdate: () => { rem.rfill.setAttribute('width', rem.w * s.v); setPct(P.asset, ASSET.block + (1 - ASSET.block) * s.v); } }, 0.4);
        // conveyor under the resumed part
        const conv = D.g(rem.rem);
        const x0 = rem.x, x1 = rem.x + rem.w, cy = ROW.asset + BH / 2 + 22;
        D.p(conv, `M${x0} ${cy} H${x1}`, 'thin');
        for (let x = x0 + 10; x < x1; x += 30) D.el('circle', { cx: x, cy: cy + 6, r: 4, fill: 'none', style: 'stroke: var(--muted)', 'stroke-width': 2 }, conv);
        const boxes = D.g(conv);
        for (let k = 0; k < 9; k++) D.el('rect', { x: x0 + k * 30, y: cy - 16, width: 14, height: 14, style: 'fill: var(--accent-2)' }, boxes);
        tl.add(D.fadeIn(conv), 0.3);
        loops.push(gsap.to(boxes, { x: 30, duration: 0.22, ease: 'none', repeat: -1 }));
        counter(zAsset, 5000000, 3, 'expo.in', 0.4, tl);
        P.subA = D.text(svg, 120, ROW.asset + 40, '5 000 000 assets', 'mono', { style: 'font: 400 18px var(--font-mono); fill: var(--accent-2)' });
        tl.add(D.fadeIn(P.subA), 2.8);
        // published: stamp in the gap between the asset bar's two segments
        P.stamp = D.stamp(svg, (ASSET.x + ASSET.w * ASSET.block + AFTER3.assetRest) / 2, ROW.asset, 'PUBLISERT', { size: 24, rotate: -6 });
        P.stamp.setAttribute('data-unit', '');
        tl.add(D.slam(P.stamp), 3.2);
      }

      if (i === 6) {
        // back to the game: resumes to 80 % and stalls; the developer is nearly done in
        loops.forEach((l) => l.kill()); loops = [];
        tl.to(zAsset, { opacity: 0, duration: 0.3 }, 0);
        const rem = P.gameBlock;
        tl.to([rem.hatch, rem.zig], { opacity: 0, duration: 0.4 }, 0.2);
        const target = (GAME.final - GAME.block) / (1 - GAME.block);
        const s = { v: 0 };
        tl.to(s, { v: target, duration: 2, ease: 'power2.out', onUpdate: () => { rem.rfill.setAttribute('width', rem.w * s.v); setPct(P.game, GAME.block + (1 - GAME.block) * s.v); } }, 0.4);
        mood(tl, 3, 1.4);
        // keeps trying for 81 %
        const cs = { v: target };
        const nudge = target + 5 / rem.w;
        loops.push(gsap.timeline({ repeat: -1, repeatDelay: 1.6, delay: instant ? 0.5 : 3 })
          .to(cs, { v: nudge, duration: 1.1, ease: 'sine.inOut', onUpdate: () => rem.rfill.setAttribute('width', rem.w * cs.v) })
          .to(cs, { v: target, duration: 0.2, ease: 'power3.in', onUpdate: () => rem.rfill.setAttribute('width', rem.w * cs.v) }));
      }

      if (i === 7) {
        // three pipelines, one developer: a spotlight hops between rows and can't settle
        const spot = D.el('rect', { x: 100, y: ROW.game - 40, width: 1430, height: 80, rx: 10, style: 'fill: var(--accent-2)', opacity: 0 }, svg);
        svg.insertBefore(spot, svg.firstChild.nextSibling);
        spot.setAttribute('data-bg', '');
        tl.to(spot, { opacity: 0.08, duration: 0.4 }, 0);
        const rows = [ROW.game, ROW.asset, ROW.tex];
        const hop = gsap.timeline({ repeat: -1 });
        [1, 2, 0, 2, 1, 0].forEach((r, k) => hop.to(spot, { attr: { y: rows[r] - 40 }, duration: 0.35, ease: 'power3.inOut' }, k * 0.7 + 0.4));
        loops.push(hop);
        P.spot = spot;
        tl.fromTo(zAsk, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 }, 0.3);
      }

      if (i === 8) {
        // the developer's answer to too many pipelines: another pipeline
        loops.forEach((l) => l.kill()); loops = [];
        tl.to([zAsk, P.dl.grp], { opacity: 0, duration: 0.4 }, 0);
        const R4 = 652;
        tl.to(P.spot, { attr: { y: R4 - 40 }, duration: 0.5, ease: 'power3.inOut' }, 0.2);
        tl.add(drip(TEX.x + TEX.w, ROW.tex + BH / 2, R4 - BH / 2), 0.5);
        P.pick = pipeline({ x: TEX.x + TEX.w, w: 3 * MW }, R4, '#7fd0ff', 'Pipeline-velger');
        gsap.set(P.pick.track, { attr: { width: 0 } });
        tl.add(D.fadeIn(P.pick.lbl), 1.1);
        tl.to(P.pick.track, { attr: { width: 3 * MW }, duration: 1, ease: 'power2.out' }, 1.1);
        tl.add(fillTo(P.pick, 0.06, 0.8), 2.1);
        tl.fromTo(zFix, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 }, 2.6);
      }
      // focus: the pipeline this step is about; the other rows step back
      const ROWN = {
        game: () => [P.game?.grp, P.game?.lbl, P.gameBlock?.zig, P.gameBlock?.rem],
        asset: () => [P.asset?.grp, P.asset?.lbl, P.assetBlock?.zig, P.assetBlock?.rem, P.subA, P.stamp],
        tex: () => [P.tex?.grp, P.tex?.lbl, P.subT],
      };
      const ACTIVE = { 1: 'asset', 2: 'asset', 3: 'tex', 4: 'tex', 5: 'asset', 6: 'game' };
      if (ACTIVE[i]) ctx.dim(tl, () => Object.keys(ROWN).filter((k) => k !== ACTIVE[i]).flatMap((k) => ROWN[k]()), 0.3);
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); canvas = null; } };
  },
};
