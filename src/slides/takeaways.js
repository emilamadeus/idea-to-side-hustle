import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { vedTruck } from '../engine/props.js';

/*
  Closing: every standalone tip from the talk on one drawing sheet, short enough to photograph.
  The second half of the subtitle ("ta med deg grepene til jobb i morgen").
    0. The journey is drawn as a route with five stations. The firewood truck drives it from Idé
       to Lansering; as it passes a station, the station lights and that stage's tips drop in under
       it as numbered tags. Then the strip below fills with the tips from the rest of the talk
       (Arbeidsflyt and Bak kulissene).

  Layout zones (svg units):
    tip      x 80–540, y 110–240
    route    y 290 (truck above it, y 254–290), stations at the column centres
    columns  five, 288 wide, centres x 224 … 1376: label y 334, tags from y 352 (264 wide, ≤ 4)
    strip    y 660–760: label x 80–280, chips x 300–1520 in two rows
*/

const STAGES = [
  { stage: 'Idé', tips: ['Sjekk ideen før du starter'] },
  { stage: 'Plan', tips: ['La AI-en føre en levende spec', 'Definer hele scopet før du starter', 'Planlegg alt før du bygger', 'Del opp instruksjonsfilene'] },
  { stage: 'Bygg', tips: ['Lag fire versjoner, velg én', 'Et bilde slår en beskrivelse', 'Beskriv målet, ikke veien', 'Commit etter hvert steg'] },
  { stage: 'Kvalitet', tips: ['La den sjekke sitt eget arbeid', 'Vis med skjermbilde', 'Ny session når den lapper symptomer'] },
  { stage: 'Lansering', tips: ['Lanser før det er perfekt'] },
];
const REST = [
  'Én session per oppgave', 'Hjelpere til research', 'En vakt hvert 10. minutt', 'Varsel når den trenger deg',
  'Medium effort er nok', 'Gjør det du gjentar til en skill', 'La AI-en følge andre team', 'Claude og ChatGPT via én fil',
];
const ROUTE = 290, X0 = 100, X1 = 1500;
const cx = (k) => 224 + k * 288;
const TW = 264, TH = 64, TG = 10, TY = 352;
const INK = '#1a120c';

// words into lines of at most n characters
const wrap = (s, n) => s.split(' ').reduce((ls, w) => {
  const last = ls[ls.length - 1];
  if (last && (last + ' ' + w).length <= n) ls[ls.length - 1] = last + ' ' + w; else ls.push(w);
  return ls;
}, []);

export default {
  id: 'takeaways',
  title: 'Grepene',
  steps: 1,
  notes: ['Alt på ett ark. Ta bilde av det.'],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Ta med deg</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Grepene, på <em>ett ark</em>.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const truck = (parent) => vedTruck(parent, { 'data-bg': '' });
    const tag = (parent, x, y, n, text) => {
      const g = D.g(parent, { 'data-unit': '' });
      D.el('rect', { x, y, width: TW, height: TH, rx: 8, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 2 }, g);
      D.text(g, x + 16, y + 26, String(n).padStart(2, '0'), 'tn', { style: 'font: 700 14px var(--font-mono); fill: var(--accent-2)' });
      const lines = wrap(text, 22);
      lines.slice(0, 2).forEach((l, i) => D.text(g, x + 50, y + (lines.length > 1 ? 27 + i * 22 : 38), l, 'tt', { style: 'font: 700 18px var(--font-display); fill: var(--fg)' }));
      return g;
    };

    const reset = () => { svg.innerHTML = ''; P = {}; };
    const play = () => {
      const tl = gsap.timeline();
      stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
      stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
      tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
      // the route and its stations
      const bg = D.g(svg, { 'data-bg': '' });
      const road = D.p(bg, `M${X0} ${ROUTE} H${X1}`, '', { style: 'fill: none; stroke: var(--deco); stroke-dasharray: 12 9', 'stroke-width': 3 });
      tl.add(D.drawOn(road, { duration: 1.0 }), 0.3);
      P.stations = STAGES.map((s, k) => {
        const dot = D.el('circle', { cx: cx(k), cy: ROUTE, r: 10, style: 'fill: #16100b; stroke: var(--deco)', 'stroke-width': 3 }, bg);
        tl.fromTo(dot, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.5 + k * 0.08);
        return dot;
      });
      // the truck drives the journey; each station lights as it passes, and its tips drop in
      const tr = truck(svg);
      const DRIVE = 4.2, T0 = 1.0;
      const at = (x) => T0 + ((x - 40 - (X0 - 70)) / ((X1 - 50) - (X0 - 70))) * DRIVE; // when the truck's middle passes x
      tl.fromTo(tr, { x: X0 - 70, y: ROUTE, opacity: 0 }, { opacity: 1, duration: 0.3 }, T0 - 0.2);
      tl.fromTo(tr, { x: X0 - 70 }, { x: X1 - 50, duration: DRIVE, ease: 'none', immediateRender: false }, T0);
      let n = 0;
      STAGES.forEach((s, k) => {
        const t = at(cx(k));
        tl.to(P.stations[k], { attr: { style: `fill: #ffd23f; stroke: ${INK}` }, duration: 0.2 }, t);
        tl.fromTo(P.stations[k], { scale: 1.6, svgOrigin: `${cx(k)} ${ROUTE}` }, { scale: 1, svgOrigin: `${cx(k)} ${ROUTE}`, duration: 0.4, ease: 'back.out(3)' }, t);
        const head = D.text(svg, cx(k), 334, s.stage.toUpperCase(), 'sh', { 'text-anchor': 'middle', 'data-unit': '', style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--accent)' });
        tl.fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t);
        s.tips.forEach((text, j) => {
          const g = tag(svg, cx(k) - TW / 2, TY + j * (TH + TG), ++n, text);
          tl.fromTo(g, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, t + 0.15 + j * 0.12);
        });
      });
      // the rest of the talk, in a strip below
      const tEnd = T0 + DRIVE + 0.3;
      const strip = D.g(svg, { 'data-unit': '' });
      D.text(strip, 80, 688, 'ARBEIDSFLYT', 'rl', { style: 'font: 700 16px var(--font-mono); letter-spacing: .16em; fill: var(--accent)' });
      D.text(strip, 80, 712, 'OG BAK KULISSENE', 'rl2', { style: 'font: 700 13px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      tl.fromTo(strip, { opacity: 0 }, { opacity: 1, duration: 0.4 }, tEnd);
      const CW = (1520 - 300 - 3 * 14) / 4;
      REST.forEach((text, j) => {
        const x = 300 + (j % 4) * (CW + 14), y = 664 + Math.floor(j / 4) * 50;
        const g = D.g(svg, { 'data-unit': '' });
        D.el('rect', { x, y, width: CW, height: 40, rx: 20, style: 'fill: #1d1510; stroke: var(--deco)', 'stroke-width': 2 }, g);
        D.text(g, x + 18, y + 26, String(++n).padStart(2, '0'), 'cn', { style: 'font: 700 13px var(--font-mono); fill: var(--accent-2)' });
        D.text(g, x + 48, y + 26, text, 'ct', { style: 'font: 700 15px var(--font-display); fill: var(--fg)' });
        tl.fromTo(g, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, tEnd + 0.2 + j * 0.08);
      });
      // the truck has delivered: it fades at the end of the road
      tl.to(tr, { opacity: 0, duration: 0.5 }, T0 + DRIVE + 0.1);
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
