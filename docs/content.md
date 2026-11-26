# Content outline

Source of truth for what the talk says. Speaker's input is recorded as given; visual ideas are proposals.
Status: [given] = speaker's own point, [proposed] = Claude's suggestion awaiting approval, [open] = needs input.

---

## Terms [agreed]
- Session: one Claude Code conversation, one per task.
- Lead: the active agent in a session; it does the work.
- Helper: a subagent the lead starts, for research.
- Master session: a session that talks to the other sessions and stays updated on them; it keeps the overview.

## Meta: this presentation is a web page [given]
- Built: src/slides/html-deck.js.
Point: an HTML page instead of PowerPoint, built with Claude Code.
- For: anything a browser can do (3D, live simulations, real websites embedded); text-based, so AI can write and change all of it; version control and diffs; runs on any machine with a browser; presenter console built to fit the talk.
- Against: every feature has to be built (presenter view, overview, export); non-developers can't edit it easily; depends on browser performance and the GPU; no "send the .pptx" convenience; needs a dev server or a build step.
- Storyboard [proposed]:
  1. A classic slide appears: white background, bullet points, clip-art. It tries to do what this deck has done: the 3D house becomes a flat picture, the live website shows a broken-plugin icon, the 80 % bar won't move.
  2. Camera pulls back from our deck: browser window frame appears around it, then the source code scrolls past, then the change history of the deck ticks by.
  3. The "against" list appears as pencil notes on the drawing: presenter view had to be built, PowerPoint users can't edit it, needs a GPU.

## MD instruction files [given] — built (src/slides/md-files.js)
Point: what 0, 1 or several instruction files change.
Speaker's set: CLAUDE.md, AGENTS.md, nested CLAUDE.md, ARCHITECTURE, STATUS, HANDOFF, SPEC, DECISIONS, GOTCHAS, TESTING.
- 0 files: every session starts from zero; you re-explain, it guesses conventions differently each time.
- 1 file: shared baseline, but permanent rules mix with temporary state; it grows, goes stale, loads in full every time.
- Several: a short root file routes to topic files read when relevant; state (status, handoff) lives apart from rules, so new or parallel sessions pick up exactly where work stopped.
- Splitting saves usage and time: the agent reads and weighs less irrelevant context on every task, so it is faster and uses less of the plan's quota.
- Cost: a stale file misleads more than a missing one, so updating them is part of the work.
- Storyboard [built, app flow]: the firewood subscription (task: add a new district). The story runs in the Claude chat on the left; the scene shows what Claude does.
  1. 0 files: the worker stands in an empty room asking questions in speech bubbles; a counter shows how many times you explained the project. It builds with the wrong tool; pencil cross-out.
  2. 1 file: Claude reads one long CLAUDE.md top to bottom (Vipps, Release, Design, Bydeler, ...) while the token bar fills. It gets the task done ("Ferdig. Bydelen er lagt til."), but it read everything to get there: better, but expensive. (The outdated-file problem is shown only in the several-files case, with STATUS.)
  3. Several files: a short index card points to a filing cabinet with drawers (ARCHITECTURE, STATUS, HANDOFF, SPEC, DECISIONS, GOTCHAS, TESTING, nested CLAUDE.md). The worker opens only the two or three drawers it needs. A second and third worker arrive, read STATUS and HANDOFF, and carry on where the first stopped.
  4. Side by side for one task: the 1-file worker's read meter and stopwatch against the several-files worker's. The scroll worker is still reading when the cabinet worker is done; its usage bar is a fraction of the other.
  5. Cost: the STATUS drawer gathers dust, tagged "STATUS · 3 DAGER GAMMEL". In a new session Claude says it is starting on the pause feature; you answer that pause was finished three days ago; it replies "Du har helt rett! Pause ble fullført for tre dager siden. Jeg ruller tilbake det jeg startet og tar neste oppgave på listen: bestilling."
  6. Fix: you ask it to update STATUS when it finishes a task; it does ("pause ferdig, neste er bestilling"); the tag becomes "OPPDATERT I DAG". Updating the files is part of the task. Column B is labelled CLAUDE.md / AGENTS.md (one big file).

## Describe the goal, not the implementation [given] — built (src/slides/goal.js): the firewood subscription: dictated turns are numbered on the map (fetch every order each night, a new table, a separate SMS cron job, check the route by hand), roundabout three times, "STENGT"; attempt 2 only states the goal, "Kunden skal få SMS dagen før veden kommer."; the AI takes a hidden bridge, Claude: "Ruteplanen har allerede leveringsdagene. Jeg sender fra den."
Point: requirements matter more than technical instructions; the model often picks a better approach than the one you'd dictate.
- Storyboard [proposed]: a navigation app on a city map.
  1. You enter every turn yourself (each turn labelled with a technical choice). The route follows your turns, hits road works, and stops.
  2. You enter only the destination (the requirement). The app finds a route you didn't know: a bridge that cuts the distance in half.
  3. Distance and effort counters for both routes.
- Applies to most work beyond single-file edits. No single anecdote; use an illustrated generic case.

## Visual references beat descriptions [given] — built (src/slides/visual-ref.js): the firewood subscription's front page, right after "Varm peis" was picked. A thought cloud shows the page you have in mind. Attempt 1 (list prompt "Lag forsiden. Varm, koselig, med peis og en tydelig knapp.") builds the cheap version, every box ticked: bright orange everywhere, clip-art candle and heart, a cartoon flame with a face, a shouting red "BESTILL NÅ!!!". Attempt 2 (new session, ChatGPT reference attached) builds close to the picture, a little plainer. The game example (ChatGPT concept sheet and detail grid, then the Unreal screenshot) is its own slide in Bak kulissene: src/slides/game-ref.js.
Point: models check off text bullet points instead of reaching the actual target. A ChatGPT concept image gives a target to match.
- Storyboard [proposed]:
  1. A checklist ("moderne", "varm", "åpen planløsning", "store vinduer") is fed in. The AI builds a house, ticking each box as it goes.
  2. Result satisfies every bullet and is clearly wrong: one wall is entirely window, open plan includes the bathroom, a fireplace in every room. Every box ticked.
  3. A concept image slides in from the side. The build reshapes to match it. Same AI, different target.

## Give the full scope before starting [given]
Point: scope changes the core implementation. Step-by-step on a big task means each step patches the last.
- Storyboard [proposed]: drawing revisions (REV A, B, C …) in the title block.
  1. "Lag et hus" → a cabin. "Legg til garasje" → a garage bolted on at a different height. "Andre etasje" → a floor balanced on the roof ridge with braces. "Takterrasse med basseng" → no stairs were ever planned, so one is bolted on outside and ends in mid-air. Next to it, the AI's confident status: "✓ Takterrasse med basseng lagt til. Alt fungerer." (sets up the "Fikset!" gag in "Where it fails").
  2. Rewind. One prompt with the full scope, REV 0. The same requirements become one clean house, built in one go, lifted into 3D.
  3. REV 1 from the customer: "Kan bassenget være i kjelleren?" The 3D house cracks down the middle and the pool drops out.

## The living spec file [given]
- Built: src/slides/spec.js.
Point: for bigger work, the AI keeps an HTML spec up to date as it works: titles, expandable detail, hidden agent-only instructions, done/blocked/dependencies with reasons, a copy-status button per task.
- Storyboard [proposed]:
  1. The real spec of this presentation, live on screen. A task expands, a dependency line lights up the task it blocks.
  2. X-ray mode: the page slides apart to show the hidden layer only agents read (the instruction comment and agent notes).
  3. A colleague asks for status. "Kopier status" drops a short, readable summary into the reply (Opptaksregler: ferdig. Privacy mode: i arbeid. Offline-varsel: venter på gateway build 412.); they react with a thumbs up.
  4. They ask about one task. That row's own copy button drops everything about it: status, why it is blocked, what it waits for, the plan.
  5. Each task also has a "✻ prompt" button: one line with the task id, "Sjekk status på K3 i spec.html og fortsett derfra." Claude reads the spec itself: "K3 venter på G7. Build 412 er ute nå, så jeg starter på K3."
  6. The page becomes this talk's own spec, live.

## Parallel sessions with a master session [given]
- Built: src/slides/kitchen.js.
Point: one session per task, plus one master session that talks to the others and keeps the overview.
- Storyboard [agreed]: the Claude Code app (session list left, conversation right), src/engine/console.js.
  1. One session ("Alt i én") gets all eight tasks: one ticked, the timer runs to 47 min, the context fills, your own "Hvor langt har du kommet?" and "Hallo?" pile up.
  2. New window: Master, Innlogging (ferdig), Varsler, Kamera-API, Tester in the sidebar. The master follows them; Kamera-API stops on "Kjøre migreringen mot prod?" and its row turns "venter på deg".
  3. You open Kamera-API and answer "Ja"; all finish; the master: "Alle fire ferdige."
- The master session tracks the others: which are working, which are waiting for a response, which are done.

## The lead does the work, helpers rarely [given]
- Built: src/slides/helpers.js.
Point: the lead (the active agent in each session) does the work itself. Helpers (subagents spawned by a session) only occasionally, mostly for planning or research, almost never for implementation. With helpers implementing: poorer results, long waits, and wait locks where a helper never reports back as finished while the lead keeps waiting.
- Terminology for the slide: "session" = a task you started; "helper" = a subagent a session starts by itself.
- Storyboard [agreed]: the Claude Code app, one session ("Appen"); running helpers sit in a right-hand panel, each with its run time.
  1. The lead works itself: Read, Edit, Bash.
  2. A research helper: a "Hjelper · Finn DVR-innlogging" card returns in 12 s; the lead uses the answer.
  3. "Bygg fakturamodulen med en hjelper. Ta eksporten etterpå." The helper runs in the background; the lead does nothing while it waits. The helper panel keeps showing it running, past two hours.
  4. "Hva jobber du med nå?" → "Ingenting kjører nå. Venter på at hjelperen blir ferdig før neste jobb. 11 / 64 GB RAM ledig, 18 GB trengs. Hjelperen bruker 24 GB." "Er ikke hjelperen ferdig ennå?" → "Sjekker status på hjelperen." Done 40 minutes ago, never reported. 24 GB freed; the lead starts the export.

## Cross-model loop through a shared file [given]
- Built: src/slides/asset-loop.js.
Point: Claude and ChatGPT cooperate through one shared file. Example: 3D asset pipeline for Blender/Unreal.
1. Claude writes requests ("need reference images for medieval household items") to the shared file.
2. ChatGPT polls, generates exactly what was asked through a skill Claude wrote, uploads to a location Claude chose, marks it done.
3. Claude builds from finished references, then queues the next batch. Loops until everything is done end to end.
- Storyboard [proposed]: two workshops connected by an order board.
  1. Claude's workshop (builds 3D models) pins an order card on the shared board: "Referansebilder: middelaldersk husholdning".
  2. ChatGPT's studio (paints concepts) checks the board, paints exactly the ordered sheets, delivers them to the agreed shelf, marks the card done.
  3. Claude picks them up, builds, pins the next order. The loop speeds up, cards and finished models stack up.
  4. Reveal: the real carts and wagons from the Fab listing on the shelf.
- Shared file: illustrative example in docs/examples/asset-queue.md (requests, statuses, delivery paths, log).
- Project: Atladeus Studio. Published on Fab: "Destructible Medieval Cart and Wagon Props"
  https://www.fab.com/listings/ef989a0e-8cc4-4d27-8b2e-fcc50f9b08fc
  Facts from the listing: 24 props, 20 breakable (Chaos Geometry Collections), 1,693 fracture pieces, 48 broken/rubble meshes, 20 PBR texture sets, 79 material instances, multiplayer-safe destruction, FBX/GLB/Blender exports.
  Wood splits along the grain, metal bends, cloth tears, glass shatters.

## Watchdog [given]
- Built: src/slides/watchdog.js (the Claude Code app at night: the master session runs the check every 10 minutes, the sidebar shows each session's state, a clock on the left; set up by a plain request in the master session).
Point: a scheduled check every ~10 min looks at all running jobs: RAM lock, agents waiting on each other, idle agents, and helpers that finished but never reported back to the lead. Keeps work going overnight.
- Storyboard [agreed]: the Claude Code app at night; the master session runs the check, the sidebar shows Master, Varsler, Kamera-API, Tester.
  1. "Sjekk alle sessions hvert 10. minutt." → "Ok. Første runde 22:10." Clock from 22:00.
  2. 23:40: Varsler and Kamera-API wait for each other → "Varsler: ta migreringen først."
  3. 02:20: Tester quiet since 02:14 → "Tester: fortsett."
  4. 03:30: RAM lock. Kamera-API can't run its tests; two dev servers from finished sessions hold 6.1 GB → killed.
  5. 04:20: Varsler opened: context reaches the 400k mark, "Compacting conversation", 400k → 60k, carries on.
  6. 05:10: a helper of Kamera-API finished 04:32 without saying so → "Kamera-API: hent resultatet."
  7. 06:00: all done.
- Set up by plain request ("run this check every 10 minutes"); no special commands. In Claude Code that becomes a recurring loop in the session.

## Remote sessions and notifications [given]
- Built: src/slides/remote.js.
Point: a big win. The AI always sends a notification when it is done or needs a decision, so work never stops waiting for you. Reach sessions from anywhere (phone); use cloud sessions when possible, or when the desktop/laptop isn't available.
- Storyboard [agreed]: the Claude Code app on the laptop, and your phone (lock screen, notification banner, the session opened remotely).
  1. Attempt 1, no notifications: Kamera-API stops on "Kjøre migreringen mot prod?". The phone stays dark; the clock runs 14:05 → 16:45, "Venter på svar … 2t 40m".
  2. Attempt 2, new session, notifications: the same question; a Claude banner lights up the phone. You open the session there and tap "Ja"; the laptop session gets "Ja (fra telefonen)", migrates, runs the tests.
  3. Title "Cloud sessions når maskinen ikke kjører." The phone sends the task ("Fiks varsel-feilen og commit.") to the cloud, then you lock it. The cloud (no window: Claude's spinner and a status line) works through five slow stages: klon (ping to GitHub, pong back), rett, test, commit (ping to GitHub; commit a3f9c12 lands on main), varsle (ping to the phone, which wakes to the lock screen with the banner and a short vibration). Then the cloud idles, "Ferdig · venter på neste oppgave", spinner still turning.
- Titles: step 0–1 "Remote sessions med notifikasjoner.", step 2 "Cloud sessions når maskinen ikke kjører."

## Always working (humor) [given]
Point: being this productive with AI means you are always working. Notifications arrive at odd times and you start the next task.
- Storyboard [built]: one main character across three scenes (lunch and Christmas Eve were cut). Clock spins to each moment; attention ring shows HER vs JOBB.
  In every scene the phone buzzes (vibration arcs), lights up the face, the head turns, the notification pops out of the phone, a one-word reply, "→ neste oppgave startet", while the others keep talking.
  1. 09:14 meeting: phone under the table while the presenter talks Q4. HER 40 %.
  2. 18:30 dinner with the wife, three clicks: (a) cosy dinner, "Så fint med en kveld for oss to.", buzz, notification, reply. (b) She gets annoyed, arms crossed: "Gymbro spurte om jeg ville henge." Pause. He says "2 sek." without looking up; candles shrink. (c) She stands up smiling at her own phone and walks out; candles go out with smoke; he looks up, grins "Ferdig!" at the empty chair.
  3. Night, three clicks, same wake-up each time (buzz, eyes open, phone up, answer, phone back, asleep): 03:12 "Watchdog: alt kjører. 3 sessions jobber." → "Bra."; 04:37 "Session 2 lurer på: Postgres eller SQLite?" → "Postgres." (partner wakes, gives a look); 05:58 "Alt ferdig. Starte neste batch?" → "Ja." (dawn in the window, partner stays awake, annoyed).
  4. The week: calendar fills with "jobb (litt)".
- Twists [built]:
  - Meeting: after his reply the lights dim and every phone in the room glows: both colleagues under the table, the presenter's in her blazer pocket. Rubber duck and stickered laptop on the table.
  - Dinner, last click: she stands up with her phone; her screen zooms in: she is asking Claude "Hvordan får jeg kjæresten til å legge vekk telefonen?" (Claude typing). Then she leaves.
  - Night: an energy can appears on the floor per wake-up; at 06:00, two minutes after the last "Ja.", the alarm clock rings.
  - Calendar: one green FERIE block on Sunday appears last, then flips to "jobb (litt)".
- Phone moment candidate: "When did you last approve something from an AI at an odd time?"

## Personal projects grow your skills [given]
- Built: src/slides/know-a-guy.js (map) and src/slides/projects.js (live sites).
Point: different projects teach you what exists. You become "I know a guy" for many areas, and it feeds ideas into regular work.
- Storyboard [proposed]: a map under fog of war.
  1. Only "backend at work" is uncovered.
  2. Each project clears fog: 3D/WebGL (home builder), game engine (Unreal), Blender and destruction (Atladeus Studio), image generation, web apps (wish list).
  3. Colleagues' questions appear as pins on the map; arrows from each pin go to you. "Jeg kjenner en som kan det" — that's you.
- Projects:
  - home.atladeus.com: converts a floor plan into a 3D home you can walk through in first person, with technical details, furniture and materials.
  - wish.atladeus.com: a Christmas wish list, for your own wishes and the gifts you plan for others.
  - app.atladeus.com: a 3D smart home. Users build their own home from a floor plan or 3D model, then control their real home inside that model through integrated third-party smart home products.
  - Unreal Engine game (about 80 %), Game pipeline, 3D asset pipeline (Atladeus Studio, on Fab), Texture pipeline.

## Failure/humor: the recursive side quest [given]
Names on screen: Game pipeline, 3D asset pipeline, Texture pipeline. Keep the texture pipeline simple and illustrative.
Point: almost finishing a task, then starting a new project it inspired, recursively. And each side project is built far bigger than the need that started it.
Game with full destruction → no good destructible assets → build a destructible-asset pipeline → needs textures/materials, expensive → build a texture pipeline. Three complete pipelines, attention split three ways, original game not finished.
- Storyboard [agreed: the Gantt chart that spills, revised]:
  1. Game pipeline runs to 40 % and blocks: red break, hatched remainder, and the bar prints an order slip "Trenger: 50 assets".
  2. The slip drops and drips into a new row: 3D asset pipeline. The game's remainder is pushed right; launch moves (×2). Developer gets tired.
  3. 3D asset pipeline runs to 20 % and blocks: prints "Trenger: 20 teksturer".
  4. Slip drips into Texture pipeline. Both remainders pushed right; launch ×3. Developer exhausted.
  5. Textures finish: avalanche of swatches, counter 3 000 (trengte 20).
  6. Assets resume and finish: conveyor, counter 5 000 000 (trengte 50). "PUBLISERT" stamp (Fab).
  7. Game resumes to 80 % and stalls, still trying for 81 %. Developer near giving up: X eyes, seven coffees, white flag.
  8. "Hvilken kjører jeg nå? 1 utvikler · 3 pipelines." A spotlight hops between the rows and can't settle.
  9. The answer: a fourth row drips in, "Pipeline-velger". "Løsningen: én pipeline til."
- The game is at about 80%. Running gag [proposed]: a progress bar stuck at 80% that reappears through the talk.
- Payoff [proposed]: the side quest shipped. The destructible-asset pipeline produced a real product on Fab (see Atladeus Studio above), while the game it was meant for is still at 80%. Shoot a cart on stage: it breaks along the grain.
- Phone moment [proposed]: audience answers "How many unfinished side projects do you have?" Answers rain down as particles.

## Work examples [given]
- Not a slide of its own: the product mechanics (rules, privacy mode, four repos) didn't say anything about working with AI. The AI point (spec vs hardware: exclusion zones checked against the gateway code) is the last step of the gateway slide (src/slides/gateway.js).
- Only the camera/DVR work. Support tool dropped.
- Facts (from the speaker's camera session):
  - Camera service is a home service activated per home. The backend decides when cameras record: on motion or on a detected person (per camera), and on alarms (intrusion, fire, water), each can be turned off.
  - Privacy mode stops recording while people are home, unless an alarm overrides it.
  - The backend turns settings into recording rules and sends them to the home gateway. The gateway runs the DVR module: talks to the cameras, stores clips, live view, privacy mask.
  - Hard parts: gateway firmware still changing, so the AI reads the gateway's source history to see what it really supports (pet and vehicle detection don't exist yet). Changes span four repos plus docs (gateway API, home backend, support tool, documentation) that must stay in sync and deploy in a safe order; the backend sends both old and new setting formats so either side can go first. The design wish list doesn't always match the hardware: "exclusion zones" were in the spec but don't exist, only a privacy mask. End-to-end testing on real cameras still pending.
- Links to: gateway tracking (same work), full scope first (four repos), where it fails / spec vs reality.
- Storyboard [proposed]: a cross-section drawing of a house with cameras.
  1. Settings panel (motion / person, intrusion, fire, water, privacy mode) turns into rule cards that travel backend → gateway → DVR → cameras. Recording lights blink per rule. People come home: privacy mode closes the cameras' eyelids. A smoke alarm: they snap open (alarm overrides).
  2. Four repos as four rail tracks that must move in lockstep. A messenger carries every setting in two languages (old and new format), so whichever track arrives first understands it.
  3. The designer's drawing lists "eksklusjonssoner". Pencil cross-out: "finnes ikke. Kun privacy mask." The AI found it in the gateway source before anyone built against it.

---

## Let the AI verify its own work [given]
- Built: src/slides/self-check.js.
Point: the AI checks the result before the speaker does. The speaker only confirms what an AI can't near-certainly confirm visually itself.
- Storyboard [proposed]: ping-pong.
  1. Without: build → ball to you → "nei" → back → build → you … The rally gets long; your clock runs.
  2. With: the AI hits the ball against its own wall (screenshot, test, fix) many times, fast. You receive the ball once, finished.
  3. Rule as a pencil note: you only check what it can't confirm itself.

## Batched planning [given]
- Built: src/slides/planning.js.
Point: scope up a batch of tasks before any implementation. Always run in auto mode (avoids accidentally implementing while in plan mode); tell the agent in words that it is only planning. It should only ask about product decisions, or when it can't give the best answer itself.
- Storyboard [built]: the firewood subscription from the idea stage, as a stack of blocks.
  1. Attempt 1, one request at a time, in the order a founder thinks of them: "Lag bestilling av ved." → "Gjør det til abonnement, hver 14. dag." (the ordering only knew one delivery) → "Kunden skal kunne pause i januar." (the subscription had no pause) → "Lever én bydel om gangen." (nothing knew where the customer lives). The stack comes apart three times; tokens climb to 38k.
  2. Attempt 2, new session in auto mode, "Kun planlegging": you hand over the spec (Ved på døra, uten å bære · Folk i byen med peis · Vipps, SMS før levering · Ikke nå: sommersalg) and everything that has to work, in your own words and order ("Må fungere": Bestilling, Abonnement, Pause, Varsler, Kunder, Bydeler). The build order is the AI's job. It asks what it needs ("Skal kundene kunne pause abonnementet?" "Ja." · "Betaler de per levering eller per måned?" "Per levering."), then "Da har jeg det jeg trenger." and numbers the sections itself: Bydeler 1, Kunder 2, Abonnement 3, Pause 4, Bestilling 5, Varsler 6.
  3. Built in one pass, in that order.

## Skills / custom commands [given, aside]
Point: used rarely, only for very specific, very repetitive workflows (e.g. the ChatGPT skill in the asset pipeline). Not a section of its own; mention where it appears.

## Show, don't describe [given]
- Built: src/slides/show.js.
Point: screenshots and visual examples beat explaining. When an issue is hard to show and explain: paste the image into a fresh session with another agent, ask what is wrong, and have it list the issues as prompts for an AI model. Then feed those prompts back.
- Storyboard [proposed]: broken telephone.
  1. You describe a UI bug in words. The sentence passes along a chain and arrives garbled; the AI moves the wrong button.
  2. The screenshot travels the same chain and arrives intact.
  3. The screenshot goes into a fresh agent: pencil circles appear on each problem, and a numbered list of prompts comes out, ready to paste.

## One session per task [given]
Point: one session per bigger task or task group. Merge candidate with "Parallel sessions with a master session".

## Learn unfamiliar territory by asking it [given]
- Built: src/slides/gateway.js.
Point: example from work. The speaker used AI to track the upstream gateway team's builds: what each update made available, what could be built in the backend now, and what was still blocked by the gateway.
- Storyboard [proposed]: a train station departure board.
  1. Gateway builds arrive as trains with increasing build numbers. Each unloads what it made available for cameras (privacy mode, snapshots, recordings, motion). Some trains arrive empty for cameras and pass straight through.
  2. A split-flap board of backend features flips from "BLOKKERT AV GATEWAY" to "KAN BYGGES" as the right train arrives. Some stay blocked.
  3. The AI keeps the board current; you read it instead of reading every changelog.
- Material: illustrative, not real release notes. Build numbers increase; each build adds camera support features (e.g. privacy mode, snapshots, recordings, motion). Some builds contain nothing camera-related, so nothing on the board flips: the AI says so and you skip reading that changelog.

## Throwaway prototypes to decide [given]
- Built: src/slides/prototypes.js.
Point: build several versions and pick, instead of debating one.
- Example: the firewood subscription's landing page: four real proposals (Skog, Nordisk enkel, Rask levering, Varm peis), same offer "Ved på døra. Hver 14. dag, hele vinteren. Bestill"; one picked (Varm peis), the rest binned.
- Storyboard [built]: asked in the chat for four proposals; they flip past one at a time; side by side for the pick, three go in the bin, the chosen one grows back and is stamped VALGT.

## Where it fails [given]
- Built: src/slides/fails.js.
Point: confident, repeatedly wrong answers. And iterative patching: fixing symptoms one by one instead of finding the systemic cause that created them. Typical in long sessions.
- Illustrative story (not a real incident), smart home 3D model:
  Bug: the living-room lamp shows as off in the 3D model while it is on.
  Patch 1: poll the device every second. Still off. "Fikset!"
  Patch 2: force a full reload of the model. Still off. "Fikset!"
  Patch 3: invert the lamp's state in the UI. The living room is now right; the kitchen lamp is now wrong. "Fikset!"
  Root cause: two lamps had their device IDs swapped in the mapping. One line. Every patch removed.
- Storyboard [proposed]:
  1. Confident and wrong: an answer stamped "Fikset!" appears, the bug is still there. Stamp again. And again. A counter climbs.
  2. Patching: a leaking pipe. Each prompt adds a patch, a new leak appears further along. The pipe becomes mostly patches.
  3. Pencil traces back to the source: one bad joint at the start. Fixed there, every leak stops.

## Model and effort [given]
- Built: src/slides/effort.js.
Point: Opus 5.5 on medium effort is the speaker's default: fast and reliable. Going above medium is rarely useful, because the work is rarely that complex. Higher effort means more attempts and more self-questioning; the model can doubt a solution that was already good and end with something more complex, or worse, because its effort level says it can't be done yet.
- Storyboard [proposed]: an effort dial next to a bridge being built.
  1. Medium: a clean bridge, done quickly.
  2. Dial turned up: the finished bridge gets extra supports, a second deck, ornaments, a tower. It sags.
  3. Pencil note: it was done three attempts ago.

## Rejected topics
Hooks, connectors (MCP), dictation, AI code review, non-developer uses: not in this talk.

---

## Story order [agreed: a journey, set in src/slides/index.js]
Each stage opens with a divider slide (src/slides/chapter.js); every slide shows the journey in the top-right corner, current stage lit.
Title: "Fra idé til startup, med AI".
0. Cold open (src/slides/opening.js): "Jeg ville finne ut om AI kunne bidra til et hobbyprosjekt." The wish (a finish flag in a thought), then 15 projects as progress bars: one over the finish line, fourteen stopping just short. No mention of the game here.
1. Idé: validate the idea (src/slides/validate.js: first the idea itself, drawn: a truck loaded with logs drives up to a city house and unloads them at the door, one by one; below, every 14 days all winter; then the everyday idea is run through four checks one card at a time: customer, willingness to pay, competition, can you build and deliver. The last one comes back yellow: winter only, so start small. Then the bigger picture: AI covers every link of the value chain with little capital, but everyone gets the same tools, so the market fills up; the openings are a niche or a product that reaches very many customers. Illustrative answers)
2. Plan: living spec → full scope → batched planning → instruction files
3. Bygg: ready to build (src/slides/ready-to-build.js: a checklist, all ticked: Hva vi skal lage, Hvem er kundene?, Kjernefunksjon, Levende kravspec, Instruksjonsarkitektur; stamped GODKJENT FOR BYGGING, then "Start.") → prototypes → visual references → describe the goal
4. Kvalitet: self-check → show, don't describe → where it fails
5. Lansering: live projects → launch and sell (src/slides/launch.js: AI wrote the listing, made the images, set the price from comparable packs, packaged docs and FBX/GLB/Blender; published; it sells)
Part 2, Arbeidsflyt (divider "Del 2"): parallel sessions → helpers → watchdog → remote and cloud sessions → model and effort → follow the gateway team
Part 3, Bak kulissene (divider "Del 3"): side quest → Claude ↔ ChatGPT loop (Fab) → the same trick in the game (references → Unreal) → I know a guy → always working → this deck is a web page (finale)
The journey (part 1) only holds slides that move the product forward; how you run the AI and the side effects live in parts 2 and 3. The corner marker shows the five stages in part 1 and the part's name in parts 2 and 3.
Closing: takeaways (src/slides/takeaways.js), every standalone tip on one page.
Callbacks that depend on order: full scope's "Alt fungerer." sets up "Fikset!"; helpers ends with the lead breaking off to check on its helper (the watchdog, next, does that check); always working reuses the watchdog's 03:12 message; the side quest's 80 % returns in the asset loop.

## Tone
No metrics as proof. Short memorable tip as title, memorable illustrated example, humor. Concise.

## Open questions
See [open] markers above.
