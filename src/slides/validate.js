import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, FILL } from '../engine/props.js';

/*
  Check the idea before starting. One everyday idea (firewood delivered to the door, as a
  subscription) run through four checks, one card at a time, each answered in the chat.
    0. The idea, drawn: a van brings firewood to a city door, every 14 days all winter.
    1. The four questions in the chat; the cards are empty.
    2. Kunde: city people with a fireplace and no car.
    3. Betalingsvilje: they already pay extra for small sacks at the petrol station.
    4. Konkurranse: plenty sell firewood, almost nobody delivers on a schedule.
    5. Levere: the ordering and routes can be built; summer earns nothing. Verdict: start small.
    6. The bigger picture (cards cleared): AI gives you every link of the value chain without
       much capital. The catch is that everyone else gets it too, so the market fills up. The
       openings: a niche nobody covers, or a product that reaches very many customers.
  The answers are illustrative.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    step 0     headline centred y 300; house x 1060–1400, y 330–620; van x 560–800, y 520–620;
               ground y 620; delivery calendar x 300–1300, y 660–740
    chat       x 80–520, y 262–782
    cards      2×2, x 600–1480, y 170–740 (each 420×270): label y+38, question y+72,
               drawing y+92–202, answer y+244, status badge top right
    step 5     chain label y 272, links y 290–380 (x 80–1520); row labels y 456;
               market x 80–1000, y 470–750 (niche top right); reach x 1060–1500, y 470–750
*/
const CHAIN = ['Idé', 'Produkt', 'Markedsføring', 'Salg', 'Levering'];

const CX = [600, 1060], CY = [170, 470], CW = 420, CH = 270;
const CHECKS = [
  { n: '01', label: 'KUNDE', q: 'Hvem er kunden?', a: 'Bor i by, har peis, mangler bil', ok: true },
  { n: '02', label: 'BETALINGSVILJE', q: 'Vil de betale?', a: 'Betaler alt ekstra for små sekker', ok: true },
  { n: '03', label: 'KONKURRANSE', q: 'Hvem gjør det i dag?', a: 'Mange selger, få leverer fast', ok: true },
  { n: '04', label: 'LEVERE', q: 'Kan du bygge og levere?', a: 'Ja, men bare om vinteren', ok: false },
];
const REPLIES = [
  'Folk i byen med peis og uten bil. I dag bærer de sekker fra bensinstasjonen.',
  'Ja. De betaler allerede ekstra for små sekker. Levering på døra er verdt mer.',
  'Mange selger ved. Nesten ingen leverer fast på døra i byen.',
  'Bestilling og ruter kan du bygge. Men om sommeren tjener du ingenting.',
];
const MUTED = { style: 'fill: none; stroke: #6b5a48', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

export default {
  id: 'validate',
  title: 'Sjekk ideen først',
  steps: 7,
  notes: [
    'Et hverdagseksempel: ved levert på døra i byen, som abonnement. Hver 14. dag, hele vinteren.',
    'Fire spørsmål før jeg starter.',
    'Hvem er kunden?',
    'Vil de betale? De gjør det allerede, bare dyrere og tyngre.',
    'Konkurransen: mange selger ved, nesten ingen leverer fast.',
    'Kan jeg levere? Ja, om vinteren. Så da starter jeg smått: vinter, én bydel.',
    'Det store bildet: AI gir deg hele verdikjeden uten store investeringer. Men det får alle andre også. Så: finn en nisje, eller lag noe som når veldig mange.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Idé</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Sjekk ideen<br>før du <em>starter</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    // ── the four drawings, each in a 380×110 box at (x, y) ──
    function drawCustomer(g, x, y) {
      // a block of flats, one window lit by a fire; an empty log basket
      D.el('rect', { x: x + 40, y: y + 4, width: 150, height: 106, rx: 3, ...FILL('#5a4a3c', 2.5) }, g);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const lit = r === 1 && c === 2;
        D.el('rect', { x: x + 54 + c * 34, y: y + 14 + r * 32, width: 22, height: 20, rx: 2, style: `fill: ${lit ? '#ffb04a' : '#2a1f17'}; stroke: #1a120c`, 'stroke-width': 2 }, g);
      }
      D.el('rect', { x: x + 150, y: y - 14, width: 16, height: 20, ...FILL('#4a3c30', 2) }, g);
      // empty basket
      D.p(g, `M${x + 240} ${y + 70} L${x + 250} ${y + 110} H${x + 320} L${x + 330} ${y + 70} Z`, '', FILL('#8a6a4a', 2.5));
      D.p(g, `M${x + 246} ${y + 84} H${x + 324} M${x + 249} ${y + 98} H${x + 321}`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 2 });
      D.text(g, x + 285, y + 56, 'tom', 'ce', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); letter-spacing: .1em; fill: var(--muted)' });
    }
    function sack(g, x, y, s = 1) {
      const k = D.g(g, { transform: `translate(${x} ${y}) scale(${s})` });
      D.p(k, 'M-34 0 L-28 -62 H28 L34 0 Z', '', FILL('#c9ad92', 2.5));
      [-16, 0, 16].forEach((dx) => D.el('circle', { cx: dx, cy: -68, r: 9, ...FILL('#9a6a42', 2) }, k));
      return k;
    }
    function drawPay(g, x, y) {
      // the shop where they buy small sacks today, and a sack with a hefty price tag
      D.el('rect', { x: x + 10, y: y + 20, width: 110, height: 90, rx: 6, ...FILL('#3a4a5a', 2.5) }, g);
      D.el('rect', { x: x + 22, y: y + 32, width: 40, height: 44, rx: 3, ...FILL('#ffd23f', 2) }, g);
      D.el('rect', { x: x + 70, y: y + 32, width: 38, height: 30, rx: 3, style: 'fill: #1a120c; stroke: #1a120c', 'stroke-width': 2 }, g);
      sack(g, x + 200, y + 110, 0.85);
      D.p(g, `M${x + 222} ${y + 52} L${x + 252} ${y + 40}`, '', { style: 'fill: none; stroke: #cfc3b2', 'stroke-width': 2.5 });
      D.p(g, `M${x + 264} ${y + 22} H${x + 352} V${y + 58} H${x + 264} L${x + 252} ${y + 40} Z`, '', FILL('#fff3e3', 2.5));
      D.text(g, x + 308, y + 47, 'kr kr kr', 'pt', { 'text-anchor': 'middle', style: 'font: 800 17px var(--font-display); fill: #1a120c' });
    }
    function pump(g, x, y) {
      D.el('rect', { x, y, width: 34, height: 60, rx: 4, ...FILL('#8a8f96', 2.5) }, g);
      D.el('rect', { x: x + 6, y: y + 8, width: 22, height: 14, rx: 2, style: 'fill: #1a120c' }, g);
      D.p(g, `M${x + 34} ${y + 18} q16 4 12 30`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 4, 'stroke-linecap': 'round' });
    }
    function drawCompetition(g, x, y) {
      // three sellers with sacks, and a delivery route nobody drives
      [0, 1, 2].forEach((k) => { pump(g, x + 4 + k * 66, y + 50); sack(g, x + 56 + k * 66, y + 110, 0.42); });
      D.p(g, `M${x + 236} ${y + 96} C${x + 276} ${y + 50} ${x + 324} ${y + 110} ${x + 368} ${y + 56}`, '', { ...MUTED, 'stroke-dasharray': '8 8' });
      D.el('circle', { cx: x + 368, cy: y + 56, r: 8, ...FILL('#6b5a48', 2) }, g);
      D.text(g, x + 300, y + 30, 'ingen fast', 'cr', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); letter-spacing: .06em; fill: var(--muted)' });
    }
    function drawDeliver(g, x, y) {
      // a van that runs loaded in winter and stands empty in summer
      const van = (vx, vy, tone) => {
        D.p(g, `M${vx} ${vy} V${vy - 44} H${vx + 70} L${vx + 92} ${vy - 24} V${vy} Z`, '', FILL(tone, 2.5));
        D.el('rect', { x: vx + 72, y: vy - 40, width: 14, height: 14, rx: 2, style: 'fill: #a9c6d6; stroke: #1a120c', 'stroke-width': 2 }, g);
        [vx + 20, vx + 70].forEach((cx) => D.el('circle', { cx, cy: vy, r: 10, ...FILL('#2a1d14', 2.5) }, g));
      };
      const flake = (cx, cy) => D.p(g, `M${cx - 14} ${cy} H${cx + 14} M${cx - 7} ${cy - 12} L${cx + 7} ${cy + 12} M${cx + 7} ${cy - 12} L${cx - 7} ${cy + 12}`, '', { style: 'fill: none; stroke: #a9c6d6', 'stroke-width': 3, 'stroke-linecap': 'round' });
      flake(x + 30, y + 20);
      van(x + 40, y + 100, '#ff5a1f');
      sack(g, x + 76, y + 54, 0.3);
      D.text(g, x + 92, y + 26, 'vinter', 'dw', { style: 'font: 700 15px var(--font-mono); letter-spacing: .06em; fill: var(--muted)' });
      D.p(g, `M${x + 186} ${y + 6} V${y + 108}`, '', { style: 'fill: none; stroke: #4a3c30', 'stroke-width': 2, 'stroke-dasharray': '6 6' });
      D.el('circle', { cx: x + 222, cy: y + 20, r: 12, ...FILL('#ffd23f', 2) }, g);
      van(x + 236, y + 100, '#6b5a48');
      D.text(g, x + 246, y + 26, 'sommer', 'ds', { style: 'font: 700 15px var(--font-mono); letter-spacing: .06em; fill: var(--muted)' });
    }
    const DRAW = [drawCustomer, drawPay, drawCompetition, drawDeliver];

    function badge(g, x, y, ok) {
      const b = D.g(g, { 'data-unit': '' });
      D.el('circle', { cx: x, cy: y, r: 17, style: `fill: ${ok ? '#8fe3a2' : '#ffd23f'}; stroke: #1a120c`, 'stroke-width': 2.5 }, b);
      if (ok) D.p(b, `M${x - 8} ${y} l5 6 l11 -12`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      else D.p(b, `M${x - 8} ${y} H${x + 8}`, '', { style: 'fill: none; stroke: #1a120c', 'stroke-width': 4, 'stroke-linecap': 'round' });
      return b;
    }

    const answer = (k, tl) => {
      const c = P.cards[k], x = CX[k % 2], y = CY[Math.floor(k / 2)];
      const t = P.chat.think(tl, 0.1, 1.0);
      P.chat.reply(tl, REPLIES[k], t);
      tl.to(c.slot, { opacity: 0, duration: 0.3 }, t);
      const art = D.g(c.g, { 'data-bg': '' });
      DRAW[k](art, x + 20, y + 92);
      const a = D.text(c.g, x + 24, y + 244, CHECKS[k].a, 'ca', { style: 'font: 700 20px var(--font-display); fill: var(--fg)' });
      const b = badge(c.g, x + CW - 34, y + 34, CHECKS[k].ok);
      tl.fromTo(art, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 }, t + 0.2);
      tl.fromTo(a, { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 0.5);
      tl.fromTo(b, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' }, t + 0.9);
      return t;
    };

    // the idea, drawn: firewood to a city door, on a schedule
    function idea() {
      const g = D.g(svg);
      const head = D.g(g, { 'data-unit': '' });
      D.text(head, 800, 252, 'IDEEN', 'il', { 'text-anchor': 'middle', style: 'font: 700 16px var(--font-mono); letter-spacing: .2em; fill: var(--muted)' });
      D.text(head, 800, 304, 'Ved levert på døra, som abonnement.', 'ih', { 'text-anchor': 'middle', style: 'font: 800 40px var(--font-display); fill: var(--fg)' });
      const ground = D.g(g, { 'data-bg': '' });
      D.p(ground, 'M160 620 H1440', '', { style: 'fill: none; stroke: #4a3c30', 'stroke-width': 3 });
      // a city house: lit window with a fire, chimney, door
      const house = D.g(g, { 'data-bg': '' });
      D.p(house, 'M1060 380 L1230 330 L1400 380 Z', '', FILL('#6b3a2a', 2.5));
      D.el('rect', { x: 1320, y: 330, width: 30, height: 40, ...FILL('#5a4a3c', 2.5) }, house);
      D.el('rect', { x: 1070, y: 380, width: 320, height: 240, ...FILL('#5a4a3c', 2.5) }, house);
      D.el('rect', { x: 1092, y: 414, width: 76, height: 64, rx: 3, style: 'fill: #ffb04a; stroke: #1a120c', 'stroke-width': 2.5 }, house);
      D.p(house, 'M1112 474 q8 -22 18 -8 q6 -20 16 -2 q8 -14 10 10 Z', '', FILL('#ff5a1f', 2));
      D.el('rect', { x: 1250, y: 488, width: 76, height: 132, rx: 3, ...FILL('#3a2416', 2.5) }, house);
      D.el('circle', { cx: 1314, cy: 556, r: 4, style: 'fill: #ffd23f' }, house);
      D.text(house, 1288, 476, '14B', 'hn', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); fill: #e6d8c6' });
      const smoke = D.p(g, 'M1335 322 q-12 -16 0 -30 q12 -14 0 -30', '', { style: 'fill: none; stroke: #9a8a78', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0, 'data-bg': '' });
      // the delivery van with firewood in the back
      const van = D.g(g, { 'data-unit': '' });
      D.p(van, 'M560 610 V520 H740 L790 560 V610 Z', '', FILL('#ff5a1f', 2.5));
      D.el('rect', { x: 744, y: 528, width: 30, height: 26, rx: 3, style: 'fill: #a9c6d6; stroke: #1a120c', 'stroke-width': 2 }, van);
      D.text(van, 650, 574, 'VED', 'vt', { 'text-anchor': 'middle', style: 'font: 800 26px var(--font-display); fill: #1a120c' });
      [600, 740].forEach((cx) => D.el('circle', { cx, cy: 612, r: 16, ...FILL('#2a1d14', 2.5) }, van));
      // two sacks left at the door
      const sacks = D.g(g, { 'data-bg': '' });
      sack(sacks, 1150, 620, 0.62); sack(sacks, 1206, 620, 0.62);
      // the schedule: every 14 days, all winter
      const cal = D.g(g, { 'data-unit': '' });
      D.text(cal, 300, 690, 'HVER 14. DAG', 'cal', { style: 'font: 700 16px var(--font-mono); letter-spacing: .12em; fill: var(--muted)' });
      const cells = [];
      for (let k = 0; k < 10; k++) {
        const x = 470 + k * 82;
        const c = D.g(cal);
        D.el('rect', { x, y: 662, width: 70, height: 54, rx: 6, style: `fill: ${k % 2 ? '#1d1510' : '#2a1d12'}; stroke: ${k % 2 ? '#3a2f26' : '#ff5a1f'}`, 'stroke-width': 2 }, c);
        D.text(c, x + 35, 680, `uke ${k + 45 > 52 ? k - 7 : k + 45}`, 'cw', { 'text-anchor': 'middle', style: 'font: 400 12px var(--font-mono); fill: var(--muted)' });
        if (k % 2 === 0) sack(c, x + 35, 712, 0.28);
        cells.push(c);
      }
      return { g, head, house, ground, smoke, van, sacks, cal, cells };
    }

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const I = idea();
        tl.fromTo(I.head, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 }, 0.4);
        tl.fromTo([I.ground, I.house], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.8);
        tl.fromTo(I.van, { opacity: 0, x: -440 }, { opacity: 1, x: 0, duration: 1.6, ease: 'power2.out' }, 1.2);
        tl.fromTo(I.sacks, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2)' }, 2.9);
        tl.fromTo(I.smoke, { opacity: 0 }, { opacity: 0.8, duration: 0.6 }, 3.1);
        tl.fromTo(I.cal.firstChild, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 3.3);
        tl.fromTo(I.cells, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 }, 3.4);
        P.idea = I.g;
        return tl;
      }
      const j = i - 1; // the original steps, one later
      if (j === 0) {
        tl.to(P.idea, { opacity: 0, duration: 0.4 }, 0);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, 'Idé: ved levert på døra, som abonnement. Hvem kjøper, vil de betale, hvem gjør det i dag, og kan jeg levere?', 0.8);
        // four empty cards, the questions only
        P.cards = CHECKS.map((c, k) => {
          const x = CX[k % 2], y = CY[Math.floor(k / 2)];
          const g = D.g(svg, { 'data-unit': '' });
          D.el('rect', { x, y, width: CW, height: CH, rx: 12, style: 'fill: #1d1510; stroke: #4a3c30', 'stroke-width': 2.5, 'data-bg': '' }, g);
          D.text(g, x + 24, y + 38, `${c.n}  ${c.label}`, 'cl', { style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
          D.text(g, x + 24, y + 72, c.q, 'cq', { style: 'font: 800 24px var(--font-display); fill: var(--fg)' });
          const slot = D.el('rect', { x: x + 24, y: y + 92, width: CW - 48, height: 118, rx: 8, style: 'fill: none; stroke: #3a2f26', 'stroke-width': 2, 'stroke-dasharray': '8 6', 'data-bg': '' }, g);
          tl.fromTo(g, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, 1.2 + k * 0.15);
          return { g, slot };
        });
      }

      if (j >= 1 && j <= 4) {
        const t = answer(j - 1, tl);
        if (j === 4) P.chat.user(tl, 'Da starter vi med vinter, i én bydel.', t + 1.8);
        ctx.focus(tl, [P.cards[j - 1].g, P.chat.root], 0.1);
      }

      if (j === 5) {
        // one example at a time: the firewood cards leave before the bigger picture
        tl.to([...P.cards.map((c) => c.g), P.chat.root], { opacity: 0, duration: 0.4 }, 0);
        // the value chain, every link with AI, little capital
        const chain = D.g(svg);
        D.text(chain, 80, 268, 'VERDIKJEDEN · AI I HVERT LEDD · LITE KAPITAL', 'vl', { style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        CHAIN.forEach((name, k) => {
          const x = 80 + k * 302;
          const link = D.g(chain, { 'data-unit': '' });
          D.el('rect', { x, y: 290, width: 230, height: 90, rx: 10, style: 'fill: #1d1510; stroke: #6b5a48', 'stroke-width': 2.5, 'data-bg': '' }, link);
          D.text(link, x + 20, 328, name, 'vn', { style: 'font: 800 22px var(--font-display); fill: var(--fg)' });
          D.el('rect', { x: x + 20, y: 344, width: 44, height: 24, rx: 12, style: 'fill: #ffd23f; stroke: #1a120c', 'stroke-width': 2 }, link);
          D.text(link, x + 42, 361, 'AI', 'va', { 'text-anchor': 'middle', style: 'font: 700 14px var(--font-mono); fill: #1a120c' });
          tl.fromTo(link, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 }, 0.6 + k * 0.3);
          if (k < CHAIN.length - 1) {
            const ar = D.p(chain, `M${x + 240} 335 H${x + 292} M${x + 282} 326 L${x + 292} 335 L${x + 282} 344`, '', { style: 'fill: none; stroke: #6b5a48', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-bg': '' });
            tl.fromTo(ar, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.8 + k * 0.3);
          }
        });
        tl.fromTo(chain.firstChild, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
        // the catch: everyone else has the same tools, the market fills up
        const market = D.g(svg);
        D.text(market, 80, 452, 'KONKURRANSE', 'ml', { style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
        D.el('rect', { x: 80, y: 470, width: 920, height: 280, rx: 12, style: 'fill: #16100b; stroke: #4a3c30', 'stroke-width': 2, 'data-bg': '' }, market);
        const others = D.g(market, { 'data-bg': '' });
        for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) {
          if (c >= 12 && r <= 1) continue; // the niche stays open
          D.el('rect', { x: 110 + c * 62, y: 494 + r * 62, width: 40, height: 40, rx: 6, ...FILL('#6b5a48', 2) }, others);
        }
        tl.fromTo(market.children[0], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.4);
        tl.fromTo(market.children[1], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.4);
        tl.fromTo(others.children, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', transformBox: 'fill-box' }, { opacity: 1, scale: 1, duration: 0.2, stagger: { each: 0.02, from: 'random' } }, 2.6);
        // opening 1: the niche
        const niche = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 840, y: 480, width: 146, height: 128, rx: 10, style: 'fill: none; stroke: var(--accent)', 'stroke-width': 3, 'stroke-dasharray': '10 7', 'data-bg': '' }, niche);
        D.el('rect', { x: 893, y: 515, width: 40, height: 40, rx: 6, ...FILL('#ff5a1f', 2) }, niche);
        D.text(niche, 1000, 452, 'NISJE', 'nl', { 'text-anchor': 'end', style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: var(--accent)' });
        tl.fromTo(niche, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 4.0);
        // opening 2: reach very many customers
        const reach = D.g(svg);
        D.text(reach, 1060, 452, 'MANGE KUNDER', 'rl', { style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: var(--accent)' });
        const fan = D.g(reach, { 'data-bg': '' });
        const dots = D.g(reach, { 'data-bg': '' });
        for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
          const cx = 1290 + c * 46, cy = 490 + r * 48;
          D.p(fan, `M1140 610 L${cx} ${cy}`, '', { style: 'fill: none; stroke: #6b5a48', 'stroke-width': 2 });
          D.el('circle', { cx, cy, r: 9, ...FILL('#cfc3b2', 2) }, dots);
        }
        const you = D.el('rect', { x: 1080, y: 584, width: 52, height: 52, rx: 8, ...FILL('#ff5a1f', 2.5), 'data-unit': '' }, reach);
        tl.fromTo([reach.firstChild, you], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 4.8);
        tl.fromTo(fan, { opacity: 0 }, { opacity: 0.8, duration: 0.6 }, 5.1);
        tl.fromTo(dots.children, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', transformBox: 'fill-box' }, { opacity: 1, scale: 1, duration: 0.25, stagger: 0.02 }, 5.2);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
