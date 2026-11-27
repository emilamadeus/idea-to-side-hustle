// Copies the shared drawing code (the four visual directions) into the order site, so the
// phone shows the same designs as the talk. Run before deploying the site: npm run ved:sync
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('ved/public/js', { recursive: true });
for (const f of ['draw.js', 'varmpeis.js', 'landings.js']) copyFileSync(`src/engine/${f}`, `ved/public/js/${f}`);
console.log('synced draw.js, varmpeis.js, landings.js → ved/public/js/');
