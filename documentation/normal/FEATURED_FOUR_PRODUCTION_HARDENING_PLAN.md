# Gamr Featured Four production-hardening implementation plan

**Created:** 2026-08-09  
**Scope:** Stack Trace, Five-Minute Kingdom, Dead Letter Department, and Packet Panic  
**Program phase:** Production-candidate hardening after the active-game migration program  
**Active catalog:** All 20 active games have migration implementation; human validation and promotion remain separate gates  
**Arcade Archive:** The 19 legacy compatibility games remain separate, launchable, and unchanged  
**Primary outcome:** Four Featured games that can support an evidence-backed release candidate

## Implementation status (2026-08-09)

The automated hardening slice is implemented in the shared catalog and the four Featured controllers:

- `placement` and `readiness` metadata now have runtime fields, while `maturity` remains a compatibility alias;
- Stack Trace, Five-Minute Kingdom, and Dead Letter Department render on state changes instead of polling intervals;
- all four controllers restore cursor/ANSI/alternate-buffer state idempotently;
- Stack Trace now treats `S` as movement outside the test panel, includes the UTC daily case label, and refreshes overlays immediately;
- Five-Minute Kingdom has an explicit preview-cancel path and immediate ledger/pause/help updates;
- Packet Panic has explicit Standard/Tutorial modes, same-seed retries, injectable time, and reduced-motion rendering;
- deterministic engine coverage and the Featured Four lifecycle suites pass.

Verification at this checkpoint: `npm.cmd test` (58 files / 271 tests), `npm.cmd run typecheck`, production `npm.cmd run build`, `npm.cmd pack --dry-run`, `node dist/cli.js --help`, and `git diff --check` all pass.

The remaining checklist items are intentionally release gates rather than code-only work: first-time-player sessions, cross-terminal/package verification, full-path human playtests, evidence packets, and readiness promotion. The Graphify CLI was attempted after implementation but is unavailable in this environment; that limitation is recorded for release evidence.

## 1. Decision: there is no fifth migration batch

The active migration queue ended with The Quiet Heist, Tiny Fleet, Dungeon Courier, and The 13th Lift. The next four are not legacy migrations. They are the existing Featured shelf:

1. Stack Trace
2. Five-Minute Kingdom
3. Dead Letter Department
4. Packet Panic

These four are the public front door of Gamr. They should be hardened before another Workshop game is promoted because together they cover the product's major release risks:

| Order | Game | Product role | Release risk it establishes |
|---:|---|---|---|
| 1 | Stack Trace | Reference turn-based puzzle and deepest controller test base | Defines the stable turn-based lifecycle, input, daily challenge, replay, and accessibility contract. |
| 2 | Five-Minute Kingdom | Shortest and most approachable Featured session | Proves first-session onboarding, preview/commit comprehension, five-minute pacing, and low-friction completion. |
| 3 | Dead Letter Department | Dense rules-and-evidence campaign | Proves generated-content validity, audit explanations, six-shift continuity, information hierarchy, and longer-session reliability. |
| 4 | Packet Panic | Featured real-time game | Proves virtual time, pause/resume, resize safety, reduced motion, performance, and timer cleanup under load. |

This sequence deliberately closes the turn-based release contract before applying it to the real-time exception. Packet Panic goes last because its timer, performance, and motion requirements need a separate gate rather than becoming defaults for every other game.

## 2. Catalog and legacy decision

### 2.1 Keep the Arcade Archive separate

Do not pull Snake, Tetris, Pong, or any other compatibility game into this cohort. The archive remains:

- available through the dedicated Arcade Archive entry;
- directly launchable for compatibility;
- outside the active visual and production-readiness standard;
- excluded from Featured rotation and active-catalog readiness counts;
- eligible for maintenance fixes, but not silent redesign.

A legacy game may return to the active catalog only through a future, explicit product proposal with its own identity, audience, support cost, and replacement/removal decision. There is no hidden Batch D.

### 2.2 Split placement from readiness

The current `maturity` field mixes shelf placement and product readiness:

```ts
maturity?: 'featured' | 'beta' | 'workshop'
```

`featured` answers “where is this game shown?” while `beta` and `workshop` answer “how ready is it?” That makes a Featured label look like production evidence when it is not.

Replace the single field with two concepts:

```ts
placement: 'featured' | 'catalog'
readiness: 'workshop' | 'preview' | 'stable'
```

Archive membership remains structural through `archiveGames`; it is not another active placement value.

Migration rules:

- the four games in this plan keep `placement: 'featured'`;
- they begin this cohort at their evidence-backed readiness, not automatically `stable`;
- active games not on the Featured shelf use `placement: 'catalog'`;
- menu filters and detail panels display placement and readiness separately;
- CLI list/help remains concise but must not imply that Featured means Stable;
- no readiness promotion occurs in the same change that introduces the schema.

## 3. Source-verified baseline

Graphify was requested first, but the executable is unavailable on PATH. The plan therefore uses the existing repository documentation for architecture and targeted source/test inspection for exact behavior.

Targeted automated baseline:

```text
13 test files passed
43 tests passed
```

Command:

```powershell
npm.cmd test -- src/games/stack-trace src/games/five-minute-kingdom src/games/dead-letter-department src/games/packet-panic
```

Current repository baseline after the active migration implementation:

```text
58 test files passed
269 tests passed
typecheck passed
production build passed
CLI help smoke passed
```

The targeted baseline is stronger than earlier migration cohorts: every Featured game has engine, renderer, and controller tests. It still does not prove first-time comprehension, full-session reliability, cross-terminal behavior, package installation, performance under sustained play, or production support readiness.

| Game | Current strengths | Source-verified production blockers |
|---|---|---|
| Stack Trace | Deterministic engine and machine; tutorial/campaign/daily modes; visible test ledger and step trace; undo/redo; tiered hints; semantic palette; terminal-cell-safe renderer; engine, machine, renderer, and controller tests; 80x24 support | Turn-based controller redraws every 50 ms; shutdown does not explicitly reset ANSI state; help advertises W/A/S/D movement while `S` is reserved for trace stepping and is not handled as down movement; controller coverage does not exercise campaign completion, daily mode, pause transitions, resize recovery, all focus regions, or every exit path; daily challenge uses UTC but does not make that contract explicit in the UI or test the day boundary. |
| Five-Minute Kingdom | Deterministic nine-turn engine; pure preview before commit; season and final scoring; semantic palette; cell-safe renderer; engine, renderer, and controller tests; clear first-turn charter; 80x28 support | Turn-based controller redraws every 50 ms; there is no explicit start/menu or tutorial mode, so the charter must carry all first-session onboarding; preview can be left by moving but has no explicit Backspace/Escape cancel contract; controller tests cover start/help/stop but not a complete nine-turn run, pause routes, ledger precedence, resize recovery, or all endings; no formal five-minute pacing measurement or seeded balance envelope exists. |
| Dead Letter Department | Deterministic deck generation; six-shift campaign; finite six-letter induction; typed rules and evaluation; verification resource; inspection views; audit and ledger; perks and case threads; semantic palette; engine, renderer, and controller tests | Turn-based controller redraws every 50 ms; shutdown omits explicit ANSI reset; generated-shift validity is tested only through selected examples rather than broad seed/property coverage; controller coverage does not prove a complete induction or six-shift campaign, every destination shortcut, verification use, perk selection, game-over/retry, resize, or all transitions; report evidence must be checked for sufficient causal explanation when multiple rules apply. |
| Packet Panic | Deterministic engine functions; real-time accumulator with elapsed cap; pause/help/resize guards; tutorial placement progression; topology, trace, focus, upgrades, particles, popups, and shake; semantic palette; engine, renderer, and controller tests | Standard and tutorial starts both call sector-one `createState`, whose phase is tutorial, so Standard inherits tutorial gating until placements advance it; seed and restart semantics are wall-clock-owned and not replayable by default; render and update use separate 50 ms intervals; controller tests do not prove virtual-time speed, pause/resume, focus slowdown, resize recovery, background throttling, upgrade transition, full win/loss, or catch-up behavior; reduced-motion support exists in the render model but the controller never supplies it. |

## 4. Production-candidate contract

### 4.1 What “Stable” means

A Featured game may be marked `readiness: 'stable'` only when all of these are true:

1. A first-time player can start, understand the core action, complete a meaningful goal, and leave without verbal assistance.
2. Every advertised control is reachable in the displayed phase.
3. Preview, commit, result, pause, restart, resize, help, and exit behavior are deterministic and tested.
4. The game remains understandable in Carbon, Paper, Contrast, and ANSI-stripped output.
5. Supported terminal dimensions do not clip or hide required information.
6. The full advertised session can complete on at least the supported terminal/platform matrix.
7. Stop and transition paths leave no timers, listeners, hidden cursor, alternate buffer, or ANSI state behind.
8. Seed/replay behavior is truthful and documented.
9. Known critical/high bugs are zero; accepted medium/low issues have owners and release notes.
10. Human evidence is recorded, not inferred from automated tests.

### 4.2 Shared interaction rules

- Help and reference overlays close before Escape opens pause.
- Pending preview or local confirmation cancels before pause.
- Pause freezes all game time and state mutation.
- Resize below minimum freezes gameplay and reports required/actual dimensions.
- Returning above minimum resumes from exactly the same state.
- Restart language distinguishes same seed, new seed, current case, current shift, and full campaign.
- Q never destroys progress from an ambiguous screen; route through pause or an explicit exit where necessary.
- Footer text is generated from phase-reachable commands or covered by a footer-to-controller contract test.
- Turn-based games render on state or overlay change, not at 20 frames per second.
- Real-time rendering and simulation clocks are explicit, fakeable, and independently bounded.

### 4.3 Shared visual and accessibility rules

- Keep the current original identities: repair bench, cadastral deed map, postal evidence desk, network topology.
- Do not redesign these games into a shared dashboard.
- Continue using `TerminalThemePalette` semantic roles and terminal-cell layout helpers.
- Color remains redundant to markers, labels, topology, and position.
- Every meaningful Unicode glyph has a one-cell ASCII equivalent.
- Provide reduced-motion behavior for Packet Panic and any shared transition effects.
- No title jitter, decorative scanline, or non-mechanical animation is added during hardening.
- Test minimum size, 100x30, below minimum, resize down/up, and odd widths.
- Paper theme is a required release capture, not an optional visual check.

### 4.4 Shared lifecycle rules

Every controller must have one idempotent shutdown path that:

- marks the controller stopped once;
- clears all intervals and timeouts;
- disposes the key listener once;
- prevents late initialization after an early stop;
- shows the cursor;
- resets ANSI style;
- exits alternate buffer once;
- calls the appropriate transition only after cleanup;
- tolerates repeated `stop()` calls;
- exposes no further writes or state changes after stop.

The fake-terminal controller harness should become shared test infrastructure instead of four copied local interfaces.

## 5. Delivery sequence

| Stage | Deliverable | Exit condition |
|---:|---|---|
| 0 | Catalog schema and baseline evidence | Placement/readiness split is implemented without promotions; current frames, seeds, transcripts, and known issues are captured. |
| 1 | Shared turn-based lifecycle hardening | Shared fake terminal, event-driven render helper/pattern, overlay precedence, resize, and shutdown contracts are tested. |
| 2 | Stack Trace hardening | Full tutorial/campaign/daily/controller matrix passes; five first-time sessions pass; readiness review recorded. |
| 3 | Five-Minute Kingdom hardening | Complete nine-turn, first-session, pacing, preview, ledger, controller, and human gates pass. |
| 4 | Turn-based Featured checkpoint | Repeated onboarding, input, layout, and lifecycle findings from the first pair are fixed before Dead Letter Department. |
| 5 | Dead Letter Department hardening | Broad generated-deck validity, full induction/campaign, audit explanation, controller, and human gates pass. |
| 6 | Packet Panic timing architecture | Standard/tutorial separation, virtual clock, reduced motion, seed/restart, pause, resize, and background behavior are deterministic. |
| 7 | Packet Panic full-session hardening | Performance, controller, full win/loss, accessibility, and human gates pass. |
| 8 | Featured Four release-candidate review | Cross-game, cross-terminal, package, documentation, and issue gates pass; readiness decisions are recorded individually. |

Stop the cohort if any game has a crash, save/replay claim that is not true, unreachable advertised control, preview/result contradiction, mandatory clipped content, timer/listener leak, unrecoverable terminal state, or repeated first-time confusion in two sessions.

## 6. Shared implementation work

### 6.1 Catalog schema

1. Add `placement` and `readiness` to `GameInfo`.
2. Convert all 20 active entries without changing the visible Featured shelf.
3. Update menu grouping, filters, status labels, detail copy, CLI listing, and tests.
4. Keep archive entries structurally separate.
5. Add validation that exactly four active games are Featured unless the product decision changes explicitly.
6. Add validation that every active game declares readiness.
7. Do not promote any game as part of the mechanical schema migration.

### 6.2 Shared controller test harness

Extract a reusable test utility that can:

- set terminal width and height during a session;
- record ANSI writes and visible frames;
- dispatch keyboard events with modifiers;
- count key listeners and disposals;
- use fake timers and an injected clock;
- inspect writes after stop;
- assert alternate-buffer/cursor/reset sequences;
- simulate menu, next-game, quit, and early-stop-before-init paths;
- strip ANSI and measure terminal-cell width.

Keep the harness test-only unless a small production abstraction materially reduces controller duplication.

### 6.3 Event-driven turn-based rendering

For Stack Trace, Five-Minute Kingdom, and Dead Letter Department:

- remove the permanent 50 ms render interval;
- render after accepted commands, overlay changes, pause selection changes, resize notification, and initial mount;
- keep renderer functions pure;
- make pause menu selection visibly update without a polling loop;
- verify no input path mutates state without rendering;
- verify stopped controllers never render.

### 6.4 Seed and replay contract

Define visible terms:

- **Retry:** same scenario/shift/case and same seed.
- **Replay:** restart the complete run with the same seed.
- **New run:** create a new seed.
- **Daily:** UTC-dated fixed content for that calendar key.

Every end screen and pause action must use one of these terms correctly. The current generic Restart menu may remain for simple cases only if its behavior is documented and tested.

## 7. Stack Trace hardening plan

### 7.1 Product outcome

Stack Trace becomes the reference Stable turn-based game: deterministic, teachable, keyboard-consistent, replayable, and safe across every terminal transition.

### 7.2 Input contract repair

The current help says W/A/S/D move the focused item, but the controller does not use `S` for down movement because `S` steps a trace in the tests region.

Choose and enforce one contract:

- Arrows move in every focus region.
- A/D move backward/forward in tape and tray.
- W/S move within tests only if vertical semantics are visible.
- Enter/Space advances the selected trace; remove `S` as a special trace verb if it conflicts.
- Help, footer, controller, and tests use identical language.

Add a generated reachability matrix for tape, tray, tests, lift/drop, return, mutate, undo, redo, run, find failure, hint, trace, next, replay, help, and pause.

### 7.3 Daily challenge contract

- Label the Daily key with its UTC date.
- Display the daily puzzle ID or a reproducible short code.
- Test the UTC day boundary and multiple time zones.
- Ensure the same date always selects the same eligible puzzle.
- Decide whether completion is session-local only; do not imply a persistent streak or leaderboard if none exists.
- Same-day retry must keep the same puzzle and seed.

### 7.4 Full-path tests

- Complete tutorial without hints.
- Complete tutorial using each hint tier.
- Complete every campaign case from a known transcript.
- Complete a daily case for a fixed date.
- Exercise mismatch, fault, pass, lean, patched, clean-trace, and campaign ending states.
- Verify undo/redo boundaries and restart after lifted-block state.
- Verify help, pause, resize, retry, next case, next game, quit, games menu, early stop, and repeated stop.
- Verify ANSI reset is written during cleanup.

### 7.5 Human gate

Five first-time players must complete the tutorial. At least four must:

- explain tape, tray, tests, and trace;
- repair the first routine without verbal control help;
- find the first failure after a bad run;
- distinguish Run from Trace Step;
- understand what a hint costs or changes;
- exit or replay deliberately.

The median time to first successful test run and tutorial completion should be recorded before setting a threshold. Any repeated confusion about focus or `S` blocks readiness promotion.

## 8. Five-Minute Kingdom hardening plan

### 8.1 Product outcome

Five-Minute Kingdom becomes the lowest-friction Featured game: a complete strategic arc in roughly five minutes with no hidden scoring surprise.

### 8.2 Onboarding decision

The Founding Charter currently acts as onboarding instead of a separate tutorial mode. Preserve that simplicity if testing supports it.

Required first-turn guidance:

1. choose one deed;
2. select a legal square;
3. read immediate Glory and delayed effects;
4. preview;
5. confirm;
6. read the placement record and ledger.

Add a dedicated tutorial mode only if at least two of five first-time players cannot complete that loop from the charter and contextual screen copy.

### 8.3 Preview and cancellation

- Backspace or Escape cancels preview and returns to target selection before pause.
- Moving the target may continue to cancel preview, but the behavior must be stated and tested.
- Preview and commit share the same scoring resolver.
- Show immediate Glory, season effects, adjacency changes, law effects, and legal/blocking reason.
- Result and season screens identify the source of every score delta.

### 8.4 Complete-run and pacing gate

- Add deterministic transcripts for all nine turns, two season boundaries, final chronicle, and ending.
- Test representative strategies rather than one golden path.
- Establish a seeded score envelope to detect broken balance without freezing all tuning.
- Record real first-time and repeat-player session duration.
- Target median first-time completion at 5-8 minutes and repeat completion at 4-6 minutes; revise only from evidence.
- Verify the ledger remains readable and does not become mandatory for every decision.

### 8.5 Controller and lifecycle tests

- all three deed keys;
- target movement at edges;
- preview, cancel, confirm, result, season, chronicle, ending;
- help/ledger/pause precedence;
- pause restart and same-seed replay;
- resize down/up in each major phase;
- quit, games menu, game switch, early/repeated stop;
- no render interval after event-driven conversion.

### 8.6 Human gate

Five first-time players complete one run. At least four must explain before confirming:

- what is being placed and where;
- immediate Glory;
- any later season effect;
- why the target is legal;
- what Enter does on the first and second press.

No participant should finish with an unexplained score swing larger than the smallest meaningful scoring unit.

## 9. Dead Letter Department hardening plan

### 9.1 Product outcome

Dead Letter Department becomes the reference evidence-and-rules campaign: dense, fair, generated, and auditable without reading hidden implementation logic.

### 9.2 Generated-content validity

Add broad deterministic seed coverage across every shift and perk combination:

- every generated letter has exactly one intended primary disposition;
- displayed facts and active rules are sufficient to derive that disposition;
- no two active rules create an unexplained contradiction;
- each shift contains the intended destination/risk variety;
- case-thread letters remain reachable and progress correctly;
- verification output never reveals more than its stated promise;
- overtime deck changes remain solvable;
- generation remains bounded and deterministic.

Use property-style loops over a documented seed sample. Do not make tests probabilistic.

### 9.3 Audit explanation contract

Every audit must show:

- chosen destination;
- correct destination;
- decisive fact or facts;
- decisive active rule or rules;
- trust, standing, score, streak, verification, and thread deltas;
- whether the error was a rule miss, fact miss, or destination mismatch.

When multiple rules apply, rank decisive evidence and keep secondary detail in the ledger. The audit must answer “why?” without requiring source knowledge.

### 9.4 Full campaign and restart semantics

- Complete the finite six-letter induction through its ending.
- Complete six campaign shifts with perk choices and at least one case-thread resolution.
- Test zero-trust game over and retry.
- Test same-seed retry and complete-run replay.
- Ensure tutorial restart remains tutorial and campaign restart remains campaign.
- Ensure restart language matches whether perks/shift progress are preserved or reset.

### 9.5 Controller and lifecycle tests

- all numeric and letter destination shortcuts;
- every inspection view;
- ledger/help/pause top-layer order;
- verification depletion and no-op behavior;
- audit dismissal, report continuation, perk selection;
- ending, game over, retry, next game, games menu, quit;
- resize down/up with letter, audit, and ledger open;
- ANSI reset, early stop, repeated stop, and no polling interval.

### 9.6 Human gate

Five first-time players complete induction and one campaign shift. At least four must:

- identify the active rule;
- find the decisive fact across inspection views;
- select the correct destination;
- explain the audit result;
- understand verification as a limited resource;
- recover from one deliberate wrong classification.

Repeated confusion between Dispatch, Express, Return, and Seal blocks promotion even if final accuracy is high.

## 10. Packet Panic hardening plan

### 10.1 Product outcome

Packet Panic becomes the reference real-time Featured game: responsive under load, deterministic under test, accessible with reduced motion, and completely frozen by pause/help/resize.

### 10.2 Separate Standard and Tutorial

Current source starts both choices from sector-one `createState`, whose phase is `tutorial`.

Implement explicit modes:

```ts
mode: 'tutorial' | 'standard'
```

- Tutorial begins paused from simulation and teaches Link, Bend, delivery, and repair through observable milestones.
- Standard begins in `playing` with normal simulation immediately after a short ready state.
- Tutorial completion transitions into a clearly named practice or standard sector.
- Renderer, controls, scoring, and tests must not infer mode from `sector === 1`.

### 10.3 Virtual time architecture

- Inject or encapsulate the monotonic clock used by the controller.
- Keep one simulation accumulator with a maximum catch-up budget.
- Use a single scheduler for update/render orchestration unless measured performance requires otherwise.
- Pause, help, below-minimum resize, upgrade, game over, win, hidden tab, and stopped controller advance zero simulation ticks.
- Resume resets the wall-clock anchor so background time is not replayed.
- Focus slowdown changes virtual tick duration deterministically.
- Fake-timer tests assert exact tick counts.

### 10.4 Seed and restart behavior

- Store the run seed visibly in state/report or a short run code.
- `Retry` reuses the current seed and sector-one start.
- `New run` generates a new seed.
- Pause-menu Restart must declare which behavior it uses.
- Upgrade choices remain deterministic for seed, sector, and installed upgrades.
- Full-session transcripts use injected time and fixed seeds.

### 10.5 Reduced motion and performance

- Connect the renderer's existing `reducedMotion` option to a real product setting or controller option.
- Reduced motion removes shake and decorative particles while keeping event markers and score text.
- Cap particle and popup counts under sustained delivery/failure.
- Measure 80x28 and 100x30 render cost during a busy sector.
- Define a practical frame/update budget for supported hardware and record the measurement method.
- Ensure terminal writes are bounded and do not grow because old effects remain resident.

### 10.6 Full-path tests

- tutorial milestones and transition;
- standard immediate simulation;
- normal and Focus tick rates;
- pause/help/resize/background freeze and resume;
- router place/rotate/salvage/purge/focus;
- delivery, drop, infection, quota, upgrade, game over, and sector-eight win;
- same-seed retry and new run;
- Carbon, Paper, Contrast, Unicode, ASCII, and reduced motion;
- every pause/transition/stop path and post-stop silence.

### 10.7 Human gate

Five first-time players complete tutorial and one standard sector. At least four must:

- connect a source to the matching destination;
- explain protocol letters and route shapes without color;
- repair or purge one failure;
- use Focus intentionally;
- pause and resume without losing the mental model;
- distinguish tutorial from standard play.

Record failure causes separately for control confusion, topology reading, time pressure, and visual overload.

## 11. Cross-game human validation

### 11.1 Session design

- Five first-time players per game; participants may overlap only after their first exposure is recorded.
- At least two repeat-player sessions per game for pacing and replay feedback.
- No verbal instruction before the participant first attempts the relevant action.
- Record screen, keys, terminal dimensions, theme, platform, seed/run code, timing, help use, errors, and comments.
- Obtain participant consent and store only the minimum necessary data.

### 11.2 Shared metrics

| Metric | Required evidence |
|---|---|
| Start success | 5/5 can enter intended mode and identify the objective. |
| First meaningful action | At least 4/5 complete it without verbal control help. |
| Preview/commit | At least 4/5 explain what Enter will do before irreversible action. |
| Result comprehension | At least 4/5 explain the decisive result cause. |
| Pause/return | 5/5 can pause, resume, and leave deliberately. |
| Layout | No required content clipped in any supported session. |
| Repeated confusion | Any issue seen in two participants is fixed and retested with two new participants. |

Automated playtesting can supplement these sessions for reachability and determinism. It cannot replace the explanation tasks.

## 12. Cross-terminal and package matrix

Required environments:

- Windows Terminal / PowerShell;
- the project's xterm.js host;
- at least one additional supported terminal path on macOS or Linux;
- Carbon, Paper, and Contrast themes;
- Unicode and ASCII/fallback glyph modes where supported;
- 80x24 for Stack Trace;
- 80x28 for all four;
- 100x30 for all four;
- below minimum and resize back above minimum;
- normal and reduced-motion Packet Panic.

Package/release checks:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd pack --dry-run
node dist/cli.js --help
node dist/cli.js --list
node dist/cli.js stack-trace
node dist/cli.js five-minute-kingdom
node dist/cli.js dead-letter-department
node dist/cli.js packet-panic
```

Also verify a clean tarball install in a temporary directory, direct active/legacy launches, theme selection, no undeclared files, and no accidental export break.

## 13. Production evidence packet

Each game gets one versioned evidence packet containing:

- readiness decision and reviewer;
- commit/build identifier;
- automated test summary;
- full-path seed/transcript;
- supported terminal/theme captures;
- first-time and repeat-player results;
- known issues and severity;
- performance data where relevant;
- accessibility notes;
- restart/replay contract;
- support/debug reproduction instructions;
- final go/no-go decision.

Store evidence summaries in repository documentation. Do not commit personal participant data or large raw recordings.

## 14. Release and rollback gates

### 14.1 Go criteria

- all shared and per-game automated gates pass;
- all four human gates pass;
- package install and direct launch pass;
- zero open critical/high issues;
- Paper and minimum-size captures approved;
- Packet Panic timing/performance gate passes;
- readiness labels reflect individual evidence;
- release notes describe modes, seeds, archive boundary, and known limitations;
- rollback package/version procedure is tested.

### 14.2 No-go criteria

- crash, hang, terminal corruption, or unrecoverable input;
- duplicated timer/listener or post-stop writes;
- gameplay advances during pause/help/resize/background state;
- preview/commit contradiction;
- generated unsolvable or ambiguous required content;
- required control missing from footer/help or unreachable in controller;
- repeated first-time confusion left unresolved;
- package contents or public exports differ unintentionally;
- Featured is used as a substitute for Stable evidence.

### 14.3 Rollback

- Keep the previous package artifact and release notes.
- A readiness promotion is reversible independently of placement.
- A game with a production regression may remain installed but move from Stable to Preview while the fix is prepared.
- Featured placement may be changed independently if the broken journey is the default product entry.
- Archive behavior remains unaffected by active readiness rollback.

## 15. Definition of done

- [ ] `placement` and `readiness` replace the mixed maturity meaning.
- [ ] The four Featured games retain placement without automatic Stable promotion.
- [ ] The Arcade Archive remains separate and unchanged.
- [ ] Shared controller test infrastructure covers resize, overlays, timers, transitions, and cleanup.
- [ ] Stack Trace, Five-Minute Kingdom, and Dead Letter Department are event-rendered rather than polled.
- [ ] Every controller resets ANSI, restores cursor, exits alternate buffer, and is idempotent.
- [ ] Footer/help commands match controller behavior in every phase.
- [ ] Stack Trace resolves the S-key movement/trace conflict.
- [ ] Stack Trace daily UTC/replay behavior is explicit and tested.
- [ ] Stack Trace complete tutorial, campaign, and daily paths pass.
- [ ] Five-Minute Kingdom preview has an explicit cancel path.
- [ ] Five-Minute Kingdom complete nine-turn and pacing gates pass.
- [ ] Dead Letter Department generated decks pass broad deterministic validity checks.
- [ ] Dead Letter Department induction, six-shift campaign, audit, perk, thread, and retry paths pass.
- [ ] Packet Panic Standard and Tutorial are truly separate modes.
- [ ] Packet Panic time is fakeable and freezes under every non-playing condition.
- [ ] Packet Panic supports same-seed retry, new run, reduced motion, and bounded effects.
- [ ] All four pass Carbon, Paper, Contrast, size, resize, Unicode/ASCII, and lifecycle checks.
- [ ] All four pass five first-time-player sessions and required explanation tasks.
- [ ] Repeated confusion is fixed and retested.
- [ ] Full tests, typecheck, build, package dry-run/install, CLI, and direct launch checks pass.
- [ ] Production evidence packets and individual readiness decisions are recorded.
- [ ] Zero critical/high issues remain.
- [ ] Graphify is updated after code implementation or its unavailable CLI is recorded honestly.

## 16. What follows

If all four pass, Gamr has a credible Featured release shelf and may cut a production release candidate. The next action is not automatically another group of four games.

After real usage evidence is available:

1. review crash/support data and first-session completion;
2. fix cohort-wide issues before promoting more active games;
3. choose the next readiness cohort based on evidence, not registry order;
4. consider Signal//Noise and Last Train Home first because they are currently marked Beta;
5. keep Workshop games in Workshop until their individual evidence packets pass;
6. revisit archive strategy only through a separate product decision.

The milestone is not “all games say Stable.” It is four Featured games whose stability claim can survive tests, first-time players, package installation, real terminals, and an honest rollback plan.
