import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { codeApp } from '../engine/console.js';

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
    app        x 80–1480, y 280–760: sessions x 82–302, conversation x 304–1178,
               helpers panel x 1180–1478 (each helper with its run time)
*/

const AX = 80, AY = 280, AW = 1400, AH = 480;

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
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*2.6)">Gjør jobben<br>i sessionen selv.<br><em>Hjelpere</em> til research.</h2>`;
    const svg = D.stage(el);
    const tip = ctx.$('.tip');
    let P = {};

    const reset = () => { svg.innerHTML = ''; P = {}; };

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const app = codeApp(svg, AX, AY, AW, AH, { size: 18, sidebar: 220, panel: 300 });
        P.app = app;
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
        const h1 = P.app.helper('DVR-innlogging');
        tl.fromTo(h1.g, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3 }, 0.3);
        h1.run(tl, 0.3, { from: 0, to: 12, dur: 1.4 });
        h1.done(tl, 1.7);
        t.agent(tl, 'Finn ut hvordan DVR-API-et logger inn', '3 verktøykall · 12s', 1.8, { result: 'Token i header, fornyes hver time.' });
        t.tool(tl, 'Edit', 'src/dvr.ts', '+12 −2', 2.6);
        t.ctx(tl, 210, 2.6, 0.6);
      }

      if (i === 2) {
        // a whole job to a helper, in the background; the lead carries on
        const t = P.t;
        t.fadeOld(tl, 0);
        t.agent(tl, 'Bygg hele fakturamodulen', 'kjører i bakgrunnen', 0.3);
        P.h2 = P.app.helper('Fakturamodul');
        tl.fromTo(P.h2.g, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3 }, 0.3);
        P.h2.run(tl, 0.3, { from: 0, to: 38 * 60, dur: 3.0 });
        t.tool(tl, 'Edit', 'src/eksport.ts', '+20 −4', 1.0);
        P.spin = t.spin(tl, 'Lager eksport', 1.4, { from: 0, to: 41 * 60 + 12, dur: 3.6 });
        t.ctx(tl, 320, 1.4, 3.6);
        // the helper finishes; nothing reaches the lead
        P.h2.done(tl, 3.3);
      }

      if (i === 3) {
        // the lead breaks off its own work to go and check
        const t = P.t;
        P.spin.end(tl, 0.3, '■ Avbrutt: eksport', 'dim');
        t.fadeOld(tl, 0.6);
        t.say(tl, 'Fakturamodulen har ikke svart. Sjekker.', 0.9);
        t.tool(tl, 'TaskOutput', 'fakturamodul', 'Ferdig for 40 min siden. 12 filer.', 1.6, { tone: '#8fe3a2' });
        P.h2.done(tl, 2.2, 'hentet');
        t.say(tl, 'Tilbake til eksporten.', 3.0);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
