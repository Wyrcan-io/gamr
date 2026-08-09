# Gamr Batch B systems-and-instruments implementation plan

**Created:** 2026-08-09  
**Scope:** Blackout Grid, Containment Protocol, Orbital Post, and Botany Lab  
**Current automated migration state:** 12 of 20 active games migrated  
**Cohort milestone:** 16 of 20 active games migrated after implementation and validation  
**Catalog status:** All four targets remain Workshop until reviewed individually  
**Arcade Archive:** The 19 legacy compatibility games remain unchanged and out of scope

## 1. Decision and implementation order

The next four games are Batch B, the systems-and-instruments family:

| Order | Game | Signature interface | Why it goes here |
|---:|---|---|---|
| 1 | Blackout Grid | Electrical one-line diagram with breaker, load, and storm flow | It is the cohort's only real-time game and should establish the system-flow, virtual-time, pause, and forecast contract before the turn-based games copy the wrong assumptions. |
| 2 | Containment Protocol | Four-room containment cross-section with current, pending, and projected environmental bands | Its configure/forecast/commit loop is the family reference, but source inspection found input, preview, and inactive-system problems that must be repaired before visual polish. |
| 3 | Orbital Post | Orbit-window strip with three relay lanes and ghost reservations | Its scheduling engine is already deterministic; it should reuse the preview language proven by Containment Protocol without inheriting its visual composition. |
| 4 | Botany Lab | Greenhouse bench with living silhouettes, chamber tracks, and a contract clipboard | It has the strongest existing preview/commit invariant in the cohort and should close the batch by proving that a dense simulation can become calmer without losing depth. |

This order is fixed unless a blocker makes one game unplayable. A game may not be marked migrated because its colors, title, or borders changed. It must expose the system's current state, the selected intervention, the forecast consequence, and the post-commit result.

## 2. Gate before implementation

The twelve games with an automated migration pass are:

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

Human first-time-player validation remains incomplete across this set. Before Batch B mechanics are changed, record one of these decisions in the implementation update:

- **Preferred:** complete the 12-game production-readiness review, fix repeated confusion, and then start Blackout Grid.
- **Explicit overlap:** permit Batch B preparation and implementation while that review runs, but apply repeated cross-game findings before any Batch B game is signed off.

Wireframes, fixtures, semantic-palette conversion, renderer extraction, and test scaffolding are safe during an overlap. Production promotion is not.

## 3. Source-verified baseline

The existing Graphify report was used for architecture navigation. The `graphify` executable is not available on PATH, so the findings below were verified directly against the target source files and tests.

Current targeted automated baseline:

```text
5 test files passed
23 tests passed
```

Command used:

```powershell
npm.cmd test -- src/games/blackout-grid src/games/containment-protocol src/games/orbital-post src/games/botany-lab
```

This baseline proves selected deterministic engine behavior and a small renderer slice. It does not prove controller reachability, a complete campaign, all visual phases, terminal-cell safety, timer cleanup, or first-time usability.

| Game | Existing strengths | Source-verified blockers |
|---|---|---|
| Blackout Grid | Authored topology and five stages; deterministic engine; radial-source safety; cold-pickup load; repair, load-shed, generator, and upgrade systems; close-breaker preview; shared pause menu; six tests including minimum-size rendering | The renderer uses fixed ANSI colors, raw string widths, title glitches, and color-led line states; tutorial state is initialized but never advances or renders; focus timing and charge mutation live in the controller rather than the engine; only breaker closing has a useful action preview; forecast shows event kind and time but not the affected path/load; controller/timer/lifecycle behavior has no automated coverage. |
| Containment Protocol | Deterministic seed replay; pending room configuration; four-room/anomaly model; cycle reports; shared pause menu; three engine tests | Arrow controls are advertised but compare against `left`/`right` rather than `ArrowLeft`/`ArrowRight`; pending configuration is shallow-copied and can mutate the input state; the displayed demand "preview" is the previous cycle result; technician moves and probes resolve a cycle immediately outside configure -> forecast -> commit; `activeFaults` and `observations` are stored but unused; five of six advertised upgrades have no engine effect; `modeSelect` and `upgrade` phases are unused; rules/help/log only overwrite one notice line; no renderer, controller, resize, or lifecycle tests. |
| Orbital Post | Deterministic weather and jobs; exact placement validation; lane reservations; explicit arm-before-resolve; visible blocked work; future arrivals; campaign reports; Unicode/ASCII glyph tables; six engine tests | `toggleForecast` toggles `logOpen`, so the advertised forecast key opens the incident log; the forecast is already permanent, making the extra command misleading; Enter is advertised as resolve while it schedules when advance is not armed; the candidate reservation is explained in text but not drawn as a ghost on the lanes; report composition can flatten multiple notices into a fragile multiline string; ASCII mode is not selected by the controller; no renderer, controller, resize, or lifecycle tests. |
| Botany Lab | Deterministic 12-cycle simulation; pure `projectCycle` shared by preview and commit; contracts, expressions, mutations, and containment pressure; a training data set; contextual action menus; shared pause; five engine tests and two renderer tests | The four-card renderer is visually generic and relies on hard-coded ANSI colors and raw string width; title glitch requires a 50 ms render loop in a turn-based game; `tutorialStep` increments but is never shown; plant art shows current growth but not forecast change; the forecast is a narrow event list rather than a per-chamber before/after comparison; species already define ASCII glyphs but the renderer does not use them; controller overlays and lifecycle are untested. |

## 4. Cohort product contract

### 4.1 The Batch B interaction sentence

Every main screen must let a first-time player answer these five questions without opening help:

1. What system am I looking at?
2. What is flowing, growing, scheduled, or pressurizing now?
3. What object is selected?
4. What will my selected intervention change?
5. What changed after I committed?

The shared loop is:

```text
read current state
-> select one instrument or asset
-> configure or preview an intervention
-> commit deliberately
-> read a spatially stable before/after result
```

Blackout Grid is real-time, so its "commit" is an accepted switch, repair, load, generator, or focus action. The other three are turn-based and must never advance because the player merely navigated or opened help.

### 4.2 Shared implementation rules

All four migrations must use:

- `getCurrentThemePalette()` and `TerminalThemePalette` from `src/games/utils.ts` rather than fixed red/green/cyan/magenta codes;
- `displayWidth`, `clipToWidth`, `padToWidth`, `centerText`, and `wrapText` from `src/ui/terminal.ts` for terminal-cell-safe layout;
- a pure renderer that receives game state, dimensions, semantic palette, and a small explicit render model for controller-owned overlays;
- the shared pause menu and existing transition dispatchers;
- an idempotent `stop()` that clears every interval/timeout, disposes the key listener, restores the cursor, resets ANSI state, and exits the alternate buffer once;
- a minimum-size frame that states both required and actual dimensions;
- phase-local controls that advertise only commands reachable on that screen;
- deterministic fixtures for every renderer state;
- semantic markers that remain meaningful when ANSI color is stripped.

Do not create one Batch B dashboard component. Share neutral behavior and utilities, not composition. A one-line electrical drawing, a containment cross-section, an orbital planning strip, and a greenhouse bench should not look interchangeable.

### 4.3 Anti-slop visual rules

- Use the quiet `g/ GAME NAME` masthead already established by the migrated collection.
- Remove glitch titles, random title offsets, faux scanlines, boot chatter, decorative telemetry, and animation without mechanical meaning.
- Use no gradients, neon rainbow coding, decorative hex grids, or repeated cards with vague labels.
- Let the dominant object occupy most of the frame: grid, rooms, orbit lanes, or plants.
- Reserve boxes for real physical boundaries or documents. Whitespace, alignment, and rules should carry most hierarchy.
- Color is a redundant cue. Use labels, path shapes, arrows, patterns, position, and markers such as `[+]`, `[!]`, `[x]`, `[?]`, `->`, `||`, and `..`.
- Every non-ASCII semantic glyph gets a one-cell ASCII equivalent. ANSI-stripped output must still communicate state.
- At 100x30, reveal longer labels, one more history item, or a longer forecast. Do not add mechanics missing from 80x28.
- Turn-based games render after input or state change, not at 20 frames per second.

### 4.4 Preview and result rules

- A preview selector is pure: serializing state before and after preview yields the same value.
- Commit uses the same resolver as preview; the preview may omit hidden uncertainty but may not contradict the result.
- The selected action shows cost, legal/blocked state, affected objects, and the most important projected delta.
- A blocked action explains why and names the object causing the block.
- Post-commit results stay in the same spatial region as their pre-commit forecast whenever possible.
- Backspace or Escape cancels a pending local action before Escape opens the pause menu.
- Destructive or irreversible actions require an explicit armed/confirm state.

### 4.5 Test contract

Every game receives:

- renderer tests for start, briefing/training, main loop, preview/armed state, result/report, help, pause composition, ending, and resize;
- Carbon, Paper, and Contrast theme coverage;
- 80x28 and 100x30 layout checks with ANSI-stripped cell-width assertions;
- Unicode and ASCII-safe semantic-state assertions;
- a deterministic tutorial/first-shift transcript and one complete standard/campaign path;
- controller tests using a fake terminal, fake timers where relevant, and dispatched key events;
- a footer-to-command reachability test;
- restart, quit, games-menu, game-switch, repeated-stop, cursor, ANSI-reset, listener, timeout, and alternate-buffer cleanup tests;
- a regression test for every blocker listed in Section 3.

## 5. Delivery sequence and stop rules

| Stage | Deliverable | Exit condition |
|---:|---|---|
| 0 | Record 12-game review or overlap decision; capture current 80x28 and 100x30 reference frames | Decision and references are attached to the implementation update. |
| 1 | Blackout Grid engine/controller boundary repair | Focus, tutorial progression, action preview, simulation time, pause, and stop behavior are deterministic and tested. |
| 2 | Blackout Grid visual migration | The one-line diagram communicates flow and forecast without color; automated gate and three first-time sessions pass. |
| 3 | Containment Protocol loop repair | Input works, previews do not mutate, commit matches preview, and inactive promises are removed or implemented. |
| 4 | Containment Protocol visual migration | Current -> pending -> projected -> resolved state is legible in the stable four-room cross-section; automated gate and three first-time sessions pass. |
| 5 | Real-time/turn-based pair checkpoint | Repeated system-state or forecast confusion from the first pair is fixed and retested before Orbital Post begins. |
| 6 | Orbital Post scheduler migration | Ghost reservations, weather restrictions, schedule conflicts, arm/resolve, and reports are visually causal; automated gate and three first-time sessions pass. |
| 7 | Botany Lab greenhouse migration | Chamber growth and contract fit are visible before and after each cycle; automated gate and three first-time sessions pass. |
| 8 | Batch B cohort review | All four individual gates pass; the ledger records exactly 16 of 20 active games migrated. |

Stop before starting the next game if the current game has a crash, unreachable advertised command, preview/commit mismatch, hidden mandatory information, terminal overflow, timer/listener leak, failed campaign transcript, or the same confusion in two of the first three sessions.

## 6. Blackout Grid implementation plan

### 6.1 Product outcome

Blackout Grid should feel like operating a storm-damaged city one-line, not moving a cursor around a generic map.

```text
read source and load flow
-> select a breaker, feeder, district, or reserve
-> inspect the legal action and projected load
-> act while the storm clock advances
-> see energization, heat, pickup, and civic strain respond
-> hold required service through the stage window
```

### 6.2 Signature composition

At 80x28:

- row 1: `g/ BLACKOUT GRID`, stage, storm beat, and pause/focus state;
- rows 3-4: a narrow dispatch strip for civic strain, service target, stable beats, and the next named storm impact;
- left two-thirds: the electrical one-line diagram, with sources at the left/top, substations central, districts at the edge, and breaker marks embedded in feeders;
- right third: a switching order for the selected asset: **NOW**, **ACTION**, **AFTER**, and **BLOCKED BY**;
- lower-left: required-load rail and active crew jobs;
- lower-right: two-line event tape with the newest transition first;
- final row: only controls valid for the selected asset plus pause/help.

At 100x30, add the third storm event, full district names, and longer switching-order reasons. Do not add extra panels.

Semantic line vocabulary:

| Meaning | Unicode | ASCII | Non-color cue |
|---|---|---|---|
| Energized | `=>` or directed heavy line | `=>` | Direction arrow and flow number |
| De-energized | light line | `--` | No arrow; `0 MW` where selected |
| Open breaker | open circle/gap | `o` | Visible gap in path |
| Closed breaker | filled point/join | `*` | Continuous path |
| Tripped | cross | `X` | Broken path plus `TRIP` label |
| Faulted | jagged/cross mark | `x` | `FAULT` label and repair duration |
| Repairing | progress hatch | `+` | Crew ID and beat countdown |
| Overloaded | warning hatch | `!` | Utilization percentage and `OVER` label |

### 6.3 Engine and interaction work

1. Move focus duration, focus activation, and charge spending into deterministic state/commands. The controller must not mutate `focusCharges` directly.
2. Expose one deterministic simulation-beat function and drive it with fakeable time. Pause, help, briefing, upgrade, victory, and failure must freeze simulation.
3. Replace the unused tutorial counter with event-driven steps:
   - select the damaged hospital feeder;
   - dispatch the crew and observe its countdown;
   - inspect the close preview;
   - close the repaired feeder;
   - restore hospital load and observe cold pickup;
   - survive the hold window.
4. Add a pure selected-action preview that covers breaker close/open, crew repair/build, district shed/restore, and reserve on/off. It should return legality, reason, affected districts, projected peak utilization, resource cost, and pickup warning where relevant.
5. Keep `closePreview` as the topology source of truth; do not duplicate radial-source or overload rules in the renderer.
6. Show storm target/zone and affected feeder or district when that information is already public in `forecast`.
7. Make Tab asset cycling the primary fast path; arrows remain spatial navigation. Enter performs the selected asset's primary legal action, while mnemonic number keys remain expert shortcuts.
8. Render rejected action reasons beside the switching order until selection or state changes; do not flash a transient toast.

### 6.4 File-level work

| File | Planned work |
|---|---|
| `src/games/blackout-grid/types.ts` | Add deterministic focus/tutorial state and a typed action-preview result; keep topology domain types unchanged. |
| `src/games/blackout-grid/engine.ts` | Add focus command/beat behavior, event-driven tutorial progression, and pure selected-action preview selectors. Preserve radial safety, pickup, trips, scoring, and stage rules. |
| `src/games/blackout-grid/render.ts` | Rewrite around `TerminalThemePalette`, cell-aware helpers, the one-line vocabulary, stable switching order, contextual controls, and explicit ASCII glyphs. Remove title glitch and fixed color constants. |
| `src/games/blackout-grid/index.ts` | Use semantic palette; pass a small render model; stop direct engine-state mutation; make all timers fakeable and cleanup idempotent; keep real-time cadence only for simulation. |
| `src/games/blackout-grid/engine.test.ts` | Retain topology cases and add focus, tutorial, non-mutating preview, and preview/accepted-action assertions. |
| New `render.test.ts` and `controller.test.ts` | Cover phase matrix, themes, sizes, glyph modes, virtual-time pause/focus behavior, footer reachability, and cleanup. |
| `scenario.ts`, `topology.ts`, `content.ts` | Change only if a test proves public forecast data or tutorial sequencing needs an authored label; do not redesign the network. |

### 6.5 Blackout Grid exit task

A first-time player must restore the hospital, explain the cold-pickup warning before closing the next load, and survive the tutorial hold without verbal instruction. They must correctly identify one energized path, one open breaker, one fault, and the next storm target from an ANSI-stripped frame.

## 7. Containment Protocol implementation plan

### 7.1 Product outcome

Containment Protocol should feel like tuning four dangerous rooms from one quiet control station.

```text
select a chamber
-> compare current condition with its discovered rule
-> configure lamp, sound, door, and one field action
-> read projected demand, shedding, battery, and pressure
-> commit the cycle
-> compare forecast with resolved reaction and record new evidence
```

### 7.2 Scope decision: remove inactive promises now

Do not expand this migration into six new upgrade systems and a fault simulator. The source currently exposes choices that mostly have no effect. For this production pass:

- remove the unused `modeSelect` and `upgrade` phases;
- remove `activeFaults` and `observations` until they have real mechanics;
- remove the upgrade draft and all six upgrade offers from the playable campaign rather than presenting fake choices;
- make the shift report continue directly to the next briefing;
- keep the authored shift progression, anomaly rules, capacity changes, doors, battery, technician, probe, integrity, incidents, and scoring;
- replace the empty Night Watch definition/index special case with one explicit authored Night Watch shift.

Future faults or upgrades require their own effects, renderer cues, deterministic tests, and tutorial introduction before returning to the catalog.

### 7.3 Signature composition

At 80x28:

- row 1: `g/ CONTAINMENT PROTOCOL`, shift, cycle, integrity, and battery;
- rows 3-14: a four-room cutaway, arranged around the technician corridor rather than as repeated cards;
- inside every room: anomaly mark/name, pressure track, and three stable environmental bands for LIGHT, AUDIO, and SEAL;
- the selected room shows `current -> pending` values in place;
- a projected pressure arrow sits beside the pressure track, for example `3 -> 1 (-2)`;
- the corridor shows the technician's current position and any queued move/probe;
- rows 16-22: a control ledger with total demand/capacity, predicted shedding, battery cost, breach risk, and the selected rule/evidence;
- rows 23-26: post-cycle comparison or compact incident strip;
- row 28: contextual configure, field-action, commit, dossier, and pause controls.

At 100x30, show two prior observations per anomaly and full incident wording. The rooms remain the dominant object.

### 7.4 Engine and interaction repairs

1. Fix ArrowLeft/ArrowRight handling and add a controller regression for the advertised keys.
2. Deep-clone `pending`, room configurations, anomaly evidence arrays, incidents, and any queued field action before applying a command. No command or preview may mutate its input.
3. Extract a pure `projectCycle(state)` that returns accepted/blocked, projected state, demand, capacity, shed circuits, door battery cost, anomaly deltas, breaches, and notices.
4. Make `commitCycle` use that exact projection result. Add serialized equality tests analogous to Botany Lab.
5. Queue technician moves and probes inside the pending plan rather than resolving a cycle immediately. Validate adjacency, target, and battery before commit; show the cost and projected proximity reaction.
6. Keep configuration free until commit. Selection, dossier, help, log, and cancel actions never spend a cycle.
7. Replace the stale `lastCycle` demand label with live pending demand and projected shed order.
8. Turn rules, help, and log into explicit renderer overlays or focus regions; do not destroy the active notice to display them.
9. Add event-driven tutorial steps for selecting Room A, setting Bright, reading `2 -> 0`, committing, reading the result, and using the dossier evidence.
10. Make unknown anomaly rules honest. Before evidence is learned, show the known clue and observed pairs, not the engine's hidden reaction table.

### 7.5 File-level work

| File | Planned work |
|---|---|
| `src/games/containment-protocol/types.ts` | Add projection and pending-field-action types; add tutorial state; remove inactive phase/state fields and unused upgrade type. |
| `src/games/containment-protocol/content.ts` | Remove inactive fault/upgrade promises; author one explicit Night Watch definition; retain anomaly rules and campaign order. |
| `src/games/containment-protocol/engine.ts` | Add complete cloning, pure projection, shared preview/commit resolver, queued move/probe validation, tutorial progression, and direct shift continuation. |
| `src/games/containment-protocol/render.ts` | Replace the compressed dashboard with the four-room cross-section, environmental bands, live projection, semantic palette, cell-aware layout, ASCII vocabulary, and real overlays. |
| `src/games/containment-protocol/index.ts` | Fix keys; add visible focus/overlay model; make Escape close local overlays first; remove 50 ms glitch rendering and render on state/overlay changes. |
| `src/games/containment-protocol/engine.test.ts` | Preserve deterministic cases and add input immutability, projection equality, queued field actions, night-watch setup, tutorial, and full-campaign transcript tests. |
| New `render.test.ts` and `controller.test.ts` | Cover current/pending/projected/result states, unknown/known rules, themes, dimensions, ASCII, keys, pause, and lifecycle. |

### 7.6 Containment Protocol exit task

A first-time player must configure and commit the tutorial's first safe cycle, predict both demand and the anomaly's pressure delta, and explain the resolved result. Arrow keys, Enter, Escape, dossier, and log must work exactly as displayed.

## 8. Orbital Post implementation plan

### 8.1 Product outcome

Orbital Post should feel like penciling jobs onto a moving orbital window, then signing the window closed.

```text
read four-window solar weather
-> select an order
-> move its transparent reservation across lanes/windows
-> read conflicts, power, duration, and deadline
-> place or remove it freely
-> arm the window and resolve once
-> read exactly which work progressed, blocked, completed, or missed
```

### 8.2 Signature composition

At 80x28:

- row 1: `g/ ORBITAL POST`, shift, current window, integrity, and standing;
- rows 3-5: a four-window solar weather ribbon aligned directly above schedule columns;
- rows 6-12: three continuous lane tracks for DOCK, EVA, and COMMS;
- the selected candidate appears as a ghost reservation across every required lane/window, using `?`/dotted fill until placed;
- conflicts mark the exact occupied cells, not only a prose reason;
- rows 14-19: the selected order chit with client, task, duration, power per segment, safe weather, deadline, and placement verdict;
- rows 20-24: queue at left and the latest window result at right;
- rows 25-27: an arm strip that summarizes jobs, projected power, known weather blocks, and misses before resolution;
- row 28: contextual schedule/remove/cancel/arm/log/help/pause controls.

At 100x30, show six forecast windows and a second line per queued order. The schedule stays centered.

### 8.3 Engine and interaction work

1. Remove `toggleForecast`; the weather ribbon is always visible. `L` controls only the incident log.
2. Draw `getPlacementValidation(state).reservations` as a ghost candidate and use its exact reason for conflicts.
3. Keep scheduling reversible before work starts. Enter places the selected job when advance is not armed; the footer must say that explicitly.
4. Space opens an armed-resolution strip. Enter resolves only while armed; Backspace/Space disarms. The strip lists scheduled progress, obvious weather blocks, projected energy cost, and deadlines that will expire.
5. Keep consequences that depend on resolution honest: do not claim uncertain job outcomes as guaranteed.
6. Rewrite window reports into one row per job/result plus stable battery and integrity before -> after rails.
7. Keep blocked jobs visible on their lanes after resolution and identify what must change before the deadline.
8. Use the opening campaign shift as progressive onboarding: select an order, move the ghost, place it, inspect weather, arm, resolve, and read the report. Do not add a separate lore-heavy tutorial mode.
9. Make Unicode/ASCII selection an explicit renderer model and use the existing content glyph tables; the ASCII frame must not be a test-only accidental branch.
10. Remove the turn-based render interval and redraw only after input/state/resize.

### 8.4 File-level work

| File | Planned work |
|---|---|
| `src/games/orbital-post/types.ts` | Remove the redundant forecast command; add only the minimum onboarding/projection view data that belongs in engine state. |
| `src/games/orbital-post/engine.ts` | Preserve placement/resolution rules; expose an arm-summary selector; separate log behavior; add onboarding progression without changing deterministic jobs/weather. |
| `src/games/orbital-post/render.ts` | Rewrite the forecast-aligned lane strip, ghost reservations, order chit, arm summary, and row-based reports using semantic palette and cell-aware helpers. |
| `src/games/orbital-post/index.ts` | Correct key/footer semantics; pass glyph/render model; close overlays before pause; render on changes; make stop cleanup idempotent and ANSI-complete. |
| `src/games/orbital-post/engine.test.ts` | Retain deterministic placement/resolution cases and add arm-summary, log/forecast regression, onboarding, full-shift, and campaign reachability cases. |
| New `render.test.ts` and `controller.test.ts` | Cover ghost-valid/ghost-conflict, blocked, armed, reports, all phases, themes, sizes, ASCII, keys, and lifecycle. |

### 8.5 Orbital Post exit task

A first-time player must place two compatible orders, identify one lane or weather conflict, arm and resolve a window, and explain why every progressed or blocked job received that result.

## 9. Botany Lab implementation plan

### 9.1 Product outcome

Botany Lab should feel like tending a compact greenhouse against a physical grant clipboard, not operating four stat cards.

```text
select a chamber
-> tune light and water
-> compare the living specimen with contract requirements
-> queue one lab operation
-> inspect per-chamber growth and containment forecast
-> commit the cycle
-> see the plant silhouette and tracks visibly change
```

### 9.2 Signature composition

At 80x28:

- row 1: `g/ BOTANY LAB`, cycle, funding, seals, and shared budgets;
- left two-thirds: one greenhouse bench with four open bays, common irrigation/light rails, and distinct plant silhouettes rather than four identical bordered cards;
- each bay shows species/name, current plant shape, light/water setting, and short mass/bloom/glow/stress/root tracks;
- selected bay uses a physical bench marker and `now -> forecast` deltas beside changing tracks;
- right third: a clipped contract sheet with three active requests, exact requirement marks, reward, and which chamber currently/forecast matches;
- beneath the clipboard: one operation tray containing only legal actions for the selected chamber, with blocked reasons visible;
- bottom: shared filter forecast, pending operation, latest resolved change, and contextual controls.

At 100x30, show longer contract descriptions, mutation/expression names, and two resolved events. Do not add more chambers.

### 9.3 Engine and interaction work

1. Preserve `projectCycle` as the single preview/commit resolver.
2. Add pure comparison selectors that turn projected state into per-chamber `before -> after` deltas for mass, bloom, glow, stress, root pressure, contract fit, filter load, funding, and seals.
3. Render shared light/water usage live as configuration changes, and identify which chamber causes an over-budget block.
4. Turn the existing training counter into staged instruction:
   - select the occupied chamber;
   - change its lamp and water;
   - read the forecast deltas;
   - commit one growth cycle;
   - seed an empty chamber through the operation tray;
   - deliver the first matching contract.
5. Reveal lab operations only when legal or immediately relevant. Keep unavailable advanced actions out of the first training cycle rather than listing them disabled.
6. Expand operation labels with cost and effect; pending operations remain cancellable with Backspace.
7. Use `SpeciesDefinition.asciiGlyph` in the ASCII vocabulary and keep every chamber/state identifiable without color.
8. Remove title jitter and the 50 ms interval; render on meaningful changes.
9. Keep contract and expression depth. Do not simplify the simulation merely to make the screen sparse.

### 9.4 File-level work

| File | Planned work |
|---|---|
| `src/games/botany-lab/types.ts` | Add typed forecast-comparison/view data only if it belongs in engine output; preserve the state schema and operation union. |
| `src/games/botany-lab/engine.ts` | Keep projection/commit equality; add pure comparison and budget-cause selectors; make tutorial progression event-driven; enrich operation option metadata. |
| `src/games/botany-lab/content.ts` | Preserve species/contracts/mutations; verify every species has a one-cell Unicode and ASCII glyph and every contract requirement has concise copy. |
| `src/games/botany-lab/render.ts` | Replace card grid with bench/clipboard composition; use semantic palette, cell-width helpers, ASCII glyphs, and per-bay before/after tracks; remove glitch. |
| `src/games/botany-lab/index.ts` | Pass explicit overlay/glyph model; show action costs; close operation menus before pause; remove continuous rendering; standardize cleanup. |
| `src/games/botany-lab/engine.test.ts` | Retain preview equality and add per-chamber delta, budget culprit, tutorial, operation metadata, full-training, and standard-shift reachability cases. |
| `src/games/botany-lab/render.test.ts` | Expand to all phases, forecast deltas, contract matches, operation overlay model, themes, sizes, ASCII, and width bounds. |
| New `controller.test.ts` | Cover chamber/action navigation, cancel/commit, overlay/pause order, restart/quit/switch, listener cleanup, and absence of leaked timers. |

### 9.5 Botany Lab exit task

A first-time player must grow a specimen, seed a second chamber, and deliver one contract. Before committing a cycle, they must predict one plant-stat delta and whether filter load, root pressure, or a shared budget will become the limiting factor.

## 10. Cross-game human validation

### 10.1 Session count

- Run at least three first-time-player sessions per game before cohort sign-off.
- Add two new sessions after a material mechanical change made after session three.
- If two participants hit the same confusion, stop, fix it, and retest with new participants before starting the next game.
- Do not coach controls or strategy during the required task; only intervene for a crash or environment failure.

### 10.2 Required tasks and explanations

| Game | Required first-time task | Required explanation |
|---|---|---|
| Blackout Grid | Restore hospital service and survive the tutorial hold | Identify energized route, open breaker, cold-pickup risk, and next storm target. |
| Containment Protocol | Commit the first safe containment cycle | Predict demand, shedding, battery cost, and selected anomaly pressure delta. |
| Orbital Post | Place two orders and resolve one window | Identify the exact lane/weather conflict and explain every result. |
| Botany Lab | Grow, seed, and deliver one contract | Predict a plant delta and the next limiting facility constraint. |

### 10.3 Three-second identity test

Show an ANSI-stripped 80x28 main frame without its title for three seconds. A participant should identify:

- an electrical switching one-line;
- a four-room containment control station;
- an orbital scheduling strip;
- a greenhouse bench and contract sheet.

If two are described as the same terminal dashboard, revise their composition before sign-off.

### 10.4 Evidence record

For each session, record:

- terminal and dimensions;
- theme and glyph mode;
- time to first correct action;
- first incorrect assumption;
- whether help was opened and why;
- whether preview matched the player's result expectation;
- task completion without coaching;
- the participant's one-sentence explanation;
- issue severity and retest result.

## 11. Verification sequence

Run the smallest gate after each work packet, the target-game gate after each game, and the complete gate at cohort completion.

```powershell
npm.cmd test -- src/games/blackout-grid
npm.cmd test -- src/games/containment-protocol
npm.cmd test -- src/games/orbital-post
npm.cmd test -- src/games/botany-lab

npm.cmd test
npm.cmd run typecheck
npm.cmd run build
node dist/cli.js --help
npm.cmd run pack:smoke
git diff --check
graphify update .
```

Manual matrix for every game:

| Dimension | Required values |
|---|---|
| Size | 80x28 and 100x30; resize below and back above minimum |
| Theme | Carbon, Paper, Contrast |
| Glyph output | Unicode and one-cell ASCII-safe vocabulary |
| States | Start, briefing/training, main loop, preview/armed, result/report, help, pause, ending, resize |
| Lifecycle | Restart, quit, games menu, game switch, repeated stop |
| Comprehension | Current state, selected object, forecast, commit, and result remain distinguishable without color |

Blackout Grid additionally requires virtual-time tests for normal speed, focus speed, pause, help, stage transition, failure, stop, and terminal transition.

If `graphify update .` remains unavailable, record the infrastructure blocker in the implementation update. Do not claim the graph is current.

## 12. Risks and controls

| Risk | Control |
|---|---|
| Blackout Grid becomes unreadable during simultaneous events. | Keep one-line state stable; rank alarms; cap the live event tape; never animate layout position. |
| Moving focus into the engine changes difficulty. | Lock seeded tutorial and standard beat transcripts before refactoring; compare stage timing and score ranges. |
| Containment preview leaks hidden anomaly rules. | Project numerical outcomes only from knowledge the design intends to reveal; label unknown effects honestly and test dossier visibility. |
| Removing inactive Containment systems reduces apparent content. | Preserve six campaign shifts and core anomaly interactions; prefer fewer real mechanics over fake upgrade/fault promises. |
| Queued technician/probe actions alter campaign balance. | Lock current seeded results, define the new action cost explicitly, and tune only after deterministic transcripts and playtests. |
| Orbital ghost reservations imply guaranteed completion. | Separate legal placement from resolution risk; use distinct markers for candidate, scheduled, active, blocked, and complete. |
| Orbital reports become too verbose. | Use one row per affected job, consistent verbs, and a detail log rather than wrapping prose into the schedule. |
| Botany Lab becomes oversimplified during visual cleanup. | Keep projection, mutations, expressions, contracts, root pressure, and shared budgets; change disclosure order, not depth. |
| Four games converge on panels. | Approve each 80-column wireframe through the title-free identity test before implementation. |
| Paper theme or Unicode breaks alignment. | Semantic palette plus `displayWidth` checks are merge gates; every semantic glyph has an ASCII equivalent. |
| Automated migration is mistaken for production readiness. | Keep Workshop metadata and require individual human gates before promotion. |

## 13. Cohort definition of done

- [ ] The 12-game review or explicit overlap decision is recorded.
- [ ] Blackout Grid focus and timing are engine-owned, deterministic, pausable, and lifecycle-tested.
- [ ] Blackout Grid shows energization, isolation, overload, fault, repair, pickup, and storm target without relying on color.
- [ ] Containment Protocol commands and previews never mutate input state.
- [ ] Containment Protocol uses one resolver for preview and commit.
- [ ] Technician/probe actions obey configure -> forecast -> commit.
- [ ] Inactive Containment faults, phases, observations, and fake upgrades are removed from the playable promise.
- [ ] Orbital Post draws candidate reservations and exact conflicting cells.
- [ ] Orbital forecast/log commands and Enter/arm footer semantics match controller behavior.
- [ ] Orbital reports explain every progressed, blocked, completed, and missed job.
- [ ] Botany Lab renders per-chamber before/after growth and facility consequences.
- [ ] Botany training visibly teaches one complete grow/seed/deliver loop.
- [ ] All four use semantic palettes, terminal-cell-aware layout, and ASCII-safe state markers.
- [ ] All four remove non-mechanical glitch animation and unnecessary turn-based render intervals.
- [ ] All four have renderer, controller, tutorial/first-shift, complete-path, resize, and lifecycle coverage.
- [ ] All footer controls are reachable in their advertised phase.
- [ ] Each game passes at least three first-time-player sessions and its explanation task.
- [ ] Repeated confusion is fixed and retested with new participants.
- [ ] Targeted/full tests, typecheck, build, CLI help, package smoke, and diff checks pass.
- [ ] Graphify is updated after implementation or the unavailable CLI is explicitly recorded.
- [ ] The migration ledger says exactly 16 of 20 active games migrated.
- [ ] All four remain Workshop unless separately promoted through evidence review.
- [ ] The 19-game Arcade Archive remains unchanged.

## 14. Migration ledger and what follows

| Group | Games | State now | State after successful cohort |
|---|---|---|---|
| Featured Four | Stack Trace, Five-Minute Kingdom, Dead Letter Department, Packet Panic | Automated migration complete; human validation pending | Unchanged except recorded validation/fixes |
| Second cohort | Signal//Noise, Last Train Home, Market of Mirrors, Rogue Ledger | Automated migration complete; human validation pending | Unchanged except recorded validation/fixes |
| Batch A remainder | Ghost Shift, Dice Tribunal, Time Capsule, Night Frequency | Automated migration complete; human validation pending | Unchanged except recorded validation/fixes |
| This Batch B cohort | Blackout Grid, Containment Protocol, Orbital Post, Botany Lab | Not migrated | Migrated; remain Workshop pending separate promotion |
| Batch C remaining | The Quiet Heist, Tiny Fleet, Dungeon Courier, The 13th Lift | Not migrated | Still not migrated |
| Arcade Archive | 19 legacy compatibility games | Out of scope | Unchanged |

After this cohort is implemented and validated, Gamr reaches **16 of 20 active games migrated**, with four active games remaining.

The next decision is a 16-game production-readiness review. Batch C should start only after that review confirms that system state, forecast language, control disclosure, theme behavior, terminal layout, and lifecycle patterns are stable. If it passes, the final active-game cohort is:

1. The Quiet Heist
2. Tiny Fleet
3. Dungeon Courier
4. The 13th Lift

Even after Batch B, Gamr is not a 1.0 production candidate until human validation is recorded, the final four active games are migrated, cross-terminal coverage passes, and individual maturity labels are reviewed honestly.

## 15. Implementation update — 2026-08-09

The first Batch B implementation packet is complete and verified. It is intentionally recorded as **implemented, not promoted**:

| Game | Implemented in this packet | Still required before migration/promotion |
|---|---|---|
| Blackout Grid | Focus activation and slowdown now cross the engine/controller boundary; selected-action preview covers breaker, load, reserve, and repair context; focus timing regression added; semantic palette is resolved by the renderer. | Full one-line renderer composition, event-driven tutorial display, controller fake-terminal/lifecycle tests, and first-time restoration sessions. |
| Containment Protocol | Pending configuration is deeply cloned; technician/probe actions queue for commit; ArrowLeft/ArrowRight are reachable; a pure commit-backed projection is available; renderer replaced with a four-room current → pending → projected cross-section; regression coverage added. | Remove or implement inactive fault/upgrade promises, complete overlay/help/log behavior, controller lifecycle tests, and first-time containment sessions. |
| Orbital Post | Forecast/log command confusion removed; ghost placement reservations are drawn on relay lanes; footer semantics no longer advertise a nonexistent forecast toggle; renderer resolves the semantic palette. | Full row-safe report renderer, controller glyph-mode/lifecycle tests, complete scheduler visual matrix, and first-time scheduling sessions. |
| Botany Lab | Plant ASCII glyphs are wired into the renderer; title jitter is disabled; semantic palette is resolved; ASCII renderer regression added. | Greenhouse-bench composition, per-chamber before/after forecast tracks, visible tutorial progression, controller lifecycle tests, and first-time growth/contract sessions. |

Verification completed for this packet:

- 58 test files passed;
- 265 tests passed;
- `npm.cmd run typecheck` passed;
- `npm.cmd run build` passed with approved workspace access;
- `node dist/cli.js --help` passed;
- `npm.cmd run pack:smoke` passed with approved npm-cache access;
- `git diff --check` passed.

The `graphify` executable remains unavailable on PATH. `graphify update .` was attempted and could not run; the existing report plus direct source verification remain the architecture evidence. The four games remain Workshop and should not be counted as fully migrated until the remaining renderer, controller, and human gates above are closed.
