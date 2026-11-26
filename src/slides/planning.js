import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, tokenMeter, FILL } from '../engine/props.js';

/*
  Tip: plan the whole batch first, build after.
    0. Attempt 1: one task at a time. Each new task needs something under an earlier one,
       so the stack comes apart and is rebuilt. Twice.
    1. Attempt 2 (new session): the whole product spec goes in with the prompt (goal, users,
       all six features, requirements, what is left out), "kun planlegging" in auto mode. The
       spec opens beside the wall; six sheets go up from it. One is a product decision: it
       comes to you as a question.
    2. The whole set is built in one pass.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782
    attempt    x 560–960, y 120–154
    site       x 600–1480, y 170–760 (stack base y 740)
    step 1     spec document x 600–900, y 190–530; sheets 2×3, x 950–1460, y 190–530
*/

const BASE = 740, BW = 220, BH = 64, BX = 1040 - BW / 2;
const COLORS = { Innlogging: '#c4562a', Varsler: '#9a4a22', Roller: '#55603a', Kamera: '#2f5b5a', Deling: '#7e2f45', Logg: '#3c4a5c' };
const FINAL = ['Roller', 'Innlogging', 'Deling', 'Kamera', 'Varsler', 'Logg'];
// the product spec handed over before any work starts
const SPEC = [
  ['MÅL', 'Se hjemmet fra appen'],
  ['BRUKERE', 'Eier, familie, gjest'],
  ['FUNKSJONER', 'Alle seks, i sammenheng'],
  ['KRAV', 'Personvern, varsel ved feil'],
  ['IKKE NÅ', 'Opptak i skyen'],
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
    'Én oppgave om gangen: hver ny oppgave må under en gammel. Rives og bygges på nytt.',
    'Ny økt i auto mode. Hele produktspecen går inn først: mål, brukere, alle funksjoner, krav, hva som ikke er med. «Kun planlegging.» Bare produktbeslutninger kommer til deg.',
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
        ['Innlogging', 'Varsler', 'Roller', 'Deling'].forEach((n) => { b[n] = block(P.site, n); gsap.set(b[n], { opacity: 0 }); });
        const c = P.chat;
        // 1. login, 2. notifications: fine so far
        c.user(tl, 'Lag innlogging.', 0.8);
        let t = c.think(tl, 1.3, 0.8);
        c.reply(tl, 'Ferdig.', t);
        drop(tl, b.Innlogging, 0, t);
        P.tok.set(tl, 5, t);
        c.user(tl, 'Lag varsler.', t + 0.6);
        t = c.think(tl, t + 1.0, 0.8);
        c.reply(tl, 'Ferdig.', t);
        drop(tl, b.Varsler, 1, t);
        P.tok.set(tl, 10, t);
        // 3. roles: must go under login; the stack comes apart
        c.user(tl, 'Lag roller.', t + 0.6);
        t = c.think(tl, t + 1.0, 0.8);
        c.reply(tl, 'Innloggingen må skrives om først.', t);
        scatter(tl, [b.Varsler, b.Innlogging], t + 0.3);
        P.tok.set(tl, 22, t + 0.3, 1.4);
        drop(tl, b.Roller, 0, t + 1.0);
        stack(tl, [b.Roller, b.Innlogging, b.Varsler], t + 1.6);
        // 4. sharing: under roles this time
        c.user(tl, 'Lag deling.', t + 3.3);
        t = c.think(tl, t + 3.7, 0.8);
        c.reply(tl, 'Rollene må skrives om først.', t);
        scatter(tl, [b.Varsler, b.Innlogging, b.Roller], t + 0.3);
        P.tok.set(tl, 38, t + 0.3, 1.4);
        drop(tl, b.Deling, 0, t + 1.0);
        stack(tl, [b.Deling, b.Roller, b.Innlogging, b.Varsler], t + 1.6);
      }

      if (i === 1) {
        // attempt 2: a new session that only plans
        P.att.show(tl, 'FORSØK 2 · NY ØKT', 0);
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
        D.el('rect', { x: 600, y: 190, width: 300, height: 340, rx: 6, style: 'fill: #fff3e3; stroke: #1a120c', 'stroke-width': 2.5, 'data-bg': '' }, doc);
        D.text(doc, 624, 228, 'PRODUKTSPEC', 'dt', { style: 'font: 700 16px var(--font-mono); letter-spacing: .14em; fill: #1a120c' });
        SPEC.forEach(([k, v], j) => {
          D.text(doc, 624, 272 + j * 54, k, 'dk', { style: 'font: 700 13px var(--font-mono); letter-spacing: .12em; fill: #8a6a4a' });
          D.text(doc, 624, 294 + j * 54, v, 'dv', { style: 'font: 700 19px var(--font-display); fill: #1a120c' });
        });
        const c = msg.chip;
        const zoom = D.p(svg, `M${c.x + c.w} ${c.y + 8} L600 200`, 'dash', { opacity: 0.6, 'data-bg': '' });
        tl.fromTo(doc, { opacity: 0, scale: 0.9, transformOrigin: '0% 0%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 1.0);
        tl.fromTo(zoom, { opacity: 0 }, { opacity: 0.6, duration: 0.4 }, 1.1);
        const t = P.chat.think(tl, 1.8, 1.2);
        P.tok.set(tl, 8, t, 1.2);
        // the plan: one sheet per feature, from the spec
        P.wall = D.g(svg);
        P.sheets = FINAL.map((n, k) => {
          const s = D.g(P.wall, { 'data-unit': '' });
          const x = 950 + (k % 2) * 260, y = 190 + Math.floor(k / 2) * 120;
          D.el('rect', { x, y, width: 240, height: 100, rx: 3, style: 'fill: #fff3e3', 'data-bg': '' }, s);
          D.el('circle', { cx: x + 120, cy: y + 10, r: 7, style: 'fill: #ff5a1f' }, s);
          D.text(s, x + 18, y + 46, n, 'sn', { style: 'font: 800 24px var(--font-display); fill: #1a120c' });
          D.p(s, `M${x + 18} ${y + 70} h${120 + (k * 37) % 60} M${x + 18} ${y + 86} h${80 + (k * 23) % 50}`, '', { style: 'fill: none; stroke: #b9a88f', 'stroke-width': 4, 'stroke-linecap': 'round' });
          tl.fromTo(s, { opacity: 0, y: -20, rotation: -4 + k * 2, transformOrigin: '50% 0%' }, { opacity: 1, y: 0, rotation: 0, duration: 0.35, ease: 'back.out(2)' }, t + k * 0.25);
          return { s, x, y };
        });
        // one sheet is a product decision: it comes to you
        const pd = P.sheets[2];
        const flag = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: pd.x + 120, y: pd.y + 26, width: 104, height: 24, rx: 3, style: 'fill: #ffd23f' }, flag);
        D.text(flag, pd.x + 172, pd.y + 43, 'PRODUKT', 'pf', { 'text-anchor': 'middle', style: 'font: 700 13px var(--font-mono); letter-spacing: .1em; fill: #1a120c' });
        tl.fromTo(flag, { opacity: 0, scale: 1.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, t + 1.8);
        P.chat.reply(tl, 'Skal gjester kunne se kameraene?', t + 2.3);
        P.chat.user(tl, 'Nei.', t + 3.4);
        P.flag = flag; P.doc = doc; P.zoom = zoom;
        ctx.focus(tl, [doc, zoom, P.wall, flag, P.chat.root, P.att.g], 0.6);
      }

      if (i === 2) {
        // built in one pass, in the planned order
        tl.to([P.flag, P.zoom], { opacity: 0, duration: 0.2 }, 0);
        const b = FINAL.map((n) => block(svg, n));
        // the plan comes off the wall, then the whole set is built bottom-up in one pass
        tl.to(P.sheets.map((sh) => sh.s), { opacity: 0, y: -10, duration: 0.3, stagger: 0.05 }, 0.1);
        b.forEach((blk, k) => drop(tl, blk, k, 0.6 + k * 0.4));
        P.chat.reply(tl, 'Ferdig. Alle seks.', 3.2);
        P.tok.set(tl, 17, 0.2, 1.6);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
