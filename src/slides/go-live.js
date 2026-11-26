import gsap from 'gsap';
import QRCode from 'qrcode';
import * as D from '../engine/draw.js';
import { FILL } from '../engine/props.js';
import { varmPeis } from '../engine/varmpeis.js';
import { liveMap } from '../engine/livemap.js';

/*
  Lansering, the jaw drop: the firewood shop goes live for real and the room orders from it.
    0. The finished site on localhost, and a big "Gå live" button.
    1. Live: the address flips to ved.atladeus.com, the shop opens (for real, through the
       relay), the window steps aside and a big QR code appears. "Bestill ved."
    2. A live map of Norway. Every real order lands as a pin on its address (the camera eases
       to frame them all) and as a card in the feed. A small QR stays for latecomers.
    3. "Kjør": a route along real roads (OSRM, through the relay) through every address, drawn
       as the truck drives it. Phones get "Bilen er på vei", then "Levert" at their stop.
    4. The income: tonight's revenue from the room's own orders counts up over the map.
       From idea to income.

  Live data: a websocket to the relay (ved/src/worker.js) as the deck. URL and key come from
  .env.local (VITE_VED_WS, VITE_VED_KEY, VITE_VED_SITE); without them it stays offline.
  Only the audience window sends commands; preview iframes and audits only listen.
  Keys on this slide: R plays a recorded batch of orders (fallback if the network fails),
  X empties the shop (rehearsal), C closes it again.

  Layout zones (svg units):
    tip       x 80–540, y 110–240
    step 0–1  browser x 580–1520, y 150–710 · button x 890–1210, y 735–795
              (step 1: browser scaled to x 80–550, y 250–530; QR card x 876–1324, y 146–594,
               "Bestill ved." y 680, address y 728)
    step 2–3  feed x 80–520, y 236–640 · small QR x 80–190, y 662–772 · map (DOM) x 580–1520, y 140–780
*/

const WS = import.meta.env.VITE_VED_WS || 'wss://ved.atladeus.com';
const KEY = import.meta.env.VITE_VED_KEY || '';
const SITE = import.meta.env.VITE_VED_SITE || 'https://ved.atladeus.com';
const HOST = SITE.replace(/^https?:\/\//, '').replace(/\/$/, '');

// where the truck starts: VITE_VED_DEPOT="lon,lat", else Oslo sentrum
const DEPOT = (import.meta.env.VITE_VED_DEPOT || '10.7522,59.9139').split(',').map(Number);
const FEED_X = 80, FEED_Y = 270, FEED_H = 64, FEED_GAP = 10, FEED_MAX = 5;
// the fallback evening: addresses around the country
const DEMO = [
  ['Thorvald Meyers gate 5', 'Oslo', 59.9227, 10.7590, 'Ingrid'], ['Bryggen 1', 'Bergen', 60.3975, 5.3245, 'Lars'], ['Munkegata 1', 'Trondheim', 63.4305, 10.3951, 'Sofie'],
  ['Torget 1', 'Stavanger', 58.9700, 5.7331, 'Henrik'], ['Bragernes torg 1', 'Drammen', 59.7439, 10.2045, 'Nora'], ['Storgata 1', 'Lillehammer', 61.1153, 10.4662, 'Jonas'],
  ['Markens gate 1', 'Kristiansand', 58.1450, 7.9956, 'Emma'], ['Storgata 1', 'Hamar', 60.7945, 11.0680, 'Ola'], ['Kongens gate 1', 'Ålesund', 62.4723, 6.1549, 'Maja'],
  ['Nygata 1', 'Fredrikstad', 59.2181, 10.9298, 'Sander'], ['Storgata 1', 'Tromsø', 69.6492, 18.9553, 'Tiril'], ['Storgata 1', 'Kongsberg', 59.6682, 9.6497, 'Even'],
  ['Storgata 1', 'Bodø', 67.2804, 14.4049, 'Ida'], ['Storgata 1', 'Gjøvik', 60.7957, 10.6916, 'Mats'],
];
const PRICE = 129; // kr per sack, as on the order page (ved/public/index.html)
const sacks = (n) => `${n} ${n === 1 ? 'sekk' : 'sekker'}`;
const short = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

export default {
  id: 'go-live',
  title: 'Gå live',
  steps: 5,
  notes: [
    'Siden er ferdig, men den ligger bare på min maskin.',
    'Live. Ta frem telefonen og bestill ved.',
    'Bestillingene kommer inn. Ekte, fra dere. (R spiller av opptak hvis nettet svikter.)',
    'Bilen kjører. Følg med på telefonen.',
    'Kveldens omsetning, fra dere. Fra idé til inntekt.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Lansering</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Lanser før det<br>er <em>perfekt</em>.</h2>`;
    const tip = ctx.$('.tip');
    const svg = D.stage(el);
    const control = new URLSearchParams(location.search).get('view') !== 'preview';
    let P = {};
    let step = -1;
    const orders = [];            // every order seen, live or recorded

    // ---- the relay ----
    let ws = null, wsTimer = null, live = false, closed = false;
    const send = (m) => { if (control && !ctx.deck?.instant && ws?.readyState === 1) ws.send(JSON.stringify(m)); };
    function connect() {
      if (!KEY || closed) return;
      try { ws = new WebSocket(`${WS}/api/ws?role=deck&key=${encodeURIComponent(KEY)}`); } catch { return; }
      ws.onopen = () => { live = true; status(); };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === 'snapshot') { orders.length = 0; m.orders.filter((o) => Number.isFinite(o.lat)).forEach((o) => orders.push(o)); if (step >= 2) redrawOrders(); }
        if (m.type === 'order') add(m.order);
      };
      ws.onclose = () => { live = false; status(); clearTimeout(wsTimer); if (!closed) wsTimer = setTimeout(connect, 2000); };
    }
    connect();

    // the fallback: a recorded evening of orders
    function replay() {
      DEMO.forEach(([adresse, sted, lat, lon, navn], k) => setTimeout(() => add({ id: `demo-${Date.now()}-${k}`, navn, adresse, sted, lat, lon, sekker: 1 + (k * 7) % 3, t: Date.now(), demo: true }), 300 + k * 520 + (k % 3) * 140));
    }
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !control) return;
      if (e.key === 'r' || e.key === 'R') replay();
      if (e.key === 'x' || e.key === 'X') { if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'reset' })); orders.length = 0; if (step >= 2) redrawOrders(); }
      if (e.key === 'c' || e.key === 'C') { if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'close' })); }
    };
    window.addEventListener('keydown', onKey);

    function add(o) {
      if (orders.some((x) => x.id === o.id) || !Number.isFinite(o.lat)) return;
      orders.push(o);
      if (step >= 2) { P.lm?.add(o, { fresh: true }); feed(o, true); reframe(); }
    }

    // the live map lives in the DOM, over the frame's middle; made once, kept across steps
    const mapEl = document.createElement('div');
    mapEl.style.cssText = 'left:calc(var(--u)*36.25);top:calc(var(--u)*8.75);width:calc(var(--u)*58.75);height:calc(var(--u)*40);border-radius:calc(var(--u)*1);box-shadow:0 0 0 2px var(--deco), 0 30px 80px -20px rgba(0,0,0,.8);opacity:0;';
    el.append(mapEl);
    let lm = null;
    const ensureMap = () => (lm ??= liveMap(mapEl, { depot: DEPOT }));
    let frameTimer = null;
    const reframe = () => { clearTimeout(frameTimer); frameTimer = setTimeout(() => P.lm?.frame(), 500); };
    let driving = null;

    // the income: one big number over the map
    const revEl = document.createElement('div');
    revEl.style.cssText = 'position:absolute;left:calc(var(--u)*36.25);top:calc(var(--u)*8.75);width:calc(var(--u)*58.75);height:calc(var(--u)*40);border-radius:calc(var(--u)*1);display:grid;place-content:center;text-align:center;gap:calc(var(--u)*0.8);background:rgba(18,9,5,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;pointer-events:none;';
    revEl.innerHTML = `
      <div style="font:700 calc(var(--u)*1.1)/1 var(--font-mono);letter-spacing:.2em;color:var(--accent)">KVELDENS OMSETNING</div>
      <div class="rev-n" style="font:800 calc(var(--u)*9)/1 var(--font-display);letter-spacing:-.04em;color:var(--fg)">0 kr</div>
      <div class="rev-sub" style="font:600 calc(var(--u)*1.6)/1.2 var(--font-display);color:#b8a48e"></div>`;
    el.append(revEl);
    const kr = (n) => `${Math.round(n).toLocaleString('nb-NO')} kr`;

    const reset = () => { svg.innerHTML = ''; P = {}; driving?.kill(); driving = null; lm?.clear(); gsap.set([mapEl, revEl], { opacity: 0 }); };

    // ---- step 0–1: the browser and the button ----
    function browser() {
      // drawn at x 330 and moved right, clear of the tip at top left
      const g = D.g(svg, { 'data-unit': '' });
      const b = D.g(g, { transform: 'translate(250 0)' });
      D.el('rect', { x: 330, y: 150, width: 940, height: 560, rx: 16, style: 'fill: #0f0a07; stroke: var(--deco)', 'stroke-width': 3 }, b);
      D.el('rect', { x: 332, y: 152, width: 936, height: 48, rx: 14, style: 'fill: #1d1510' }, b);
      [0, 1, 2].forEach((k) => D.el('circle', { cx: 358 + k * 20, cy: 176, r: 6, style: `fill: ${['#ff6f9c', '#ffd23f', '#8fe3a2'][k]}` }, b));
      D.el('rect', { x: 470, y: 161, width: 660, height: 30, rx: 15, style: 'fill: #2a1d14' }, b);
      const lock = D.g(b, { opacity: 0 });
      D.el('rect', { x: 490, y: 175, width: 12, height: 10, rx: 2, style: 'fill: #8fe3a2' }, lock);
      D.p(lock, 'M492.5 175 v-3 a3.5 3.5 0 0 1 7 0 v3', '', { style: 'fill: none; stroke: #8fe3a2', 'stroke-width': 2 });
      const addr = D.text(b, 512, 182, 'localhost:8787', 'ad', { style: 'font: 700 16px var(--font-mono); fill: var(--muted)' });
      const page = D.g(b, { 'data-bg': '' });
      varmPeis(page, 340, 206, 920, 496, { bar: true });
      return { g, addr, lock };
    }
    function goButton() {
      // a real button: clicking it (or the clicker) takes the step
      const g = D.g(svg, { 'data-unit': '', 'data-interactive': '', style: 'cursor: pointer' });
      g.addEventListener('click', () => { if (step === 0) ctx.deck?.next(); });
      const glow = D.el('rect', { x: 880, y: 727, width: 340, height: 76, rx: 38, style: 'fill: #ff5a1f', opacity: 0.25 }, g);
      D.el('rect', { x: 890, y: 735, width: 320, height: 60, rx: 30, ...FILL('#ff5a1f', 3) }, g);
      D.text(g, 1050, 775, 'Gå live', 'gl', { 'text-anchor': 'middle', style: 'font: 800 28px var(--font-display); fill: #1a120c' });
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

    // ---- step 2–3: the feed beside the live map ----
    function feed(o, animate) {
      if (!P.feed) return;
      const g = D.g(P.feed, { 'data-unit': '' });
      D.el('rect', { x: FEED_X, y: FEED_Y, width: 440, height: FEED_H, rx: 14, style: `fill: #1d1510; stroke: ${o.demo ? 'var(--deco)' : '#ff7a2f'}`, 'stroke-width': 2 }, g);
      [[FEED_X + 26, FEED_Y + 40], [FEED_X + 42, FEED_Y + 40], [FEED_X + 34, FEED_Y + 26]].forEach(([cx, cy]) => D.el('circle', { cx, cy, r: 7, ...FILL('#c9935a', 1.8) }, g));
      D.text(g, FEED_X + 66, FEED_Y + 28, short(o.navn || 'Ny bestilling', 26), 'fb', { style: 'font: 700 17px var(--font-display); fill: var(--fg)' });
      D.text(g, FEED_X + 66, FEED_Y + 50, short(`${o.adresse || ''}, ${o.sted || ''} · ${sacks(o.sekker)}`, 44), 'fd', { style: 'font: 600 15px var(--font-display); fill: #b8a48e' });
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
      if (!P.feed) return;
      P.feed.innerHTML = ''; P.cards = [];
      orders.slice(-FEED_MAX).forEach((o) => feed(o, false));
      P.lm?.clear();
      orders.forEach((o) => P.lm?.add(o));
      P.lm?.frame({ duration: 0 });
    }
    function status() {
      if (!P.status) return;
      P.status.textContent = live ? 'BESTILLINGER · LIVE' : 'BESTILLINGER';
      P.statusDot.setAttribute('style', `fill: ${live ? '#8fe3a2' : '#6b5a48'}`);
    }

    // the stops in driving order: nearest neighbour from the depot; one stop per address
    function stops() {
      const by = new Map();
      orders.forEach((o) => {
        const k = `${o.lat.toFixed(4)},${o.lon.toFixed(4)}`;
        if (!by.has(k)) by.set(k, { lon: o.lon, lat: o.lat, ids: [], real: [], adresse: o.adresse, navn: o.navn });
        by.get(k).ids.push(o.id);
        if (!o.demo) by.get(k).real.push(o.id);
      });
      const left = [...by.values()], out = [];
      let cur = { lon: DEPOT[0], lat: DEPOT[1] };
      const d2 = (a, b) => (a.lon - b.lon) ** 2 * Math.cos(a.lat * Math.PI / 180) ** 2 + (a.lat - b.lat) ** 2;
      while (left.length) {
        left.sort((a, b) => d2(cur, a) - d2(cur, b));
        cur = left.shift();
        out.push(cur);
      }
      return out;
    }
    // real roads from the relay; a straight line for any leg it can't answer
    async function legsFor(st) {
      const points = [DEPOT, ...st.map((p) => [p.lon, p.lat])];
      const straight = points.slice(1).map((b, k) => [points[k], b]);
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 9000);
        const r = await fetch(`${SITE}/api/route`, { method: 'POST', body: JSON.stringify({ points }), signal: ctl.signal });
        clearTimeout(t);
        const d = await r.json();
        return d.legs?.length === straight.length ? d.legs : straight;
      } catch { return straight; }
    }

    const play = (i, instant) => {
      const tl = gsap.timeline();
      step = i;
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
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
        tl.to(P.win.g, { scale: 0.5, x: -500, y: 100, svgOrigin: '580 150', duration: 0.8, ease: 'power3.inOut' }, 1.5);
        P.qr = D.g(svg, { 'data-unit': '' });
        qr(P.qr, 876, 146, 448, 30);
        D.text(P.qr, 1100, 680, 'Bestill ved.', 'qb', { 'text-anchor': 'middle', style: 'font: 800 60px var(--font-display); fill: var(--fg)' });
        D.text(P.qr, 1100, 728, HOST, 'qa', { 'text-anchor': 'middle', style: 'font: 700 24px var(--font-mono); fill: var(--accent)' });
        tl.fromTo(P.qr, { opacity: 0, scale: 0.85, transformOrigin: '50% 40%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 2.2);
      }

      if (i === 2) {
        // the live map: real orders land on it
        tl.to([P.win.g, P.qr], { opacity: 0, duration: 0.4 }, 0);
        P.feed = D.g(svg);
        P.cards = [];
        const head = D.g(svg, { 'data-unit': '' });
        P.statusDot = D.el('circle', { cx: FEED_X + 6, cy: 244, r: 6, style: 'fill: #6b5a48' }, head);
        P.status = D.text(head, FEED_X + 22, 250, 'BESTILLINGER', 'st', { style: 'font: 700 15px var(--font-mono); letter-spacing: .16em; fill: var(--muted)' });
        status();
        P.small = D.g(svg, { 'data-unit': '' });
        qr(P.small, FEED_X, 662, 110, 9);
        D.text(P.small, FEED_X + 128, 712, 'Bestill ved', 'sq1', { style: 'font: 800 22px var(--font-display); fill: var(--fg)' });
        D.text(P.small, FEED_X + 128, 740, HOST, 'sq2', { style: 'font: 700 14px var(--font-mono); fill: var(--accent)' });
        tl.fromTo([head, P.small, P.feed], { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.4);
        P.lm = ensureMap();
        tl.to(mapEl, { opacity: 1, duration: 0.8 }, 0.3);
        tl.call(() => { P.lm.ready.then(() => { if (step >= 2) { P.lm.map.resize(); redrawOrders(); } }); }, null, 0.3);
      }

      if (i === 3) {
        // drive: along real roads through every address
        tl.call(() => {
          if (instant || !P.lm) return;
          const st = stops();
          if (!st.length) return;
          send({ type: 'notify', ids: st.flatMap((p) => p.real), title: 'Ved.', text: 'Bilen er på vei.' });
          Promise.all([P.lm.ready, legsFor(st)]).then(([, legs]) => {
            if (step !== 3) return;
            driving = ctx.track(P.lm.drive(st, legs, {
              duration: Math.min(24, 8 + st.length * 0.9),
              onArrive: (k) => {
                P.lm.done(st[k].ids);
                send({ type: 'notify', ids: st[k].real, title: 'Ved.', text: `${st[k].navn ? `Hei ${st[k].navn}! ` : ''}Veden står ved døra i ${st[k].adresse}.` });
              },
            }));
          });
        }, null, 0.1);
      }

      if (i === 4) {
        // the income: what the room just bought, counted up
        const total = orders.reduce((n, o) => n + o.sekker * PRICE, 0);
        const bags = orders.reduce((n, o) => n + o.sekker, 0);
        const num = revEl.querySelector('.rev-n');
        revEl.querySelector('.rev-sub').textContent = orders.length
          ? `${orders.length} ${orders.length === 1 ? 'bestilling' : 'bestillinger'} · ${sacks(bags)} ved · fra dere, i kveld`
          : 'Ingen bestillinger ennå';
        const c = { v: 0 };
        num.textContent = kr(0);
        tl.to(revEl, { opacity: 1, duration: 0.6 }, 0.1);
        tl.to(c, { v: total, duration: 2.4, ease: 'power3.out', onUpdate: () => { num.textContent = kr(c.v); } }, 0.5);
        tl.fromTo(num, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' }, 2.6);
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
        lm?.destroy();
      },
    };
  },
};
