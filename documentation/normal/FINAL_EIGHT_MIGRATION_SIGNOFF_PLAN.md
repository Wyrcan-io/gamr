# Gamr final eight migration sign-off plan

**Created:** 2026-08-11  
**Scope:** Blackout Grid, Containment Protocol, Orbital Post, Botany Lab, The Quiet Heist, Tiny Fleet, Dungeon Courier, and The 13th Lift  
**Starting ledger:** 12 of 20 active games have formal migration sign-off  
**Target ledger:** 20 of 20 active games have formal migration sign-off  
**Catalog decision:** The 19-game compatibility archive is retired and removed; it is not a ninth workstream and does not count toward migration  
**Promotion rule:** Migration sign-off does not automatically change a game's Workshop/Preview/Stable readiness label

## 1. Outcome

This is the final evidence plan for the eight active games whose implementation passes exist but whose migration gates remain open. The work is finished only when each game has:

1. a complete deterministic player journey rather than a launch/progress smoke test;
2. renderer, controller, resize, overlay, pause, restart, and cleanup coverage;
3. an 80x28 compact layout that remains readable in Carbon, Paper, Contrast, Unicode, and ASCII conditions;
4. preview/review output that agrees with the authoritative resolver;
5. three first-time-player sessions with explanation tasks;
6. repeated confusion fixed and retested with a new participant;
7. recorded evidence sufficient to change the formal ledger entry from `implemented` to `migrated`.

The 20/20 claim is made only after all eight rows pass. A green build alone is not migration sign-off.

### 1.1 Source-verified starting evidence

| Game | Implementation state | Current autonomous coverage | Sign-off gap |
|---|---|---|---|
| Blackout Grid | First Batch B packet complete | `generic-smoke` v0 | Complete tutorial, controller/lifecycle, layout, human sessions |
| Containment Protocol | First Batch B packet complete | `generic-smoke` v0 | Truthful mechanics, commit parity, overlays, lifecycle, human sessions |
| Orbital Post | First Batch B packet complete | `generic-smoke` v0 | Report/layout matrix, glyph/controller lifecycle, human sessions |
| Botany Lab | First Batch B packet complete | `generic-smoke` v0 | Greenhouse composition, tutorial loop, lifecycle, human sessions |
| The Quiet Heist | First Batch C automated pass complete | `black-box-progress` v1 | Successful complete job, coverage matrix, human sessions |
| Tiny Fleet | First Batch C automated pass complete | `black-box-progress` v1 | Successful training battle, hidden-state audit, human sessions |
| Dungeon Courier | First Batch C automated pass complete | `black-box-progress` v1 | Successful delivery, parcel/action matrix, human sessions |
| The 13th Lift | First Batch C automated pass complete | `black-box-progress` v1 | Successful taught ride, compact/controller matrix, human sessions |

Baseline after archive retirement: exactly 20 catalog entries, 56 test files and 223 tests passing, typecheck passing, production build passing, CLI help/list passing, and package smoke passing. The coverage report currently contains 8 generic, 6 progress, and 6 completion profiles across the whole active catalog; coverage maturity and migration sign-off remain separate ledgers until this plan closes them for the final eight.

## 2. Archive retirement boundary

The former Tetris, Snake, 2048, Runner, Pong, Wordle, Minesweeper, Hangman, Space Invaders, Tower, Simon, Frogger, Breakout, Asteroids, Typing Test, Tron, Crack, Chopper, and Hyper Fighter implementations are deleted from the shipped source tree.

Required release consequences:

- `games`, `allGames`, the CLI, menu, README, playtest registry, package exports, and package metadata expose only the 20 active games;
- `archiveGames`, `archivedGames`, `gamr --archive`, the Archive menu route, and the 19 direct runner exports no longer exist;
- direct commands such as `gamr snake` fail through the ordinary unknown-game path;
- the release notes identify this as an intentional breaking removal for integrations importing legacy runners;
- no replacement clones are added during this sign-off program.

Archive removal simplifies the support surface; it does not provide evidence for any of the eight migration decisions.

## 3. Fixed execution order

| Order | Game | Gate-closing reason |
|---:|---|---|
| 1 | Blackout Grid | Establish deterministic real-time timing, pause, and cleanup evidence first. |
| 2 | Containment Protocol | Close the deepest preview/commit and inactive-system truthfulness risks. |
| 3 | Orbital Post | Prove scheduling preview, ghost reservations, and report semantics. |
| 4 | Botany Lab | Finish the systems cohort with a dense but calm forecast surface. |
| 5 | The Quiet Heist | Prove a complete authored job through plan, review, result, and escape. |
| 6 | Tiny Fleet | Prove hidden-information boundaries and deterministic public replay. |
| 7 | Dungeon Courier | Prove causal route advice across parcel families and threats. |
| 8 | The 13th Lift | Close compact-layout, evidence provenance, transit, and full-story gates. |
| 9 | Final catalog review | Re-run all 20 active games and publish the evidence-backed ledger. |

Do not run all human sessions at the end. Finish the automated gate and three player sessions for one game, fix repeated confusion, then advance. After every pair, rerun all previously signed-off games in the final-eight cohort.

## 4. Shared automated gate

Every game must add or complete the following evidence:

| Surface | Required evidence |
|---|---|
| Engine | Seeded command transcript; invariants; retry preserves seed; explicit new-seed action where supported. |
| Preview/review | Pure projection and authoritative resolution agree for every advertised action family. |
| Renderer | Assertions for title, main loop, review/forecast, result/report, failure, success, help, and pause. |
| Controller | Fake-terminal tests for every documented key, top-layer Escape, Enter/Space semantics, restart, game switch, quit, and listener disposal. |
| Layout | 80x24 where supported, 80x28, and 100x30; no silent clipping of required facts; cell-width helpers used for borders and alignment. |
| Themes | Carbon, Paper, and Contrast screenshots/assertions; state remains distinguishable after ANSI stripping. |
| Glyphs | Unicode and ASCII modes expose equivalent mechanical states. |
| Lifecycle | Fake timers prove pause freezes progression, stop clears timers/listeners, and no game resolves twice. |
| Playtest | Upgrade the profile to `seeded-completion`; reach a successful tutorial/first unit and a durable explanation screen. |
| Regression | Full test suite, typecheck, build, CLI help/list, package smoke, and diff check pass. |

The seeded-completion profile must fail if it only reaches planning, opens a review, or observes a loss. Its terminal milestone must prove completion of the game's taught unit.

## 5. Game plan 1 — Blackout Grid

### Remaining product risks

- focus charge/timing and real-time progression need complete engine-owned evidence;
- tutorial progression is not yet a complete visible restoration lesson;
- the one-line diagram still needs full state legibility without color;
- controller timers, pause, resize, stop, and restart lack sufficient coverage.

### Implementation and evidence work

1. Move every remaining clock-sensitive mutation behind engine commands and injected/fake time.
2. Render fault, energized, isolated, overloaded, pickup, repair, source, and storm-target states with shape/text markers.
3. Make the tutorial teach inspect -> isolate -> repair -> re-energize and finish on a durable restoration report.
4. Add controller tests proving pause freezes beats, focus expires once, stop clears timers, and restart replays the same storm schedule.
5. Add a seeded-completion profile that restores the tutorial district and reaches the report.

### Human explanation task

The player must identify the faulted path, explain why a breaker action is safe or unsafe, and describe what changed after restoration.

## 6. Game plan 2 — Containment Protocol

### Remaining product risks

- unused faults, observations, phases, or upgrades can advertise mechanics that do not exist;
- technician/probe behavior must obey the same configure -> forecast -> commit contract;
- overlay and Escape precedence need controller evidence;
- projection must never mutate current or pending state.

### Implementation and evidence work

1. Either implement every player-facing fault/upgrade promise or remove it from state, content, help, and rendering.
2. Use one pure resolver for forecast and commit; assert deep immutability and parity across room actions, technicians, and probes.
3. Finish help, dossier, log, review, report, and pause as explicit top-layer states.
4. Add complete first-shift, resize, overlay, restart, and lifecycle controller tests.
5. Add a seeded-completion profile that safely resolves the tutorial anomaly and reaches its cycle report.

### Human explanation task

The player must state the current room danger, the pending intervention, its projected consequence, and why the committed result matched or differed from the forecast.

## 7. Game plan 3 — Orbital Post

### Remaining product risks

- candidate, scheduled, active, blocked, missed, and completed jobs must be visually distinct;
- compact reports must preserve every decisive reason;
- ASCII selection and controller lifecycle remain under-tested;
- Enter must never ambiguously mean both schedule and resolve.

### Implementation and evidence work

1. Finish the orbit-window strip and ghost reservation language, including exact conflict cells and weather/power uncertainty.
2. Replace multiline notice flattening with structured per-job resolution rows and a durable detail log.
3. Make arm/review/resolve a phase-explicit controller path with contextual footer labels.
4. Add Unicode/ASCII, compact/wide, overlay, restart, and cleanup tests.
5. Add a seeded-completion profile that schedules and completes the tutorial relay job, then reads its report.

### Human explanation task

The player must explain why the selected placement is legal, what could still block it, and which report row proves the outcome.

## 8. Game plan 4 — Botany Lab

### Remaining product risks

- the interface still needs its greenhouse-bench identity rather than generic cards;
- tutorial progress and the complete seed/grow/deliver loop need visible evidence;
- each chamber needs before/after growth and facility consequences;
- overlays, lifecycle, and ASCII silhouettes remain incomplete.

### Implementation and evidence work

1. Compose the greenhouse bench, chamber tracks, plant silhouettes, shared facility tracks, and contract clipboard at 80x28.
2. Render per-chamber current -> projected growth, expression, mutation, pressure, filter, reagent, and contract effects.
3. Bind tutorial text to observed seed, grow, inspect, and deliver events.
4. Add all-action preview/commit parity, controller, theme, ASCII, resize, restart, and lifecycle tests.
5. Add a seeded-completion profile that grows and delivers the training contract.

### Human explanation task

The player must identify which chamber satisfies the contract, what the next cycle changes, and which shared facility limit matters.

## 9. Batch B checkpoint

After the first four games pass individually:

- run their seeded completion profiles together for at least five fixed seeds each;
- run the full 20-game launch/lifecycle suite;
- compare terminology for current, selected, projected, committed, and reported state;
- fix repeated cross-game ambiguity before beginning Batch C human sign-off;
- update the ledger to 16/20 only when all four evidence packets are attached.

## 10. Game plan 5 — The Quiet Heist

### Remaining product risks

- authored job coordinates must remain the single source of truth;
- the new turn review/report path needs complete-job evidence;
- tutorial milestones do not yet prove a successful theft and escape;
- renderer/controller/theme/lifecycle coverage is incomplete.

### Implementation and evidence work

1. Remove decorative or hard-coded map marks that can disagree with authored job locations.
2. Test Arrow/WASD parity, undo, review cancel, commit once, report acknowledgement, retry, next job, help, pause, and cleanup.
3. Assert NOW, PLAN, FORECAST, and AFTER COMMIT remain distinct after stripping color.
4. Add compact/wide and Carbon/Paper/Contrast renderer fixtures for every job phase.
5. Upgrade the playtest from progress to seeded completion by stealing the tutorial objective and reaching a valid exit.

### Human explanation task

The player must explain the current guard state, the queued actions, what will change after commit, and why the chosen exit remains valid.

## 11. Game plan 6 — Tiny Fleet

### Remaining product risks

- previews and replay must never leak hidden enemy truth;
- exact, estimated, stale, and unknown contacts need stronger non-color distinctions;
- the current progress profile proves one resolution, not a completed training battle;
- renderer/controller/lifecycle coverage is incomplete.

### Implementation and evidence work

1. Serialize every player-facing preview/replay model in tests and assert hidden coordinates, orders, and paths are absent.
2. Make contact certainty, source, and age readable in Unicode, ASCII, and monochrome.
3. Test full order assignment, review cancel/edit, seal once, stepable immutable public replay, report, retry, and cleanup.
4. Add compact/wide and theme fixtures for plotting, review, replay, victory, and defeat.
5. Upgrade the playtest to seeded completion by destroying all tutorial hulks and reaching the durable battle report.

### Human explanation task

The player must distinguish known from estimated contacts, describe the risk in one order, and reconstruct the result using only public replay evidence.

## 12. Game plan 7 — Dungeon Courier

### Remaining product risks

- route summaries must remain computed, honest, and not become an omniscient solver;
- causal action previews need coverage across parcels, seals, tools, threats, and movement modes;
- help/inventory/intent/pause precedence needs controller tests;
- the current progress profile does not complete a delivery.

### Implementation and evidence work

1. Add a preview/commit matrix for normal step, hurry, brace, wait, interact, tool use, and blocked movement.
2. Test route summaries against known map costs while explicitly excluding hidden future state.
3. Replace remaining fixed color/layout assumptions with semantic palette and terminal-cell helpers.
4. Add overlay precedence, resize, theme, ASCII, restart, cleanup, success, and parcel-failure renderer/controller tests.
5. Upgrade the playtest to seeded completion by delivering the tutorial parcel with its condition intact.

### Human explanation task

The player must explain the parcel rule, selected action deltas, route trade-off, and the exact cause of final parcel condition.

## 13. Game plan 8 — The 13th Lift

### Remaining product risks

- 80x24 evidence density and continuation behavior need stronger tests;
- provenance must stay connected to clue speaker and source time;
- transit timing, review cancellation, and cleanup require controller fake-time coverage;
- the current progress profile reaches an audit but not a complete successful taught ride/story unit.

### Implementation and evidence work

1. Test evidence ledger, rider focus, route tape, transit, audit, interlude, finale, help, rules, directory, and log at compact and wide sizes.
2. Assert every decisive clue renders speaker and NOW/PREV provenance without color.
3. Prove route evaluation occurs only after confirm, transit resolves once, pause/stop clears timing, and review can return to editing.
4. Add Unicode/ASCII and Carbon/Paper/Contrast fixtures with visible overflow navigation or continuation markers.
5. Upgrade the playtest to seeded completion by completing the tutorial ride successfully and acknowledging its audit/interlude.

### Human explanation task

The player must connect one rider request to its evidence source, explain the route order, and identify the decisive reason for the audit result.

## 14. First-time-player protocol

Run three independent sessions per game with participants who have not read the implementation plan. Do not coach controls or strategy beyond telling them how to launch the game.

Record for each session:

- terminal, dimensions, theme, ASCII/Unicode mode, seed, and build identifier;
- time to first legal action, first deliberate review/forecast, and taught-unit completion;
- every control guessed incorrectly twice;
- every moment the player confuses current, selected, projected, committed, or hidden state;
- the explanation-task answer in the player's own words;
- severity: blocking, repeated, local, or cosmetic.

Any confusion repeated by two participants blocks sign-off. Fix it, add an automated regression where possible, and test with a new participant rather than the original participant.

## 15. Evidence packet and ledger rules

Each game receives one evidence packet containing:

```text
game-id/
  migration-summary.md
  automated-results.txt
  seeded-completion-replay.json
  screens/
    80x28-carbon.txt
    80x28-paper.txt
    80x28-contrast.txt
    100x30-carbon.txt
    80x28-ascii.txt
  human-sessions/
    session-1.md
    session-2.md
    session-3.md
    retest.md              # required when repeated confusion was found
```

The ledger may change one row to `migrated` only when its packet is complete and has no open blocking or repeated confusion. Readiness promotion is a separate decision with its own evidence.

## 16. Final 20/20 gate

- [ ] The shipped registry contains exactly 20 unique, callable active games.
- [ ] No archived source, runner export, menu route, CLI flag, README promise, or playtest profile remains.
- [ ] All eight games have `seeded-completion` profiles that pass their taught-unit success paths.
- [ ] All eight pass engine, renderer, controller, resize, theme, ASCII, lifecycle, restart, and cleanup gates.
- [ ] All 24 first-time-player sessions are recorded.
- [ ] Every repeated confusion has a fix and a fresh-player retest.
- [ ] Previously signed-off 12 games pass regression playtests and lifecycle smoke tests.
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `node dist/cli.js --help`, `node dist/cli.js --list`, `npm run pack:smoke`, and `git diff --check` pass.
- [ ] Packed package inspection confirms none of the retired archive runners ship.
- [ ] Graphify is updated, or the unavailable executable is explicitly recorded without claiming a current graph.
- [ ] Release notes disclose removal of the 19 compatibility games and their runner exports.
- [ ] The migration ledger records exactly 20/20 active games migrated.
- [ ] Production readiness is assessed separately; 20/20 migration is not represented as automatic 1.0 readiness.

## 17. What happens after 20/20

Freeze visual-system migration work. The next milestone becomes a production-candidate hardening pass across the 20-game catalog: cross-platform terminals, install/update behavior, accessibility, crash recovery, package/API review, documentation, readiness labels, release notes, and support policy. New games or replacement classics wait until that release-candidate gate is complete.

## 18. Implementation update — 2026-08-11

The first implementation pass for the eight-game sign-off cohort is now active:

- Batch B controllers no longer poll turn-based renderers every 50 ms. Blackout Grid retains only its mechanical simulation beat; Containment Protocol, Orbital Post, and Botany Lab render on commands, resize, and lifecycle events.
- Blackout Grid now renders after operator commands and help/pause transitions, disposes resize/listener resources, and keeps same-seed restart behavior explicit.
- Containment Protocol now renders after every command, preserves same-seed restart, and disposes its listener/resize resources without a background render loop.
- Orbital Post now renders after scheduler commands and reports, supports resize-driven redraw, and disposes the controller cleanly.
- Botany Lab now renders after operations, overlay navigation, pause/help changes, resize, and lifecycle cleanup without decorative glitch animation.
- All four Batch B games now have explicit `black-box-progress` profiles covering their briefing, working surface, and first meaningful report/forecast interaction.

This is an implementation checkpoint, not the final 20/20 claim. Batch B profiles still need seeded-completion paths and human sessions; the four Batch C profiles remain black-box progress until their successful taught units and human evidence packets are complete.
