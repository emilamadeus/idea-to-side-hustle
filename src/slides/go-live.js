import gsap from 'gsap';

/*
  Placeholder for the Lansering stage: the firewood subscription goes live and finds its first
  customers. To be built.
*/
export default {
  id: 'go-live',
  title: 'Lansering (kommer)',
  steps: 1,
  notes: ['Plassholder: vedabonnementet går live.'],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Lansering</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.4)">Lansering<br><em>kommer</em>.</h2>`;
    const tip = ctx.$('.tip');
    return {
      enter() {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        ctx.track(fx.rise(tip, { stagger: 0.015 }));
      },
      step() {},
    };
  },
};
