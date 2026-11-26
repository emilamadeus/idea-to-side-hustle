import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, tokenMeter, FILL } from '../engine/props.js';

/*
  Tip: plan the whole batch first, build after. Example: the firewood subscription from the
  idea stage. Step 0 asks for what a founder would, in that order: ordering, a subscription
  every 14 days, pause in January, one district at a time; each breaks what is built.
    0. Attempt 1: one task at a time. Each new task needs something under an earlier one,
       so the stack comes apart and is rebuilt. Twice.
    1. Attempt 2 (new session): the whole product spec goes in with the prompt (goal, users,
       all six features, requirements, what is left out), "kun planlegging" in auto mode. The
       spec opens: what has to work, in your words and your order. The AI asks what it needs
       (pause? per delivery?), then decides the build order itself: numbers on the sections. The one product decision comes
       to you as a question.
    2. The whole set is built in one pass.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782
    attempt    x 560–960, y 120–154
    site       x 600–1480, y 170–760 (stack base y 740)
    step 1     spec document x 600–1460, y 190–530: spec fields x 624–900, "Må fungere" x 940–1436
               (six sections in your order, 2×3, y 246–502; the AI's order badges on their right)
*/

const BASE = 740, BW = 220, BH = 64, BX = 1040 - BW / 2;
// the firewood subscription from the idea stage
const COLORS = { Bestilling: '#c4562a', Varsler: '#9a4a22', Kunder: '#55603a', Abonnement: '#2f5b5a', Bydeler: '#7e2f45', Pause: '#3c4a5c' };
const FINAL = ['Bydeler', 'Kunder', 'Abonnement', 'Pause', 'Bestilling', 'Varsler']; // the AI's build order
// what has to work, as you write it down (your order, not the build order)
const WRITTEN = ['Bestilling', 'Abonnement', 'Pause', 'Varsler', 'Kunder', 'Bydeler'];
// the product spec handed over before any work starts
const SPEC = [
  ['MÅL', 'Ved på døra, uten å bære'],
  ['BRUKERE', 'Folk i byen med peis'],
  ['FUNKSJONER', 'Alle seks, i sammenheng'],
  ['KRAV', 'Vipps, SMS før levering'],
  ['IKKE NÅ', 'Sommersalg'],
];
// the spec as a tiny document, for the attachment chip
function specChip(g, x, y, w, h) {
  D.el('rect', { x, y, width: w, height: h, rx: 6, style: 'fill: #fff3e3; stroke: #1a120c', 'stroke-width': 2 }, g);
  D.text(g, x + 10, y + 18, 'SPEC', 'sc', { style: 'font: 700 11px var(--font-mono); letter-spacing: .12em; fill: #1a120c' });
  D.p(g, [0, 1, 2, 3].map((k) => `M${x + 10} ${y + 30 + k * 9} h${[70, 52, 64, 40][k]}`).join(' '), '', { style: 'fill: none; stroke: #b9a88f', 'stroke-width': 3, 'stroke-linecap': 'round' });
}

export default {
  id: 'planning',
  title: 'Planlegg først',
  steps: 3,
  notes: [
    'Én forespørsel om gangen, slik en gründer tenker dem: bestilling, abonnement, pause, én bydel. Hver river opp det som er bygget.',
    'Ny session i auto mode. Du gir specen: mål, brukere, krav, hva som ikke er med, og alt som må fungere. Rekkefølgen er AI-ens jobb. Den spør om det den trenger, så legger den planen.',
    'Så bygges alt i én runde.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Planlegging</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Planlegg alt<br>før du <em>bygger</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };
    const block = (g, name) => {
      const b = D.g(g, { 'data-unit': '' });
      D.el('rect', { x: 0, y: 0, width: BW, height: BH, rx: 4, ...FILL(COLORS[name], 2.5) }, b);
      D.text(b, BW / 2, BH / 2 + 8, name, 'bk', { 'text-anchor': 'middle', style: 'font: 800 24px var(--font-display); fill: #fff3e3' });
      return b;
    };
    const at = (k) => ({ x: BX, y: BASE - (k + 1) * BH });
    // place blocks in order (bottom first), animated
    // rebuild bottom-up, one block at a time: rise to its level beside the stack, then slide in
    const stack = (tl, blocks, t) => blocks.forEach((b, k) => {
      const s0 = t + k * 0.5;
      tl.to(b, { y: at(k).y, rotation: 0, duration: 0.22, ease: 'power2.out' }, s0);
      tl.to(b, { x: at(k).x, duration: 0.24, ease: 'power2.inOut' }, s0 + 0.22);
    });
    const drop = (tl, b, k, t) => {
      gsap.set(b, { x: at(k).x, y: 120, opacity: 0 });
      tl.to(b, { opacity: 1, duration: 0.1 }, t);
      tl.to(b, { y: at(k).y, duration: 0.5, ease: 'bounce.out' }, t);
    };
    // pull a stack apart: blocks scatter to the floor on both sides
    // take the stack apart from the top: each block slides off sideways, then drops onto a pile
    const scatter = (tl, blocks, t) => {
      const piles = [0, 0];
      blocks.forEach((b, k) => {
        const side = k % 2, n = piles[side]++;
        const s0 = t + k * 0.3;
        tl.to(b, { x: side ? 1250 : 640, duration: 0.25, ease: 'power2.out' }, s0);
        tl.to(b, { y: BASE - BH * (n + 1), duration: 0.3, ease: 'bounce.out' }, s0 + 0.25);
      });
    };

    const play = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'FORSØK 1 · ÉN OM GANGEN', 0.3);
        P.tok = tokenMeter(svg, 1180, 140, 280, { max: 40 });
        tl.fromTo(P.tok.grp, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.ground = D.p(svg, `M600 ${BASE} H1480`, 'thin');
        P.site = D.g(svg);
        const b = {};
        ['Bestilling', 'Abonnement', 'Pause', 'Bydeler'].forEach((n) => { b[n] = block(P.site, n); gsap.set(b[n], { opacity: 0 }); });
        const c = P.chat;
        // the requests a founder actually makes, in the order they think of them; each one
        // breaks what is built, for a reason anyone can see
        c.user(tl, 'Lag bestilling av ved.', 0.8);
        let t = c.think(tl, 1.3, 0.8);
        c.reply(tl, 'Ferdig.', t);
        drop(tl, b.Bestilling, 0, t);
        P.tok.set(tl, 5, t);
        c.user(tl, 'Gjør det til abonnement, hver 14. dag.', t + 0.6);
        t = c.think(tl, t + 1.0, 0.8);
        c.reply(tl, 'Bestillingen må skrives om: den kan bare én levering.', t);
        scatter(tl, [b.Bestilling], t + 0.3);
        P.tok.set(tl, 14, t + 0.3, 1.2);
        drop(tl, b.Abonnement, 0, t + 1.0);
        stack(tl, [b.Abonnement, b.Bestilling], t + 1.6);
        c.user(tl, 'Kunden skal kunne pause i januar.', t + 3.0);
        t = c.think(tl, t + 3.4, 0.8);
        c.reply(tl, 'Abonnementet må skrives om: det har ingen pause.', t);
        scatter(tl, [b.Bestilling, b.Abonnement], t + 0.3);
        P.tok.set(tl, 26, t + 0.3, 1.2);
        drop(tl, b.Pause, 0, t + 1.0);
        stack(tl, [b.Pause, b.Abonnement, b.Bestilling], t + 1.6);
        c.user(tl, 'Lever én bydel om gangen.', t + 3.3);
        t = c.think(tl, t + 3.7, 0.8);
        c.reply(tl, 'Bestilling og abonnement må skrives om: ingen av dem vet hvor kunden bor.', t);
        scatter(tl, [b.Bestilling, b.Abonnement, b.Pause], t + 0.3);
        P.tok.set(tl, 38, t + 0.3, 1.4);
        drop(tl, b.Bydeler, 0, t + 1.0);
        stack(tl, [b.Bydeler, b.Pause, b.Abonnement, b.Bestilling], t + 1.6);
      }

      if (i === 1) {
        // attempt 2: a new session that only plans
        P.att.show(tl, 'FORSØK 2 · NY SESSION', 0);
        P.tok.reset(tl, 0.1);
        tl.to(P.site, { opacity: 0, y: 30, duration: 0.4 }, 0);
        P.chat.clear(tl, 0.1);
        const mode = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 920, y: 120, width: 150, height: 34, rx: 17, style: 'fill: none; stroke: #8fe3a2', 'stroke-width': 2.5 }, mode);
        D.text(mode, 995, 143, 'auto mode', 'md', { 'text-anchor': 'middle', style: 'font: 700 17px var(--font-mono); fill: #8fe3a2' });
        tl.fromTo(mode, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
        // the whole product goes in first, as a spec, before any work
        const msg = P.chat.user(tl, ['Her er hele produktet.', 'Kun planlegging. Spør', 'meg bare om produktvalg.'], 0.6, { attach: specChip });
        const doc = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 600, y: 190, width: 860, height: 340, rx: 6, style: 'fill: #fff3e3; stroke: #1a120c', 'stroke-width': 2.5, 'data-bg': '' }, doc);
        // what has to work, written by you: the second column of the spec (no order)
        D.p(doc, 'M916 214 V506', '', { style: 'fill: none; stroke: #d8c8b2', 'stroke-width': 2, 'data-bg': '' });
        D.text(doc, 940, 228, 'MÅ FUNGERE', 'ph', { style: 'font: 700 16px var(--font-mono); letter-spacing: .14em; fill: #1a120c' });
        D.text(doc, 624, 228, 'PRODUKTSPEC', 'dt', { style: 'font: 700 16px var(--font-mono); letter-spacing: .14em; fill: #1a120c' });
        SPEC.forEach(([k, v], j) => {
          D.text(doc, 624, 272 + j * 54, k, 'dk', { style: 'font: 700 13px var(--font-mono); letter-spacing: .12em; fill: #8a6a4a' });
          D.text(doc, 624, 294 + j * 54, v, 'dv', { style: 'font: 700 19px var(--font-display); fill: #1a120c' });
        });
        P.wall = D.g(svg);
        P.sheets = WRITTEN.map((n, k) => {
          const s = D.g(P.wall, { 'data-unit': '' });
          const x = 940 + (k % 2) * 256, y = 246 + Math.floor(k / 2) * 90;
          D.el('rect', { x, y, width: 240, height: 76, rx: 6, style: 'fill: #f3e4cc; stroke: #d8c8b2', 'stroke-width': 2, 'data-bg': '' }, s);
          D.text(s, x + 20, y + 34, n, 'sn', { style: 'font: 800 22px var(--font-display); fill: #1a120c' });
          D.p(s, `M${x + 20} ${y + 56} h${110 + (k * 37) % 60}`, '', { style: 'fill: none; stroke: #b9a88f', 'stroke-width': 4, 'stroke-linecap': 'round' });
          // the build order, decided by the AI later: a number badge on the right
          const badge = D.g(s, { opacity: 0 });
          D.el('circle', { cx: x + 214, cy: y + 26, r: 14, style: 'fill: #ff5a1f' }, badge);
          D.text(badge, x + 214, y + 32, String(FINAL.indexOf(n) + 1), 'sk', { 'text-anchor': 'middle', style: 'font: 700 15px var(--font-mono); fill: #fff3e3' });
          return { s, x, y, badge, n };
        });
        const c = msg.chip;
        const zoom = D.p(svg, `M${c.x + c.w} ${c.y + 8} L600 200`, 'dash', { opacity: 0.6, 'data-bg': '' });
        tl.fromTo(doc, { opacity: 0, scale: 0.9, transformOrigin: '0% 0%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.0);
        tl.fromTo(P.sheets.map((x) => x.s), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.06 }, 1.2);
        tl.fromTo(zoom, { opacity: 0 }, { opacity: 0.6, duration: 0.4 }, 1.1);
        // the AI asks what it needs to know before it plans
        let t = P.chat.think(tl, 1.8, 1.2);
        P.tok.set(tl, 6, t, 1.0);
        P.chat.reply(tl, 'Skal kundene kunne pause abonnementet?', t);
        P.chat.user(tl, 'Ja.', t + 1.0);
        P.chat.reply(tl, 'Betaler de per levering eller per måned?', t + 1.8);
        P.chat.user(tl, 'Per levering.', t + 2.8);
        // ready: it decides the build order itself
        t = P.chat.think(tl, t + 3.4, 1.0);
        P.chat.reply(tl, 'Da har jeg det jeg trenger.', t);
        P.tok.set(tl, 9, t, 0.6);
        [...P.sheets].sort((p, q) => FINAL.indexOf(p.n) - FINAL.indexOf(q.n)).forEach((sh, k) => {
          tl.fromTo(sh.badge, { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, t + 0.4 + k * 0.3);
        });
        P.doc = doc; P.zoom = zoom;
        ctx.focus(tl, [doc, zoom, P.wall, P.chat.root, P.att.g], 0.6);
      }

      if (i === 2) {
        // built in one pass, in the planned order
        tl.to(P.zoom, { opacity: 0, duration: 0.2 }, 0);
        const b = FINAL.map((n) => block(svg, n));
        // the plan comes off the wall, then the whole set is built bottom-up in one pass
        tl.to([P.doc, ...P.sheets.map((sh) => sh.s)], { opacity: 0, duration: 0.4 }, 0.1);
        b.forEach((blk, k) => drop(tl, blk, k, 0.6 + k * 0.4));
        P.chat.reply(tl, 'Ferdig.', 3.2);
        P.tok.set(tl, 17, 0.2, 1.6);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
