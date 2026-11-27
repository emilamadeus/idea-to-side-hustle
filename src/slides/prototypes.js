import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone } from '../engine/props.js';
import { LANDINGS } from '../engine/landings.js';

/*
  Tip: build several throwaway versions and pick one, instead of debating one.
  The example is the firewood subscription's landing page.
    0. Asked for four real proposals for the site.
    1. They flip past one at a time: Skog, Nordisk enkel, Rask levering, Varm peis.
    2. Side by side for the pick. Three go in the bin; the chosen one (Varm peis) comes back,
       stamped.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–560
    card       x 620–1460, y 160–632 (one direction at a time); label y 680
    pick row   y 300–520 (step 2); bin x 1360–1460, y 600–760
*/

// four landing pages for the firewood subscription; the last one is picked
const DIRS = [
  { name: 'Skog', bg: '#17241a', fg: '#eef3e6', acc: '#8fbf6a', font: "800 64px 'Inter Tight', var(--font-display)", deco: 'trees' },
  { name: 'Nordisk enkel', bg: '#f1ebe0', fg: '#1a120c', acc: '#c4562a', font: '700 56px var(--font-display)', deco: 'logs' },
  { name: 'Rask levering', bg: '#ffd23f', fg: '#1a120c', acc: '#1a120c', font: '800 64px var(--font-display)', deco: 'truck' },
  { name: 'Varm peis', bg: '#22120a', fg: '#fff3e3', acc: '#ff7a2f', font: '800 64px var(--font-display)', deco: 'fire' },
];
const CW = 840, CH = 472;

export default {
  id: 'prototypes',
  title: 'Prototyper',
  steps: 3,
  notes: [
    'Fire ekte forslag til nettsiden for ved-abonnementet, i stedet for et møte om ett.',
    'Skog, Nordisk enkel, Rask levering, Varm peis.',
    'Velg ett. Resten kastes.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Prototyper</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Lag fire.<br>Velg <em>én</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    // a mini title slide drawn in each direction's own style (0,0 → CW×CH)
    function card(g, d) {
      const c = D.g(g, { 'data-unit': '' });
      D.el('rect', { x: 0, y: 0, width: CW, height: CH, rx: 14, style: `fill: ${d.bg}; stroke: #6b5a48`, 'stroke-width': 3, 'data-bg': '' }, c);
      // every direction drawn as a finished site (src/engine/landings.js), so the choice is real
      LANDINGS.find((l) => l.name === d.name).draw(c, 0, 0, CW, CH);
      D.el('rect', { x: 0, y: 0, width: CW, height: CH, rx: 14, style: 'fill: none; stroke: #6b5a48', 'stroke-width': 3, 'data-bg': '' }, c);
      // the direction's name, under the card
      D.text(c, 0, CH + 42, d.name.toUpperCase(), 'cn', { style: 'font: 700 22px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      return c;
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 440, 300, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, 'Lag fire forslag til nettsiden for ved-abonnementet. Ekte, som jeg kan klikke i.', 0.8);
        const t = P.chat.think(tl, 1.6, 1.4);
        P.chat.reply(tl, 'Fire forslag klare.', t);
        P.cards = DIRS.map((d) => { const c = card(svg, d); gsap.set(c, { x: 620, y: 160, opacity: 0 }); return c; });
      }

      if (i === 1) {
        // one at a time
        P.cards.forEach((c, k) => {
          const at = k * 1.3;
          tl.fromTo(c, { opacity: 0, x: 700, rotation: 3, transformOrigin: '50% 50%' }, { opacity: 1, x: 620, rotation: 0, duration: 0.45, ease: 'power2.out' }, at);
          if (k < P.cards.length - 1) tl.to(c, { opacity: 0, x: 560, duration: 0.3, ease: 'power2.in' }, at + 0.85); // gone before the next arrives
        });
      }

      if (i === 2) {
        // side by side for the pick; three in the bin; one fills the frame
        const s = 0.24;
        // the shown card shrinks into its slot; the other three fade in at theirs (no fanning through each other)
        P.cards.forEach((c, k) => {
          tl.set(c, { transformOrigin: '0% 0%' }, 0);
          if (k === P.cards.length - 1) tl.to(c, { x: 600 + k * 222, y: 320, scale: s, rotation: 0, opacity: 1, duration: 0.6, ease: 'power2.inOut' }, 0);
          else {
            tl.set(c, { x: 600 + k * 222, y: 320, scale: s, rotation: 0, opacity: 0 }, 0);
            tl.to(c, { opacity: 1, duration: 0.3 }, 0.6 + k * 0.1);
          }
        });
        const bin = D.g(svg, { 'data-bg': '' });
        D.p(bin, 'M1370 620 L1385 760 H1455 L1470 620 Z', 'ln');
        D.p(bin, 'M1360 612 H1480 M1400 612 V600 H1440 V612', 'ln');
        tl.fromTo(bin, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.8);
        const pick = 3;
        P.cards.forEach((c, k) => {
          if (k === pick) return;
          // crumple in place (no flight across the other cards), a paper ball drops in the bin
          tl.to(c, { scale: 0.02, x: `+=${100}`, y: `+=${56}`, rotation: 20, opacity: 0, duration: 0.45, ease: 'power2.in' }, 1.6 + k * 0.3);
          const ball = D.el('circle', { cx: 1420, cy: 560, r: 12, style: 'fill: #e7dccb; stroke: #1a120c', 'stroke-width': 2, opacity: 0, 'data-bg': '' }, svg);
          tl.to(ball, { opacity: 1, duration: 0.05 }, 1.95 + k * 0.3);
          tl.to(ball, { attr: { cy: 650 }, duration: 0.35, ease: 'power2.in' }, 1.95 + k * 0.3);
          tl.to(ball, { opacity: 0, duration: 0.1 }, 2.3 + k * 0.3);
        });
                tl.to(bin, { opacity: 0, duration: 0.3 }, 2.6);
        // the chosen one grows back to full size
        tl.to(P.cards[pick], { x: 620, y: 160, scale: 1, duration: 1.0, ease: 'power2.inOut' }, 3.0); // after the others are in the bin
        const st = D.stamp(D.g(svg, { 'data-unit': '', 'data-overlap-ok': '' }), 1340, 694, 'VALGT', { size: 40, rotate: -6 }); // beside the chosen direction's name, under the card
        tl.add(D.slam(st), 4.1);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
