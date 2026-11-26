import gsap from 'gsap';
import * as D from '../engine/draw.js';
import { codeApp } from '../engine/console.js';

/*
  Tip: the lead (the agent in a session) does the work itself; helpers (subagents) for
  research. Shown in the Claude Code app.
    0. The lead works: Read, Edit, Bash, the context fills steadily.
    1. A research helper: a short Task block comes back in seconds, the lead uses the answer.
    2. A whole job to a helper, in the background; the lead waits for it before the next job.
       The helper panel keeps showing it running, past two hours; it never reports back.
    3. You ask what it is doing: nothing, waiting on the helper (RAM: 11 of 64 GB free, 18 needed,
       the helper holds 24). You ask if the helper is done; it checks: done 40 minutes ago,
       never reported. 24 GB freed, the next job starts.

  Layout zones (svg units):
    tip        x 80–540, y 110–260
    app        x 560–1480, y 150–760: sessions x 562–732, conversation x 734–1238,
               helpers panel x 1240–1478 (each helper with its run time)
*/

const AX = 560, AY = 150, AW = 920, AH = 610;

export default {
  id: 'helpers',
  title: 'Hjelpere',
  steps: 4,
  notes: [
    'Leaden gjør jobben selv. Den har hele konteksten.',
    'Hjelper til research: kort oppdrag, svar på sekunder.',
    'Hjelper med en hel jobb i bakgrunnen. Leaden venter på den før neste jobb.',
    'Hva jobber du med? Ingenting, den venter på hjelperen og RAM. Først når du spør, sjekker den: ferdig for 40 minutter siden. Det løser vakta på neste.',
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

    const play = (i) => {
      const tl = gsap.timeline();
      if (i === 0) {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        tl.add(fx.rise(tip, { stagger: 0.015 }), 0);
        const app = codeApp(svg, AX, AY, AW, AH, { size: 18, sidebar: 170, panel: 240 });
        P.app = app;
        tl.fromTo(app.root, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.2);
        const t = app.session('app', 'Appen', 'work');
        app.show(tl, 'app', 0.2);
        t.user(tl, 'Lag rapportsiden.', 0.6);
        t.tool(tl, 'Read', 'src/rapport.ts', '212 linjer', 1.1);
        t.tool(tl, 'Edit', 'src/rapport.ts', '+48 −3', 1.8);
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
        t.agent(tl, 'Finn DVR-innlogging', '3 verktøykall · 12s', 1.8, { result: 'Token i header, fornyes hver time.' });
        t.tool(tl, 'Edit', 'src/dvr.ts', '+12 −2', 2.6);
        t.ctx(tl, 210, 2.6, 0.6);
      }

      if (i === 2) {
        // a whole job to a helper, in the background; the lead waits for it before the next job
        const t = P.t;
        t.fadeOld(tl, 0);
        t.user(tl, 'Bygg fakturamodulen med en hjelper. Ta eksporten etterpå.', 0.3);
        t.agent(tl, 'Bygg fakturamodulen', 'kjører i bakgrunnen', 1.0);
        P.h2 = P.app.helper('Fakturamodul');
        tl.fromTo(P.h2.g, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3 }, 1.0);
        // it keeps showing as running: it never reports back
        P.h2.run(tl, 1.0, { from: 0, to: 2 * 3600 + 14 * 60, dur: 4.4 });
        t.state(tl, 'block', 1.6);
      }

      if (i === 3) {
        // you ask what it is doing: nothing, it is waiting on the helper and the RAM
        const t = P.t;
        t.fadeOld(tl, 0.1);
        t.user(tl, 'Hva jobber du med nå?', 0.3);
        t.say(tl, 'Ingenting kjører nå. Venter på at hjelperen blir ferdig før neste jobb. 11 / 64 GB RAM ledig, 18 GB trengs. Hjelperen bruker 24 GB.', 1.0);
        P.h2.run(tl, 0, { from: 2 * 3600 + 14 * 60, to: 2 * 3600 + 17 * 60, dur: 3.6 });
        t.user(tl, 'Er ikke hjelperen ferdig ennå?', 2.6);
        t.say(tl, 'Sjekker status på hjelperen.', 3.3);
        t.tool(tl, 'TaskOutput', 'fakturamodul', 'Ferdig for 40 min siden.', 4.0, { tone: '#8fe3a2' });
        P.h2.done(tl, 4.0, 'ferdig');
        t.say(tl, 'Den ble ferdig uten å melde fra. 24 GB frigjort. Starter eksporten.', 4.8);
        t.state(tl, 'work', 5.2);
        t.tool(tl, 'Edit', 'src/eksport.ts', '+52 −0', 5.6);
      }
      return tl;
    };

    return D.stepper(ctx, { reset, play });
  },
};
