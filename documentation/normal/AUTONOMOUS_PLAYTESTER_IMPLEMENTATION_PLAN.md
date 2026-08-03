# Gamr autonomous playtester implementation plan

**Created:** 2026-08-03  
**Scope:** Terminal-level autonomous playtesting for all 20 active games, all 19 Arcade Archive games, and future games added to the catalog  
**Primary outcome:** A repeatable test agent that launches each game through its public terminal interface, plays with human-facing controls, makes meaningful progress, proves completion where the game has an ending, and produces actionable failure evidence

## 1. Outcome and release gate

The playtester is complete when it can do more than prove that a game rendered or reacted to a key. It must demonstrate that the playable product works through the same path available to a person.

For every registered game, the system must be able to:

1. launch the game through its public runner;
2. observe the rendered terminal rather than call gameplay commands directly;
3. start a normal session using documented keys;
4. perform meaningful gameplay actions;
5. reach game-specific progress milestones;
6. exercise pause, help, restart, loss, completion, and exit paths where applicable;
7. detect crashes, hangs, stalls, broken controls, terminal corruption, and leaked resources;
8. replay a failed run from its seed and input trace;
9. emit a concise report that identifies the last successful milestone and likely failure boundary.

The project-wide release gate is:

- all 39 current games pass launch and lifecycle coverage;
- all 20 active games pass meaningful-progression coverage;
- every Featured and Beta game passes deterministic seeded completion coverage;
- all 19 archived games pass a family-appropriate score, level, survival, or ending target;
- new catalog entries cannot merge without an explicit playtest profile;
- failures preserve enough evidence to reproduce the run locally.

## 2. Scope boundaries

### In scope

- Harden the existing virtual terminal, screen observer, deterministic runner, profile registry, and replay data.
- Add terminal-only player strategies for turn-based, real-time, text-entry, spatial, memory, and action games.
- Add optional test-only oracles for selecting strong moves while still executing those moves as keyboard input.
- Define game-specific progress, completion, failure, and lifecycle milestones.
- Run multiple deterministic seeds and terminal sizes.
- Add true subprocess/PTY smoke coverage for the packaged CLI.
- Produce human-readable and machine-readable artifacts.
- Add fast pull-request, complete main-branch, and nightly soak suites.
- Make future-game coverage mandatory and discoverable.

### Out of scope

- Replacing engine unit tests or renderer tests.
- Calling `applyCommand`, engine mutation functions, or private controller methods as the playthrough itself.
- Rebalancing games merely to make bots win.
- Treating random key fuzzing as meaningful play.
- Using an LLM as the required CI policy.
- Requiring endless arcade games to reach an artificial final ending.
- Testing graphical terminal emulators, fonts, or operating-system-specific rendering beyond a small PTY compatibility smoke suite.

## 3. Non-negotiable testing principles

### 3.1 Human-path execution

Every gameplay action must enter through `onKey`, `onData`, or the same global keyboard events used by a manual player. An oracle may decide that the correct semantic move is `choose dispatch`, but the runner must execute the mapped key such as `1` or `d`.

### 3.2 Separate usability from mechanical solvability

Each deep profile has two lanes:

| Lane | Information available to the policy | What it proves |
|---|---|---|
| Black-box | Normalized screen, screen changes, elapsed time, prior inputs, documented controls | The terminal UI communicates enough for a player-like agent to act and progress |
| Oracle-assisted | Black-box observation plus a test-only solver, mirrored deterministic model, or known seeded strategy | The complete input, rendering, state-transition, and ending path works |

Reports must name the lane. An oracle-assisted pass must never be presented as proof that a first-time player could understand the game.

### 3.3 Progress is mandatory

A run does not pass merely because it stayed alive. Every profile declares required observable milestones. At least one milestone must represent gameplay progress after the initial screen.

### 3.4 Deterministic evidence

Every failing seeded run must record:

- game ID;
- playtest profile version;
- seed;
- viewport and runtime mode;
- action sequence with hold and wait durations;
- milestone history;
- last stable frames and screen diffs;
- terminal lifecycle events;
- status and failure reason.

### 3.5 No silent generic coverage

Generic exploration is useful for unknown future games, but it is not deep coverage. Reports and CI must distinguish:

- `generic-smoke`;
- `black-box-progress`;
- `oracle-progress`;
- `seeded-completion`;
- `resilience`;
- `soak`.

## 4. Current implementation baseline

The repository already contains the first foundation in `src/playtest`:

| Area | Current state | Gap to close |
|---|---|---|
| Virtual screen | Tracks a terminal grid, cursor movement, erasing, alternate buffer, and normalized text | Needs broader ANSI coverage, cell-width correctness, scroll behavior, frame diffs, and resize-state validation |
| Virtual terminal | Supports `write`, `onKey`, `onData`, `onResize`, keydown/keyup, resize, and global window listeners | Needs listener ownership, held-key scheduling, input batching, lifecycle telemetry, and strict writes-after-stop detection |
| Determinism | Can seed `Math.random` and provide a seeded monotonic `Date.now` | Timers remain real; full virtual-time control and runtime isolation are still required |
| Runner | Executes actions, records observations, evaluates milestones, detects stalls/timeouts/crashes, and emits replay JSON | Needs multi-lane execution, stable-frame waiting, recovery actions, richer failures, artifact persistence, and batch orchestration |
| Registry | Generates generic profiles for all 39 games | Generic profiles prove only rendering and response; every game still needs an explicit reviewed profile |
| Deep profile | Dead Letter Department reaches the desk and an audit | It does not yet prove a complete shift, campaign transition, loss/restart, or ending |
| CLI | Runs one game or the full catalog and supports a seed and JSON output | Needs suite selection, filters, concurrency control, artifact paths, exit summaries, and replay execution |
| Automated tests | Cover the screen, input delivery, registry completeness, determinism, and one real terminal progression path | Needs representative family tests, failure-mode tests, PTY tests, and full catalog suites |

This baseline must be preserved while the deeper system is introduced. Existing generic coverage should remain the fallback for incomplete profiles, but CI should mark such games as incomplete rather than fully passed.

## 5. Target architecture

```text
Catalog + explicit PlaytestSpec registry
                  |
                  v
             Suite scheduler
                  |
        +---------+----------+
        |                    |
        v                    v
 In-process harness      Packaged CLI PTY
        |
        v
 Virtual terminal + deterministic runtime
        |
        v
 Screen observer -> recognizer -> player policy -> key action
        ^                                      |
        |                                      v
        +----------- progress judge <---------+
                            |
                            v
                  report + replay artifacts
```

### 5.1 Suite scheduler

The scheduler owns batch-level concerns:

- select games by ID, maturity, pace, family, or support tier;
- select lanes and suite depth;
- expand seed and viewport matrices;
- run sequentially by default while global runtime interception exists;
- enforce per-run and per-suite budgets;
- aggregate status without losing individual reports;
- retry only explicitly classified flaky infrastructure failures;
- return a non-zero exit code for required failures or incomplete coverage.

### 5.2 Deterministic runtime

Introduce a playtest runtime boundary that controls:

- `now()`;
- seeded random values;
- timeout scheduling;
- interval scheduling;
- animation frames;
- key hold and release timing;
- explicit advancement to the next simulation/render boundary.

The preferred end state is optional dependency injection through game runners while retaining compatibility with `run(terminal)`. Until games migrate, the harness may intercept globals inside a strictly isolated run.

Acceptance requirements:

- the same game, seed, viewport, policy, and action budget produce the same meaningful frames and milestones;
- real-time games can execute minutes of simulation in seconds;
- scheduled callbacks cannot survive runner cleanup;
- time never moves backward;
- the runner can advance one tick, advance until stable, or advance until a predicate matches.

### 5.3 Virtual terminal

Harden the terminal implementation to support:

- cursor position and save/restore;
- alternate screen buffer;
- clear and erase modes;
- scrolling regions and line insertion/deletion used by the catalog;
- ANSI SGR stripping without consuming visible text;
- Unicode cell width, combining characters, and safe clipping;
- synchronized-output sequences;
- resize while retaining or deliberately resetting the screen according to xterm behavior;
- writes, keys, data, resize events, lifecycle events, and disposals as a timestamped transcript.

Add strict diagnostics for:

- write after controller stop;
- duplicate terminal restoration;
- cursor left hidden;
- alternate buffer left active;
- listener added but not removed;
- timer or interval still active after stop;
- repeated frame writes with no visible state change beyond a configured budget.

### 5.4 Screen observer and recognizers

The observer should expose both raw and semantic information:

- full normalized screen;
- stable trimmed lines;
- previous-frame diff;
- changed regions;
- extracted numbers and meters;
- selected menu item;
- likely phase labels;
- footer controls;
- visible warnings, results, and endings;
- time since the last meaningful screen change.

Recognizers must be composable. The shared library should provide helpers for:

- case-insensitive text presence and absence;
- regular-expression extraction;
- numeric increase/decrease;
- repeated label/value tables;
- menu selection changes;
- board/grid extraction;
- frame stability;
- any/all milestone groups;
- milestones that must occur in order.

Full-screen snapshots may support diagnostics, but required milestones should use stable semantic cues rather than fragile exact frames.

### 5.5 Player policy contract

Replace a single callback with a stateful policy interface:

```ts
interface PlayerPolicy {
  reset(context: RunContext): void;
  observe(observation: PlaytestObservation): void;
  nextAction(): PlaytestAction | PlaytestDecision;
  recover(reason: StallReason): PlaytestAction | undefined;
  summarize(): PolicySummary;
}
```

`PlaytestDecision` should record:

- current recognized phase;
- active objective;
- chosen semantic action;
- mapped keyboard action;
- concise reason;
- confidence;
- expected visible result.

Policies must not need to parse ANSI themselves.

### 5.6 Progress judge

The judge owns ordered milestones, invariants, and terminal conditions.

Required status values:

- `passed`;
- `failed`;
- `stalled`;
- `timed-out`;
- `crashed`;
- `cleanup-failed`;
- `nondeterministic`;
- `unsupported`;
- `incomplete-profile`.

Every failure should identify:

- the expected milestone or invariant;
- the last achieved milestone;
- the action that preceded failure;
- whether the screen changed;
- whether the controller remained running;
- the recommended replay command.

### 5.7 Artifact writer and replay runner

Persist failures under a gitignored artifact directory using one folder per run:

```text
playtest-artifacts/
  <game-id>/<timestamp>-<seed>/
    report.json
    replay.json
    transcript.txt
    last-screen.txt
    frames/
```

Add a replay mode that consumes `replay.json`, executes the exact actions and virtual timing, and verifies the failure or milestone sequence. Replay divergence should become a `nondeterministic` failure.

## 6. Playtest profile contract

Every catalog game must have an explicit profile. Generated defaults may be used only while a profile is under construction.

The expanded profile should describe:

- stable profile version;
- game family and pace;
- declared terminal sizes;
- supported lanes;
- deterministic seeds;
- initial/start actions;
- documented controls;
- recognizers;
- ordered progress milestones;
- completion targets;
- loss and recovery targets;
- invariants;
- action, time, frame, and stall budgets;
- black-box policy;
- optional oracle policy;
- expected cleanup behavior.

Recommended structure:

```ts
interface PlaytestSpec {
  version: number;
  gameId: string;
  family: GameFamily;
  viewports: ViewportCase[];
  lanes: PlaytestLane[];
  seeds: number[];
  controls: ControlContract[];
  milestones: OrderedMilestone[];
  invariants: PlaytestInvariant[];
  completion: CompletionTarget;
  recovery: RecoveryTarget[];
  budgets: RunBudgets;
  createPolicy(lane: PlaytestLane): PlayerPolicy;
}
```

Registry enforcement must fail when:

- a game is missing a profile;
- a profile ID does not match a catalog ID;
- a catalog game is classified only as `unknown`;
- a required lane has no policy;
- a profile has no gameplay milestone after startup;
- milestone IDs are duplicated;
- a declared control has no input-path test;
- a profile references an unknown seed, lane, or viewport configuration.

## 7. Definition of meaningful progress by game family

### Turn-based puzzle and management games

Required minimum:

- leave the title/briefing;
- make one legal decision;
- receive and acknowledge its result;
- complete one full turn, case, round, day, shift, or scenario;
- reach an intermission, upgrade, report, ending, or game-over state;
- prove restart or continuation.

### Real-time games

Required minimum:

- start active simulation;
- prove held and tapped input affect the game;
- survive a minimum virtual duration;
- increase score, clear an objective, or complete a wave/level;
- reach loss or success naturally;
- prove pause freezes simulation and resume continues it;
- restart and cleanly stop all timers.

### Text-entry and word games

Required minimum:

- enter text through `onKey`/`onData`;
- edit with Backspace where supported;
- submit an invalid attempt and observe rejection;
- submit a valid attempt and observe progress;
- reach win or loss;
- restart or quit cleanly.

### Memory and reaction games

Required minimum:

- observe a generated sequence or cue;
- reproduce at least one correct sequence;
- advance a round;
- trigger and detect an incorrect response;
- reach a score/loss boundary and restart.

### Endless arcade games

Completion is a target rather than an ending. Each profile must define at least two of:

- minimum score;
- minimum survival time;
- items collected;
- enemies destroyed;
- rows/waves/levels cleared;
- passengers or objectives completed;
- controlled loss followed by restart.

## 8. Implementation workstreams

### Workstream A: Harness hardening

1. Add ANSI conformance fixtures from actual game frames.
2. Add Unicode cell-width and clipping support.
3. Add screen diffs and stable-frame waiting.
4. Add deterministic timer and interval scheduling.
5. Add listener/timer ownership tracking.
6. Add writes-after-stop and terminal-restoration assertions.
7. Add resize preservation and below-minimum behavior tests.
8. Add replay execution and divergence detection.

**Exit gate:** Representative legacy and active games produce stable, deterministic observations without resource leakage.

### Workstream B: Player agent framework

1. Replace callback policies with stateful policies.
2. Add reusable start-screen, help, pause, result, upgrade, ending, and game-over recognizers.
3. Add turn-based wait-for-feedback behavior.
4. Add real-time tap/hold/release actions.
5. Add text-entry actions that type strings as individual user events.
6. Add bounded recovery behavior for unrecognized overlays and stalls.
7. Record semantic decisions and expected results.
8. Ensure policies stop immediately after required completion rather than accumulating false stalls.

**Exit gate:** One policy from each game family can start, progress, recover once, and terminate with a reasoned report.

### Workstream C: Oracle adapters

For newer engine-based games, create test-only adapters that:

- mirror or derive the visible state from a known seed;
- select a legal or optimal semantic command;
- map that command to the public key sequence;
- verify that the resulting visible frame matches the expected state transition;
- never mutate the live game directly.

For legacy games without pure engines, use one of:

- screen-derived reactive control;
- deterministic scripted trajectories;
- small test-only board parsers;
- seed-specific action tables generated offline and replayed through keys.

**Exit gate:** At least one complete seeded run succeeds for a turn-based engine game and one meaningful target succeeds for a legacy real-time game.

### Workstream D: Profile authoring

Each game profile is delivered with:

- a control inventory;
- a phase/state diagram;
- black-box milestones;
- oracle milestones where applicable;
- at least three deterministic seeds for active games;
- minimum and standard viewport cases;
- one loss/recovery path;
- documented completion criteria;
- direct tests for its recognizers and policy decisions.

### Workstream E: CLI and reporting

Add CLI options for:

- one or more game IDs;
- `--active`, `--archive`, maturity, pace, and family filters;
- `--lane` and `--suite` selection;
- one seed or a seed set;
- viewport selection;
- replay input;
- JSON, concise console, and artifact-directory output;
- fail-fast versus complete-batch execution.

The console summary should show game, lane, seed, status, achieved/required milestones, actions, virtual duration, wall duration, and replay location.

### Workstream F: PTY validation

Add a small packaged-CLI suite that:

- starts `dist/cli.js` in a pseudo-terminal;
- confirms raw input reaches a selected game;
- starts gameplay;
- observes real ANSI output;
- sends pause/quit;
- confirms the process exits and restores terminal state;
- covers Windows and at least one Unix CI environment where practical.

PTY coverage validates packaging and adapters. It must remain small; full gameplay stays in the fast in-process harness.

## 9. Ordered vertical slice

Do not author 39 bespoke profiles before the harness is proven across the major interaction families. Complete this vertical slice first:

| Game | Family proved | Required target |
|---|---|---|
| Dead Letter Department | Turn-based classification | Complete one shift, enter the report/perk flow, deliberately lose a separate run, restart |
| Stack Trace | Turn-based spatial/editor puzzle | Repair and complete one seeded level, advance to the next level |
| Packet Panic | Active real-time management | Build a valid route, deliver traffic or reach the first objective, pause/resume, survive a fixed virtual period |
| Wordle | Text-entry game | Submit invalid and valid guesses, then reach a deterministic win or loss |
| Snake | Legacy reactive arcade | Start, steer through several turns, eat food or reach a score target, lose controllably, restart |

The vertical slice passes only when:

- each game uses the same runner and report model;
- all five runs are deterministic for their declared seeds;
- black-box and oracle-assisted results are labeled separately;
- failures create replayable artifacts;
- no game leaves listeners, timers, the alternate buffer, or the hidden cursor active.

## 10. Active-game rollout

### Stage 1: Featured games

1. Dead Letter Department
2. Stack Trace
3. Packet Panic
4. Five-Minute Kingdom

Required coverage:

- black-box progression;
- seeded completion of at least one full unit;
- loss and restart;
- help, pause, and quit;
- minimum and standard viewports;
- three deterministic seeds;
- resilience suite.

### Stage 2: Beta games

1. Signal//Noise
2. Last Train Home

Required coverage matches Featured games. Campaign completion may be split into a fast one-scenario gate and a nightly full-campaign gate.

### Stage 3: Workshop turn-based games

1. Market of Mirrors
2. Rogue Ledger
3. Containment Protocol
4. Ghost Shift
5. The Quiet Heist
6. Orbital Post
7. Dice Tribunal
8. Time Capsule
9. Tiny Fleet
10. Dungeon Courier
11. Night Frequency
12. Botany Lab
13. The 13th Lift

Required coverage:

- black-box tutorial or first-unit progression;
- oracle-assisted seeded scenario completion;
- one loss/recovery path;
- lifecycle and viewport coverage.

### Stage 4: Workshop real-time game

1. Blackout Grid

Required coverage follows the Packet Panic real-time contract and includes deterministic simulation advancement, pause freezing, timed survival, an upgrade boundary, and cleanup.

## 11. Arcade Archive rollout

Group archived games by reusable policy family:

| Family | Games | Shared strategy target |
|---|---|---|
| Falling/sliding board | Tetris, 2048 | Parse board, choose safe moves, increase score, clear/merge target, force loss/restart |
| Grid navigation | Snake, Frogger, Tron | Parse player/hazard positions, steer reactively, reach score/crossing/survival target |
| Paddle and projectile | Pong, Breakout | Track ball trajectory, move paddle, score or clear bricks, reach loss/restart |
| Shooter/action | Space Invaders, Asteroids, Chopper, Runner | Reactive movement/fire/jump policy, score/objective target, controlled loss |
| Word/text | Wordle, Hangman, Typing Test, Crack | Type through public input, prove validation, complete or reach deterministic result |
| Memory/timing | Simon, Tower | Read cues/timing windows, complete rounds or placements, detect failure |
| Tactical hybrid | Hyper Fighter | Select character/mode, execute legal combat actions, complete a match boundary |
| Board deduction | Minesweeper | Parse grid, reveal/flag through cursor controls, complete a seeded small board or prove safe progress |

Implement and validate one shared family policy before applying it to the remaining games in that family. A per-game wrapper should contain mappings and milestones, not duplicate the whole policy.

## 12. Resilience and adversarial suite

Every explicit profile must eventually cover:

- invalid keys at the title and during play;
- repeated Enter/Space;
- rapid directional input;
- overlapping or held keys for real-time games;
- pause during active simulation;
- help opened from each supported phase;
- restart during or after a result;
- stop immediately after launch and after full initialization;
- minimum supported viewport;
- resize smaller, restore size, and continue;
- sequential launch of multiple games in one terminal;
- repeated runs of the same game;
- alternate-buffer and cursor restoration;
- no terminal writes or timers after stop.

Adversarial tests must run only after the normal progression target passes. Otherwise, the report cannot distinguish a broken game from intentionally destructive input.

## 13. CI design

### Pull-request suite

Target wall time: under two minutes.

- registry/profile validation;
- virtual terminal unit tests;
- one fast seed for every active game at launch/interaction depth;
- deep progression for Featured games changed by the pull request;
- profile-specific tests for changed games;
- packaged playtest export smoke test.

### Main-branch suite

- all pull-request coverage;
- one seeded deep run for every active game;
- vertical-slice PTY smoke;
- replay determinism check on representative games;
- lifecycle and cleanup assertions.

### Nightly suite

- all 39 games;
- all required lanes;
- full seed and viewport matrices;
- long real-time virtual-duration runs;
- campaign completion where declared;
- resilience and fuzz policies;
- repeated-run leak detection;
- artifact retention for failures.

### Release suite

- nightly suite passes twice from clean builds;
- package smoke passes;
- PTY smoke passes on supported CI operating systems;
- zero incomplete active-game profiles;
- no nondeterministic replay failures;
- coverage summary is attached to the release candidate.

## 14. Acceptance criteria per profile

A game profile is complete only when all are true:

- it is explicit rather than generated from the generic fallback;
- controls match the actual controller behavior;
- startup, gameplay, result, recovery, and exit phases are recognized;
- at least one black-box gameplay milestone occurs after startup;
- the declared completion target is reached for required seeds;
- loss and restart are proven;
- help/pause/quit behavior is proven where supported;
- the policy terminates intentionally after success;
- the run remains within declared budgets;
- deterministic replay reproduces the milestone sequence;
- cleanup assertions pass;
- tests cover recognizers, strategy decisions, and at least one integrated playthrough.

## 15. Implementation phases and gates

### Phase 1: Harden the foundation

- Complete Workstreams A, B, and artifact/replay basics.
- Preserve the current Dead Letter Department integration test.
- Add failure-path unit tests for stall, timeout, crash, cleanup, and replay divergence.

**Gate:** The runner is deterministic, leak-aware, replayable, and produces stable observations.

### Phase 2: Complete the vertical slice

- Deliver the five profiles in Section 9.
- Add black-box and oracle-assisted lanes.
- Add family-level policy helpers only when two games need them.

**Gate:** All major interaction families are proven through terminal input.

### Phase 3: Featured and Beta coverage

- Complete all four Featured profiles.
- Complete both Beta profiles.
- Add fast and full campaign targets.

**Gate:** Six public-priority games pass seeded completion and resilience coverage.

### Phase 4: Remaining active games

- Author the fourteen Workshop profiles in the order in Section 10.
- Reuse engine solvers and shared recognizers where appropriate.

**Gate:** All 20 active games pass meaningful progression; no active game relies on the generic fallback.

### Phase 5: Arcade Archive families

- Implement one reusable policy family at a time.
- Add all 19 archived wrappers and targets.

**Gate:** Every archived game reaches a score, level, survival, round, or ending target and proves restart/cleanup.

### Phase 6: CI, PTY, and release enforcement

- Enable suite tiers.
- Add PTY smoke coverage.
- Enforce explicit profiles for new games.
- Publish coverage summaries and failure artifacts.

**Gate:** The release suite passes twice from clean builds and future games cannot bypass playtest registration.

## 16. Recommended file organization

```text
src/playtest/
  core/
    runner.ts
    scheduler.ts
    determinism.ts
    replay.ts
    artifacts.ts
  terminal/
    terminal.ts
    screen.ts
    ansi.ts
    cell-width.ts
  observe/
    observation.ts
    diff.ts
    recognizers.ts
  policies/
    generic.ts
    turn-based.ts
    realtime.ts
    text-entry.ts
    grid-navigation.ts
    projectile.ts
  specs/
    active/
    archive/
    registry.ts
  oracles/
    <game-id>.ts
  reporting/
    console.ts
    json.ts
  tests/
    fixtures/
    harness.test.ts
    replay.test.ts
    lifecycle.test.ts
    progression.test.ts
scripts/
  playtest.mjs
playtest-artifacts/       # gitignored
```

Refactor toward this layout only as files gain real responsibility. Do not perform a directory-only rewrite before Phase 1 behavior is covered by tests.

## 17. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Screen text changes break recognizers | False failures after harmless UI edits | Prefer semantic labels, tolerant extraction, ordered milestones, and focused recognizer tests |
| Global time/random interception leaks between tests | Nondeterminism and unrelated failures | Sequential isolation first; migrate games toward optional runtime injection |
| Oracle policy hides unusable UI | Mechanical pass mistaken for usability | Always report lane; require black-box progression separately for active games |
| Real-time tests become slow | CI becomes unusable | Virtual clock, simulation-boundary advancement, short PR targets, nightly soak |
| One strategy becomes game-specific framework code | High maintenance | Keep mappings/profile data per game and share only proven family behavior |
| Bot cannot guarantee an endless game's final victory | Impossible release gate | Use explicit score, survival, level, or objective targets |
| Legacy games leak global listeners/timers | Cross-run contamination | Strict ownership tracking, sequential runs, repeated-run lifecycle tests |
| Full frame snapshots become brittle | Noisy test maintenance | Use semantic milestones for gates and frames only for artifacts/diagnostics |
| Generic profiles are mistaken for full coverage | False confidence | Add `incomplete-profile` status and enforce explicit profiles in CI |

## 18. Completion checklist

- [ ] Deterministic virtual clock controls timers and intervals.
- [ ] Virtual terminal covers ANSI and Unicode behavior used by all catalog games.
- [ ] Screen diffs and stable-frame waiting are implemented.
- [ ] Stateful policy and semantic decision contracts are implemented.
- [ ] Replay execution reproduces seeded runs.
- [ ] Failure artifacts are persisted.
- [ ] Listener, timer, alternate-buffer, cursor, and write-after-stop checks exist.
- [ ] Dead Letter Department completes a full shift and recovery path.
- [ ] Stack Trace completes a seeded level.
- [ ] Packet Panic reaches a real gameplay objective under virtual time.
- [ ] Wordle reaches a deterministic ending through typed input.
- [ ] Snake reaches an arcade target and restarts.
- [ ] All four Featured profiles are explicit and complete.
- [ ] Both Beta profiles are explicit and complete.
- [ ] All 20 active games pass meaningful progression.
- [ ] All 19 archived games pass family-appropriate targets.
- [ ] Pull-request, main, nightly, and release suites are enabled.
- [ ] Packaged CLI PTY smoke passes.
- [ ] New catalog games require explicit profiles.
- [ ] Release coverage report shows no incomplete active-game profiles.

## 19. Final definition of done

The autonomous playtester is done when it behaves like a disciplined manual tester at terminal scale: it sees the game, acts through the controls, explains what it is trying to accomplish, proves that play advances, reaches declared endings or arcade targets, recovers from failure, detects broken lifecycle behavior, and leaves behind a deterministic replay whenever something goes wrong.

At that point, adding a future game requires a profile and strategy appropriate to its family, not a new testing architecture.
