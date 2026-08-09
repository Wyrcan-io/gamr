# Gamr Batch C maps-and-routes implementation plan

**Created:** 2026-08-09  
**Scope:** The Quiet Heist, Tiny Fleet, Dungeon Courier, and The 13th Lift  
**Current migration state:** 12 of 20 active games have completed the automated migration gate; Batch B has an implementation packet in progress but is not yet signed off  
**Cohort milestone:** 20 of 20 active games migrated only after Batch B and this cohort complete their automated and human validation gates  
**Catalog status:** All four targets remain Workshop until reviewed individually  
**Arcade Archive:** The 19 legacy compatibility games remain unchanged and out of scope

## 1. Decision and implementation order

The final active-game cohort is Batch C, the maps-and-routes family:

| Order | Game | Signature interface | Why it goes here |
|---:|---|---|---|
| 1 | The Quiet Heist | Architectural floor plan with separate current and post-commit security layers | It establishes the cohort's most important visual grammar: where the player is now, what has been planned, and what will become dangerous after commit. It also has the clearest controller and data-model defects to repair first. |
| 2 | Tiny Fleet | Naval plotting table with grease-pencil contacts and sealed order chits | It extends the same grammar into incomplete information. It is the hardest honesty test: an estimate must look different from a sighting, and a valid order must not be presented as a guaranteed outcome. |
| 3 | Dungeon Courier | Route map beside a physical parcel label and satchel manifest | Its engine already calculates causal move costs. It should reuse the cohort's preview language while making the carried object, route risk, and immediate verb the center of the screen. |
| 4 | The 13th Lift | Elevator annunciator, button matrix, rider manifest, evidence ledger, and route tape | It has the strongest existing renderer and light-theme behavior. It closes the active catalog by proving that the new system can preserve a restrained identity while adding clue provenance and deliberate route confirmation. |

This order is fixed unless a blocker makes one target unplayable. Visual restyling alone does not count as migration. Each game must make current state, planned route or orders, uncertainty, commit boundary, and delayed result understandable without relying on color.

## 2. Gate before implementation

### 2.1 Honest migration count

The twelve games with a completed automated migration pass are:

1. Stack Trace
2. Five-Minute Kingdom
3. Dead Letter Department
4. Packet Panic
5. Signal//Noise
6. Last Train Home
7. Market of Mirrors
8. Rogue Ledger
9. Ghost Shift
10. Dice Tribunal
11. Time Capsule
12. Night Frequency

Batch B currently has an implementation packet for Blackout Grid, Containment Protocol, Orbital Post, and Botany Lab. Those four must not be counted as fully migrated until their remaining renderer, tutorial, controller, lifecycle, and first-time-player gates are complete.

Before Batch C implementation starts, record one of these decisions in the implementation update:

- **Preferred:** finish the Batch B remaining work, run the 16-game production-readiness review, apply repeated findings, and then begin The Quiet Heist.
- **Explicit overlap:** permit Batch C scaffolding and engine-boundary work while Batch B validation runs, but do not sign off a Batch C game until applicable repeated findings from the 16-game review are integrated.

Safe overlap work includes deterministic selectors, fixtures, renderer tests, controller harnesses, semantic-palette conversion, terminal-cell helpers, and lifecycle cleanup. Human migration sign-off and production promotion are not safe to overlap with unresolved repeated confusion.

### 2.2 Entry gate

Batch C implementation may begin only when:

- the Batch B completion or overlap decision is written down;
- the shared semantic palette and terminal-cell layout helpers used by earlier cohorts are stable;
- current 80x28 and 100x30 reference frames exist for all four games;
- current keyboard paths have been recorded from source, not inferred from footer copy;
- seeded start-to-result transcripts exist or are captured before mechanics-adjacent refactors;
- the team agrees that the Arcade Archive is not part of this cohort.

## 3. Source-verified baseline

The existing Graphify report was used for broad architecture navigation. The `graphify` executable is not available on PATH, so exact findings were verified directly against the target source and test files.

Current targeted automated baseline:

```text
8 test files passed
31 tests passed
```

Command used:

```powershell
npm.cmd test -- src/games/the-quiet-heist src/games/tiny-fleet src/games/dungeon-courier src/games/the-13th-lift
```

This baseline proves selected deterministic engine, solver, grid, generator, and renderer behavior. It does not prove controller reachability, full runs, all visual phases, timer cleanup, terminal-cell safety, uncertainty comprehension, or first-time usability.

| Game | Existing strengths | Source-verified blockers |
|---|---|---|
| The Quiet Heist | Two-action planning loop; deterministic guard forecast; guard reason, destination, facing, and sight cells; checkpoint-backed undo; noise, camera jam, alarm, objective, and alternate-exit interactions; shared pause menu; three engine tests | Advertised arrow keys compare against `left`, `right`, `up`, and `down`, so normal `Arrow*` keys do not move; planning mutates the displayed state immediately while the renderer ignores its checkpoint, collapsing NOW and AFTER PLAN; current and forecast sight fields share one map without a clear temporal key; tutorial is only Job 1 with no teaching progression; key, display, and exit interactions are partly hard-coded instead of consistently reading `Job`; the map draws a hard-coded `H` affordance with no matching interaction; help replaces one notice; fixed ANSI colors, raw widths, glitch animation, a 50 ms turn-based render loop, and no renderer/controller/lifecycle coverage remain. |
| Tiny Fleet | Deterministic simultaneous-order engine; one order required per living ship; player/enemy order isolation; observations separate own ships, exact contacts, and tracks; terrain, smoke, wrecks, objectives, reload, special actions, AI doctrines, reports, and campaign flow; shared pause menu; eight engine/grid tests | The main screen shows queued orders but has no deliberate full-fleet review/arm stage before sealing; resolution happens immediately and only a short report overlay remains, so movement/fire causality cannot be replayed; tracks are reduced to colon cells plus terse age/count text, weakening source and uncertainty; legal aim is not the same as predicted outcome, but the plotting surface does not explain that distinction; the footer advertises `I panel` while the controller cycles panels with Tab and has no `I` handler; fixed ANSI colors, raw widths, title glitch, continuous turn-based rendering, and no renderer/controller/lifecycle coverage remain. |
| Dungeon Courier | Deterministic floor and contracts; real tutorial offer and one-delivery tutorial ending; pure `evaluateMove`/`previewText`; parcel-specific stress, condition, meter, guard, seal, noise, time, threats, shifting gates, inventory, upgrades, delivery reports, and complete three-delivery run; shared pause menu; six engine tests | The sidebar always evaluates and labels `PREVIEW EAST`, regardless of the player's next intended direction; movement commits on direction input, leaving no persistent selected step to inspect; the preview compresses rich `ActionEvaluation` fields into a truncated reason; route survey uses placeholder-looking `STABLE 31 / FAST 22+R` text rather than a causal path model; Escape toggles pause before help/inventory can consume it, contradicting their close instructions; controls are permanently stacked rather than contextual; fixed ANSI colors, raw string width, panel content truncated to map height, continuous turn-based rendering, and no renderer/controller/lifecycle coverage remain. |
| The 13th Lift | Deterministic puzzle generator and solver; story/tutorial/after-hours modes; typed clues with speaker and current/previous source time; authentic, phantom, and anomalous landings; passenger constraints; route evaluation and decisive evidence; renderer, generator, solver, and engine tests; existing light/dark-aware warning, good, and danger colors; 80x24 compact support | Evidence renders only prose, hiding its stored speaker and source time; Enter commits directly from planning to transit, so there is no review/confirm stage; route evaluation is calculated before the transit presentation; stacked boxes can be silently cut by `lines.slice(0, rows)`; width helpers use JavaScript string length instead of terminal-cell width; help says `A,D` while the footer says `A,F`; Escape opens pause and closes an active overlay instead of closing the top layer first; two intervals plus wall-clock transit timing complicate determinism; `stop()` does not restore cursor, ANSI reset, or alternate buffer; controller/lifecycle coverage is absent. |

## 4. Cohort product contract

### 4.1 The Batch C interaction sentence

Every main loop must let a first-time player answer these questions without opening help:

1. Where am I, and what object am I controlling?
2. What is true now?
3. What route, movement, or order have I proposed?
4. Which parts are certain, estimated, or hidden?
5. What will happen only after I commit?
6. What actually happened, and why did it differ from the plan?

The shared loop is:

```text
read the map and evidence
-> select or queue a route decision
-> inspect cost, risk, and uncertainty
-> review the complete plan
-> commit deliberately
-> read a spatially stable result or replay
```

The four games share a reasoning pattern, not a skin. The museum, chart table, dungeon route, and elevator console must remain recognizable with their titles removed.

### 4.2 Temporal-layer vocabulary

Use one semantic vocabulary across the cohort while allowing each game its own marks:

| Layer | Meaning | Required treatment |
|---|---|---|
| NOW | Authoritative current state before pending input | Solid marks, primary labels, no animation. |
| PLAN | Player-authored route, move, or sealed order that has not resolved | Outlined, numbered, chained, or underlined marks; never identical to NOW. |
| FORECAST | Consequence derivable from current knowledge | Directional hatch, ghost, arrow, or explicit delta; label assumptions and uncertainty. |
| UNKNOWN | Information the player is not entitled to know | Omit it or show a bounded unknown marker; never reveal true hidden state through layout, text, color, report order, or animation. |
| RESULT | Resolved authoritative change | Stable audit/replay rows tied to the same objects or coordinates used in PLAN. |

Color may reinforce these layers but may not define them. ANSI-stripped frames must preserve the distinction.

### 4.3 Certainty vocabulary

- **KNOWN:** directly observed or guaranteed by deterministic rules.
- **ESTIMATE:** possible cells, conditional effects, or forecast ranges derived from available evidence.
- **HIDDEN:** not rendered and not used to change public wording.
- **LEGAL:** the command may be submitted.
- **SAFE:** the rules guarantee the stated outcome from available state.

Never use LEGAL as a synonym for SAFE. This matters most in Tiny Fleet, where a shot can be valid but miss, and in The Quiet Heist, where a legal planned move can become exposed after guards advance.

### 4.4 Shared implementation rules

All four migrations must use:

- `getCurrentThemePalette()` and `TerminalThemePalette` from `src/games/utils.ts` rather than fixed red, green, yellow, cyan, or magenta codes;
- `displayWidth`, `clipToWidth`, `padToWidth`, `centerText`, and `wrapText` from `src/ui/terminal.ts` for terminal-cell-safe layout;
- pure selectors for route previews, certainty layers, action summaries, and result rows;
- a pure renderer that receives game state, dimensions, semantic palette, glyph mode, and a small explicit render model for controller-owned overlays;
- the shared pause menu and existing transition dispatchers;
- an idempotent `stop()` that clears every interval and timeout, disposes the key listener, restores the cursor, resets ANSI state, and exits the alternate buffer exactly once;
- a minimum-size frame that states required and actual dimensions;
- phase-local controls that advertise only commands reachable on that screen;
- deterministic fixtures for every visible phase;
- explicit ASCII-safe equivalents for every semantic glyph;
- event-driven rendering for turn-based state, with timers only for bounded, meaningful transitions.

Do not build a generic map-game dashboard. Share behavior and vocabulary, not composition.

### 4.5 Anti-slop visual rules

- Use the quiet `g/ GAME NAME` masthead established by the migrated collection.
- Remove glitch titles, random offsets, faux scanlines, ornamental telemetry, fake loading copy, and animation without mechanical meaning.
- Use no gradients, neon rainbow coding, decorative hex wallpaper, glass-like cards, or generic RPG chrome.
- Let the game's physical decision object dominate: floor plan, sea chart, parcel route, or lift panel.
- Use boxes only for actual artifacts or boundaries: exhibit plan, order chit, parcel label, lift panel, incident form.
- Prefer exact verbs over atmospheric labels: `QUEUE STOP`, `HURRY EAST`, `SEAL ORDERS`, `JAM CAMERA`.
- Keep decorative lore outside the decision path. A glyph that looks interactive must be interactive, explained, or removed.
- At 100x30, reveal longer labels, one more report item, or wider evidence. Do not hide mechanics at 80x28.
- Preserve The 13th Lift's restrained light-theme behavior; do not force the darker games' contrast recipe onto it.

### 4.6 Preview, commit, and replay rules

- Preview selectors are pure: serializing state before and after preview produces identical state.
- Preview and commit use the same authoritative resolver or one shared domain calculation.
- The complete pending plan is visible before irreversible resolution.
- Enter first arms or opens review when a plan has meaningful delayed consequences; the confirming action is explicitly labeled.
- Backspace removes the most recent pending item. Escape cancels the top pending/overlay state before opening pause.
- A blocked action names the blocker and keeps the prior valid plan intact.
- Results use the same coordinate, ship, parcel, passenger, or stop identifiers seen during planning.
- Replays are stepable and deterministic; they do not rerun randomness or re-resolve the engine.
- Hidden truth cannot leak through preview selectors, report order, track geometry, debug labels, or renderer fixtures.

### 4.7 Test contract

Every game receives:

- renderer tests for start, briefing/tutorial, main loop, pending plan, armed review, result/report, help, pause composition, ending, and resize;
- Carbon, Paper, and Contrast theme coverage;
- 80x28 and 100x30 layout checks using ANSI-stripped terminal-cell widths;
- Unicode and ASCII semantic-state assertions;
- deterministic tutorial/first-job transcripts and one complete standard/campaign route;
- controller tests with a fake terminal, fake timers where relevant, and dispatched keyboard events;
- footer-to-command reachability tests;
- top-layer Escape precedence tests;
- restart, quit, games-menu, game-switch, repeated-stop, cursor, ANSI-reset, listener, timeout, and alternate-buffer cleanup tests;
- one regression test for every blocker in Section 3.

## 5. Delivery sequence and stop rules

| Stage | Deliverable | Exit condition |
|---:|---|---|
| 0 | Record the Batch B completion/overlap decision and capture current reference frames/transcripts | The honest migration count and allowed overlap are documented. |
| 1 | The Quiet Heist engine/controller boundary repair | Arrows work, authored coordinates drive interactions, temporal view selectors are pure, tutorial steps exist, and controller lifecycle is tested. |
| 2 | The Quiet Heist visual migration | NOW, PLAN, post-commit sight, objectives, and action cost are readable on one stable architectural plan; automated gate and three first-time sessions pass. |
| 3 | Tiny Fleet information-boundary and replay model | Observation fixtures prove no hidden-state leak; review/arm and deterministic resolution-step models exist. |
| 4 | Tiny Fleet visual migration | Contacts, uncertainty, full orders, conflicts, and replay are readable on one plotting table; automated gate and three first-time sessions pass. |
| 5 | Stealth/naval pair checkpoint | Repeated confusion about temporal layers, certainty, or commit is fixed and retested before Dungeon Courier begins. |
| 6 | Dungeon Courier intent/preview repair | Selected direction/action persists, the preview exposes causal deltas, Escape precedence is correct, and route surveys are computed rather than decorative. |
| 7 | Dungeon Courier visual migration | Parcel condition, route hazards, contextual verbs, satchel, shifts, and delivery results are understandable; automated gate and three first-time sessions pass. |
| 8 | The 13th Lift evidence/commit/lifecycle repair | Clue provenance is explicit, route review is two-stage, transit is deterministic, overlays are layered correctly, and stop cleanup is complete. |
| 9 | The 13th Lift visual migration | Annunciator, manifest, evidence, route tape, and audit fit without silent truncation in supported layouts; automated gate and three first-time sessions pass. |
| 10 | Final active-catalog review | All four individual gates pass, applicable cross-game findings are retested, and the ledger may record 20 of 20 active games migrated. |

Stop before starting the next game if the current game has a crash, unreachable advertised command, hidden-state leak, preview/commit contradiction, missing plan review, terminal overflow, timer/listener leak, failed complete-run transcript, or the same material confusion in two of the first three sessions.

## 6. The Quiet Heist implementation plan

### 6.1 Product outcome

The Quiet Heist should feel like penciling a two-beat theft onto an architect's security plan, then holding your breath as the building answers.

```text
read current guards, camera, objective, and safe floor
-> queue up to two actions
-> compare NOW against AFTER PLAN and AFTER COMMIT
-> review AP, noise, equipment, and exposure
-> commit the turn
-> read guard movement, alarm, and contract changes
```

### 6.2 Engine and data work

1. Replace hard-coded key, display, and exit coordinates in interaction and contract resolution with the active `Job` fields.
2. Remove the hard-coded `H` map affordance unless it becomes a named, authored, interactive location.
3. Add a minimal tutorial model with explicit milestones:
   - read current sight;
   - queue one safe move;
   - compare planned position and future sight;
   - undo and re-plan;
   - use a decoy or jammer;
   - commit;
   - take the key, open the display, and exit.
4. Replace the recursive full `GameState` checkpoint with a bounded planning snapshot or plan model that cannot contain another checkpoint.
5. Add pure selectors, named by behavior rather than presentation:
   - `currentPlanningState(state)`;
   - `plannedState(state)`;
   - `currentSecurityView(state)`;
   - `postCommitSecurityView(state)`;
   - `planningComparison(state)`;
   - `selectedContextAction(state)`.
6. Make the comparison expose current/planned player position, current/planned equipment and noise, AP cost, current sight, post-commit sight, guard intents, camera status, legal/blocked reasons, and objective delta.
7. Preserve the core two-action balance. Do not add free movement, pathfinding automation, or a rewind after commit.

### 6.3 Controller work

- Normalize `ArrowLeft`, `ArrowRight`, `ArrowUp`, and `ArrowDown` correctly while preserving WASD.
- Render after accepted input or bounded transition, not every 50 ms.
- Make `?` open a real help overlay rather than replacing notice text.
- Apply top-layer Escape order: cancel armed commit/local overlay, close help, then open pause.
- Advertise `U` and Backspace for undo if both are supported; otherwise choose one and make footer, help, and tests agree.
- Ensure briefing, report, ending, next job, restart, quit, games menu, and game switch all have tested key paths.
- Use the shared lifecycle cleanup contract.

### 6.4 Signature composition

The 80x28 frame should use these stable regions:

```text
g/ THE QUIET HEIST       JOB / TURN / AP / ALARM / TOOLS

ARCHITECT'S PLAN                         SECURITY LEDGER
solid current position                   NOW
numbered planned steps                   guard/camera current sight
outlined future guard marks              AFTER COMMIT
objective fixtures                       guard destinations/facing/reason

PLAN STRIP:  1 WALK E  ->  2 TAKE KEY    CONTRACT: GET THE NIGHT KEY
RISK: clear now / exposed after commit   contextual verbs + commit state
```

Required distinctions:

- current player `@` versus planned player `@2` or equivalent;
- current sight versus post-commit sight using shape/pattern and labels, not red versus amber alone;
- current guard versus future guard destination;
- interactive key, display, camera, and exits versus decorative architecture;
- queued action order and total AP;
- a risk sentence such as `SAFE NOW / SEEN AFTER COMMIT BY G2`;
- an armed commit state that repeats the two actions and dominant risk.

### 6.5 Result and tutorial presentation

- Resolve the turn into stable, ordered events: player plan, each guard move, sight/alarm result, objective change.
- Keep the result visible until acknowledged; do not flash it for a timed interval.
- Highlight changed map cells and ledger rows with textual markers such as `was -> now`.
- Tutorial callouts occupy one compact instruction band and point to real screen regions.
- Do not label Job 1 a tutorial unless its milestones are rendered and advanced.

### 6.6 Required automated tests

- all four arrow keys and WASD reach the same movement commands;
- authored job coordinates control key, display, and exits;
- preview selectors do not mutate input;
- checkpoint/planning state is bounded and supports the intended undo depth;
- NOW and AFTER COMMIT layers remain distinct after ANSI stripping;
- current-safe/future-exposed and current-exposed/future-clear fixtures;
- decoy and jam alter forecast through the shared engine calculation;
- empty, one-action, and two-action commit review;
- tutorial milestone transcript through a successful exit;
- start, briefing, planning, report, ending, game-over, help, pause, resize, ASCII, and all themes;
- controller/lifecycle matrix.

### 6.7 Human gate

Three first-time players must complete the tutorial and explain, before committing:

- where the thief is now;
- where the thief will be after queued actions;
- where each guard will move;
- which cells will be watched after commit;
- what Enter will resolve.

At least two of three must answer without opening help after the first tutorial turn. Any NOW/AFTER confusion repeated by two players blocks Tiny Fleet.

## 7. Tiny Fleet implementation plan

### 7.1 Product outcome

Tiny Fleet should feel like a compact plotting table where captains write sealed orders against imperfect contacts, not a generic grid with red enemies.

```text
read own ships, terrain, objective, and contact certainty
-> choose one ship and plot an order
-> inspect legality and conditional outcome
-> review all living ships' order chits
-> arm and seal the fleet order
-> step through a deterministic resolution record
```

### 7.2 Observation and information-boundary work

1. Keep `deriveObservation` as the public rendering boundary and add a renderer-facing view model that contains no enemy truth beyond the observation.
2. Audit every player-visible selector and report for leaks from `state.ships`, `state.orders.enemy`, true positions, target identities, or AI doctrine.
3. Model contact presentation explicitly:
   - exact visual/sweep/flash contact;
   - last exact coordinate;
   - possible-cell region;
   - age;
   - source;
   - stale/lost state.
4. Deduplicate a contact's exact marker and possible region so certainty cannot be misread.
5. Add pure order previews for the selected player's ship:
   - legal/blocked;
   - movement path and final facing when deterministic;
   - target coordinate and range/line restriction;
   - smoke placement or sweep effect;
   - conditional language where collision, enemy movement, or hidden state prevents certainty.
6. Never simulate hidden enemy orders for the player preview.

### 7.3 Review, commit, and replay model

1. Add an explicit `reviewOrders` or `ordersArmed` state after every living ship has one order.
2. First Enter opens the sealed-order docket. It must show every living player ship, its complete order, target/path, and warnings.
3. Second Enter seals and resolves. Backspace/Escape returns to editing without changing orders.
4. Preserve one order per living ship and current simultaneous resolution semantics.
5. Capture an immutable `ResolutionFrame[]` or equivalent event projection during the single authoritative resolve. Do not call the resolver again for replay.
6. Replay steps should cover, as applicable:
   - initial positions;
   - facing changes;
   - movement impulses and collisions;
   - sweep/smoke/brace effects;
   - each public shot and impact;
   - objective progress;
   - round or battle result.
7. Let Space/Right advance and Left go back through the existing frames. Enter exits replay to the next planning round or after-action report.
8. Reports must be filtered by `publicTo` before entering the player replay model.

### 7.4 Controller work

- Make the panel key truthful: either implement `I` for panel cycling or advertise Tab only. Footer, help, and controller tests must match.
- Keep arrows for aim and 1-3 for ship selection; clarify that WASD chooses helm orders rather than moving a cursor.
- Add contextual controls for editing, review, replay, and after-action phases.
- Remove the 50 ms title/render loop from turn-based play.
- Add help with an explicit legend for exact contact, estimated region, last known point, smoke, wreck, objective, and order ghost.
- Apply top-layer Escape precedence and shared lifecycle cleanup.

### 7.5 Signature composition

The dominant object is a plotting table:

```text
g/ TINY FLEET                ROUND / FLAGS / OBJECTIVE

SEA CHART                     SEALED ORDER DOCKET
own hulls + facing            1 SWIFT     AHEAD -> D4
exact contacts                2 AEGIS     SMOKE D5
estimated regions             3 FURY      FIRE G6 (conditional)
candidate path/target         READY 3/3   ENTER: REVIEW

CONTACT LEDGER                INCIDENT / REPLAY STRIP
source / age / confidence     02 FURY fires G6 -> MISS
```

Required state marks:

- own ship, neutral/courier, exact enemy, estimated contact, smoke, wreck, control point, and cursor;
- selected ship and its candidate path/target;
- assigned, missing, blocked, and conditional orders;
- exact contact versus possible-cell region without color;
- replay step number and changed chart cells.

### 7.6 Required automated tests

- observation/view-model serialization contains no unauthorized enemy positions or orders;
- exact, estimated, aged, and lost contacts render distinctly without ANSI;
- every player order type has legal and blocked preview fixtures;
- preview never consumes RNG and never mutates state;
- review cannot open with missing orders;
- first Enter reviews, second confirms, Escape/Backspace returns to editing;
- resolution frames reproduce one already-resolved state and never resolve twice;
- player replay excludes non-public enemy events;
- footer/control reachability for ship selection, aim, helm, special, brace, hold, clear, review, replay, panel, help, and pause;
- briefing, planning, review, replay, round report, battle report, ending, resize, ASCII, themes, and lifecycle.

### 7.7 Human gate

Three first-time players must complete training and one standard round, then explain:

- which enemy positions are exact and which are only possible;
- whether a valid shot is guaranteed to hit;
- what every living player ship will do before orders are sealed;
- how movement and fire actually resolved.

Any hidden-truth inference caused by the UI, or repeated confusion between LEGAL and SAFE, blocks Dungeon Courier.

## 8. Dungeon Courier implementation plan

### 8.1 Product outcome

Dungeon Courier should feel like navigating with a fragile parcel in both hands: the label changes how the route must be read.

```text
read the parcel rule and current condition
-> select a direction or contextual action
-> inspect time, stress, meter, noise, guard, and condition risk
-> commit one action
-> read the route, dungeon shift, threat, and parcel response
-> deliver and audit the contract
```

### 8.2 Intent and preview work

1. Add controller-owned or engine-owned selected intent: direction plus normal/hurry mode, or brace/wait/interact/tool.
2. Direction input selects and previews a step; a deliberate action key commits it. If direct movement is retained as an accessibility option, the default tutorial must still teach preview-before-commit and the UI must expose the active mode.
3. Remove the hard-coded east preview. `panelLines` must receive the actual selected intent.
4. Present all material `ActionEvaluation` fields:
   - target and legal/blocked reason;
   - time cost;
   - stress delta before guard;
   - guard absorbed/spent;
   - meter delta and threshold effect;
   - noise;
   - projected condition loss;
   - known gate/threat consequence.
5. Use the same calculation for preview and move commit. Add a paired test for every parcel family and seal modifier.
6. Preserve honest uncertainty: only forecast exact gate/threat changes that the rules expose.

### 8.3 Route and survey work

1. Replace `STABLE 31 / FAST 22+R` with computed, reproducible route summaries derived from the current floor, parcel rules, known gates, and survey capability.
2. A route summary must state whether it optimizes time, known stress, or condition risk; it must not promise safety through dynamic or hidden hazards.
3. Draw the selected next cell, recipient, known route, shift-sensitive gate, visible threat direction, anchor, bench, cache, niche, dropped item, and parcel-relevant hazard distinctly.
4. Keep the courier's route history only where it affects the active parcel, such as Memory Mirror or directional meters.
5. Change the visible map or route marks when survey mode changes. A text label alone is not an overlay.

### 8.4 Contextual verbs and controller work

- Replace the permanent two-line control wall with a context line such as `EAST: STEP`, `EAST: HURRY`, `HERE: DELIVER`, `HERE: BENCH`, or `TOOL 2: CHALK`.
- Keep a small stable utility strip for satchel, survey, help, and pause.
- Make Escape close help, then inventory, then a selected intent, before it opens pause.
- Ensure the inventory footer's `I/Esc` behavior matches the controller.
- Stop rendering every 50 ms; render on input/state change.
- Reset ANSI state as part of the idempotent lifecycle cleanup.
- Preserve seed on retry and expose the replay promise only where it is true.

### 8.5 Signature composition

```text
g/ DUNGEON COURIER       DELIVERY / TICK / SHIFT / PAY

ROUTE MAP                         PARCEL LABEL
courier + selected step           name / seal / size
recipient + route                 condition / stress / guard
known shift + threats             active meter / exact handling rule
parcel-relevant hazards

SATCHEL MANIFEST                  ACTION DOCKET
numbered tools / quantities       HURRY EAST
                                  +1 tick  +2 stress  -1 guard
                                  condition safe / gate changes in 2
```

The parcel label is the visual identity. Do not turn it into a generic stats card. Use mailing, handling, seal, and claim language consistently.

### 8.6 Report and tutorial work

- Delivery report shows starting and delivered condition, ticks versus par/deadline, pay calculation, seal violations, item/upgrade interventions, and decisive damage causes.
- Failure identifies the event that broke the parcel rather than showing only the final notice.
- Tutorial uses Porcelain Choir to teach selected step, preview fields, brace/guard, hurry tradeoff, one parcel hazard, interact/deliver, and report reading.
- Tutorial instructions should advance from observed engine events and remain replayable with the same seed.

### 8.7 Required automated tests

- selected north/east/south/west and normal/hurry intents render their own preview;
- preview/commit parity across all eight parcels and relevant seals;
- guard and condition-risk math is decomposed correctly in the docket;
- computed route summaries are deterministic and label their optimization/uncertainty;
- each survey mode materially changes map marks;
- help/inventory/intent/pause Escape precedence;
- contextual verb matches actual command at floor, recipient, bench, cache, anchor, and niche;
- full tutorial delivery and three-delivery standard run;
- contract, briefing, traversal, inventory, report, upgrade, ending, game-over, resize, ASCII, themes, and lifecycle.

### 8.8 Human gate

Three first-time players must complete the tutorial and one contract, then explain before a move:

- the active parcel rule;
- expected time, stress, guard use, meter change, and condition risk;
- why the chosen route is faster, calmer, or only estimated;
- what the contextual action will do.

If two players act in the wrong direction because preview selection and commit are unclear, The 13th Lift does not begin.

## 9. The 13th Lift implementation plan

### 9.1 Product outcome

The 13th Lift should feel like a quiet night-service console where every rider statement has a time and source, and departure requires signing the route tape.

```text
read riders, destinations, memo, and evidence provenance
-> queue up to three panel stops
-> inspect passenger and ordering coverage
-> open a route review
-> confirm departure
-> read deterministic transit and arrival audit
```

### 9.2 Evidence and manifest work

1. Render every clue with its speaker and source time using explicit labels such as `NOW / MIRA` or `PREVIOUS SHIFT / PORTER`.
2. Link selected passenger, destination, constraints, and clue IDs in one focused manifest region.
3. Translate typed constraints into compact, consistent route requirements: before, by stop, last off, and shared stop.
4. Keep prose voice, but never make prose alone carry source or temporal truth.
5. Show which route requirements are covered, unresolved, or contradicted by the current plan without revealing the true world.
6. Preserve the directory and service-rule overlays as reference documents, not stacked duplicates of the main screen.

### 9.3 Two-stage route commit

1. Add a `routeReview` phase or explicit armed state.
2. Planning Enter opens a route tape containing ordered stops, visible landing interpretations, rider coverage, unresolved constraints, and known warnings.
3. Confirming Enter departs. Escape or Backspace returns to planning without losing the route.
4. Empty routes remain rejected before review.
5. Do not calculate or store the true-world `lastEvaluation` until departure is confirmed.
6. Keep intercom hint confirmation separate from route confirmation, with top-layer Escape precedence.

### 9.4 Transit and lifecycle work

1. Replace `Date.now()`-owned transit with one deterministic controller transition or an explicit `advanceTransit` command driven by fakeable time.
2. Remove the duplicate 75 ms and 50 ms rendering loops. Render on state changes plus at most one bounded transit timer.
3. Prevent Enter and the timer from resolving transit twice.
4. Capture any displayed transit steps from the committed route; do not recompute route truth for animation.
5. Make `stop()` idempotently clear all timers/listeners, show the cursor, reset ANSI, and exit the alternate buffer.
6. Make active overlay close precede pause; `ESC` in hint confirmation must actually cancel as its text promises.

### 9.5 Signature composition

The 80x24 compact layout remains supported. The cohort acceptance layouts are 80x28 and 100x30, with additional regression at 80x24.

```text
g/ THE 13TH LIFT        SHIFT / RIDE / CONTINUITY / SCORE

ANNUNCIATOR + BUTTON MATRIX      RIDER MANIFEST
[ 8] [ 9] [13?] [12]             > MIRA -> RECORDS / BY STOP 2
queued order marks                PORTER -> ARCHIVES / LAST OFF

ROUTE TAPE                        EVIDENCE LEDGER
01 9  -> RECORDS                  NOW / MIRA: ...
02 12 -> ARCHIVES                 PREVIOUS / PORTER: ...
03 13 -> ? PHANTOM RISK           MEMO: ...

ENTER: REVIEW ROUTE
```

Required behaviors:

- no silent bottom truncation; layout selects or paginates content intentionally;
- the selected rider and related evidence remain visible together;
- queued route order is clearer than mere `QUEUED` badges;
- suspicious is not presented as certainly false;
- Paper theme retains readable muted, warning, good, danger, focus, and border roles;
- width calculations use terminal cells, including arrows, ellipsis, and diamond marks.

### 9.6 Audit work

- Arrival audit reuses route-tape stop numbers and rider names.
- Each failed requirement names the relevant rider, stop, and evidence.
- Authentic/phantom outcomes use text and symbols, not green/red alone.
- Decisive evidence is grouped by violation rather than appended as unstructured prose.
- The audit remains until Enter; transit animation never replaces the durable explanation.

### 9.7 Required automated tests

- every clue row includes speaker and current/previous source time;
- selected rider is linked to constraints and evidence without hidden-world leakage;
- first Enter reviews, second confirms, Escape/Backspace returns to planning;
- route evaluation is absent during planning/review and created once on confirmed departure;
- transit timer and Enter cannot double-resolve;
- overlay/hint/review/pause Escape precedence;
- renderer cell-width safety at 80x24, 80x28, and 100x30;
- no content is silently truncated; pagination/compact-mode cues are asserted;
- Carbon, Paper, Contrast, Unicode, and ASCII fixtures;
- story tutorial route, valid after-hours route, invalid route audit, finale, ending, game-over, and lifecycle matrix.

### 9.8 Human gate

Three first-time players must complete the tutorial and one generated ride, then explain:

- who supplied each decisive clue and whether it refers to now or a previous state;
- the ordered route and which riders it serves;
- what the first Enter does versus the confirming Enter;
- why the arrival audit accepted or rejected the route.

Any repeated confusion between suspicious and false, or between review and departure, blocks final active-catalog sign-off.

## 10. Cross-game first-time-player validation

### 10.1 Session protocol

Use at least three first-time players per game. Do not teach controls verbally unless the session is already marked failed for self-disclosure. Record:

- time to first valid action;
- time to first deliberate commit;
- help opens before first success;
- invalid inputs and unreachable expectations;
- whether the player can identify NOW, PLAN, FORECAST, UNKNOWN, and RESULT;
- whether the player can explain the dominant consequence before commit;
- whether the result explains any difference from forecast;
- terminal size, theme, glyph mode, platform, and seed.

### 10.2 Explanation tasks

| Game | Required explanation before commit | Required explanation after result |
|---|---|---|
| The Quiet Heist | Current thief/guards, queued actions, future sight, dominant exposure | Which guard/camera changed alarm or objective and why |
| Tiny Fleet | Exact versus estimated contacts, every ship order, conditional risk | Movement/fire sequence and what remained unknown |
| Dungeon Courier | Direction/action, time, stress, guard, meter, condition risk | Which route event changed parcel condition or contract |
| The 13th Lift | Clue speaker/time, ordered stops, rider coverage, review versus depart | Which requirement/evidence accepted or rejected service |

### 10.3 Cohort thresholds

- 3/3 players can identify the controlled object and current objective.
- At least 2/3 correctly explain the primary pre-commit consequence without help after tutorial onboarding.
- 3/3 distinguish a planned state from a resolved state.
- Tiny Fleet: 3/3 distinguish exact contact from estimated region and valid shot from guaranteed hit.
- The 13th Lift: 3/3 distinguish route review from departure.
- No advertised control is attempted unsuccessfully by two players because the footer is wrong.
- No task-critical content is clipped at supported sizes.
- A repeated confusion found in two sessions is fixed and retested with at least two new participants.

## 11. Verification matrix

Run after each game and again after the cohort:

```powershell
npm.cmd test -- src/games/the-quiet-heist
npm.cmd test -- src/games/tiny-fleet
npm.cmd test -- src/games/dungeon-courier
npm.cmd test -- src/games/the-13th-lift
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
node dist/cli.js --help
node dist/cli.js
```

Also complete:

- package tarball/smoke check used by the project;
- `git diff --check`;
- 80x24 check for The 13th Lift;
- 80x28, 100x30, below-minimum, and resize-back checks for all four;
- Carbon, Paper, and Contrast captures;
- Unicode and ASCII captures;
- Windows Terminal plus at least one additional supported terminal/platform path;
- repeated launch/stop/transition cycle with no duplicate listeners or leaked intervals;
- seeded complete-path transcripts;
- hidden-information audit for Tiny Fleet and The 13th Lift;
- footer-to-controller command matrix.

After code changes, run:

```powershell
graphify update .
```

If Graphify remains unavailable, record that infrastructure blocker in the implementation update. Do not claim the knowledge graph is current.

## 12. Risks and controls

| Risk | Control |
|---|---|
| The Quiet Heist forecast becomes a second noisy map. | Keep one plan with explicitly labeled NOW and AFTER layers; allow focused layer toggling but never unlabeled overlap. |
| Replacing recursive checkpoint changes undo behavior. | Lock current one-step behavior first, then choose and test bounded one-step or ordered multi-action undo deliberately. |
| Tiny Fleet preview leaks enemy orders or positions. | Build renderer models from `ObservationState`; serialize fixtures and assert forbidden truth is absent. |
| Tiny Fleet replay changes battle results. | Resolve once, store immutable public frames, and replay only those frames. |
| Contact regions look like confirmed occupancy. | Use region texture plus source/age labels; exact contacts get a different anchored mark. |
| Dungeon Courier preview adds an extra keystroke and slows play. | Keep direction selection immediate and commit consistent; offer direct-move accessibility only if it remains clearly disclosed and tested. |
| Dungeon route guidance becomes an auto-solver. | Show routes optimized against known costs and label uncertainty; do not account for hidden future state. |
| The 13th Lift provenance labels overwhelm the prose. | Use compact tags and selected-rider focus; preserve the full text in an evidence ledger or page. |
| The Lift's new review stage feels like duplicate confirmation. | Make review useful: show ordered stops, coverage, unresolved constraints, and known warnings that planning view cannot fit. |
| Compact 80x24 Lift layout truncates evidence. | Use deliberate compact composition or pagination with visible continuation markers; never rely on array slicing. |
| Four games converge on the same dashboard. | Require the title-free identity review for every 80-column wireframe. |
| Paper theme or Unicode breaks alignment. | Use semantic palette and terminal-cell helpers; make ASCII and Paper captures merge gates. |
| Batch C is mistaken for production readiness. | Keep automated migration, human validation, catalog maturity, and production release as separate ledger fields. |

## 13. Cohort definition of done

- [ ] Batch B completion or explicit overlap is recorded honestly.
- [ ] The Quiet Heist uses authored job coordinates for mechanics and rendering.
- [ ] The Quiet Heist supports actual Arrow keys and tested WASD parity.
- [ ] The Quiet Heist separates current, planned, and post-commit security states without color.
- [ ] The Quiet Heist tutorial teaches a complete successful job.
- [ ] Tiny Fleet player rendering is bounded by observation state with no hidden truth leak.
- [ ] Tiny Fleet distinguishes exact contacts, estimated regions, and stale information.
- [ ] Tiny Fleet shows a complete order review before sealing.
- [ ] Tiny Fleet resolution replay is deterministic, public, stepable, and non-resolving.
- [ ] Dungeon Courier previews the selected direction/action rather than east.
- [ ] Dungeon Courier exposes causal time, stress, guard, meter, noise, and condition deltas.
- [ ] Dungeon Courier route summaries are computed and honestly labeled.
- [ ] Dungeon Courier uses contextual verbs and correct overlay/inventory/pause precedence.
- [ ] The 13th Lift shows clue speaker and source time.
- [ ] The 13th Lift has a useful two-stage route review and departure flow.
- [ ] The 13th Lift transit is deterministic and cannot resolve twice.
- [ ] The 13th Lift fits at 80x24 without silent truncation and retains restrained Paper-theme behavior.
- [ ] All four use semantic palettes, terminal-cell-aware layout, and ASCII-safe state markers.
- [ ] All four remove non-mechanical glitch/continuous turn-based rendering.
- [ ] All four have renderer, controller, full-path, resize, overlay, and lifecycle coverage.
- [ ] All footer controls are reachable in their advertised phase.
- [ ] Preview/commit or review/resolve parity is tested for every game.
- [ ] Each game passes at least three first-time-player sessions and its explanation task.
- [ ] Repeated confusion is fixed and retested with new participants.
- [ ] Targeted/full tests, typecheck, build, CLI, package smoke, and diff checks pass.
- [ ] Graphify is updated after implementation or its unavailable CLI is explicitly recorded.
- [ ] The ledger reaches 20 of 20 active games only if Batch B and Batch C gates both pass.
- [ ] All four remain Workshop unless separately promoted through evidence review.
- [ ] The 19-game Arcade Archive remains unchanged.

## 14. Migration ledger and what follows

| Group | Games | State at plan creation | State after a successful Batch C cohort |
|---|---|---|---|
| Featured Four | Stack Trace, Five-Minute Kingdom, Dead Letter Department, Packet Panic | Automated migration complete; human validation still tracked separately | Unchanged except recorded validation/fixes |
| Second cohort | Signal//Noise, Last Train Home, Market of Mirrors, Rogue Ledger | Automated migration complete; human validation still tracked separately | Unchanged except recorded validation/fixes |
| Batch A remainder | Ghost Shift, Dice Tribunal, Time Capsule, Night Frequency | Automated migration complete; human validation still tracked separately | Unchanged except recorded validation/fixes |
| Batch B systems | Blackout Grid, Containment Protocol, Orbital Post, Botany Lab | First implementation packet complete; migration sign-off still pending | Must be fully validated for the 20/20 claim |
| This Batch C cohort | The Quiet Heist, Tiny Fleet, Dungeon Courier, The 13th Lift | Not migrated | Migrated only after individual automated and human gates pass |
| Arcade Archive | 19 legacy compatibility games | Out of scope | Unchanged |

After this cohort and the remaining Batch B work pass their gates, Gamr may record **20 of 20 active games migrated**. That is the end of the active-game visual migration program, not automatic proof that Gamr is ready for 1.0 production.

The next milestone is a production-candidate hardening pass:

1. close unresolved human-validation findings across all 20 active games;
2. run cross-terminal, cross-platform, theme, resize, lifecycle, and package-install coverage;
3. review Workshop/Preview/Stable labels game by game using evidence;
4. verify the active catalog and Arcade Archive separation, direct legacy launch compatibility, and bundle/export posture;
5. complete accessibility, documentation, release, crash, telemetry/privacy, and support-readiness checks;
6. cut a release candidate only when there are no open critical journey or lifecycle blockers.

Do not migrate the 19 legacy games as a hidden Batch D. They remain accessible through the separate Arcade Archive and compatibility entry points. Revisit them only through an explicit archive strategy decision after active-catalog usage and production evidence are available.
