# Gamr next four migration implementation plan

> **Archive status update — 2026-08-11:** Sections that preserve or test the 19-game Arcade Archive are superseded. Those compatibility games and their public launch/export surfaces have been removed; the supported catalog now contains 20 active games.

**Created:** 2026-08-09  
**Scope:** Signal//Noise, Last Train Home, Market of Mirrors, and Rogue Ledger  
**Current migration state:** 4 of 20 active games migrated  
**Cohort milestone:** 8 of 20 active games migrated after this plan is implemented and validated  
**Archive:** The 19 Arcade Archive games remain unchanged and out of scope

## 1. Decision and migration order

The next four active games are:

| Order | Game | Current maturity | Migration role | Signature interface |
|---:|---|---|---|---|
| 1 | Signal//Noise | Beta | Complete the first Beta pass | Receiver scale, station strip, waveform, bearing plot, decoder transcript |
| 2 | Last Train Home | Beta | Complete the second Beta pass | Railway diagram, timetable ribbon, hazard forecast, dispatch orders |
| 3 | Market of Mirrors | Workshop | Begin Batch A: evidence and documents | Auction tape, inventory shelf, rumor broadsheet, closing-bell trace |
| 4 | Rogue Ledger | Workshop | Continue Batch A: evidence and documents | Accounting columns, red-pencil annotations, liability schedule |

This order is deliberate. Signal//Noise and Last Train Home are already Beta and should be resolved before expanding the Workshop migration. Market of Mirrors and Rogue Ledger then test whether the visual system can explain evidence, delayed consequences, and numerical causality without becoming a generic dashboard.

Completing this cohort does **not** migrate or promote the remaining 12 active games. It also does not redesign the Arcade Archive.

## 2. Execution prerequisite

Implementation may be prepared, but migration work should not begin until the Featured Four gate is closed:

- Stack Trace, Five-Minute Kingdom, Dead Letter Department, and Packet Panic receive at least five first-time-player sessions each;
- blocker defects and confusion repeated by three or more players are fixed and retested;
- 80-column and wide-terminal captures receive a human visual review;
- the Featured Four release-candidate review is signed off.

If product leadership explicitly chooses to overlap work, only non-mechanical preparation may run before that gate: renderer extraction, test fixtures, semantic palette replacement, and annotated wireframes. Tutorial, control, balance, or progression changes wait until the Featured findings are known so the same confusion is not copied forward.

## 3. Source-verified baseline

The repository graph places each target engine in its own community and reports no import cycles. The Graphify CLI was unavailable on the audit machine, so the graph report was used for architecture navigation and every important finding below was verified directly in source.

Current automated baseline:

```text
4 test files passed
17 engine tests passed
```

That baseline proves deterministic mechanics in selected paths. It does not prove terminal layout, controller lifecycle, complete tutorials, full-content reachability, or first-time usability.

| Game | Current structure | Existing strengths | Migration blockers found in source |
|---|---|---|---|
| Signal//Noise | Separate `engine.ts`, `render.ts`, `index.ts`, content, spectrum, triangulation, and types; 2 engine tests | Six authored cases, deterministic tuning and triangulation, structured phases | Hard-coded ANSI colors; animated/glitch title; dense always-visible controls; no help overlay; tutorial is only a shortened case, not staged instruction; failed locks identify a cause but do not consistently direct the next useful action; no renderer or controller tests |
| Last Train Home | Separate engine, renderer, controller, scenarios, seed, and types; 5 engine tests | Deterministic scenarios, forecast data, previewable hazards, two scenarios | `tutorialStep` is initialized but never advanced; `setRoute` exists in the engine but has no controller input; routing and junction switching are conceptually duplicated; help does not own input while open; no turn projection before commit; scenario progress is implicit; hard-coded colors and glitch title; no renderer or controller tests |
| Market of Mirrors | Engine plus a 147-line controller/renderer in `index.ts`; 6 engine tests | Deterministic market, 28 recipes, action preview, delayed rumor settlement, three-day guided mode | Rendering and terminal ownership are mixed; the permanent command surface exposes too many unrelated keys; the `frame` variable is both the selected rumor frame and a render counter, so rendering can corrupt the selected frame; closing-bell output is mostly strings rather than inspectable cause data; hard-coded theme color and width-naive clipping; no renderer or controller tests |
| Rogue Ledger | Engine plus renderer/controller in `index.ts`; 4 engine tests | Deterministic quarters, preview/commit flow, rule trace, future liabilities | Treatments do not yet form real trade-offs: Book and Reserve are equivalent, while Defer and Decline both resolve to zero in common paths; six quarters of eight transactions is too long for the advertised collection; Escape opens pause before it can cancel a preview; the footer advertises active-game quit although `Q` is not handled there; no tutorial, contextual help, renderer tests, or controller tests |

## 4. Cohort-wide implementation contract

### 4.1 Shared behavior, local composition

Reuse the contracts proven by the Featured Four:

- `getCurrentThemePalette()` and `TerminalThemePalette` for semantic color roles;
- `displayWidth`, `clipToWidth`, `padToWidth`, `centerText`, and `wrapText` for cell-aware layout;
- the shared pause menu and game transition functions;
- an idempotent controller `stop()` that disposes timers and listeners and restores cursor and alternate buffer exactly once;
- pure render functions that take state, dimensions, palette, and a small local render model;
- explicit resize frames that state both required and current dimensions.

Do not build a universal game-component framework. Add a shared primitive only if at least two games in this cohort require the same behavior and the primitive does not dictate their composition.

### 4.2 Anti-slop visual rules

These four games must not inherit the old product's generic terminal-hacker styling.

- No glitch titles, randomized title offsets, scanlines, fake boot sequences, “access granted” language, or decorative telemetry.
- No giant ASCII logo on every phase.
- No generic four-box dashboard used as the main composition for all four games.
- No color-only state. Every warning, selection, route, claim, result, and liability also needs a label, shape, position, or ASCII marker.
- No animation without a gameplay consequence. These four are turn-based and should render statically by default.
- No text panel that exists only to fill space.
- No invented lore in system messages when a precise instruction is needed.

### 4.3 Input and overlay rules

- `?` opens contextual help in every playable phase.
- Escape closes help or a local overlay first; otherwise it opens the shared pause menu.
- Direct `Q` is allowed on start, ending, and game-over screens. During active play, quit lives in pause so a mnemonic action can safely use `Q` if needed.
- A modal preview owns all input until confirmed or cancelled.
- Footers are phase-specific and list only controls that currently work.
- Primary play must be possible with arrows, Enter, Escape, and at most two contextual action keys. Mnemonic aliases may remain for experienced players but are not the first-time teaching surface.

### 4.4 Glyph and theme rules

Each game defines 8–15 domain concepts with:

- one preferred one-cell glyph;
- one ASCII fallback;
- one semantic palette role;
- a text label that survives ANSI stripping.

The layout must remain playable in an ANSI-stripped capture. Because these games do not need continuous motion, reduced-motion behavior is satisfied by removing title jitter and nonessential frame animation rather than adding another local setting.

Required visual checks:

- Carbon, Paper, and Contrast themes;
- 80x28 and 100x30 terminals;
- Unicode-capable and ASCII-safe rendering;
- start, briefing/tutorial, main play, preview, result/report, help, pause, ending, game-over, and resize states where applicable.

### 4.5 Test contract

Every game receives:

- pure renderer tests for the complete phase matrix;
- line-width assertions after ANSI stripping;
- engine transcript tests for a legal tutorial and legal full-content path;
- controller tests with a fake terminal;
- alternate-buffer, cursor, timer, and listener cleanup assertions;
- phase-correct control tests;
- a regression test for every source defect listed in Section 3.

## 5. Delivery sequence and stop rules

| Stage | Deliverable | Start condition | Exit condition |
|---:|---|---|---|
| 0 | Featured Four evidence gate | Current state | Featured gate signed off or explicit overlap decision recorded |
| 1 | Signal//Noise migration | Stage 0 closed | Automated game gate and manual terminal review pass |
| 2 | Last Train Home migration | Signal//Noise has no open blocker | Automated game gate and manual terminal review pass |
| 3 | Beta pair playtest and fixes | Both Beta migrations complete | Full-content transcripts pass; five first-time sessions per game; repeated confusion fixed |
| 4 | Market of Mirrors migration | Beta pair has no open blocker | Automated game gate and manual terminal review pass |
| 5 | Rogue Ledger migration | Market of Mirrors has no open blocker | Automated game gate and manual terminal review pass |
| 6 | Batch A mini-gate | Both Workshop migrations complete | Three first-time sessions per game; evidence-to-consequence tasks pass |
| 7 | Cohort release review | All prior stages closed | 8/20 migration ledger recorded; remaining 12 still marked unmigrated |

Do not start the next game while the current game has a crash, stuck state, terminal leak, unreadable required state, unreachable content, or repeated-confusion issue.

## 6. Signal//Noise implementation plan

### 6.1 Product outcome

Signal//Noise should feel like operating a compact field receiver, not looking at a cyberpunk dashboard. The dominant loop is:

```text
scan carrier -> adjust one receiver dimension -> capture bearing
-> compare stations -> resolve source -> read packet -> choose response
```

The player should always know:

- which station is active;
- which receiver dimension they are currently changing;
- what the last failed lock says to try next;
- how many bearings exist and where they intersect;
- which decoded evidence supports the selected response.

### 6.2 Signature composition

At 80x28:

- row 1: quiet `g/ SIGNAL//NOISE` masthead and case progress;
- upper-left: horizontal receiver scale with passband, carrier energy, and discovered markers;
- directly below: current centre, bandwidth, modulation, and gain as one instrument strip;
- upper-right: three-position station strip and regional bearing plot;
- lower-left: lock diagnosis and the next useful receiver adjustment;
- lower-right: decoder transcript and response evidence;
- bottom: contextual controls for the current tutorial/case phase.

At 100x30, widen the receiver scale and decoder transcript. Do not add new panels merely because space exists.

### 6.3 Interaction model

- Left/Right changes centre.
- Up/Down changes the currently focused secondary dimension.
- Tab moves focus through Station, Bandwidth, Modulation, and Gain only after those controls have been introduced.
- Enter captures in listening mode and confirms in response mode.
- `S` performs Sweep, `N` installs a notch, and `P` uses phase-lock only when the current case has introduced and supplied those tools.
- `?` opens the instrument card; Escape closes it or pauses.
- Response choices appear only after a source is resolved. The selected response must cite decoded text before confirmation.

Mnemonic aliases may remain, but the footer shows only available actions and the focused control.

### 6.4 Progressive teaching

Replace the current “tutorial equals one normal case” behavior with objective-driven induction steps:

1. Identify the visible carrier peak at West Station.
2. Capture the first clean bearing.
3. Move to a second station and capture another bearing.
4. Observe the bearing intersection and resolved source.
5. Read the decoded distress instruction.
6. Select and confirm ACK / HOLD.

Campaign disclosure then expands case by case:

| Case | Newly emphasized concept |
|---:|---|
| 1 | Centre, station, capture, two-bearing intersection |
| 2 | Bandwidth and an overlapping blocker |
| 3 | Modulation and echo/map disagreement |
| 4 | Moving interference and phase-lock |
| 5 | Provenance and hostile response choice |
| 6 | Combined mastery with two interference sources |

Tutorial progress advances only when the objective is actually completed. Pressing unrelated keys cannot skip a step.

### 6.5 Failure guidance

Return structured lock diagnostics from the spectrum/engine layer rather than only a sentence:

```ts
interface LockDiagnostic {
  dimension: 'station' | 'centre' | 'bandwidth' | 'modulation' | 'gain' | 'noise';
  status: 'blocked' | 'low' | 'high' | 'mismatch';
  evidence: string;
  nextAction: string;
}
```

Examples:

- “Carrier energy is right of the passband — tune right.”
- “The carrier fills a wider window — increase bandwidth.”
- “Signal clips at this gain — reduce gain before capture.”
- “Interference shares the passband — sweep, then notch the discovered blocker.”

Do not reveal the complete solution before the player has produced the relevant evidence.

### 6.6 File-level changes

- `src/games/signal-noise/types.ts`
  - add induction objective state and structured lock diagnostics;
  - add explicit focused receiver control if stored in game state;
  - keep render-only overlay state out of the engine.
- `src/games/signal-noise/spectrum.ts`
  - return diagnostic dimension and direction with the lock evaluation;
  - keep the existing deterministic quality calculation intact unless a transcript proves a defect.
- `src/games/signal-noise/engine.ts`
  - advance induction from verified actions;
  - expose response evidence and legal action availability;
  - keep all six campaign cases reachable;
  - preserve seed determinism and scoring.
- `src/games/signal-noise/render.ts`
  - replace hard-coded ANSI colors with `TerminalThemePalette`;
  - remove frame/glitch animation;
  - use cell-aware composition and explicit ASCII fallbacks;
  - add help, response preview, debrief evidence, ending, and resize frames.
- `src/games/signal-noise/index.ts`
  - remove the render frame counter;
  - stage controls by legal action and tutorial step;
  - make help modal and pause phase-correct;
  - remove direct active-play quit;
  - preserve idempotent cleanup.
- Add `render.test.ts` and `index.test.ts`; expand `engine.test.ts`.

### 6.7 Automated gate

- Induction transcript completes all six objectives without hidden state edits.
- A legal deterministic transcript completes all six campaign cases.
- Each failed-lock dimension produces a useful diagnostic and does not spend settings changes as operations.
- Two clean bearings resolve the correct candidate; one rough bearing cannot falsely claim certainty.
- Response selection cannot confirm before a source and packet exist.
- All phases fit 80x28 and 100x30 after ANSI stripping.
- Carbon, Paper, and Contrast use semantic roles only.
- Controller help/pause/restart/quit/next-game paths clean up exactly once.

### 6.8 Human exit task

A first-time player must complete induction and the first campaign case without verbal instruction, explain why two bearings locate the source, and recover from one intentionally failed lock using only the visible diagnosis.

## 7. Last Train Home implementation plan

### 7.1 Product outcome

Last Train Home should feel like a paper railway diagram under emergency dispatch, with time and consequences moving left to right. Its loop is:

```text
read timetable and hazard forecast -> set one junction/hold/repair order
-> inspect projected movement -> commit -> read the resolution tape
```

The visual hierarchy must make train movement, active junction exits, upcoming closures, and evacuation targets understandable before commit.

### 7.2 Routing decision

Use **junction-only routing** as the single routing model.

- Dispatchers select a junction and switch its active exit.
- Trains follow the active exit when they reach that junction.
- Tab cycles trains for inspection and Hold actions.
- Remove `plannedExit` and the unreachable `setRoute` command unless a later scenario proves per-train route orders are essential.

This removes two concepts that currently describe the same decision and eliminates the unreachable controller path.

### 7.3 Signature composition

At 80x28:

- top: scenario name, scenario count, turn, evacuation target, and two action marks;
- left: railway diagram with stable track shapes, stations, junction exit, trains, selected object, closed line, obstruction, reinforced line, and safe terminus;
- right: timetable ribbon listing each train, next segment, load, priority, and projected state;
- below timetable: hazard forecast ordered by turn with exact map coordinate/station and effect;
- bottom: pre-commit projection or chronological turn-resolution tape;
- footer: only the controls legal for the selected object and phase.

The map remains the hero. Side information annotates it rather than competing with it.

### 7.4 Three-turn tutorial

Create a small authored tutorial scenario separate from the two campaign scenarios:

1. **Turn 1 — Switch:** select the marked junction, change its exit, inspect the projected route, and commit.
2. **Turn 2 — Hold:** select the medical train, hold it to avoid a visible conflict, inspect the changed timetable, and commit.
3. **Turn 3 — Repair:** select the forecast hazard tile, reinforce it before impact, then commit and observe that the line holds.

The tutorial ends only after the player has used all three verbs and read the final resolution. Invalid actions retain the current step and explain which object must be selected.

### 7.5 Turn projection

Extract a pure, non-mutating projection using the same ordering rules as turn resolution:

```ts
interface TurnProjection {
  trains: Array<{ id: string; from: Point; to?: Point; outcome: 'move' | 'hold' | 'block' | 'arrive' }>;
  hazards: Array<{ id: string; target: Point; outcome: 'hit' | 'reinforced' | 'resolved' }>;
  warnings: string[];
}
```

The projection appears before Space/Enter commit. A regression test must assert that the projection and actual resolution agree for movement, blocking, arrivals, and hazard impact.

### 7.6 Scenario progression

- Show `SCENARIO 1/2` and the current scenario name on every campaign phase.
- After a win, `N` opens the next scenario briefing when one exists.
- After the final scenario, `N` moves to the next game.
- Restart preserves scenario, seed, and tutorial/campaign mode.
- The ending distinguishes tutorial completion, scenario completion, and campaign completion.

### 7.7 File-level changes

- `src/games/last-train-home/types.ts`
  - add explicit mode, tutorial objective, turn projection, and campaign completion state;
  - remove per-train planned routing if junction-only routing is confirmed.
- `src/games/last-train-home/scenarios.ts`
  - add the authored three-turn tutorial scenario;
  - attach stable coordinate/station labels required by forecast text.
- `src/games/last-train-home/engine.ts`
  - extract shared projection/resolution ordering;
  - advance tutorial objectives from validated commands;
  - remove unreachable route behavior;
  - make scenario progression explicit and deterministic.
- `src/games/last-train-home/render.ts`
  - use the semantic palette and terminal width utilities;
  - remove title jitter;
  - show active junction shape, timetable, hazard target, projection, report, help, and endings without color dependence.
- `src/games/last-train-home/index.ts`
  - give help exclusive input ownership;
  - route Escape to overlay before pause;
  - make selection-specific controls truthful;
  - preserve controller cleanup.
- Add `render.test.ts` and `index.test.ts`; expand `engine.test.ts`.

### 7.8 Automated gate

- Tutorial transcript completes exactly three turns and demonstrates Switch, Hold, and Repair.
- Projection matches resolution for all train/hazard outcomes.
- No unreachable command remains in the public command union.
- Both campaign scenarios are reachable and winnable through legal commands.
- Active junction exit, forecast location, and train priority remain readable without ANSI color.
- Help owns input and cannot mutate the simulation.
- Every phase fits 80x28 and 100x30.
- Controller lifecycle and all transition paths pass fake-terminal tests.

### 7.9 Human exit task

A first-time player must complete the tutorial, predict where a selected train will be after commit, point to the next hazard on the diagram, and finish the first scenario without verbal instruction.

## 8. Beta pair evidence gate

Run Signal//Noise and Last Train Home with at least five first-time players each before beginning Market of Mirrors.

Record:

- time to first meaningful action;
- first confusion and recovery path;
- whether the player can state the next objective;
- whether a failed action explains what to try next;
- whether preview and result agree in the player's words;
- terminal, dimensions, theme, and glyph mode;
- any overflow, alignment, contrast, or input defect.

Block advancement when:

- one player encounters a crash, stuck state, terminal leak, or unreachable objective;
- three of five players repeat the same misunderstanding;
- a player completes a task for the wrong reason and the interface does not correct the model;
- the legal full-content transcript fails.

Promotion from Beta to Featured is a separate product decision. Migration alone does not promote either game.

## 9. Market of Mirrors implementation plan

### 9.1 Product outcome

Market of Mirrors should feel like an auction room where the player can trace how a story becomes a price. Its core loop is:

```text
read quote and circular -> select a lot or artifact -> preview an action
-> commit -> ring the bell -> trace claim -> belief -> order -> quote
```

The strange goods supply personality; the interface supplies proof. The game must never ask the player to trust a price change that cannot be explained from visible inputs.

### 9.2 Signature composition

At 80x28:

- left two-thirds: auction tape with selected good, bid/ask, stock, momentum, player holdings, and claim exposure in aligned columns;
- upper-right: rumor broadsheet showing source, subject, frame, intensity, and settlement time;
- lower-right: inventory shelf containing raw lots and artifacts;
- bottom drawer: context actions, previews, bids, or closing-bell trace depending on phase;
- one-line commission note in the margin, expanded only when focused.

The auction tape should resemble a working ledger, not a bank trading terminal. Use editorial rules, whitespace, and paper-like annotations.

### 9.3 Reduced command surface

Replace the two permanent command rows with focus-driven interaction:

- Up/Down moves within the current surface.
- Tab moves Auction Tape -> Inventory Shelf -> Broadsheet.
- Enter opens the actions available for the focused item.
- Up/Down selects Buy, Sell, Combine, Publish, Offer, Inspect, or End Day as applicable.
- Enter opens a preview; Enter confirms; Backspace cancels.
- Left/Right adjusts the secondary choice inside Combine, Publish, or Offer.
- `?` opens help; Escape closes the drawer/help or pauses.

Mnemonic keys may remain as undocumented accelerators only after controller tests prove they cannot collide.

### 9.4 Causal closing-bell trace

Replace string-only bell evidence with structured data:

```ts
interface RumorBeliefTrace {
  rumorId: string;
  factionId: FactionId;
  baseCredibility: number;
  preference: number;
  scarcity: number;
  momentum: number;
  affinity: number;
  skepticism: number;
  total: number;
  believed: boolean;
}

interface PriceTrace {
  goodId: GoodId;
  previous: number;
  playerFlow: number;
  factionFlow: number;
  rumorPressure: number;
  artifactFlow: number;
  meanReversion: number;
  cap: number;
  next: number;
}
```

The bell report reveals one selected chain at a time:

```text
CLAIM  COVETED ECLIPSE +2
  -> CABINET BELIEVES 7/9 (credibility + preference + scarcity)
  -> CABINET BUYS ECLIPSE +1
  -> QUOTE 30 + rumor 2 + flow 1 - mean 0 = 33
```

ANSI-stripped output must preserve every arrow and quantity using ASCII text when needed.

### 9.5 Guided Fair

Keep the three-day tutorial length but make each day objective-driven:

1. **Quotes:** focus a good, inspect bid/ask, buy one lot, and observe cash/stock preview.
2. **Artifacts:** acquire a second lot, combine, compare buyer bids, and make one offer.
3. **Rumors:** publish a claim, inspect faction belief factors, ring the bell, and trace the resulting quote.

Do not unlock actions merely because the day changed. Advance the tutorial after the required evidence and action have occurred.

### 9.6 File-level changes

- `src/games/market-of-mirrors/engine.ts`
  - split the render-counter bug from selected rumor frame by removing render state from the controller model;
  - return structured belief, faction-order, rumor-settlement, and price traces;
  - add objective-driven Guided Fair progress;
  - preserve deterministic market outcomes while changing representation;
  - expose legal contextual actions for the selected entity.
- Add `src/games/market-of-mirrors/render.ts`
  - implement the pure auction-tape renderer;
  - use semantic palette and cell-aware terminal utilities;
  - cover title, briefing, market, action drawer, preview, bell trace, draft, help, ending, and resize.
- `src/games/market-of-mirrors/index.ts`
  - retain terminal ownership and local focus/selection state only;
  - rename selections explicitly (`selectedRumorFrame`, `selectedIntensity`, and so on);
  - implement focus-driven controls and overlay ownership;
  - remove all rendering helpers and direct ANSI composition.
- Add `render.test.ts` and `index.test.ts`; expand `engine.test.ts`.

### 9.7 Automated gate

- Rendering cannot mutate the selected rumor frame or any engine state.
- Guided Fair transcript completes the quote, artifact, and rumor objectives.
- Every price change can be reconstructed from a structured `PriceTrace`.
- Belief totals and faction orders match the existing deterministic outcome for locked seeds.
- Invalid actions remain non-mutating and explain the missing prerequisite.
- The main screen never shows actions that are illegal for the focused item.
- All phases fit 80x28 and 100x30 in Carbon, Paper, and Contrast.
- Controller lifecycle and modal input ownership pass.

### 9.8 Human exit task

A first-time player must complete the Guided Fair and explain one closing-bell movement as claim -> faction belief -> faction order -> new quote without verbal instruction.

## 10. Rogue Ledger implementation plan

### 10.1 Product outcome

Rogue Ledger should feel like marking up a strange but rigorous set of accounts. Its core loop is:

```text
read transaction and clauses -> compare legal treatments
-> inspect now/later/audit/standing projection -> commit
-> reconcile the entry -> survive the quarter
```

The comedy belongs in transaction content. The accounting surface itself should be precise, calm, and trustworthy.

### 10.2 Run-length decision

Shorten the standard run from six quarters of eight transactions to **four quarters of five transactions**. Target a 10–15 minute first complete run.

- Tutorial: one quarter of four authored transactions.
- Standard: four deterministic quarters, five transactions each.
- Recalculate profit targets and cash floors against the shorter deck.
- Keep policy/category drafting between quarters so the build still develops three times.
- Update catalog session metadata from `campaign` to `10–15 min` only after measured playtests support it.

### 10.3 Treatment redesign

Replace equivalent treatments with explicit trade-offs. Initial tuning target:

| Treatment | Immediate effect | Scheduled effect | Risk/reputation effect | Legal use |
|---|---|---|---|---|
| Book | Apply 100% now | None | Neutral | Income and expense |
| Capitalize | Apply 35% of an expense now | Pay 70% next quarter | +1 Audit before rule modifiers | Capital-like expenses only |
| Defer | Apply 0 now | Pay 110% next quarter | -2 Standing | Deferrable expenses only |
| Reserve | Receive 60% of income now | Release 40% next quarter | -1 Audit | Income only |
| Decline | Apply 0 now | None | -3 Standing; clause-specific Audit risk | Optional/luxury transactions only |

Move allowed-treatment rules into data rather than deriving them from deck index. Replace unsigned `Liability` with a signed scheduled adjustment so future payments and reserved income use one traceable model.

These numbers are starting values, not arbitrary permanent balance. Run deterministic simulations across at least 100 seeds and tune only if completion rate, dominant choice frequency, or impossible targets fail the balance gate in Section 10.8.

### 10.4 Signature composition

At 80x28:

- top: Quarter, entry count, cash, target progress, Audit, and Standing;
- main table: Description | Base | Treatment | Rules | Now | Later | Audit | Standing;
- selected transaction expands below the row with source, tags, and visible clauses;
- red-pencil margin lists triggered rules and their exact arithmetic order;
- liability schedule sits beside the current row, ordered by due quarter;
- bottom: selected treatment comparison or committed reconciliation.

The preview must keep Base, Now, Later, Audit, and Standing visible in the same row. Never hide a future liability in prose below the fold.

### 10.5 Interaction model

- Up/Down selects among legal treatments displayed beside the transaction.
- Enter opens the projection.
- Enter confirms the projection; Backspace cancels it.
- `?` opens a help sheet explaining the five treatments and arithmetic order.
- Escape closes projection/help before pause.
- During results, Enter advances to the next transaction.
- Mnemonic B/C/D/R/X aliases may remain, but the visible first-time path is selection plus Enter.

### 10.6 Tutorial quarter

Use four authored entries to teach one contrast at a time:

1. Book a routine income and reconcile immediate cash.
2. Compare Book and Capitalize on an infrastructure expense; inspect the scheduled payment.
3. Compare Book and Reserve on income; inspect the future release and Audit effect.
4. Choose between paying, deferring, or declining an optional expense while protecting the quarter target and Standing.

The tutorial ends with a small quarter report that reconciles opening cash, immediate entries, scheduled adjustments, and closing cash.

### 10.7 File-level changes

- `src/games/rogue-ledger/engine.ts`
  - add tutorial/standard mode and explicit run configuration;
  - introduce signed scheduled adjustments;
  - make treatment definitions data-driven and mechanically distinct;
  - generate five-entry standard decks and authored tutorial entries;
  - return a structured arithmetic trace in stable order;
  - expose legal treatments and quarter reconciliation data.
- Add `src/games/rogue-ledger/render.ts`
  - implement the pure accounting-table renderer with semantic palette;
  - keep current and future consequences in the same row;
  - render briefing, tutorial, working, preview, result, draft, report, help, ending, game-over, and resize.
- `src/games/rogue-ledger/index.ts`
  - retain terminal lifecycle and local selection/overlay state only;
  - fix Escape precedence so preview cancellation works;
  - make footer controls match real handling;
  - add start choice for tutorial and standard run;
  - remove direct rendering and hard-coded ANSI.
- Add `render.test.ts` and `index.test.ts`; expand `engine.test.ts`.
- Add a deterministic balance/simulation test or script that reports completion, dominant treatment share, and unreachable target seeds without modifying saved state.

### 10.8 Automated gate

- No pair of treatments produces identical immediate, future, Audit, and Standing outcomes for every transaction where both are legal.
- Scheduled adjustments appear in preview, survive commit, and reconcile on the correct quarter.
- Projection arithmetic exactly equals committed state change.
- Backspace/Escape cancels preview without pausing or mutating the ledger.
- A legal transcript completes tutorial and a standard four-quarter run.
- Across 100 fixed seeds, at least 90 are mathematically winnable by a legal policy; no single treatment exceeds 70% of optimal choices unless content explicitly makes it dominant.
- The 80x28 frame shows current and future consequences without overflow.
- Controller help, pause, restart-quarter, restart-run, quit, and cleanup paths pass.

### 10.9 Human exit task

A first-time player must complete the tutorial quarter, explain the difference between Book, Capitalize, Defer, Reserve, and Decline, and identify both the immediate and scheduled effect before confirming an entry.

## 11. Workshop mini-gate

Market of Mirrors and Rogue Ledger each require at least three first-time-player sessions to remain in Workshop with the migration marked complete. Five sessions are required before either can be considered for Beta.

For three-player Workshop tests, treat the same confusion observed by two players as repeated. Fix and retest it before the cohort review.

Required evidence tasks:

| Game | Evidence task |
|---|---|
| Market of Mirrors | Explain one complete claim -> belief -> order -> quote chain from the closing-bell trace. |
| Rogue Ledger | Explain Base -> treatment -> rule/category -> Now/Later -> Audit/Standing before committing. |

Do not promote either game automatically. Maturity changes require their own review after playtest evidence.

## 12. Cohort verification matrix

| Area | Signal//Noise | Last Train Home | Market of Mirrors | Rogue Ledger |
|---|---|---|---|---|
| Minimum terminal | 80x28 | 80x28 | 80x28 | 80x28 |
| Wide terminal | 100x30 | 100x30 | 100x30 | 100x30 |
| Pure renderer | Required | Required | Extract required | Extract required |
| Engine transcript | Induction + six cases | Tutorial + both scenarios | Guided Fair + full run | Tutorial + full run |
| Core causal proof | adjustment -> lock | order -> projection -> resolution | claim -> belief -> quote | treatment -> now/later result |
| First-time sessions | 5 | 5 | 3 minimum | 3 minimum |
| Promotion after migration | Separate decision | Separate decision | No | No |

Every game must pass:

- Carbon, Paper, and Contrast inspection;
- Unicode and ASCII-safe inspection;
- ANSI-stripped line-width assertions;
- start-to-exit controller lifecycle test;
- pause, restart, games menu, next game, and quit transitions;
- resize down and restore without state mutation;
- honest catalog/help/control metadata.

## 13. Verification commands

Run targeted tests during each migration:

```powershell
npm.cmd test -- src/games/signal-noise
npm.cmd test -- src/games/last-train-home
npm.cmd test -- src/games/market-of-mirrors
npm.cmd test -- src/games/rogue-ledger
```

Run the full gate after each game and again after the cohort:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
node dist/cli.js
npm.cmd run pack:smoke
git diff --check
graphify update .
```

`graphify update .` is required after code changes. If the CLI remains unavailable, record that infrastructure blocker; do not silently claim the graph is current.

## 14. Manual playtest record

Create one row per session with:

| Field | Required value |
|---|---|
| Session ID | Anonymous stable identifier |
| Game/build | Game and commit/build identifier |
| Experience | First-time Gamr, first-time game, terminal familiarity |
| Environment | Terminal, operating system, font, dimensions |
| Appearance | Theme and Unicode/ASCII mode |
| First action | Time and action |
| First confusion | Exact screen and player statement |
| Recovery | Self-recovered, help, experiment, or verbal prompt |
| Causal explanation | Player's own explanation of preview/result |
| Completion | Tutorial/case/scenario/run outcome and time |
| Defects | Overflow, alignment, contrast, key handling, lifecycle |

Do not lead the participant. Ask “What do you think will happen?” before commits and “Why did that happen?” after results.

## 15. Risks and controls

| Risk | Control |
|---|---|
| Featured findings arrive after the next cohort starts. | Close the Featured gate first or limit overlap to non-mechanical preparation. |
| Four games converge on the same panel template. | Review each signature composition at 80 columns before code and run a three-second recognition check. |
| Signal//Noise guidance reveals solutions. | Diagnose one mismatched dimension at a time and reveal only evidence the player has earned. |
| Last Train Home projection drifts from resolution. | Share ordering logic and assert projection/result equivalence. |
| Market traces change deterministic outcomes. | Separate structured evidence from calculation and lock known seeds before refactoring. |
| Rogue Ledger balance work grows without limit. | Fix the treatment model and run length first; tune against fixed simulation thresholds. |
| Light themes expose hard-coded colors. | Semantic palette only; Paper and Contrast are merge gates. |
| Unicode breaks alignment. | One-cell vocabulary, ASCII fallbacks, and stripped-width tests. |
| Documentation claims promotion prematurely. | Update maturity metadata only after the separate evidence review. |

## 16. Cohort definition of done

The next-four milestone is complete only when:

- [ ] The Featured Four human-validation prerequisite is closed or an explicit overlap decision is recorded.
- [ ] Signal//Noise passes its automated gate and five first-time sessions.
- [ ] Last Train Home passes its automated gate and five first-time sessions.
- [ ] Repeated Beta-pair confusion is fixed and retested.
- [ ] Market of Mirrors passes its automated gate and at least three first-time sessions.
- [ ] Rogue Ledger passes its automated gate and at least three first-time sessions.
- [ ] Repeated Workshop confusion is fixed and retested.
- [ ] All four use semantic palette roles and cell-aware pure rendering.
- [ ] All four have renderer, controller, transcript, resize, and lifecycle coverage.
- [ ] Full test, typecheck, build, interactive CLI, package smoke, and diff checks pass.
- [ ] `graphify update .` completes or its unavailable CLI is recorded as an infrastructure blocker.
- [ ] The migration ledger says exactly 8 of 20 active games migrated.
- [ ] The other 12 active games remain explicitly unmigrated.
- [ ] The 19 Arcade Archive games remain unchanged.

## 17. Status ledger

| Group | Games | Migration status at plan creation | Status after successful cohort |
|---|---|---|---|
| Featured Four | Stack Trace, Five-Minute Kingdom, Dead Letter Department, Packet Panic | Migrated; human validation pending | Migrated and validated |
| Next Beta pair | Signal//Noise, Last Train Home | Not migrated | Migrated; maturity reviewed individually |
| Batch A first pair | Market of Mirrors, Rogue Ledger | Not migrated | Migrated; remain Workshop unless separately promoted |
| Remaining active games | Blackout Grid, Containment Protocol, Ghost Shift, The Quiet Heist, Orbital Post, Dice Tribunal, Time Capsule, Tiny Fleet, Dungeon Courier, Night Frequency, Botany Lab, The 13th Lift | Not migrated | Still not migrated |
| Arcade Archive | 19 compatibility games | Out of scope | Unchanged |

The next planning decision after this cohort is whether to continue Batch A with Ghost Shift and Dice Tribunal or pause for a broader 8-game production-readiness review. That decision should use the playtest evidence gathered here rather than being made in advance.

## 18. Implementation update — 2026-08-09

The automated implementation pass for this cohort is complete:

| Game | Automated implementation status | Human validation status |
|---|---|---|
| Signal//Noise | Renderer/controller migration, staged induction state, lock diagnostics, semantic themes, renderer tests, lifecycle test | Pending first-time-player sessions |
| Last Train Home | Renderer/controller migration, junction-only routing, turn projection, explicit tutorial progress, scenario-aware frames, renderer tests, lifecycle test | Pending first-time-player sessions |
| Market of Mirrors | Pure auction-tape renderer, focus-driven controller, contextual overlays, tutorial progress, selected-frame bug fix, renderer tests, lifecycle test | Pending first-time-player sessions |
| Rogue Ledger | Accounting renderer, preview cancellation, tutorial mode, shorter run, distinct scheduled treatment outcomes, renderer tests, lifecycle test | Pending first-time-player sessions |

Verification completed:

- 55 test files / 254 tests passed;
- `npm.cmd run typecheck` passed;
- `npm.cmd run build` passed;
- `node dist/cli.js --help` passed;
- `npm.cmd run pack:smoke` passed;
- `git diff --check` passed.

The four games are still not promoted automatically. Manual sessions, repeated-confusion fixes, and the separate maturity review remain required. The repository's `graphify` executable was not available on PATH; both the required query and post-change `graphify update .` were attempted and recorded as unavailable infrastructure operations.
