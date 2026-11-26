// To add a slide: copy _template.js, then import it here.
import { HELP } from './help.js';
import { chapter } from './chapter.js';
import takeaways from './takeaways.js';
import opening from './opening.js';
import launch from './launch.js';
import validate from './validate.js';
import title from './00-title.js';
import mdFiles from './md-files.js';
import goal from './goal.js';
import visualRef from './visual-ref.js';
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

// Story order (spec C3): a journey from idea to launch, in five stages. Each stage opens
// with a divider (chapter(k)); every slide in a stage gets `stage` so the corner marker can
// show where we are. Reordering is just moving lines. Callbacks that depend on order:
//   full-scope "Alt fungerer." → fails "Fikset!"; helpers ends on the guard → watchdog;
//   watchdog 03:12 → always-working; side-quest's 80 % → asset-loop.
const STAGED = [
  [validate],                                                           // 1. Idé
  [spec, fullScope, planning, goal, mdFiles],                           // 2. Plan
  [prototypes, visualRef, kitchen, helpers, watchdog, remote, alwaysWorking, gateway, knowAGuy], // 3. Bygg
  [selfCheck, show, fails, effort],                                     // 4. Kvalitet
  [projects, sideQuest, assetLoop, launch, htmlDeck],                   // 5. Lansering
];
export const slides = [
  title,
  opening, // cold open: the idea, and where it ended up
  ...STAGED.flatMap((group, k) => [chapter(k), ...group.map((s) => Object.assign(s, { stage: k }))]),
  takeaways, // closing: every standalone tip on one page
];

// Help lines live in help.js so all on-screen copy can be edited in one place.
slides.forEach((s) => { if (!s.help && HELP[s.id]) s.help = HELP[s.id]; });
