import gsap from 'gsap';
import * as D from '../engine/draw.js';

/*
  Stage divider: the journey from idea to launch as a line with five stations. The line
  draws up to the current station, which lights up; earlier stations are filled, later ones
  wait. One slide per stage, made by chapter(k).

  Layout zones (svg units):
    stage name   centred, y 250–420 (DOM)
    journey line x 240–1360, y 560; station labels y 620
*/

export const STAGES = ['Idé', 'Plan', 'Bygg', 'Kvalitet', 'Lansering'];
const X0 = 240, X1 = 1360, Y = 560;
const sx = (k) => X0 + (k * (X1 - X0)) / (STAGES.length - 1);

export function chapter(k) {
  return {
    id: `kap-${k + 1}`,
    title: `${k + 1} · ${STAGES[k]}`,
    steps: 1,
    stage: k,
    notes: [`Del ${k + 1}: ${STAGES[k]}.`],

    create(ctx) {
      const { el, stage, shapes, fx } = ctx;
      el.innerHTML = `
        <div class="ch-num label" style="position:absolute;left:0;right:0;top:calc(var(--u)*15);text-align:center;font-size:calc(var(--u)*1.4)">DEL ${k + 1} AV ${STAGES.length}</div>
        <h1 class="ch-name" style="position:absolute;left:0;right:0;top:calc(var(--u)*19);text-align:center;margin:0;
          font-family:var(--font-display);font-weight:var(--display-weight);letter-spacing:var(--display-tracking);
          font-size:calc(var(--u)*11);line-height:1;color:var(--fg)">${STAGES[k]}</h1>`;
      const svg = D.stage(el);
      const name = ctx.$('.ch-name');

      const play = () => {
        const tl = gsap.timeline();
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(name, { stagger: 0.03 }), 0);
        // the whole route, faint
        D.p(svg, `M${X0} ${Y} H${X1}`, '', { style: 'fill: none; stroke: var(--deco)', 'stroke-width': 4, 'stroke-linecap': 'round', 'data-bg': '' });
        // the part already travelled, drawn up to this stage
        const done = D.p(svg, `M${X0} ${Y} H${sx(k)}`, '', { style: 'fill: none; stroke: var(--accent)', 'stroke-width': 6, 'stroke-linecap': 'round', 'data-bg': '' });
        if (k > 0) tl.add(D.drawOn(done, { duration: 0.4 + k * 0.25 }), 0.2);
        STAGES.forEach((s, j) => {
          const g = D.g(svg, { 'data-unit': '' });
          const past = j < k, cur = j === k;
          D.el('circle', { cx: sx(j), cy: Y, r: cur ? 20 : 13, style: `fill: ${cur || past ? 'var(--accent)' : '#16100b'}; stroke: ${cur || past ? 'var(--accent)' : 'var(--deco)'}`, 'stroke-width': 4 }, g);
          D.text(g, sx(j), Y + 62, s, 'st', { 'text-anchor': 'middle', style: `font: ${cur ? 800 : 600} ${cur ? 28 : 22}px var(--font-display); fill: ${cur ? 'var(--fg)' : past ? 'var(--muted)' : '#6b5a48'}` });
          const at = j <= k ? 0.2 + j * 0.25 : 0.4 + k * 0.25 + 0.1;
          tl.fromTo(g, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 }, at);
          if (cur) tl.fromTo(g.querySelector('circle'), { scale: 0.3, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, ease: 'back.out(3)', immediateRender: false }, at + 0.1);
        });
        return tl;
      };

      return D.stepper(ctx, { reset: () => { svg.innerHTML = ''; }, play });
    },
  };
}
