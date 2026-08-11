# Gamr autonomous playtester coverage rollout plan

> **Archive status update — 2026-08-11:** Sections that preserve or test the 19-game Arcade Archive are superseded. Those compatibility games and their public launch/export surfaces have been removed; the supported catalog now contains 20 active games.

**Created:** 2026-08-03  
**Depends on:** `AUTONOMOUS_PLAYTESTER_IMPLEMENTATION_PLAN.md`  
**Scope:** Convert the current vertical slice into explicit, meaningful playtest coverage for every active and archived game  
**Primary milestone:** No active game remains on generic smoke coverage, every archived game reaches a family-appropriate gameplay target, and CI enforces those guarantees

## 1. Current baseline

The playtesting foundation and first vertical slice are implemented.

| Game | Current coverage | Current proof |
|---|---|---|
| Stack Trace | Seeded completion | Starts through terminal input, repairs the first tape, runs the suite, reaches the accepted repair state |
| Dead Letter Department | Black-box progress | Starts a shift, opens the desk, classifies mail, reaches an audit |
| Packet Panic | Black-box progress | Starts active play, opens the operator panel, places a router through terminal input |
| Wordle | Seeded completion | Types and submits guesses through terminal input, reaches a deterministic win/loss ending |
| Snake | Black-box progress | Starts real-time play, steers until game over, observes final score |

The registry discovers all 39 games, but the remaining 34 still use generic smoke coverage. Generic smoke proves rendering and response; it does not prove meaningful gameplay.

## 2. Rollout outcome

This rollout is complete when:

- all four Featured games have explicit profiles;
- both Beta games have explicit profiles;
- all fourteen Workshop games have explicit profiles;
- all nineteen Arcade Archive games have explicit profiles;
- every active profile proves at least one complete gameplay unit;
- every Featured and Beta profile has a seeded-completion lane;
- every archived profile reaches a declared score, level, survival, round, delivery, or ending target;
- a generated coverage report shows no unknown or generic-only active games;
- CI fails when a required game regresses to generic coverage or misses a milestone;
- failed runs preserve reports, replays, and last-screen evidence.

## 3. Coverage levels and gates

### Generic smoke

Required behavior:

- launch;
- visible frame;
- input response;
- clean stop.

Generic smoke is a temporary fallback. It is never sufficient for an active release gate.

### Black-box progress

Required behavior:

- normal session start;
- meaningful user-facing action;
- observable state or score progress;
- one result, report, loss, or round boundary;
- pause/help/quit where supported;
- clean stop.

### Seeded completion

Required behavior:

- deterministic seed;
- terminal-only action execution;
- complete level, case, shift, scenario, battle, or campaign unit;
- deterministic replay;
- ending/continuation recognition;
- recovery or restart proof.

### Release rules

| Catalog group | Minimum required coverage |
|---|---|
| Featured | Seeded completion plus black-box progress |
| Beta | Seeded completion plus black-box progress |
| Workshop | Black-box progress plus oracle-assisted scenario completion where needed |
| Arcade Archive | Black-box progress with family-specific target |
| Newly added game | Explicit profile before merge; maturity determines required level |

## 4. Work order

The work should proceed in this sequence:

1. Complete Five-Minute Kingdom.
2. Add and enable the Featured coverage gate.
3. Complete Signal//Noise.
4. Complete Last Train Home.
5. Add the catalog coverage report.
6. Complete Workshop games in reusable policy families.
7. Complete Arcade Archive games in reusable policy families.
8. Enable main, nightly, and release enforcement.

Do not begin bulk archive work until the Featured and Beta gates are stable. Problems found there are likely to change shared contracts and would create avoidable rework across nineteen legacy profiles.

## 5. Phase 1: Five-Minute Kingdom

### Objective

Complete the Featured vertical slice by proving the full player-facing placement loop.

### Required recognizers

- title or briefing;
- active kingdom map;
- selected tile/card;
- target cursor;
- preview state;
- valid placement result;
- invalid placement result;
- ledger/help overlay;
- season or final report;
- ending or completed kingdom state;
- pause menu.

### Black-box policy

The black-box policy should:

1. start the normal game;
2. dismiss the briefing;
3. inspect the visible candidate and placement controls;
4. move the cursor;
5. preview a placement;
6. commit a legal placement;
7. observe score/resource changes;
8. open and close the ledger or help;
9. repeat until a season/report boundary;
10. intentionally exercise one invalid placement in a separate run;
11. pause, resume, and quit cleanly.

### Oracle-assisted policy

Use the pure engine and deterministic market/placement logic to select a legal placement. The oracle must return a semantic target and the player must navigate to it using terminal keys.

### Required milestones

- `kingdom-started`;
- `map-active`;
- `preview-opened`;
- `placement-committed`;
- `score-or-resource-changed`;
- `season-complete`;
- `invalid-placement-explained`;
- `restart-proven`.

### Completion gate

- three deterministic seeds pass;
- minimum and standard viewport pass;
- a full kingdom unit reaches its report or ending;
- black-box and oracle-assisted lanes are reported separately;
- replay reproduces milestone order;
- no timers, listeners, cursor, or alternate-buffer state leak.

## 6. Phase 2: Featured coverage gate

### Objective

Prevent Featured games from silently falling back to generic coverage.

### Required validation

- identify all `maturity: 'featured'` catalog entries;
- require an explicit profile version greater than zero;
- require black-box progress and seeded-completion support;
- require at least one post-start gameplay milestone;
- require one completion milestone;
- require one recovery/lifecycle milestone;
- require at least three deterministic seeds;
- require minimum and standard viewports;
- reject duplicate milestone IDs and unknown game IDs.

### CI behavior

The pull-request suite should run:

- registry validation for all Featured games;
- one fast seed for every Featured profile;
- every seed for a Featured game whose source, renderer, engine, or profile changed;
- replay validation for changed completion profiles.

### Completion gate

The gate fails clearly with the game ID, missing requirement, and the command needed to run the affected profile locally.

## 7. Phase 3: Signal//Noise

### Objective

Prove a complex observation-and-deduction flow through terminal input.

### Required gameplay path

1. start campaign or tutorial;
2. dismiss the brief;
3. adjust carrier centre and bandwidth;
4. change modulation/gain/station as required;
5. perform a sweep;
6. capture a usable signal;
7. apply notch/phase-lock tools where required;
8. triangulate the source;
9. choose a response;
10. reach debrief;
11. continue or restart.

### Required milestones

- `case-started`;
- `receiver-adjusted`;
- `sweep-complete`;
- `signal-captured`;
- `source-triangulated`;
- `response-selected`;
- `debrief-reached`;
- `next-case-or-restart`.

### Strategy

- black-box lane reads visible receiver values, prompts, and feedback;
- oracle lane uses deterministic signal-generation and triangulation helpers to choose target settings;
- all settings are reached through repeated public key input;
- failures distinguish incorrect reasoning from ignored controls or missing feedback.

### Completion gate

- tutorial completes through black-box play;
- one campaign case completes for three seeds;
- one incorrect capture/response path is detected and recovered;
- replay is deterministic.

## 8. Phase 4: Last Train Home

### Objective

Prove spatial selection, route planning, turn commitment, reports, and scenario completion.

### Required gameplay path

1. start campaign/tutorial;
2. dismiss briefing;
3. select trains and map tiles;
4. inspect or alter a switch/hold/repair/clear action;
5. plan or confirm a route;
6. commit a turn;
7. acknowledge turn report;
8. deliver or evacuate at least one train objective;
9. complete one scenario or reach a controlled failure;
10. restart or continue.

### Required milestones

- `dispatch-open`;
- `train-selected`;
- `route-planned`;
- `turn-committed`;
- `turn-report`;
- `train-progressed`;
- `scenario-complete`;
- `failure-restart-proven`.

### Strategy

- shared spatial navigation helper maps semantic coordinates to arrow-key sequences;
- oracle lane uses the deterministic engine and scenario topology to choose safe actions;
- black-box lane completes the tutorial using visible instructions;
- pause must freeze progress between turns.

### Completion gate

- tutorial path passes;
- one scenario completes for three seeds;
- one failure and restart path passes;
- minimum and standard viewport pass;
- no engine commands are applied directly to the live run.

## 9. Phase 5: Catalog coverage report

### Objective

Make coverage gaps visible to developers and CI.

### Report contents

For every game, report:

- catalog group and maturity;
- pace/family;
- profile version;
- coverage level;
- supported lanes;
- number of required seeds;
- viewports;
- required/achieved milestones;
- latest run status;
- action count;
- virtual and wall duration;
- replay/artifact location;
- incomplete reason.

### Output formats

- concise terminal table;
- JSON for CI;
- Markdown summary for release review;
- optional per-game artifact folders.

### Required summary counts

- total games;
- generic-smoke only;
- black-box progress;
- seeded completion;
- incomplete active profiles;
- failed runs;
- nondeterministic replays;
- cleanup failures.

### Completion gate

The report is generated by the same registry and suite scheduler used for playtests. No manually maintained duplicate list is allowed.

## 10. Phase 6: Workshop rollout

Workshop games should be implemented by interaction family so recognizers and policies are reused.

### Family A: Classification and rule reasoning

Games:

- Rogue Ledger;
- Containment Protocol;
- Dice Tribunal.

Shared work:

- rule-list extraction;
- choice mapping;
- preview/confirm/result flow;
- report and upgrade recognition;
- deterministic rule oracle.

Per-game targets:

| Game | Minimum target |
|---|---|
| Rogue Ledger | Process a full quarter, reach report or game over, choose continuation/restart |
| Containment Protocol | Complete a cycle, reach cycle report, complete or fail a shift |
| Dice Tribunal | Complete one hearing and case result, exercise reroll/assignment, reach precedent draft or game over |

### Family B: Spatial planning and navigation

Games:

- The Quiet Heist;
- Dungeon Courier;
- The 13th Lift;
- Tiny Fleet.

Shared work:

- grid/coordinate extraction;
- semantic target-to-arrow pathing;
- collision/blocked-move recognition;
- preview/commit flow;
- seeded path or route oracle.

Per-game targets:

| Game | Minimum target |
|---|---|
| The Quiet Heist | Move, interact, commit turns, steal objective or reach job ending |
| Dungeon Courier | Choose contract, navigate route, interact, deliver or fail, reach report |
| The 13th Lift | Program a valid seeded route, run service, reach shift result |
| Tiny Fleet | Issue orders for all ships, resolve rounds, reach battle report |

### Family C: Scheduling and economic planning

Games:

- Market of Mirrors;
- Orbital Post;
- Botany Lab;
- Five-Minute Kingdom after its Featured profile becomes the family reference.

Shared work:

- selection-list recognition;
- resource/score extraction;
- preview/commit behavior;
- legal-action oracle;
- day/shift/report transitions.

Per-game targets:

| Game | Minimum target |
|---|---|
| Market of Mirrors | Buy/sell or publish legally, end a day, reach report/ending |
| Orbital Post | Schedule jobs, advance a window, reach window/shift report |
| Botany Lab | Choose training/standard, grow/harvest or fill a contract, reach report |

### Family D: Investigation and information management

Games:

- Ghost Shift;
- Night Frequency;
- Time Capsule.

Shared work:

- overlay open/close recognition;
- evidence/log/dossier extraction;
- claim or hypothesis selection;
- commit/result/recovery loop.

Per-game targets:

| Game | Minimum target |
|---|---|
| Ghost Shift | Inspect cameras/logs, perform defensive action, resolve a case |
| Night Frequency | Take calls, update dossier claims, resolve one broadcast case |
| Time Capsule | Explore, select anchors, commit a capsule, reach result/ending |

### Family E: Real-time infrastructure

Game:

- Blackout Grid.

Reuse Packet Panic's real-time harness contract:

- virtual-time advancement;
- pause freezes simulation;
- cursor/action input changes topology;
- score/load/status progression;
- upgrade, win, or game-over boundary;
- timer/listener cleanup.

### Workshop completion gate

- no Workshop game remains `generic-smoke`;
- each game passes black-box tutorial/first-unit progression;
- each complex game has oracle-assisted seeded completion;
- shared family helpers have their own unit tests;
- game wrappers contain mappings and milestones, not copied policy engines.

## 11. Phase 7: Arcade Archive rollout

Implement one reusable family policy at a time.

### Board manipulation

Games:

- Tetris;
- 2048;
- Minesweeper.

Targets:

- Tetris: place pieces, clear a line or reach score target, force game over, restart;
- 2048: perform valid slides, create target tile/score, detect no-move state or restart;
- Minesweeper: choose difficulty, reveal/flag cells, complete a seeded small board or reach safe-progress target.

### Grid navigation

Games:

- Snake;
- Frogger;
- Tron.

Targets:

- Snake: retain current game-over target and add food/score milestone;
- Frogger: cross at least one lane/goal or reach score target;
- Tron: survive, steer, force match result, restart.

### Paddle/projectile tracking

Games:

- Pong;
- Breakout.

Targets:

- Pong: track ball/paddle, return hits, score or concede point, reach match boundary;
- Breakout: launch ball, return hits, destroy bricks or reach score target, game-over/restart.

### Action and shooter games

Games:

- Space Invaders;
- Asteroids;
- Runner;
- Chopper.

Targets:

- Space Invaders: move/fire, destroy enemy or increase score, reach loss/restart;
- Asteroids: move/rotate/fire, destroy target or survive duration, reach loss/restart;
- Runner: jump/duck through hazards, increase distance/score, reach loss/restart;
- Chopper: move/land/deliver or reach delivery-progress target, controlled loss/restart.

### Text and word games

Games:

- Wordle;
- Hangman;
- Typing Test;
- Crack.

Targets:

- Wordle: retain current deterministic ending and add invalid-entry/editing coverage;
- Hangman: submit letters, prove correct/incorrect feedback, reach win/loss;
- Typing Test: choose duration, type through input path, reach timed result;
- Crack: enter/edit/submit commands or guesses, reach success/failure boundary.

### Memory and timing games

Games:

- Simon;
- Tower.

Targets:

- Simon: observe/reproduce sequence, advance round, deliberately fail, restart;
- Tower: start, perform timed placements, reach height/score target, fail/restart.

### Tactical combat

Game:

- Hyper Fighter.

Target:

- select character/mode;
- execute legal combat actions;
- observe health/score/state changes;
- reach a round or match result;
- restart/quit cleanly.

### Archive completion gate

- all nineteen games have explicit profiles;
- each reaches a family-appropriate meaningful target;
- real-time games use virtual duration budgets;
- text games type through actual input events;
- all games prove game-over/result and restart where supported;
- repeated sequential runs produce no lifecycle leakage.

## 12. Phase 8: CI and release enforcement

### Pull-request suite

- profile/schema validation;
- all active launch tests;
- Featured fast progression;
- changed-game deep profile;
- changed shared-policy family tests;
- package export smoke.

### Main-branch suite

- every active game deep profile;
- one required seed per game;
- Featured/Beta replay validation;
- cleanup assertions;
- coverage report generation.

### Nightly suite

- all 39 games;
- all seeds and viewports;
- black-box and oracle lanes;
- resilience suite;
- long real-time virtual-duration runs;
- repeated-run leak detection;
- failure artifact retention.

### Release suite

- nightly matrix passes twice from clean builds;
- no active game is generic-only;
- no game is missing an explicit profile;
- no nondeterministic replay;
- no cleanup failure;
- PTY smoke passes for the packaged CLI;
- Markdown coverage report is attached to release review.

## 13. Pull-request sizing

Keep implementation reviewable with these boundaries:

1. Five-Minute Kingdom profile and tests.
2. Featured coverage validator and CI command.
3. Signal//Noise profile and oracle.
4. Last Train Home profile and oracle.
5. Coverage reporter.
6. One Workshop family per pull request.
7. One Archive family per pull request.
8. PTY and final release enforcement.

Each pull request must include:

- profile or shared policy implementation;
- recognizer unit tests;
- at least one integrated terminal playthrough;
- deterministic replay check for completion profiles;
- coverage report before/after summary;
- no unrelated game or balance changes.

## 14. Progress tracking table

| Stage | Games | Exit condition | Status |
|---|---:|---|---|
| Initial vertical slice | 5 | Stack Trace, Dead Letter, Packet Panic, Wordle, Snake pass | Complete |
| Featured completion | 1 remaining | Five-Minute Kingdom passes; Featured gate enabled | Pending |
| Beta completion | 2 | Signal//Noise and Last Train Home pass | Pending |
| Coverage reporting | All | Terminal/JSON/Markdown reports generated from registry | Pending |
| Workshop rollout | 14 | No Workshop game remains generic-only | Pending |
| Archive rollout | 19 | Every archive game reaches family target | Pending |
| CI/release enforcement | All | Main/nightly/release gates enabled and passing | Pending |

## 15. Final definition of done

The rollout is done when the catalog report shows thirty-nine explicit profiles, every game proves real progress through terminal input, public-priority games complete deterministic seeded units, archived games reach meaningful family targets, and CI prevents future games or regressions from returning the collection to launch-only testing.
