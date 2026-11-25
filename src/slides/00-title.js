import * as D from '../engine/draw.js';

/*
  Title. Crisp text rises in and a dimension line is drawn under it like a drawing
  annotation. On the second click the subtitle comes in under the line (what you get:
  an idea turned into income, or the tips for tomorrow). Particles swirl outside the frame.
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
      <p class="title-sub" style="position:absolute;left:0;right:0;top:calc(var(--u)*43);text-align:center;margin:0;
        font:600 calc(var(--u)*1.75)/1.4 var(--font-display);color:var(--fg);opacity:0">Se hvordan AI gjør en idé om til inntekt.<br><span style="color:var(--muted)">Eller ta med deg grepene til jobb i morgen.</span></p>`;
    const h1 = ctx.$('.title-text');
    const sub = ctx.$('.title-sub');

    // Dimension line under the title (clear of the letters).
    const svg = D.stage(el);
    const dim = D.g(svg);
    D.p(dim, 'M300 655 H1300 M300 640 V670 M1300 640 V670', 'acc2');
    D.hide(dim);

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
        if (step >= 1) showSub(true);
      },
      step(n) { showSub(n >= 1); },
    };
  },
};
