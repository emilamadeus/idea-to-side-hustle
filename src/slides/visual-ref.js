import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { figure, PALETTE } from '../engine/characters.js';
import { chatPhone, attempt, FILL } from '../engine/props.js';

/*
  Tip: give it a picture, not a list.
    0. The prompt, and what you actually have in mind (a thought cloud: a warm timber house).
    1. Attempt 1: the list becomes a checklist and every box is ticked, but the result is the
       cheap knock-off: a grey flat-roofed box, orange paint for "varm", a heat pump, mismatched
       plastic windows, kitchen, sofa and bed seen through one window.
    2. Attempt 2, a new session: the thought becomes a real reference image (made in ChatGPT).
       The house is built against it: close to the picture, a little plainer.

  Layout zones (svg units):
    tip         x 80–540, y 110–240
    chat phone  x 80–500, y 262–782 (prompt, thinking, replies; scrolls)
    attempt     x 560–900, y 140–174
    build area  x 600–1290, y 360–760 ; thought cloud / polaroid x 1200–1480, y 150–440
    thought dots y 250–300, from the cloud back to the prompt in the phone
*/

const REQ = ['Moderne', 'Varm', 'Åpen planløsning', 'Store vinduer'];
const PROMPT = 'Lag et hus. Moderne, varmt, åpen planløsning og store vinduer.';
const GROUND = 740;
// houses are drawn with dark ink, like the reference render (a cream outline reads cheap)
const INK = (fill, w = 2.6) => ({ style: `fill: ${fill}; stroke: #1a120c`, 'stroke-width': w, 'stroke-linejoin': 'round' });
// outline of the house you have in mind (the built version in attempt 2)
const TARGET = 'M700 740 V470 L860 380 L1180 470 V740 Z';
// The reference: a detailed dusk render of the house (240×180 design space), drawn into any
// frame (thought cloud, polaroid, attachment chip). Gradients live in the slide's <defs>.
function ensureDefs(g) {
  const svg = g.ownerSVGElement || g;
  if (svg.querySelector('#vr-sky')) return;
  const defs = D.el('defs', {}, svg);
  const grad = (id, stops, vertical = true) => {
    const lg = D.el('linearGradient', { id, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0 }, defs);
    stops.forEach(([o, c]) => D.el('stop', { offset: o, 'stop-color': c }, lg));
  };
  grad('vr-sky', [[0, '#26324f'], [0.6, '#7a5a6a'], [1, '#e8a06a']]);
  grad('vr-grass', [[0, '#4c5c3a'], [1, '#26301e']]);
  grad('vr-wood', [[0, '#9a6a42'], [1, '#5a3620']]);
  grad('vr-glow', [[0, '#fff0c2'], [1, '#f2a24a']]);
}
function targetPic(g, x, y, w, h) {
  ensureDefs(g);
  const p = D.g(g, { transform: `translate(${x} ${y}) scale(${w / 240} ${h / 180})` });
  const F2 = (fill, sw = 1.5) => ({ style: `fill: ${fill}; stroke: #1a120c`, 'stroke-width': sw, 'stroke-linejoin': 'round' });
  D.el('rect', { x: 0, y: 0, width: 240, height: 180, rx: 4, style: 'fill: url(#vr-sky)' }, p);
  D.p(p, 'M0 128 Q60 106 120 120 T240 112 V180 H0 Z', '', { style: 'fill: #3a4636' });
  D.el('rect', { x: 0, y: 142, width: 240, height: 38, style: 'fill: url(#vr-grass)' }, p);
  [[18, 150, 16], [34, 150, 22], [214, 150, 20]].forEach(([tx, ty, th]) => D.p(p, `M${tx - th * 0.45} ${ty} L${tx} ${ty - th * 2.2} L${tx + th * 0.45} ${ty} Z`, '', { style: 'fill: #1f2a1c' }));
  D.el('ellipse', { cx: 116, cy: 156, rx: 70, ry: 8, style: 'fill: #ffcf7a', opacity: 0.28 }, p);
  // house: same proportions as the built version in attempt 2
  D.p(p, 'M58 150 V76 L102 51 L190 76 V150 Z', '', F2('url(#vr-wood)'));
  let d = '';
  for (let cx = 63; cx < 190; cx += 5) d += `M${cx} ${cx < 102 ? 76 - (cx - 58) * 0.57 + 3 : 51 + (cx - 102) * 0.284 + 3} V150 `;
  D.p(p, d, '', { style: 'fill: none; stroke: #4a2c18', 'stroke-width': 0.8, opacity: 0.8 });
  D.el('rect', { x: 163, y: 56, width: 9, height: 20, ...F2('#3a2418', 1) }, p);
  D.p(p, 'M167 54 q-6 -8 2 -14 q8 -6 0 -14', '', { style: 'fill: none; stroke: #e7dccb', 'stroke-width': 2.4, opacity: 0.45, 'stroke-linecap': 'round' });
  D.p(p, 'M52 79 L102 48 L196 79', '', { style: 'fill: none; stroke: #1f140d', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  D.el('rect', { x: 74, y: 100, width: 83, height: 39, ...F2('url(#vr-glow)', 1.5) }, p);
  D.p(p, 'M101.5 100 V139 M129 100 V139', '', { style: 'fill: none; stroke: #2a1a10', 'stroke-width': 2 });
  // interior silhouettes: a lamp and a sofa in the warm light
  D.p(p, 'M84 139 v-8 h22 v8 M84 131 v-4 q0 -2 2 -2 h18 q2 0 2 2 v4 M140 139 V116 M135 116 h10 l-3 -6 h-4 Z', '', { style: 'fill: #8a4a26; stroke: none', opacity: 0.7 });
  D.el('rect', { x: 165, y: 111, width: 15, height: 39, ...F2('#2e1d12', 1) }, p);
  D.el('rect', { x: 54, y: 150, width: 140, height: 4, style: 'fill: #6b4a30' }, p);
  return p;
}
const miniHouse = (g, x, y, w, h) => targetPic(g, x, y, w, h);

export default {
  id: 'visual-ref',
  title: 'Visuelle referanser',
  steps: 3,
  notes: [
    'En helt vanlig prompt. Og bildet du har i hodet.',
    'Alle fire krav er oppfylt. Det ligner bare ikke på det du så for deg.',
    'Forsøk 2, ny økt. Bildet fra hodet ditt, laget i ChatGPT, sendt med. Nå treffer den.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Visuelle referanser</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Gi den et <em>bilde</em>,<br>ikke en liste.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    let loops = [];

    // attempt 1: the knock-off, built one checklist item at a time
    function cheapHouse() {
      const g = D.g(svg);
      const body = D.el('rect', { x: 730, y: 500, width: 420, height: 240, style: 'fill: #8a8f96; stroke: #1a120c', 'stroke-width': 2.6 }, g);
      const panels = D.p(g, 'M730 560 H1150 M730 620 H1150 M730 680 H1150', '', { style: 'fill: none; stroke: #6b7078', 'stroke-width': 2 });
      D.el('rect', { x: 716, y: 484, width: 448, height: 18, ...INK('#3a3d42') }, g);
      return { g, body, panels };
    }
    // attempt 2: close to the reference, built flat (no light, no sky, fewer details)
    function goodHouse() {
      const g = D.g(svg);
      [[620, 740, 44], [660, 740, 60], [1260, 740, 54]].forEach(([tx, ty, th]) => D.p(g, `M${tx - th * 0.45} ${ty} L${tx} ${ty - th * 2.2} L${tx + th * 0.45} ${ty} Z`, '', INK('#2c3a28', 2)));
      D.p(g, TARGET, '', INK('#7a4a2c'));
      let d = '';
      for (let x = 716; x < 1180; x += 18) d += `M${x} ${x < 860 ? 470 - (x - 700) * 0.56 + 8 : 380 + (x - 860) * 0.28 + 8} V740 `;
      D.p(g, d, '', { style: 'fill: none; stroke: #5a361f', 'stroke-width': 3 });
      D.el('rect', { x: 1080, y: 400, width: 34, height: 70, ...INK('#3a2418') }, g);
      D.p(g, 'M680 482 L860 372 L1200 482', '', { style: 'fill: none; stroke: #2a1d14', 'stroke-width': 18, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      D.el('rect', { x: 760, y: 560, width: 300, height: 140, rx: 3, ...INK('#ffcf7a') }, g);
      D.p(g, 'M860 560 V700 M960 560 V700', '', { style: 'fill: none; stroke: #2a1d14', 'stroke-width': 6 });
      D.el('rect', { x: 1090, y: 600, width: 56, height: 140, rx: 3, ...INK('#3a2418') }, g);
      D.el('rect', { x: 690, y: 736, width: 500, height: 10, style: 'fill: #6b4a30' }, g);
      return g;
    }

    const reset = () => { loops.forEach((l) => l.kill()); loops = []; svg.innerHTML = ''; P = {}; };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        // the prompt, in a conversation with Claude
        P.chat = chatPhone(svg, 80, 262, 420, 520, { app: 'Claude' });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, PROMPT, 0.9);
        P.att = attempt(svg, 560, 140);
        P.att.show(tl, 'FORSØK 1', 0.5);
        const ground = D.p(svg, `M560 ${GROUND} H1480`, 'thin');
        tl.add(D.drawOn(ground, { duration: 0.6 }), 0.5);
        // what you actually have in mind
        const cloud = D.g(svg, { 'data-unit': '' });
        D.p(cloud, 'M1236 400 C1196 400 1192 344 1230 336 C1214 296 1254 262 1290 276 C1300 232 1370 226 1392 266 C1430 244 1478 272 1466 314 C1494 330 1490 392 1450 400 Z', '', { style: 'fill: #241a13; stroke: var(--fg)', 'stroke-width': 2.6 });
        targetPic(cloud, 1262, 286, 168, 112);
        // the dots lead back to you (your prompt in the phone), not to the house
        [[1206, 270, 11], [1080, 256, 9], [930, 250, 7], [780, 256, 6], [640, 272, 5], [530, 296, 4]].forEach(([cx, cy, r]) => D.el('circle', { cx, cy, r, style: 'fill: #241a13; stroke: var(--fg)', 'stroke-width': 2 }, cloud));
        D.text(cloud, 1346, 432, 'DET DU SER FOR DEG', 'cl', { 'text-anchor': 'middle', style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        tl.fromTo(cloud, { opacity: 0, scale: 0.7, transformOrigin: '0% 100%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, 1.4);
        P.cloud = cloud;
      }

      if (i === 1) {
        // the list becomes a checklist; every box gets ticked; the result is the knock-off
        const t0 = P.chat.think(tl, 0.1, 1.5);
        const list = P.chat.reply(tl, 'Krav fra prompten:', t0, { list: REQ });
        const tick = (k, at) => tl.to(list.ticks[k], { opacity: 1, duration: 0.2 }, at);
        const at = (k) => t0 + 0.4 + k * 1.3;
        const H = cheapHouse();
        // Moderne: a flat-roofed grey box
        tl.fromTo(H.g, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, at(0));
        tick(0, at(0) + 0.4);
        // Varm: orange paint and a heat pump on the front
        tl.to(H.body, { attr: { style: 'fill: #c9824e; stroke: #1a120c' }, duration: 0.5 }, at(1));
        const pump = D.g(H.g);
        D.el('rect', { x: 1060, y: 664, width: 76, height: 66, rx: 4, ...INK('#e7e3dc') }, pump);
        D.el('circle', { cx: 1092, cy: 697, r: 22, style: 'fill: none; stroke: #6b7078', 'stroke-width': 3 }, pump);
        D.p(pump, 'M1092 675 V719 M1070 697 H1114', '', { style: 'fill: none; stroke: #6b7078', 'stroke-width': 3 });
        tl.fromTo(pump, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4 }, at(1) + 0.2);
        tick(1, at(1) + 0.5);
        // Store vinduer: big, but none of them match
        const wins = D.g(H.g);
        [[752, 528, 160, 120], [940, 548, 96, 96], [1050, 520, 64, 120]].forEach(([x, y, w, h]) => {
          D.el('rect', { x, y, width: w, height: h, style: 'fill: #a9d6ee; stroke: #fdfdfd', 'stroke-width': 7 }, wins);
        });
        tl.fromTo(wins, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at(2));
        tick(3, at(2) + 0.4);
        // Åpen planløsning: kitchen, sofa and bed, all in the same window
        const inside = D.g(H.g);
        D.el('rect', { x: 760, y: 600, width: 40, height: 44, style: 'fill: #e7e3dc' }, inside);
        D.p(inside, 'M810 644 v-18 h46 v18 M810 626 v-10 q0 -6 6 -6 h34 q6 0 6 6 v10', '', INK(PALETTE.cloth.teal, 2));
        D.el('rect', { x: 862, y: 618, width: 46, height: 26, style: 'fill: #fdfdfd; stroke: #6b7078', 'stroke-width': 2 }, inside);
        tl.fromTo(inside, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at(3));
        tick(2, at(3) + 0.4);
        P.chat.reply(tl, 'Alle krav oppfylt.', at(3) + 1.2);
        P.literal = [H.g];
        ctx.focus(tl, [H.g, P.cloud, P.chat.root], 0);
      }

      if (i === 2) {
        // attempt 2 is a new session: the thought becomes a real reference image
        P.att.show(tl, 'FORSØK 2 · NY ØKT', 0);
        tl.to(P.literal, { opacity: 0, y: 20, duration: 0.5, ease: 'power2.in' }, 0);
        P.chat.clear(tl, 0.1);
        const pol = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 1200, y: 160, width: 270, height: 250, rx: 4, style: 'fill: #fff3e3' }, pol);
        targetPic(pol, 1214, 174, 242, 180);
        D.text(pol, 1335, 388, 'REFERANSE · CHATGPT', 'ref', { 'text-anchor': 'middle', style: 'font: 700 13px var(--font-mono); letter-spacing: .1em; fill: #7a5a3a' });
        D.el('rect', { x: 1306, y: 150, width: 60, height: 22, rx: 2, fill: '#c9ad92', opacity: 0.85, transform: 'rotate(-4 1336 161)' }, pol);
        gsap.set(pol, { opacity: 0 });
        tl.to(P.cloud, { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.4 }, 0.4);
        tl.fromTo(pol, { opacity: 0, scale: 0.85, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, rotation: -3, duration: 0.6, ease: 'back.out(1.6)' }, 0.6);
        // the same request, now with the picture attached
        const msg = P.chat.user(tl, 'Lag et hus. Slik:', 1.0, { attach: miniHouse });
        const c = msg.chip;
        const zoom = D.p(svg, `M${c.x + c.w} ${c.y + 8} L1200 170`, 'dash', { opacity: 0.6, 'data-bg': '' });
        tl.fromTo(zoom, { opacity: 0 }, { opacity: 0.6, duration: 0.4 }, 1.4);
        const t1 = P.chat.think(tl, 2.0, 1.5);
        const good = goodHouse();
        tl.fromTo(good, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, t1);
        P.chat.reply(tl, 'Bygget etter referansen.', t1 + 0.6);
        ctx.focus(tl, [good, pol, zoom, P.chat.root, P.att.g], 0.4);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { loops.forEach((l) => l.kill()); } };
  },
};
