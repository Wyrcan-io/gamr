# Gamr Batch A remaining-four implementation plan

**Created:** 2026-08-09  
**Scope:** Ghost Shift, Dice Tribunal, Time Capsule, and Night Frequency  
**Current automated migration state:** 8 of 20 active games migrated  
**Cohort milestone:** 12 of 20 active games migrated after implementation and validation  
**Catalog status:** All four targets remain Workshop until reviewed individually  
**Arcade Archive:** The 19 legacy games remain unchanged and out of scope

## 1. Decision and order

The next four games are the remainder of Batch A, the evidence-and-documents family:

| Order | Game | Signature interface | Reason for position |
|---:|---|---|---|
| 1 | Ghost Shift | CCTV quad and chronological evidence tape | Its evidence model and input map must be repaired before a visual migration can be trusted. |
| 2 | Dice Tribunal | Court docket, physical dice rack, case file, precedent margin | Its central hearing loop is not fully operable from the controller, so it is the next product blocker. |
| 3 | Time Capsule | Before/after timeline diff with three pinned truths | Its engine and content are comparatively strong; the main work is causal visibility and a usable capsule-selection flow. |
| 4 | Night Frequency | Call board, transcript strip, evidence pins, broadcast queue | It can close the batch by testing whether evidence can remain legible across a long, phase-driven campaign. |

This is not four cosmetic reskins. Each game keeps a different visual grammar, a different dominant object, and a different interaction rhythm. The shared Gamr system supplies semantic color, terminal-safe text, pause/lifecycle behavior, and test conventions only.

## 2. Gate before implementation

The eight already-migrated games are:

1. Stack Trace
2. Five-Minute Kingdom
3. Dead Letter Department
4. Packet Panic
5. Signal//Noise
6. Last Train Home
7. Market of Mirrors
8. Rogue Ledger

Their automated migration is complete, but the repository record still says first-time-player validation is pending. Before mechanical or tutorial changes begin in this cohort, record one of these decisions:

- **Preferred:** close the existing playtest gate, fix repeated confusion, and then start Ghost Shift;
- **Explicit overlap:** permit this cohort to proceed while the eight-game playtest is running, with a commitment to apply any repeated cross-game findings before this cohort is declared complete.

Renderer extraction, fixtures, semantic palette conversion, and wireframes are safe preparation during an overlap. Do not declare any of these four migrated merely because a new renderer exists.

## 3. Source-verified baseline

The existing Graphify report was used for architecture navigation and reports no import cycles. The report is based on an older repository commit, and the `graphify` executable is currently unavailable on PATH, so every implementation finding below was verified directly in source.

Current targeted automated baseline:

```text
7 test files passed
24 tests passed
```

Command used:

```powershell
npm.cmd test -- src/games/ghost-shift src/games/dice-tribunal src/games/time-capsule src/games/night-frequency
```

That baseline covers selected deterministic engine, content-validation, and renderer paths. It does not establish controller reachability, complete campaign reachability, layout safety, lifecycle cleanup, or first-time usability.

| Game | Existing strengths | Source-verified blockers |
|---|---|---|
| Ghost Shift | Seven authored cases, deterministic movement, camera/door/probe operations, shared pause menu, five engine tests | `D` is consumed by right movement before the door action can run; `H help` is advertised but unimplemented; badge query always targets the newest log entry; Enter detains the first possible candidate rather than a selected suspect; camera evidence directly identifies the cover and contradicts everyone else; probes secretly support the correct identity; camera/door selection types are unused; After-Hours is player-facing but behaves like the same campaign; no renderer/controller tests; hard-coded visual styling. |
| Dice Tribunal | Deterministic dice streams, evaluator trace, advocates, dockets, exhibits, judges, precedents, chambers, four engine tests | The engine requires `roll`, but the controller never dispatches it; manual evidence-slot assignment is unavailable and opaque auto-assignment makes the central decision; the occupied-target check is inconsistent; `commitHearing` both calculates and applies the result, so the displayed "preview" is post-commit; tutorial text promises scripted hearings without implementing staged instruction; rendering depends on module-global `frameState`; hard-coded colors and unused effect state remain; no renderer/controller tests. |
| Time Capsule | Strong content schema and validation, deterministic loop persistence, three canonical endings, seven engine cases plus two validation tests | Tutorial mode is only a notice; the timeline overlay lists authored events rather than showing before/after causality; `requestHint` exists but no controller key reaches it because `H` opens help; capsule category and candidate selection live in the controller but are not visibly highlighted; `journal` focus has no distinct interaction; actions commit immediately without a causal preview; hard-coded colors and title glitch remain; no renderer/controller tests. |
| Night Frequency | Deterministic nine-round campaign, evidence source-group logic, content validation, complete engine finale path, a resize renderer test | Tutorial is only a shorter safe run with no staged prompts; choices fire immediately although the footer promises selection and confirmation; `selectedIndex` is not used as a real controller selection; workbench verification automatically targets the first unverified item; pinned claims do not show the evidence they cite; finale requirements are hidden until resolution; dossier layout can overrun its fixed overlay; hard-coded colors and title glitch remain; renderer coverage is minimal and controller coverage is absent. |

## 4. Cohort-wide implementation contract

### 4.1 Shared Gamr behavior

All four migrations must use:

- `getCurrentThemePalette()` and `TerminalThemePalette` from `src/games/utils.ts`;
- `displayWidth`, `clipToWidth`, `padToWidth`, `centerText`, and `wrapText` from `src/ui/terminal.ts`;
- pure renderer functions that receive state, dimensions, a semantic palette, and a small local render model;
- the shared pause menu and existing game-transition dispatchers;
- an idempotent `stop()` that clears every timer, disposes the key listener, restores the cursor, resets ANSI state, and exits the alternate buffer once;
- a resize frame that states both required and actual dimensions;
- phase-specific controls that list only inputs that work on the current screen.

Do not add a universal dashboard or game-shell abstraction. A helper may become shared only when at least two games need the same neutral behavior and it does not determine their composition.

### 4.2 Interaction rules

- Arrow keys move a visible selection.
- Enter previews or confirms the selected action.
- Backspace cancels a pending preview where the action has a consequence.
- `?` opens contextual help.
- Escape closes the top local overlay first, then opens the shared pause menu.
- `Q` quits only from safe screens; active-play exit remains in pause.
- Mnemonic keys may remain as shortcuts, but the first-time path must work with arrows, Enter, Escape, and at most two taught action keys.
- A control is never advertised before its command is reachable.
- No selection may live only in controller memory without a visible marker in the renderer.

### 4.3 Visual rules that prevent generic AI-styled output

- Use the quiet `g/ GAME NAME` masthead already established by migrated games.
- Remove glitch titles, random flicker, fake scanlines, fake boot text, ornamental telemetry, and particles without a mechanical role.
- Do not reuse the same rectangle grid across the cohort.
- Make the game object dominant: camera tape, court file, timeline, or radio rundown.
- Status must survive without color through markers such as `[+]`, `[!]`, `[x]`, `[?]`, arrows, labels, ordering, and position.
- Do not use Unicode whose terminal width is uncertain. Every semantic glyph needs a one-cell ASCII fallback.
- Wide layouts may reveal longer copy or more history; they may not add a new mechanic absent at 80 columns.
- Animation is unnecessary for these turn-based games. Render only after input or a meaningful transition unless the shared terminal lifecycle requires a bounded refresh.

### 4.4 Test rules

Every game receives:

- renderer tests for start, tutorial/briefing, main interaction, preview, result, help, pause, ending, and resize states;
- Carbon, Paper, and Contrast theme coverage;
- 80x28 and 100x30 layout checks;
- ANSI-stripped line-width assertions using `displayWidth`;
- an ASCII-safe output assertion for semantic state;
- an engine transcript for its tutorial and at least one complete campaign/case path;
- controller tests using a fake terminal, fake timers, and dispatched key events;
- tests that every footer control maps to a reachable command;
- tests that stop/restart/menu/switch/quit clean timers, listeners, cursor, ANSI state, and alternate buffer correctly;
- a regression test for every blocker in Section 3.

## 5. Delivery sequence and stop rules

| Stage | Deliverable | Exit condition |
|---:|---|---|
| 0 | Record the eight-game validation or overlap decision | Decision is written into the implementation record. |
| 1 | Ghost Shift mechanics repair | Evidence facts no longer reveal hidden truth; every advertised operation is selectable and reachable; canonical case transcripts pass. |
| 2 | Ghost Shift visual migration | Automated game gate, manual terminal matrix, and three first-time evidence-chain sessions pass. |
| 3 | Dice Tribunal hearing repair | Roll, manual assignment, preview, confirm, and cancel are reachable; one complete deterministic hearing passes. |
| 4 | Dice Tribunal visual migration | Automated game gate, manual terminal matrix, and three first-time hearing sessions pass. |
| 5 | Pair checkpoint | Repeated evidence-selection confusion in the first pair is fixed and retested. |
| 6 | Time Capsule causal model and migration | Action and loop consequences are traceable; tutorial and canonical ending transcript pass; three first-time sessions pass. |
| 7 | Night Frequency evidence model and migration | Programming and finale choices cite visible evidence; full campaign transcript and three first-time sessions pass. |
| 8 | Batch A cohort review | All four individual gates pass; migration ledger says exactly 12 of 20. |

Stop before starting the next game if the current game has a crash, stuck phase, unreachable command, hidden mandatory information, layout overflow, lifecycle leak, failed canonical transcript, or confusion repeated by two of the first three participants.

## 6. Ghost Shift implementation plan

### 6.1 Product outcome

Ghost Shift should feel like reviewing a physical security desk under time pressure. Its loop is:

```text
select a feed or log event
-> spend one operation
-> observe a timestamped fact
-> compare that fact with schedules, access tiers, and movement time
-> build a visible contradiction chain
-> select a suspect and detain
```

The player must win by explaining an impossible story, not by watching the candidate counter collapse after a camera operation.

### 6.2 Signature composition

At 80x28:

- row 1: `g/ GHOST SHIFT`, case number, turn, battery, and exit deadline;
- upper-left: a 2x2 CCTV contact sheet showing the four most relevant feeds, each with camera ID, covered room, state, and latest timestamp;
- upper-right: selected feed/log detail with the next operation and its cost;
- center: a chronological evidence tape ordered oldest to newest;
- lower-left: compact personnel files showing badge tier, build, and schedule conflict markers;
- lower-right: a contradiction chain for the selected suspect, ending in a visible detention gate;
- bottom: contextual controls for the selected desk area.

At 100x30, show a fifth feed and longer evidence text. Do not turn the office map into the dominant object; it is a navigation aid, while the evidence tape is the game.

### 6.3 Repair the evidence model before rendering it

Replace truth-bearing evidence with observable facts and derived assessments.

1. Define evidence facts for camera sighting, badge event, door state, motion occupancy, briefing fact, and schedule position.
2. Store only what the player could know: time, source, location, claimed badge where observable, silhouette/build quality, door tier, and authentication result.
3. Derive support and contradiction traces from public personnel files and chronology. Do not store the intruder identity as a hidden `supports` value on a probe or camera fact.
4. Make each candidate assessment list the exact fact IDs and rule used, for example `T03 C02 silhouette SLIM != NORA TALL` or `T04 HA requires tier 2; MICA tier 1`.
5. Count independent proof by source group, not merely by evidence kind. Repeated frames from one active camera remain one family.
6. Require a selected suspect, one identity contradiction, and corroboration from a second source group before detention.
7. Preserve seed determinism and authored routes. Lock expected outcomes for all seven cases before refactoring.

The probe may establish route occupancy but must never identify a person on its own. A valid badge event may support access plausibility, but it must not prove that the badge owner is physically present.

### 6.4 Repair selection and controls

- Replace the current room-only navigation with a visible focus model: `feeds`, `tape`, `files`, `doors`.
- Use arrows to move within the focused collection and Tab to change focus.
- Enter opens the selected item or previews the contextual operation.
- Use a two-step detention: select a personnel file, open the evidence chain, then confirm detention.
- Make badge query operate on the selected door event rather than `doorLog[0]`.
- Make door lock operate on the selected door and remove the `D` collision with right movement.
- Add a real contextual help overlay and remove the false `H help` footer entry until it exists.
- Remove After-Hours from the player-facing start screen for this migration because it currently has no distinct rules. Retain save/type compatibility internally, or implement it later as a separately scoped endless mode.

### 6.5 Tutorial

Turn the orientation case into five explicit teaching beats:

1. Select and wake C01; explain that an operation advances the clock and spends battery.
2. Select the new camera fact and compare its silhouette with personnel files.
3. Select the generated door event and authenticate the badge.
4. Read the two-source contradiction chain and select NORA.
5. Preview and confirm detention.

Only the currently taught operation should be emphasized. The tutorial must remain playable without forced input; an alternative legal action may proceed, but the objective prompt persists until satisfied.

### 6.6 File-level work

| File | Planned change |
|---|---|
| `src/games/ghost-shift/types.ts` | Introduce observable evidence facts, derived assessment traces, source groups, detention preview, and tutorial objective state. Simplify selection to match the visible focus model. |
| `src/games/ghost-shift/engine.ts` | Separate fact collection from candidate assessment; remove hidden identity leakage; add selected-event detention validation; preserve deterministic movement and case scoring. |
| `src/games/ghost-shift/content.ts` | Add tutorial objectives and public reasoning rules; audit all seven cases for solvability under the repaired evidence model. |
| `src/games/ghost-shift/render.ts` | Replace the office dashboard with the CCTV contact sheet, chronological tape, personnel files, and contradiction chain; consume a semantic palette and terminal utilities. |
| `src/games/ghost-shift/index.ts` | Implement focus-based input, contextual preview/confirm, actual help, selected badge/door actions, and idempotent lifecycle cleanup. |
| `src/games/ghost-shift/engine.test.ts` | Lock all seven case outcomes, independent-source gating, probe anonymity, badge plausibility, chronology, and tutorial transcript. |
| `src/games/ghost-shift/render.test.ts` | New phase, theme, width, ASCII, and contradiction-trace coverage. |
| `src/games/ghost-shift/index.test.ts` | New reachability, key-collision, footer-contract, pause, and cleanup coverage. |

### 6.7 Ghost Shift exit task

A first-time player must complete orientation and explain, in their own words, which two independent facts make the selected cover impossible. Failure to name the facts is a failed session even if the detention was correct.

## 7. Dice Tribunal implementation plan

### 7.1 Product outcome

Dice Tribunal should feel like assembling an absurd legal filing on a crowded court table:

```text
read docket and bench rule
-> choose four exhibits
-> roll labeled dice
-> reroll or assign dice to exhibit slots / clarify / object
-> preview the clerk's arithmetic
-> file the hearing
-> add precedent to the margin
```

The player, not auto-assignment, must make the core argument.

### 7.2 Signature composition

At 80x28:

- top: slim court header with circuit, case, standing, fees, burden, and contempt;
- left page: docket or active case file with four exhibit rows and visible requirement slots;
- bottom-left: clerk trace showing the order in which argument, block, pressure, and gaffes resolve;
- right: a vertical physical dice rack; every die shows a number, abbreviated die name, face letter, rank/pips, reroll state, and assignment destination;
- far-right or folded lower margin: active precedents in ordered resolution order;
- bottom: controls for the currently focused page or rack.

At 100x30, the precedent margin becomes a full side column and the case premise can wrap to two lines. The 80-column edition remains mechanically complete.

### 7.3 Make the hearing loop operable

1. Add an explicit controller path for `roll` before marking or assignment.
2. Replace opaque `autoAssign()` as the primary interaction with focus navigation across dice, exhibit slots, Clarify, and Object.
3. Keep auto-assignment only as an optional tutorial/accessibility suggestion that produces a preview the player must accept.
4. Fix target occupancy checks by using one canonical target key function.
5. Expose legal assignment errors next to the selected die/slot without advancing the hearing.
6. Split preview from mutation: first Enter computes and displays `HearingPreview`; second Enter confirms and applies it; Backspace cancels without changing argument, contempt, admitted exhibits, RNG, or history.
7. Make the evaluator the single arithmetic authority for both preview and resolution, then assert preview/result equivalence.
8. Remove unused particle, popup, shake, and second-timer state unless an effect communicates a specific verdict consequence and is included in rendering.

### 7.4 Dice identity and non-color semantics

Each rack row uses all of these:

- stable input number, such as `[2]`;
- abbreviated die label, such as `ADA-B`;
- face code, such as `[F2]` for Fact rank 2;
- optional pip form, such as `::`, where it is terminal-safe;
- state marker: `[ ] ready`, `[R] reroll`, `[>] assigned`, `[X] gaffe`;
- semantic palette role as reinforcement only.

Exhibit requirements use the same face codes as the dice. A player must be able to match a die to a slot from an ANSI-stripped screenshot.

### 7.5 Tutorial

Create one authored hearing, not three unexplained "scripted" hearings:

1. The advocate, docket, judge interpretation, and four exhibits are preselected.
2. A fixed tutorial roll contains one direct exhibit match, one Objection, one useful Clarify, one reroll candidate, and one Gaffe.
3. Teach assigning the direct match.
4. Teach marking and rerolling one die.
5. Teach Object and Clarify.
6. Show the complete clerk trace before filing.
7. Confirm the hearing and show exactly why argument/contempt changed.

After that hearing, offer `Continue campaign` or `Replay hearing`. Do not introduce precedents or chambers until the base hearing is understood.

### 7.6 File-level work

| File | Planned change |
|---|---|
| `src/games/dice-tribunal/types.ts` | Add tutorial step, pending filing/preview state, explicit focus/selection render model types, and canonical target identifiers if engine-owned. |
| `src/games/dice-tribunal/evaluator.ts` | Keep one pure preview calculation; add stable trace categories and tests for assignment, pressure, gaffe, precedent, and judge order. |
| `src/games/dice-tribunal/engine.ts` | Add preview/confirm/cancel commands or equivalent state transitions; add the authored tutorial roll; apply results only on confirmation. |
| `src/games/dice-tribunal/content.ts` | Define the tutorial hearing and audit labels so dice/exhibit abbreviations remain unique. |
| `src/games/dice-tribunal/render.ts` | Remove module-global `frameState`; create the docket, case file, dice rack, clerk trace, and precedent margin using semantic palette roles. |
| `src/games/dice-tribunal/index.ts` | Implement roll, manual assignment focus, preview ownership, consistent numeric selection, help precedence, and lifecycle cleanup. |
| `src/games/dice-tribunal/engine.test.ts` | Add tutorial, full hearing, preview immutability/equivalence, occupancy, all result outcomes, and campaign-node transcripts. |
| `src/games/dice-tribunal/render.test.ts` | New phase matrix, themes, width, ASCII, dice identity, and clerk trace coverage. |
| `src/games/dice-tribunal/index.test.ts` | New roll reachability, manual assignment, preview/cancel, footer mapping, pause, and cleanup coverage. |

### 7.7 Dice Tribunal exit task

A first-time player must finish the tutorial hearing and correctly predict the argument and contempt totals before filing. If they rely on auto-assignment or cannot identify what Objection blocks, the tutorial has not passed.

## 8. Pair checkpoint: Ghost Shift and Dice Tribunal

Run three first-time sessions per game before touching Time Capsule mechanics.

Required observations:

- time to first meaningful action;
- whether the player can state what advances time or commits state;
- whether they can identify the selected object without color;
- whether they can predict the next consequence;
- exact moment they first open help;
- any verbal prompt required;
- terminal, font, theme, dimensions, and Unicode/ASCII mode.

Fix any confusion repeated by two of three players, then rerun the failed task with at least two new players.

## 9. Time Capsule implementation plan

### 9.1 Product outcome

Time Capsule should make causality tangible:

```text
inspect the five-minute day
-> preview an action's time and effects
-> discover a memory, object, or clue
-> compare this loop with the expected reset
-> pin exactly what should cross
-> see the next loop differ because of those truths
```

The timeline, not the room map, is the dominant object.

### 9.2 Signature composition

At 80x28:

- top: `g/ TIME CAPSULE`, loop number, exact clock, and remaining ticks;
- upper band: horizontal five-minute timeline with current position, scheduled events, and observed deviations;
- center-left: compact current room and exits;
- center-right: contextual action list with cost and a one-line consequence forecast;
- lower band: three fixed anchor rails: `[M] MEMORY`, `[O] OBJECT`, `[C] CLUE`;
- right/lower comparison: `BEFORE`, `CARRIED`, and `NEXT LOOP` differences;
- bottom: contextual controls.

At 100x30, show two causal trace lines per changed event and a longer journal lead. Do not add another dashboard panel.

### 9.3 Add a causal comparison model

1. Capture a stable baseline snapshot for the episode's fresh loop.
2. Represent player-visible changes as structured deltas: time, actor position, item position/inventory, flag, discovered anchor, mastered scene, and scheduled-event resolution.
3. Derive `before -> action -> after` traces from engine events rather than parsing log strings.
4. Derive `current loop -> carried anchors -> next loop` at the capsule screen without mutating the committed progress.
5. Mark immutable scheduled facts with a fixed rail marker and editable/anchor-dependent facts with a different marker and position.
6. Keep the canonical ending rules unchanged unless a new transcript proves a current rule is unreachable.
7. Add preview/confirm for time-spending actions. Zero-cost inspection may remain immediate if it cannot close a route or end the loop.

### 9.4 Repair capsule selection and hint access

- Pass capsule category and candidate selection into the renderer through an explicit render model, or move them into state if save/resume requires it.
- Show the active anchor rail and selected candidate with `>` plus a label; never depend on color.
- Show current anchor, staged anchor, eligibility, and predicted next-loop effect side by side.
- Clamp selection when changing category or when candidate lists change; do not rely on hidden modulo behavior.
- Reserve `H` for the existing `requestHint` command while exploring.
- Use `?` for help and `J` for the journal.
- Remove the inert `journal` focus unless it gains a visible, keyboard-operable region.

### 9.5 Tutorial

Use the existing first episode with staged objectives:

1. Read the timeline and travel to the roof.
2. Preview and inspect the ammeter; discover the clue.
3. End the loop and stage the clue in the Clue rail.
4. Compare the next-loop diff before committing.
5. Begin loop two and show the exact new action or lead unlocked by the clue.
6. Request one hint to demonstrate that hints deepen a lead rather than solve the route.

The tutorial ends after the player demonstrates one causal carryover. The campaign remains the full multi-loop episode.

### 9.6 File-level work

| File | Planned change |
|---|---|
| `src/games/time-capsule/types.ts` | Add structured causal deltas, action preview, baseline/next-loop comparison types, and tutorial objective state. |
| `src/games/time-capsule/engine.ts` | Emit structured deltas, create pure action/anchor previews, wire tutorial objectives, and preserve canonical persistence rules. |
| `src/games/time-capsule/content.ts` | Add tutorial objective copy and explicit public effect summaries where authored actions need them. |
| `src/games/time-capsule/validate.ts` | Validate any new tutorial/action references and ensure all preview labels map to real effects. |
| `src/games/time-capsule/render.ts` | Replace the box-led map with the timeline and three anchor rails; consume semantic palette and cell-aware utilities; accept a visible capsule render model. |
| `src/games/time-capsule/index.ts` | Implement action preview ownership, visible capsule navigation, `H` hint, `?` help, overlay precedence, and lifecycle cleanup. |
| `src/games/time-capsule/engine.test.ts` | Add preview immutability/equivalence, tutorial carryover, hint reachability, diff accuracy, and canonical ending transcripts. |
| `src/games/time-capsule/validate.test.ts` | Cover new authored references and malformed preview/tutorial data. |
| `src/games/time-capsule/render.test.ts` | New phase matrix, theme, width, ASCII, anchor-selection, and timeline-diff coverage. |
| `src/games/time-capsule/index.test.ts` | New hint/help mapping, capsule navigation, preview/cancel, footer, pause, and cleanup coverage. |

### 9.7 Time Capsule exit task

A first-time player must carry one clue into a second loop and point to the exact before/after difference it caused. Selecting the correct anchor without explaining the changed event is not a pass.

## 10. Night Frequency implementation plan

### 10.1 Product outcome

Night Frequency should feel like producing a live midnight show on paper and tape:

```text
choose a caller
-> choose what goes on air
-> place the transcript/evidence on the case board
-> choose a record that buys work time
-> perform targeted off-air work
-> update the broadcast rundown
-> cite proven evidence at 03:17
```

The player should always understand what was broadcast, what was merely alleged, what has been verified, and which source groups support the final claim.

### 10.2 Signature composition

At 80x28:

- top: `g/ NIGHT FREQUENCY 91.7`, clock, round, signal, trace, and credibility;
- left: call board with two caller cards during selection, then the active transcript strip during response;
- center: broadcast rundown showing caller -> response -> record -> work for the current and previous round;
- right: four evidence pins for Operator, Method, Origin, and Objective, each with confidence and cited source groups;
- lower strip: record queue or targeted workbench, depending on phase;
- bottom: only the controls valid for that phase.

At 100x30, show fuller transcript lines and evidence summaries. Do not expand the faction network into a permanent dashboard; show audience effects in the rundown and open the full network only when relevant.

### 10.3 Make selection and confirmation consistent

- Use one visible selection model for callers, responses, records, work actions, evidence targets, and finale choices.
- Number keys move directly to an option; Enter confirms it. Keep `A/D` as optional aliases only where they do not conflict.
- Remove the universal `[ENTER] CONFIRM` footer from phases where Enter currently does nothing, or implement the promised confirmation.
- Render the selected option and its projected meter/trust changes before commit.
- During the workbench, choosing Verify opens the evidence list and targets a selected unverified item rather than silently taking the first one.
- Work that exceeds available units stays visible as locked with a reason.

### 10.4 Turn the dossier into cited evidence

1. Keep source-group independence as the proof rule.
2. For every candidate, display supporting item IDs/titles, reliability, verification status, source group, rival weight, and resulting confidence.
3. Pinning a candidate creates a visible citation manifest, not only a candidate ID.
4. `PROVEN` must show the two independent source groups and strong verified item that satisfy it.
5. The broadcast rundown records which evidence was used or affected by the round.
6. Finale `full`, `proven only`, and `uncertain` choices preview exactly which pinned claims will be aired and which evidence each cites.
7. Finale response and risk options show known requirements and projected tradeoffs before confirmation. Unknown narrative outcomes may remain unrevealed, but mechanical eligibility may not be hidden.
8. Bound dossier pagination/scrolling so content never overwrites its border or footer.

### 10.5 Reveal controls with show phases

The control surface should change like a producer's rundown:

- **Caller:** select one call; show urgency, source type, faction, and risk.
- **Response:** select what goes on air; show transcript and projected public effects.
- **Music:** select a record; show work units, masking, and cooldown.
- **Workbench:** select one targeted action; show cost and result preview.
- **Finale claim:** inspect pins and citations, then select scope.
- **Finale response:** select the public action with its evidence/network requirements.
- **Finale risk:** select transmission exposure and confirm the final package.

Do not show controls for later phases early.

### 10.6 Tutorial

The three safe rounds become three authored lessons:

1. **Round one: editorial choice.** Choose a caller and response; read the transcript and meter delta.
2. **Round two: verification.** Choose a record with enough work units, target one evidence item, and verify it.
3. **Round three: independent proof.** Acquire a second source group, pin a supported claim, inspect its citations, then air a short tutorial countercast.

The tutorial finale evaluates only the taught claim and explains the outcome from cited evidence. It must not pretend to be the full nine-round finale.

### 10.7 File-level work

| File | Planned change |
|---|---|
| `src/games/night-frequency/types.ts` | Add option preview, targeted work, citation manifest, tutorial objective, and finale-package types; remove or repurpose inert selection fields. |
| `src/games/night-frequency/engine.ts` | Implement preview/confirm transitions, targeted verification, citation derivation, tutorial lessons, and transparent finale eligibility. |
| `src/games/night-frequency/content.ts` | Add tutorial round definitions and concise public effect/risk copy; preserve evidence source groups and authored campaign offers. |
| `src/games/night-frequency/validate.ts` | Validate tutorial offers, evidence citations, candidate slots, source groups, and finale references. |
| `src/games/night-frequency/render.ts` | Build the call board, transcript strip, rundown, evidence pins, and phase-local record/work strips using the semantic palette. |
| `src/games/night-frequency/index.ts` | Implement visible selection and confirm, targeted work navigation, overlay pagination, help precedence, and lifecycle cleanup. |
| `src/games/night-frequency/engine.test.ts` | Add tutorial, targeted verification, citation, preview immutability/equivalence, all finale branches, and full campaign transcripts. |
| `src/games/night-frequency/content.test.ts` | Validate the new tutorial and citation relationships. |
| `src/games/night-frequency/render.test.ts` | Expand to the phase matrix, themes, widths, ASCII, pagination, citations, and finale package. |
| `src/games/night-frequency/index.test.ts` | New selection/confirm, footer mapping, targeted work, overlays, pause, and cleanup coverage. |

### 10.8 Night Frequency exit task

A first-time player must verify and pin one claim, then name the two independent source groups cited by it. In the tutorial finale, they must correctly predict which claims will be aired before confirming.

## 11. Cross-game human validation

### 11.1 Session count

- Minimum three first-time-player sessions per Workshop game before cohort sign-off.
- Add two more sessions to any game with a mechanical change after the third session.
- Repeat with new participants after fixing confusion seen in at least two sessions.

### 11.2 Tasks

| Game | Required first-time task | Required explanation |
|---|---|---|
| Ghost Shift | Complete orientation detention | Name both independent contradiction sources. |
| Dice Tribunal | Complete one tutorial hearing | Predict argument, block, and contempt before filing. |
| Time Capsule | Carry one clue across a reset | Identify the exact next-loop difference caused by it. |
| Night Frequency | Verify and pin one supported claim | Name the cited items and independent source groups. |

### 11.3 Three-second identity check

Show an ANSI-stripped 80x28 main frame without its title for three seconds. A participant should identify the game object as:

- security camera evidence desk;
- absurd court filing and dice rack;
- time-loop comparison and anchor rails;
- live radio rundown and evidence board.

If two games are described as the same "terminal dashboard," revise their composition before sign-off.

## 12. Verification sequence

Run the smallest gate after each work packet, the target-game gate after each game, and the full gate at cohort completion.

```powershell
npm.cmd test -- src/games/ghost-shift
npm.cmd test -- src/games/dice-tribunal
npm.cmd test -- src/games/time-capsule
npm.cmd test -- src/games/night-frequency

npm.cmd test
npm.cmd run typecheck
npm.cmd run build
node dist/cli.js --help
npm.cmd run pack:smoke
git diff --check
graphify update .
```

Manual terminal matrix for every game:

| Dimension | Required values |
|---|---|
| Size | 80x28 and 100x30 |
| Theme | Carbon, Paper, Contrast |
| Glyph mode | Unicode and ASCII-safe |
| States | Start, tutorial, main loop, preview, result, help, pause, ending, resize |
| Lifecycle | Restart, quit, games menu, game switch, repeated stop |

If `graphify update .` remains unavailable, record the infrastructure blocker explicitly. Do not claim the graph is current.

## 13. Risks and controls

| Risk | Control |
|---|---|
| Ghost Shift repair changes authored case answers. | Lock all seven case transcripts before changing the evidence representation. |
| Evidence traces leak hidden truth in a new shape. | Derive every trace only from facts visible to the player and public personnel/case rules. |
| Dice Tribunal scope expands into a rules rewrite. | Preserve evaluator arithmetic; change reachability, preview timing, tutorial staging, and presentation first. |
| Manual dice assignment is too slow at 80 columns. | Use focus memory, direct-number selection, optional suggested assignment, and a compact destination code. |
| Time Capsule previews accidentally mutate persistent state. | Make preview selectors pure and assert serialized state is unchanged. |
| Night Frequency dossier becomes more text-heavy. | Use citation IDs, paging, source-group markers, and phase-local detail rather than always-visible prose. |
| Four games converge on identical panels. | Approve each 80-column wireframe through the three-second identity check before implementation. |
| Light themes fail because of old fixed ANSI codes. | Paper and Contrast renderer tests are merge gates. |
| Unicode alignment changes by font. | Use terminal width utilities and a complete one-cell ASCII-safe vocabulary. |
| A renderer migration is mistaken for product readiness. | Keep Workshop metadata until human tasks and repeated-confusion retests pass. |

## 14. Cohort definition of done

The milestone is complete only when:

- [ ] The existing eight-game validation or overlap decision is recorded.
- [ ] Ghost Shift uses observable facts and visible contradiction traces without hidden identity leakage.
- [ ] Every Ghost Shift operation and detention target is selectable and reachable.
- [ ] Dice Tribunal supports roll, manual assignment, immutable preview, cancel, and confirm from the controller.
- [ ] Dice identity and exhibit matching remain readable without color.
- [ ] Time Capsule shows accurate action and next-loop before/after differences.
- [ ] Time Capsule's capsule selection and hint command are visibly reachable.
- [ ] Night Frequency work targets a selected item and final claims cite visible evidence/source groups.
- [ ] All four tutorials teach one complete base loop before modifiers or campaign complexity.
- [ ] All four use semantic palettes, cell-aware layout, and ASCII-safe status markers.
- [ ] All four have renderer, controller, tutorial transcript, full-path, resize, and lifecycle coverage.
- [ ] Each game passes at least three first-time-player sessions and its explanation task.
- [ ] Repeated confusion is fixed and retested with new participants.
- [ ] Targeted and full tests, typecheck, build, CLI help, package smoke, and diff checks pass.
- [ ] Graphify is updated after code changes or its unavailable CLI is recorded.
- [ ] The migration ledger says exactly 12 of 20 active games migrated.
- [ ] All four targets remain Workshop unless separately promoted through evidence review.
- [ ] The 19 Arcade Archive games remain unchanged.

## 15. Migration ledger and what follows

| Group | Games | State now | State after successful cohort |
|---|---|---|---|
| Featured Four | Stack Trace, Five-Minute Kingdom, Dead Letter Department, Packet Panic | Migrated; human validation pending | Migrated; validation recorded individually |
| Second cohort | Signal//Noise, Last Train Home, Market of Mirrors, Rogue Ledger | Migrated; human validation pending | Migrated; validation recorded individually |
| This cohort | Ghost Shift, Dice Tribunal, Time Capsule, Night Frequency | Not migrated | Migrated; remain Workshop pending separate promotion |
| Batch B remaining | Blackout Grid, Containment Protocol, Orbital Post, Botany Lab | Not migrated | Still not migrated |
| Batch C remaining | The Quiet Heist, Tiny Fleet, Dungeon Courier, The 13th Lift | Not migrated | Still not migrated |
| Arcade Archive | 19 legacy compatibility games | Out of scope | Unchanged |

After this plan is implemented and validated, Gamr reaches **12 of 20 active games migrated**, with eight active games remaining. The next decision is a 12-game production-readiness review. If that review passes, the next implementation cohort is Batch B in this order:

1. Blackout Grid
2. Containment Protocol
3. Orbital Post
4. Botany Lab

Batch C follows only after the system-and-instruments cohort proves that shared UX lessons are stable.

## 16. Implementation update - 2026-08-09

The code pass for this cohort is complete. The four games now have the following implemented scope:

| Game | Implemented | Still required before promotion |
|---|---|---|
| Ghost Shift | Reachable start/tutorial path, repaired probe semantics, visible suspect selection, selected-room badge query, contextual help, CCTV/evidence-tape renderer, semantic palette, resize renderer coverage | Full seven-case human evidence-chain sessions, controller lifecycle tests, and final Paper/Contrast visual review |
| Dice Tribunal | Reachable roll action, manual die-target shortcuts, canonical assignment keys, explicit preview/confirm/cancel, tutorial mode marker, dice-rack/case-file renderer, semantic palette, resize renderer coverage | Full tutorial hearing transcript, controller lifecycle tests, and first-time hearing sessions |
| Time Capsule | Pure action preview/confirm/cancel, tutorial progress state, reachable hints, visible capsule category/candidate selection, action forecast in the frame, palette-aware controller path, resize renderer coverage | Full causal-diff renderer, controller lifecycle tests, and first-time carryover sessions |
| Night Frequency | Confirmed caller/response/music selection, targeted workbench verification, visible selection markers, phase-specific controls, targeted evidence display, palette-aware controller path | Full citation manifest/finale preview, controller lifecycle tests, and first-time broadcast sessions |

Verification completed during this implementation pass:

- 58 test files passed;
- 261 tests passed after the added preview/targeting regressions;
- `npm.cmd run typecheck` passed;
- `npm.cmd run build` passed with approved workspace access;
- `node dist/cli.js --help` passed;
- `npm.cmd run pack:smoke` passed with approved npm-cache access;
- `git diff --check` passed.

The `graphify` executable remains unavailable on PATH. The required query and `graphify update .` were attempted and could not run; the existing report plus direct source verification remain the architecture evidence. These four games remain Workshop and are not production-promoted until the human gates in this plan are closed.
