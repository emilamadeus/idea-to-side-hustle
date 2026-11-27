import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { chatPhone } from '../engine/props.js';
import QRCode from 'qrcode';
import { LANDINGS } from '../engine/landings.js';
import { relaySend, onRelay, relayState } from '../engine/relay.js';

const SITE = import.meta.env.VITE_VED_SITE || 'https://ved.atladeus.com';
const KEYS = ['skog', 'nordisk', 'rask', 'peis'];
const ACC = { skog: '#a8d08d', nordisk: '#d2693a', rask: '#ffd23f', peis: '#ff7a2f' };
// the vote row: four cards at 0.32 (269 × 151), centred; piles under each
const S = 0.32, CARDW = 840 * S, GAP = 22, ROW0 = (1600 - (4 * CARDW + 3 * GAP)) / 2;
const ROWX = (k) => ROW0 + k * (CARDW + GAP), ROWY = 280, PILE_Y = 572, COUNT_Y = 612;

/*
  Tip: build several throwaway versions and pick one, instead of debating one.
  The example is the firewood subscription's landing page, and the room picks it for real.
    0. Asked for four real proposals for the site.
    1. They flip past one at a time: Skog, Nordisk enkel, Rask levering, Varm peis.
    2. The room votes on their phones (ved.atladeus.com). Or press S: no vote, all four go straight
       into a 15-second sudden death (it finishes on its own; the next click moves on). Each vote is a log that arcs up from the
       bottom edge onto a woodpile under its design; the leader glows and grows a little.
    3. Closed. A tie becomes a 15-second sudden death: phones chop, chips fly onto the piles, a
       countdown runs. Then three go in the bin and the winner is stamped VALGT. No votes (or no
       relay): Varm peis, as before. The winner becomes the real site's look.

  Layout zones (svg units):
    tip        x 80–540, y 110–240
    chat       x 80–520, y 262–560 (gone in step 2) · QR x 1336–1486, y 104–254, text to its left (step 2)
    card       x 620–1460, y 160–632 (one direction at a time); label y 680
    vote row   cards x 225–1375, y 280–431, names y 446; piles grow up from y 582; counts y 612
    countdown  centred, x 660–940, y 140–250 (sudden death)
    bin        x 1360–1460, y 600–760
*/

// four landing pages for the firewood subscription; the last one is picked
const DIRS = [
  { name: 'Skog', bg: '#17241a', fg: '#eef3e6', acc: '#8fbf6a', font: "800 64px 'Inter Tight', var(--font-display)", deco: 'trees' },
  { name: 'Nordisk enkel', bg: '#f1ebe0', fg: '#1a120c', acc: '#c4562a', font: '700 56px var(--font-display)', deco: 'logs' },
  { name: 'Rask levering', bg: '#ffd23f', fg: '#1a120c', acc: '#1a120c', font: '800 64px var(--font-display)', deco: 'truck' },
  { name: 'Varm peis', bg: '#22120a', fg: '#fff3e3', acc: '#ff7a2f', font: '800 64px var(--font-display)', deco: 'fire' },
];
const CW = 840, CH = 472;

export default {
  id: 'prototypes',
  title: 'Prototyper',
  steps: 4,
  notes: [
    'Fire ekte forslag til nettsiden for ved-abonnementet, i stedet for et møte om ett.',
    'Skog, Nordisk enkel, Rask levering, Varm peis.',
    'Nå velger dere. Stem på telefonen: den som vinner, blir den ekte siden. (S: rett til utslagsrunde for alle fire.)',
    'Stengt. Uavgjort gir utslagsrunde: hogg i 15 sekunder. Så kastes resten.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Prototyper</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Lag fire.<br>Velg <em>én</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { clearTimeout(P.await); clearInterval(P.sdTimer); svg.innerHTML = ''; P = {}; };

    // a mini title slide drawn in each direction's own style (0,0 → CW×CH)
    function card(g, d) {
      const c = D.g(g, { 'data-unit': '' });
      D.el('rect', { x: 0, y: 0, width: CW, height: CH, rx: 14, style: `fill: ${d.bg}; stroke: #6b5a48`, 'stroke-width': 3, 'data-bg': '' }, c);
      // every direction drawn as a finished site (src/engine/landings.js), so the choice is real
      LANDINGS.find((l) => l.name === d.name).draw(c, 0, 0, CW, CH);
      D.el('rect', { x: 0, y: 0, width: CW, height: CH, rx: 14, style: 'fill: none; stroke: #6b5a48', 'stroke-width': 3, 'data-bg': '' }, c);
      // the direction's name, under the card
      D.text(c, 0, CH + 42, d.name.toUpperCase(), 'cn', { style: 'font: 700 22px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      return c;
    }

    // ---- the vote on the TV ----
    // a woodpile under each design: logs stack in rows (9, 8, 7 …) from y 610 up
    function pile(key, k) {
      const g = D.g(svg, { 'data-unit': '', 'data-overlap-ok': '' });
      const cx = ROWX(k) + CARDW / 2;
      const count = D.text(g, cx, COUNT_Y, '0', 'pc', { 'text-anchor': 'middle', style: 'font: 700 26px var(--font-mono); fill: var(--fg)' });
      const unit = D.text(g, cx, COUNT_Y + 24, 'STEMMER', 'pu', { 'text-anchor': 'middle', style: 'font: 700 12px var(--font-mono); letter-spacing: .18em; fill: var(--muted)' });
      const chops = D.text(g, cx, COUNT_Y + 56, '', 'ph', { 'text-anchor': 'middle', style: `font: 800 22px var(--font-display); fill: ${ACC[key]}` });
      const glow = D.el('rect', { x: ROWX(k) - 8, y: ROWY - 8, width: 840 * S + 16, height: 472 * S + 16, rx: 10, style: `fill: none; stroke: ${ACC[key]}; stroke-width: 4`, opacity: 0, 'data-bg': '' }, g); // a halo around the card
      return { g, key, k, cx, count, unit, chops, glow, logs: [], n: 0 };
    }
    // logs fill each row from the middle out, so even two votes look like a little pile
    const slot = (i) => {
      let row = 0, left = i, cap = 9;
      while (left >= cap && cap > 1) { left -= cap; row++; cap--; }
      const side = left === 0 ? 0 : (left % 2 ? 1 : -1) * Math.ceil(left / 2);
      return { dx: side * 20 + (row % 2 ? 10 : 0) * (cap % 2 ? 0 : 1), dy: -row * 17 };
    };
    function addLog(key, animate = true) {
      const p = P.piles?.find((q) => q.key === key);
      if (!p) return;
      const { dx, dy } = slot(p.n++);
      const x = p.cx + dx, y = PILE_Y + dy;
      const l = D.g(p.g);
      D.el('circle', { cx: 0, cy: 0, r: 9, style: `fill: #c9935a; stroke: #1a120c; stroke-width: 2.4` }, l);
      D.el('circle', { cx: 0, cy: 0, r: 3.4, style: 'fill: none; stroke: #8a5a34; stroke-width: 2' }, l);
      p.logs.push(l);
      p.count.textContent = p.n;
      if (!animate) { gsap.set(l, { x, y }); return; }
      // it rises from the room (the bottom edge) and arcs onto the pile, spinning, then settles
      const sx = 200 + Math.random() * 1200, s = { t: 0 }, peak = 380 + Math.random() * 90;
      const spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 360);
      gsap.set(l, { x: sx, y: 880, rotation: 0, opacity: 0 });
      gsap.to(l, { opacity: 1, duration: 0.15 });
      gsap.to(s, { t: 1, duration: 1.05, ease: 'power1.inOut', onUpdate: () => {
        const t = s.t, ex = sx + (x - sx) * t, ey = 880 + (y - 880) * t - 4 * (880 - peak) * t * (1 - t) * 0.9;
        gsap.set(l, { x: ex, y: ey, rotation: spin * t });
      }, onComplete: () => {
        gsap.fromTo(l, { scaleY: 0.7, scaleX: 1.2 }, { scaleY: 1, scaleX: 1, duration: 0.35, ease: 'elastic.out(1.2, 0.5)', transformOrigin: '50% 100%' });
        puff(x, y + 9);
        gsap.fromTo(p.count, { scale: 1.35, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
        leader();
      } });
    }
    function removeLog(key) {
      const p = P.piles?.find((q) => q.key === key);
      if (!p || !p.logs.length) return;
      const l = p.logs.pop(); p.n--; p.count.textContent = p.n;
      gsap.to(l, { y: '-=40', opacity: 0, rotation: 40, duration: 0.5, ease: 'power2.in', onComplete: () => l.remove() });
      leader();
    }
    // a small puff of wood dust where a log lands
    function puff(x, y) {
      for (let k = 0; k < 5; k++) {
        const d = D.el('circle', { cx: x, cy: y, r: 2.4, style: 'fill: #d9b27a', 'data-bg': '' }, svg);
        gsap.to(d, { attr: { cx: x + (Math.random() - 0.5) * 40, cy: y - 6 - Math.random() * 16 }, opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: () => d.remove() });
      }
    }
    // the leader glows and grows a little (ties: all of the top ones)
    function leader(animate = true) {
      if (!P.piles || P.sd) return; // in the sudden death the contenders hold their places
      const max = Math.max(...P.piles.map((p) => p.n));
      P.piles.forEach((p) => {
        const lead = max > 0 && p.n === max;
        gsap.to(p.glow, { opacity: lead ? 1 : 0, duration: animate ? 0.4 : 0 });
        gsap.to(P.cards[p.k], { scale: lead ? S * 1.06 : S, x: lead ? ROWX(p.k) - 6 : ROWX(p.k), y: lead ? ROWY - 4 : ROWY, duration: animate ? 0.5 : 0, ease: 'back.out(2)' });
      });
    }
    // the QR code beside the chat: join here
    function joinCode() {
      const g = D.g(svg, { 'data-unit': '' });
      const x = 1336, y = 104, size = 150, pad = 11; // top right, above the row
      D.el('rect', { x, y, width: size, height: size, rx: 8, style: 'fill: #fff3e3' }, g);
      const code = QRCode.create(SITE, { errorCorrectionLevel: 'M' }).modules;
      const n = code.size, m = (size - pad * 2) / n;
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (code.data[r * n + c]) d += `M${(x + pad + c * m).toFixed(2)} ${(y + pad + r * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
      D.p(g, d, '', { style: 'fill: #1a120c; stroke: none', 'shape-rendering': 'crispEdges' });
      D.text(g, x - 24, y + 70, 'Stem på telefonen', 'qj', { 'text-anchor': 'end', style: 'font: 800 32px var(--font-display); fill: var(--fg)' });
      D.text(g, x - 24, y + 104, SITE.replace(/^https?:\/\//, ''), 'qs', { 'text-anchor': 'end', style: 'font: 700 18px var(--font-mono); fill: var(--accent)' });
      return g;
    }
    // sudden death: only the contenders stay, slid to the middle; their votes stay on show and
    // the chops count up under them; a big countdown above
    function sudden(v) {
      if (P.sd) return;
      const g = D.g(svg, { 'data-unit': '' });
      D.text(g, 800, 160, 'UTSLAGSRUNDE', 'sdl', { 'text-anchor': 'middle', style: 'font: 700 18px var(--font-mono); letter-spacing: .22em; fill: var(--accent)' });
      const num = D.text(g, 800, 240, '15', 'sdn', { 'text-anchor': 'middle', style: 'font: 800 80px var(--font-display); fill: var(--fg)' });
      gsap.fromTo(g, { opacity: 0, scale: 0.8, svgOrigin: '800 200' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' });
      const offset = (v.now || Date.now()) - Date.now();
      let last = null;
      P.sdTimer = setInterval(() => {
        const left = Math.max(0, Math.ceil((v.endsAt - (Date.now() + offset)) / 1000));
        if (left !== last) { num.textContent = left; gsap.fromTo(num, { scale: 1.25, svgOrigin: '800 215' }, { scale: 1, svgOrigin: '800 215', duration: 0.4, ease: 'power3.out' }); last = left; }
        if (!left) clearInterval(P.sdTimer);
      }, 100);
      const live = P.piles.filter((p) => v.contenders.includes(p.key));
      const span = live.length * CARDW + (live.length - 1) * 60, x0 = (1600 - span) / 2;
      P.piles.forEach((p) => {
        if (!v.contenders.includes(p.key)) { gsap.to([p.g, P.cards[p.k]], { opacity: 0, duration: 0.45 }); return; }
        const to = x0 + live.indexOf(p) * (CARDW + 60), dx = to - ROWX(p.k);
        gsap.to(P.cards[p.k], { x: to, y: ROWY, scale: S, duration: 0.8, delay: 0.3, ease: 'power3.inOut' });
        gsap.to(p.g, { x: dx, duration: 0.8, delay: 0.3, ease: 'power3.inOut' });
        p.dx = dx;
        p.chops.textContent = 'HOGG 0';
        if (v.only) gsap.to([p.count, p.unit], { opacity: 0, duration: 0.3 }); // no votes in a sudden-death-only round
      });
      gsap.to(P.qr, { opacity: 0, duration: 0.4 });
      P.sd = g;
    }
    // the chops so far, from the relay's running count
    function chopCounts(v) {
      (P.piles || []).forEach((p) => { if (v.contenders?.includes(p.key)) p.chops.textContent = `HOGG ${v.chops?.[p.key] || 0}`; });
    }
    // a chop in the sudden death: a chip flies onto that pile
    function chip(key) {
      const p = P.piles?.find((q) => q.key === key);
      if (!p) return;
      const c = D.el('rect', { x: -5, y: -3, width: 10, height: 6, rx: 2, style: 'fill: #d9b27a; stroke: #1a120c; stroke-width: 1.6', 'data-bg': '' }, svg);
      const sx = 300 + Math.random() * 1000, tx = p.cx + (p.dx || 0) + (Math.random() - 0.5) * 120, ty = PILE_Y - 20 - Math.random() * 60;
      gsap.fromTo(c, { x: sx, y: 880, rotation: 0 }, { x: tx, y: ty, rotation: (Math.random() - 0.5) * 720, duration: 0.7, ease: 'power2.out', onComplete: () => gsap.to(c, { opacity: 0, duration: 0.6, delay: 0.4, onComplete: () => c.remove() }) });
    }
    // the end: three in the bin, the winner grows back and is stamped
    function finale(pick, instantly = false) {
      const tl = gsap.timeline();
      if (P.sd) tl.to(P.sd, { opacity: 0, duration: 0.3 }, 0);
      tl.to([...(P.piles || []).map((p) => p.g), P.qr].filter(Boolean), { opacity: 0, duration: 0.4 }, 0);
      const bin = D.g(svg, { 'data-bg': '' });
      D.p(bin, 'M1370 620 L1385 760 H1455 L1470 620 Z', 'ln');
      D.p(bin, 'M1360 612 H1480 M1400 612 V600 H1440 V612', 'ln');
      tl.fromTo(bin, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
      let n = 0;
      P.cards.forEach((c, k) => {
        if (k === pick) return;
        if (!instantly && gsap.getProperty(c, 'opacity') < 0.1) return; // already gone (the sudden death hid it)
        const at = 0.9 + n++ * 0.3;
        tl.to(c, { opacity: 1, duration: 0.01 }, at - 0.05);
        tl.to(c, { scale: 0.02, x: `+=${100}`, y: `+=${56}`, rotation: 20, opacity: 0, duration: 0.45, ease: 'power2.in' }, at);
        const ball = D.el('circle', { cx: 1420, cy: 560, r: 12, style: 'fill: #e7dccb; stroke: #1a120c', 'stroke-width': 2, opacity: 0, 'data-bg': '' }, svg);
        tl.to(ball, { opacity: 1, duration: 0.05 }, at + 0.35);
        tl.to(ball, { attr: { cy: 650 }, duration: 0.35, ease: 'power2.in' }, at + 0.35);
        tl.to(ball, { opacity: 0, duration: 0.1 }, at + 0.7);
      });
      tl.to(bin, { opacity: 0, duration: 0.3 }, 2.0);
      tl.to(P.cards[pick], { x: 620, y: 160, scale: 1, opacity: 1, duration: 1.0, ease: 'power2.inOut' }, 2.3);
      const st = D.stamp(D.g(svg, { 'data-unit': '', 'data-overlap-ok': '' }), 1340, 694, 'VALGT', { size: 40, rotate: -6 });
      tl.add(D.slam(st), 3.4);
      if (instantly) tl.progress(1);
      return tl;
    }
    function runFinale(key) {
      if (P.done) return;
      P.done = true;
      clearTimeout(P.await);
      const go = () => ctx.track(finale(KEYS.indexOf(key in ACC ? key : 'peis')));
      if (P.sd) { go(); return; }
      // a straight win: the counts get a moment on their own first
      (P.piles || []).forEach((p) => {
        gsap.fromTo(p.count, { scale: 1 }, { scale: 1.5, transformOrigin: '50% 50%', duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.out' });
        if (p.key === key) gsap.to(p.count, { fill: ACC[key], duration: 0.3 });
      });
      P.await = setTimeout(go, 1800);
    }
    // S on the vote step: skip the vote, straight to sudden death with all four
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== 's' && e.key !== 'S') || P.step !== 2 || P.suddenOnly) return;
      P.suddenOnly = true;
      relaySend({ type: 'sudden-start' }, !ctx.deck?.instant);
    };
    window.addEventListener('keydown', onKey);
    const offRelay = onRelay((m) => {
      if (!P.live) return;
      if (m.type === 'voted') { addLog(m.choice); if (m.prev) removeLog(m.prev); }
      if (m.type === 'chopped') chip(m.choice);
      if (m.type === 'vote-state' && m.vote.phase === 'sudden') { sudden(m.vote); chopCounts(m.vote); }
      if (m.type === 'vote-state' && m.vote.phase === 'closed' && m.vote.winner && (P.step === 3 || P.suddenOnly)) runFinale(m.vote.winner);
    });

    const play = (i, instant) => {
      P.step = i;
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        P.chat = chatPhone(svg, 80, 262, 440, 300, { app: 'Claude', size: 18 });
        tl.fromTo(P.chat.root, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.3);
        P.chat.user(tl, 'Lag fire forslag til nettsiden for ved-abonnementet. Ekte, som jeg kan klikke i.', 0.8);
        const t = P.chat.think(tl, 1.6, 1.4);
        P.chat.reply(tl, 'Fire forslag klare.', t);
        P.cards = DIRS.map((d) => { const c = card(svg, d); gsap.set(c, { x: 620, y: 160, opacity: 0 }); return c; });
      }

      if (i === 1) {
        // one at a time
        P.cards.forEach((c, k) => {
          const at = k * 1.3;
          tl.fromTo(c, { opacity: 0, x: 700, rotation: 3, transformOrigin: '50% 50%' }, { opacity: 1, x: 620, rotation: 0, duration: 0.45, ease: 'power2.out' }, at);
          if (k < P.cards.length - 1) tl.to(c, { opacity: 0, x: 560, duration: 0.3, ease: 'power2.in' }, at + 0.85); // gone before the next arrives
        });
      }

      if (i === 2) {
        // the vote: four in a row, a woodpile under each; the room votes on their phones
        P.cards.forEach((c, k) => {
          tl.set(c, { transformOrigin: '0% 0%' }, 0);
          if (k === P.cards.length - 1) tl.to(c, { x: ROWX(k), y: ROWY, scale: S, rotation: 0, opacity: 1, duration: 0.6, ease: 'power2.inOut' }, 0);
          else { tl.set(c, { x: ROWX(k), y: ROWY, scale: S, rotation: 0, opacity: 0 }, 0); tl.to(c, { opacity: 1, duration: 0.3 }, 0.6 + k * 0.1); }
        });
        tl.to(P.chat.root, { opacity: 0, x: -20, duration: 0.4 }, 0); // the chat steps out: the room has the floor
        P.piles = KEYS.map((key, k) => pile(key, k));
        P.qr = joinCode();
        tl.fromTo([...P.piles.map((p) => p.g), P.qr], { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.05 }, 0.8);
        tl.call(() => relaySend({ type: 'vote-open' }, !instant && !ctx.deck?.instant), null, 0.6);
        // votes already in (coming back to the slide): stack them without animation
        const v = relayState.vote;
        if (v?.tally && v.phase !== 'idle') KEYS.forEach((key) => { for (let n = 0; n < (v.tally[key] || 0); n++) addLog(key, false); });
        tl.call(() => leader(false), null, 1.3); // after the cards have settled into the row
        P.live = true;
      }

      if (i === 3) {
        // closed: the relay decides (or a sudden death does); without it, Varm peis
        P.live = true;
        if (P.done) return tl; // a sudden-death-only round already ended on its own
        tl.call(() => relaySend({ type: 'vote-close' }, !instant && !ctx.deck?.instant), null, 0.1);
        const v = relayState.vote;
        if (instant || ctx.deck?.instant || !relayState.connected) {
          // replays and audits: the result as it stands (or the default)
          const winner = v?.phase === 'closed' && v.winner ? v.winner : 'peis';
          tl.add(finale(KEYS.indexOf(winner), true), 0);
        } else {
          // the live result arrives as a message; a fallback if it never does
          P.await = setTimeout(() => { if (!P.done) runFinale('peis'); }, 25000);
        }
      }
      return tl;
    };

    const st = D.stepper(ctx, { reset, play });
    return { ...st, dispose() { offRelay(); window.removeEventListener('keydown', onKey); clearTimeout(P.await); clearInterval(P.sdTimer); } };
  },
};
