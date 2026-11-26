import gsap from 'gsap';
import QRCode from 'qrcode';
import * as D from '../engine/draw.js';
import { FILL } from '../engine/props.js';
import { varmPeis } from '../engine/varmpeis.js';

/*
  Lansering, the jaw drop: the firewood shop goes live for real and the room orders from it.
    0. The finished site on localhost, and a big "Gå live" button.
    1. Live: the address flips to ved.atladeus.com, the shop opens (for real, through the
       relay), the window steps aside and a big QR code appears. "Bestill ved."
    2. The map of Oslo. Every real order from the audience lands as logs on its district and
       as a card in the feed. A small QR stays in the corner for latecomers.
    3. "Kjør": the route draws itself through every district with orders and the truck drives
       it. Phones get "Bilen er på vei", then "Levert" as the truck reaches their district.

  Live data: a websocket to the relay (ved/src/worker.js) as the deck. URL and key come from
  .env.local (VITE_VED_WS, VITE_VED_KEY, VITE_VED_SITE); without them it stays offline.
  Only the audience window sends commands; preview iframes and audits only listen.
  Keys on this slide: R plays a recorded batch of orders (fallback if the network fails),
  X empties the shop (rehearsal), C closes it again.

  Layout zones (svg units):
    step 0–1  browser x 330–1270, y 150–710 · button x 640–960, y 735–795
              (step 1: browser scaled to x 80–550, y 250–530; QR card x 876–1324, y 146–594,
               "Bestill ved." y 680, address y 728)
    step 2–3  feed x 80–520, y 236–770 · map x 600–1480, y 200–760 · small QR x 1356–1480, y 590–742
*/

const WS = import.meta.env.VITE_VED_WS || 'wss://ved.atladeus.com';
const KEY = import.meta.env.VITE_VED_KEY || '';
const SITE = import.meta.env.VITE_VED_SITE || 'https://ved.atladeus.com';
const HOST = SITE.replace(/^https?:\/\//, '').replace(/\/$/, '');

// schematic Oslo: district → map position
const M = {
  'Vestre Aker': [802, 290], 'Nordre Aker': [970, 262], 'Bjerke': [1152, 327], 'Grorud': [1278, 277],
  'Stovner': [1404, 240], 'Ullern': [704, 427], 'Frogner': [858, 502], 'St. Hanshaugen': [956, 427],
  'Sagene': [1040, 352], 'Grünerløkka': [1110, 427], 'Alna': [1292, 440], 'Gamle Oslo': [1110, 527],
  'Østensjø': [1264, 565], 'Nordstrand': [1124, 640], 'Søndre Nordstrand': [1208, 702],
};
const DEPOT = [1360, 500];
const FEED_X = 80, FEED_Y = 270, FEED_H = 64, FEED_GAP = 10, FEED_MAX = 7;

export default {
  id: 'go-live',
  title: 'Gå live',
  steps: 4,
  notes: [
    'Siden er ferdig, men den ligger bare på min maskin.',
    'Live. Ta frem telefonen og bestill ved.',
    'Bestillingene kommer inn. Ekte, fra dere. (R spiller av opptak hvis nettet svikter.)',
    'Bilen kjører. Følg med på telefonen.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `<div class="pin-tl label">Lansering</div>`;
    const svg = D.stage(el);
    const control = new URLSearchParams(location.search).get('view') !== 'preview';
    let P = {};
    let step = -1;
    const orders = [];            // every order seen, live or recorded
    const drawn = new Set();      // order ids already on the map

    // ---- the relay ----
    let ws = null, wsTimer = null, live = false, closed = false;
    const send = (m) => { if (control && !ctx.deck?.instant && ws?.readyState === 1) ws.send(JSON.stringify(m)); };
    function connect() {
      if (!KEY || closed) return;
      try { ws = new WebSocket(`${WS}/api/ws?role=deck&key=${encodeURIComponent(KEY)}`); } catch { return; }
      ws.onopen = () => { live = true; status(); };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === 'snapshot') { orders.length = 0; drawn.clear(); m.orders.forEach((o) => orders.push(o)); if (step >= 2) redrawOrders(); }
        if (m.type === 'order') add(m.order);
      };
      ws.onclose = () => { live = false; status(); clearTimeout(wsTimer); if (!closed) wsTimer = setTimeout(connect, 2000); };
    }
    connect();

    // the fallback: a recorded evening of orders
    function replay() {
      const names = Object.keys(M);
      const pick = ['Grünerløkka', 'Frogner', 'Sagene', 'St. Hanshaugen', 'Gamle Oslo', 'Nordre Aker', 'Ullern', 'Grünerløkka', 'Østensjø', 'Frogner', 'Nordstrand', 'Bjerke', 'Vestre Aker', 'Grünerløkka', 'Alna', 'Sagene', 'Grorud', 'Frogner'];
      pick.forEach((b, k) => setTimeout(() => add({ id: `demo-${Date.now()}-${k}`, bydel: names.includes(b) ? b : 'Frogner', sekker: 1 + (k * 7) % 3, t: Date.now(), demo: true }), 300 + k * 420 + (k % 3) * 130));
    }
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !control) return;
      if (e.key === 'r' || e.key === 'R') replay();
      if (e.key === 'x' || e.key === 'X') { if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'reset' })); orders.length = 0; drawn.clear(); if (step >= 2) redrawOrders(); }
      if (e.key === 'c' || e.key === 'C') { if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'close' })); }
    };
    window.addEventListener('keydown', onKey);

    function add(o) {
      if (orders.some((x) => x.id === o.id)) return;
      orders.push(o);
      if (step >= 2) { stackOrder(o, true); feed(o, true); }
    }

    const reset = () => { svg.innerHTML = ''; P = {}; drawn.clear(); };

    // ---- step 0–1: the browser and the button ----
    function browser() {
      const g = D.g(svg, { 'data-unit': '' });
      D.el('rect', { x: 330, y: 150, width: 940, height: 560, rx: 16, style: 'fill: #0f0a07; stroke: var(--fg)', 'stroke-width': 3 }, g);
      D.el('rect', { x: 332, y: 152, width: 936, height: 48, rx: 14, style: 'fill: #1d1510' }, g);
      [0, 1, 2].forEach((k) => D.el('circle', { cx: 358 + k * 20, cy: 176, r: 6, style: `fill: ${['#ff6f9c', '#ffd23f', '#8fe3a2'][k]}` }, g));
      D.el('rect', { x: 470, y: 161, width: 660, height: 30, rx: 15, style: 'fill: #2a1d14' }, g);
      const lock = D.g(g, { opacity: 0 });
      D.el('rect', { x: 490, y: 175, width: 12, height: 10, rx: 2, style: 'fill: #8fe3a2' }, lock);
      D.p(lock, 'M492.5 175 v-3 a3.5 3.5 0 0 1 7 0 v3', '', { style: 'fill: none; stroke: #8fe3a2', 'stroke-width': 2 });
      const addr = D.text(g, 512, 182, 'localhost:8787', 'ad', { style: 'font: 700 16px var(--font-mono); fill: var(--muted)' });
      const page = D.g(g, { 'data-bg': '' });
      varmPeis(page, 340, 206, 920, 496, { bar: true });
      return { g, addr, lock };
    }
    function goButton() {
      // a real button: clicking it (or the clicker) takes the step
      const g = D.g(svg, { 'data-unit': '', 'data-interactive': '', style: 'cursor: pointer' });
      g.addEventListener('click', () => { if (step === 0) ctx.deck?.next(); });
      const glow = D.el('rect', { x: 630, y: 727, width: 340, height: 76, rx: 38, style: 'fill: #ff5a1f', opacity: 0.25 }, g);
      D.el('rect', { x: 640, y: 735, width: 320, height: 60, rx: 30, ...FILL('#ff5a1f', 3) }, g);
      D.text(g, 800, 775, 'Gå live', 'gl', { 'text-anchor': 'middle', style: 'font: 800 28px var(--font-display); fill: #1a120c' });
      return { g, glow };
    }
    // the QR code as one crisp path
    function qr(parent, x, y, size, pad) {
      const g = D.g(parent);
      D.el('rect', { x, y, width: size, height: size, rx: Math.max(8, size * 0.05), style: 'fill: #fff3e3' }, g);
      const code = QRCode.create(SITE, { errorCorrectionLevel: 'M' }).modules;
      const n = code.size, m = (size - pad * 2) / n;
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (code.data[r * n + c]) d += `M${(x + pad + c * m).toFixed(2)} ${(y + pad + r * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
      }
      D.p(g, d, '', { style: 'fill: #1a120c; stroke: none', 'shape-rendering': 'crispEdges' });
      return g;
    }

    // ---- step 2–3: the map, the stacks, the feed ----
    function map() {
      const g = D.g(svg);
      const bg = D.g(g, { 'data-bg': '' });
      // the fjord in the south-west
      D.p(bg, 'M600 606 C650 590 700 602 752 592 C812 580 872 598 926 636 C968 666 992 706 1006 760 L600 760 Z', '', { style: 'fill: #12262e; stroke: #2c4a55', 'stroke-width': 2.5 });
      D.text(bg, 660, 712, 'OSLOFJORDEN', 'fj', { style: 'font: 700 13px var(--font-mono); letter-spacing: .3em; fill: #3f6a78' });
      // faint roads between neighbours
      const links = [['Vestre Aker', 'Nordre Aker'], ['Nordre Aker', 'Bjerke'], ['Bjerke', 'Grorud'], ['Grorud', 'Stovner'], ['Vestre Aker', 'Ullern'], ['Ullern', 'Frogner'],
        ['Frogner', 'St. Hanshaugen'], ['St. Hanshaugen', 'Sagene'], ['Sagene', 'Nordre Aker'], ['Sagene', 'Grünerløkka'], ['Grünerløkka', 'Bjerke'], ['Grünerløkka', 'Gamle Oslo'],
        ['Gamle Oslo', 'Østensjø'], ['Østensjø', 'Alna'], ['Alna', 'Grorud'], ['Gamle Oslo', 'Nordstrand'], ['Nordstrand', 'Søndre Nordstrand'], ['Østensjø', 'Søndre Nordstrand'], ['St. Hanshaugen', 'Gamle Oslo'], ['Alna', 'Bjerke']];
      D.p(bg, links.map(([a, b]) => `M${M[a][0]} ${M[a][1]} L${M[b][0]} ${M[b][1]}`).join(' '), '', { style: 'fill: none; stroke: #3a2c22', 'stroke-width': 3, 'stroke-linecap': 'round' });
      // the depot
      D.el('rect', { x: DEPOT[0] - 22, y: DEPOT[1] - 14, width: 44, height: 28, rx: 4, ...FILL('#4a3020', 2.5) }, bg);
      D.text(g, DEPOT[0], DEPOT[1] + 40, 'LAGER', 'dp', { 'text-anchor': 'middle', style: 'font: 700 12px var(--font-mono); letter-spacing: .14em; fill: var(--muted)', 'data-unit': '' });
      const dots = {};
      for (const [name, [x, y]] of Object.entries(M)) {
        const d = D.g(g, { 'data-bg': '' });
        D.el('circle', { cx: x, cy: y, r: 7, style: 'fill: #2a1d14; stroke: #8a7666', 'stroke-width': 2.5 }, d);
        D.text(g, x, y + 28, name, 'dn', { 'text-anchor': 'middle', style: 'font: 600 14px var(--font-display); fill: #b8a48e', 'data-unit': '' });
        dots[name] = { d, stack: D.g(g, { 'data-bg': '' }), n: 0 };
      }
      return { g, dots };
    }
    // a log on a district's stack: a small pyramid that grows; past ten it glows instead
    const SLOTS = [[0, 0], [-14, 0], [14, 0], [-28, 0], [28, 0], [-7, -12], [7, -12], [-21, -12], [21, -12], [0, -24]];
    function stackOrder(o, animate) {
      if (!P.map || drawn.has(o.id)) return;
      drawn.add(o.id);
      const s = P.map.dots[o.bydel];
      if (!s) return;
      const [x, y] = M[o.bydel];
      for (let k = 0; k < o.sekker; k++) {
        const i = s.n++;
        if (i >= SLOTS.length) { gsap.to(s.d, { scale: 1.25, transformOrigin: '50% 50%', duration: 0.15, yoyo: true, repeat: 1 }); continue; }
        const [dx, dy] = SLOTS[i];
        const l = D.g(s.stack);
        D.el('circle', { cx: x + dx, cy: y - 18 + dy, r: 7, ...FILL('#c9935a', 2) }, l);
        if (animate) gsap.fromTo(l, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.45, delay: k * 0.08, ease: 'bounce.out' });
      }
      s.d.querySelector('circle').setAttribute('style', 'fill: #ff7a2f; stroke: #ffd36b');
    }
    function feed(o, animate) {
      if (!P.feed) return;
      const g = D.g(P.feed, { 'data-unit': '' });
      D.el('rect', { x: FEED_X, y: FEED_Y, width: 440, height: FEED_H, rx: 14, style: `fill: #1d1510; stroke: ${o.demo ? 'var(--deco)' : '#ff7a2f'}`, 'stroke-width': 2 }, g);
      [[FEED_X + 26, FEED_Y + 40], [FEED_X + 42, FEED_Y + 40], [FEED_X + 34, FEED_Y + 26]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 7, ...FILL('#c9935a', 1.8) }, g));
      D.text(g, FEED_X + 66, FEED_Y + 28, 'Ny bestilling', 'fb', { style: 'font: 700 17px var(--font-display); fill: var(--fg)' });
      D.text(g, FEED_X + 66, FEED_Y + 50, `${o.bydel} · ${o.sekker} ${o.sekker === 1 ? 'sekk' : 'sekker'}`, 'fd', { style: 'font: 600 15px var(--font-display); fill: #b8a48e' });
      const t = new Date(o.t || Date.now());
      D.text(g, FEED_X + 420, FEED_Y + 28, `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`, 'ft', { 'text-anchor': 'end', style: 'font: 700 13px var(--font-mono); fill: var(--muted)' });
      P.cards.unshift(g);
      // older cards step down; the oldest leaves
      P.cards.forEach((c, k) => {
        const y = k * (FEED_H + FEED_GAP);
        if (k >= FEED_MAX) { gsap.to(c, { opacity: 0, duration: 0.3, onComplete: () => c.remove() }); return; }
        if (k === 0) { if (animate) gsap.fromTo(c, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }); }
        else animate ? gsap.to(c, { y, duration: 0.35, ease: 'power2.out' }) : gsap.set(c, { y });
      });
      P.cards = P.cards.slice(0, FEED_MAX);
    }
    function redrawOrders() {
      if (!P.map) return;
      Object.values(P.map.dots).forEach((s) => { s.stack.innerHTML = ''; s.n = 0; s.d.querySelector('circle').setAttribute('style', 'fill: #2a1d14; stroke: #8a7666'); });
      P.feed.innerHTML = ''; P.cards = [];
      drawn.clear();
      orders.forEach((o) => { stackOrder(o, false); });
      orders.slice(-FEED_MAX).forEach((o) => feed(o, false));
    }
    function status() {
      if (!P.status) return;
      P.status.textContent = live ? 'BESTILLINGER · LIVE' : 'BESTILLINGER';
      P.statusDot.setAttribute('style', `fill: ${live ? '#8fe3a2' : '#6b5a48'}`);
    }

    // a small truck for the map, front at (0, 0)
    function truck() {
      const o = D.g(svg, { 'data-unit': '' });
      const t = D.g(o);
      D.el('rect', { x: -58, y: -20, width: 40, height: 10, rx: 2, ...FILL('#6b4a30', 2) }, t);
      [[-50, -26], [-38, -26], [-26, -26], [-44, -34], [-32, -34]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 6, ...FILL('#c9935a', 1.8) }, t));
      D.p(t, 'M-18 -10 V-30 H-6 L2 -20 V-10 Z', '', FILL('#ff5a1f', 2));
      [[-48, -8], [-8, -8]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 6, ...FILL('#2a1d14', 2) }, t));
      return { o, t };
    }
    // nearest-neighbour route from the depot through every district with orders
    function route() {
      const left = [...new Set(orders.map((o) => o.bydel))].filter((b) => M[b]);
      const pts = [DEPOT];
      let cur = DEPOT;
      while (left.length) {
        left.sort((a, b) => Math.hypot(M[a][0] - cur[0], M[a][1] - cur[1]) - Math.hypot(M[b][0] - cur[0], M[b][1] - cur[1]));
        const b = left.shift();
        cur = M[b];
        pts.push(cur);
        pts[pts.length - 1].bydel = b;
      }
      return pts.map((p, k) => ({ x: p[0], y: p[1], bydel: k ? p.bydel : null }));
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      step = i;
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        P.win = browser();
        P.btn = goButton();
        tl.fromTo(P.win.g, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, 0.2);
        tl.fromTo(P.btn.g, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.8);
        tl.to(P.btn.glow, { opacity: 0.6, duration: 0.8, yoyo: true, repeat: 5 }, 1.2);
      }

      if (i === 1) {
        // the press: a flash, the particles burst, the address becomes real
        tl.to(P.btn.g, { scale: 0.94, transformOrigin: '50% 50%', duration: 0.1, yoyo: true, repeat: 1 }, 0);
        const flash = D.el('rect', { x: 0, y: 0, width: 1600, height: 900, style: 'fill: #ffb347', opacity: 0, 'data-bg': '' }, svg);
        tl.to(flash, { opacity: 0.55, duration: 0.12 }, 0.15).to(flash, { opacity: 0, duration: 0.9, ease: 'power2.out' }, 0.27);
        tl.call(() => {
          if (instant) return;
          stage.particles.morphTo(shapes.ring(stage, { r: 7.5, tube: 0.6 }), { duration: 0.9, turbulence: 1.2 });
          setTimeout(() => stage.particles.morphTo(shapes.scatter(stage), { duration: 2.4, turbulence: 0.6 }), 1100);
        }, null, 0.15);
        tl.to(P.btn.g, { opacity: 0, duration: 0.3 }, 0.4);
        tl.to(P.win.addr, { opacity: 0, duration: 0.15 }, 0.5);
        tl.call(() => { P.win.addr.textContent = HOST; P.win.addr.setAttribute('style', 'font: 700 16px var(--font-mono); fill: var(--fg)'); }, null, 0.65);
        tl.to(P.win.addr, { opacity: 1, duration: 0.2 }, 0.66);
        tl.to(P.win.lock, { opacity: 1, duration: 0.2 }, 0.66);
        tl.call(() => !instant && send({ type: 'open' }), null, 0.66);
        // the window steps aside; the QR code arrives
        tl.to(P.win.g, { scale: 0.5, x: -250, y: 100, svgOrigin: '330 150', duration: 0.8, ease: 'power3.inOut' }, 1.5);
        P.qr = D.g(svg, { 'data-unit': '' });
        qr(P.qr, 876, 146, 448, 30);
        D.text(P.qr, 1100, 680, 'Bestill ved.', 'qb', { 'text-anchor': 'middle', style: 'font: 800 60px var(--font-display); fill: var(--fg)' });
        D.text(P.qr, 1100, 728, HOST, 'qa', { 'text-anchor': 'middle', style: 'font: 700 24px var(--font-mono); fill: var(--accent)' });
        tl.fromTo(P.qr, { opacity: 0, scale: 0.85, transformOrigin: '50% 40%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 2.2);
      }

      if (i === 2) {
        // the map: real orders land on it
        tl.to([P.win.g, P.qr], { opacity: 0, duration: 0.4 }, 0);
        P.map = map();
        P.feed = D.g(svg);
        P.cards = [];
        const head = D.g(svg, { 'data-unit': '' });
        P.statusDot = D.el('circle', { cx: FEED_X + 6, cy: 244, r: 6, style: 'fill: #6b5a48' }, head);
        P.status = D.text(head, FEED_X + 22, 250, 'BESTILLINGER', 'st', { style: 'font: 700 15px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
        status();
        P.small = D.g(svg, { 'data-unit': '' });
        qr(P.small, 1356, 590, 124, 10);
        D.text(P.small, 1418, 738, HOST, 'sq', { 'text-anchor': 'middle', style: 'font: 700 12px var(--font-mono); fill: var(--muted)' });
        tl.fromTo([P.map.g, head, P.small, P.feed], { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.4);
        tl.call(() => redrawOrders(), null, 0.4);
      }

      if (i === 3) {
        // drive: the route through every district with orders
        const pts = route();
        const byDistrict = (b) => orders.filter((o) => o.bydel === b && !o.demo).map((o) => o.id);
        tl.call(() => !instant && send({ type: 'notify', ids: orders.filter((o) => !o.demo).map((o) => o.id), title: 'Ved.', text: 'Bilen er på vei.' }), null, 0.1);
        if (pts.length > 1) {
          const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
          const path = D.p(svg, d, '', { style: 'fill: none; stroke: #ff7a2f', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '2 10', 'data-bg': '' });
          const len = path.getTotalLength ? path.getTotalLength() : 1000;
          tl.fromTo(path, { opacity: 0 }, { opacity: 0.9, duration: 0.4 }, 0.2);
          const tr = truck();
          gsap.set(tr.o, { x: DEPOT[0], y: DEPOT[1] - 4 });
          tl.fromTo(tr.o, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
          const speed = Math.max(260, len / 14);
          let at = 0.7;
          for (let k = 1; k < pts.length; k++) {
            const a = pts[k - 1], b = pts[k];
            const dur = Math.hypot(b.x - a.x, b.y - a.y) / speed;
            tl.set(tr.t, { scaleX: b.x < a.x ? -1 : 1, transformOrigin: '-28px -16px' }, at);
            tl.to(tr.o, { x: b.x, y: b.y - 4, duration: dur, ease: 'none' }, at);
            at += dur;
            const s = P.map.dots[b.bydel];
            tl.to(s.stack, { opacity: 0.35, duration: 0.3 }, at);
            tl.fromTo(s.d, { scale: 1 }, { scale: 1.6, transformOrigin: '50% 50%', duration: 0.15, yoyo: true, repeat: 1, immediateRender: false }, at);
            tl.call(() => !instant && send({ type: 'notify', ids: byDistrict(b.bydel), title: 'Ved.', text: 'Levert. Veden står ved døra.' }), null, at);
            at += 0.35;
          }
        }
      }
      return tl;
    };

    const st = D.stepper(ctx, { reset, play });
    return {
      ...st,
      dispose() {
        closed = true;
        clearTimeout(wsTimer);
        window.removeEventListener('keydown', onKey);
        try { ws?.close(); } catch {}
      },
    };
  },
};
