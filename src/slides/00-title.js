import QRCode from 'qrcode';
import * as D from '../engine/draw.js';
import { onRelay, relayState } from '../engine/relay.js';

const SITE = import.meta.env.VITE_VED_SITE || 'https://ved.atladeus.com';

/*
  Title. Crisp text rises in and a dimension line is drawn under it like a drawing
  annotation. On the second click the subtitle comes in under the line (what you get:
  an idea turned into income, or the tips for tomorrow). Particles swirl outside the frame.
  Bottom left, a QR code to ved.atladeus.com: the room joins here, and their phones take part
  later (the vote on the prototypes, the buzzes, the go-live). x 80–420, y 690–810.
  Everyone who joins becomes a named glowing mote: a small burst where it lands, then it
  orbits the title on an ellipse (cx 800, cy 360, rx 770, ry 270) that stays clear of the
  title, the dimension line and the QR. Names are filtered by the relay. "N med" under the URL.
*/
export default {
  id: 'title',
  title: 'Tittel',
  steps: 2,
  notes: [
    'Tittelen kommer inn.',
    'Undertittelen kommer inn.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx, gsap } = ctx;
    el.innerHTML = `
      <h1 class="title-text" style="position:absolute;left:0;right:0;top:calc(var(--u)*15.5);text-align:center;margin:0;
        font-family:var(--font-display);font-weight:var(--display-weight);letter-spacing:var(--display-tracking);
        font-size:calc(var(--u)*8);line-height:.95;color:var(--fg)">Fra idé til startup,<br><em style="font-style:normal;color:var(--accent)">med AI</em></h1>
      <p class="title-sub" style="position:absolute;left:calc(var(--u)*27);right:calc(var(--u)*27);top:calc(var(--u)*43);text-align:center;margin:0;
        font:600 calc(var(--u)*1.75)/1.4 var(--font-display);color:var(--fg);opacity:0">Se hvordan AI gjør en idé om til inntekt.<br><span style="color:var(--muted)">Eller ta med deg grepene til jobb i morgen.</span></p>`;
    const h1 = ctx.$('.title-text');
    const sub = ctx.$('.title-sub');

    // Dimension line under the title (clear of the letters).
    const svg = D.stage(el);
    const dim = D.g(svg);
    D.p(dim, 'M300 655 H1300 M300 640 V670 M1300 640 V670', 'acc2');
    D.hide(dim);

    // join: the room's phones come along for the whole talk
    let count;
    const join = D.g(svg, { 'data-unit': '' });
    {
      const x = 80, y = 690, size = 120, pad = 10;
      D.el('rect', { x, y, width: size, height: size, rx: 8, style: 'fill: #fff3e3' }, join);
      const code = QRCode.create(SITE, { errorCorrectionLevel: 'M' }).modules;
      const n = code.size, m = (size - pad * 2) / n;
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (code.data[r * n + c]) d += `M${(x + pad + c * m).toFixed(2)} ${(y + pad + r * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
      D.p(join, d, '', { style: 'fill: #1a120c; stroke: none', 'shape-rendering': 'crispEdges' });
      D.text(join, x + size + 20, y + 50, 'Bli med', 'jt', { style: 'font: 800 26px var(--font-display); fill: var(--fg)' });
      D.text(join, x + size + 20, y + 80, SITE.replace(/^https?:\/\//, ''), 'js', { style: 'font: 700 15px var(--font-mono); fill: var(--accent)' });
      count = D.text(join, x + size + 20, y + 112, '', 'jc', { style: 'font: 700 18px var(--font-mono); fill: var(--accent-2)' });
      gsap.set(join, { opacity: 0 });
    }

    // the room: one glowing mote per phone, orbiting the title
    const O = { cx: 800, cy: 360, rx: 770, ry: 270 };
    const DOT = ['#ff7a2f', '#ffd23f', '#8fe3a2', '#7fd0ff', '#ff6f9c', '#c9a6ff', '#ffb25e', '#9be7b0'];
    const ring = D.g(svg, { 'data-bg': '' });
    const motes = new Map(); // id → { g, dot, label, w, off, target }
    let spin = 0;
    const setCount = () => { const n = motes.size; count.textContent = n ? `${n} med` : ''; };
    const layout = () => { [...motes.values()].sort((a, b) => a.n - b.n).forEach((m, i, all) => { m.target = (i / all.length) * Math.PI * 2; }); };
    const place = (m) => {
      const a = spin + m.off - Math.PI / 2;
      const x = O.cx + O.rx * Math.cos(a), y = O.cy + O.ry * Math.sin(a);
      m.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      if (m.label) {
        const lx = Math.min(Math.max(x, 24 + m.w / 2), 1576 - m.w / 2) - x;
        m.label.setAttribute('x', lx.toFixed(1));
        m.label.setAttribute('y', Math.sin(a) > 0 ? -24 : 36);
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

    // the subtitle comes in on the second click, under the yellow line
    const showSub = (on) => {
      gsap.killTweensOf(sub);
      ctx.track(on ? gsap.fromTo(sub, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }) : gsap.to(sub, { opacity: 0, duration: 0.3 }));
    };

    return {
      enter({ step }) {
        stage.particles.colors(...stage.theme.particles);
        stage.particles.morphTo(shapes.nebula(stage), { duration: 3, turbulence: 0.8 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 3 });
        ctx.track(fx.rise(h1, { stagger: 0.03, duration: 1.2, y: 80 }));
        ctx.track(D.drawOn(dim, { duration: 0.9, delay: 1.1 }));
        ctx.track(gsap.to(join, { opacity: 1, duration: 0.8, delay: 1.6 }));
        relayState.people.forEach((p) => add(p, false));
        if (step >= 1) showSub(true);
      },
      step(n) { showSub(n >= 1); },
      dispose() { offRelay(); },
    };
  },
};
