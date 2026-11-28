import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, FILL } from '../engine/props.js';
import { relaySend } from '../engine/relay.js';

/*
  Lanser før det er perfekt. The step between a working product and a live one, and how to take
  it without paying for anything but a domain. The stack is "slik gjør du det", not how Ved. runs.
    0. The prompt "Gjør siden klar for lansering." The AI ticks off the boring launch list. On the
       right, your own wish list (the "perfect" version) drops into a drawer labelled ETTER LANSERING.
    1. Slik gjør du det: a phone and three services drawn as blocks: Cloudflare (hosting, domain,
       DNS), Supabase (database, login), Resend (e-mail). Each gets a "0 kr" tag. An order runs
       through it: Bestill → Cloudflare → a new row in Supabase → Resend's envelope lands on the
       phone as "Bestilling mottatt".
    2. The receipt prints: hosting, database, e-mail 0 kr; a domain about 150 kr a year; the AI
       subscription you already have. Every phone gets the stack as a card with links.

  Layout zones (svg units):
    tip        x 80–540, y 110–240 · scene badge x 560–900, y 120–154
    step 0     chat x 80–520, y 262–782 · wish card x 680–1200, y 262–600 (drops to y 483–770)
               · drawer x 640–1240, y 640–770, its front y 680–770 drawn over the card
    step 1     phone x 100–300, y 320–700 · blocks y 330–570: x 400–680, 760–1040, 1120–1400
               · tags y 600–664 · envelope arc above the blocks (y 262–330)
    step 2     printer slot x 570–1030, y 196–214 · receipt x 610–990, y 214–700 · pencil note x 1060–1400, y 380–440
*/

const INK = '#1a120c';
const LIST = ['Domene og DNS', 'Deploy', 'Personvern', 'Vilkår', 'Delingsbilde', '404-side', 'Feilvarsling'];
const WISH = ['Mørk modus', 'Animasjoner', 'Egen app', 'Nyhetsbrev'];
const BX = [400, 760, 1120], BY = 330, BW = 280, BH = 240;

// the three services, drawn (no logos): a cloud, a database drum, an envelope
function cloud(g, cx, cy, s = 1) {
  const a = (r, dx, dy) => `a${r * s} ${r * s} 0 0 1 ${dx * s} ${dy * s}`;
  const d = `M${cx - 40 * s} ${cy + 18 * s} ${a(18, 4, -35)} ${a(26, 48, -6)} ${a(20, 28, 22)} ${a(17, -4, 19)} z`;
  D.p(g, d, '', FILL('#ffb25e', 2.6));
}
function drum(g, cx, cy, s = 1) {
  const w = 34 * s, h = 46 * s, r = 9 * s;
  D.p(g, `M${cx - w} ${cy - h / 2} V${cy + h / 2} a${w} ${r} 0 0 0 ${2 * w} 0 V${cy - h / 2}`, '', FILL('#8fe3a2', 2.6));
  D.el('ellipse', { cx, cy: cy - h / 2, rx: w, ry: r, ...FILL('#b8f0c4', 2.6) }, g);
  D.p(g, `M${cx - w} ${cy} a${w} ${r} 0 0 0 ${2 * w} 0`, '', { style: `fill: none; stroke: ${INK}`, 'stroke-width': 2.6 });
}
function mail(g, cx, cy, s = 1) {
  const w = 40 * s, h = 28 * s;
  D.el('rect', { x: cx - w, y: cy - h, width: 2 * w, height: 2 * h, rx: 5 * s, ...FILL('#ffd23f', 2.6) }, g);
  D.p(g, `M${cx - w + 3} ${cy - h + 4} L${cx} ${cy + 4 * s} L${cx + w - 3} ${cy - h + 4}`, '', { style: `fill: none; stroke: ${INK}; stroke-linejoin: round`, 'stroke-width': 2.6 });
}
const SERVICES = [
  { name: 'Cloudflare', role: 'HOSTING · DOMENE · DNS', icon: cloud },
  { name: 'Supabase', role: 'DATABASE · INNLOGGING', icon: drum },
  { name: 'Resend', role: 'E-POST', icon: mail },
];

export default {
  id: 'ship',
  title: 'Lanser før det er perfekt',
  steps: 3,
  notes: [
    'AI-en tar lanseringslista. Ønskene dine venter til etter lansering.',
    'Slik gjør du det, ikke slik Ved. kjører: tre tjenester, gratis å starte.',
    'Du betaler for domenet. Telefonene får lista med lenker.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Lansering</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Lanser før det<br>er <em>perfekt</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    // ---- step 0: the launch list and the wish list ----
    const wishes = (tl) => {
      // the drawer the wishes go into (its front is drawn over the card as it drops in)
      const drawer = D.g(svg, { 'data-bg': '' });
      D.el('rect', { x: 640, y: 640, width: 600, height: 130, rx: 10, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 3 }, drawer);
      // the card sits in a clip that ends at the drawer's front: what drops in is out of sight
      const cid = `dw-${Math.random().toString(36).slice(2, 7)}`;
      const cp = D.el('clipPath', { id: cid }, svg);
      D.el('rect', { x: 600, y: 200, width: 680, height: 480 }, cp);
      D.el('rect', { id: `${cid}-box`, x: 600, y: 200, width: 680, height: 480, style: 'fill: none; stroke: none', 'data-bg': '' }, svg);
      const holder = D.g(svg, { 'clip-path': `url(#${cid})`, 'data-clip': `${cid}-box` });
      const card = D.g(holder, { 'data-unit': '' });
      D.el('rect', { x: 680, y: 262, width: 520, height: 338, rx: 8, style: 'fill: #fff3e3; stroke: none' }, card);
      D.text(card, 712, 304, 'ØNSKELISTE', 'wh', { style: 'font: 700 15px var(--font-mono); letter-spacing: .16em; fill: #7a5a3a' });
      WISH.forEach((w, k) => {
        D.el('circle', { cx: 722, cy: 356 + k * 62, r: 5, style: `fill: ${INK}` }, card);
        D.text(card, 740, 370 + k * 62, w, 'ww', { style: `font: 700 42px var(--font-note); fill: ${INK}` });
      });
      const front = D.g(svg, { 'data-unit': '' });
      D.el('rect', { x: 640, y: 680, width: 600, height: 90, rx: 10, style: 'fill: #241a13; stroke: var(--deco)', 'stroke-width': 3 }, front);
      D.el('rect', { x: 900, y: 700, width: 80, height: 12, rx: 6, style: 'fill: var(--deco)' }, front);
      D.text(front, 940, 748, 'ETTER LANSERING', 'dl', { 'text-anchor': 'middle', style: 'font: 700 18px var(--font-mono); letter-spacing: .22em; fill: var(--accent-2)' });
      tl.fromTo([drawer, front], { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
      tl.fromTo(card, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.6);
      P.wish = { drawer, card, front };
      return P.wish;
    };

    // ---- step 1: the stack ----
    const phone = () => {
      const g = D.g(svg, { 'data-unit': '' });
      D.el('rect', { x: 100, y: 320, width: 200, height: 380, rx: 30, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 3, 'data-body': '' }, g);
      D.el('rect', { x: 112, y: 332, width: 176, height: 356, rx: 22, style: 'fill: #150d08' }, g);
      D.text(g, 128, 420, 'Ved', 'pv', { style: 'font: 800 22px var(--font-display); fill: #fff3e3' });
      D.el('circle', { cx: 175, cy: 416, r: 4, style: 'fill: #ff7a2f' }, g);
      D.p(g, 'M128 452 H262 M128 474 H236 M128 520 H262 M128 542 H220', '', { style: 'fill: none; stroke: #3d2d22; stroke-linecap: round', 'stroke-width': 9 });
      const btn = D.g(g);
      D.el('rect', { x: 128, y: 610, width: 144, height: 44, rx: 22, style: `fill: #ff7a2f; stroke: ${INK}`, 'stroke-width': 2 }, btn);
      D.text(btn, 200, 638, 'Bestill', 'pb', { 'text-anchor': 'middle', style: `font: 800 17px var(--font-display); fill: ${INK}` });
      // the confirmation that lands at the top of the screen
      const note = D.g(g, { opacity: 0 });
      D.el('rect', { x: 120, y: 344, width: 160, height: 50, rx: 12, style: 'fill: #fff3e3' }, note);
      mail(note, 144, 369, 0.32);
      D.text(note, 162, 365, 'Bestilling', 'pn1', { style: `font: 800 14px var(--font-display); fill: ${INK}` });
      D.text(note, 162, 384, 'mottatt', 'pn2', { style: `font: 800 14px var(--font-display); fill: ${INK}` });
      return { g, btn, note };
    };
    const block = (k) => {
      const s = SERVICES[k], x = BX[k], cx = x + BW / 2;
      const g = D.g(svg, { 'data-unit': '' });
      D.el('rect', { x, y: BY, width: BW, height: BH, rx: 14, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 3 }, g);
      s.icon(g, cx, BY + 62);
      D.text(g, cx, BY + 140, s.name, 'bn', { 'text-anchor': 'middle', style: 'font: 800 30px var(--font-display); letter-spacing: -.02em; fill: var(--fg)' });
      D.text(g, cx, BY + 170, s.role, 'br', { 'text-anchor': 'middle', style: 'font: 700 12px var(--font-mono); letter-spacing: .12em; fill: var(--muted)' });
      // the price tag on a string under the block
      const tag = D.g(svg, { 'data-unit': '' });
      D.p(tag, `M${cx} ${BY + BH} V${BY + BH + 30}`, '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 2, 'data-bg': '' });
      D.el('rect', { x: cx - 56, y: BY + BH + 30, width: 112, height: 50, rx: 8, ...FILL('#ffd23f', 2.5) }, tag);
      D.el('circle', { cx, cy: BY + BH + 40, r: 4, style: `fill: #1d1510; stroke: ${INK}`, 'stroke-width': 1.5 }, tag);
      D.text(tag, cx, BY + BH + 70, '0 kr', 'tg', { 'text-anchor': 'middle', style: `font: 800 22px var(--font-display); fill: ${INK}` });
      return { g, tag, cx };
    };
    // Supabase's table: a new row arrives with the order
    const table = (parent) => {
      const g = D.g(parent);
      const x = BX[1] + 30, y = BY + 190, w = BW - 60;
      D.el('rect', { x, y, width: w, height: 34, rx: 6, style: 'fill: #150d08; stroke: #3d2d22', 'stroke-width': 1.5 }, g);
      const row = D.g(g, { opacity: 0 });
      D.el('rect', { x: x + 4, y: y + 4, width: w - 8, height: 26, rx: 4, style: 'fill: rgba(143,227,162,.22); stroke: #8fe3a2', 'stroke-width': 1.5 }, row);
      D.text(row, x + 14, y + 22, 'ny bestilling · 1 sekk', 'tr', { style: 'font: 700 12px var(--font-mono); fill: #8fe3a2' });
      return { g, row };
    };
    const wire = (x1, x2) => {
      const y = BY + 120;
      D.p(svg, `M${x1} ${y} H${x2}`, '', { style: 'fill: none; stroke: var(--deco); stroke-dasharray: 6 7', 'stroke-width': 3, 'data-bg': '' });
      return D.p(svg, `M${x1} ${y} H${x2}`, '', { style: 'fill: none; stroke: var(--accent); stroke-linecap: round', 'stroke-width': 4, 'data-bg': '' });
    };

    // ---- step 2: the receipt ----
    const receipt = () => {
      const g = D.g(svg);
      const slot = D.g(g, { 'data-bg': '' });
      D.el('rect', { x: 570, y: 196, width: 460, height: 18, rx: 9, style: 'fill: #0c0705; stroke: var(--deco)', 'stroke-width': 3 }, slot);
      const id = `rc-${Math.random().toString(36).slice(2, 7)}`;
      const cp = D.el('clipPath', { id }, g);
      D.el('rect', { x: 560, y: 205, width: 480, height: 600 }, cp);
      const clip = D.g(g, { 'clip-path': `url(#${id})`, 'data-clip': '' });
      const paper = D.g(clip, { 'data-unit': '' });
      const L = 640, R = 960, top = 214, bot = 700;
      // the torn bottom edge, right to left
      const zig = Array.from({ length: 17 }, (_, k) => `L${(990 - (k + 1) * 23.75).toFixed(1)} ${bot + (k % 2 ? 0 : 10)}`).join(' ');
      D.p(paper, `M610 ${top} H990 V${bot} ${zig} Z`, '', { style: 'fill: #fff3e3' });
      const T = (x, y, s, font, fill = INK, anchor = 'start') => D.text(paper, x, y, s, 'rc', { 'text-anchor': anchor, style: `font: ${font}; fill: ${fill}` });
      T(800, 262, 'LANSERING', '700 16px var(--font-mono); letter-spacing: .22em', '#7a5a3a', 'middle');
      D.p(paper, `M${L} 288 H${R}`, '', { style: 'fill: none; stroke: #c9ad92; stroke-dasharray: 4 6', 'stroke-width': 2 });
      const rows = [
        ['Hosting', 'Cloudflare', '0 kr', cloud],
        ['Database', 'Supabase', '0 kr', drum],
        ['E-post', 'Resend', '0 kr', mail],
        ['Domene', '', 'ca. 150 kr/år', null],
        ['AI-abonnement', '', 'har du', null],
      ];
      const lines = rows.map(([a, b, v, icon], k) => {
        const y = 340 + k * 58;
        const r = D.g(paper);
        if (icon) icon(r, L + 14, y - 8, 0.36);
        T(L + (icon ? 40 : 0), y, a, '800 21px var(--font-display)');
        if (b) T(L + 40, y + 20, b, '700 12px var(--font-mono)', '#7a5a3a');
        T(R, y, v, '700 19px var(--font-mono)', k < 3 ? '#1f7a4d' : INK, 'end');
        return r;
      });
      D.p(paper, `M${L} 626 H${R}`, '', { style: `fill: none; stroke: ${INK}`, 'stroke-width': 2 });
      T(L, 666, 'Totalt', '800 24px var(--font-display)');
      T(R, 666, 'ca. 150 kr/år', '800 22px var(--font-mono)', INK, 'end');
      return { g, slot, paper, lines };
    };

    const reset = () => { svg.innerHTML = ''; P = {}; };
    const play = (i, instant) => {
      const tl = gsap.timeline();
      const live = !instant && !ctx.deck?.instant;
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        const w = wishes(tl);
        P.chat.user(tl, 'Gjør siden klar for lansering.', 1.0);
        const t = P.chat.think(tl, 1.6, 1.2);
        const r = P.chat.reply(tl, 'Ferdig:', t, { list: LIST });
        r.ticks.forEach((k, j) => tl.to(k, { opacity: 1, duration: 0.15 }, t + 0.4 + j * 0.22));
        // the wishes wait: the list drops into the drawer, still readable
        const ts = t + 0.8 + LIST.length * 0.22;
        tl.to(w.card, { y: 170, scale: 0.85, svgOrigin: '940 600', duration: 0.9, ease: 'power2.inOut' }, ts);
      }
      if (i === 1) {
        // one scene at a time: the chat and the drawer make way
        const old = [P.chat.root, P.wish.drawer, P.wish.front, P.wish.card];
        tl.to(old, { opacity: 0, duration: 0.35 }, 0);
        tl.call(() => old.forEach((n) => n.remove()), null, 0.4);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'SLIK GJØR DU DET', 0.3);
        P.ph = phone();
        P.blocks = SERVICES.map((_, k) => block(k));
        P.table = table(P.blocks[1].g);
        const wires = [wire(300, BX[0]), wire(BX[0] + BW, BX[1]), wire(BX[1] + BW, BX[2])];
        wires.forEach((w) => gsap.set(w, { opacity: 0 }));
        tl.fromTo(P.ph.g, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.5);
        P.blocks.forEach((b, k) => {
          tl.fromTo(b.g, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.7 + k * 0.25);
          tl.fromTo(b.tag, { opacity: 0, rotation: -14, svgOrigin: `${b.cx} ${BY + BH}` }, { opacity: 1, rotation: 0, svgOrigin: `${b.cx} ${BY + BH}`, duration: 0.9, ease: 'elastic.out(1, 0.45)' }, 1.5 + k * 0.25);
        });
        tl.fromTo(P.table.g, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.2);
        // an order runs through
        const t = 2.8;
        tl.to(P.ph.btn, { scale: 0.92, svgOrigin: '200 632', duration: 0.12, yoyo: true, repeat: 1 }, t);
        wires.forEach((w, k) => { tl.set(w, { opacity: 1 }, t + 0.2 + k * 0.7); tl.add(D.drawOn(w, { duration: 0.45 }), t + 0.2 + k * 0.7); });
        tl.fromTo(P.table.row, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35 }, t + 1.0);
        // Resend's envelope flies back over the blocks to the phone
        const env = D.g(svg, { 'data-bg': '' });
        mail(env, 0, 0, 0.5);
        const p0 = [BX[2] + BW / 2, BY - 6], c1 = [BX[2] + BW / 2, 230], c2 = [240, 230], p3 = [200, 330];
        const bz = (u) => p0.map((_, a) => (1 - u) ** 3 * p0[a] + 3 * (1 - u) ** 2 * u * c1[a] + 3 * (1 - u) * u ** 2 * c2[a] + u ** 3 * p3[a]);
        const o = { u: 0 };
        const put = () => { const [x, y] = bz(o.u); env.setAttribute('transform', `translate(${x} ${y})`); };
        put(); gsap.set(env, { opacity: 0 });
        tl.to(env, { opacity: 1, duration: 0.2 }, t + 1.7);
        tl.to(o, { u: 1, duration: 1.3, ease: 'power1.inOut', onUpdate: put }, t + 1.7);
        tl.to(env, { opacity: 0, duration: 0.2 }, t + 2.9);
        tl.fromTo(P.ph.note, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)' }, t + 2.9);
        P.env = env; P.wires = wires;
      }
      if (i === 2) {
        const old = [P.ph.g, P.table.g, P.env, ...P.wires, ...P.blocks.flatMap((b) => [b.g, b.tag]), ...svg.querySelectorAll('[data-bg]')];
        tl.to(old, { opacity: 0, duration: 0.35 }, 0);
        tl.call(() => old.forEach((n) => n.remove()), null, 0.4);
        P.att.show(tl, 'REGNINGEN', 0.3);
        P.rc = receipt();
        tl.fromTo(P.rc.slot, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4);
        tl.fromTo(P.rc.paper, { y: -500 }, { y: 0, duration: 2.2, ease: 'steps(14)' }, 0.7);
        const note = D.pencil(svg, 1060, 420, 'gratisnivået holder lenge', { size: 34, rotate: -4 });
        tl.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 3.1);
        if (live) tl.call(() => relaySend({ type: 'stack' }), null, 2.9);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
