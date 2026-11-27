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
    // the firewood order page, drawn as it really looks on a phone (ved.atladeus.com)
    const T = (g, x, y, str, font, fill, extra = {}) => D.text(g, x, y, str, 'pg', { style: `font: ${font}; fill: ${fill}`, ...extra });
    const DISP = 'var(--font-display)', MONO = 'var(--font-mono)';
    const button = (g, x, y, w, label, filled) => {
      const b = D.g(g, { 'data-unit': '' });
      D.el('rect', { x, y, width: w, height: 42, rx: 21, style: filled ? 'fill: #ff7a2f; stroke: #1a120c' : 'fill: #1d130d; stroke: #6f5848', 'stroke-width': 2 }, b);
      T(b, x + w / 2, y + 27, label, `800 16px ${DISP}`, filled ? '#1a120c' : '#e9d6bf', { 'text-anchor': 'middle' });
      return b;
    };
    // the phone, its header (logo and the shop's open sign)
    function win(g) {
      const w = D.g(g, { 'data-picture': '' }); // a picture of the website: its own text may overlap (the bug)
      const bg = D.g(w, { 'data-bg': '' });
      D.el('rect', { x: WX, y: WY, width: WW, height: WH, rx: 30, style: 'fill: #150d08; stroke: var(--deco)', 'stroke-width': 3 }, bg);
      D.el('rect', { x: WX + WW / 2 - 36, y: WY + 14, width: 72, height: 14, rx: 7, style: 'fill: #070403' }, bg);
      T(bg, WX + 26, WY + 58, 'Ved', `800 24px ${DISP}`, '#fff3e3', { 'letter-spacing': '-.03em' });
      D.el('circle', { cx: WX + 76, cy: WY + 54, r: 4, style: 'fill: #ff7a2f' }, bg);
      D.el('rect', { x: WX + 236, y: WY + 38, width: 100, height: 28, rx: 14, style: 'fill: #1d130d; stroke: #3d2d22', 'stroke-width': 2 }, bg);
      D.el('circle', { cx: WX + 254, cy: WY + 52, r: 4, style: 'fill: #8fe3a2' }, bg);
      T(bg, WX + 266, WY + 57, 'Åpen nå', `600 13px ${DISP}`, '#e9d6bf');
      return { w, bg };
    }
    // the order form, scrolled to the sacks and the price. The bug: Bestill sits on top of the price.
    function settings(g) {
      const { w, bg } = win(g);
      const L = WX + 36, R = WX + WW - 36;
      D.el('rect', { x: WX + 16, y: WY + 84, width: WW - 32, height: 424, rx: 22, style: 'fill: #22170f; stroke: #3d2d22', 'stroke-width': 2 }, bg);
      T(bg, L, WY + 128, 'Bestill ved', `800 26px ${DISP}`, '#fff3e3', { 'letter-spacing': '-.02em' });
      T(bg, L, WY + 152, 'Første levering i morgen.', `500 13px ${DISP}`, '#a08a74');
      D.el('circle', { cx: L + 9, cy: WY + 186, r: 9, style: 'fill: #e9d6bf' }, bg);
      T(bg, L + 9, WY + 190, '3', `800 11px ${DISP}`, '#1a120c', { 'text-anchor': 'middle' });
      T(bg, L + 26, WY + 191, 'Hvor mye per levering?', `700 14px ${DISP}`, '#fff3e3');
      const tw = (R - L - 3 * 8) / 4;
      [1, 2, 3, 4].forEach((n, k) => {
        const x = L + k * (tw + 8), y = WY + 206, on = k === 0;
        D.el('rect', { x, y, width: tw, height: 66, rx: 12, style: `fill: #1d130d; stroke: ${on ? '#ff7a2f' : '#3d2d22'}`, 'stroke-width': on ? 2.5 : 2 }, bg);
        for (let j = 0; j < n; j++) D.el('circle', { cx: x + tw / 2 + (j - (n - 1) / 2) * 9, cy: y + 15, r: 3.5, style: 'fill: #b9824e' }, bg);
        T(bg, x + tw / 2, y + 40, String(n), `800 16px ${DISP}`, '#fff3e3', { 'text-anchor': 'middle' });
        T(bg, x + tw / 2, y + 56, n === 1 ? 'sekk' : 'sekker', `500 10px ${DISP}`, '#a08a74', { 'text-anchor': 'middle' });
      });
      D.p(bg, `M${L} ${WY + 292} H${R}`, '', { style: 'fill: none; stroke: #3d2d22; stroke-dasharray: 5 5', 'stroke-width': 2 });
      T(bg, L, WY + 326, '1 sekk · 40 liter', `500 13px ${DISP}`, '#a08a74');
      T(bg, R, WY + 330, '129 kr', `800 26px ${DISP}`, '#fff3e3', { 'text-anchor': 'end' });
      T(bg, R, WY + 350, '/ levering', `500 11px ${DISP}`, '#a08a74', { 'text-anchor': 'end' });
      const text = T(bg, WX + WW / 2, WY + 432, 'Ingen betaling i dag.', `500 12px ${DISP}`, '#a08a74', { 'text-anchor': 'middle' });
      const del = button(w, L, WY + 452, 130, 'Se priser', false);
      const save = button(w, WX + 206, WY + 318, 118, 'Bestill', true);
      save.setAttribute('data-overlap-ok', '');
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
        P.bug = D.el('rect', { x: WX + 196, y: WY + 300, width: 138, height: 68, rx: 10, style: 'fill: none; stroke: #ff6f9c', 'stroke-width': 3, opacity: 0, 'data-bg': '' }, svg);
        tl.to(P.bug, { opacity: 1, duration: 0.25, repeat: 3, yoyo: true }, 1.0);
        P.chat.user(tl, 'Knappen nede til høyre overlapper teksten på mobil.', 2.2);
        const t = P.chat.think(tl, 2.9, 1.3);
        // the wrong button moves, confidently
        tl.to(P.ui.del, { x: 158, duration: 0.6, ease: 'power2.inOut' }, t);
        P.chat.reply(tl, 'Fikset! Knappen er flyttet.', t + 0.6);
        tl.to(P.bug, { opacity: 1, duration: 0.25, repeat: 3, yoyo: true }, t + 1.2);
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
        P.chat.reply(tl, 'Bestill ligger over prisen på mobil. Flyttet den under.', t);
        tl.to(P.ui2.save, { y: 52, duration: 0.6, ease: 'power2.inOut' }, t + 0.2);
        const ok = D.g(svg, { 'data-bg': '' });
        D.el('circle', { cx: WX + WW - 52, cy: WY + 122, r: 20, style: 'fill: #1f9d63; stroke: #1a120c', 'stroke-width': 2 }, ok);
        D.p(ok, `M${WX + WW - 62} ${WY + 122} l7 8 l14 -16`, '', { style: 'fill: none; stroke: #fff3e3', 'stroke-width': 4, 'stroke-linecap': 'round' });
        tl.fromTo(ok, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' }, t + 1.0);
        P.ok = ok;
        ctx.focus(tl, [P.ui2.w, ok, P.chat.root, P.att.g], 0.4);
      }

      if (i === 2) {
        // when it is hard to explain: a fresh agent turns the screenshot into prompts
        P.att.show(tl, 'VANSKELIG Å FORKLARE · FERSK AGENT', 0);
        tl.to([P.ui2.w, P.ok], { opacity: 0, duration: 0.3 }, 0);
        P.chat.clear(tl, 0.1);
        // the landing page, three quiet problems: the headline runs off the screen, the second
        // icon sits lower than its text, the paragraph is dark on dark
        const { w, bg } = win(svg);
        T(bg, WX + 26, WY + 98, 'VEDLEVERING · HELE NORGE', `700 11px ${MONO}`, '#ff7a2f', { 'letter-spacing': '.16em' });
        const cut = D.el('clipPath', { id: 'show-cut' }, bg);
        D.el('rect', { x: WX, y: WY, width: WW, height: WH, rx: 30 }, cut);
        const head = D.g(bg, { 'clip-path': 'url(#show-cut)' });
        T(head, WX + 22, WY + 156, 'Ved på døra,', `800 58px ${DISP}`, '#fff3e3', { 'letter-spacing': '-.04em' });
        T(head, WX + 22, WY + 212, 'hele vinteren.', `800 58px ${DISP}`, '#ffb25e', { 'letter-spacing': '-.04em' });
        [['Tørr bjørk', 'Klar til fyring'], ['Stablet', 'Ved døra di'], ['Ingen binding', 'Pause når du vil']].forEach(([a, b], k) => {
          const y = WY + 246 + k * 58, iy = y + (k === 1 ? 12 : 0);
          D.el('circle', { cx: WX + 44, cy: iy, r: 15, ...FILL('#c9935a', 2) }, bg);
          D.el('circle', { cx: WX + 44, cy: iy, r: 8, style: 'fill: none; stroke: #8a5a30', 'stroke-width': 2 }, bg);
          T(bg, WX + 84, y - 2, a, `800 16px ${DISP}`, '#fff3e3');
          T(bg, WX + 84, y + 17, b, `500 13px ${DISP}`, '#a08a74');
        });
        ['Tørr bjørkeved i sekker på 40 liter.', 'Første levering i morgen, deretter', 'hver 14. dag. Ingen betaling i dag.'].forEach((l, k) =>
          T(bg, WX + 26, WY + 432 + k * 22, l, `500 14px ${DISP}`, '#3a2b20'));
        tl.fromTo(w, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        P.chat.user(tl, 'Hva er galt her? Skriv hvert problem som en prompt.', 0.8, { attach: shot(false) });
        const t = P.chat.think(tl, 1.7, 1.4);
        P.chat.reply(tl, '', t, { list: ['1. Ikonet ved «Stablet» står for lavt.', '2. «hele vinteren.» kuttes på mobil.', '3. Brødteksten er mørk på mørk.'] });
        const rings = [
          ring(svg, WX + 42, WY + 312, 26, 26, 1),
          ring(svg, WX + 182, WY + 172, 164, 60, 2),
          ring(svg, WX + 180, WY + 448, 162, 50, 3),
        ];
        rings.forEach((r, k) => tl.fromTo(r, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 0.3 + k * 0.4));
        ctx.focus(tl, [w, ...rings, P.chat.root, P.att.g], 0.4);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
