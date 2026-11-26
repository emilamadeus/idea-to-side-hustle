import gsap from 'gsap';
import * as D from '../engine/draw.js';

/*
  The same trick in the game (Bak kulissene): give it a picture, not a list. The real
  references made in ChatGPT, and what was built from them in Unreal.
    0. The ChatGPT concept sheet and the detail grid, side by side.
    1. The detail grid leaves; the game screenshot from Unreal takes its place.

  Layout zones (svg units):
    tip     x 80–540, y 110–240
    photos  left x 100–720, right x 840–1500, y 270–683; labels y 718
*/
const MEDIA = './media/visual-ref/';
const PHOTO_Y = 270;

export default {
  id: 'game-ref',
  title: 'Referanser i spillet',
  steps: 2,
  notes: [
    'Samme grep i spillet: konseptark og detaljer laget i ChatGPT.',
    'Og slik ble det i Unreal.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Spillet</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Samme grep<br>i <em>spillet</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};
    // preload so the photos never pop in half-decoded
    ['concept-chatgpt', 'details-chatgpt', 'game-unreal'].forEach((f) => { new Image().src = `${MEDIA}${f}.webp`; });

    // a real image in a UI frame, with a small label under it
    function photo(file, x, w, h, label) {
      const g = D.g(svg, { 'data-unit': '' });
      const id = `gr-clip-${file}`;
      const cp = D.el('clipPath', { id }, g);
      D.el('rect', { x, y: PHOTO_Y, width: w, height: h, rx: 10 }, cp);
      D.el('image', { href: `${MEDIA}${file}.webp`, x, y: PHOTO_Y, width: w, height: h, preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#${id})`, 'data-bg': '' }, g);
      D.el('rect', { x, y: PHOTO_Y, width: w, height: h, rx: 10, style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2.5, 'data-bg': '' }, g);
      D.text(g, x, PHOTO_Y + h + 34, label, 'pl', { style: 'font: 700 15px var(--font-mono); letter-spacing: .12em; fill: var(--muted)' });
      return g;
    }

    const reset = () => { svg.innerHTML = ''; P = {}; };

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.concept = photo('concept-chatgpt', 100, 620, 413, 'REFERANSE · CHATGPT');
        P.details = photo('details-chatgpt', 840, 620, 413, 'DETALJER · CHATGPT');
        tl.fromTo(P.concept, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.5);
        tl.fromTo(P.details, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 1.0);
      }
      if (i === 1) {
        // one leaves before the next arrives: the detail grid out, the game in
        tl.to(P.details, { opacity: 0, duration: 0.4 }, 0);
        const arrow = D.g(svg, { 'data-bg': '' });
        D.p(arrow, `M740 ${PHOTO_Y + 206} H812 M796 ${PHOTO_Y + 192} L814 ${PHOTO_Y + 206} L796 ${PHOTO_Y + 220}`, '', { style: 'fill: none; stroke: var(--accent)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        const game = photo('game-unreal', 840, 660, 413, 'I SPILLET · UNREAL');
        tl.fromTo(arrow, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4 }, 0.5);
        tl.fromTo(game, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, 0.8);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
