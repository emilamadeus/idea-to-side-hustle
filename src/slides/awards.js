import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { relaySend, relayState } from '../engine/relay.js';

/*
  The evening's awards, from what the room did on its phones tonight (the vote's chops, the
  orders on go-live, who joined first). Nothing is staged: an award nobody earned stays empty.
    0. Five cards lie face down, each with its award's name.
    1. The relay works out the winners; the cards turn one by one. The winners' phones light up gold.

  Layout zones (svg units):
    tip     x 80–540, y 110–240
    cards   x 80–1520, y 300–640 (five cards 264 wide, 30 apart)
*/

const AWARDS = [
  ['Først inne', 'Først til å bli med'],
  ['Første kunde', 'Første bestilling'],
  ['Lengst unna', 'Lengst fra lageret'],
  ['Mest ved', 'Flest sekker'],
  ['Raskeste øks', 'Flest hogg i utslagsrunden'],
];
const CX = 80, CY = 300, CW = 264, CH = 340, GAP = 30;

export default {
  id: 'awards',
  room: true, // the room takes part from their phones (a badge in the zoom-out)
  title: 'Kveldens priser',
  steps: 2,
  notes: [
    'Prisene kommer fra det salen faktisk gjorde i kveld.',
    'Kortene snus. Vinnerne får det på telefonen.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    const u = (v) => `calc(var(--u)*${v / 16})`;
    el.innerHTML = `
      <div class="pin-tl label">Salen</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Kveldens <em>priser</em>.</h2>
      <div class="aw-row"></div>`;
    const tip = ctx.$('.tip');
    const row = ctx.$('.aw-row');
    const medal = (fill) => `<svg viewBox="0 0 96 96" style="width:${u(84)};height:${u(84)}"><path d="M34 6h28l-6 30H40z" fill="${fill ? '#ff5a1f' : 'none'}" stroke="${fill ? '#1a120c' : 'var(--deco)'}" stroke-width="4" stroke-linejoin="round"/><circle cx="48" cy="58" r="30" fill="${fill ? '#ffd23f' : 'none'}" stroke="${fill ? '#1a120c' : 'var(--deco)'}" stroke-width="4"/>${fill ? '<path d="M48 44l4 9 10 1-7.5 6.5 2.5 9.5-9-5-9 5 2.5-9.5L34 54l10-1z" fill="#fff3c0" stroke="#1a120c" stroke-width="2.5" stroke-linejoin="round"/>' : '<text x="48" y="70" text-anchor="middle" style="font:800 34px var(--font-display);fill:var(--deco)">?</text>'}</svg>`;
    const cards = AWARDS.map(([title, what], k) => {
      const c = document.createElement('div');
      c.dataset.unit = '';
      c.style.cssText = `position:absolute;left:${u(CX + k * (CW + GAP))};top:${u(CY)};width:${u(CW)};height:${u(CH)};box-sizing:border-box;border-radius:${u(14)};
        border:2.5px solid var(--deco);background:#1d1510;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u(10)};padding:${u(18)};text-align:center;opacity:0`;
      row.append(c);
      c.face = (a) => {
        if (a === undefined) { // face down
          c.style.borderColor = 'var(--deco)'; c.style.boxShadow = 'none';
          c.innerHTML = `${medal(false)}<div style="font:700 ${u(17)} var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--accent-2)">${title}</div><div style="font:600 ${u(16)}/1.3 var(--font-display);color:var(--muted)">${what}</div>`;
          return;
        }
        if (!a) { // nobody earned it
          c.innerHTML = `${medal(false)}<div style="font:700 ${u(17)} var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">${title}</div><div style="font:800 ${u(28)} var(--font-display);color:var(--muted)">Ingen</div>`;
          return;
        }
        const size = Math.min(44, Math.floor(400 / Math.max(6, a.name.length)));
        c.style.borderColor = '#ffd23f'; c.style.boxShadow = `0 0 ${u(40)} ${u(-6)} rgba(255,210,63,.55)`;
        c.innerHTML = `${medal(true)}<div style="font:700 ${u(17)} var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--accent-2)">${title}</div><div style="font:800 ${u(size)}/1 var(--font-display);color:var(--fg);letter-spacing:-.02em;overflow-wrap:anywhere">${a.name}</div><div style="font:700 ${u(15)}/1.3 var(--font-mono);color:var(--muted)">${a.detail || ''}</div>`;
      };
      c.face();
      return c;
    });
    const winner = (k) => {
      const list = relayState.awards;
      if (!list) return null;
      return list.find((a) => a.title === AWARDS[k][0]) || null;
    };

    const reset = () => { cards.forEach((c) => { gsap.killTweensOf(c); gsap.set(c, { opacity: 0, scaleX: 1, y: 0 }); c.face(); }); };
    const play = (i, instant) => {
      const tl = gsap.timeline();
      const live = !instant && !ctx.deck?.instant;
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        cards.forEach((c, k) => tl.fromTo(c, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.4 + k * 0.12));
      }
      if (i === 1) {
        if (live) relayState.awards = null;
        tl.call(() => relaySend({ type: 'awards' }, live), null, 0);
        // each card turns: shrink to an edge, change face, open again
        cards.forEach((c, k) => {
          const at = 0.9 + k * 1.1;
          tl.to(c, { scaleX: 0, duration: 0.22, ease: 'power2.in' }, at);
          tl.call(() => c.face(winner(k)), null, at + 0.22);
          tl.to(c, { scaleX: 1, duration: 0.3, ease: 'back.out(2)' }, at + 0.22);
        });
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
