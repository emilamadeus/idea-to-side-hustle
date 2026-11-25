# Content outline

Source of truth for what the talk says. Speaker's input is recorded as given; visual ideas are proposals.
Status: [given] = speaker's own point, [proposed] = Claude's suggestion awaiting approval, [open] = needs input.

---

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
- Storyboard [built, app flow]: the story runs in the Claude chat on the left; the scene shows what Claude does.
  1. 0 files: the worker stands in an empty room asking questions in speech bubbles; a counter shows how many times you explained the project. It builds with the wrong tool; pencil cross-out.
  2. 1 file: Claude reads one long CLAUDE.md top to bottom (Faktura, Release, Design, Sensorer, ...) while the token bar fills. An outdated line in Sensorer decides: in the chat it says it will register the sensor in sensors.json; you answer that sensors.json was dropped in March; it replies "Du har helt rett. Den linjen er utdatert."
  3. Several files: a short index card points to a filing cabinet with drawers (ARCHITECTURE, STATUS, HANDOFF, SPEC, DECISIONS, GOTCHAS, TESTING, nested CLAUDE.md). The worker opens only the two or three drawers it needs. A second and third worker arrive, read STATUS and HANDOFF, and carry on where the first stopped.
  4. Side by side for one task: the 1-file worker's read meter and stopwatch against the several-files worker's. The scroll worker is still reading when the cabinet worker is done; its usage bar is a fraction of the other.
  5. Cost: the STATUS drawer gathers dust, tagged "STATUS · 3 DAGER GAMMEL". In a new session Claude says it is starting on the login flow; you answer that login was finished three days ago; it replies "Du har helt rett! Login ble fullført for tre dager siden. Jeg ruller tilbake det jeg startet og tar neste oppgave på listen: varsler."
  6. Fix: you ask it to update STATUS when it finishes a task; it does ("login ferdig, neste er varsler"); the tag becomes "OPPDATERT I DAG". Updating the files is part of the task. Column B is labelled CLAUDE.md / AGENTS.md (one big file).

## Describe the goal, not the implementation [given] — built (src/slides/goal.js): dictated turns are numbered on the map (poll, new table, cron job, compare manually), roundabout three times, "STENGT"; goal card "Varsel innen ett minutt når et kamera går offline."; the AI takes a hidden bridge, Claude: "Dere har allerede en event-strøm fra DVR-en."
Point: requirements matter more than technical instructions; the model often picks a better approach than the one you'd dictate.
- Storyboard [proposed]: a navigation app on a city map.
  1. You enter every turn yourself (each turn labelled with a technical choice). The route follows your turns, hits road works, and stops.
  2. You enter only the destination (the requirement). The app finds a route you didn't know: a bridge that cuts the distance in half.
  3. Distance and effort counters for both routes.
- Applies to most work beyond single-file edits. No single anecdote; use an illustrated generic case.

## Visual references beat descriptions [given] — built (src/slides/visual-ref.js): a thought cloud shows the house you have in mind. Attempt 1 (list prompt) builds the cheap knock-off: grey flat-roofed box, orange paint for "varm", a heat pump, mismatched plastic windows, kitchen, sofa and bed in one window; every box ticked, but it doesn't look like what you had in mind. Attempt 2 (new session, ChatGPT reference attached) builds close to the picture, a little plainer. Then the real thing: the ChatGPT concept sheet and detail grid for the game, and the Unreal screenshot built from them (steps 3–4).
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
  3. A colleague's chat message asks for status. "Copy status" is pressed; the text flies into the reply.

## Parallel sessions with a lead session [given]
- Built: src/slides/kitchen.js.
Point: one session per task, plus one lead session.
- Storyboard [proposed]: a restaurant kitchen.
  1. One cook makes every dish in order; tickets pile up on the rail.
  2. A brigade: one station per task group (one session per task). The head chef (lead session) stands at the pass with a board: cooking, waiting for an answer, done. One ticket blinks "venter på deg".
  3. Orders go out in parallel; the ticket pile empties.
- The lead session tracks the others: which are working, which are waiting for a response, which are done.

## Lead session first, helpers rarely [given]
- Built: src/slides/helpers.js.
Point: do the work in the lead session itself. Helpers (subagents spawned by a session) only occasionally, mostly for planning or research, almost never for implementation. With helpers implementing: poorer results, long waits, and wait locks where a helper never reports back as finished while the lead keeps waiting.
- Terminology for the slide: "session" = a task you started; "helper" = a subagent a session starts by itself.
- Storyboard [proposed]: same kitchen as the parallel-sessions scene.
  1. The head chef cooks the main course themself. Plates go out steadily.
  2. The head chef sends a runner to fetch and check an ingredient list (planning help): the runner comes back fast with the answer. Good use.
  3. The head chef hands the runner a whole dish to cook. The runner finishes, then stands in the corridor holding the plate, never calls "ferdig". The head chef waits at the pass; tickets pile up; a clock runs. Pencil: "ferdig for 40 min siden".
  4. The night guard (watchdog) opens the corridor door, finds the runner, and walks the plate to the pass.

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
- Built: src/slides/watchdog.js (same kitchen at night; set up by a plain chat request).
Point: a scheduled check every ~10 min looks at all running jobs: RAM lock, agents waiting on each other, idle agents, and helpers that finished but never reported back to the lead. Keeps work going overnight.
- Storyboard [proposed]: night shift.
  1. Lights dim, the clock runs from 22:00 to 06:00. A night guard with a flashlight does a round every 10 minutes.
  2. Round 1: two sessions each waiting for the other (arrows pointing at each other). The guard breaks the tie.
  3. Round 2: one session asleep at its desk. Pencil: idle since 02:14. Woken up.
  4. Round 3: one session swelling with memory. Restarted with a handoff.
  5. Round 4: the guard checks the corridor too: a helper sits with a finished result it never handed in; the lead is still waiting. The guard delivers it.
  6. Morning: all work done.
- Set up by plain request ("run this check every 10 minutes"); no special commands. In Claude Code that becomes a recurring loop in the session.

## Remote sessions and notifications [given]
- Built: src/slides/remote.js.
Point: a big win. The AI always sends a notification when it is done or needs a decision, so work never stops waiting for you. Reach sessions from anywhere (phone); use cloud sessions when possible, or when the desktop/laptop isn't available.
- Storyboard [proposed]: a production line.
  1. Without: the line reaches a gate with a red lamp "venter på beslutning". You are at a café. The clock runs; dust settles on the line.
  2. With: your phone buzzes on the café table. You tap "Ja". The gate opens, the line moves again.
  3. The laptop lid slams shut. The whole line lifts into a drawn cloud and keeps running up there. The phone shows it finishing.

## Always working (humor) [given]
Point: being this productive with AI means you are always working. Notifications arrive at odd times and you start the next task.
- Storyboard [built]: one main character across five scenes. Clock spins to each moment; attention ring shows HER vs JOBB.
  In every scene the phone buzzes (vibration arcs), lights up the face, the head turns, the notification pops out of the phone, a one-word reply, "→ neste oppgave startet", while the others keep talking.
  1. 09:14 meeting: phone under the table while the presenter talks Q4. HER 40 %.
  2. 11:47 lunch: colleague mid-story, steaming coffee. HER 65 %.
  3. 18:30 dinner with the wife, three clicks: (a) cosy dinner, "Så fint med en kveld for oss to.", buzz, notification, reply. (b) She gets annoyed, arms crossed: "Gymbro spurte om jeg ville henge." Pause. He says "2 sek." without looking up; candles shrink. (c) She stands up smiling at her own phone and walks out; candles go out with smoke; he looks up, grins "Ferdig!" at the empty chair.
  4. Night, three clicks, same wake-up each time (buzz, eyes open, phone up, answer, phone back, asleep): 03:12 "Watchdog: alt kjører. 3 økter jobber." → "Bra."; 04:37 "Økt 2 lurer på: Postgres eller SQLite?" → "Postgres." (partner wakes, gives a look); 05:58 "Alt ferdig. Starte neste batch?" → "Ja." (dawn in the window, partner stays awake, annoyed).
  5. Christmas Eve 19:42: tree lights blinking, presents being opened, "Se hva jeg fikk!".
  6. The week: calendar fills with "jobb (litt)".
- Twists [built]:
  - Meeting: after his reply the lights dim and every phone in the room glows: both colleagues under the table, the presenter's in her blazer pocket. Rubber duck and stickered laptop on the table.
  - Lunch: the colleague's story is "… så sa jeg: legg vekk telefonen!"
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
- Storyboard [proposed]: an architect's wall.
  1. Without: a crew starts on the ground floor before the stairs are drawn; walls get moved later.
  2. With: every task is drafted as a sheet and pinned to the wall first (planning, in auto mode, told "kun planlegging"). Only cards marked "produktbeslutning" come to you.
  3. Then the whole set is built in one pass.

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
Point: one session per bigger task or task group. Merge candidate with "Parallel sessions with a lead session".

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
- Example: this deck's visual identity: four live directions, the speaker picked one, the rest deleted.
- Storyboard [proposed]: four live mini-decks side by side (the real directions from this deck). Three slide away, one grows to fill the screen: the deck you are watching.

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
1. Idé: validate the idea (src/slides/validate.js: a market map, modern/medieval × static/destructible; the empty square is the gap; illustrative market picture) → prototypes → visual references → describe the goal
2. Plan: full scope → batched planning → living spec → instruction files
3. Bygg: parallel sessions → helpers → watchdog → notifications → always working → gateway → I know a guy
4. Kvalitet: self-check → show, don't describe → where it fails → model and effort
5. Lansering: live projects → side quest → Claude ↔ ChatGPT loop (Fab) → launch and sell (src/slides/launch.js: AI wrote the listing, made the images, set the price from comparable packs, packaged docs and FBX/GLB/Blender; published; it sells) → this deck is a web page (finale)
Closing: takeaways (src/slides/takeaways.js), every standalone tip on one page.
Callbacks that depend on order: full scope's "Alt fungerer." sets up "Fikset!"; helpers ends on the guard (watchdog next); always working reuses the watchdog's 03:12 message; the side quest's 80 % returns in the asset loop.

## Tone
No metrics as proof. Short memorable tip as title, memorable illustrated example, humor. Concise.

## Open questions
See [open] markers above.
