import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, LOOK } from '../engine/characters.js';

/*
  Tip: side quests multiply. A Gantt chart, built and broken by the developer himself: a small
  figure (about one and a half bars tall) who types at a laptop while a bar fills, gets an idea
  in a thought bubble, splits the bar, leans into the rest of it and pushes it to its new
  estimate, then drags in the next pipeline. He gets slower and more slumped each time.
    0. Typing: the game bar fills to 40 %. Thought: "Trenger: 50 assets".
    1. He splits the bar and pushes the rest out; the launch moves. He drags in the asset pipeline.
    2. Typing: assets to 20 %. Thought: "Trenger: 20 teksturer".
    3. Split, push; the game's rest is knocked along too. A sigh. He drags in the texture pipeline.
    4. Textures: needed 20, made 3 000.
    5. Assets: needed 50, made 5 000 000, published.
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

    // ---------- the developer: small, on the chart itself ----------
    // Local coordinates: feet at (0, 0), 66 tall; hips at (0, -22). Rotations are set by hand
    // (a proxy angle per part), since the parts sit inside a moving group.
    const INKS = 'stroke: #1a120c; stroke-width: 2; stroke-linejoin: round';
    function developer() {
      const g = D.g(svg, { 'data-unit': '', 'data-overlap-ok': '' });
      // the standing desk and laptop, to his right; the screen is 32×18 (16:9) for the finale
      const desk = D.g(g);
      D.el('rect', { x: 28, y: -30, width: 5, height: 30, style: `fill: #4a3020; ${INKS}` }, desk);
      D.el('rect', { x: 14, y: -33, width: 38, height: 5, rx: 1.5, style: `fill: #6b4a30; ${INKS}` }, desk);
      const screen = D.g(desk);
      D.el('rect', { x: 17, y: -53, width: 32, height: 18, rx: 1, style: `fill: #0f0a07; ${INKS}` }, screen);
      const code = [0, 1, 2].map((k) => D.el('rect', { x: 21, y: -49 + k * 5, width: [18, 12, 22][k], height: 2.4, style: 'fill: #8fe3a2' }, screen));
      const cups = D.g(desk);
      const legL = D.el('rect', { x: -7, y: -23, width: 6, height: 23, rx: 2, style: `fill: #2c3550; ${INKS}` }, g);
      const legR = D.el('rect', { x: 1, y: -23, width: 6, height: 23, rx: 2, style: `fill: #2c3550; ${INKS}` }, g);
      const torso = D.g(g);
      const armB = D.el('rect', { x: -3, y: -43, width: 6, height: 18, rx: 3, style: `fill: #34404f; ${INKS}` }, torso);
      D.el('rect', { x: -10, y: -46, width: 20, height: 26, rx: 7, style: `fill: #3c4a5c; ${INKS}` }, torso);
      const armF = D.el('rect', { x: -3, y: -43, width: 6, height: 18, rx: 3, style: `fill: #46576c; ${INKS}` }, torso);
      const head = D.g(torso);
      D.el('circle', { cx: 0, cy: -56, r: 10, style: `fill: #e2b48f; ${INKS}` }, head);
      D.p(head, 'M-10 -58 l-1 -6 l4 2 l1 -6 l4 4 l3 -6 l3 5 l4 -3 l1 6 l3 1 C6 -66 -4 -67 -10 -58 Z', '', { style: `fill: #6b4128; ${INKS}` });
      D.p(head, 'M-6 -56 h4 M2 -56 h4 M-2 -56 h4', '', { style: 'fill: none; stroke: #1a120c; stroke-width: 2' });
      return { g, torso, head, armF, armB, legL, legR, screen, code, cups };
    }
    // rotate a part about a point, tweened through a stored angle
    const turn = (tl, node, cx, cy, to, dur, at, ease = 'sine.inOut') => {
      const st = node._a ??= { a: 0 };
      tl.to(st, { a: to, duration: dur, ease, onUpdate: () => node.setAttribute('transform', `rotate(${st.a} ${cx} ${cy})`) }, at);
    };
    const SHOULDER = [0, -41], HIP = [0, -22];
    // posture: how slumped he is (degrees); grows step by step
    const slump = (tl, deg, at, dur = 0.8) => { turn(tl, P.dev.torso, HIP[0], HIP[1], deg, dur, at); turn(tl, P.dev.head, 0, -46, deg * 0.8, dur, at); };
    // typing: arms bob and code lines flicker until stop() is called
    function typing() {
      const d = P.dev;
      const t = gsap.timeline({ repeat: -1 });
      [d.armF, d.armB].forEach((a, k) => {
        const st = a._a ??= { a: 0 };
        t.to(st, { a: -70 - k * 6, duration: 0.09, onUpdate: () => a.setAttribute('transform', `rotate(${st.a} ${SHOULDER[0]} ${SHOULDER[1]})`) }, k * 0.09)
          .to(st, { a: -58, duration: 0.09, onUpdate: () => a.setAttribute('transform', `rotate(${st.a} ${SHOULDER[0]} ${SHOULDER[1]})`) }, k * 0.09 + 0.09);
      });
      d.code.forEach((c, k) => t.to(c, { opacity: 0.25, duration: 0.12, yoyo: true, repeat: 1 }, k * 0.06));
      loops.push(t);
      return t;
    }
    const stopTyping = () => { loops.forEach((l) => l.kill()); loops = []; };
    // arms down by his sides / straight forward (pushing)
    const arms = (tl, deg, at, dur = 0.3) => { turn(tl, P.dev.armF, ...SHOULDER, deg, dur, at); turn(tl, P.dev.armB, ...SHOULDER, deg - 6, dur, at); };
    // walk to x along his row: legs swing, slower when tired
    function walk(tl, x, at, speed, from) {
      const dur = Math.max(0.4, Math.abs(x - from) / speed);
      tl.to(P.dev.g, { x, duration: dur, ease: 'none' }, at);
      const n = Math.max(1, Math.round(dur / 0.36));
      for (let k = 0; k < n; k++) {
        turn(tl, P.dev.legL, ...HIP, 16, 0.18, at + k * 0.36);
        turn(tl, P.dev.legR, ...HIP, -16, 0.18, at + k * 0.36);
        turn(tl, P.dev.legL, ...HIP, -16, 0.18, at + k * 0.36 + 0.18);
        turn(tl, P.dev.legR, ...HIP, 16, 0.18, at + k * 0.36 + 0.18);
      }
      turn(tl, P.dev.legL, ...HIP, 0, 0.15, at + dur);
      turn(tl, P.dev.legR, ...HIP, 0, 0.15, at + dur);
      return at + dur;
    }
    // to another row: a cut (out, move, in), never a walk through the chart
    function cutTo(tl, x, row, at) {
      tl.to(P.dev.g, { opacity: 0, duration: 0.25 }, at);
      tl.set(P.dev.g, { x, y: row + BH / 2 }, at + 0.25);
      tl.to(P.dev.g, { opacity: 1, duration: 0.25 }, at + 0.3);
      return at + 0.55;
    }
    const deskShown = (tl, on, at) => tl.to(P.dev.g.firstChild, { opacity: on ? 1 : 0, duration: 0.3 }, at);
    // a thought: a cloud to the right of his head, with two small dots leading to it
    function think(tl, str, at, hold = 0) {
      const x = 0, y = 0; // inside his group: the bubble follows him
      const g = D.g(P.dev.g, { 'data-overlap-ok': '' });
      const w = str.length * 9.6 + 34;
      D.el('circle', { cx: x + 13, cy: y - 50, r: 3, style: 'fill: #fff3e3' }, g);
      D.el('circle', { cx: x + 21, cy: y - 58, r: 4.5, style: 'fill: #fff3e3' }, g);
      D.el('rect', { x: x + 28, y: y - 76, width: w, height: 32, rx: 16, style: 'fill: #fff3e3' }, g);
      D.text(g, x + 28 + w / 2, y - 54, str, 'th', { 'text-anchor': 'middle', style: 'font: 700 17px var(--font-display); fill: #1a120c' });
      tl.fromTo(g, { opacity: 0, scale: 0.6, transformOrigin: '0% 100%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.2)' }, at);
      if (hold) tl.to(g, { opacity: 0, duration: 0.3 }, at + hold);
      return g;
    }
    const pop = (tl, g, at) => g && tl.to(g, { opacity: 0, scale: 1.15, transformOrigin: '0% 100%', duration: 0.25 }, at);
    // coffee on the desk, one more each round
    function cup(k) {
      const c = D.g(P.dev.cups);
      const cx = 34 + k * 7;
      D.el('rect', { x: cx, y: -40, width: 5, height: 7, rx: 1, style: `fill: #fff3e3; ${INKS}` }, c);
      return c;
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
      const scr = P.dev.screen.firstChild.getBoundingClientRect();
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
      gsap.set([zTex, zAsset], { opacity: 0, x: 0, y: 0 });
      zoomer?.kill(); zoomer = null;
      gsap.set(tip, { opacity: 1 });
      P = {};
      defs();
    };

    const play = (i, instant) => {
      const tl = gsap.timeline();

      // a split and a push: chop at the block, lean into the rest, push it to its new place
      const splitPush = (bar, frac, key, to, at, speed, sag) => {
        const bx = bar.p.x + bar.p.w * frac;
        stopTyping();
        deskShown(tl, false, at);
        arms(tl, -150, at + 0.2, 0.25);                       // arm up …
        arms(tl, -20, at + 0.55, 0.12);                      // … and down: the chop
        P[key] = block(bar, frac);
        tl.add(showBlock(P[key]), at + 0.62);
        let t = walk(tl, bx - 12, at + 0.9, speed, gsap.getProperty(P.dev.g, 'x'));  // step up to the cut
        slump(tl, sag + 14, t, 0.4);                         // lean in
        arms(tl, -90, t, 0.3);
        const d = Math.abs(to - bx) / (speed * 0.45);
        tl.to(P.dev.g, { x: to - 12, duration: d, ease: 'power1.inOut' }, t + 0.3);
        tl.to(P[key].rem, { x: to - bx, duration: d, ease: 'power1.inOut' }, t + 0.3);
        return { t: t + 0.3, d };
      };
      const place = (pipe, x, row, at, sag) => {
        // he drags the new bar in: the track grows from his position as he backs to the start
        let t = cutTo(tl, x + pipe.p.w * 0.35, row, at);
        slump(tl, sag, t, 0.3);
        arms(tl, -60, t, 0.3);
        tl.to(pipe.track, { attr: { width: pipe.p.w }, duration: 1.1, ease: 'power2.out' }, t + 0.2);
        tl.add(D.fadeIn(pipe.lbl), t + 0.2);
        t = walk(tl, x + 14, t + 0.3, 70, x + pipe.p.w * 0.35);
        deskShown(tl, true, t);
        arms(tl, -60, t, 0.2);
        return t + 0.3;
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
        P.dev = developer();
        gsap.set(P.dev.g, { x: GAME.x + 14, y: ROW.game + BH / 2 });
        cup(0);
        tl.fromTo(P.dev.g, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.8);
        // he types; the bar fills under his hands and he moves along with it
        tl.call(() => typing(), null, 1.0);
        tl.add(fillTo(P.game, GAME.block, 2.4), 1.0);
        tl.to(P.dev.g, { x: GAME.x + GAME.w * GAME.block + 2, duration: 2.4, ease: 'power2.out' }, 1.0);
        tl.call(() => stopTyping(), null, 3.4);
        arms(tl, -20, 3.4);
        P.th = think(tl, 'Trenger: 50 assets', 3.7);
      }

      if (i === 1) {
        pop(tl, P.th, 0);
        P.asset = pipeline(ASSET, ROW.asset, 'var(--accent-2)', '3D asset pipeline');
        gsap.set(P.asset.track, { attr: { width: 0 } }); gsap.set(P.asset.lbl, { opacity: 0 });
        const { t, d } = splitPush(P.game, GAME.block, 'gameBlock', AFTER1.gameRest, 0.3, 110, 4);
        tl.to(P.dl.grp, { x: DEADLINE[1], duration: d, ease: 'power1.inOut' }, t);
        tl.call(() => { P.dl.txt.textContent = `LANSERING: ${monthAt(DEADLINE[1]).toUpperCase()}`; P.dl.mult.textContent = '×2'; }, null, t + d);
        tl.fromTo(P.dl.mult, { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + d);
        arms(tl, -20, t + d, 0.3);
        const end = place(P.asset, ASSET.x, ROW.asset, t + d + 0.4, 6);
        tl.call(() => cup(1), null, end);
      }

      if (i === 2) {
        tl.call(() => typing(), null, 0.1);
        tl.add(fillTo(P.asset, ASSET.block, 2.0), 0.1);
        tl.to(P.dev.g, { x: ASSET.x + ASSET.w * ASSET.block + 2, duration: 2.0, ease: 'power2.out' }, 0.1);
        tl.call(() => stopTyping(), null, 2.2);
        arms(tl, -20, 2.2);
        P.th = think(tl, 'Trenger: 20 teksturer', 2.5);
      }

      if (i === 3) {
        pop(tl, P.th, 0);
        P.tex = pipeline(TEX, ROW.tex, 'var(--accent)', 'Texture pipeline');
        gsap.set(P.tex.track, { attr: { width: 0 } }); gsap.set(P.tex.lbl, { opacity: 0 });
        const { t, d } = splitPush(P.asset, ASSET.block, 'assetBlock', AFTER3.assetRest, 0.3, 85, 9);
        // the game's rest gets knocked along with it
        tl.to(P.gameBlock.rem, { x: AFTER3.gameRest - P.gameBlock.x, duration: d, ease: 'power1.inOut' }, t + 0.2);
        tl.to(P.dl.grp, { x: DEADLINE[2], duration: d, ease: 'power1.inOut' }, t + 0.2);
        tl.call(() => { P.dl.txt.textContent = `LANSERING: ${monthAt(DEADLINE[2]).toUpperCase()}`; P.dl.mult.textContent = '×3'; }, null, t + d + 0.2);
        arms(tl, -20, t + d, 0.3);
        slump(tl, 10, t + d, 0.6);
        think(tl, 'Pff.', t + d + 0.3, 1.2);
        const end = place(P.tex, TEX.x, ROW.tex, t + d + 1.7, 10);
        tl.call(() => cup(2), null, end);
      }

      if (i === 4) {
        // textures: needed 20, made 3 000
        tl.call(() => typing(), null, 0);
        tl.add(fillTo(P.tex, 1, 2.4, 'power1.inOut'), 0);
        tl.to(P.dev.g, { x: TEX.x + TEX.w + 12, duration: 2.4, ease: 'power1.inOut' }, 0);
        tl.call(() => stopTyping(), null, 2.4);
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
        cutTo(tl, AFTER3.assetRest - rem.w + 14, ROW.asset, 0.1);
        tl.call(() => typing(), null, 0.7);
        tl.to([rem.hatch, rem.zig], { opacity: 0, duration: 0.4 }, 0.3);
        const s = { v: 0 };
        tl.to(s, { v: 1, duration: 2.4, ease: 'power1.inOut', onUpdate: () => { rem.rfill.setAttribute('width', rem.w * s.v); setPct(P.asset, ASSET.block + (1 - ASSET.block) * s.v); } }, 0.7);
        tl.to(P.dev.g, { x: AFTER3.assetRest - 40, duration: 2.4, ease: 'power1.inOut' }, 0.7);
        tl.call(() => stopTyping(), null, 3.1);
        counter(zAsset, 5000000, 3, 'expo.in', 0.4, tl);
        P.subA = D.text(svg, 120, ROW.asset + 40, '5 000 000 assets', 'mono', { style: 'font: 400 18px var(--font-mono); fill: var(--accent-2)' });
        tl.add(D.fadeIn(P.subA), 2.8);
        P.stamp = D.stamp(svg, (ASSET.x + ASSET.w * ASSET.block + AFTER3.assetRest) / 2, ROW.asset, 'PUBLISERT', { size: 24, rotate: -6 });
        P.stamp.setAttribute('data-unit', '');
        tl.add(D.slam(P.stamp), 3.3);
        tl.call(() => cup(3), null, 3.3);
      }

      if (i === 6) {
        // back to the game: resumes to 80 % and stalls; he slumps over the laptop
        stopTyping();
        tl.to(zAsset, { opacity: 0, duration: 0.3 }, 0);
        const rem = P.gameBlock;
        const gx = AFTER3.gameRest - rem.w;
        cutTo(tl, gx + 14, ROW.game, 0.1);
        tl.to([rem.hatch, rem.zig], { opacity: 0, duration: 0.4 }, 0.2);
        const target = (GAME.final - GAME.block) / (1 - GAME.block);
        tl.call(() => typing(), null, 0.7);
        const s = { v: 0 };
        tl.to(s, { v: target, duration: 2, ease: 'power2.out', onUpdate: () => { rem.rfill.setAttribute('width', rem.w * s.v); setPct(P.game, GAME.block + (1 - GAME.block) * s.v); } }, 0.7);
        tl.to(P.dev.g, { x: gx + rem.w * target + 2, duration: 2, ease: 'power2.out' }, 0.7);
        tl.call(() => stopTyping(), null, 2.7);
        arms(tl, -20, 2.7);
        slump(tl, 32, 3.0, 1.4);                              // down onto the laptop, slowly
        tl.call(() => cup(4), null, 3.0);
        // the bar keeps trying for 81 %
        const cs = { v: target };
        const nudge = target + 5 / rem.w;
        tl.call(() => loops.push(gsap.timeline({ repeat: -1, repeatDelay: 1.6 })
          .to(cs, { v: nudge, duration: 1.1, ease: 'sine.inOut', onUpdate: () => rem.rfill.setAttribute('width', rem.w * cs.v) })
          .to(cs, { v: target, duration: 0.2, ease: 'power3.in', onUpdate: () => rem.rfill.setAttribute('width', rem.w * cs.v) })), null, instant ? 0 : 3.2);
      }

      if (i === 7) {
        // three pipelines, one developer: a spotlight hops between rows, and so does he
        stopTyping();
        const spot = D.el('rect', { x: 100, y: ROW.game - 40, width: 1430, height: 80, rx: 10, style: 'fill: var(--accent-2)', opacity: 0, 'data-bg': '' }, svg);
        svg.insertBefore(spot, svg.firstChild.nextSibling);
        tl.to(spot, { opacity: 0.08, duration: 0.4 }, 0);
        slump(tl, 14, 0, 0.5);
        const at = { game: [AFTER3.gameRest - 30, ROW.game], asset: [AFTER3.assetRest - 30, ROW.asset], tex: [TEX.x + TEX.w - 30, ROW.tex] };
        const order = ['asset', 'tex', 'game', 'tex', 'asset', 'game'];
        P.th = think(tl, 'Hvilken nå?', 0.6);
        const hop = gsap.timeline({ repeat: -1 });
        order.forEach((r, k) => {
          hop.to(spot, { attr: { y: at[r][1] - 40 }, duration: 0.35, ease: 'power3.inOut' }, k * 0.9 + 0.4);
          hop.to(P.dev.g, { opacity: 0, duration: 0.15 }, k * 0.9 + 0.4);
          hop.set(P.dev.g, { x: at[r][0], y: at[r][1] + BH / 2 }, k * 0.9 + 0.55);
          hop.to(P.dev.g, { opacity: 1, duration: 0.15 }, k * 0.9 + 0.6);
        });
        tl.call(() => loops.push(hop), null, 1.2);
        if (instant) hop.pause(0);
        P.spot = spot;
      }

      if (i === 8) {
        // his answer to too many pipelines: another pipeline. Then the dive into his screen.
        stopTyping();
        tl.to([P.dl.grp, P.th], { opacity: 0, duration: 0.4 }, 0);
        const R4 = 652;
        tl.to(P.spot, { attr: { y: R4 - 40 }, duration: 0.5, ease: 'power3.inOut' }, 0.2);
        P.pick = pipeline({ x: TEX.x + TEX.w, w: 3 * MW }, R4, '#7fd0ff', 'Pipeline-velger');
        gsap.set(P.pick.track, { attr: { width: 0 } }); gsap.set(P.pick.lbl, { opacity: 0 });
        slump(tl, 4, 0.3, 0.4);
        let t = place(P.pick, TEX.x + TEX.w, R4, 0.4, 4);
        tl.call(() => typing(), null, t);
        tl.set(P.pick.pct, { opacity: 0 }, t); // 6 % is too short for a label, and he stands there
        tl.add(fillTo(P.pick, 0.06, 0.8), t);
        P.th = think(tl, 'Løsningen: én pipeline til.', t + 0.4, 2.0); // gone before the dive, so the screen is clear
        // the dive: the laptop screen holds this whole chart, which holds it again, and so on
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
    return { ...s, dispose() { loops.forEach((l) => l.kill()); zoomer?.kill(); canvas = null; } };
  },
};
