import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, paperCard, FILL } from '../engine/props.js';

/*
  Tip: let the AI follow what another team ships. A station with a departure board.
    0. Board of backend features, all BLOKKERT AV GATEWAY. You ask Claude to keep watch.
    1. Build 410 arrives: privacy mode and snapshots unload; two rows flip to KAN BYGGES.
    2. Build 411 arrives with nothing for cameras and rolls straight through. Nothing flips.
    3. Build 412: recordings unload; motion still blocked.
  Meanwhile your pile of unread changelogs grows.
    4. The design asks for exclusion zones. Asked first, the AI reads the gateway source:
       there are none, only a privacy mask. Nobody builds against something that doesn't exist.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–560
    changelogs x 110–470, y 600–770
    board      x 600–1480, y 150–400
    track      x 560–1480, y 440–690 (clipped to this band); step 4: design card x 620–1060, stamp x 1080–1400
*/

const FEATS = ['Privacy mode i appen', 'Snapshots i appen', 'Opptak i appen', 'Bevegelsesvarsler'];
const BUILDS = {
  1: { n: 410, cargo: [0, 1], reply: '410: privacy mode og snapshots er klare. Kan bygges nå.' },
  2: { n: 411, cargo: [], reply: '411: ingenting for kamera. Hopp over den.' },
  3: { n: 412, cargo: [2], reply: '412: opptak er klart. Bevegelse mangler fortsatt.' },
};
const RAIL = 650;

export default {
  id: 'gateway',
  title: 'Følg gateway-teamet',
  steps: 5,
  notes: [
    'Gateway-teamet leverer nye builds hele tiden. Hva kan vi bygge i backend nå?',
    'Build 410: to ting låst opp.',
    '411: ingenting for kamera. Den sier hopp over.',
    '412: opptak. Bevegelse er fortsatt blokkert. Og changelogene? Uleste.',
    'Designet ville ha eksklusjonssoner. AI-en sjekket gateway-koden først: finnes ikke, bare privacy mask.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Gateway</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*2.8)">La AI-en følge med<br>på <em>upstream tjenester</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    function board(g) {
      const b = D.g(g, { 'data-unit': '' });
      D.el('rect', { x: 600, y: 150, width: 880, height: 250, rx: 10, style: 'fill: #0e0a07; stroke: var(--deco)', 'stroke-width': 2.5, 'data-bg': '' }, b);
      D.text(b, 624, 186, 'BACKEND · KAMERA', 'bh', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
      return FEATS.map((f, k) => {
        const y = 236 + k * 46;
        D.text(b, 624, y, f, 'bf', { style: 'font: 700 22px var(--font-mono); fill: var(--fg)' });
        const flap = D.g(b);
        D.el('rect', { x: 1190, y: y - 26, width: 270, height: 36, rx: 4, style: 'fill: #1d1510', 'data-bg': '' }, flap);
        const t = D.text(flap, 1325, y, 'BLOKKERT AV GATEWAY', 'bs', { 'text-anchor': 'middle', style: 'font: 700 16px var(--font-mono); fill: #ff6f9c' });
        return { flap, t, y };
      });
    }
    const flip = (tl, row, at) => {
      tl.to(row.flap, { scaleY: 0, transformOrigin: '50% 50%', duration: 0.12, ease: 'power1.in' }, at);
      tl.call(() => { row.t.textContent = 'KAN BYGGES'; row.t.setAttribute('style', 'font: 700 18px var(--font-mono); fill: #8fe3a2'); }, null, at + 0.12);
      tl.to(row.flap, { scaleY: 1, duration: 0.12, ease: 'power1.out' }, at + 0.12);
    };
    function train(g, n, cargo) {
      const t = D.g(g);
      D.el('rect', { x: 0, y: RAIL - 96, width: 170, height: 82, rx: 10, ...FILL('#c4562a') }, t);
      D.el('rect', { x: 110, y: RAIL - 130, width: 50, height: 40, rx: 4, ...FILL('#9a4a22') }, t);
      D.text(t, 60, RAIL - 46, String(n), 'tn', { 'text-anchor': 'middle', style: 'font: 800 34px var(--font-display); fill: #fff3e3' });
      const crates = [];
      [0, 1].forEach((w) => {
        const wx = 190 + w * 190;
        D.el('rect', { x: wx, y: RAIL - 54, width: 170, height: 40, rx: 4, ...FILL('#4b4f57') }, t);
        const c = cargo[w];
        if (c !== undefined) {
          const cr = D.g(t, { 'data-unit': '' });
          D.el('rect', { x: wx + 10, y: RAIL - 106, width: 150, height: 52, rx: 4, ...FILL('#ffd23f') }, cr);
          D.text(cr, wx + 85, RAIL - 74, FEATS[c].split(' ')[0], 'cr', { 'text-anchor': 'middle', style: 'font: 700 17px var(--font-mono); fill: #1a120c' });
          crates.push({ cr, feat: c });
        }
      });
      for (let k = 0; k < 6; k++) D.el('circle', { cx: 30 + k * 76, cy: RAIL - 8, r: 14, ...FILL('#1a120c') }, t);
      return { t, crates };
    }
    function changelog(g, k) {
      const c = D.g(g, { 'data-bg': '' });
      const x = 130 + (k % 2) * 24, y = 750 - k * 34;
      D.el('rect', { x, y: y - 60, width: 300, height: 60, rx: 3, transform: `rotate(${(k % 3) - 1.5} ${x + 150} ${y - 30})`, style: 'fill: #fff3e3; stroke: #b9a88f', 'stroke-width': 2 }, c);
      D.p(c, `M${x + 20} ${y - 40} h150 M${x + 20} ${y - 22} h210`, '', { style: 'fill: none; stroke: #b9a88f', 'stroke-width': 4 });
      return c;
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.rows = board(svg);
        tl.fromTo(svg.lastChild, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3);
        // the track, clipped to its band
        const cp = D.el('clipPath', { id: 'gw-clip' }, svg);
        D.el('rect', { x: 560, y: 430, width: 920, height: 270 }, cp);
        const rails = D.g(svg, { 'data-bg': '' });
        D.p(rails, `M560 ${RAIL} H1480 M560 ${RAIL + 10} H1480`, '', { style: 'fill: none; stroke: #8b8f96', 'stroke-width': 4 });
        for (let x = 570; x < 1480; x += 40) D.p(rails, `M${x} ${RAIL + 4} v18`, '', { style: 'fill: none; stroke: #4a3c30', 'stroke-width': 6 });
        P.tracks = D.g(svg, { 'clip-path': 'url(#gw-clip)' });
        tl.fromTo(rails, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        P.chat = chatPhone(svg, 80, 262, 440, 300, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.5);
        P.chat.user(tl, 'Følg med på gateway-buildene. Si fra hva vi kan bygge.', 0.9);
        const t = P.chat.think(tl, 1.6, 1.0);
        P.chat.reply(tl, 'Ok.', t);
        P.logs = D.g(svg);
        P.nlogs = 0;
      }

      if (BUILDS[i]) {
        const b = BUILDS[i];
        const tr = train(P.tracks, b.n, b.cargo);
        const empty = !b.cargo.length;
        gsap.set(tr.t, { x: 1500 });
        tl.to(tr.t, { x: 720, duration: 1.2, ease: empty ? 'none' : 'power2.out' }, 0);
        // a changelog lands on your pile every time
        const c = changelog(P.logs, P.nlogs++);
        tl.fromTo(c, { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.4, ease: 'bounce.out' }, 0.4);
        let t = 1.2;
        if (empty) {
          tl.to(tr.t, { x: -700, duration: 1.4, ease: 'none' }, 1.2);
          tl.set(tr.t, { opacity: 0 }, 2.6);
          t = 1.6;
        } else {
          tr.crates.forEach((c2, k) => {
            const row = P.rows[c2.feat];
            // the crate leaves the (clipped) train as a twin that can fly up to the board
            const cx = 720 + 190 + k * 190 + 85, cy = RAIL - 80;
            const tw = c2.cr.cloneNode(true);
            tw.setAttribute('data-bg', '');
            svg.appendChild(tw);
            gsap.set(tw, { x: 720, opacity: 0 });
            tl.set(c2.cr, { opacity: 0 }, 1.4 + k * 0.3);
            tl.set(tw, { opacity: 1 }, 1.4 + k * 0.3);
            tl.to(tw, { x: 720 + 1325 - cx, y: row.y - 10 - cy, scale: 0.3, transformOrigin: '50% 50%', duration: 0.6, ease: 'power2.in' }, 1.4 + k * 0.3);
            tl.to(tw, { opacity: 0, duration: 0.15 }, 1.95 + k * 0.3);
            flip(tl, row, 2.0 + k * 0.3);
          });
          tl.to(tr.t, { x: -700, duration: 1.4, ease: 'power2.in' }, 2.6);
          tl.set(tr.t, { opacity: 0 }, 4.0);
          t = 2.4;
        }
        P.chat.reply(tl, b.reply, t);
        // focus: the arriving build, the board and the answer; the changelog pile joins on the last one
        ctx.focus(tl, [P.rows[0].flap.parentNode, P.tracks, P.chat.root, svg.lastChild, i === 3 ? P.logs : null], 0);
      }
      if (i === 4) {
        // the design asks for something the gateway doesn't have; checked before anyone builds it
        const card = paperCard(svg, 620, 450, 440, 'DESIGN · KAMERA', ['Privacy mode', 'Opptak', 'Eksklusjonssoner'], { size: 22, lineGap: 14 });
        tl.fromTo(card, { opacity: 0, y: 30, rotation: -2, transformOrigin: '50% 0%' }, { opacity: 1, y: 0, rotation: 0, duration: 0.5 }, 0.2);
        P.chat.user(tl, 'Designet vil ha eksklusjonssoner. Kan vi bygge det?', 0.8);
        const t = P.chat.think(tl, 1.5, 1.5);
        P.chat.reply(tl, 'Nei. Gateway-koden har bare privacy mask, ingen soner.', t);
        const strike = D.p(svg, 'M636 576 L900 572', 'pencil', { 'data-bg': '' });
        tl.add(D.drawOn(strike, { duration: 0.4 }), t + 0.6);
        const st = D.stamp(D.g(svg, { 'data-unit': '' }), 1230, 575, 'FINNES IKKE', { size: 34, rotate: -5 });
        tl.add(D.slam(st), t + 1.0);
        ctx.focus(tl, [card, strike, st.parentNode, P.chat.root], 0.2);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
