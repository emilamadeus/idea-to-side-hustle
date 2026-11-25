// To add a slide: copy _template.js, then import it here.
import { HELP } from './help.js';
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

// Story order (spec C3): a journey from idea to launch. Reordering is just moving lines
// here; slide content is independent. Callbacks that depend on order:
//   full-scope "Alt fungerer." → fails "Fikset!"; helpers ends on the guard → watchdog;
//   watchdog 03:12 → always-working; side-quest's 80 % → asset-loop.
export const slides = [
  title,
  // 1. Idé: find out what you want
  prototypes,
  visualRef,
  goal,
  // 2. Plan: the whole scope, written down
  fullScope,
  planning,
  spec,
  mdFiles,
  // 3. Bygg: many sessions at once
  kitchen,
  helpers,
  watchdog,
  remote,
  alwaysWorking,
  gateway,
  // 4. Kvalitet: trust, but check
  selfCheck,
  show,
  fails,
  effort,
  // 5. Lansering: what it turned into
  knowAGuy,
  projects,
  sideQuest,
  assetLoop,
  htmlDeck,
];

// Help lines live in help.js so all on-screen copy can be edited in one place.
slides.forEach((s) => { if (!s.help && HELP[s.id]) s.help = HELP[s.id]; });
