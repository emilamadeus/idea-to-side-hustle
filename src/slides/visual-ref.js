import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt } from '../engine/props.js';
import { LANDINGS } from '../engine/landings.js';
import { relayState } from '../engine/relay.js';

/*
  Tip: a picture beats a description ("Et bilde slår en beskrivelse."). The firewood subscription's front page, in the
  direction the room voted for on the prototypes slide (Varm peis if there was no vote).
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
// The direction the room voted for on the prototypes slide (Varm peis if none): the prompt that
// describes it, its four requirements, and the literal, every-box-ticked first attempt.
const THEMES = {
  peis: {
    prompt: 'Lag forsiden. Mørk, varm bakgrunn, som en stue om kvelden. En peis med flammer til høyre som lyser opp rommet. Stor overskrift «Ved på døra.» til venstre, en linje om levering hver 14. dag, og en avrundet oransje knapp: Bestill.',
    req: ['Mørk, varm bakgrunn', 'Peis med flammer til høyre', 'Stor overskrift til venstre', 'Oransje knapp: Bestill'],
    bg: '#5a2c14', head: ['Ved på døra.', 'Levering hver 14. dag!'], headFill: '#ffe9c8',
    btn: { fill: '#ff7a00', edge: '#ffe14a', text: 'BESTILL', ink: '#ffffff' },
  },
  skog: {
    prompt: 'Lag forsiden. Mørk grønn bakgrunn, som en skog om natten. Grantrær og en måne til høyre. Stor overskrift «Fra skogen, til døra di.» til venstre, en linje om levering hver 14. dag, og en avrundet lysegrønn knapp: Bestill.',
    req: ['Mørk grønn bakgrunn', 'Grantrær og måne til høyre', 'Stor overskrift til venstre', 'Lysegrønn knapp: Bestill'],
    bg: '#1f5a2a', head: ['Fra skogen, til døra di.', 'Levering hver 14. dag!'], headFill: '#eaffd8',
    btn: { fill: '#7ed321', edge: '#ffffff', text: 'BESTILL', ink: '#ffffff' },
  },
  nordisk: {
    prompt: 'Lag forsiden. Lys, rolig bakgrunn med mye luft. En stabel vedkubber til høyre. Stor overskrift «Ved. Enkelt.» til venstre, en linje om levering hver 14. dag, og en svart knapp: Bestill.',
    req: ['Lys, rolig bakgrunn', 'Vedstabel til høyre', 'Stor overskrift til venstre', 'Svart knapp: Bestill'],
    bg: '#ffffff', head: ['Ved. Enkelt.', 'Levering hver 14. dag!'], headFill: '#333333',
    btn: { fill: '#111111', edge: '#9a9a9a', text: 'BESTILL', ink: '#ffffff' },
  },
  rask: {
    prompt: 'Lag forsiden. Knallgul bakgrunn. En lastebil med ved som kjører fort, til høyre. Stor overskrift «Ved på døra i morgen.» til venstre, en linje om bestilling før 22, og en svart knapp: Bestill nå.',
    req: ['Knallgul bakgrunn', 'Lastebil til høyre', 'Stor overskrift til venstre', 'Svart knapp: Bestill nå'],
    bg: '#ffff00', head: ['Ved på døra i morgen.', 'Bestill før 22!'], headFill: '#222222',
    btn: { fill: '#000000', edge: '#ff0000', text: 'BESTILL NÅ', ink: '#ffff00' },
  },
};
const PX = 600, PY = 380, PW = 570, PH = 360;
const INK = (fill, w = 2.6) => ({ style: `fill: ${fill}; stroke: #1a120c`, 'stroke-width': w, 'stroke-linejoin': 'round' });

// The page you have in mind: the polished Varm peis site (engine/varmpeis.js), drawn into any
// frame: thought cloud, polaroid, attachment chip, or the built page (plain: a little less).
let themeKey = 'peis';
const targetPage = (g, x, y, w, h, opts = {}) => (LANDINGS.find((l) => l.key === themeKey) || LANDINGS[3]).draw(g, x, y, w, h, opts);
const miniPage = (g, x, y, w, h) => targetPage(g, x, y, w, h);

export default {
  id: 'visual-ref',
  title: 'Visuelle referanser',
  steps: 3,
  notes: [
    'En god, utfyllende beskrivelse av forsiden dere valgte. Og bildet du har i hodet.',
    'Alle fire krav er oppfylt. Det ligner bare ikke på det du så for deg.',
    'Forsøk 2, ny session. Bildet fra hodet ditt, laget i ChatGPT, sendt med. Nå treffer den.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Visuelle referanser</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Et <em>bilde</em> slår<br>en beskrivelse.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    // a browser window around the page
    function frame(g) {
      D.el('rect', { x: PX, y: PY, width: PW, height: PH, rx: 10, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 2.5, 'data-bg': '' }, g);
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

    // the clip-art version of each direction's picture (190 × 200 at x0, y0)
    function clipArt(g, key, x0, y0) {
      if (key === 'peis') {
        D.el('rect', { x: x0, y: y0, width: 190, height: 200, style: 'fill: #b5452e; stroke: #1a120c', 'stroke-width': 2.5 }, g);
        let bricks = '';
        for (let r = 0; r < 8; r++) { bricks += `M${x0} ${y0 + r * 25} H${x0 + 190} `; for (let c = 0; c < 5; c++) bricks += `M${x0 + c * 40 + (r % 2) * 20} ${y0 + r * 25} v25 `; }
        D.p(g, bricks, '', { style: 'fill: none; stroke: #7a2a1a', 'stroke-width': 2 });
        D.el('rect', { x: x0 + 40, y: y0 + 80, width: 110, height: 120, style: 'fill: #1a120c' }, g);
        D.p(g, `M${x0 + 70} ${y0 + 196} q-30 -6 -18 -46 q8 18 18 18 q-6 -36 24 -60 q0 30 18 42 q6 -12 0 -24 q30 24 12 66 q-12 10 -54 4 Z`, '', INK('#ff9a1f', 2));
        [[x0 + 86, y0 + 160], [x0 + 102, y0 + 160]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 3.5, style: 'fill: #1a120c' }, g));
        D.p(g, `M${x0 + 84} ${y0 + 172} q10 8 20 0`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
      }
      if (key === 'skog') {
        // three identical triangle trees and a smiling moon
        D.el('circle', { cx: x0 + 150, cy: y0 + 30, r: 26, ...INK('#ffe14a') }, g);
        [[x0 + 136, y0 + 26], [x0 + 156, y0 + 26]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 3, style: 'fill: #1a120c' }, g));
        D.p(g, `M${x0 + 138} ${y0 + 38} q12 10 24 0`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
        [0, 62, 124].forEach((dx) => {
          D.p(g, `M${x0 + dx + 33} ${y0 + 70} L${x0 + dx + 66} ${y0 + 170} H${x0 + dx} Z`, '', INK('#2ecc40'));
          D.el('rect', { x: x0 + dx + 26, y: y0 + 170, width: 14, height: 26, ...INK('#8b4513') }, g);
        });
      }
      if (key === 'nordisk') {
        // cartoon logs: brown rectangles with spirals on the ends
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4 - r; c++) {
          const cx = x0 + 40 + c * 44 + r * 22, cy = y0 + 176 - r * 40;
          D.el('circle', { cx, cy, r: 20, ...INK('#c8843c') }, g);
          D.p(g, `M${cx} ${cy} m0 -3 a3 3 0 1 1 -3 3 a6 6 0 1 1 6 -6 a10 10 0 1 1 -11 11`, '', { style: 'fill: none; stroke: #6b3a12', 'stroke-width': 2 });
        }
      }
      if (key === 'rask') {
        // a red cartoon truck with a smile
        D.el('rect', { x: x0, y: y0 + 80, width: 120, height: 70, rx: 12, ...INK('#e8262b') }, g);
        D.el('rect', { x: x0 + 120, y: y0 + 100, width: 64, height: 50, rx: 12, ...INK('#e8262b') }, g);
        D.el('rect', { x: x0 + 136, y: y0 + 108, width: 34, height: 20, rx: 4, ...INK('#a6e4ff') }, g);
        [[x0 + 30, y0 + 154], [x0 + 150, y0 + 154]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 18, ...INK('#333333') }, g));
        D.p(g, `M${x0 + 40} ${y0 + 110} q20 18 40 0`, '', { style: 'fill: none; stroke: #ffffff', 'stroke-width': 4, 'stroke-linecap': 'round' });
        [[x0 + 46, y0 + 98], [x0 + 74, y0 + 98]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 4, style: 'fill: #ffffff' }, g));
      }
      return g;
    }

    const reset = () => { svg.innerHTML = ''; P = {}; };

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        themeKey = THEMES[relayState.theme] ? relayState.theme : 'peis';
        P.t = THEMES[themeKey];
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 420, 520, { app: 'Claude' });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, P.t.prompt, 0.9);
        P.att = attempt(svg, 560, 140);
        P.att.show(tl, 'FORSØK 1', 0.5);
        // what you actually have in mind: the Varm peis page
        const cloud = D.g(svg, { 'data-unit': '' });
        D.p(cloud, 'M1236 400 C1196 400 1192 344 1230 336 C1214 296 1254 262 1290 276 C1300 232 1370 226 1392 266 C1430 244 1478 272 1466 314 C1494 330 1490 392 1450 400 Z', '', { style: 'fill: #241a13; stroke: var(--deco)', 'stroke-width': 2.6 });
        targetPage(cloud, 1262, 286, 168, 112);
        // the dots lead back to you (your prompt in the phone); background, so they don't make
        // the cloud's box reach over the page
        const dots = D.g(svg, { 'data-bg': '' });
        [[1206, 270, 11], [1080, 256, 9], [930, 250, 7], [780, 256, 6], [640, 272, 5], [530, 296, 4]].forEach(([cx, cy, r]) => D.el('circle', { cx, cy, r, style: 'fill: #241a13; stroke: var(--deco)', 'stroke-width': 2 }, dots));
        D.text(cloud, 1346, 432, 'DET DU SER FOR DEG', 'cl', { 'text-anchor': 'middle', style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        tl.fromTo(cloud, { opacity: 0, scale: 0.7, transformOrigin: '0% 100%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, 1.4);
        tl.fromTo(dots, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.4);
        P.cloud = cloud; P.dots = dots;
      }

      if (i === 1) {
        // the list becomes a checklist; every box gets ticked; the page is the cheap version
        const t0 = P.chat.think(tl, 0.1, 1.5);
        const list = P.chat.reply(tl, 'Krav fra prompten:', t0, { list: P.t.req });
        const tick = (k, at) => tl.to(list.ticks[k], { opacity: 1, duration: 0.2 }, at);
        const at = (k) => t0 + 0.4 + k * 1.3;
        const H = cheapPage();
        tl.fromTo(H.g, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, t0);
        // the background, literally: a flat colour
        tl.to(H.bg, { attr: { style: `fill: ${P.t.bg}` }, duration: 0.5 }, at(0));
        tl.to(H.ph, { opacity: 0, duration: 0.3 }, at(0));
        tick(0, at(0) + 0.4);
        // the picture, literally: clip-art
        const art = clipArt(D.g(H.g), themeKey, PX + 350, PY + 120);
        tl.fromTo(art, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4 }, at(1));
        tick(1, at(1) + 0.4);
        // the headline, literally: big, in the default serif
        const head = D.g(H.g);
        D.text(head, PX + 30, PY + 110, P.t.head[0], 'ch', { style: `font: 700 ${P.t.head[0].length > 14 ? 30 : 40}px Georgia, serif; fill: ${P.t.headFill}` });
        D.text(head, PX + 30, PY + 140, P.t.head[1], 'cs', { style: `font: italic 400 18px Georgia, serif; fill: ${P.t.headFill}` });
        tl.fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at(2));
        tick(2, at(2) + 0.4);
        // the button, literally: glossy and loud
        const btn = D.g(H.g);
        const b = P.t.btn;
        D.el('rect', { x: PX + 30, y: PY + 236, width: 240, height: 64, rx: 32, style: `fill: ${b.fill}; stroke: ${b.edge}`, 'stroke-width': 5 }, btn);
        D.el('rect', { x: PX + 44, y: PY + 242, width: 212, height: 22, rx: 11, style: 'fill: #ffffff', opacity: 0.35 }, btn);
        D.text(btn, PX + 150, PY + 278, b.text, 'bt', { 'text-anchor': 'middle', style: `font: 900 ${b.text.length > 8 ? 24 : 28}px Impact, var(--font-display); fill: ${b.ink}` });
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
        tl.fromTo(pol, { opacity: 0, scale: 0.85, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 0.6);
        // the same request, now with the picture attached
        const msg = P.chat.user(tl, 'Lag forsiden. Bruk bildet som referanse.', 1.0, { attach: miniPage });
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
