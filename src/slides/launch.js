import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, FILL } from '../engine/props.js';

/*
  Launch and sell: AI gets the store page ready. The Fab listing for the cart pack is
  assembled piece by piece, each piece asked for in the chat (app flow), then it sells.
    0. An empty listing page. "Gjør Fab-siden klar."
    1. Title, description and feature list written.
    2. The images: thumbnail and gallery.
    3. Price from comparable packs; docs and export formats packaged.
    4. Published. A phone notification: a sale.
  Facts from the listing: 24 props, 20 breakable, FBX/GLB/Blender exports.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782
    page       x 600–1480, y 150–740 (browser frame; gallery y 230–420, text y 440–600,
               chips y 620–660, price box x 1240–1460 y 440–600)
    sale       phone notification x 1180–1480, y 600–760 (step 4)
*/

const PX = 600, PY = 150, PW = 880, PH = 590;

export default {
  id: 'launch',
  title: 'Fra ferdig til solgt',
  steps: 5,
  notes: [
    'Ferdig er ikke solgt. Butikksiden må lages.',
    'Tittel, beskrivelse og liste over innhold: skrevet med Claude.',
    'Bildene: laget med ChatGPT og renders.',
    'Pris satt etter sammenlignbare pakker. Dokumentasjon og eksportformater pakket.',
    'Publisert. Og så: det første salget.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Lansering</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">La AI-en gjøre<br><em>butikken</em> klar.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };
    const slot = (g, x, y, w, h) => D.el('rect', { x, y, width: w, height: h, rx: 6, style: 'fill: none; stroke: #4a3c30', 'stroke-width': 2, 'stroke-dasharray': '8 6', 'data-bg': '' }, g);
    // a small render of a cart for the gallery
    function render(g, x, y, w, h, tone) {
      const r = D.g(g, { 'data-bg': '' });
      D.el('rect', { x, y, width: w, height: h, rx: 6, style: `fill: ${tone}` }, r);
      const cx = x + w / 2, cy = y + h * 0.62, s = w / 260;
      D.el('rect', { x: cx - 80 * s, y: cy - 40 * s, width: 160 * s, height: 28 * s, rx: 3, ...FILL('#b07a4a', 1.5) }, r);
      [-50, 50].forEach((d) => D.el('circle', { cx: cx + d * s, cy: cy + 4 * s, r: 24 * s, style: 'fill: none; stroke: #2a1d14', 'stroke-width': 4 * s }, r));
      D.el('ellipse', { cx, cy: cy + 30 * s, rx: 110 * s, ry: 10 * s, style: 'fill: #000', opacity: 0.25 }, r);
      return r;
    }

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        // the store page, empty
        const page = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: PX, y: PY, width: PW, height: PH, rx: 12, style: 'fill: #1d1510; stroke: #6b5a48', 'stroke-width': 2.5, 'data-bg': '' }, page);
        D.el('rect', { x: PX, y: PY, width: PW, height: 46, rx: 12, style: 'fill: #2a1f17', 'data-bg': '' }, page);
        [0, 1, 2].forEach((k) => D.el('circle', { cx: PX + 24 + k * 22, cy: PY + 23, r: 7, style: `fill: ${['#ff6f9c', '#ffd23f', '#8fe3a2'][k]}` }, page));
        D.el('rect', { x: PX + 110, y: PY + 10, width: 420, height: 26, rx: 13, style: 'fill: #16100b', 'data-bg': '' }, page);
        D.text(page, PX + 128, PY + 29, 'fab.com/listings/…', 'url', { style: 'font: 400 15px var(--font-mono); fill: var(--muted)' });
        const slots = D.g(page, { 'data-bg': '' });
        slot(slots, PX + 30, PY + 80, 400, 190);
        [0, 1, 2].forEach((k) => slot(slots, PX + 450 + k * 136, PY + 80, 124, 90));
        slot(slots, PX + 30, PY + 290, 560, 60);
        slot(slots, PX + 30, PY + 360, 560, 110);
        slot(slots, PX + 640, PY + 290, 210, 180);
        tl.fromTo(page, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.4);
        P.page = page; P.slots = slots;
        P.chat.user(tl, 'Pakken er ferdig. Gjør Fab-siden klar.', 0.9);
      }

      if (i === 1) {
        // the words: title, description, what's in the box
        const t = P.chat.think(tl, 0.1, 1.0);
        P.chat.reply(tl, 'Tittel, beskrivelse og innholdsliste skrevet.', t);
        const text = D.g(svg, { 'data-unit': '' });
        D.text(text, PX + 30, PY + 314, 'Destructible Medieval', 't1', { style: 'font: 800 26px var(--font-display); fill: var(--fg)' });
        D.text(text, PX + 30, PY + 350, 'Cart and Wagon Props', 't2', { style: 'font: 800 26px var(--font-display); fill: var(--fg)' });
        ['24 props, 20 av dem kan knuses', 'Treverk splintres langs fibrene', 'FBX, GLB og Blender-filer'].forEach((l, k) =>
          D.text(text, PX + 30, PY + 392 + k * 30, `·  ${l}`, 'tl', { style: 'font: 600 19px var(--font-display); fill: #cfc3b2' }));
        tl.fromTo(text, { opacity: 0 }, { opacity: 1, duration: 0.5 }, t + 0.2);
        P.text = text;
        ctx.focus(tl, [text, P.chat.root], t);
      }

      if (i === 2) {
        // the images
        P.chat.user(tl, 'Og bildene.', 0.1);
        const t = P.chat.think(tl, 0.5, 1.0);
        P.chat.reply(tl, 'Hovedbilde og galleri klare, i samme lys.', t);
        const imgs = D.g(svg, { 'data-unit': '' });
        render(imgs, PX + 30, PY + 80, 400, 190, '#3a4636');
        ['#2f3a4a', '#4a3a2a', '#3a2f3a'].forEach((tone, k) => render(imgs, PX + 450 + k * 136, PY + 80, 124, 90, tone));
        tl.fromTo(imgs.children, { opacity: 0, scale: 0.94, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, stagger: 0.15 }, t + 0.2);
        P.imgs = imgs;
        ctx.focus(tl, [imgs, P.chat.root], t);
      }

      if (i === 3) {
        // price from comparable packs; docs and formats
        P.chat.user(tl, 'Pris og dokumentasjon?', 0.1);
        const t = P.chat.think(tl, 0.5, 1.2);
        P.chat.reply(tl, 'Pris satt etter sammenlignbare pakker. README og eksportformater pakket.', t);
        const box = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: PX + 640, y: PY + 290, width: 210, height: 180, rx: 8, style: 'fill: #241a13; stroke: var(--accent)', 'stroke-width': 2, 'data-bg': '' }, box);
        D.text(box, PX + 660, PY + 322, 'PRIS', 'pl', { style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        // comparable packs as bars, ours placed among them
        [0.5, 0.75, 0.62, 0.9].forEach((v, k) => D.el('rect', { x: PX + 660 + k * 44, y: PY + 420 - 70 * v, width: 30, height: 70 * v, rx: 3, style: `fill: ${k === 2 ? 'var(--accent)' : '#4a3c30'}`, 'data-bg': '' }, box));
        D.text(box, PX + 660, PY + 452, 'midt i markedet', 'pm', { style: 'font: 600 16px var(--font-display); fill: var(--fg)' });
        const chips = D.g(svg, { 'data-unit': '' });
        ['README', 'FBX', 'GLB', 'Blender'].forEach((c, k) => {
          D.el('rect', { x: PX + 30 + k * 120, y: PY + 490, width: 108, height: 34, rx: 17, style: 'fill: none; stroke: #8fe3a2', 'stroke-width': 2 }, chips);
          D.text(chips, PX + 84 + k * 120, PY + 513, c, 'cc', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); fill: #8fe3a2' });
        });
        tl.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 0.2);
        tl.fromTo(chips.children, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.05 }, t + 0.6);
        P.box = box; P.chips = chips;
        ctx.focus(tl, [box, chips, P.chat.root], t);
      }

      if (i === 4) {
        // published; then the first sale
        tl.to(P.slots, { opacity: 0, duration: 0.3 }, 0);
        const st = D.stamp(D.g(svg, { 'data-unit': '' }), PX + 300, PY + 236, 'PUBLISERT', { size: 26, rotate: -6 }); // on the hero image
        tl.add(D.slam(st.parentNode), 0.3);
        // the sale arrives as a phone notification on top of the page (overlap by design)
        const note = D.g(svg, { 'data-unit': '', 'data-overlap-ok': '' });
        D.el('rect', { x: 1150, y: 636, width: 330, height: 120, rx: 20, style: 'fill: #0f0a07; stroke: var(--fg)', 'stroke-width': 3, 'data-body': '' }, note);
        D.text(note, 1174, 674, 'FAB', 'nl', { style: 'font: 700 14px var(--font-mono); letter-spacing: .14em; fill: #8fe3a2' });
        D.text(note, 1174, 710, 'Nytt salg:', 'n1', { style: 'font: 600 21px var(--font-display); fill: var(--fg)' });
        D.text(note, 1174, 738, 'Destructible Medieval Cart…', 'n2', { style: 'font: 600 18px var(--font-display); fill: #cfc3b2' });
        tl.fromTo(note, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' }, 1.4);
        tl.to(note, { x: 3, duration: 0.05, repeat: 7, yoyo: true }, 1.9);
        ctx.focus(tl, [P.page, P.text, P.imgs, P.box, P.chips, st.parentNode, note], 1.3);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
