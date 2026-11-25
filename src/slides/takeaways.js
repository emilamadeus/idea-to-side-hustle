import gsap from 'gsap';

/*
  Closing: every standalone tip from the talk on one page, grouped by stage, short enough to
  photograph. The second half of the subtitle ("ta med deg grepene til jobb i morgen").
  The stages light up one column at a time; on the last step everything is lit.

  Layout: four columns under the heading, x 80–1520, y 300–760 (DOM grid).
*/

const GROUPS = [
  { stage: 'Idé', tips: ['Sjekk ideen før du starter', 'Lag fire versjoner, velg én'] },
  { stage: 'Plan', tips: ['Beskriv målet, ikke veien', 'Gi hele omfanget før du starter', 'Planlegg bunken i auto mode', 'La AI-en føre en levende spec', 'Del opp instruksjonsfilene'] },
  { stage: 'Bygg', tips: ['Gi den et bilde, ikke en liste', 'Én økt per oppgave, én hovedøkt', 'Hjelpere til research', 'En vakt hvert 10. minutt', 'Få varsel når den trenger deg'] },
  { stage: 'Kvalitet', tips: ['La den sjekke sitt eget arbeid', 'Vis med skjermbilde', 'Ny økt når den lapper symptomer', 'Medium effort er nok'] },
];

export default {
  id: 'takeaways',
  title: 'Grepene',
  steps: 1,
  notes: ['Alt på ett ark. Ta bilde av det.'],

  create(ctx) {
    const { el, stage, shapes, fx } = ctx;
    let n = 0;
    const cols = GROUPS.map((g) => `
      <section class="tk-col">
        <h3>${g.stage}</h3>
        <ol>${g.tips.map((t) => `<li><span class="tk-n">${String(++n).padStart(2, '0')}</span>${t}</li>`).join('')}</ol>
      </section>`).join('');
    el.innerHTML = `
      <style>
        .slide-takeaways .tk-grid { position: absolute; left: var(--pad); right: var(--pad); top: calc(var(--u) * 19);
          display: grid; grid-template-columns: repeat(4, 1fr); gap: calc(var(--u) * 2.4); }
        .slide-takeaways h3 { margin: 0 0 calc(var(--u) * 1.4); padding-bottom: calc(var(--u) * .8);
          border-bottom: 2px solid var(--accent); font: 700 calc(var(--u) * 1.3) var(--font-mono);
          letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
        .slide-takeaways ol { list-style: none; margin: 0; padding: 0; display: grid; gap: calc(var(--u) * 1.5); }
        .slide-takeaways li { display: grid; grid-template-columns: calc(var(--u) * 3) 1fr; align-items: baseline;
          font: 600 calc(var(--u) * 1.7)/1.25 var(--font-display); color: var(--fg); }
        .slide-takeaways .tk-n { font: 700 calc(var(--u) * 1.05) var(--font-mono); color: var(--muted); }
      </style>
      <div class="pin-tl label">Ta med deg</div>
      <h2 class="tip" style="position:absolute;left:var(--pad);top:calc(var(--u)*7);font-size:calc(var(--u)*3.6)">Grepene, på <em>ett ark</em>.</h2>
      <div class="tk-grid">${cols}</div>`;
    const tip = ctx.$('.tip');
    const columns = ctx.$$('.tk-col');

    return {
      enter() {
        stage.particles.morphTo(shapes.scatter(stage), { duration: 2, turbulence: 0.3 });
        stage.fly({ pos: [0, 0, 14], look: [0, 0, 0], duration: 2 });
        ctx.track(fx.rise(tip, { stagger: 0.015 }));
        columns.forEach((c, k) => {
          ctx.track(gsap.fromTo(c, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.4 + k * 0.25, ease: 'power2.out' }));
          ctx.track(gsap.fromTo(c.querySelectorAll('li'), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.08, delay: 0.6 + k * 0.25 }));
        });
      },
    };
  },
};
