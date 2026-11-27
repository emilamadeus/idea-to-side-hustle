import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone, attempt, tokenMeter, FILL } from '../engine/props.js';
import { onRelay, relaySend } from '../engine/relay.js';

/*
  Where it fails: confident wrong answers, and patching symptoms instead of the cause.
  Illustrative story, the firewood subscription: customers in Grünerløkka get the
  "veden kommer i morgen" SMS two days early. The route plan (left) is right; the SMS (right) is not.
    0. Spot the bug: the two panels, no hint. Every phone gets the same four cards and taps the one
       that is wrong; the first finders and their times fill the board (x 1060–1480, y 560–760).
       Left: the question (x 80–540, y 300–440). With no phones the board stays empty.
    1. The bug: Grünerløkka is delivered Thursday, its SMS goes out Tuesday.
    2. Patch 1: resend the SMS. Still Tuesday. FIKSET!
    3. Patch 2: rebuild the SMS queue. Still Tuesday. FIKSET! (bigger)
    4. Patch 3: send every SMS a day later. Grünerløkka right, Frogner now wrong. FIKSET!!
    5. New session, asked for the cause: postcode 0552 sits under Frogner in bydeler.json.
       One line. The stamps fall off; both districts match.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–782
    attempt    x 560–1000, y 120–154
    route plan x 600–1020, y 190–520 (truth)     SMS x 1060–1480, y 190–520
    stamps     x 1080–1460, y 560–760 (a deliberate pile) · mapping table x 600–1480, y 560–760 (step 4)
*/

const ROOMS = [{ label: 'Frogner', dx: 0 }, { label: 'Grünerløkka', dx: 210 }];
const OK = '#8fe3a2', BAD = '#ff6f9c';

export default {
  id: 'fails',
  title: 'Der den feiler',
  steps: 6,
  notes: [
    'Finn feilen selv. Telefonen: én SMS kommer på feil dag. Trykk på den.',
    'Grünerløkka får veden torsdag, men SMS-en kommer tirsdag.',
    'Lapp 1: send SMS-ene på nytt. Fikset. Ikke fikset.',
    'Lapp 2: bygg SMS-køen på nytt. Fikset. Ikke fikset.',
    'Lapp 3: send alt én dag senere. Grünerløkka stemmer. Nå er Frogner feil. Fikset.',
    'Ny session: finn årsaken. Et postnummer under feil bydel. Én linje. Alle lappene ut.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Kvalitet</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Lapper fikser<br>ikke <em>årsaken</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };
    let hunting = false;
    const endHunt = () => { if (hunting) { hunting = false; relaySend({ type: 'bug-end' }); } };
    const offRelay = onRelay((m) => {
      if (m.type !== 'bug-found' || !P.board || !hunting) return;
      const k = P.board.rows.length;
      if (k >= 5) { P.board.more.textContent = `+ ${m.rank - 5} til`; return; }
      const y = 640 + k * 26;
      const row = D.g(P.board.g);
      D.text(row, 1084, y, `${m.rank}.`, 'br', { style: 'font: 700 18px var(--font-mono); fill: var(--accent-2)' });
      D.text(row, 1124, y, m.p?.name || 'Gjest', 'bn', { style: 'font: 800 19px var(--font-display); fill: var(--fg)' });
      D.text(row, 1456, y, `${(m.ms / 1000).toFixed(1).replace('.', ',')} s`, 'bt', { 'text-anchor': 'end', style: 'font: 700 18px var(--font-mono); fill: var(--muted)' });
      gsap.fromTo(row, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35 });
      P.board.rows.push(row);
      P.board.empty.style.opacity = 0;
    });

    // a day card: what the route plan says, or what the SMS says; set(day, ok)
    function day(g, x, label, d, ok = true) {
      const c = D.g(g, { 'data-bg': '' });
      D.el('rect', { x: x - 75, y: 300, width: 150, height: 104, rx: 10, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 2 }, c);
      D.text(c, x, 330, label, 'dl', { 'text-anchor': 'middle', style: 'font: 700 14px var(--font-mono); letter-spacing: .12em; fill: var(--muted)' });
      const t = D.text(c, x, 378, d, 'dd', { 'text-anchor': 'middle', style: `font: 800 28px var(--font-display); fill: ${ok ? 'var(--fg)' : BAD}` });
      c.set = (tl, v, good, at) => tl.call(() => {
        t.textContent = v;
        t.setAttribute('style', `font: 800 28px var(--font-display); fill: ${good ? 'var(--fg)' : BAD}`);
      }, null, at);
      return c;
    }
    function panel(g, x, label, model) {
      const p = D.g(g, { 'data-unit': '' });
      D.el('rect', { x, y: 190, width: 420, height: 330, rx: 10, style: `fill: #241a13; stroke: var(--deco)`, 'stroke-width': 2.5, 'data-bg': '' }, p);
      D.text(p, x + 20, 222, label, 'pl', { style: `font: 700 16px var(--font-mono); letter-spacing: .14em; fill: var(--muted)` });
      ROOMS.forEach((r) => {
        D.el('rect', { x: x + 20 + r.dx, y: 250, width: 190, height: 250, rx: 4, style: `fill: none; stroke: var(--deco)`, 'stroke-width': 2, 'data-bg': '' }, p);
        D.text(p, x + 115 + r.dx, 486, r.label, 'rm', { 'text-anchor': 'middle', style: 'font: 700 20px var(--font-mono); fill: var(--fg)' });
      });
      return p;
    }
    const stampAt = (k, size) => {
      // the stamps pile up on purpose
      const g = D.g(svg, { 'data-bg': '' });
      D.stamp(g, 1240 + (k - 1) * 40, [560, 642, 730][k - 1], k === 3 ? 'FIKSET!!' : 'FIKSET!', { size, rotate: [-3, 2, -2][k - 1] });
      return g;
    };

    // the panels and day cards, shared by the hunt and the story
    const panels = (tl, at, hint = true) => {
      P.real = panel(svg, 600, 'RUTEPLANEN', false);
      P.app = panel(svg, 1060, 'SMS-ENE', true);
      P.days = {
        real: ROOMS.map((r, k) => day(svg, 715 + r.dx, 'LEVERES', ['Onsdag', 'Torsdag'][k])),
        app: ROOMS.map((r, k) => day(svg, 1175 + r.dx, 'SMS', 'Tirsdag', !hint || k === 0)),
      };
      tl.fromTo([P.real, P.app, ...P.days.real, ...P.days.app], { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
    };
    const play = (i, instant) => {
      if (i > 0) {
        if (i === 1) endHunt();
        return playOld(i - 1, instant);
      }
      // step 0: the room hunts the bug
      const tl = gsap.timeline();
      const live = !instant && !ctx.deck?.instant;
      stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
      stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
      tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
      panels(tl, 0.5, false);   // no hint: the wrong card is not marked while the room hunts
      // the SMS says "the firewood comes tomorrow": one of them is on the wrong day
      P.ask = D.g(svg, { 'data-unit': '' });
      D.text(P.ask, 80, 330, 'FINN FEILEN', 'aq', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--accent)' });
      D.text(P.ask, 80, 380, 'Én SMS kommer', 'a1', { style: 'font: 800 36px var(--font-display); fill: var(--fg)' });
      D.text(P.ask, 80, 422, 'på feil dag.', 'a2', { style: 'font: 800 36px var(--font-display); fill: var(--fg)' });
      D.text(P.ask, 80, 470, 'SMS-en: «Veden kommer i morgen.»', 'a3', { style: 'font: 600 19px var(--font-display); fill: var(--muted)' });
      tl.fromTo(P.ask, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 0.3);
      // who found it, and how fast
      const g = D.g(svg, { 'data-unit': '' });
      D.el('rect', { x: 1060, y: 560, width: 420, height: 200, rx: 10, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 2.5, 'data-bg': '' }, g);
      D.text(g, 1084, 598, 'FUNNET AV', 'bh', { style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      const empty = D.text(g, 1084, 650, 'Ingen ennå', 'be', { style: 'font: 600 18px var(--font-display); fill: var(--muted)' });
      const more = D.text(g, 1456, 598, '', 'bm', { 'text-anchor': 'end', style: 'font: 700 15px var(--font-mono); fill: var(--muted)' });
      P.board = { g, rows: [], empty, more };
      tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.8);
      if (live) { hunting = true; tl.call(() => relaySend({ type: 'bug-start' }), null, 0.9); }
      return tl;
    };

    const playOld = (i, instant) => {
      const tl = gsap.timeline();
      if (i === 0) {
        // the hunt's question and board make way for the chat and the patches
        tl.to([P.ask, P.board?.g].filter(Boolean), { opacity: 0, duration: 0.4 }, 0);
        tl.call(() => { P.ask?.remove(); P.board?.g.remove(); }, null, 0.45);
        P.att = attempt(svg, 560, 120);
        P.att.show(tl, 'FORSØK 1 · SAMME SESSION', 0.3);
        P.tok = tokenMeter(svg, 1180, 140, 280, { max: 60 });
        tl.fromTo(P.tok.grp, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        P.tok.set(tl, 8, 1.8);
        P.chat = chatPhone(svg, 80, 262, 440, 520, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        if (!P.real) panels(tl, 0.5);
        else P.days.app[1].set(tl, 'Tirsdag', false, 1.4);   // the answer, with the ring
        // the mismatch
        P.ring = D.g(svg, { 'data-bg': '' });
        D.p(P.ring, D.roughEllipse(1385, 352, 96, 70), 'pencil');
        tl.fromTo(P.ring, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.4);
        P.chat.user(tl, 'Kunder på Grünerløkka får SMS-en to dager før veden kommer.', 1.8);
      }

      const patch = (reply, at) => {
        // (i here is the story's own step: 1–3 are the patches)
        const t = P.chat.think(tl, at, 1.0);
        P.chat.reply(tl, reply, t);
        P.tok.set(tl, { 1: 21, 2: 36, 3: 54 }[i], at, t - at + 0.4);
        return t;
      };
      if (i === 1) {
        const t = patch('Fikset! Sender SMS-ene på nytt.', 0.1);
        // resent: the card blinks, the day stays
        tl.to(P.days.app[1], { opacity: 0.2, duration: 0.15, yoyo: true, repeat: 3 }, t);
        P.s1 = stampAt(1, 32);
        ctx.focus(tl, [P.chat.root, P.app, ...P.days.app, P.ring, P.s1, P.tok.grp], t);
        tl.add(D.slam(P.s1), t + 0.6);
        P.chat.user(tl, 'Fortsatt feil dag.', t + 1.6);
      }

      if (i === 2) {
        const t = patch('Fikset! Bygger SMS-køen på nytt.', 0.1);
        tl.to(P.app, { opacity: 0.2, duration: 0.15, yoyo: true, repeat: 3 }, t);
        tl.to(P.days.app, { opacity: 0.2, duration: 0.15, yoyo: true, repeat: 3 }, t);
        P.s2 = stampAt(2, 42);
        ctx.focus(tl, [P.chat.root, P.app, ...P.days.app, P.ring, P.s1, P.s2, P.tok.grp], t);
        tl.add(D.slam(P.s2), t + 0.8);
        P.chat.user(tl, 'Fortsatt feil dag.', t + 1.8);
      }

      if (i === 3) {
        // a day later for everyone: Grünerløkka is right, Frogner now gets it on delivery day
        const t = patch('Fikset! SMS-en sendes én dag senere.', 0.1);
        P.days.app[0].set(tl, 'Onsdag', false, t + 0.3);
        P.days.app[1].set(tl, 'Onsdag', true, t + 0.3);
        tl.to(P.ring, { opacity: 0, duration: 0.25 }, t + 0.6);
        tl.set(P.ring, { x: -210 }, t + 0.85);
        tl.to(P.ring, { opacity: 1, duration: 0.25 }, t + 0.9);
        P.s3 = stampAt(3, 54);
        ctx.focus(tl, [P.chat.root, P.app, ...P.days.app, P.ring, P.s1, P.s2, P.s3, P.tok.grp], t);
        tl.add(D.slam(P.s3), t + 1.2);
      }

      if (i === 4) {
        // attempt 2: a new session asked for the cause
        P.att.show(tl, 'FORSØK 2 · NY SESSION', 0);
        P.tok.reset(tl, 0.1);
        P.chat.clear(tl, 0.1);
        P.chat.user(tl, 'Finn årsaken. Ikke lapp symptomet.', 0.5);
        const t = P.chat.think(tl, 1.1, 1.4);
        P.chat.reply(tl, 'Postnummer 0552 ligger under Frogner i bydeler.json. Én linje.', t);
        P.tok.set(tl, 7, 1.1, t - 1.1);
        // the mapping
        const map = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x: 600, y: 560, width: 420, height: 170, rx: 8, style: 'fill: #fff3e3', 'data-bg': '' }, map);
        D.text(map, 620, 590, 'bydeler.json', 'mf', { style: 'font: 700 15px var(--font-mono); fill: #7a5a3a' });
        const rows = [['"0260":', '"Frogner"'], ['"0552":', '"Frogner"']];
        const vals = rows.map(([k, v], n) => {
          D.text(map, 620, 640 + n * 50, k, 'mk', { style: 'font: 700 22px var(--font-mono); fill: #1a120c' });
          return D.text(map, 760, 640 + n * 50, v, 'mv', { style: `font: 700 22px var(--font-mono); fill: ${n ? '#c4405e' : '#1a120c'}` });
        });
        tl.fromTo(map, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, t + 0.2);
        // the one line: 0552 belongs to Grünerløkka
        tl.to(vals[1], { opacity: 0, duration: 0.25 }, t + 1.0);
        tl.call(() => { vals[1].textContent = '"Grünerløkka"'; vals[1].setAttribute('style', 'font: 700 22px var(--font-mono); fill: #1f9d63'); }, null, t + 1.25);
        tl.to(vals[1], { opacity: 1, duration: 0.25 }, t + 1.3);
        // every patch comes off; both rooms match
        tl.to([P.s3, P.s2, P.s1], { y: 400, rotation: 20, opacity: 0, duration: 0.6, ease: 'power2.in', stagger: 0.12 }, t + 1.7);
        tl.to(P.ring, { opacity: 0, duration: 0.3 }, t + 1.7);
        P.days.app[0].set(tl, 'Tirsdag', true, t + 2.2);
        ctx.focus(tl, [P.chat.root, map, P.real, P.app, ...P.days.real, ...P.days.app, P.tok.grp], t);
      }
      return tl;
    };

    const s = D.stepper(ctx, { reset, play });
    return { ...s, dispose() { offRelay(); endHunt(); } };
  },
};
