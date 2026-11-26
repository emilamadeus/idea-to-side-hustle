// To add a slide: copy _template.js, then import it here.
import { HELP } from './help.js';
import { chapter, part } from './chapter.js';
import takeaways from './takeaways.js';
import readyToBuild from './ready-to-build.js';
import opening from './opening.js';
import launch from './launch.js';
import validate from './validate.js';
import title from './00-title.js';
import mdFiles from './md-files.js';
import goal from './goal.js';
import visualRef from './visual-ref.js';
import gameRef from './game-ref.js';
import commits from './commits.js';
import fullScope from './full-scope.js';
import sideQuest from './side-quest.js';
import alwaysWorking from './always-working.js';
import kitchen from './kitchen.js';
import helpers from './helpers.js';
import watchdog from './watchdog.js';
import spec from './spec.js';
import assetLoop from './asset-loop.js';
import knowAGuy from './know-a-guy.js';
import selfCheck from './self-check.js';
import planning from './planning.js';
import show from './show.js';
import fails from './fails.js';
import gateway from './gateway.js';
import prototypes from './prototypes.js';
import effort from './effort.js';
import remote from './remote.js';
import htmlDeck from './html-deck.js';
import projects from './projects.js';
import skills from './skills.js';
import goLive from './go-live.js';

// Story order: the journey, three parts and a closing.
//   1. The journey from idea to launch, five stages; each opens with chapter(k) and its slides get
//      `stage` so the corner marker shows where we are. Only slides that move the product forward.
//   2. Arbeidsflyt: how you run the AI day to day (sessions, helpers, watchdog, remote, effort, work).
//   3. Bak kulissene: side effects.
//   4. Ekte prosjekter: the speaker's live sites, the Fab pack that sold, and the meta finale.
// Slides in parts 2–4 get `part`, which the corner marker shows instead of the journey.
// Callbacks that depend on order: full-scope "Alt fungerer." → fails "Fikset!"; helpers → watchdog;
//   watchdog 03:12 → always-working; side-quest's 80 % → asset-loop (right after it).
const STAGED = [
  [validate],                                   // Idé
  [spec, fullScope, planning, mdFiles],         // Plan
  [readyToBuild, prototypes, visualRef, goal, commits],  // Bygg
  [selfCheck, show, fails],                     // Kvalitet
  [goLive],                                     // Lansering (placeholder)
];
const PARTS = [
  { name: 'Arbeidsflyt', slides: [kitchen, helpers, watchdog, remote, effort, skills, gateway] },
  { name: 'Bak kulissene', slides: [sideQuest, assetLoop, gameRef, alwaysWorking] },
  { name: 'Ekte prosjekter', slides: [projects, knowAGuy, launch, htmlDeck] },
];
export const slides = [
  title,
  opening, // cold open: the idea, and where it ended up
  ...STAGED.flatMap((group, k) => [chapter(k), ...group.map((s) => Object.assign(s, { stage: k }))]),
  ...PARTS.flatMap((p, k) => [part(k + 2, p.name, ['Reisen', ...PARTS.map((q) => q.name)]), ...p.slides.map((s) => Object.assign(s, { part: p.name }))]),
  takeaways, // closing: every standalone tip on one page
];

// Help lines live in help.js so all on-screen copy can be edited in one place.
slides.forEach((s) => { if (!s.help && HELP[s.id]) s.help = HELP[s.id]; });
