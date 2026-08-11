# Gamr next-four production-hardening implementation plan

> **Archive status update — 2026-08-11:** Sections that preserve or test the 19-game Arcade Archive are superseded. Those compatibility games and their public launch/export surfaces have been removed; the supported catalog now contains 20 active games.

**Created:** 2026-08-09  
**Scope:** Signal//Noise, Last Train Home, Market of Mirrors, and Rogue Ledger  
**Program phase:** Production-readiness cohort after the Featured Four automated hardening slice  
**Code status:** All four games are visually migrated; this is not another UI migration  
**Primary outcome:** Two Preview games ready for individual Stable review and two Workshop games ready for an evidence-based Preview review

## 1. Cohort decision

The next four games in line are:

| Order | Game | Current catalog state | Role in this cohort | Candidate outcome |
|---:|---|---|---|---|
| 1 | Signal//Noise | Catalog / Preview | Establish the deep turn-based instrument and deduction contract | Stable review |
| 2 | Last Train Home | Catalog / Preview | Establish projection, scenario progression, and map-state reliability | Stable review |
| 3 | Market of Mirrors | Catalog / Workshop | Prove that a dense economic game can expose cause and consequence cleanly | Preview review |
| 4 | Rogue Ledger | Catalog / Workshop | Prove deterministic accounting, liabilities, and recovery paths | Preview review |

This order is deliberate:

1. Signal//Noise and Last Train Home were the two Beta games in the original catalog and are already closest to public readiness.
2. Both require longer deterministic path coverage than their current tests provide.
3. Market of Mirrors and Rogue Ledger share an evidence-and-documents family, but their compositions remain distinct: auction tape versus accounting book.
4. Findings from the Preview pair must be applied before the Workshop pair is signed off.

No game changes Featured placement in this cohort. Promotion to Featured is a separate product decision based on shelf balance, audience fit, and support data.

## 2. Boundary and prerequisite decision

The Featured Four still have outstanding human and cross-terminal gates. The practical decision is:

- automated work on this cohort may proceed while Featured human validation is scheduled;
- no game in this cohort may be promoted while a repeated Featured-wide lifecycle, control, layout, or accessibility issue is unresolved;
- any shared finding from the Featured sessions must be applied to these four before their readiness review;
- the 19 Arcade Archive games remain separate and untouched;
- the other 12 active games keep their current placement and readiness.

This is an explicit overlap for implementation only, not an overlap for promotion.

## 3. Source-verified baseline

The existing migration work already provides each game with a deterministic engine, a theme-aware renderer, a controller, renderer tests, and lifecycle smoke coverage.

Targeted baseline on 2026-08-09:

```text
12 test files passed
29 tests passed
```

The terminal playtest coverage report currently classifies all four as `generic-smoke` profile version 0. That is the largest common readiness gap: the automated player can prove launch and response, but cannot yet prove the advertised game loop or an ending.

| Game | Existing strengths | Production blockers found in source |
|---|---|---|
| Signal//Noise | Six authored cases, deterministic receiver model, structured lock diagnostics, induction, pure renderer | Controller polls rendering at 20 FPS despite turn-based state; replay creates a new seed; only two engine tests; no game-specific autonomous playtest profile; no full six-case transcript |
| Last Train Home | Authored tutorial, two scenarios, deterministic projection, explicit hazard order, pure renderer | Controller polls rendering; restart and next-scenario paths replace the seed; projection equivalence is only partially tested; no complete tutorial or two-scenario transcript; generic autonomous profile only |
| Market of Mirrors | Nine-day engine transcript, structured closing-bell trace, guided mode, action preview, same/new seed engine support | Controller polls rendering; title frame bypasses the renderer and theme; Escape opens pause before it can cancel a preview; controller focus paths are lightly tested; generic autonomous profile only |
| Rogue Ledger | Four-quarter run, tutorial, arithmetic preview, scheduled liabilities, quarter retry, pure gameplay renderer | Controller polls rendering; title frame bypasses renderer/theme; Escape opens pause before preview cancellation; no complete-run transcript; no next-game ending route; generic autonomous profile only |

Passing the existing tests means the migration did not regress its covered paths. It does not yet prove first-session comprehension, every advertised transition, full campaign completion, replay truthfulness, cross-terminal rendering, or production supportability.

## 4. Readiness outcomes

Placement and readiness remain separate.

### Signal//Noise and Last Train Home

- Keep `placement: 'catalog'` throughout implementation.
- Keep `readiness: 'preview'` until all automated, human, terminal, and package gates pass.
- Permit individual promotion to `stable`; one game must not inherit the other game's result.
- Do not restore the deprecated Beta label as a substitute for evidence.

### Market of Mirrors and Rogue Ledger

- Keep `placement: 'catalog'`.
- Keep `readiness: 'workshop'` during implementation.
- A minimum of three clean first-time sessions may qualify a game for `preview` review.
- Stable requires the full five-session, cross-terminal, package, lifecycle, and zero-high-severity gate; Workshop-to-Stable must never happen merely because the code merged.

## 5. Shared implementation contract

### 5.1 Event-driven turn-based controllers

All four games are turn-based. Remove their 50 ms render polling loops.

Each controller must render after:

- an accepted engine command;
- focus or selection movement held by the controller;
- opening or closing help;
- opening, navigating, confirming, or closing pause;
- restart, replay, new-run, scenario, and ending transitions;
- terminal resize when a resize listener is available.

The controller must not render continuously while idle. This reduces output churn, makes terminal transcripts stable, and prevents animation from becoming an accidental part of interaction timing.

### 5.2 Overlay and input precedence

Use the same order in every controller:

1. help owns input while open;
2. a phase-specific cancellable preview owns Escape before pause;
3. pause owns input while open;
4. the current gameplay phase handles its legal commands;
5. unhandled keys do nothing and do not mutate state.

Footer and help text must be generated from, or tested against, the actual controller contract. No frame may advertise a key that the current phase cannot receive.

### 5.3 Seed and restart vocabulary

Use these meanings consistently:

- **Retry / replay:** same seed, same scenario or run configuration.
- **Restart quarter/case:** same seed and retained progression explicitly named by the game.
- **New run:** new seed and cleared progression.
- **Next scenario:** same campaign seed, next authored scenario.
- **Next game:** stop the controller and dispatch the shared switch transition.

Every ending frame must name the behavior truthfully. Seed behavior must have engine and controller tests.

### 5.4 Pure start and ending frames

Move Market of Mirrors and Rogue Ledger title output into their renderer modules. Start frames must:

- use the current semantic theme palette;
- use display-width-aware centering and clipping;
- support the same minimum-size response as gameplay;
- expose Standard, Tutorial, Help, and Quit only where implemented;
- have Carbon, Paper, and Contrast snapshots.

All four ending frames must expose valid retry/replay, next-game, and quit routes without relying on pause.

### 5.5 Controller lifecycle

Every controller must:

- safely stop before delayed initialization;
- install at most one key listener and one resize listener;
- dispose every listener exactly once;
- clear every timer it owns;
- restore cursor visibility, ANSI state, and alternate-buffer state;
- produce no writes after stop;
- tolerate repeated `stop()` calls;
- cleanly dispatch quit, games menu, and next game.

Use a shared fake-terminal test helper if it can be introduced without changing game composition.

### 5.6 Game-specific autonomous playtests

Replace profile version 0 generic smoke coverage for all four games.

Each profile must define:

- deterministic start actions and seed;
- phase-aware policy rather than a blind repeating key list;
- milestones for onboarding, first meaningful decision, visible consequence, and controlled ending;
- maximum actions, elapsed time, and stalled frames;
- replayable action labels suitable for a bug report.

Target coverage:

| Game | Minimum autonomous profile |
|---|---|
| Signal//Noise | Seeded completion of induction plus campaign progress through a resolved case |
| Last Train Home | Seeded completion of the three-step tutorial and first scenario |
| Market of Mirrors | Seeded completion of the three-day Guided Fair with one closing-bell explanation milestone |
| Rogue Ledger | Seeded completion of induction and one standard quarter with a liability reconciliation milestone |

Complete campaign transcripts remain engine-level requirements even where the terminal policy stops at a shorter, representative ending.

## 6. Delivery sequence

| Stage | Work | Exit gate |
|---:|---|---|
| 0 | Capture current seeds, terminal frames, controls, and known failures | Baseline evidence stored; Featured overlap decision recorded |
| 1 | Shared controller, metadata, and playtest utilities | Helpers tested without visual coupling |
| 2 | Signal//Noise hardening | Targeted automated gate and five first-time sessions pass |
| 3 | Last Train Home hardening | Targeted automated gate and five first-time sessions pass |
| 4 | Preview-pair checkpoint | Repeated receiver/map confusion fixed and retested |
| 5 | Market of Mirrors hardening | Targeted automated gate and at least three first-time sessions pass |
| 6 | Rogue Ledger hardening | Targeted automated gate and at least three first-time sessions pass |
| 7 | Workshop-pair checkpoint | Repeated evidence/arithmetic confusion fixed and retested |
| 8 | Cohort release review | Cross-terminal, package, lifecycle, and readiness decisions recorded individually |

Stop before the next game when the current one has a crash, stuck phase, preview/commit contradiction, false control label, mandatory clipped content, terminal leak, non-deterministic replay, or repeated first-time confusion.

## 7. Signal//Noise implementation plan

### 7.1 Product outcome

Signal//Noise should feel like a precise field receiver. A player must be able to say which instrument dimension is wrong, why a bearing is trustworthy, where the source is, and which response the decoded evidence supports.

### 7.2 Controller work

- Remove `renderInterval`; render on engine commands and overlay changes.
- Make help exclusive and render it immediately on open/close.
- Verify help behavior from the start frame; either make it reachable there or do not advertise it there.
- Make pause navigation render immediately and restore the receiver frame on resume.
- Change ending `R` from `Date.now()` to same-seed replay of the current mode.
- Keep `N` as next game because the ending frame already says so.
- Add ANSI reset to cleanup and cover early stop, repeated stop, menu, next-game, and quit paths.

### 7.3 Engine and content verification

- Add a deterministic transcript for all six cases.
- Prove every case can reach broadcast or a controlled expiry without an impossible required operation count.
- Assert tuner changes do not spend operations.
- Assert failed locks identify one useful dimension and direction without revealing hidden solution values.
- Assert two valid locks produce the same candidate set regardless of capture order.
- Assert only decoded evidence can justify the correct response.
- Assert induction reaches each of its six visible objectives through accepted actions only.
- Assert same-seed replay recreates case definitions, events, and receiver values.

### 7.4 Renderer work

- Add a start/help contract test and complete phase snapshots: brief, listening, failed lock, broadcast, debrief, ending, pause, and resize.
- Verify receiver scale, waveform, station strip, bearing plot, decoder, and response choices remain distinguishable without color.
- Ensure a failed lock's recommended adjustment stays visible at 80x28.
- Check every case title and briefing for clipping at 80 and 100 columns.
- Preserve the receiver composition; do not convert it into a generic dashboard.

### 7.5 Autonomous and human gate

Add a profile that completes induction and resolves a seeded campaign case through public keys.

Five first-time players must independently:

1. capture two useful bearings;
2. explain one failed lock;
3. identify the source intersection;
4. cite packet text for the chosen response;
5. complete induction without verbal control instruction.

Repeated confusion about tuning versus sweeping, station selection, or response confirmation blocks Stable review.

## 8. Last Train Home implementation plan

### 8.1 Product outcome

Last Train Home should read like an emergency railway diagram with a trustworthy next-turn forecast. Before committing, the player must be able to predict train movement, the next hazard, and the cost of intervention.

### 8.2 Controller work

- Remove render polling and render after commands, selection, overlays, and pause changes.
- Make restart preserve the current seed and scenario index.
- Make `N` from scenario one open scenario two with the campaign seed, not a new timestamp.
- Keep `N` after the final scenario as next game.
- Preserve tutorial mode when retrying tutorial; do not silently restart into campaign.
- Render help close, pause navigation, report dismissal, restart, and scenario transition immediately.
- Add ANSI reset and full idempotent cleanup coverage.

### 8.3 Projection and scenario verification

- Use one resolution ordering implementation for both `projectTurn` and committed resolution.
- Add property-style assertions across authored states that projected train and hazard outcomes match commit results.
- Cover collisions, blocked lines, holds, junction switches, repairs, obstructions, simultaneous hazards, arrivals, and turn limits.
- Prove invalid actions do not spend action points.
- Complete the three-step tutorial by public commands and assert each objective advances only after success.
- Add deterministic full transcripts for both campaign scenarios.
- Verify scenario one success, scenario two launch, final success, failure, retry, and next-game paths.

### 8.4 Renderer work

- Snapshot every semantic map state in Carbon, Paper, and Contrast.
- Keep current and projected train positions visibly different by marker and label, not color alone.
- Keep the forecast ordered by turn and coordinate.
- Ensure every hazard names its map target using the same label visible on the railway diagram.
- At 80x28, keep the map, selected entity, action points, next commit summary, and current controls visible.
- Preserve the railway-diagram identity; do not reuse Signal//Noise panel geometry.

### 8.5 Autonomous and human gate

Add a profile that completes induction and the first scenario through the controller.

Five first-time players must independently:

1. switch the marked junction;
2. hold the medical train;
3. reinforce the forecast target;
4. predict one complete commit result;
5. reach the first scenario ending.

Any projection/result disagreement is a release blocker, even if the final outcome remains playable.

## 9. Market of Mirrors implementation plan

### 9.1 Product outcome

Market of Mirrors should let the player trace one complete market story: claim, faction belief, faction order, closing quote. Density is acceptable only when that chain remains inspectable.

### 9.2 Controller work

- Remove render polling.
- Move the title into `render.ts` and theme it.
- Route help before gameplay and preview cancellation before pause.
- Make Escape and Backspace both cancel an action preview without committing or opening pause.
- Render focus, good, artifact, faction, frame, and intensity changes immediately.
- Reset controller selections to valid values after restart and when inventory changes.
- Preserve `R` as same-seed replay and `N` as a new seeded run; name both exactly that way.
- Add next-game access through the ending or shared pause without overloading new-run behavior.

### 9.3 Engine and economic trace verification

- Keep preview and commit on the same evaluation path.
- Assert previewed cash, stock, inventory, credibility, suspicion, belief, and delayed effects equal committed results.
- Test each action family: buy, sell, combine, offer, publish, and end day.
- Test all rumor frames and intensities against affected factions and goods.
- Verify closing-bell trace order is claim -> belief -> order -> quote.
- Complete deterministic Guided Fair and nine-day standard runs.
- Prove method drafts are legal, deterministic, and applied from the next day onward.
- Verify same-seed replay reproduces market openings and new run changes the seed.

### 9.4 Renderer work

- Add pure start, action drawer, preview, bell report, draft, ending, help, pause, and resize snapshots.
- Keep auction tape selection, inventory selection, and broadsheet selection distinct by position and marker.
- Keep the focused action and its inputs together; do not restore a permanent wall of unrelated commands.
- Ensure the bell report fits at 80x28 without truncating the causal link needed for explanation.
- Test wide labels, negative prices, empty inventory, maximum artifacts, and simultaneous rumor lines.

### 9.5 Autonomous and human gate

Add a profile that completes the Guided Fair and detects at least one buy/sell consequence, one artifact, one published claim, and the final guided report.

At least three first-time players are required for Preview review; five are required for Stable review. Each must independently explain one closing-bell chain and distinguish replay seed from new seed.

## 10. Rogue Ledger implementation plan

### 10.1 Product outcome

Rogue Ledger should make every treatment legible as a signed accounting decision: what happens now, what is scheduled later, what happens to Audit, and what happens to Standing.

### 10.2 Controller work

- Remove render polling.
- Move the raw title output into the pure renderer and theme it.
- Route preview cancellation before pause so Escape matches the preview contract.
- Render treatment selection, help, pause, report, retry, and ending changes immediately.
- Clamp the selected treatment whenever the legal treatment list changes.
- Keep `R` on game over as same-seed quarter retry with the documented retained state.
- Keep `R` on success as same-seed run replay.
- Add `N` on the successful ending for next game and show it in the footer.
- Add complete ANSI reset and early/repeated-stop coverage.

### 10.3 Accounting verification

- Test every treatment against income, expense, capital-like, deferrable, and regulated entries.
- Assert the preview arithmetic equals committed cash, profit, Audit, Standing, and liability changes.
- Represent scheduled liabilities as signed structured values and reconcile them exactly once.
- Test rule/category ordering, caps, and conflicting modifiers.
- Add a deterministic induction transcript and complete four-quarter standard transcript.
- Verify quarter failure reasons individually: cash floor, profit target, Audit ceiling, and Standing collapse.
- Prove quarter retry retains only the state named in the retry explanation.
- Prove replay reproduces the full deck and outcomes for identical actions.

### 10.4 Renderer work

- Add pure start, briefing, working, preview, result, draft, report, game-over, ending, help, pause, and resize snapshots.
- Keep the selected transaction, legal treatments, and preview arithmetic visible together.
- Show current and scheduled values in the same row.
- Use explicit `+` and `-` signs and labels; never encode financial direction with color alone.
- Test maximum liabilities, six installed rules, five categories, long notices, and negative results at 80x28.
- Preserve the accounting-book composition and restrained annotation style.

### 10.5 Autonomous and human gate

Add a profile that completes induction and one deterministic standard quarter, including a preview, a liability, a result, a quarter close, and a report.

At least three first-time players are required for Preview review; five are required for Stable review. Each must predict one treatment's now/later effect and explain one quarter failure or success from the rendered evidence.

## 11. Cross-game human validation

Run sessions in cohort order. Do not test all four in one sitting.

Capture only product evidence:

- time to first meaningful decision;
- time to tutorial completion;
- wrong-key attempts and their visible response;
- help opens and reason for opening;
- pause/restart/replay usage;
- resize or clipping incidents;
- moments requiring verbal intervention;
- whether the player can explain the game's causal chain;
- final completion or abandonment phase.

Repeated confusion means the same issue occurs for two participants. Stop, fix it, and retest with new participants before signing off the game.

## 12. Terminal and accessibility matrix

For every game, inspect:

| Dimension | Required cases |
|---|---|
| Size | 79x28 resize state, 80x28 minimum, 100x30 wide |
| Theme | Carbon, Paper, Contrast |
| State | Start, tutorial, standard play, help, pause, preview/report, failure, ending |
| Input | Arrow keys, supported letter aliases, Enter, Space, Escape, Help, Quit |
| Lifecycle | Early stop, repeated stop, restart, games menu, next game, quit |
| Legibility | ANSI-stripped frame retains every required distinction |
| Unicode | Supported glyphs align; critical meaning has ASCII/label fallback |

Windows Terminal and the embedded xterm.js host are required. Add one additional terminal family before Stable promotion.

## 13. File-level implementation map

### Shared

- `src/games/index.ts`: explicit readiness changes only after individual approval.
- `src/games/gamesMenu.ts`: no placement change; ensure readiness labels remain truthful.
- `src/playtest/specs.ts`: add four versioned, game-specific profiles and milestones.
- `src/playtest/*`: extend only neutral runner behavior required by at least two profiles.
- shared fake-terminal test support: extract only if duplication is material.

### Signal//Noise

- `index.ts`: event-driven rendering, replay semantics, overlay and lifecycle fixes.
- `engine.ts`, `spectrum.ts`, `triangulation.ts`: transcript, diagnostic, order-independence, and reachability coverage.
- `render.ts`: start/help and complete phase coverage.
- tests: controller matrix, six-case engine transcript, theme/size frames.

### Last Train Home

- `index.ts`: event-driven rendering, seed-preserving retry/scenario flow, cleanup.
- `engine.ts`: shared projection/commit ordering and full scenario transcripts.
- `scenarios.ts`: validate authored tutorial and scenario reachability without changing content unless a failing transcript proves a defect.
- `render.ts`: projection, forecast, semantic map, and phase coverage.
- tests: tutorial, two scenarios, projection equivalence, controller matrix.

### Market of Mirrors

- `index.ts`: event-driven rendering, preview Escape precedence, selection validity, replay/new-run/next-game semantics.
- `engine.ts`: complete action and causal-trace verification.
- `render.ts`: pure title and complete phase states.
- tests: Guided Fair, nine-day run, action matrix, bell trace, controller paths.

### Rogue Ledger

- `index.ts`: event-driven rendering, pure title integration, preview precedence, ending transition, cleanup.
- `engine.ts`: treatment matrix, liabilities, modifiers, retry contract, complete transcripts.
- `render.ts`: pure title, signed arithmetic, extreme-state coverage.
- tests: induction, four-quarter run, failure/retry paths, controller matrix.

## 14. Automated verification

Run after each game:

```powershell
npm.cmd test -- src/games/signal-noise
npm.cmd test -- src/games/last-train-home
npm.cmd test -- src/games/market-of-mirrors
npm.cmd test -- src/games/rogue-ledger
```

Run the cohort gate:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
node scripts/playtest.mjs --coverage-report
node scripts/playtest.mjs signal-noise --seed=42
node scripts/playtest.mjs last-train-home --seed=42
node scripts/playtest.mjs market-of-mirrors --seed=42
node scripts/playtest.mjs rogue-ledger --seed=42
npm.cmd run pack:smoke
node dist/cli.js --help
```

Also run `git diff --check` and `graphify update .`. If Graphify remains unavailable, record the exact failure as infrastructure debt rather than claiming the graph is current.

## 15. Risk register

| Risk | Mitigation |
|---|---|
| Automated migration is mistaken for production readiness | Keep current readiness until human and terminal evidence passes |
| Signal guidance gives away solutions | Name one mismatched dimension/direction, never hidden target values |
| Train projection drifts from commit | Share resolution ordering and assert equivalence across authored states |
| Market density grows during hardening | Require one visible causal chain and contextual controls at minimum size |
| Ledger correctness is inferred from prose | Assert signed structured arithmetic and exact-once liability settlement |
| Event-driven rendering misses local selection changes | Enumerate controller-owned UI state and test every mutation path |
| Same-seed claims are false | Assert engine state and controller-visible seed after replay |
| Workshop games skip directly to Stable | Separate Preview and Stable evidence thresholds |
| Shared helpers erase game identity | Share lifecycle/test behavior only, never composition or domain vocabulary |

## 16. Definition of done

- [ ] Featured validation overlap is recorded and no unresolved shared blocker is ignored.
- [ ] All four controllers are event-rendered rather than polled.
- [ ] Help, preview, pause, gameplay, and ending input precedence is consistent and tested.
- [ ] Replay, retry, new run, next scenario, and next game have truthful distinct semantics.
- [ ] Market of Mirrors and Rogue Ledger start frames are pure, themed renderer states.
- [ ] All four clean up listeners, timers, cursor, ANSI state, and alternate buffer exactly once.
- [ ] Signal//Noise induction and six-case deterministic transcript pass.
- [ ] Signal//Noise has a versioned autonomous progression profile and five first-time sessions.
- [ ] Last Train Home tutorial, projection equivalence, and both scenario transcripts pass.
- [ ] Last Train Home has a versioned autonomous completion profile and five first-time sessions.
- [ ] Preview-pair repeated confusion is fixed and retested.
- [ ] Market of Mirrors Guided Fair, nine-day run, action matrix, and closing-bell trace pass.
- [ ] Market of Mirrors has a versioned autonomous profile and at least three first-time sessions.
- [ ] Rogue Ledger induction, treatment matrix, four-quarter run, liabilities, and retry contract pass.
- [ ] Rogue Ledger has a versioned autonomous profile and at least three first-time sessions.
- [ ] Workshop-pair repeated confusion is fixed and retested.
- [ ] Carbon, Paper, Contrast, 79x28, 80x28, and 100x30 gates pass.
- [ ] Full tests, typecheck, build, autonomous runs, package smoke, CLI, and diff checks pass.
- [ ] Individual readiness decisions and evidence packets are recorded.
- [ ] No game changes Featured placement as part of this work.
- [ ] The Arcade Archive remains unchanged.
- [ ] Zero critical or high issues remain.
- [ ] Graphify is updated or its unavailable CLI is recorded honestly.

## 17. What follows

After this cohort, do not automatically select another four.

Review:

1. Featured Four human evidence;
2. Stable decisions for Signal//Noise and Last Train Home;
3. Preview decisions for Market of Mirrors and Rogue Ledger;
4. repeated issues across all eight hardened games;
5. autonomous profile reliability and support burden.

If those results are clean, the likely next readiness cohort is Ghost Shift, Dice Tribunal, Time Capsule, and Night Frequency because they complete the evidence-and-documents family. That selection must be confirmed from the new evidence before implementation begins.

The milestone is four games whose existing visual identity survives production scrutiny: the receiver remains a receiver, the railway remains a railway, the market remains an auction, and the ledger remains a set of books.
