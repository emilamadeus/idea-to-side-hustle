import QRCode from 'qrcode';
import * as D from '../engine/draw.js';
import { onRelay, relayState, relaySend } from '../engine/relay.js';

const SITE = import.meta.env.VITE_VED_SITE || 'https://ved.atladeus.com';

/*
  Title, in two states. Particles swirl outside the frame. Zones (1600×900 frame):
  - The room's orbit: an ellipse (cx 800, cy 430, rx 770, ry 270; y 160–700), drawn as a faint
    dashed ring. Everyone who joins becomes a named glowing mote on it: a small burst where it
    lands, then it orbits. Names sit outside the ring. The phones' lobby (ved/public/js/lobby.js)
    shows the same room in the same colours, with the count in the middle.
  - Step 0, arrival: inside the ring, "Bli med" + the address (y 215), a 300 px QR code
    (x 650–950, y 235–535, about 35 cm on the 100" TV) and a large live count (y 612).
    The title sits small at top left (x 90, y 74–110), so people know which talk this is.
  - Step 1, start: the QR shrinks into the bottom-left corner (x 90–190, y 760–860) with a small
    "Bli med", address and count beside it (x 210–420); the small title fades; the full title
    rises into the middle of the ring (y 300–525), a dimension line is drawn under it (y 548)
    and the subtitle comes in below (y 576–654).
*/
export default {
  id: 'title',
  room: true, // the room takes part from their phones (a badge in the zoom-out)
  title: 'Tittel',
  steps: 2,
  notes: [
    'Salen kommer inn. Stor QR midt i ringen, tallet teller opp.',
    'Start: QR til hjørnet, tittelen inn i midten, undertittelen under.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx, gsap } = ctx;
    el.innerHTML = `
      <p class="title-mini" style="position:absolute;left:calc(var(--u)*5.6);top:calc(var(--u)*4.6);margin:0;
        font:800 calc(var(--u)*2.1)/1.1 var(--font-display);letter-spacing:-.02em;color:var(--fg)">Fra idé til lansering, med AI</p>
      <h1 class="title-text" style="position:absolute;left:50%;transform:translateX(-50%);width:max-content;top:calc(var(--u)*18.75);text-align:center;margin:0;
        font-family:var(--font-display);font-weight:var(--display-weight);letter-spacing:var(--display-tracking);
        font-size:calc(var(--u)*7.4);line-height:.95;color:var(--fg);visibility:hidden">Fra idé til lansering,<br>med AI</h1>
      <p class="title-sub" style="position:absolute;left:calc(var(--u)*27);right:calc(var(--u)*27);top:calc(var(--u)*36);text-align:center;margin:0;
        font:600 calc(var(--u)*1.75)/1.4 var(--font-display);color:var(--fg);opacity:0">Se hvordan AI gjør en idé om til inntekt.<br><span style="color:var(--muted)">Eller ta med deg grepene til jobb i morgen.</span></p>`;
    const mini = ctx.$('.title-mini');
    const h1 = ctx.$('.title-text');
    const sub = ctx.$('.title-sub');
    const svg = D.stage(el);
    const NS = 'http://www.w3.org/2000/svg';
    const tspan = (style, text, dx) => { const t = document.createElementNS(NS, 'tspan'); t.setAttribute('style', style); if (dx) t.setAttribute('dx', dx); t.textContent = text; return t; };
    const host = SITE.replace(/^https?:\/\//, '');

    // dimension line between the title and the subtitle (step 1)
    const dim = D.g(svg);
    D.p(dim, 'M520 548 H1080 M520 536 V560 M1080 536 V560', 'acc2');
    D.hide(dim);

    // the QR code, built at 300 px and moved/scaled between the two states
    const QS = 300, BIG = { x: 650, y: 235, s: 1 }, SMALL = { x: 90, y: 760, s: 100 / QS };
    const qr = D.g(svg, { 'data-unit': '' });
    {
      const pad = 16;
      D.el('rect', { x: 0, y: 0, width: QS, height: QS, rx: 14, style: 'fill: #fff3e3' }, qr);
      const code = QRCode.create(SITE, { errorCorrectionLevel: 'M' }).modules;
      const n = code.size, m = (QS - pad * 2) / n;
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (code.data[r * n + c]) d += `M${(pad + c * m).toFixed(2)} ${(pad + r * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
      D.p(qr, d, '', { style: 'fill: #1a120c; stroke: none', 'shape-rendering': 'crispEdges' });
    }
    const Q = { ...BIG };
    const setQ = () => qr.setAttribute('transform', `translate(${Q.x.toFixed(1)} ${Q.y.toFixed(1)}) scale(${Q.s.toFixed(4)})`);
    setQ();

    // arrival text: "Bli med · address" above the code, the count under it
    const bigText = D.g(svg, { 'data-unit': '' });
    const bigHead = D.text(bigText, 800, 215, '', 'bh', { 'text-anchor': 'middle' });
    bigHead.append(tspan('font: 800 30px var(--font-display); fill: var(--fg)', 'Bli med'), tspan('font: 700 18px var(--font-mono); fill: var(--accent)', host, 16));
    const bigCount = D.text(bigText, 800, 612, '', 'bc', { 'text-anchor': 'middle' });
    const bigNum = tspan('font: 700 60px var(--font-mono); fill: var(--accent-2)', '0');
    bigCount.append(bigNum, tspan('font: 700 18px var(--font-mono); fill: var(--muted)', 'i salen', 14));

    // the corner version beside the small code
    const smallText = D.g(svg, { 'data-unit': '' });
    D.text(smallText, 210, 788, 'Bli med', 'sh', { style: 'font: 800 22px var(--font-display); fill: var(--fg)' });
    D.text(smallText, 210, 812, host, 'su', { style: 'font: 700 13px var(--font-mono); fill: var(--accent)' });
    const smallCount = D.text(smallText, 210, 852, '', 'sc');
    const smallNum = tspan('font: 700 32px var(--font-mono); fill: var(--accent-2)', '0');
    smallCount.append(smallNum, tspan('font: 700 13px var(--font-mono); fill: var(--muted)', 'i salen', 10));
    gsap.set([qr, bigText, smallText], { opacity: 0 });

    // the room: one glowing mote per phone, orbiting the title
    const O = { cx: 800, cy: 430, rx: 770, ry: 270 };
    const DOT = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
    const ring = D.g(svg, { 'data-bg': '' });
    // the path they travel, drawn as a construction line (the phones draw the same ring)
    const track = D.el('ellipse', { cx: O.cx, cy: O.cy, rx: O.rx, ry: O.ry, style: 'fill: none; stroke: var(--deco); stroke-width: 2; stroke-dasharray: 4 12; opacity: 0' }, ring);
    const motes = new Map(); // id → { g, dot, label, w, off, target }
    let spin = 0;
    let shown = 0;
    const setCount = () => {
      const n = motes.size;
      if (n === shown) return;
      bigNum.textContent = n; smallNum.textContent = n;
      if (n > shown && shown > 0) {
        ctx.track(gsap.fromTo(bigCount, { scale: 1.3 }, { scale: 1, duration: 0.7, ease: 'back.out(3)', svgOrigin: '800 600' }));
        ctx.track(gsap.fromTo(smallCount, { scale: 1.3 }, { scale: 1, duration: 0.7, ease: 'back.out(3)', svgOrigin: '210 846' }));
      }
      shown = n;
    };
    const layout = () => { [...motes.values()].sort((a, b) => a.n - b.n).forEach((m, i, all) => { m.target = (i / all.length) * Math.PI * 2; }); };
    const place = (m) => {
      const a = spin + m.off - Math.PI / 2;
      const x = O.cx + O.rx * Math.cos(a), y = O.cy + O.ry * Math.sin(a);
      m.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      if (m.label) {
        const lx = Math.min(Math.max(x, 24 + m.w / 2), 1576 - m.w / 2) - x;
        m.label.setAttribute('x', lx.toFixed(1));
        m.label.setAttribute('y', Math.sin(a) > 0 ? 38 : -24); // outside the ring
      }
    };
    const add = (p, live) => {
      if (motes.has(p.id)) { const m = motes.get(p.id); if (m.label && p.name) { m.label.textContent = p.name; m.w = m.label.getComputedTextLength(); } return; }
      const c = DOT[(p.n - 1) % DOT.length];
      const g = D.g(ring);
      D.el('circle', { r: 20, style: `fill: ${c}; opacity: .2` }, g);
      const dot = D.el('circle', { r: 9, style: `fill: ${c}; stroke: #1a120c; stroke-width: 2.5` }, g);
      const label = p.name ? D.text(g, 0, 0, p.name, 'mn', { 'text-anchor': 'middle', style: `font: 800 24px var(--font-display); fill: ${c}` }) : null;
      const m = { g, dot, label, w: label ? label.getComputedTextLength() : 0, n: p.n, off: 0, target: 0 };
      motes.set(p.id, m);
      layout();
      m.off = m.target;
      place(m);
      setCount();
      if (!live) return;
      // a small burst where it lands: sparks pull in, the mote pops, a ring flashes out
      const tl = ctx.tl();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2, r = 70 + Math.random() * 40;
        const s = D.el('circle', { r: 3.5, cx: Math.cos(a) * r, cy: Math.sin(a) * r, style: `fill: ${c}` }, g);
        tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.15 }, k * 0.02);
        tl.to(s, { attr: { cx: 0, cy: 0 }, duration: 0.55, ease: 'power3.in' }, 0.1 + k * 0.02);
        tl.to(s, { opacity: 0, duration: 0.1, onComplete: () => s.remove() }, 0.62 + k * 0.02);
      }
      const flash = D.el('circle', { r: 8, style: `fill: none; stroke: ${c}; stroke-width: 3` }, g);
      tl.fromTo(g.children[0], { attr: { r: 0 } }, { attr: { r: 20 }, duration: 0.6, ease: 'back.out(3)' }, 0.75);
      tl.fromTo(dot, { attr: { r: 0 } }, { attr: { r: 9 }, duration: 0.6, ease: 'back.out(3)' }, 0.75);
      tl.fromTo(flash, { attr: { r: 8 }, opacity: 1 }, { attr: { r: 60 }, opacity: 0, duration: 0.9, ease: 'power2.out', onComplete: () => flash.remove() }, 0.75);
      if (label) tl.fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.9);
    };
    ctx.tick(() => {
      spin += 0.0012;
      motes.forEach((m) => { m.off += (m.target - m.off) * 0.04; place(m); });
    });
    const offRelay = onRelay((m) => {
      if (m.type === 'joined' && m.p) add(m.p, !m.again);
      if (m.people) {
        const ids = new Set(m.people.map((p) => p.id));
        motes.forEach((v, id) => { if (!ids.has(id)) { v.g.remove(); motes.delete(id); } });
        m.people.forEach((p) => add(p, false));
        layout(); setCount();
      }
    });

    // the two states. instant: land there without motion (entering, or going back a slide)
    let dimTw = null; // held directly: a quick back-click must stop it before its delay runs out
    const kill = () => { gsap.killTweensOf([Q, mini, sub, bigText, smallText, h1]); dimTw?.kill(); dimTw = null; };
    const arrive = (instant) => {
      kill();
      const t = instant ? 0 : 1;
      ctx.track(gsap.to(Q, { ...BIG, duration: 1.1 * t, ease: 'expo.inOut', onUpdate: setQ }));
      ctx.track(gsap.to(bigText, { opacity: 1, duration: 0.5 * t, delay: 0.7 * t }));
      ctx.track(gsap.to(smallText, { opacity: 0, duration: 0.3 * t }));
      ctx.track(gsap.to(mini, { opacity: 1, duration: 0.6 * t, delay: 0.5 * t }));
      ctx.track(gsap.to(sub, { opacity: 0, duration: 0.3 * t }));
      D.hide(dim);
      if (h1.style.visibility !== 'hidden') ctx.track(gsap.to(h1, { opacity: 0, duration: 0.4 * t, onComplete: () => { h1.style.visibility = 'hidden'; } }));
    };
    const start = (instant) => {
      kill();
      const t = instant ? 0 : 1;
      // the code makes way first, then the title rises into the middle
      ctx.track(gsap.to(bigText, { opacity: 0, duration: 0.3 * t }));
      ctx.track(gsap.to(Q, { ...SMALL, duration: 1.1 * t, ease: 'expo.inOut', onUpdate: setQ }));
      ctx.track(gsap.to(smallText, { opacity: 1, duration: 0.5 * t, delay: 0.9 * t }));
      ctx.track(gsap.to(mini, { opacity: 0, duration: 0.4 * t }));
      gsap.set(h1, { opacity: 1 }); h1.style.visibility = 'visible';
      ctx.track(fx.rise(h1, { stagger: 0.03, duration: 1.2, y: 80, delay: 0.6 * t }));
      dimTw = ctx.track(D.drawOn(dim, { duration: 0.9, delay: 1.4 * t }));
      ctx.track(gsap.fromTo(sub, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, delay: 1.8 * t, ease: 'power2.out' }));
    };

    return {
      enter({ step }) {
        stage.particles.colors(...stage.theme.particles);
        stage.particles.morphTo(shapes.nebula(stage), { duration: 3, turbulence: 0.8 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 3 });
        relayState.people.forEach((p) => add(p, false));
        if (!ctx.deck?.instant) relaySend({ type: 'where', label: '' }); // a new run: the phones' lobby starts at the beginning
        ctx.track(gsap.to(track, { opacity: 0.65, duration: 1.2, delay: 0.6 }));
        ctx.track(gsap.to(qr, { opacity: 1, duration: 0.8, delay: 0.3 }));
        if (step >= 1) start(true);
        else { arrive(true); gsap.set(bigText, { opacity: 0 }); ctx.track(gsap.to(bigText, { opacity: 1, duration: 0.8, delay: 0.6 })); ctx.track(fx.rise(mini, { stagger: 0.015, duration: 1, y: 60 })); }
      },
      step(n) { if (n >= 1) start(false); else arrive(false); },
      dispose() { offRelay(); },
    };
  },
};
