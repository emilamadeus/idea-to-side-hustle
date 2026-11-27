// Render a small picture of every slide for the zoom-out view (public/thumbs/<id>.jpg).
//
//   npm run dev          (in another terminal; the deck must be running on :5180)
//   npm run thumbs       (all slides)   ·   npm run thumbs -- spec validate   (only these)
//
// Each slide is shown in a preview window at its picture step (def.thumbStep, default step 0, where
// a click in the zoom view lands), jumped to that step's end state, and captured at 1120×630 (sharp at the closest zoom). Uses the installed Google Chrome.
// Slides that show the room's design choice (def.themed) also get one picture per design.
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const DECK = process.env.DECK_URL || 'http://localhost:5180/?view=preview';
const OUT = new URL('../public/thumbs/', import.meta.url);
const only = process.argv.slice(2);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 0.7 });
await page.goto(`${DECK}&theme=peis`); // base pictures in the default design
await page.waitForFunction(() => window.deck?.defs?.length > 0);
await page.waitForTimeout(1500);

const defs = await page.evaluate(() => window.deck.defs.map((d, i) => ({
  i, id: d.id, title: d.title ?? d.id, step: d.thumbStep ?? 0, themed: !!d.themed,
})));
const shoot = async (pg, d, file) => {
  await pg.evaluate(({ i, step }) => {
    const deck = window.deck;
    deck.instant = true;
    if (deck.index === i) deck.go(i === 0 ? 1 : 0, 0);
    deck.go(i, step);
    deck.instant = false;
  }, d);
  await pg.waitForTimeout(2200); // entry fades, fonts, live iframes
  await writeFile(new URL(file, OUT), await pg.screenshot({ type: 'jpeg', quality: 86 }));
};

for (const d of defs) {
  if (only.length && !only.includes(d.id)) continue;
  await shoot(page, d, `${d.id}.jpg`);
  console.log(`${String(d.i + 1).padStart(2, '0')}  ${d.id}`);
}
// slides that show the room's design choice: one picture per design (<id>-<theme>.jpg)
const themed = defs.filter((d) => d.themed && (!only.length || only.includes(d.id)));
for (const theme of themed.length ? ['skog', 'nordisk', 'rask', 'peis'] : []) {
  const tp = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 0.7 });
  await tp.goto(`${DECK}&theme=${theme}`);
  await tp.waitForFunction(() => window.deck?.defs?.length > 0);
  await tp.waitForTimeout(1500);
  for (const d of themed) { await shoot(tp, d, `${d.id}-${theme}.jpg`); console.log(`    ${d.id}-${theme}`); }
  await tp.close();
}
await writeFile(new URL('index.json', OUT), JSON.stringify(defs.map((d) => d.id)));
await browser.close();
