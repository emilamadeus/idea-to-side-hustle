# AI workflow presentation

Live-presented talk (20–45 min, 10–20 people) on "optimizing AI in our workflow", for a tech company in insurtech / smart home. Mix of the speaker's own workflow, best current practice, and side-tracks into personal projects built with AI.

## Decisions
- Date: 10 December 2026. Title: "Fra idé til startup, med AI". Subtitle: "Se hvordan AI gjør en idé om til inntekt. Eller ta med deg grepene til jobb i morgen." The talk is a journey: Idé → Plan → Bygg → Kvalitet → Lansering.
- Language: Norwegian on screen; technical terms stay in English (Claude Code, prompt, context window, PR, etc.).
- Terms: session (one per task), lead (the active agent in a session), helper (subagent the lead starts), master session (talks to and stays updated on the other sessions). On screen: "session", "leaden", "hjelper", "master session" / "master-sessionen"; never "økt" or "hovedsession".
- Visual identity: **Arbeidstegning** (working drawing). Arkade colours (warm near-black, orange #ff5a1f, yellow #ffd23f) on an architect's drawing: warm grid, crop marks, a title block naming each slide as a drawing sheet, pink pencil notes in the margin (Caveat). Type: Bricolage Grotesque 800 + Space Mono. Defined in `src/theme.js`.
  - Pencil notes are the humor device; use them sparingly (at most one per slide, not on every slide).
  - Keep lines 2px or thicker (AirPlay).
  - Filled objects and characters get a dark ink outline (`FILL()` / `inkFor()` in `src/engine/draw.js`), like a rendered illustration; a cream outline reads as clip-art. Light outlines are only for UI frames (phones, panels, bubbles) and line drawings that sit directly on the dark background.
  - Zoom/connector lines from a small thumbnail to its enlargement: one dashed line, not two.
- Tone: funny, intuitive, humorous. Humor comes from real situations and visual gags, never from forced jokes or puns.
- Audience: mostly developers, some non-developers. Explain jargon visually, not verbally.
- Speaker's tools: Claude Code for most work; ChatGPT for image/concept/reference generation.
- Any example that involves a prompt shows it as a conversation on a phone (`chatPhone` in `src/engine/props.js`, Claude or ChatGPT): the user's message (with attached images), a "Tenker" thinking animation, then the reply. The illustrated result appears only after the thinking ends.
- Every point gets an illustrative animation that shows the mechanism: a small scene with objects that act it out, before/after, cause and effect. Particles forming a shape, text or image are atmosphere and transitions only, never the explanation itself. Particles and the grid render only outside the 16:9 frame; inside is reserved for content (crisp text, SVG drawings, 3D line models). Particles keep pointer parallax and drift. Storyboards per point live in `docs/content.md`.
- One example at a time. A slide never shows two attempts or cases side by side: the first is cleared before the next begins. A second attempt is a new session (the chat clears) and carries the `attempt()` badge from `src/engine/props.js` ("FORSØK 1" → "FORSØK 2 · NY SESSION"). Several cases (e.g. 0 / 1 / several files) play one after another in the same scene, with a small case list on the left showing which one is active and how it ended. The talk must be easy to follow at a glance.
- Visual hierarchy, three levels per step: focus (what the step is about, full strength, the only orange), context (rest of the scene, dimmed with `ctx.focus(tl, nodes, at)` from `src/engine/draw.js`), chrome (tip shrinks after step 1, older chat messages fade, help line waits until the step's animation ends, title block at 60 %). A step without `ctx.focus` shows everything at full strength.
- Every build step has one help line (`src/slides/help.js`, shown bottom left by the deck): a short sentence (≤ 60 characters) that names the concept, benefit or problem the picture shows. It explains, it never restates. A slide whose bottom edge is taken sets `helpAt: 'top'`.
- Token usage is shown with `tokenMeter()` from `src/engine/props.js` wherever the point is about cost (instruction files, full scope, planning, where it fails, effort). Illustrative values in k tokens; the bar turns pink near the top.
- No metrics or numbers as proof (no time saved, no effort/speed figures, no PR counts). Each point is a short, memorable tip as the title plus a memorable illustrated example. Entertaining and concise beats thorough; if a slide needs a paragraph, the illustration is not doing its job.
- No live prompting. Live examples are shown from the speaker's websites.
- Audience phone participation: wanted; placement still to be decided.

## Spec (keep it current)
`docs/spec.html` is the living spec: every task, its status, dependencies and blockers. Read the agent instructions in its top HTML comment. Update its JSON data whenever a task changes status, and add one log entry per working session. Open at http://localhost:5180/docs/spec.html.

## Content
All talk content, the speaker's points and proposed visuals live in `docs/content.md`. Read it before building any slide; update it when content is agreed.

## Material
- Personal projects (shown via the live sites, screenshots, recordings; not GitHub repos):
  - 3D home builder: home.atladeus.com
  - Christmas wish list: wish.atladeus.com
  - Smart 3D home builder: app.atladeus.com
  - An Unreal Engine game (speaker will provide content)
- Work examples: support tool, camera/DVR backend integration.

## Venue constraints (design for these)
- MacBook Pro → Apple TV (AirPlay, **extended display**) → 100" Samsung. Audience window full-screen on the TV, presenter console on the laptop.
- AirPlay re-encodes the stream: avoid hairline detail, film grain, dense tiny particles, thin type. Prefer bold shapes, large type, glow from light and scale. The finish pass dithers to fight gradient banding.
- ~150 ms AirPlay latency: nothing should depend on split-second timing.
- No audio, no webcam, no mic. All movement is driven by the presenter (keys/clicker, or direct interaction on the TV window).
- Internet is available (Google Fonts, live data are OK).

## Writing rules (absolute)
- No captions that restate what the illustration already shows (e.g. "under bordet", "lunsj (nesten)"), and no cute parenthetical quips. A pencil note must add information the picture can't, or be cut.
- No AI-sounding phrasing, no catchphrases, no slogans, no "Let's dive in", no rhetorical questions, no tidy rule-of-three lists, no em-dash flourishes.
- On-screen text is sparse and concrete: real nouns, numbers, short labels. The speaker carries the narrative.
- Speaker notes are short, practical cues, not scripts.

## Running
- `npm run dev` → http://localhost:5180 (audience). Press **P** to open the presenter console (Chrome places it on the other screen after a one-time window-management permission). Spec: /docs/spec.html.
- Step progress: the title block's STEG dots show how far the current build step has played (filling ring, then a solid pulsing dot = time to click); the console shows the same as a bar and KLAR. Slides built on `D.stepper` report this automatically.
- Keys: →/Space/PageDown next · ←/PageUp back · digits+Enter jump · O overview · B or . blackout · F fullscreen · H hide progress bar. T in console toggles timer.

## Layout check (required after any slide change)
- Open a preview window (`http://localhost:5180/?view=preview`) and run `await deck.audit()` in its console (or `deck.audit({ slides: ['id'] })`). It jumps to the end state of every step and reports text that overlaps other text, bars/boxes or straight lines, and separate units (cards, bubbles, phones, signs) that partly overlap each other. It must return `[]`. A unit that overlaps by design (zoom lines) gets `data-overlap-ok`. Also run `await deck.auditMotion()` (in batches via `{ slides: [...] }` if it times out): it plays every step and reports anything that travels across a card, bubble, phone, sign, character or text on its way. Moving things never pass through other things: take blocks off a stack sideways before dropping them, rebuild one at a time, lift a ticket off and drop it in rather than fly it through others, cut (fade out/in) a character to a new spot instead of walking them through people, and let one card leave before the next arrives. The only allowed contacts are deliberate ones (a stamp landing on a card, an item handed to a person). Also run `await deck.auditMid()`: it plays every step and reports bubbles, cards or phones covering a character's face while on screen (a bubble's tail may point at a face; mark the bubble body `data-body`).
- Plan each slide in layout zones (see the header comment in `src/slides/side-quest.js`) so text never shares space with moving parts. Mark background art with `data-bg` and text that belongs inside its own shape (bar labels, stamps, cards) with `data-unit`.
- The audit cannot see collisions between two drawings (lines on lines); check those by eye.

## Architecture
- `src/engine/stage.js` persistent three.js world: camera rig (`stage.fly`), bloom, finish pass, tick loop.
- `src/engine/particles.js` one shared particle field; slides call `stage.particles.morphTo(shape, opts)` so content flows between slides.
- `src/engine/shapes.js` shape generators (text, nebula, sphere, grid, house, ring, edges, combine). Add new shapes here.
- `src/engine/characters.js` character kit: `figure()` (filled figures with faces, hair, outfits, arm poses, swappable expressions via `set`/`expr`, `talk()` loop) and `lyingHead()`. Use it for any people in scenes; animate the returned `root`, never the inner transform.
- `src/engine/fx.js` DOM text effects (rise, sink, scramble, count, appear, vanish).
- `src/engine/deck.js` navigation, build steps, URL hash (`#/slide-id/step`), overview, sync.
- `src/presenter/` console: now/next previews (iframes with `?view=preview`), per-step notes, timer.
- `src/slides/` one file per slide, ordered in `index.js`. Start from `_template.js`.
  - `enter({step, dir})` must render the cumulative state for `step` (going backwards lands on the last step).
  - Use `ctx.track()`, `ctx.tl()`, `ctx.tick()` so cleanup is automatic.
- Layout units: `var(--u)` = 1% of a 16:9 frame. Tokens in `src/theme.js` (runtime) mirrored in `src/styles/base.css`.
- `stage.viewSize()` returns the 16:9 frame in world units; size particle shapes with it so they line up with the DOM layer.
