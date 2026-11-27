import QRCode from 'qrcode';
import * as D from '../engine/draw.js';

const SITE = import.meta.env.VITE_VED_SITE || 'https://ved.atladeus.com';

/*
  Title. Crisp text rises in and a dimension line is drawn under it like a drawing
  annotation. On the second click the subtitle comes in under the line (what you get:
  an idea turned into income, or the tips for tomorrow). Particles swirl outside the frame.
  Bottom left, a QR code to ved.atladeus.com: the room joins here, and their phones take part
  later (the vote on the prototypes, the buzzes, the go-live). x 80–420, y 690–810.
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
      gsap.set(join, { opacity: 0 });
    }

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
        if (step >= 1) showSub(true);
      },
      step(n) { showSub(n >= 1); },
    };
  },
};
