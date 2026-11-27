import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { relaySend } from '../engine/relay.js';
import { FILL, vedTruck } from '../engine/props.js';

/*
  Stage divider: the journey from idea to launch as a road with five stations, each with a small
  drawing of its stage. The road draws up to the current station, which lights up; earlier
  stations are filled, later ones wait in outline. The firewood truck drives from the last
  station to just before this one, carrying a bigger load at every stage.
  One slide per stage, made by chapter(k).

  Layout zones (svg units):
    stage name   centred, y 250–480 (DOM)
    icons        above each station, centred y 500 (about 60 tall)
    journey line x 240–1360, y 560; station labels y 622
    truck        on the road between the previous station and this one (never over a station)
*/

export const STAGES = ['Idé', 'Plan', 'Bygg', 'Kvalitet', 'Lansering'];
const INK = '#1a120c';
// a small working drawing per stage: a bulb, a drawing sheet, stacked blocks, a magnifier, a flag.
// on: filled, in ink; off: outline only
function icon(g, j, x, y, on) {
  const fill = (c, w = 2.5) => (on ? FILL(c, w) : { style: 'fill: none; stroke: #6b5a48', 'stroke-width': w });
  const ln = { style: `fill: none; stroke: ${on ? INK : '#6b5a48'}; stroke-linecap: round; stroke-linejoin: round`, 'stroke-width': 2.5 };
  if (j === 0) { D.el('circle', { cx: x, cy: y - 6, r: 13, ...fill('#ffd23f') }, g); D.el('rect', { x: x - 7, y: y + 7, width: 14, height: 10, rx: 2, ...fill('#9b8f83') }, g); D.p(g, `M${x - 4} ${y - 6} l4 6 l4 -6`, '', ln); }
  if (j === 1) { D.p(g, `M${x - 14} ${y - 20} H${x + 8} L${x + 15} ${y - 13} V${y + 18} H${x - 14} Z`, '', fill('#fff3e3')); [-8, -1, 6, 12].forEach((d) => D.p(g, `M${x - 8} ${y + d} H${x + 8}`, '', ln)); }
  if (j === 2) { [[-14, 4, '#c4562a'], [0, 4, '#2f5b5a'], [-7, -12, '#55603a']].forEach(([dx, dy, c]) => D.el('rect', { x: x + dx, y: y + dy, width: 14, height: 14, rx: 2, ...fill(c) }, g)); }
  if (j === 3) { D.el('circle', { cx: x - 3, cy: y - 3, r: 11, ...fill('#7fd0ff') }, g); D.p(g, `M${x + 5} ${y + 5} L${x + 15} ${y + 15}`, '', { ...ln, 'stroke-width': 5 }); }
  if (j === 4) { D.p(g, `M${x - 10} ${y + 18} V${y - 20}`, '', { ...ln, 'stroke-width': 3 }); D.p(g, `M${x - 10} ${y - 20} H${x + 14} L${x + 8} ${y - 12} L${x + 14} ${y - 4} H${x - 10} Z`, '', fill('#ff5a1f')); }
}
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
        <div class="ch-num label" style="position:absolute;left:0;right:0;top:calc(var(--u)*15);text-align:center;font-size:calc(var(--u)*1.4)">REISEN · ${k + 1} AV ${STAGES.length}</div>
        <h1 class="ch-name" style="position:absolute;left:0;right:0;top:calc(var(--u)*19);text-align:center;margin:0;
          font-family:var(--font-display);font-weight:var(--display-weight);letter-spacing:var(--display-tracking);
          font-size:calc(var(--u)*11);line-height:1;color:var(--fg)">${STAGES[k]}</h1>`;
      const svg = D.stage(el);
      const name = ctx.$('.ch-name');

      const play = (i, instant) => {
        // the phones' lobby shows where we are in the talk
        if (!instant && !ctx.deck?.instant) relaySend({ type: 'where', label: `${k + 1} · ${STAGES[k]}` });
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
          // the stage's drawing above its station: full colour behind us, outline ahead
          const ic = D.g(svg, { 'data-bg': '', opacity: j <= k ? 1 : 0.35 });
          icon(ic, j, sx(j), Y - 60, j <= k);
          ic.setAttribute('transform', `translate(${sx(j)} ${Y - 60}) scale(1.45) translate(${-sx(j)} ${-(Y - 60)})`);
          tl.fromTo(ic, { opacity: 0 }, { opacity: j <= k ? 1 : 0.35, duration: 0.35 }, j <= k ? 0.25 + j * 0.25 : 0.5 + k * 0.25);
          const g = D.g(svg, { 'data-unit': '' });
          const past = j < k, cur = j === k;
          D.el('circle', { cx: sx(j), cy: Y, r: cur ? 20 : 13, style: `fill: ${cur || past ? 'var(--accent)' : '#16100b'}; stroke: ${cur || past ? 'var(--accent)' : 'var(--deco)'}`, 'stroke-width': 4 }, g);
          D.text(g, sx(j), Y + 62, s, 'st', { 'text-anchor': 'middle', style: `font: ${cur ? 800 : 600} ${cur ? 28 : 22}px var(--font-display); fill: ${cur ? 'var(--fg)' : past ? 'var(--muted)' : '#6b5a48'}` });
          const at = j <= k ? 0.2 + j * 0.25 : 0.4 + k * 0.25 + 0.1;
          tl.fromTo(g, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 }, at);
          if (cur) tl.fromTo(g.querySelector('circle'), { scale: 0.3, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, ease: 'back.out(3)', immediateRender: false }, at + 0.1);
        });
        // the truck: from the last station to just short of this one, a bigger load every stage
        const truck = vedTruck(svg, { 'data-bg': '' }, { load: Math.min(6, k + 2) });
        const from = k === 0 ? X0 - 210 : sx(k - 1) + 36, to = sx(k) - 128;
        tl.fromTo(truck, { x: from, y: Y - 4, opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3);
        tl.fromTo(truck, { x: from }, { x: to, duration: 1.1 + k * 0.1, ease: 'power2.inOut', immediateRender: false }, 0.35);
        return tl;
      };

      return D.stepper(ctx, { reset: () => { svg.innerHTML = ''; }, play });
    },
  };
}

/*
  Part divider for what comes after the journey (Arbeidsflyt, Bak kulissene, Ekte prosjekter):
  the name, and the talk's parts as a small line underneath. Parts behind us are filled, this
  one is lit, later ones wait. parts = every part's name, the journey first.
*/
export function part(n, name, parts = ['Reisen', name]) {
  return {
    id: `del-${n}`,
    title: `Del ${n} · ${name}`,
    steps: 1,
    notes: [`Del ${n}: ${name}.`],

    create(ctx) {
      const { el, stage, shapes, fx } = ctx;
      el.innerHTML = `
        <div class="ch-num label" style="position:absolute;left:0;right:0;top:calc(var(--u)*15);text-align:center;font-size:calc(var(--u)*1.4)">DEL ${n}</div>
        <h1 class="ch-name" style="position:absolute;left:0;right:0;top:calc(var(--u)*19);text-align:center;margin:0;
          font-family:var(--font-display);font-weight:var(--display-weight);letter-spacing:var(--display-tracking);
          font-size:calc(var(--u)*10);line-height:1;color:var(--fg)">${name}</h1>`;
      const svg = D.stage(el);
      const nm = ctx.$('.ch-name');
      const play = (i, instant) => {
        if (!instant && !ctx.deck?.instant) {
          relaySend({ type: 'where', label: `Del ${n} · ${name}` });
          // the journey is over: the shop closes, and every phone goes back to the talk's page
          if (n === 2) relaySend({ type: 'close' });
        }
        const tl = gsap.timeline();
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(nm, { stagger: 0.03 }), 0);
        // where we are in the talk: the parts as a small line
        const cur = n - 1;
        const x0 = 470, x1 = 1130, y = 600, sxx = (j) => x0 + (j * (x1 - x0)) / Math.max(1, parts.length - 1);
        const g = D.g(svg, { 'data-unit': '' });
        D.p(g, `M${x0} ${y} H${x1}`, '', { style: 'fill: none; stroke: #4a3c30', 'stroke-width': 3, 'stroke-linecap': 'round', 'data-bg': '' });
        D.p(g, `M${x0} ${y} H${sxx(cur)}`, '', { style: 'fill: none; stroke: var(--muted)', 'stroke-width': 3, 'stroke-linecap': 'round', 'data-bg': '' });
        parts.forEach((p2, j) => {
          const now = j === cur, past = j < cur;
          D.el('circle', { cx: sxx(j), cy: y, r: now ? 11 : 8, style: now ? 'fill: var(--accent); stroke: var(--accent)' : past ? 'fill: var(--muted); stroke: var(--muted)' : 'fill: var(--bg, #120905); stroke: #6b5a48', 'stroke-width': 2.5 }, g);
          D.text(g, sxx(j), y + 42, p2, 'pst', { 'text-anchor': 'middle', style: `font: ${now ? 700 : 600} 17px var(--font-display); fill: ${now ? 'var(--accent)' : past ? 'var(--muted)' : '#6b5a48'}` });
        });
        tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.4);
        return tl;
      };
      return D.stepper(ctx, { reset: () => { svg.innerHTML = ''; }, play });
    },
  };
}
