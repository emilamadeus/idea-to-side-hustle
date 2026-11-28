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

## Visual references beat descriptions [given] — built (src/slides/visual-ref.js): the firewood subscription's front page, right after "Varm peis" was picked. A thought cloud shows the page you have in mind. Attempt 1: a good, full description ("Mørk, varm bakgrunn, som en stue om kvelden. En peis med flammer til høyre … Stor overskrift «Ved på døra.» til venstre … en avrundet oransje knapp: Bestill.") becomes a checklist; every box is ticked, but the page is not what you had in mind: a flat muddy brown, a clip-art brick fireplace with a smiling flame, the headline in the default serif, a glossy orange BESTILL pill. The point: even a good description loses to a reference picture on the visual result. Attempt 2 (new session, ChatGPT reference attached) builds close to the picture, a little plainer. The game example (ChatGPT concept sheet and detail grid, then the Unreal screenshot) is its own slide in Bak kulissene: src/slides/game-ref.js.
Point: models check off text bullet points instead of reaching the actual target. A ChatGPT concept image gives a target to match.
- Storyboard [proposed]:
  1. A checklist ("moderne", "varm", "åpen planløsning", "store vinduer") is fed in. The AI builds a house, ticking each box as it goes.
  2. Result satisfies every bullet and is clearly wrong: one wall is entirely window, open plan includes the bathroom, a fireplace in every room. Every box ticked.
  3. A concept image slides in from the side. The build reshapes to match it. Same AI, different target.

## Commit after every step [agreed] — built (src/slides/commits.js): the firewood subscription. "Commit etter hvert ferdige steg." turns Bydeler, Kunder, Abonnement into save points on a line with HEAD; tests green. "Lag pause-funksjonen." is committed but turns Abonnement and Leveringsdager red. "Gå tilbake ett steg." drops the bad commit, HEAD back on Abonnement, all green; then pause again without touching the delivery days, committed green.

## Give the full scope before starting [given]
Point: scope changes the core implementation. Step-by-step on a big task means each step patches the last.
- Storyboard [proposed]: drawing revisions (REV A, B, C …) in the title block.
  1. "Lag et hus" → a cabin. "Legg til garasje" → a garage bolted on at a different height. "Andre etasje" → a floor balanced on the roof ridge with braces. "Takterrasse med basseng" → no stairs were ever planned, so one is bolted on outside and ends in mid-air. Next to it, the AI's confident status: "✓ Takterrasse med basseng lagt til. Alt fungerer." (sets up the "Fikset!" gag in "Where it fails").
  2. Rewind. One prompt with the full scope, REV 0. The same requirements become one clean house, built in one go, lifted into 3D.
  3. REV 1 from the customer: "Kan bassenget være i kjelleren?" The 3D house cracks down the middle and the pool drops out.

## The living spec file [given]
- Built: src/slides/spec.js. The example spec is the firewood subscription (Vedabonnement): order page, summer pause, an SMS the day before delivery (blocked on the route plan per district), Vipps.
Point: for bigger work, the AI keeps an HTML spec up to date as it works: titles, expandable detail, hidden agent-only instructions, done/blocked/dependencies with reasons, a copy-status button per task.
- Storyboard [proposed]:
  1. The real spec of this presentation, live on screen. A task expands, a dependency line lights up the task it blocks.
  2. X-ray mode: the page slides apart to show the hidden layer only agents read (the instruction comment and agent notes).
  3. A colleague asks for status. "Kopier status" drops a short, readable summary into the reply (Bestillingsside: ferdig. Sommerpause: i arbeid. SMS før levering: venter på ruteplanen.); they react with a thumbs up.
  4. They ask about one task. That row's own copy button drops everything about it: status, why it is blocked, what it waits for, the plan.
  5. Each task also has a "✻ prompt" button: one line with the task id, "Sjekk status på V3 i spec.html og fortsett derfra." Claude reads the spec itself: "V3 venter på R2. Ruteplanen er klar nå, så jeg starter på V3."
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
- Live: every time the developer's phone buzzes on the slide, every phone in the room that has ved.atladeus.com open gets the same notification as a "Claude Code" banner (and a buzz on Android). Sent only from the audience window, never on replays (src/engine/relay.js).
Point: being this productive with AI means you are always working. Notifications arrive at odd times and you start the next task.
- Storyboard [built]: one main character across three scenes (lunch and Christmas Eve were cut). Clock spins to each moment; attention ring shows HER vs JOBB.
  In every scene the phone buzzes (vibration arcs), lights up the face, the head turns, the notification pops out of the phone, a one-word reply, "→ neste oppgave startet", while the others keep talking.
  1. 09:14 meeting: phone under the table while the presenter talks Q4. HER 40 %.
  2. 18:30 dinner with the wife, three clicks: (a) cosy dinner, "Så fint med en kveld for oss to.", buzz, notification, reply. (b) She gets annoyed, arms crossed: "Gymbro spurte om jeg ville henge." Pause. He says "2 sek." without looking up; candles shrink. (c) She stands up smiling at her own phone and walks out; candles go out with smoke; he looks up, grins "Ferdig!" at the empty chair.
  3. Night, three clicks, same wake-up each time (buzz, eyes open, phone up, answer, phone back, asleep): 03:12 "Watchdog: alt kjører. 3 sessions jobber." → "Bra."; 04:37 "Session 2 lurer på: Postgres eller SQLite?" → "Postgres." (partner wakes, gives a look); 05:58 "Alt ferdig. Starte neste batch?" → "Ja." (dawn in the window, partner stays awake, annoyed).
  4. The week: calendar fills with "jobb (litt)".
- Twists [built]:
  - Meeting: after his reply the lights dim and every phone in the room glows: both colleagues under the table, the presenter's in her blazer pocket. Rubber duck and stickered laptop on the table.
  - Dinner, last click: she stands up with her phone; her screen zooms in: she is asking Claude "Hvordan får jeg dama til å legge vekk telefonen?" (Claude typing). Then she leaves.
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
- Built: src/slides/side-quest.js (character: src/engine/minidev.js). The developer builds and breaks the Gantt chart himself: a rigged figure 1.5 bars tall (hoodie, glasses, sneakers, laptop glow) types at a standing desk while a bar fills, scratches his head as the next need appears as an idea (a lightbulb flickers on over his head, the words beside it) ("Trenger: 50 assets", "Trenger: 20 teksturer"), chops the bar with a wind-up, braces and pushes the rest to its new estimate (the launch line moves with it), wipes his brow, drags in the next pipeline. A facepalm at the second need; a look up and a "Pff." sigh when the game's rest is knocked along. Textures: a 'trengte 20' mark near the start of the texture bar, then the bar fills with small material tiles all the way to 500. Assets: a 'trengte 50' mark at the start of the asset bar, the rest fills with prop tiles to 20 000+, published, and a fist pump. At 80 % he jabs the keys and sinks onto the laptop. "Hvilken nå?" as he hops rows, looking left and right. Finale: "Løsningen: én pipeline til." and an endless zoom into his laptop screen. Bottom left, a close-up ("NÆRBILDE") of the same developer, head and shoulders, with his face and slump following the story; his motivation is four coffee cups that drain step by step (the last one tips over at 80 %), with a refill at "Publisert".

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
- Built: src/slides/self-check.js. The firewood subscription.
Point: the AI checks the result before you do. Every "Ferdig!" that isn't finished costs you an interruption.
- Attempt 1: you are out delivering firewood (four stops: Majorstua, Frogner, Grünerløkka, Sagene) while the AI builds the order page. At each stop the phone buzzes "Ferdig!", you open the page and it's broken (Bestill cut off on mobil, price 0 kr, delivery on a Sunday); "Nei, …". The last stop comes after dark, the customer waiting in the doorway.
- Attempt 2 (new session): "Sjekk den selv på mobil og kjør bestillingstesten før du sier ferdig." The truck drives the whole route; a background panel shows the AI catching the same three faults itself. One notification at the end, the page is right. "Ja."

## Batched planning [given]
- Built: src/slides/planning.js.
Point: scope up a batch of tasks before any implementation. Always run in auto mode (avoids accidentally implementing while in plan mode); tell the agent in words that it is only planning. It should only ask about product decisions, or when it can't give the best answer itself.
- Storyboard [built]: the firewood subscription from the idea stage, as a stack of blocks.
  1. Attempt 1, one request at a time, in the order a founder thinks of them: "Lag bestilling av ved." → "Gjør det til abonnement, hver 14. dag." (the ordering only knew one delivery) → "Kunden skal kunne pause i januar." (the subscription had no pause) → "Lever én bydel om gangen." (nothing knew where the customer lives). The stack comes apart three times; tokens climb to 38k.
  2. Attempt 2, new session in auto mode, "Kun planlegging": you hand over the spec (Ved på døra, uten å bære · Folk i byen med peis · Vipps, SMS før levering · Ikke nå: sommersalg) and everything that has to work, in your own words and order ("Må fungere": Bestilling, Abonnement, Pause, Varsler, Kunder, Bydeler). The build order is the AI's job. It asks what it needs ("Skal kundene kunne pause abonnementet?" "Ja." · "Betaler de per levering eller per måned?" "Per levering."), then "Da har jeg det jeg trenger." and numbers the sections itself: Bydeler 1, Kunder 2, Abonnement 3, Pause 4, Bestilling 5, Varsler 6.
  3. Built in one pass, in that order.

## Skills / custom commands [given] — built (src/slides/skills.js, Del 2 after model and effort): without a skill, the same long prompt and four different looks; Claude writes concept-image-skill once; one line gives fifty sheets in one style in medieval/castle/furniture/; ChatGPT reads the orders in asset-queue.md on its own.
Point: turn what you repeat into a skill. Used rarely, for very specific and repetitive workflows.
- The real example, from the 3D asset pipeline (the asset loop): Claude does all the modelling, but to hit the target quality and look of each asset it needs reference/concept images. Claude described in the shared file exactly how it wanted those images, and wrote a skill for ChatGPT that delivers exactly the concept images Claude asks for, in the style Claude asks for, saved to folders the prompt decides in advance.
- Usage became one line: "<concept-image-skill> <era> <category> <sub-category> <amount>", e.g. "concept-image-skill medieval castle furniture 50".
- The output comes back consistent: the same style every time, as Claude envisioned it, in a form that fits Claude's workflow.
- Triggered two ways: by the speaker manually, or by ChatGPT reading the order from the shared file.

## Show, don't describe [given]
- Built: src/slides/show.js. The firewood order page on a phone, drawn as the real site looks (ved.atladeus.com): logo, Åpen nå, the sack picker, 129 kr, Bestill.
Point: screenshots beat explaining. When an issue is hard to explain: paste the image into a fresh agent, ask what is wrong as prompts, feed those back.
- Attempt 1: "Knappen nede til høyre overlapper teksten på mobil." (Bestill sits on top of the price.) The AI moves "Se priser" instead, "Fikset!".
- Attempt 2 (new session): a circled screenshot, "Denne." Bestill moves below the price.
- Hard to explain: the landing page ("Ved på døra, hele vinteren." running off the screen) goes to a fresh agent; it circles three problems (the Stablet icon off the line, the headline cut on mobile, dark body text on dark) and returns them as numbered prompts.

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
- Live vote (src/slides/prototypes.js, phone: ved/public/js/vote.js): four equally finished directions (src/engine/landings.js: Skog, Nordisk enkel, Rask levering, Varm peis). The room votes on their phones ("Velg visuell retning"); every vote is a log that arcs onto a woodpile under its design, the leader glows. Or press S on the vote step to skip the vote: all four go straight into the sudden death, which finishes on its own. Closing: a tie becomes a 15-second sudden death (phones chop, chips fly, countdown on the TV). Three in the bin, the winner stamped VALGT. No votes: Varm peis. The winner becomes ved.atladeus.com's look and the go-live window shows it. QR to join on the title slide. Deploy the site with `npm run ved:deploy` (it syncs the shared drawings first).
- Built: src/slides/prototypes.js.
Point: build several versions and pick, instead of debating one.
- Example: the firewood subscription's landing page: four real proposals (Skog, Nordisk enkel, Rask levering, Varm peis), same offer "Ved på døra. Hver 14. dag, hele vinteren. Bestill"; one picked (Varm peis), the rest binned.
- Storyboard [built]: asked in the chat for four proposals; they flip past one at a time; side by side for the pick, three go in the bin, the chosen one grows back and is stamped VALGT.

## Where it fails [given]
- Built: src/slides/fails.js. The firewood subscription.
Point: confident, repeatedly wrong answers, and patching symptoms instead of the cause. Typical in long sessions.
- Illustrative story: customers in Grünerløkka get the "veden kommer i morgen" SMS on Tuesday; the truck comes Thursday. Route plan (truth) beside the SMS days.
  Patch 1: resend the SMS. Still Tuesday. "Fikset!"
  Patch 2: rebuild the SMS queue. Still Tuesday. "Fikset!"
  Patch 3: send every SMS a day later. Grünerløkka is right; Frogner now gets it on delivery day. "Fikset!!"
  New session, asked for the cause: postcode 0552 sits under Frogner in bydeler.json. One line. Every patch removed.

## Model and effort [given]
- Built: src/slides/effort.js.
Point: Opus 5.5 on medium effort is the speaker's default: fast and reliable. Going above medium is rarely useful, because the work is rarely that complex. Higher effort means more attempts and more self-questioning; the model can doubt a solution that was already good and end with something more complex, or worse, because its effort level says it can't be done yet.
- Storyboard [proposed]: an effort dial next to a bridge being built.
  1. Medium: a clean bridge, done quickly.
  2. Dial turned up: the finished bridge gets extra supports, a second deck, ornaments, a tower. It sags.
  3. Pencil note: it was done three attempts ago.

## The room takes part [built]
The audience joins from the title slide's QR (ved.atladeus.com) and stays on the page all talk. No AI runs during the talk; everything is the relay and the phones.
- Joining (00-title.js, ved/public/js/room.js): the phone asks "Hva heter du?" (optional, word filter in the relay). Each joiner lands as a named glowing mote with a small burst and orbits the title; "N med" under the QR. In the zoom-out (zoom.js) everyone drifts by name in the space behind the panels, in the gaps, at different depths for parallax; a newcomer flares in.
- The phone's lobby (ved/public/js/lobby.js): until the shop opens, the page wears the talk's look, not the shop's: title, warm grid, crop marks, title block, and the room as an orbit of named dots around the count, yours marked "deg" in pencil. When the shop opens, the orbit collapses to a point, flashes in the winning design's colour with the Ved. wordmark, and the shop appears.
- After the launch: the Del 2 divider closes the shop, and every phone (receipt or not) goes back to the lobby. The lobby's title block shows the talk's current part, sent by each divider; the title slide clears it for a new run.
- The room sets the price (price.js, right after validate): every phone gets a slider (50–300 kr) for a sack delivered; each answer is a dot in the person's colour over its price, and the median is the price, live. Step 1 stamps it SATT; the shop and the go-live revenue use it. No answers: 129 kr.
- The arena (arena.js, after game-ref in Bak kulissene): every phone is a game controller (joystick, fire button, three hearts) and shows the whole arena with your dot labelled Du; zooming is locked while it is open. Step 0 opens it (phones move, no shooting); step 1 counts down and starts the fight. Hits drain a dot a third at a time and break it apart at zero. After 20 s a ring closes in over 45 s; outside it you lose a life every 2.5 s. Last one standing is named on the left (award: Sist igjen). Out phones show their place and a cheer button that sends sparks to the TV. Bots fill in below three phones. The presenter can click on at any moment.
- Phones during the talk: after the title slide's first click the waiting room dims. A faint strip with the room's orbit, a centred screen icon over "Følg med på skjermen" A room activity wakes the phone: yellow light fills the screen from the centre with a phone badge, "Din tur" and the activity's name, then the activity shows. On the TV, a yellow "Ta frem telefonen" cell joins the title block while an activity is open. The relay still collects the tips of slides with `pocket: true` (five so far) for the end of the talk; not shown yet.
- Ring rundt feilen (heal.js, between self-check and show): every phone gets the firewood order page (busy: order form, sacks, delivery days, price) with five subtle bugs: the headline cut at the edge, a typo ("vedne"), a tilted sack tile, Bestill on top of the price, near-invisible small print. Circling one heals it on every phone and on the TV. The relay judges each ring: exactly one bug inside and not much bigger than it, at most one ring a second. The TV shows every ring live: misses flash pink and fade, hits stay green with a numbered tag in the margin (name, bug, time). When all five are found (or on the next click): the healed page next to the broken page with every ring the room drew, and the finders on the left. About a minute. Award: Skarpeste øye (fastest find). The old spot-the-SMS game on fails step 0 is gone; fails starts at the bug.
- The remote goes to the room (remote.js step 3): one random named phone gets a big Neste button; its tap moves the deck on. The presenter can still click at any time.
- The room is the watchdog (watchdog.js): step 0 gives each phone a session (Varsler, Kamera-API, Tester). At steps 1, 2 and 5 that session's phones get an alarm with a Fortsett button; the card under the clock shows who answered and how fast, or "Ingen i salen svarte".
- The room lights up (html-deck.js step 1): every phone goes full-screen colour in the site's design and pulses on the relay's clock, a wave in join order, for 14 s. A mirror ball drops in on each phone, turning, with beams and light spots. On the slide, the free left column gets a mirror ball, sweeping beams and a DJ table with spinning records and a level meter (src/engine/disco.js); they make way for the code at step 2.
- Kveldens priser (awards.js, before the takeaways): six medals hang from a rail on ribbons, face down. One by one a light comes down, the medal turns gold, the ribbon fills, sparks fly and the winner's name rises in their colour: Først inne, Skarpeste øye (fastest bug finder), Første kunde, Lengst unna, Mest ved, Sist igjen (the arena). Only real data; an unearned award shows "Ingen". Winners' phones show a gold medal.
- Lanser før det er perfekt (ship.js, before go-live; the Lansering tip): step 0, the prompt "Gjør siden klar for lansering." and the AI ticks the launch chores (domene og DNS, deploy, personvern, vilkår, delingsbilde, 404-side, feilvarsling); your wish list (mørk modus, animasjoner, egen app, nyhetsbrev) drops into a drawer labelled ETTER LANSERING. Step 1, "Slik gjør du det" (not how Ved. runs): a phone and three drawn services, Cloudflare (hosting, domain, DNS), Supabase (database, login), Resend (e-mail), each with a 0 kr tag; an order runs through and the confirmation lands on the phone. Step 2, the receipt: hosting, database, e-mail 0 kr, domain about 150 kr a year, the AI subscription you already have; pencil note "gratisnivået holder lenge". Every phone gets a quiet card with the three services and links (no wake-up).
- Grepene (takeaways.js, last): the journey drawn as a route; the firewood truck drives it, each station lights and its tips drop in as numbered tags; a strip below holds the tips from Arbeidsflyt and Bak kulissene.
- Later: tips ready to use on the phone (copy buttons).

## Rejected topics
Hooks, connectors (MCP), dictation, AI code review, non-developer uses: not in this talk.

---

## Story order [agreed: a journey, set in src/slides/index.js]
Each stage opens with a divider slide (src/slides/chapter.js); every slide shows the journey in the top-right corner, current stage lit.
Title: "Fra idé til lansering, med AI".
0. Cold open (src/slides/opening.js): "Jeg ville finne ut om AI kunne bidra til et hobbyprosjekt." The wish (a finish flag in a thought), then 15 projects as progress bars: one over the finish line, fourteen stopping just short. No mention of the game here.
1. Idé: validate the idea (src/slides/validate.js: first the idea itself, drawn: a truck loaded with logs drives up to a city house and unloads them at the door, one by one; below, every 14 days all winter; then the everyday idea is run through four checks one card at a time: customer, willingness to pay, competition, can you build and deliver. The last one comes back yellow: winter only, so start small. Then the bigger picture: AI covers every link of the value chain with little capital, but everyone gets the same tools, so the market fills up; the openings are a niche or a product that reaches very many customers. Illustrative answers)
2. Plan: living spec → full scope → batched planning → instruction files
3. Bygg: ready to build (src/slides/ready-to-build.js: a checklist, all ticked: Hva vi skal lage, Hvem er kundene?, Kjernefunksjon, Levende kravspec, Instruksjonsarkitektur; stamped GODKJENT FOR BYGGING, then "Start.") → prototypes → visual references → describe the goal → commit after every step
4. Kvalitet: self-check → show, don't describe → where it fails
5. Lansering [built and deployed to https://ved.atladeus.com: src/slides/go-live.js + ved/ (Cloudflare Worker, `npm --prefix ved run deploy`); the deck's relay key lives in .env.local (not committed); keys: R recorded orders (on the go-live slide); on every slide X empties the shop, C closes it, V resets the vote and the look]: the jaw drop. The firewood business becomes real and the audience are its first customers. "Gå live" button: the frame falls away, the address bar flips from localhost to a real domain. A big QR code, "Bestill ved." The audience order on the real deployed Varm peis site (pick a district, optional first name; no payment, no personal data). The audience type any address in Norway (suggestions from Kartverket). On the TV a live map (MapLibre, OpenFreeMap tiles in the talk's colours) pins each address and eases to frame them all; the truck drives a route along real roads (OSRM through the relay). Each phone gets "Veden kommer i morgen" as an on-page/push message (the Kvalitet bug, working). Needs: deployed site, a small realtime relay (serverless + SSE/websocket), a map scene; fallback key replays a recorded batch if the network fails. This is also where the audience phone participation goes.
Part 2, Arbeidsflyt (divider "Del 2"): parallel sessions → helpers → watchdog → remote and cloud sessions → model and effort → skills → follow the gateway team
Part 3, Bak kulissene (divider "Del 3"): side quest → Claude ↔ ChatGPT loop (Fab) → the same trick in the game (references → Unreal) → always working
Part 4, Ekte prosjekter (divider "Del 4"): live projects (src/slides/projects.js) → I know a guy (src/slides/know-a-guy.js) → launch and sell (src/slides/launch.js: AI wrote the Fab listing, made the images, set the price from comparable packs, packaged docs and FBX/GLB/Blender; published; it sells) → this deck is a web page (finale)
The journey (part 1) only holds slides that move the product forward; how you run the AI and the side effects live in parts 2 and 3. The corner marker shows the five stages in part 1 and the part's name in parts 2 and 3.
Closing: takeaways (src/slides/takeaways.js), every standalone tip on one page.
Callbacks that depend on order: full scope's "Alt fungerer." sets up "Fikset!"; helpers ends with the lead breaking off to check on its helper (the watchdog, next, does that check); always working reuses the watchdog's 03:12 message; the side quest's 80 % returns in the asset loop.

## Tone
No metrics as proof. Short memorable tip as title, memorable illustrated example, humor. Concise.

## Open questions
See [open] markers above.
