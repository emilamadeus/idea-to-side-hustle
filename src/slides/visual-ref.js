import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt } from '../engine/props.js';

/*
  Tip: give it a picture, not a list. The firewood subscription's front page, right after
  "Varm peis" was picked on the prototypes slide.
    0. The prompt, and what you actually have in mind (a thought cloud: the Varm peis page).
    1. Attempt 1: a good, full description becomes a checklist and every box is ticked, but
       the page is not what you had in mind: a flat muddy brown, a clip-art brick fireplace
       with a smiling flame, the headline in the default serif, a glossy orange BESTILL pill.
    2. Attempt 2, a new session: the thought becomes a real reference image (made in ChatGPT).
       The page is built against it: close to the picture, a little plainer.
  The game example (real ChatGPT references, the result in Unreal) is its own slide in
  Bak kulissene (game-ref.js).

  Layout zones (svg units):
    tip         x 80–540, y 110–240
    chat phone  x 80–500, y 262–782 (prompt, thinking, replies; scrolls)
    attempt     x 560–900, y 140–174
    page        x 600–1170, y 380–740 (a browser window)
    thought cloud / polaroid x 1190–1494, y 150–440; thought dots y 250–300 back to the phone
*/

// a good, full description: still not the picture you have in mind
const REQ = ['Mørk, varm bakgrunn', 'Peis med flammer til høyre', 'Stor overskrift til venstre', 'Oransje knapp: Bestill'];
const PROMPT = 'Lag forsiden. Mørk, varm bakgrunn, som en stue om kvelden. En peis med flammer til høyre som lyser opp rommet. Stor overskrift «Ved på døra.» til venstre, en linje om levering hver 14. dag, og en avrundet oransje knapp: Bestill.';
const PX = 600, PY = 380, PW = 570, PH = 360;
const INK = (fill, w = 2.6) => ({ style: `fill: ${fill}; stroke: #1a120c`, 'stroke-width': w, 'stroke-linejoin': 'round' });

// The page you have in mind (240×180 design space), drawn into any frame: thought cloud,
// polaroid, attachment chip, or the built page (plain: a little less than the reference).
function targetPage(g, x, y, w, h, { plain = false, bar = true } = {}) {
  // uniform scale, centred, so the text never stretches; the background fills the whole frame
  D.el('rect', { x, y, width: w, height: h, rx: 4, style: 'fill: #22120a' }, g);
  const k = Math.min(w / 240, h / 180);
  const p = D.g(g, { transform: `translate(${x + (w - 240 * k) / 2} ${y + (h - 180 * k) / 2}) scale(${k})` });
  if (bar) {
    D.el('rect', { x: 0, y: 0, width: 240, height: 14, rx: 4, style: 'fill: #2c1a10' }, p);
    [0, 1, 2].forEach((k) => D.el('circle', { cx: 9 + k * 8, cy: 7, r: 2.4, style: `fill: ${['#ff6f9c', '#ffd23f', '#8fe3a2'][k]}` }, p));
  }
  if (!plain) D.el('circle', { cx: 176, cy: 108, r: 62, style: 'fill: #ff7a2f', opacity: 0.16 }, p);
  D.p(p, 'M140 164 V96 Q176 72 212 96 V164 Z', '', { style: 'fill: #120905; stroke: #5a3a22', 'stroke-width': 3 });
  D.p(p, 'M160 158 Q157 134 170 124 Q168 138 176 142 Q178 128 188 118 Q192 140 190 158 Z', '', { style: 'fill: #ff7a2f' });
  if (!plain) D.p(p, 'M168 158 Q167 142 176 134 Q178 146 183 148 Q185 140 188 136 Q190 148 188 158 Z', '', { style: 'fill: #ffd23f' });
  D.p(p, 'M150 160 H202', '', { style: 'fill: none; stroke: #8a5a34', 'stroke-width': 5, 'stroke-linecap': 'round' });
  if (k < 0.5) {
    // too small for text (the chat attachment): the same layout as bars
    D.p(p, 'M16 70 H96 M16 92 H86', '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 8, 'stroke-linecap': 'round' });
  } else {
    D.text(p, 16, 74, 'Ved på døra.', 'th', { style: 'font: 800 20px var(--font-display); fill: #fff3e3' });
    D.text(p, 16, 96, 'Hver 14. dag, hele vinteren.', 'ts', { style: 'font: 600 9px var(--font-display); fill: #e6d8c6' });
  }
  D.el('rect', { x: 16, y: 108, width: 62, height: 20, rx: 10, style: 'fill: #ff7a2f' }, p);
  if (k >= 0.5) D.text(p, 47, 122, 'Bestill', 'tb', { 'text-anchor': 'middle', style: 'font: 800 10px var(--font-display); fill: #22120a' });
  return p;
}
const miniPage = (g, x, y, w, h) => targetPage(g, x, y, w, h);

export default {
  id: 'visual-ref',
  title: 'Visuelle referanser',
  steps: 3,
  notes: [
    'En god, utfyllende beskrivelse av forsiden. Og bildet du har i hodet: Varm peis.',
    'Alle fire krav er oppfylt. Det ligner bare ikke på det du så for deg.',
    'Forsøk 2, ny session. Bildet fra hodet ditt, laget i ChatGPT, sendt med. Nå treffer den.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Visuelle referanser</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Gi den et <em>bilde</em>,<br>ikke en liste.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    // a browser window around the page
    function frame(g) {
      D.el('rect', { x: PX, y: PY, width: PW, height: PH, rx: 10, style: 'fill: #1d1510; stroke: var(--fg)', 'stroke-width': 2.5, 'data-bg': '' }, g);
      D.el('rect', { x: PX, y: PY, width: PW, height: 34, rx: 10, style: 'fill: #2a1f17', 'data-bg': '' }, g);
      [0, 1, 2].forEach((k) => D.el('circle', { cx: PX + 20 + k * 18, cy: PY + 17, r: 6, style: `fill: ${['#ff6f9c', '#ffd23f', '#8fe3a2'][k]}` }, g));
      D.el('rect', { x: PX + 90, y: PY + 8, width: 280, height: 18, rx: 9, style: 'fill: #16100b', 'data-bg': '' }, g);
      D.text(g, PX + 104, PY + 22, 'ved-pa-dora.no', 'url', { style: 'font: 400 13px var(--font-mono); fill: var(--muted)' });
    }

    // attempt 1: the page every box was ticked for
    function cheapPage() {
      const g = D.g(svg, { 'data-unit': '' });
      frame(g);
      const bg = D.el('rect', { x: PX + 2, y: PY + 34, width: PW - 4, height: PH - 36, style: 'fill: #f2f2f2', 'data-bg': '' }, g);
      // an empty template to start from
      const ph = D.p(g, `M${PX + 30} ${PY + 80} h220 M${PX + 30} ${PY + 104} h160 M${PX + 30} ${PY + 128} h190`, '', { style: 'fill: none; stroke: #c9c9c9', 'stroke-width': 10, 'stroke-linecap': 'round', 'data-bg': '' });
      return { g, bg, ph };
    }

    const reset = () => { svg.innerHTML = ''; P = {}; };

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 420, 520, { app: 'Claude' });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, PROMPT, 0.9);
        P.att = attempt(svg, 560, 140);
        P.att.show(tl, 'FORSØK 1', 0.5);
        // what you actually have in mind: the Varm peis page
        const cloud = D.g(svg, { 'data-unit': '' });
        D.p(cloud, 'M1236 400 C1196 400 1192 344 1230 336 C1214 296 1254 262 1290 276 C1300 232 1370 226 1392 266 C1430 244 1478 272 1466 314 C1494 330 1490 392 1450 400 Z', '', { style: 'fill: #241a13; stroke: var(--fg)', 'stroke-width': 2.6 });
        targetPage(cloud, 1262, 286, 168, 112);
        // the dots lead back to you (your prompt in the phone); background, so they don't make
        // the cloud's box reach over the page
        const dots = D.g(svg, { 'data-bg': '' });
        [[1206, 270, 11], [1080, 256, 9], [930, 250, 7], [780, 256, 6], [640, 272, 5], [530, 296, 4]].forEach(([cx, cy, r]) => D.el('circle', { cx, cy, r, style: 'fill: #241a13; stroke: var(--fg)', 'stroke-width': 2 }, dots));
        D.text(cloud, 1346, 432, 'DET DU SER FOR DEG', 'cl', { 'text-anchor': 'middle', style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        tl.fromTo(cloud, { opacity: 0, scale: 0.7, transformOrigin: '0% 100%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, 1.4);
        tl.fromTo(dots, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.4);
        P.cloud = cloud; P.dots = dots;
      }

      if (i === 1) {
        // the list becomes a checklist; every box gets ticked; the page is the cheap version
        const t0 = P.chat.think(tl, 0.1, 1.5);
        const list = P.chat.reply(tl, 'Krav fra prompten:', t0, { list: REQ });
        const tick = (k, at) => tl.to(list.ticks[k], { opacity: 1, duration: 0.2 }, at);
        const at = (k) => t0 + 0.4 + k * 1.3;
        const H = cheapPage();
        tl.fromTo(H.g, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, t0);
        // Mørk, varm bakgrunn: a flat muddy brown
        tl.to(H.bg, { attr: { style: 'fill: #5a2c14' }, duration: 0.5 }, at(0));
        tl.to(H.ph, { opacity: 0, duration: 0.3 }, at(0));
        tick(0, at(0) + 0.4);
        // Peis med flammer til høyre: a clip-art brick fireplace, a flame with a face
        const fire = D.g(H.g);
        const fx0 = PX + 350, fy0 = PY + 120;
        D.el('rect', { x: fx0, y: fy0, width: 190, height: 200, style: 'fill: #b5452e; stroke: #1a120c', 'stroke-width': 2.5 }, fire);
        let bricks = '';
        for (let r = 0; r < 8; r++) {
          bricks += `M${fx0} ${fy0 + r * 25} H${fx0 + 190} `;
          for (let c = 0; c < 5; c++) bricks += `M${fx0 + c * 40 + (r % 2) * 20} ${fy0 + r * 25} v25 `;
        }
        D.p(fire, bricks, '', { style: 'fill: none; stroke: #7a2a1a', 'stroke-width': 2 });
        D.el('rect', { x: fx0 + 40, y: fy0 + 80, width: 110, height: 120, style: 'fill: #1a120c' }, fire);
        D.p(fire, `M${fx0 + 70} ${fy0 + 196} q-30 -6 -18 -46 q8 18 18 18 q-6 -36 24 -60 q0 30 18 42 q6 -12 0 -24 q30 24 12 66 q-12 10 -54 4 Z`, '', INK('#ff9a1f', 2));
        [[fx0 + 86, fy0 + 160], [fx0 + 102, fy0 + 160]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 3.5, style: 'fill: #1a120c' }, fire));
        D.p(fire, `M${fx0 + 84} ${fy0 + 172} q10 8 20 0`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
        tl.fromTo(fire, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4 }, at(1));
        tick(1, at(1) + 0.4);
        // Stor overskrift til venstre: big, in the default serif
        const head = D.g(H.g);
        D.text(head, PX + 30, PY + 110, 'Ved på døra.', 'ch', { style: 'font: 700 40px Georgia, serif; fill: #ffe9c8' });
        D.text(head, PX + 30, PY + 140, 'Levering hver 14. dag!', 'cs', { style: 'font: italic 400 18px Georgia, serif; fill: #ffe9c8' });
        tl.fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at(2));
        tick(2, at(2) + 0.4);
        // Oransje knapp: Bestill, glossy and loud
        const btn = D.g(H.g);
        D.el('rect', { x: PX + 30, y: PY + 236, width: 240, height: 64, rx: 32, style: 'fill: #ff7a00; stroke: #ffe14a', 'stroke-width': 5 }, btn);
        D.el('rect', { x: PX + 44, y: PY + 242, width: 212, height: 22, rx: 11, style: 'fill: #ffffff', opacity: 0.35 }, btn);
        D.text(btn, PX + 150, PY + 278, 'BESTILL', 'bt', { 'text-anchor': 'middle', style: 'font: 900 28px Impact, var(--font-display); fill: #ffffff' });
        tl.fromTo(btn, { opacity: 0, scale: 0.7, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, at(3));
        tick(3, at(3) + 0.4);
        P.chat.reply(tl, 'Alle krav oppfylt.', at(3) + 1.2);
        P.literal = [H.g];
        ctx.focus(tl, [H.g, P.cloud, P.chat.root], 0);
      }

      if (i === 2) {
        // attempt 2 is a new session: the thought becomes a real reference image
        P.att.show(tl, 'FORSØK 2 · NY SESSION', 0);
        tl.to(P.literal, { opacity: 0, y: 20, duration: 0.5, ease: 'power2.in' }, 0);
        P.chat.clear(tl, 0.1);
        const pol = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 1200, y: 160, width: 270, height: 250, rx: 4, style: 'fill: #fff3e3' }, pol);
        targetPage(pol, 1214, 174, 242, 180);
        D.text(pol, 1335, 388, 'REFERANSE · CHATGPT', 'ref', { 'text-anchor': 'middle', style: 'font: 700 13px var(--font-mono); letter-spacing: .1em; fill: #7a5a3a' });
        D.el('rect', { x: 1306, y: 150, width: 60, height: 22, rx: 2, fill: '#c9ad92', opacity: 0.85, transform: 'rotate(-4 1336 161)' }, pol);
        gsap.set(pol, { opacity: 0 });
        tl.to(P.cloud, { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.4 }, 0.4);
        tl.to(P.dots, { opacity: 0, duration: 0.4 }, 0.4);
        tl.fromTo(pol, { opacity: 0, scale: 0.85, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, rotation: -3, duration: 0.6, ease: 'back.out(1.6)' }, 0.6);
        // the same request, now with the picture attached
        const msg = P.chat.user(tl, 'Lag forsiden. Slik:', 1.0, { attach: miniPage });
        const c = msg.chip;
        const zoom = D.p(svg, `M${c.x + c.w} ${c.y + 8} L1200 170`, 'dash', { opacity: 0.6, 'data-bg': '' });
        tl.fromTo(zoom, { opacity: 0 }, { opacity: 0.6, duration: 0.4 }, 1.4);
        const t1 = P.chat.think(tl, 2.0, 1.5);
        const good = D.g(svg, { 'data-unit': '' });
        frame(good);
        targetPage(good, PX + 2, PY + 34, PW - 4, PH - 36, { plain: true, bar: false });
        tl.fromTo(good, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, t1);
        P.chat.reply(tl, 'Bygget etter referansen.', t1 + 0.6);
        ctx.focus(tl, [good, pol, zoom, P.chat.root, P.att.g], 0.4);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
