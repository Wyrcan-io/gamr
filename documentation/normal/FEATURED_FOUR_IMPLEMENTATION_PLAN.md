# Gamr Featured Four implementation plan

> **Archive status update — 2026-08-11:** Sections that preserve or test the 19-game Arcade Archive are superseded. Those compatibility games and their public launch/export surfaces have been removed; the supported catalog now contains 20 active games.

**Created:** 2026-08-03  
**Scope:** Stack Trace, Five-Minute Kingdom, Dead Letter Department, Packet Panic, first-time-player validation, repeated-confusion fixes, and the ordered migration of the remaining 16 active games  
**Product milestone:** Four games that feel finished, distinct, and unmistakably Gamr

## 1. Outcome and release decision

This work is complete when the four Featured games prove the Small Machines Index direction across four different interaction types:

| Game | Interaction type | Signature instrument |
|---|---|---|
| Stack Trace | Turn-based editor/puzzle | Code gutter, program tape, test ledger, trace inspector |
| Five-Minute Kingdom | Calm spatial drafting | Cadastral map, placement survey, seasonal margin ledger |
| Dead Letter Department | Narrative classification | Sorting desk, envelope face, regulation slips, rubber-stamp audit |
| Packet Panic | Real-time network management | Network topology, traffic lanes, route preview, operator scope |

The milestone is not four games with the same theme and different nouns. Shared behavior should make the collection coherent; each game's working surface should make it unmistakable.

Do not begin the other 16 active-game migrations until:

1. all four Featured games pass the automated frame, interaction, lifecycle, and accessibility gates in this document;
2. each game has at least five first-time-player sessions;
3. repeated confusion has been fixed and retested;
4. the four-game release-candidate review is signed off.

Until that gate passes, Gamr remains a public beta and the UI V2 work remains a pilot.

## 2. Scope boundaries

### In scope

- Finish the Stack Trace pilot rather than replacing its current repair-bench direction.
- Migrate Five-Minute Kingdom, Dead Letter Department, and Packet Panic to semantic themes, cell-aware rendering, contextual controls, and game-specific visual systems.
- Make the minimum terminal size honest and testable for every phase.
- Stage each game's first minute so the core verb is learned through play.
- Add pure renderer tests and fake-terminal lifecycle/interaction tests.
- Test Carbon, Paper, Contrast, Unicode, ASCII-safe, full-motion, and reduced-motion behavior.
- Run structured first-time-player sessions and fix patterns found in those sessions.
- Migrate the remaining 16 games only after the Featured gate passes, in the order defined below.

### Out of scope for this milestone

- New games, new themes, online services, leaderboards, accounts, or content marketplaces.
- Redesigning the 19 Arcade Archive games.
- Large balance or rules rewrites that are not needed to make an existing system understandable and functional.
- A universal component framework that forces all games into the same layout.
- Decorative animation, lore, or panels that do not help a player make or understand a decision.
- Promoting Gamr to `1.0` solely because the four Featured games are complete.

### Change-control rule

Mechanics remain frozen by default. A mechanical change is allowed only when one of these is true:

- a visible control or advertised system has no real behavior;
- a first-time player cannot complete the first unit because the rules are not staged;
- a result cannot explain its cause from visible state;
- three or more playtest sessions reveal the same rules-level confusion;
- an accessibility requirement cannot be met through presentation alone.

Every such change must have a test and a short rationale in the pull request.

## 3. Current implementation baseline

This plan is based on the repository state reviewed on 2026-08-03.

| Area | Current state | Gap to close |
|---|---|---|
| Shared terminal helpers | `stripAnsi`, `displayWidth`, clipping, padding, centering, and wrapping exist in `src/ui/terminal.ts`. | There is no bounds-checked frame/canvas, semantic ANSI palette, glyph-mode registry, or render context. |
| Themes | Five V2 theme definitions exist, including Carbon, Paper, and Contrast. | Games still receive one accent through `getCurrentThemeColor()` and hard-code status colors. |
| Stack Trace | Renderer is separated, targets 80x24, and has two renderer tests. | Hard-coded status colors remain; ASCII/reduced-motion modes, all-phase frames, contextual help, and lifecycle transcripts are not proven. |
| Five-Minute Kingdom | Pure engine has deterministic market and placement tests; UI targets 80x28. | The renderer is compressed into `index.ts`, uses generic boxes, exposes a dense legend, has no renderer tests, and does not make projection the dominant decision. |
| Dead Letter Department | Model, generator, rules, engine, and renderer are separated; perk effects exist. | The renderer uses a generic glitch title, hard-coded colors, local width helpers, and no renderer tests. `startTutorial` currently changes copy but does not create a staged induction. |
| Packet Panic | Deterministic topology/simulation tests exist and the game has a complete real-time loop. | Rendering and controller code share a large file; protocol identity relies heavily on color/Unicode; resize does not explicitly freeze simulation; the tutorial ends on the first placement and has no objective progression; no renderer tests exist. |

Before modifying each game, capture the following V1 reference frames at its declared minimum and at 100x30:

- start or briefing;
- first playable state;
- help;
- pause;
- preview/commit where applicable;
- warning or failure;
- report/upgrade/interlude;
- victory or ending;
- resize fallback.

Store captures as review artifacts rather than runtime assets. They are comparison evidence, not a visual template to preserve.

## 4. Shared implementation contract for the four games

Only build shared infrastructure that at least two Featured games need.

### 4.1 Render context

Introduce a small game-facing render contract during the Stack Trace polish:

```ts
type GlyphMode = 'unicode' | 'ascii';
type MotionMode = 'full' | 'reduced';

interface TerminalPalette {
  ink: string;
  muted: string;
  line: string;
  focus: string;
  good: string;
  warning: string;
  danger: string;
  data: readonly [string, string, string, string];
  reset: string;
}

interface GameRenderContext {
  cols: number;
  rows: number;
  palette: TerminalPalette;
  glyphMode: GlyphMode;
  motionMode: MotionMode;
  frame: number;
}
```

Implementation requirements:

- resolve semantic ANSI roles from the selected V2 theme;
- map compatibility theme IDs to their V2 semantic edition before rendering;
- expose the current semantic palette through `src/games/utils.ts`;
- do not let games request raw red, green, yellow, cyan, or magenta for semantic state;
- keep state markers meaningful after ANSI is stripped;
- make reduced motion deterministic and immediate;
- use `frame` only for informative animation, never random corruption.

### 4.2 Cell-safe frame writer

Add the smallest bounds-checked frame utility needed by the pilot:

- `writeAt(x, y, value, maxWidth?)` rejects or clips writes outside the viewport;
- `writeLine(y, value)` clips by terminal cell width;
- `rule`, `label`, `meter`, and `overlay` remain small functions, not a component framework;
- ANSI-aware width is calculated through the existing terminal helpers;
- the same state and render context produce the same output;
- development/test mode reports out-of-bounds writes with the game and frame name.

### 4.3 Glyph registry

Each game owns a vocabulary of 8-15 meaningful concepts. Every entry contains a Unicode form and an ASCII-safe form. Important state must also have a word or label.

```ts
interface GameGlyph {
  unicode: string;
  ascii: string;
  label: string;
}
```

Reject glyphs that are ambiguous-width, emoji-style, font-dependent, or meaningless when copied into a log.

### 4.4 Input and footer contract

- Arrows and documented letter alternatives move focus.
- Enter confirms the focused action.
- Escape opens/closes pause during play and closes the top overlay first.
- `?` opens contextual help.
- `q` quits only on screens where quitting is visibly offered; active play uses the pause menu.
- The footer lists only commands that work in the current phase.
- A displayed command must have an interaction test.
- No phase may assign two different actions to the same key.

### 4.5 Terminal-size policy

- Stack Trace must support 80x24.
- Five-Minute Kingdom, Dead Letter Department, and Packet Panic may retain 80x28 for this pilot if 80x24 would hide decision-critical information. The launcher/catalog must declare that minimum honestly.
- Every game also gets a 100x30 or larger standard/wide composition.
- When below the minimum, freeze game input and simulation, show required/current dimensions, and preserve pause/quit recovery.
- Resizing back to a supported size must resume without advancing or corrupting state.

### 4.6 Shared acceptance matrix

For every required game phase, render at:

- declared minimum;
- 80x28 compatibility size where different;
- 100x30 wide size;
- Carbon, Paper, and Contrast;
- Unicode and ASCII-safe modes;
- ANSI-stripped monochrome;
- full and reduced motion for any animated state.

Automated assertions:

- no line exceeds `cols` terminal cells;
- no write targets a row below `rows` or a column beyond `cols`;
- all critical states include a non-color marker and label;
- current footer controls exactly match the phase input map;
- repeated renders are deterministic for the same state/context;
- long authored/generated text wraps or clips without overwriting actions;
- resize frames contain both required and current dimensions;
- stop is idempotent and clears listeners, timers, cursor state, SGR state, and alternate-buffer state.

## 5. Delivery sequence and pull-request shape

Use one reviewable pull request per game, followed by one cross-game evidence/fix pull request.

| Order | Pull request | Primary result | May proceed when |
|---:|---|---|---|
| 1 | Stack Trace finish | Shared render contract is proven in the existing pilot. | Stack Trace passes its game gate and manual test script. |
| 2 | Five-Minute Kingdom migration | Calm spatial drafting proves a non-editor, non-horror visual language. | Kingdom passes its game gate without regressing engine determinism. |
| 3 | Dead Letter Department migration | Text-heavy classification proves document legibility and staged onboarding. | Department passes its game gate and tutorial transcript. |
| 4 | Packet Panic migration | Real-time play proves topology clarity, motion control, and simulation lifecycle. | Packet Panic passes its game gate and real-time soak test. |
| 5 | Featured playtest fixes | Repeated confusion is fixed across the set. | Retests pass and the Featured milestone review is approved. |
| 6+ | Remaining 16 games | Beta pass, then Workshop batches A-C. | The four-game gate is closed. |

Keep engine changes, renderer changes, and content/copy changes in separate commits inside each pull request where practical. Do not mix unrelated catalog or Archive work into these migrations.

## 6. Stage 1 - finish Stack Trace polish and manually test it

### 6.1 Experience target

The player should understand within 60 seconds that they are editing a visible instruction tape, running a visible test suite, and using a trace to explain failure. The screen should feel like a program repair bench, not a generic terminal dashboard.

### 6.2 Preserve

- `g/ STACK TRACE` and `PROGRAM REPAIR BENCH` identity;
- code gutter/program tape, test ledger, block tray, and trace inspector;
- `[ ]`, `[+]`, `[!]`, and `[x]` state markers;
- 80x24 support;
- pure engine/machine separation, deterministic daily/campaign content, undo/redo, hints, and traces.

### 6.3 Implement

- Replace hard-coded status colors in `render.ts` with the semantic terminal palette.
- Convert the renderer to the shared `GameRenderContext` and bounds-checked writer.
- Add an explicit glyph vocabulary for pass, mismatch, fault, selected line, held block, and trace step, with ASCII fallbacks.
- Give `brief`, `editing`, `complete`, and `ending` their own deliberate frames. Do not make complete/ending a centered generic message detached from the repair bench.
- Keep the repaired tape and final test ledger visible on completion; make the repair report show runs, edits, hints, and clean/lean status with causal labels.
- Make the first tutorial objective visually point from tray block to tape slot to Run; show no more than the controls required for that objective.
- Add `?` contextual help while preserving `H` for a hint. The help page must distinguish help from spending a hint tier.
- Remove direct `q` behavior during active editing unless the active footer visibly offers it; prefer Escape -> pause -> Quit.
- Render pause as a quiet repair-bench overlay while retaining the shared pause actions and navigation logic.
- Audit all engine notices into concise sentence-case copy. Machine identifiers and fault codes may remain uppercase.
- Remove unused presentation state and any animation that does not communicate an edit, run, failure, or completion.
- Ensure Paper and Contrast do not depend on faint text or red/green differences.

### 6.4 Tests to add

Extend `src/games/stack-trace/render.test.ts` with fixtures for:

- start;
- brief;
- first edit with unrun tests;
- failed suite with a mismatch;
- fault with trace frame selected;
- all tests passing;
- puzzle complete;
- campaign ending;
- help;
- pause;
- 79x24 and 80x23 resize fallbacks;
- 80x24 and 100x30 layouts;
- Carbon, Paper, Contrast, and ANSI-stripped output;
- Unicode/ASCII equality of meaning;
- deterministic repeated frames.

Add a fake-terminal controller transcript that covers:

1. launch and alternate-buffer entry;
2. tutorial selection;
3. moving focus, inserting a block, running tests, inspecting a failure, and using a hint;
4. pause/resume;
5. restart;
6. game list/next game transition;
7. quit and repeated `stop()`;
8. resize below and back above the minimum without state advance.

### 6.5 Manual test script

Run the built CLI at 80x24 and 100x30:

```powershell
npm.cmd run build
node dist/cli.js
```

Complete these checks in Carbon, Paper, and Contrast:

- enter Tutorial without reading external documentation;
- perform the first edit from the on-screen cue;
- intentionally run a failing tape and explain the mismatch/fault from the trace;
- recover with one edit and complete the case;
- pause, resume, restart, return to the game list, relaunch, and quit;
- resize below minimum while editing and verify that input does not mutate the program;
- repeat in ASCII-safe and reduced-motion modes.

Record screenshots or terminal captures and the exact terminal application used.

### 6.6 Stack Trace exit gate

- First meaningful edit occurs within 60 seconds for five internal dry runs.
- All required frames fit 80x24.
- A failed run identifies the failing test, expected/actual or fault, and trace location without relying on color.
- The completion frame retains the repaired program and evidence.
- Help, hint, and pause have distinct inputs and purposes.
- Renderer matrix and controller transcript pass.
- Manual test script has no lifecycle, alignment, or light-theme defect.

## 7. Stage 2 - migrate Five-Minute Kingdom

### 7.1 Experience target

The kingdom should look like a hand-surveyed five-by-five territory. The selected square and its projected consequences are the hero. A player should understand the loop as draft -> survey -> preview -> place -> read the ledger.

### 7.2 Visual vocabulary

Use a restrained cadastral language:

| Concept | Unicode suggestion | ASCII fallback | Required text support |
|---|---|---|---|
| Castle | `♜` | `K` | Castle |
| Empty plot | `·` | `.` | Empty |
| Forest | `♣` or a one-cell tree mark | `F` | Forest |
| Hill | `^` | `^` | Hill |
| River/lake | `~` | `~` | River/Lake |
| Road | `=` | `=` | Road |
| Village | `V` | `V` | Village |
| Ruin | `R` | `R` | Ruin |
| Garden | `G` | `G` | Garden |
| Citizen | `o` | `o` | Citizen name in inspector |
| Selected plot | `[]` framing | `[]` framing | Coordinate and plot name |
| Legal/illegal | `[+]` / `[x]` | `[+]` / `[x]` | Reason sentence |

Use coordinates, survey lines, and margin annotations before adding boxes. Do not make the board resemble Stack Trace's ledgers.

### 7.3 File-level migration

- Extract pure rendering from `src/games/five-minute-kingdom/index.ts` into `render.ts`.
- Move phase-specific input mapping into small named functions or `input.ts` if it materially improves testability.
- Keep `engine.ts` terminal-free and deterministic.
- Replace local `at`, `center`, `box`, string slicing, and one-accent rendering with shared frame, width, context, and semantic-palette helpers.
- Add `render.test.ts`; add controller tests only around lifecycle and phase input, not duplicated engine rules.

### 7.4 Screen design

#### Founding charter

- Explain only the first loop: choose one offer, place it next to the existing kingdom, preview before confirming.
- Show arrows, Enter, Escape, and `?`; defer ledger and advanced scoring language.
- Start the first meaningful choice within two confirmations.

#### Draft market

- Present three offers as concise deed lines with type, name, immediate purpose, and availability.
- Use 1-3 for direct selection and arrows/Enter if a focused list is added.
- Do not repeat the full rules for terrain, citizens, and laws on every offer.

#### Cadastral map and survey margin

- Keep the five-by-five map stable in position across target, preview, result, and season phases.
- Label rows/columns so every result can name a coordinate.
- Make the selected plot the strongest focus state by shape and weight, not only color.
- In target phase, show selected offer, plot contents, and legal/illegal reason.
- In preview phase, show three causal groups: `NOW`, `NEXT SEASON`, and `END`, even when a group is zero or unchanged.
- Make preview and confirm visually different; confirmation must never occur on the first Enter used to inspect a plot.
- After confirmation, annotate the changed square and append exact score-event rows in the margin ledger.

#### Season report and final chronicle

- Preserve the map while showing which districts/citizens produced season score.
- Replace raw `+amount label` dumps with source -> rule -> amount rows.
- The final chronicle must show placement, season, citizen/law/final components and verify that they sum to final Glory.
- Add human rank names only after representative seed distributions establish honest thresholds. Thresholds must live in tested data, not renderer conditionals.
- Highlight one defining district, one active law, and the most consequential placement; do not generate generic praise.

### 7.5 Onboarding and control reduction

- Turns 1-2 reveal only draft, movement, preview, confirm, and pause/help.
- Introduce the ledger when the first multi-event score occurs.
- Introduce law-specific inspection only when the market first offers a law.
- The footer changes with `chooseOffer`, `chooseTarget`, `preview`, `result`, `season`, and ending phases.
- `L` must be accepted only where the ledger exists and must close before Escape opens pause.
- Invalid placement must leave the cursor in place and state the visible rule that blocks it.

### 7.6 Tests to add

- Preserve the four existing deterministic/legality/preview engine tests.
- Add final-score component sum and rank-boundary tests.
- Add seeded full-run transcripts for at least three strategies.
- Add render fixtures for every phase and for a full board, long law name, multi-event preview, negative/zero score event, and empty ledger.
- Assert bounds at 80x28 and 100x30; test 79x28 and 80x27 fallbacks.
- Assert the selected plot, legal status, coordinate, and preview deltas survive ANSI stripping.
- Assert all terrain/citizen/law glyphs have one-cell or explicitly padded ASCII-safe renderings.
- Test Carbon, Paper, Contrast, reduced motion, and ASCII-safe modes.

### 7.7 Five-Minute Kingdom exit gate

- A first-time player makes a legal first placement within 60 seconds.
- The player can state the immediate score before confirming.
- The board never moves between decision phases.
- Every score event names its source and amount.
- The final chronicle reconciles exactly to final Glory and uses evidence-based rank thresholds.
- All declared controls are phase-correct and all layouts/tests pass.

## 8. Stage 3 - migrate Dead Letter Department

### 8.1 Experience target

The game should feel like a supernatural mail-sorting desk: calm, paper-like, procedural, and slightly uncanny. The tension comes from evidence and consequences, not glitch effects.

### 8.2 Visual vocabulary

Define consistent marks for envelope, insert, regulation, registry, deadline, urgent, forged, curse, verification, Dispatch, Express, Return, Seal, accepted, and audit flag. Every decision remains visible as a number, mark, and word.

Recommended action marks:

- `[1] Dispatch`
- `[2] Express`
- `[3] Return`
- `[4] Seal`
- `[ok] Accepted`
- `[!!] Audit flag`

The exact Unicode forms may enrich these marks, but the ASCII version is the acceptance baseline.

### 8.3 File-level migration

- Keep model, generator, rules, and engine separation.
- Rewrite `render.ts` around the shared render context and bounds-checked writer.
- Remove the glitch-frame parameter and randomized/periodic title displacement.
- Replace local `wrap` and `stripAnsi` helpers with shared terminal utilities.
- Replace hard-coded ANSI colors with semantic roles.
- Add a real tutorial state/objective model in `types.ts` and `engine.ts`, or a small `tutorial.ts` if that keeps authored induction content separate.
- Add `render.test.ts` and extend engine/controller tests for tutorial, overlays, lifecycle, and phase-correct inputs.

### 8.4 Sorting-desk layout

#### Compact 80x28

- Top margin: shift, letter count, Trust with numeric value, and standing.
- Regulation slips: only currently decisive rules, with stable IDs.
- Document face: current inspection view and all mandatory evidence for that view.
- Action rail: four destinations always in the same order during working phase.
- Bottom line: only current-phase controls.
- Ledger/help/audit open as layers and close before pause.

#### Wide 100x30+

- Regulations and envelope/document may sit side by side.
- Add case-thread context only when it affects the current letter.
- Do not fill extra space with fictional logs or decorative bureaucracy.

#### Audit and reports

- A routing decision first produces a visible rubber-stamp consequence, then a short audit card.
- The audit must name selected destination, expected destination, decisive rule, and visible evidence.
- Correct and incorrect outcomes need shape/word markers independent of green/red.
- Shift report must show accuracy, Trust change, top missed rule, case-thread change, and next action.
- Perk choice must preview a concrete effect. `registry-tabs` needs a non-color registry marker, not merely cyan text.

### 8.5 Real induction

Replace the current copy-only tutorial with a deterministic six-letter induction:

1. ordinary valid letter -> Dispatch;
2. valid deadline letter -> Express;
3. broken registry code -> Return;
4. visible curse signal -> Seal;
5. one precedence case where curse overrides urgency or forgery;
6. one unhighlighted check using the learned rules.

For each step:

- introduce only the evidence fields and destinations needed;
- highlight with shape/label as well as color;
- lock unavailable actions only when the screen explains why;
- show the audit explanation before advancing;
- keep tutorial scoring separate from campaign records;
- permit skipping only after one completed induction, if persistence exists.

### 8.6 Perk and campaign audit

- Verify all three current perks through behavior tests.
- Keep `quiet-gloves` and `night-overtime` only if their exact effects are visible before selection and in the next shift.
- Rework `registry-tabs` so it adds an accessible registry marker and inspector explanation.
- Remove any future/inert perk from the offer pool until behavior exists.
- Ensure each shift ends with a satisfying report and the six-shift campaign communicates progress and remaining length.

### 8.7 Tests to add

- Preserve rules precedence, deterministic generation, perk list, and flow tests.
- Add one engine transcript for the complete induction.
- Test every perk's before/after state and visible consequence.
- Render start, briefing, each inspection view, working, ledger, help, audit-correct, audit-wrong, perk, report, game over, and ending.
- Use longest sender, registry, address, rule, explanation, and body fixtures.
- Assert all mandatory evidence fits 80x28 and expanded content fits 100x30.
- Assert routing input is frozen below minimum and while audit/help/ledger requires dismissal.
- Assert audit meaning survives ANSI stripping and ASCII-safe rendering.
- Add full controller lifecycle and repeat-start/stop tests.

### 8.8 Dead Letter Department exit gate

- A first-time player completes induction without verbal coaching.
- The player can explain why curse precedence changes a route.
- Every generated decision exposes its decisive evidence before input.
- Audit feedback names the rule and field rather than only saying correct/incorrect.
- Every offered perk has visible, tested behavior.
- The six-shift campaign is segmented by clear reports and an honest length cue.
- All layout, theme, glyph, motion, transcript, and lifecycle tests pass.

## 9. Stage 4 - migrate Packet Panic

### 9.1 Experience target

Packet Panic should look like a live network topology with readable traffic lanes. The player should learn Link, Bend, and destination matching before Split, Firewall, Focus, Purge, malware, and upgrades appear.

### 9.2 Visual vocabulary

Each protocol must have three independent identifiers:

1. a letter (`C`, `P`, `A`, `G`);
2. a route/packet shape or line pattern;
3. a semantic data color.

Define separate glyph pairs for source, destination, packet, Link, Bend, Split, Firewall, selected cell, legal preview, blocked tile, jammed router, infected router, and queue pressure. ASCII mode must remain fully playable with letters and `- | + # ! x`.

### 9.3 File-level migration

- Extract pure frame rendering and tile/glyph formatting from `index.ts` into `render.ts`.
- Move presentation-only particles, popups, shake, and timing state behind a small presentation model so the engine remains deterministic.
- Move phase input mapping into named handlers or `input.ts` if needed for tests.
- Use the shared semantic render context, glyph registry, and frame writer.
- Add `render.test.ts`, tutorial tests, and fake-terminal real-time lifecycle tests.
- Preserve the deterministic routing engine unless playtest evidence requires a rules change.

### 9.4 Network topology layout

- Keep the 13x9 topology stable during play.
- Draw source/destination pairing in the topology and in a short traffic key.
- Render current router orientation and ports before placement.
- Use a legal/illegal placement preview with a reason; never make Enter a blind action.
- Show packet direction and destination identity without color.
- Replace the generic full control wall with the current tool, its action, and the one or two available contextual operations.
- Display Trace as a number plus a shaped meter with warning thresholds.
- Display queue pressure and quota near the topology nodes they describe, not only in a detached status panel.
- Keep event messages causal: source, route condition, result, Trace change.

### 9.5 Real tutorial progression

The current tutorial state is insufficient because placing the first router changes directly to normal play and `tutorialStep` does not advance through objectives. Replace it with a deterministic sequence:

1. select and place a Link on a highlighted legal cell;
2. rotate or place a Bend to connect around an obstacle;
3. observe one packet move from a labeled source toward its matching destination;
4. complete one delivery and connect the result to quota/Trace;
5. repair or salvage one deliberate bad placement;
6. run a short unassisted route before normal sector timing begins.

During induction:

- freeze or slow traffic until the current objective is understood;
- introduce one new control at a time;
- defer Split, Firewall, Focus, Purge, malware, and upgrade details;
- keep every objective state deterministic for renderer and interaction tests;
- allow a clean restart of the current tutorial step.

### 9.6 Motion and resize behavior

- Reduced motion disables shake, particle bursts, animated popups, and nonessential flashing while preserving textual event evidence.
- Full motion may animate packet movement and one contained consequence; it must not obscure topology state.
- Resizing below minimum pauses simulation time, packet spawning, effects, and accumulator progress.
- Resizing back resets the wall-clock baseline so no catch-up burst occurs.
- Pause, upgrade, game-over, and won phases must not advance simulation.
- Stop clears render/update intervals, listeners, cursor state, SGR state, and alternate buffer exactly once.

### 9.7 Tests to add

- Preserve topology placement, rotation, deterministic state, and routing tests.
- Add tutorial objective progression and illegal-command tests.
- Add simulation pause/resize/resume tests with fake time.
- Render start, each tutorial objective, normal play, legal/illegal preview, congestion warning, infection, pause, upgrade, game over, won, and resize.
- Assert protocol identity survives ANSI stripping and ASCII-safe mode.
- Assert particles/effects cannot write outside the topology or terminal.
- Assert full and reduced-motion frames expose the same game facts.
- Run repeated controller start/stop and 30-minute fake-time soak tests with no leaked intervals/listeners or catch-up burst.

### 9.8 Packet Panic exit gate

- A first-time player completes one delivery within 60 seconds of entering the tutorial.
- The player can match every active source and destination without color.
- Link and Bend are understood before advanced tools appear.
- Invalid placement explains why and does not consume inventory.
- Resize and pause freeze simulation without catch-up.
- Reduced motion remains informative and calm.
- All renderer, tutorial, simulation, and lifecycle tests pass.

## 10. Stage 5 - first-time-player playtest

### 10.1 Sample and setup

- Minimum: five first-time sessions per game, 20 sessions total.
- Prefer 6-8 participants, with each participant playing two games; counterbalance game order so shell familiarity does not favor later games.
- At least two sessions per game use Paper or Contrast.
- At least one session per game uses ASCII-safe plus reduced-motion mode.
- Use the declared minimum terminal size for at least half of sessions and a wide terminal for the remainder.
- Participants must not read implementation plans or receive verbal control instruction.

### 10.2 Session tasks

| Game | Required first task | Required consequence task | Completion sample |
|---|---|---|---|
| Stack Trace | Make and run the first tutorial edit. | Explain and fix one failed test from its trace. | Complete the first repair case. |
| Five-Minute Kingdom | Draft and preview a legal placement. | Predict the immediate score before confirm. | Complete three turns and one season; full run for at least two players. |
| Dead Letter Department | Route the first four induction letters. | Explain the precedence case after audit. | Complete induction and at least one shift. |
| Packet Panic | Build the first Link/Bend route. | Explain a delivery or Trace increase from visible topology. | Complete tutorial and first sector. |

### 10.3 Evidence to record

For every session record:

- terminal application, dimensions, theme, glyph mode, and motion mode;
- time to first meaningful action;
- time to first understood success;
- first point of confusion;
- every pressed key that was not shown or did not work;
- whether the player can explain a failure or score change;
- whether the expected session length matched reality;
- one moment of delight and one moment of friction;
- whether the screen looked authored for that game's premise;
- task completion, abandonment point, and facilitator interventions;
- direct quotes only when consented and useful; otherwise summarize.

Use a shared observation sheet with issue IDs so repeated patterns can be counted across sessions.

### 10.4 Facilitation rules

- Do not teach controls verbally.
- Ask the participant to think aloud without asking leading questions.
- If blocked for 90 seconds, ask: "What are you trying to do, and what on the screen suggests how?"
- Intervene only to continue the study; log the intervention as a task failure.
- Do not defend design choices during the session.
- Conduct a five-minute debrief after play, then compare stated understanding with observed behavior.

## 11. Stage 6 - repeated-confusion fix loop

### 11.1 Issue classification

| Severity | Definition | Required action |
|---|---|---|
| Blocker | Crash, stuck state, leaked terminal, unreadable required state, or task cannot be completed. | Fix before any further migration. Add regression test. |
| Repeated confusion | Same control, rule, label, or causal misunderstanding appears in 3+ first-time sessions. | Treat as a release issue; change interaction/layout before adding prose. |
| Serious friction | Same avoidable mistake appears twice or causes one abandonment. | Fix or document why evidence shows it is intentional difficulty. |
| Isolated preference | One participant dislikes style/copy without a task or comprehension impact. | Record; do not automatically redesign. |

### 11.2 Fix order

For every repeated issue, attempt fixes in this order:

1. change focus, placement, grouping, or action order;
2. make the interactive state or consequence visible;
3. remove an early control or defer an advanced system;
4. improve the command label or one-line explanation;
5. change the underlying rule only when presentation cannot make it fair;
6. add tutorial prose last.

### 11.3 Retest gate

- Every blocker and repeated-confusion issue receives an automated regression test where possible.
- Retest the affected flow with at least three new first-time players.
- The issue closes only when no retest participant repeats the blocking misunderstanding.
- Re-run the full four-game smoke matrix after cross-game/shared changes.
- Publish a short evidence summary in the pull request or a linked Markdown study report.

## 12. Featured milestone definition of done

The four-game pilot is complete only when every item below is true.

### Product and craft

- [ ] Each game has a recognizably different instrument derived from its core activity.
- [ ] No game uses generic glitch, scan-line, fake boot, access-granted, decorative data, or universal giant ASCII-title treatment.
- [ ] Every decorative element communicates state, affordance, hierarchy, cause, or consequence.
- [ ] First meaningful action occurs within 60 seconds.
- [ ] A new player completes the first unit without external help.
- [ ] Score and failure are causal and inspectable.

### Accessibility and layout

- [ ] Carbon, Paper, and Contrast pass manual and automated review.
- [ ] Unicode and ASCII-safe modes communicate the same required facts.
- [ ] Reduced motion removes nonessential movement without removing evidence.
- [ ] Required state remains understandable after ANSI is stripped.
- [ ] All frames fit the declared minimum and the catalog declares that minimum.
- [ ] Help fits one supported screen or uses short contextual pages.

### Engineering

- [ ] Pure renderer fixtures cover every phase and important overlay.
- [ ] Deterministic engine transcripts cover one successful unit and one intentional failure.
- [ ] Fake-terminal tests cover pause, resume, restart, game list, next game, quit, resize, and idempotent stop.
- [ ] No listeners, timers, cursor state, SGR state, or alternate-buffer state leak.
- [ ] `npm.cmd run typecheck` passes.
- [ ] `npm.cmd test` passes.
- [ ] `npm.cmd run build` passes.
- [ ] `npm.cmd run pack:smoke` passes for the four-game release candidate.
- [ ] `git diff --check` reports no whitespace errors.

### Evidence

- [ ] At least five first-time sessions per game are recorded.
- [ ] All blocker and repeated-confusion findings are fixed and retested.
- [ ] Final 80-column and wide captures have a human visual review.
- [ ] Controls, minimums, maturity, and session length agree across launcher, CLI, README, and game help.

## 13. Migration of the remaining 16 active games

Start this section only after the Featured definition of done is signed off. Reuse proven interaction contracts and accessibility infrastructure, but do not copy a Featured game's composition.

### 13.1 Beta pass

| Order | Game | Signature interface | Main implementation focus | Exit evidence |
|---:|---|---|---|---|
| 1 | Signal//Noise | Receiver scale, waveform, station strip, bearing plot | Stage tuner controls case by case; after a failed lock, point to the next useful dimension. | Legal full-content transcript; new player completes a case without verbal instruction. |
| 2 | Last Train Home | Railway diagram, timetable ribbon, hazard forecast | Build a real three-turn tutorial; remove route/switch input overlap; make scenario progress and forecast explicit. | Reachable scenario transcript; new player completes the first scenario without verbal instruction. |

Do not promote either game merely because its renderer has migrated. Each Beta game needs its own first-time-player evidence and all shared frame/lifecycle gates.

### 13.2 Batch A - evidence and documents

| Order | Game | Signature interface | Main implementation focus |
|---:|---|---|---|
| 1 | Market of Mirrors | Auction tape, inventory shelf, rumor broadsheet | Reduce the permanent command surface; trace claim -> faction belief -> closing quote. |
| 2 | Rogue Ledger | Accounting columns with red-pencil annotations | Rebuild treatments around real trade-offs; shorten default run; preview liabilities in the same row. |
| 3 | Ghost Shift | CCTV quad and chronological evidence tape | Make contradiction chains central; repair evidence logic before visual polish. |
| 4 | Dice Tribunal | Court docket, dice rack, precedent margin | Teach one hearing loop before modifiers; distinguish dice by pip/label and color. |
| 5 | Time Capsule | Before/after timeline diff with pinned truths | Make causal edits traceable; separate immutable anchors by shape and position. |
| 6 | Night Frequency | Call board, transcript strip, evidence pins, broadcast queue | Reveal controls with show phases; make programming choices cite evidence. |

Batch A exit: each migrated game can explain evidence -> decision -> consequence in ANSI-stripped output. Promote games individually, never as a batch.

### 13.3 Batch B - systems and instruments

| Order | Game | Signature interface | Main implementation focus |
|---:|---|---|---|
| 1 | Blackout Grid | Electrical one-line diagram with breaker/load flow | Stage grid concepts; use arrows/patterns for energized, isolated, overloaded, and failed states. |
| 2 | Containment Protocol | Four-room cross-section with environmental bands | Remove or delay inert systems; keep configure -> forecast -> commit stable. |
| 3 | Orbital Post | Orbit-window timeline and relay lanes | Center scheduling conflicts; make solar weather readable before commitment. |
| 4 | Botany Lab | Greenhouse bench, plant silhouettes, chamber tracks, contract clipboard | Show growth changes cycle to cycle; reveal controls only when a contract needs them. |

Batch B exit: each game exposes system flow and forecast without color, and every commit has a visible pre-state and post-state.

### 13.4 Batch C - maps and routes

| Order | Game | Signature interface | Main implementation focus |
|---:|---|---|---|
| 1 | The Quiet Heist | Architectural plan with current/forecast sight layers | Separate now from after-commit; remove decorative affordances until interactive. |
| 2 | Tiny Fleet | Plotting table with contacts and sealed order chits | Represent uncertainty honestly; show full pre-commit orders and a readable resolution replay. |
| 3 | Dungeon Courier | Parcel label, route map, satchel manifest | Keep parcel condition and route risk causal; replace permanent control wall with contextual verbs. |
| 4 | The 13th Lift | Elevator annunciator, button matrix, passenger manifest, route tape | Preserve restrained light-theme behavior; clarify clue time/source and two-stage route commit. |

Batch C exit: route previews, uncertainty, and delayed consequences are visually distinct and reproducible.

### 13.5 Per-game migration recipe for the remaining games

Apply this sequence to one game at a time:

1. capture all existing phases at minimum and wide sizes;
2. identify the core verb, first-minute failure, and signature instrument;
3. define 8-15 semantic glyphs with ASCII fallbacks;
4. draw one annotated compact and one wide wireframe;
5. audit advertised controls, inert systems, collisions, and session length;
6. separate pure rendering from terminal ownership where needed;
7. migrate semantic themes, width-safe layout, contextual footer, help, and pause;
8. stage the first unit and make preview/commit/failure causal;
9. add frame matrix, transcript, and lifecycle tests;
10. conduct at least three first-time sessions for Workshop retention and five before Beta/Featured promotion;
11. fix repeated confusion and retest;
12. update catalog/README metadata only after behavior is proven.

Do not start the next game while the current game has a blocker, repeated-confusion issue, or failing shared acceptance gate.

## 14. Verification commands

Use targeted tests during each game migration, then the full suite at its gate.

```powershell
npm.cmd test -- src/games/stack-trace
npm.cmd test -- src/games/five-minute-kingdom
npm.cmd test -- src/games/dead-letter-department
npm.cmd test -- src/games/packet-panic
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
node dist/cli.js
npm.cmd run pack:smoke
git diff --check
```

Manual terminal coverage for the Featured release candidate:

- Windows Terminal;
- one macOS terminal such as iTerm2;
- kitty or WezTerm;
- one basic ANSI terminal profile;
- Node 22 and Node 24 interactive runs.

Record terminal/font combinations that cannot render a proposed Unicode glyph. Replace the glyph or make ASCII-safe mode the default for that concept; do not waive alignment defects as a font issue without evidence.

## 15. Risks and controls

| Risk | Control |
|---|---|
| Shared UI work becomes a large framework rewrite. | Add a primitive only when two Featured games need it; keep composition local. |
| Four games look like one template. | Review signature instrument and three-second recognition before merge. |
| Visual polish hides onboarding problems. | Run task-based tests and measure first action/success, not preference scores alone. |
| Text-heavy screens overflow at 80 columns. | Use longest-content fixtures, bounds assertions, and actual minimum-size review. |
| Light theme breaks hard-coded colors/faint text. | Semantic palette only; Paper and Contrast are merge gates. |
| Unicode aligns in one font only. | One-cell vocabulary, cell-width tests, and complete ASCII-safe path. |
| Real-time effects make Packet Panic unreadable. | Consequence-only animation, reduced motion, bounded effect writes, fake-time soak. |
| UI work silently changes deterministic rules. | Preserve engine fixtures and add full command transcripts before renderer changes. |
| Playtests produce a pile of opinions. | Record observable task failures and use the repeated-confusion thresholds. |
| The rollout resumes too early. | No work on the remaining 16 until the Featured checklist and retest gate are closed. |

## 16. Final review questions

Ask these questions at every game gate:

1. Could this working screen plausibly belong to another game in the collection?
2. Can a player identify the next useful action in three seconds?
3. Does every number show or reveal where it came from?
4. Does every failure name the visible rule and player action involved?
5. Does the screen remain understandable without color and animation?
6. Does the copy sound written for this exact activity rather than for a terminal-game genre?
7. Is every visible system interactive now?
8. Does the declared session length match observed play?

If the first answer is yes, or any later answer is no, the migration is not complete.

## 17. Completion log

Update this table as implementation proceeds; do not mark a stage complete on code review alone.

| Stage | Code/test gate | Manual gate | First-time-player gate | Status |
|---|---|---|---|---|
| Stack Trace | Complete: focused/full tests, typecheck, build, pack smoke | Pending: interactive 80x24/100x30 review | Included in four-game study | Automated gate complete |
| Five-Minute Kingdom | Complete: focused/full tests, typecheck, build, pack smoke | Pending: interactive 80x28/100x30 review | Included in four-game study | Automated gate complete |
| Dead Letter Department | Complete: induction/render/controller tests, typecheck, build, pack smoke | Pending: interactive 80x28/100x30 review | Included in four-game study | Automated gate complete |
| Packet Panic | Complete: tutorial/render/controller tests, typecheck, build, pack smoke | Pending: interactive 80x28/100x30 real-time review | Included in four-game study | Automated gate complete |
| Repeated-confusion fixes | Pending | Pending | Three-person retest per affected flow | Blocked by study |
| Featured milestone | Pending | Pending | Minimum 20 sessions total | Blocked by prior stages |
| Beta pass | Pending | Pending | Per-game evidence required | Blocked by Featured milestone |
| Workshop batches A-C | Pending | Pending | Per-game evidence required | Blocked by Featured milestone |
