import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, FILL } from '../engine/props.js';

/*
  Tip: show it, don't describe it. The firewood order page on a narrow phone screen.
    0. Attempt 1: the bug described in words. "Fikset!" The wrong button moved.
    1. Attempt 2 (new session): a screenshot with a circle. The right button moves.
    2. Hard to explain at all: the screenshot goes to a fresh agent: "what is wrong here,
       as prompts?" It circles each problem and returns a numbered list to paste.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782
    attempt    x 560–1000, y 120–154
    phone      x 940–1300, y 190–720 (the order page on mobile)
*/

const WX = 940, WY = 190, WW = 360, WH = 530;
const BAR = { style: 'fill: none; stroke: #6f6358', 'stroke-width': 10, 'stroke-linecap': 'round' };

export default {
  id: 'show',
  title: 'Vis, ikke beskriv',
  steps: 3,
  notes: [
    'Beskrevet med ord. Den flytter feil knapp, og sier fikset.',
    'Ny session, med skjermbilde og en sirkel. Riktig knapp.',
    'Når du ikke klarer å forklare: skjermbilde til en fersk agent. Den lister problemene som prompts du kan lime inn.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Kvalitet</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Vis det,<br>ikke <em>beskriv</em> det.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };
    const button = (g, x, y, w, label, filled) => {
      const b = D.g(g, { 'data-unit': '' });
      D.el('rect', { x, y, width: w, height: 44, rx: 8, style: filled ? 'fill: #ff5a1f; stroke: none' : 'fill: none; stroke: #ff6f9c', 'stroke-width': 2.5 }, b);
      D.text(b, x + w / 2, y + 29, label, 'bt', { 'text-anchor': 'middle', style: `font: 700 18px var(--font-mono); fill: ${filled ? '#1a120c' : '#ff6f9c'}` });
      return b;
    };
    function win(g, title) {
      const w = D.g(g);
      const bg = D.g(w, { 'data-bg': '' });
      D.el('rect', { x: WX, y: WY, width: WW, height: WH, rx: 30, style: 'fill: #1a0d07; stroke: var(--deco)', 'stroke-width': 3 }, bg);
      D.el('rect', { x: WX + WW / 2 - 36, y: WY + 14, width: 72, height: 14, rx: 7, style: 'fill: #0f0a07' }, bg);
      D.text(bg, WX + 28, WY + 46, 'Ved.', 'wb', { style: 'font: 800 18px var(--font-display); fill: #ff8a3d' });
      D.text(w, WX + 28, WY + 92, title, 'wt', { style: 'font: 800 28px var(--font-display); fill: var(--fg)' });
      return { w, bg };
    }
    function settings(g) {
      const { w, bg } = win(g, 'Bestill ved');
      D.p(bg, `M${WX + 28} ${WY + 130} H${WX + 300} M${WX + 28} ${WY + 158} H${WX + 260}`, '', BAR);
      [0, 1, 2].forEach((k) => {
        const y = WY + 210 + k * 60;
        D.p(bg, `M${WX + 28} ${y} H${WX + 180}`, '', BAR);
        D.el('circle', { cx: WX + 296, cy: y, r: 13, style: `fill: ${k === 0 ? '#ff8a3d' : 'none'}; stroke: #d9c6b0`, 'stroke-width': 2.5 }, bg);
        D.el('circle', { cx: WX + 220, cy: y, r: 11, ...FILL('#c9935a', 2) }, bg);
      });
      const text = D.p(bg, `M${WX + 28} ${WY + 420} H${WX + 320} M${WX + 28} ${WY + 446} H${WX + 280}`, '', BAR);
      const del = button(w, WX + 24, WY + 460, 150, 'Se priser', false);
      const save = button(w, WX + 226, WY + 404, 110, 'Bestill', true);
      return { w, text, del, save };
    }
    // tiny screenshot for the attachment chip
    const shot = (circle) => (g, x, y, w, h) => {
      D.el('rect', { x, y, width: w, height: h, rx: 6, style: 'fill: #241a13; stroke: #6f6358', 'stroke-width': 1.5 }, g);
      D.p(g, `M${x + 8} ${y + 14} H${x + 60} M${x + 8} ${y + 46} H${x + 80}`, '', { style: 'fill: none; stroke: #6f6358', 'stroke-width': 4 });
      D.el('rect', { x: x + 60, y: y + 40, width: 30, height: 12, rx: 3, style: 'fill: #ff5a1f' }, g);
      if (circle) D.el('ellipse', { cx: x + 75, cy: y + 46, rx: 22, ry: 14, style: 'fill: none; stroke: #ff6f9c', 'stroke-width': 2.5 }, g);
    };
    const ring = (g, cx, cy, rx, ry, n) => {
      const r = D.g(g, { 'data-unit': '' });
      D.p(r, D.roughEllipse(cx, cy, rx, ry), 'pencil');
      if (n) {
        D.el('circle', { cx: cx + rx - 4, cy: cy - ry + 2, r: 15, style: 'fill: #ff6f9c' }, r);
        D.text(r, cx + rx - 4, cy - ry + 9, String(n), 'rn', { 'text-anchor': 'middle', style: 'font: 800 18px var(--font-display); fill: #1a120c' });
      }
      return r;
    };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'FORSØK 1 · MED ORD', 0.3);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.ui = settings(svg);
        tl.fromTo(P.ui.w, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.4);
        // the bug pulses
        P.bug = D.el('rect', { x: WX + 214, y: WY + 396, width: 134, height: 60, rx: 10, style: 'fill: none; stroke: #ff6f9c', 'stroke-width': 3, opacity: 0, 'data-bg': '' }, svg);
        tl.to(P.bug, { opacity: 1, duration: 0.25, repeat: 3, yoyo: true }, 1.0);
        P.chat.user(tl, 'Knappen nede til høyre overlapper teksten på mobil.', 2.2);
        const t = P.chat.think(tl, 2.9, 1.3);
        // the wrong button moves, confidently
        tl.to(P.ui.del, { x: 150, duration: 0.6, ease: 'power2.inOut' }, t);
        tl.to(P.ui.save, { y: -26, duration: 0.6, ease: 'power2.inOut' }, t);
        P.chat.reply(tl, 'Fikset! Knappen er flyttet.', t + 0.6);
        tl.to(P.bug, { attr: { y: WY + 370 }, opacity: 1, duration: 0.25, repeat: 3, yoyo: true }, t + 1.2);
        tl.set(P.bug, { opacity: 1 }, t + 2.4);
      }

      if (i === 1) {
        // attempt 2: a new session, a screenshot with a circle
        P.att.show(tl, 'FORSØK 2 · NY SESSION, SKJERMBILDE', 0);
        tl.to([P.ui.w, P.bug], { opacity: 0, duration: 0.3 }, 0);
        P.chat.clear(tl, 0.1);
        P.ui2 = settings(svg);
        tl.fromTo(P.ui2.w, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        P.chat.user(tl, 'Denne.', 0.8, { attach: shot(true) });
        const t = P.chat.think(tl, 1.6, 1.3);
        P.chat.reply(tl, 'Bestill ligger over teksten på mobil. Flyttet den under.', t);
        tl.to(P.ui2.save, { y: 56, duration: 0.6, ease: 'power2.inOut' }, t + 0.2);
        const ok = D.g(svg, { 'data-bg': '' });
        D.el('circle', { cx: WX + WW - 30, cy: WY + 90, r: 20, style: 'fill: #1f9d63; stroke: #1a120c', 'stroke-width': 2 }, ok);
        D.p(ok, `M${WX + WW - 40} ${WY + 90} l7 8 l14 -16`, '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 4, 'stroke-linecap': 'round' });
        tl.fromTo(ok, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' }, t + 1.0);
        P.ok = ok;
        ctx.focus(tl, [P.ui2.w, ok, P.chat.root, P.att.g], 0.4);
      }

      if (i === 2) {
        // when it is hard to explain: a fresh agent turns the screenshot into prompts
        P.att.show(tl, 'VANSKELIG Å FORKLARE · FERSK AGENT', 0);
        tl.to([P.ui2.w, P.ok], { opacity: 0, duration: 0.3 }, 0);
        P.chat.clear(tl, 0.1);
        const { w, bg } = win(svg, 'Ved på døra, hele vi');
        // three quiet problems: icons off the line, a clipped title, grey on grey
        [0, 1, 2].forEach((k) => {
          const y = WY + 160 + k * 66;
          D.el('circle', { cx: WX + 41, cy: y - 5 + (k === 1 ? 9 : 0), r: 13, ...FILL('#c9935a', 2) }, bg);
          D.p(bg, `M${WX + 72} ${y} H${WX + 250}`, '', BAR);
        });
        D.p(bg, `M${WX + 28} ${WY + 400} H${WX + 300} M${WX + 28} ${WY + 428} H${WX + 260} M${WX + 28} ${WY + 456} H${WX + 280}`, '', { style: 'fill: none; stroke: #3a2e25', 'stroke-width': 10, 'stroke-linecap': 'round' });
        tl.fromTo(w, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        P.chat.user(tl, 'Hva er galt her? Skriv hvert problem som en prompt.', 0.8, { attach: shot(false) });
        const t = P.chat.think(tl, 1.7, 1.4);
        P.chat.reply(tl, '', t, { list: ['1. Ikon nr. 2 står lavere enn teksten.', '2. Overskriften kuttes på mobil.', '3. Mørk tekst på mørk bakgrunn.'] });
        const rings = [
          ring(svg, WX + 41, WY + 236, 30, 26, 1),
          ring(svg, WX + 170, WY + 82, 150, 34, 2),
          ring(svg, WX + 170, WY + 428, 160, 52, 3),
        ];
        rings.forEach((r, k) => tl.fromTo(r, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 0.3 + k * 0.4));
        ctx.focus(tl, [w, ...rings, P.chat.root, P.att.g], 0.4);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
