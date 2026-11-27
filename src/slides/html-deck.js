import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { paperCard, FILL } from '../engine/props.js';
import { relaySend } from '../engine/relay.js';
import { discoBall, discoBeams, discoSpots, djTable } from '../engine/disco.js';

/*
  Meta: this presentation is a web page, built with Claude Code.
    0. A classic slide tries what this deck did: the 3D house is a flat picture, the live
       site is a missing plugin, the 80 % bar will not move.
    1. Pull back: this deck, live, in a browser window (an iframe of itself). The room lights up:
       every joined phone goes full-screen colour and pulses in sync, a wave in join order.
    2. Its source scrolls past: it is text, so the AI can write and change all of it.
    3. The other side, on a card: it takes some imagination, and others can't edit it as easily.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    window     x 600–1480, y 150–670 (16:9 content 840×472 at x 620, y 190)
    disco      x 90–530, y 262–770 (step 1 only): mirror ball (cx 310, cy 400, r 78) on a string
               from y 262, light spots drifting over y 280–520, DJ table x 95–525, y 575–761
    code       x 80–540, y 300–760 (step 2)
    card       x 80–540, y 300–600 (step 3, replaces code)
*/

const WX = 600, WY = 150, WW = 880, WH = 520;
const IX = 620, IY = 190, IW = 840, IH = 472;

export default {
  id: 'html-deck',
  title: 'En nettside',
  steps: 4,
  notes: [
    'Et vanlig lysbilde prøver det denne har gjort.',
    'Denne presentasjonen er en nettside. Her er den, inni seg selv. Og telefonene deres lyser nå.',
    'Og den er tekst. Claude Code skriver og endrer alt.',
    'Ulempene: alt må bygges, PowerPoint-folk kan ikke redigere, og den trenger GPU.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    const u = (v) => `calc(var(--u)*${v / 16})`;
    el.innerHTML = `
      <div class="pin-tl label">Formatet</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Presentasjonen<br>er en <em>nettside</em>.</h2>
      <iframe class="hd-self" style="position:absolute;left:${u(IX)};top:${u(IY)};width:${u(IW)};height:${u(IH)};border:0;opacity:0;pointer-events:none;background:#16100b"></iframe>
      <pre class="hd-code" style="position:absolute;left:${u(96)};top:${u(316)};width:${u(430)};height:${u(430)};margin:0;overflow:hidden;font:400 ${u(15)}/1.5 var(--font-mono);color:#cfc3b2;opacity:0;white-space:pre"></pre>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    const frame = ctx.$('.hd-self');
    const code = ctx.$('.hd-code');
    // DOM layers sit above the drawing so the drawn window frames them
    [frame, code].forEach((n) => el.appendChild(n));
    let P = {};
    // ?raw returns a JS module exporting the file as a string
    const src = fetch('/src/slides/goal.js?raw').then((r) => r.text()).then((t) => {
      try { return JSON.parse(t.slice(t.indexOf('"'), t.lastIndexOf('"') + 1)); } catch { return t; }
    }).catch(() => '');

    // the party runs off one tick; it only moves while it is on the page
    let party = null;
    ctx.tick(() => { if (!party) return; const t = performance.now() / 1000; party.forEach((x) => x.update(t)); });
    const reset = () => {
      party = null;
      svg.innerHTML = ''; P = {};
      gsap.killTweensOf(code);
      gsap.set([frame, code], { opacity: 0 });
      code.textContent = ''; code.scrollTop = 0;
    };

    function ppt(g) {
      const s = D.g(g);
      const bg = D.g(s, { 'data-bg': '' });
      D.el('rect', { x: IX, y: IY, width: IW, height: IH, style: 'fill: #ffffff; stroke: #b9b9b9', 'stroke-width': 2 }, bg);
      D.el('rect', { x: IX, y: IY, width: IW, height: 10, style: 'fill: #2b579a' }, bg);
      D.text(s, IX + 50, IY + 80, 'Agenda', 'pt', { style: 'font: 700 46px Calibri, Arial, sans-serif; fill: #1f1f1f' });
      const rows = ['3D-modell av huset', 'Live demo: home.atladeus.com', 'Fremdrift på spillet'];
      rows.forEach((r, k) => D.text(s, IX + 60, IY + 150 + k * 54, `•  ${r}`, 'pb', { style: 'font: 400 28px Calibri, Arial, sans-serif; fill: #333333' }));
      // 3D house: a flat picture with a file name
      const pic = D.g(s, { 'data-unit': '' });
      D.el('rect', { x: IX + 560, y: IY + 120, width: 230, height: 150, style: 'fill: #e9eef5; stroke: #9aa7b8', 'stroke-width': 2 }, pic);
      D.p(pic, `M${IX + 610} ${IY + 240} V${IY + 190} L${IX + 675} ${IY + 150} L${IX + 740} ${IY + 190} V${IY + 240} Z`, '', { style: 'fill: #c9d3e0; stroke: #6b7a8f', 'stroke-width': 2 });
      D.text(pic, IX + 675, IY + 262, 'hus_3d_FINAL_v7.png', 'pf', { 'text-anchor': 'middle', style: 'font: 400 14px Arial, sans-serif; fill: #6b7a8f' });
      // live site: missing plugin
      const plug = D.g(s, { 'data-unit': '' });
      D.el('rect', { x: IX + 560, y: IY + 290, width: 230, height: 90, style: 'fill: #f2f2f2; stroke: #bdbdbd', 'stroke-width': 2 }, plug);
      D.p(plug, `M${IX + 600} ${IY + 320} h26 v-10 h12 v10 h10 v26 h-48 Z`, '', { style: 'fill: #bdbdbd; stroke: #8a8a8a', 'stroke-width': 2 });
      D.text(plug, IX + 670, IY + 342, 'Programtillegg', 'pp1', { style: 'font: 400 15px Arial, sans-serif; fill: #6b6b6b' });
      D.text(plug, IX + 670, IY + 362, 'mangler', 'pp2', { style: 'font: 400 15px Arial, sans-serif; fill: #6b6b6b' });
      // the bar that can't move
      const bar = D.g(s, { 'data-unit': '' });
      D.el('rect', { x: IX + 60, y: IY + 380, width: 400, height: 26, style: 'fill: #e6e6e6; stroke: #9a9a9a', 'stroke-width': 1.5 }, bar);
      D.el('rect', { x: IX + 61, y: IY + 381, width: 318, height: 24, style: 'fill: #4472c4' }, bar);
      D.text(bar, IX + 476, IY + 402, '80 %', 'pc', { style: 'font: 400 22px Calibri, Arial, sans-serif; fill: #333333' });
      return { s, pic, plug, bar };
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.ppt = ppt(svg);
        tl.fromTo(P.ppt.s, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.3);
        // the picture tries to turn: it is a picture
        tl.to(P.ppt.pic, { scaleX: 0.15, transformOrigin: '50% 50%', duration: 0.5, ease: 'power2.in', yoyo: true, repeat: 1 }, 1.2);
        tl.to(P.ppt.plug, { x: 4, duration: 0.05, yoyo: true, repeat: 7 }, 2.6);
        tl.to(P.ppt.bar, { x: 6, duration: 0.06, yoyo: true, repeat: 5 }, 3.4);
      }

      if (i === 1) {
        // pull back: the deck itself, in a browser
        const win = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: WX, y: WY, width: WW, height: WH, rx: 12, style: 'fill: #2a1f17; stroke: var(--deco)', 'stroke-width': 2.5, 'data-bg': '' }, win);
        [0, 1, 2].forEach((k) => D.el('circle', { cx: WX + 24 + k * 22, cy: WY + 20, r: 7, style: `fill: ${['#ff6f9c', '#ffd23f', '#8fe3a2'][k]}` }, win));
        D.el('rect', { x: WX + 110, y: WY + 7, width: 420, height: 26, rx: 13, style: 'fill: #16100b', 'data-bg': '' }, win);
        D.text(win, WX + 128, WY + 26, 'localhost:5180', 'url', { style: 'font: 400 15px var(--font-mono); fill: var(--muted)' });
        svg.insertBefore(win, svg.firstChild);
        tl.to(P.ppt.s, { scale: 0.2, transformOrigin: '50% 50%', opacity: 0, duration: 0.6, ease: 'power2.in' }, 0);
        tl.fromTo(win, { opacity: 0, scale: 1.15, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 0.65); // after the old slide has gone
        tl.call(() => { if (!frame.getAttribute('src')) frame.setAttribute('src', '/?view=preview#/full-scope/5'); }, null, 0.3);
        tl.to(frame, { opacity: 1, duration: 0.6 }, 1.1);
        // so is every phone in the room: they light up together (live only, never on replays)
        const live = !instant && !ctx.deck?.instant;
        tl.call(() => relaySend({ type: 'light', mode: 'wave', delay: 1200, dur: 14000 }, live), null, 1.2);
        P.win = win;
        // the party in the free column: the ball pops in on its string, the table rises, the light starts
        const disco = D.g(svg);
        const beams = discoBeams(disco, 310, 400, { x: 80, y: 262, w: 460, h: 310 });
        const spots = discoSpots(disco, 90, 280, 440, 240);
        const ball = discoBall(disco, 310, 400, 78, { top: 262 });
        const table = djTable(disco, 95, 575, 430);
        party = [beams, spots, ball, table];
        P.disco = disco;
        tl.fromTo([beams.g, spots.g], { opacity: 0 }, { opacity: 1, duration: 1 }, 1.9);
        tl.fromTo(ball.g, { opacity: 0, scale: 0.4, svgOrigin: '310 400' }, { opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(1.8)' }, 1.3);
        tl.fromTo(table.g, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 1.5);
      }

      if (i === 2) {
        relaySend({ type: 'light-off' }, !instant && !ctx.deck?.instant);
        // the party makes room for the code
        if (P.disco) { const d = P.disco; tl.to(d, { opacity: 0, duration: 0.4, onComplete: () => { d.remove(); party = null; } }, 0); }
        // it is text
        tl.call(() => { src.then((t) => { code.textContent = t; code.scrollTop = 0; }); }, null, 0);
        const box = D.g(svg, { 'data-bg': '' });
        D.el('rect', { x: 80, y: 300, width: 460, height: 460, rx: 10, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 2.5 }, box);
        D.text(box, 100, 292, 'src/slides/goal.js', 'cf', { style: 'font: 700 15px var(--font-mono); fill: var(--accent-2)' });
        tl.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0);
        tl.to(code, { opacity: 1, duration: 0.4 }, 0.2);
        if (!instant) tl.to(code, { scrollTop: 2400, duration: 6, ease: 'none' }, 0.6);
        P.codeBox = box;
      }

      if (i === 3) {
        // the other side
        tl.to(code, { opacity: 0, duration: 0.3 }, 0);
        tl.to(P.codeBox, { opacity: 0, duration: 0.3 }, 0);
        const card = paperCard(svg, 80, 300, 460, 'ULEMPER', ['Krever litt fantasi', 'Kan ikke redigeres like', 'lett av andre'], { size: 22, lineGap: 16 });
        tl.fromTo(card, { opacity: 0, y: 20, rotation: -2, transformOrigin: '50% 0%' }, { opacity: 1, y: 0, rotation: 0, duration: 0.5 }, 0.3);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { frame.removeAttribute('src'); relaySend({ type: 'light-off' }); } };
  },
};
