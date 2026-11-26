// Render a small picture of every slide for the zoom-out view (public/thumbs/<id>.jpg).
//
//   npm run dev          (in another terminal; the deck must be running on :5180)
//   npm run thumbs       (all slides)   ·   npm run thumbs -- spec validate   (only these)
//
// Each slide is shown in a preview window at its picture step (def.thumbStep, default the last
// step), jumped to its end state, and captured at 480×270. Uses the installed Google Chrome.
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const DECK = process.env.DECK_URL || 'http://localhost:5180/?view=preview';
const OUT = new URL('../public/thumbs/', import.meta.url);
const only = process.argv.slice(2);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 0.3 });
await page.goto(DECK);
await page.waitForFunction(() => window.deck?.defs?.length > 0);
await page.waitForTimeout(1500);

const defs = await page.evaluate(() => window.deck.defs.map((d, i) => ({
  i, id: d.id, title: d.title ?? d.id, step: d.thumbStep ?? Math.max(1, d.steps ?? 1) - 1,
})));

for (const d of defs) {
  if (only.length && !only.includes(d.id)) continue;
  await page.evaluate(({ i, step }) => {
    const deck = window.deck;
    deck.instant = true;
    if (deck.index === i) deck.go(i === 0 ? 1 : 0, 0);
    deck.go(i, step);
    deck.instant = false;
  }, d);
  await page.waitForTimeout(2200); // entry fades, fonts, live iframes
  const jpg = await page.screenshot({ type: 'jpeg', quality: 72 });
  await writeFile(new URL(`${d.id}.jpg`, OUT), jpg);
  console.log(`${String(d.i + 1).padStart(2, '0')}  ${d.id}`);
}
await writeFile(new URL('index.json', OUT), JSON.stringify(defs.map((d) => d.id)));
await browser.close();
