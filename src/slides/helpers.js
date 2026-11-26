import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { codeApp, STATE } from '../engine/console.js';

/*
  Tip: the lead (the agent in a session) does the work itself; helpers (subagents) for
  research. Shown in the Claude Code app.
    0. The lead works: Read, Edit, Bash, the context fills steadily.
    1. A research helper: a short Task block comes back in seconds, the lead uses the answer.
    2. A whole job to a helper, in the background. The lead carries on with its own work.
       The background list shows the helper done; nobody tells the lead.
    3. The lead has to break off its own work to check on the helper: done 40 minutes ago.

  Layout zones (svg units):
    tip        x 80–540, y 110–260
    background x 80–520, y 330–520 (steps 2–3)
    app        x 560–1480, y 150–760
*/

const AX = 560, AY = 150, AW = 920, AH = 610;
const BX = 80, BY = 330, BW = 440;

export default {
  id: 'helpers',
  title: 'Hjelpere',
  steps: 4,
  notes: [
    'Leaden gjør jobben selv. Den har hele konteksten.',
    'Hjelper til research: kort oppdrag, svar på sekunder.',
    'Hjelper med en hel jobb i bakgrunnen: ferdig, men sier aldri fra.',
    'Leaden må avbryte sitt eget arbeid for å sjekke. Det løser vakta på neste.',
  ],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    el.innerHTML = `
      <div class="pin-tl label">Sessions</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.2)">Gjør jobben<br>i sessionen selv.<br><em>Hjelpere</em> til research.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    // background jobs, as listed by the session
    function bgList() {
      const g = D.g(svg, { 'data-unit': '' });
      D.el('rect', { x: BX, y: BY, width: BW, height: 190, rx: 12, style: 'fill: #0d0907; stroke: var(--fg)', 'stroke-width': 2.5 }, g);
      D.text(g, BX + 22, BY + 38, 'BAKGRUNNSJOBBER', 'bh', { style: 'font: 700 15px var(--font-mono); letter-spacing: .14em; fill: var(--muted)' });
      D.p(g, `M${BX + 20} ${BY + 54} H${BX + BW - 20}`, '', { style: 'fill: none; stroke: #33271d', 'stroke-width': 2 });
      const dot = D.el('circle', { cx: BX + 32, cy: BY + 92, r: 8, style: `fill: ${STATE.work[0]}` }, g);
      D.text(g, BX + 52, BY + 98, 'fakturamodul', 'bn', { style: 'font: 700 20px var(--font-mono); fill: #f3e9da' });
      const st = D.text(g, BX + BW - 22, BY + 98, 'jobber', 'bs', { 'text-anchor': 'end', style: `font: 700 17px var(--font-mono); fill: ${STATE.work[0]}` });
      const sub = D.text(g, BX + 52, BY + 132, 'hjelper · startet 03:52', 'bb', { style: 'font: 400 16px var(--font-mono); fill: var(--muted)' });
      const set = (tl, s, label, subStr, at) => tl.call(() => {
        const c = STATE[s][0];
        dot.setAttribute('style', `fill: ${c}`);
        st.textContent = label; st.setAttribute('style', `font: 700 17px var(--font-mono); fill: ${c}`);
        if (subStr) sub.textContent = subStr;
      }, null, at);
      return { g, set };
    }

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const app = codeApp(svg, AX, AY, AW, AH, { size: 18 });
        tl.fromTo(app.root, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.2);
        const t = app.session('eksport', 'Eksport', 'work');
        app.show(tl, 'eksport', 0.2);
        t.user(tl, 'Lag eksport til CSV.', 0.6);
        t.tool(tl, 'Read', 'src/rapport.ts', '212 linjer', 1.1);
        t.tool(tl, 'Edit', 'src/eksport.ts', '+48 −3', 1.8);
        t.tool(tl, 'Bash', 'npm test', '24 bestått', 2.5);
        t.ctx(tl, 180, 0.6, 2.4);
        P.t = t;
      }

      if (i === 1) {
        // a research helper: short errand, quick answer
        const t = P.t;
        t.fadeOld(tl, 0);
        P.a1 = t.agent(tl, 'Finn ut hvordan DVR-API-et logger inn', '3 verktøykall · 12s', 0.3, { result: 'Token i header, fornyes hver time.' });
        t.tool(tl, 'Edit', 'src/dvr.ts', '+12 −2', 1.8);
        t.ctx(tl, 210, 1.8, 0.6);
      }

      if (i === 2) {
        // a whole job to a helper, in the background; the lead carries on
        const t = P.t;
        t.fadeOld(tl, 0);
        t.agent(tl, 'Bygg hele fakturamodulen', 'kjører i bakgrunnen', 0.3);
        P.bg = bgList();
        tl.fromTo(P.bg.g, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5 }, 0.8);
        t.tool(tl, 'Edit', 'src/eksport.ts', '+20 −4', 1.4);
        P.spin = t.spin(tl, 'Lager eksport', 2.0, { from: 0, to: 41 * 60 + 12, dur: 4.0 });
        t.ctx(tl, 320, 2.0, 4.0);
        // the helper finishes; nothing reaches the lead
        P.bg.set(tl, 'done', 'ferdig', 'hjelper · ferdig 04:32', 3.0);
        tl.fromTo(P.bg.g, { scale: 1.04, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.4, immediateRender: false }, 3.0);
      }

      if (i === 3) {
        // the lead breaks off its own work to go and check
        const t = P.t;
        P.spin.end(tl, 0.3, '■ Avbrutt: eksport', 'dim');
        t.fadeOld(tl, 0.6);
        t.say(tl, 'Fakturamodulen har ikke svart. Sjekker.', 0.9);
        t.tool(tl, 'TaskOutput', 'fakturamodul', 'Ferdig for 40 min siden. 12 filer.', 1.6, { tone: '#8fe3a2' });
        P.bg.set(tl, 'done', 'hentet', null, 2.2);
        t.say(tl, 'Tilbake til eksporten.', 3.0);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
