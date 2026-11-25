import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { paperCard } from '../engine/props.js';

/*
  The speaker's own projects, live, one at a time. The browser window holds the real site
  (interactive on the TV). app.atladeus.com refuses framing (frame-ancestors 'none'), so it
  gets a big button that opens it in a new tab.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    card       x 80–540, y 300–520 (what it is)
    link       x 80–540, y 560–610
    window     x 600–1480, y 150–670 (16:9 content 840×472 at x 620, y 190)
*/

const SITES = [
  { url: 'home.atladeus.com', rows: ['Plantegning inn,', '3D-hjem ut. Gå rundt', 'i det i førsteperson.'] },
  { url: 'wish.atladeus.com', rows: ['Ønskeliste for jul:', 'dine ønsker og gavene', 'du planlegger.'] },
  { url: 'app.atladeus.com', noFrame: true, rows: ['Bygg hjemmet i 3D.', 'Styr de ekte enhetene', 'inni modellen.'] },
];
const WX = 600, WY = 150, WW = 880, WH = 520;
const IX = 620, IY = 190, IW = 840, IH = 472;

export default {
  id: 'projects',
  title: 'Prosjektene',
  steps: 3,
  notes: [
    'home.atladeus.com: plantegning til 3D. Klikk rundt.',
    'wish.atladeus.com: ønskelista.',
    'app.atladeus.com: smarthjem i 3D.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    const u = (v) => `calc(var(--u)*${v / 16})`;
    el.innerHTML = `
      <div class="pin-tl label">Sideprosjekter</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Bygget med <em>AI</em>,<br>på kveldstid.</h2>
      <iframe class="pj-site" style="position:absolute;left:${u(IX)};top:${u(IY)};width:${u(IW)};height:${u(IH)};border:0;opacity:0;background:#16100b"></iframe>
      <a class="pj-big" target="_blank" rel="noopener" style="position:absolute;left:${u(IX + IW / 2 - 200)};top:${u(IY + IH / 2 - 40)};width:${u(400)};height:${u(80)};display:flex;align-items:center;justify-content:center;border-radius:${u(40)};background:var(--accent);font:700 ${u(24)} var(--font-mono);color:#1a120c;text-decoration:none;opacity:0;pointer-events:none">Åpne app.atladeus.com ↗</a>
      <a class="pj-link" target="_blank" rel="noopener" style="position:absolute;left:${u(80)};top:${u(560)};font:700 ${u(20)} var(--font-mono);color:var(--accent-2);text-decoration:none;opacity:0">Åpne i ny fane ↗</a>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    const frame = ctx.$('.pj-site');
    const link = ctx.$('.pj-link');
    const big = ctx.$('.pj-big');
    // DOM layers sit above the drawing so the drawn window frames them
    [frame, link, big].forEach((n) => el.appendChild(n));
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; gsap.set([frame, link, big], { opacity: 0, pointerEvents: 'none' }); gsap.set([frame, link], { pointerEvents: 'auto' }); };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      const site = SITES[i];
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const win = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: WX, y: WY, width: WW, height: WH, rx: 12, style: 'fill: #2a1f17; stroke: var(--fg)', 'stroke-width': 2.5, 'data-bg': '' }, win);
        [0, 1, 2].forEach((k) => D.el('circle', { cx: WX + 24 + k * 22, cy: WY + 20, r: 7, style: `fill: ${['#ff6f9c', '#ffd23f', '#8fe3a2'][k]}` }, win));
        D.el('rect', { x: WX + 110, y: WY + 7, width: 420, height: 26, rx: 13, style: 'fill: #16100b', 'data-bg': '' }, win);
        P.url = D.text(win, WX + 128, WY + 26, '', 'url', { style: 'font: 400 15px var(--font-mono); fill: var(--muted)' });
        tl.fromTo(win, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.3);
      }
      // swap to this site
      if (P.card) tl.to(P.card, { opacity: 0, x: -20, duration: 0.3 }, 0);
      tl.to(frame, { opacity: 0, duration: 0.25 }, 0);
      tl.call(() => {
        P.url.textContent = site.url;
        // a site that refuses to be framed gets a big button instead
        if (site.noFrame) frame.removeAttribute('src'); else frame.setAttribute('src', `https://${site.url}`);
        link.setAttribute('href', `https://${site.url}`);
      }, null, 0.3);
      tl.to(frame, { opacity: site.noFrame ? 0 : 1, duration: 0.5 }, 0.6);
      tl.to(big, { opacity: site.noFrame ? 1 : 0, pointerEvents: site.noFrame ? 'auto' : 'none', duration: 0.3 }, 0.6);
      tl.to(link, { opacity: 1, duration: 0.3 }, 0.6);
      const card = paperCard(svg, 80, 300, 460, site.url.toUpperCase(), site.rows, { size: 22, lineGap: 14 });
      tl.fromTo(card, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, 0.4);
      P.card = card;
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { frame.removeAttribute('src'); } };
  },
};
