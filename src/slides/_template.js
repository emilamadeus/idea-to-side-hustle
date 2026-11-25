/*
  Copy this file to add a slide, then register it in src/slides/index.js.

  Contract:
    enter({ step, dir })  Must render the cumulative state for `step`.
                          dir = -1 means we arrived going backwards (step is the last one).
    step(n, dir)          Move one build step forward (dir 1) or back (dir -1).
    leave({ dir })        Optional. Return a Promise to hold the exit until it resolves.

  ctx gives you: el, stage (particles, fly, rig, scene, camera, bloom), shapes, fx,
  gsap, THREE, track(), tl(), tick(fn), $(), $$().
*/
export default {
  id: 'template',          // used in the URL: #/template/0
  title: 'Template',       // shown in overview + presenter console
  section: '',             // optional group label
  steps: 2,
  notes: [
    'Speaker note for step 1.',
    'Speaker note for step 2.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Label</div>
      <h1 class="center"><span class="h1">Heading</span></h1>
      <p class="pin-bl body" data-step="1" style="opacity:0">Revealed on step 2</p>`;

    const show = (n, animate = true) => {
      const later = ctx.$('[data-step="1"]');
      if (n >= 1) animate ? ctx.track(fx.appear(later)) : (later.style.opacity = 1);
      else ctx.track(fx.vanish(later));
    };

    return {
      enter({ step }) {
        stage.particles.morphTo(shapes.sphere(stage), { order: 'radial' });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0] });
        ctx.track(fx.rise(ctx.$('.h1')));
        if (step >= 1) show(step, false);
      },
      step(n) { show(n); },
    };
  },
};
