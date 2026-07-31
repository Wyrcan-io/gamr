# Ghost Shift — Full Game & Implementation Plan

## Product decision

**Ghost Shift is a deterministic, turn-based security-desk thriller about proving which employee is an intruder before the building's power reserve is exhausted.** The player cannot walk the office or directly chase anyone. They operate a small after-hours control room: switch between security cameras, read badge and door events, lock or release access zones, and finally issue one arrest command against a named suspect.

The game is a deduction puzzle first. Suspense comes from an intruder who acts after each committed operation, from an office that becomes less observable as its battery drains, and from the cost of acting on weak evidence. It is not a reaction-speed game, a hidden-object game, or a simulation of real security systems.

Version 1 should ship a tutorial, six authored cases, deterministic seeded variants, an end-of-case evidence report, and a compact replay mode. Implement a two-case vertical slice before producing the full campaign.

## Player promise and pillars

> “I caught them because their story could not fit the cameras, doors, and access records.”

1. **Visible evidence, provable conclusion.** Every accusation is supported by facts the player can inspect. The report names the exact contradiction that proved the answer.
2. **Power is the central trade-off.** Cameras reveal evidence but use energy; door controls protect key areas but can remove routes and obscure future observations.
3. **One action advances the night.** There is no real-time timer. The intruder advances only when the player deliberately performs a costly operation.
4. **A pattern, not a pixel hunt.** Camera feeds use readable movement silhouettes, room labels, timestamps, and state icons. The core challenge is reconciling constraints across sources.
5. **Failures teach.** A wrong accusation ends the case with a concise causal replay and permits same-seed retry. A missed window is never caused by an unannounced random event.

## Session shape and core loop

An introductory case should take 4–6 minutes; later cases 7–12 minutes. A first full campaign should be 45–70 minutes.

1. Read the incident brief: known staff roster, a protected asset, start location clue, and explicit night conditions.
2. Inspect the current **camera stills** and the chronological **door log** for free.
3. Spend a power-consuming operation: wake or rotate a camera, query a badge reader, lock/unlock one access door, deploy a one-shot motion probe, or make an accusation.
4. Resolve the intruder's deterministic next move, record its door interaction, update camera stills, and reveal announced building events.
5. Cross-reference observations to eliminate staff whose location, route, badge, silhouette, or access permission is impossible.
6. Once one suspect remains and the evidence threshold is met, lock the target's predicted exit and issue **DETAIN**.
7. Read the replay report, including all proof links, power used, and seed; retry or continue.

Pure inspection never advances time. Only `commitOperation` changes the turn, letting players reason without reflex pressure.

## World model

### The office board

Use a small authored graph, not a free grid: 9–12 rooms, 11–15 doors, and 4–6 cameras. Each room has a stable short ID, one visual profile, and a camera coverage rule. A room can be `lit`, `emergency`, or `dark`; this changes what a camera can establish but never creates arbitrary inaccuracies.

```text
          [R] Reception -- [L] Lobby -- [M] Meeting
               |                |              |
          [P] Print Bay --- [H] Hall --- [A] Archive
                                |              |
                           [K] Kitchen --- [S] Server
                                              |
                                           [E] Exit
```

- Doors are edges. Each has an ID, lock state, access tier, and a door-log sensor.
- Cameras cover one room or a fixed pair of adjacent rooms. A feed displays the most recent observed occupant(s), movement direction if applicable, time, quality, and room state.
- The intruder's target path always uses the same graph the player sees. There is no teleportation.
- Staff may follow harmless scheduled routes, so “person in a room” alone is not proof. Their schedules and badges form the deduction surface.

### Cast and identities

Each case contains 4–6 named employees plus exactly one intruder. An intruder may impersonate an employee identity in badge logs, but cannot satisfy all independent evidence channels.

Every identity has player-visible data:

| Attribute | Example | Use in deduction |
|---|---|---|
| Badge tier | `BLUE` | Which doors their badge can plausibly open. |
| Build glyph | `TALL`, `SHORT`, `BULKY`, `SLIM` | Camera silhouette excludes incompatible identities. |
| Shift alibi | “Kitchen, turns 2–3” | A log event/camera frame can corroborate or contradict it. |
| Habit | “Always takes the south hall” | Optional corroboration; never the sole decisive proof. |
| Access claim | “Never enters Archive” | Creates a case-specific contradiction. |

The intruder has a hidden **cover identity**, a true build, a forged-badge capability, a destination plan, and a contingency route. Case data must provide at least two independent proof paths: e.g., badge tier mismatch plus impossible camera transition, or silhouette mismatch plus door timing contradiction.

## Evidence system and exact logic

### Evidence sources

| Source | Cost | Gives | Limits |
|---|---:|---|---|
| Camera view | 0 to inspect; 1 to wake/rotate | Last observation, silhouette class, direction, timestamp | Dark rooms show occupancy/motion but not build. |
| Door log | 0 to inspect | Every open, denied, forced, or locked-door event | Badge identity can be forged in specific cases. |
| Badge query | 1 power | The raw credential token and access result of one log event | Exposes cloned/expired badge contradictions. |
| Motion probe | 2 power, one use | A room occupancy result on the next two turns | Does not identify a person. |
| Door control | 1 power | Lock/unlock a door before the intruder acts | May force a route or protect the exit. |

Camera feeds are **observations**, not omniscient live video. At each turn the renderer keeps the most recent record for an active camera. A room without an active feed produces no observation. This makes waking the right camera a meaningful prediction rather than an automatic answer.

### Candidate filter

The engine stores every observation as a structured constraint and derives, rather than hand-waves, the candidate list.

```ts
interface Evidence {
  id: string;
  turn: number;
  kind: 'camera' | 'door' | 'badge' | 'probe' | 'brief';
  fact: EvidenceFact;
  sourceLabel: string;
}

interface CandidateAssessment {
  suspectId: PersonId;
  status: 'possible' | 'contradicted' | 'cleared';
  contradictions: EvidenceId[];
  supports: EvidenceId[];
}
```

For each roster identity, test all collected facts:

```text
candidate is possible only if:
  every observed silhouette is compatible with candidate.build
  every authenticated badge event is compatible with candidate.badgeTier
  every pair of attributed sightings can be connected through open doors
    within the elapsed turns
  every case-specific alibi/access constraint is satisfied
```

`door log` events are attributed provisionally to their displayed identity. A normal log is evidence about *the claimed badge*, while an authenticated query can establish that a clone or expired token was used. This distinction keeps the deduction clear: a badge can lie, a physical silhouette cannot, and a locked graph makes impossible travel objectively false.

The UI labels a contradiction without revealing the hidden answer: `NORA: impossible route C07 → C09 (one turn, two locked doors)` or `SAM: camera build SLIM conflicts with roster BULKY`. The player can open an Evidence Board showing all candidate statuses and links.

### Accusation rule and fairness gate

The `DETAIN` command is available only when all of the following hold:

1. Exactly one roster identity is not contradicted **or** the player has discovered a direct forged-identity proof naming it.
2. At least two decisive evidence sources are represented (camera + door/badge, or camera + camera with a route contradiction).
3. The intruder is currently in a known interceptable room or will reach a non-locked exit on the next turn.

The player may make an early `REPORT SUSPICION` at any time. It costs no power but has no mechanical effect; it is a useful practice affordance. Do not allow blind one-in-six accusations—the thriller should reward a proof, not luck.

## Turn resolution and power

### Resources and pressure

Each case starts with 8–14 **Battery** depending on length, and 0 **Exposure**. Battery cannot be replenished in Version 1. Every costly operation spends battery and advances the clock by one tick. The intruder may complete its objective at an authored deadline (normally turns 8–12), which is displayed in the briefing as `EXIT WINDOW: T08–T10`.

| Operation | Battery | Advances turn | Notes |
|---|---:|:---:|---|
| Wake/rotate camera | 1 | yes | Keeps that feed active for 3 turns. |
| Badge query | 1 | yes | Targets one known door-log event. |
| Lock/unlock door | 1 | yes | Locked doors are logged and update path constraints. |
| Deploy motion probe | 2 | yes | Has one guaranteed next-turn observation. |
| Detain | 1 | yes/end | Must meet the fairness gate. |
| Inspect panels/help/logs | 0 | no | Always safe. |

On every costly operation, resolve in this exact order:

1. Validate the operation and subtract its battery.
2. Apply player-controlled state (camera active period, probe, door lock).
3. Apply any announced building event scheduled for this turn.
4. Compute the intruder's next legal route step against the updated door graph.
5. Move background staff according to their authored schedules.
6. Record door events and collect camera/probe observations from active sensors.
7. Check objective escape, capture, or battery/deadline loss.
8. Append a structured resolution to the incident log and update candidate assessments.

If the preferred path is blocked, the intruder takes the case's fixed contingency path. If both are blocked, it waits and makes a visible `FORCED WAIT` door event; it never silently breaks a rule. A forced door breach is reserved for a specific, announced late-game case and is plainly logged.

### Win/loss/scoring

- **Clear:** Detain the intruder after proof, before its exit/asset objective resolves.
- **Escape:** the target reaches its final exit or asset action at its authored deadline.
- **Blackout:** battery reaches zero before detention; case ends after the current resolution.
- **False detention:** only available during tutorial/debug testing; campaign detain is gated. If retained as an optional hard mode, it must show the mistaken proof immediately.

```text
caseScore = 1200 + 80 × batteryRemaining
            - 60 × operationsUsed - 100 × forcedDoorBreaches
            + 150 × unusedProbe
```

Rank is flavour only. A correct, careful case always counts as a win even if it uses most of the battery.

## Campaign and replayability

### Campaign: the Kestrel Tower night shift

The tone is tense, humane workplace noir: strange office lighting, terse maintenance notes, corporate security language, no graphic violence. The intruder's motives are theft, sabotage, data extraction, or protection of a colleague—not combat.

| Case | New lesson | Intruder pattern | Battery / deadline |
|---:|---|---|---:|
| 0: Orientation | Camera + door log triangulation | One fake badge, no staff movement | Unlimited / no escape |
| 1: Printer Wake | Build mismatch | Same badge identity appears at two distant cameras | 10 / T9 |
| 2: Archive Key | Badge query | Clone token opens a tier-restricted door | 11 / T9 |
| 3: Quiet Floor | Sensor coverage | Darkness hides build; probe resolves location | 12 / T10 |
| 4: Fire Door | Route manipulation | Locking one door forces a revealing contingency path | 11 / T9 |
| 5: Boardroom Ghost | Conflicting alibis | Two plausible cover stories; route timing breaks one | 13 / T11 |
| 6: Ghost Shift | Finale | Brief outage, moving staff, one planned forced breach | 14 / T12 |

The campaign should introduce only one new rule per case and demonstrate it before combining it with another. Use authored cases for the core campaign. Seeds select cosmetic names, non-decisive log wording, camera noise flavour, and one of two certified route variants—never a route that lacks a tested proof path.

### After-hours mode

Unlock after campaign completion. Recombine vetted **case templates**, not arbitrary graphs:

1. Choose a graph template and a staff roster using named deterministic PRNG streams.
2. Choose a cover identity, route pair, and evidence-pack template.
3. Use a solver to simulate all observation actions within the battery budget.
4. Reject a seed unless there is a legal plan producing two independent proofs before escape.
5. Show seed and content version in briefing and report.

Daily challenges, persistent progression, online scoring, and fully procedural prose are explicitly deferred.

## Interface and controls

### Visual language

Document these semantic glyphs next to renderer constants, with text fallbacks:

| Concept | Glyph | Fallback |
|---|---|---|
| Active camera | `◉` | `O` |
| Sleeping camera | `○` | `o` |
| Door locked/open | `▣` / `□` | `#` / `-` |
| Door event | `⇄` | `<>` |
| Motion | `›` | `>` |
| Direct proof | `✓` | `+` |
| Contradiction | `!` | `!` |
| Battery pip | `◆` | `*` |
| Intruder unknown | `?` | `?` |

Colour is supplementary. Labels such as `CAM ACTIVE`, `DOOR LOCKED`, `PROOF 2/2`, and `CANDIDATES 1` are required in all themes.

### Full layout (94×30)

```text
                       G H O S T   S H I F T                    CASE 04 / 06
  TURN 06   BATTERY ◆◆◆◆◇◇   EXIT WINDOW T09   CANDIDATES 2   PROOF 1/2
┌─ OFFICE / CAMERAS ───────────────────────────┐ ┌─ SELECTED FEED: C-03 / HALL ─────────┐
│ [R]──[L]──[M]     ◉ C-01 Reception           │ │ T06  HALL  OCCUPANT: SLIM / BLUE TAG  │
│  │    │    │     ○ C-03 Hall                 │ │ MOVED: Archive → Hall                  │
│ [P]──[H]──[A]    ▣ A-H LOCKED                │ └───────────────────────────────────────┘
│       │    │    □ H-K OPEN                    │ ┌─ EVIDENCE BOARD ───────────────────────┐
│      [K]──[S]──[E]                            │ │ ! NORA: badge tier cannot open ARCHIVE │
└───────────────────────────────────────────────┘ │ ? SAM: compatible (1 proof needed)     │
┌─ DOOR LOG / INCIDENTS ────────────────────────┐ └───────────────────────────────────────┘
│ T06  A-H  OPEN  badge: NORA-17                │ [C]amera [B]adge query [D]oor [P]robe
│ T05  H-K  DENIED  badge: NORA-17              │ [Tab] feed  [Enter] operate  [F] file
└───────────────────────────────────────────────┘ [E]vidence [H] help [Esc] pause
```

At `80×28`, show the graph and status continuously, with the selected camera, door log, and Evidence Board in a tabbed lower panel. Below `80×28`, freeze game input and render Gamr's standard resize message.

| Key | Action |
|---|---|
| Arrows / `WASD` | Select rooms, cameras, or doors in the office graph. |
| `Tab` | Cycle panels/available cameras. |
| `C` | Wake or rotate selected camera. |
| `B` | Query selected eligible door-log event. |
| `D` | Lock/unlock selected door. |
| `P` | Place probe in selected room. |
| `E` | Open Evidence Board. |
| `F` | Open staff files and case brief. |
| `Enter` | Confirm an operation, dismiss report, or detain when gated. |
| `H` | Help/rule ordering. |
| `Esc` | Shared pause menu. |

The selection panel must always preview the cost, expected sensor coverage, and whether the command advances the turn before confirmation.

## Technical architecture

Create a new game directory with a pure rules engine and a thin terminal controller:

```text
src/games/ghost-shift/
├── index.ts          terminal lifecycle, key mapping, pause/transition integration
├── types.ts          serializable domain state, IDs, commands, results
├── content.ts        staff, cases, briefs, text, evidence templates
├── graph.ts          room/door graph, path and travel-time helpers
├── seed.ts           32-bit seeded PRNG and named streams
├── evidence.ts       evidence collection, candidate filter, proof explanations
├── engine.ts         createState, command reducer, turn-resolution pipeline
├── generator.ts      After-hours template assembly and solvability validation
├── render.ts         ANSI full/compact frames and overlays
├── engine.test.ts    commands, resolution ordering, win/loss/replay tests
├── evidence.test.ts  contradictions, candidate filtering, proof-gate tests
└── generator.test.ts seed validity and solver tests
```

```ts
type Phase = 'start' | 'modeSelect' | 'briefing' | 'monitoring'
  | 'operationConfirm' | 'turnReport' | 'caseReport' | 'gameOver';

interface GameState {
  version: 1;
  seed: number;
  contentVersion: string;
  mode: 'tutorial' | 'campaign' | 'afterHours';
  phase: Phase;
  caseIndex: number;
  turn: number;
  battery: number;
  exitDeadline: number;
  office: OfficeState;
  cameras: Record<CameraId, CameraState>;
  doors: Record<DoorId, DoorState>;
  people: Record<PersonId, PersonState>;
  intruder: IntruderState; // hidden from render selectors
  evidence: Evidence[];
  assessments: CandidateAssessment[];
  operations: OperationRecord[];
  log: Incident[];
  selected: Selection;
  activePanel: PanelId;
  lastResolution: TurnResolution | null;
  tutorialStep: number | null;
}

type Command =
  | { type: 'start'; mode: GameState['mode']; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'select'; target: Selection }
  | { type: 'wakeCamera'; cameraId: CameraId }
  | { type: 'queryBadge'; eventId: DoorEventId }
  | { type: 'setDoorLock'; doorId: DoorId; locked: boolean }
  | { type: 'deployProbe'; roomId: RoomId }
  | { type: 'detain'; suspectId: PersonId }
  | { type: 'dismissReport' }
  | { type: 'togglePanel'; panel: PanelId }
  | { type: 'restart'; seed?: number };
```

The engine may mutate a newly cloned state or return an immutable copy, but must never let renderer code decide rules. All IDs and ordering must be stable arrays/sorted values; no `Math.random()` may run after `createState`.

### Key engine invariants

- Only a successful costly operation advances `turn` or changes intruder/staff positions.
- An invalid operation spends no battery and changes no world state beyond an explanatory log entry.
- Door-path validation uses the post-operation lock state and the pre-move position snapshot.
- Every camera/probe observation records the exact turn, source, room, quality, and visible attributes.
- Candidate filtering is deterministic and returns the same assessment order for the same evidence list.
- Every authored/generator case has a solver-confirmed proof path within battery and deadline.
- The render-facing state must not expose the intruder's true identity or planned path before the result screen.
- Same seed + command transcript produces byte-identical serializable state and incident report.

### Resolution pseudocode

```ts
function resolveOperation(state: GameState, command: CostlyCommand): TurnResolution {
  validateOperation(state, command);              // throw/reject without state advance
  spendBatteryAndApplyControl(state, command);
  applyScheduledEvent(state, state.turn);

  const intruderMove = chooseRouteStep(
    state.intruder, state.office, state.doors, state.turn
  );
  const staffMoves = authoredStaffMoves(state.people, state.turn);
  movePeopleFromSnapshot(state, intruderMove, staffMoves);

  appendDoorEvents(state, intruderMove, staffMoves);
  collectSensorEvidence(state);
  state.assessments = assessCandidates(state.evidence, state.people);

  const result = evaluateOutcome(state, command);
  state.turn += 1;
  state.lastResolution = result;
  return result;
}
```

`chooseRouteStep` must select from a pre-authored primary/contingency route, not perform opaque weighted AI. Its returned reason (`PRIMARY`, `LOCKED-DOOR DETOUR`, `FORCED WAIT`) is included in the end-of-case explanation but hidden during active play unless an observable result exposes it.

## Content validation and solver

Build a small development-only state-space solver before After-hours mode. The action space is intentionally modest: wake any camera, query any eligible event, lock/unlock any unlocked door, deploy a probe, and detain only if gated.

For each case/template, the solver searches breadth-first over `(turn, battery, door locks, active sensors, collected evidence)` and uses the same engine reducer. It passes only if it finds a state that meets the Detain gate before objective escape. It must also store one witness command sequence for test fixtures and content review.

Content checks should reject:

- a room or door ID that does not exist in the referenced graph;
- a route that crosses a locked/absent edge without an explicit breach rule;
- an evidence fact that cannot contradict or support any roster identity;
- a case with fewer than two independent decisive source families;
- a direct proof that appears only after the exit deadline;
- a seeded variant with no solution or a single unavoidable operation path where replayability is claimed.

## Testing and quality plan

Use Vitest for the pure modules. Do not rely on ANSI snapshots for core correctness.

1. Same seed creates the same case, routes, staff schedule, and opening cameras.
2. Free inspection does not advance a turn or drain battery; successful operations do exactly once.
3. Invalid camera, query, door, and probe actions do not consume power.
4. A lock changes the intruder path before the move and produces a matching door log.
5. Primary and contingency paths are deterministic; a blocked intruder waits visibly when neither is legal.
6. Active cameras record only rooms they cover and respect dark/emergency quality rules.
7. Every badge query exposes the specified raw-token/permission fact exactly once.
8. Build mismatch, impossible travel, tier mismatch, and alibi conflict each clear the intended candidates.
9. Candidate assessment is stable regardless of evidence insertion/object key order.
10. Detain is unavailable without two independent proof sources and available with the authored proof set.
11. Escape, blackout, and capture transitions produce the correct report and no post-end movement.
12. Every campaign case and at least 500 After-hours seeds pass the solver.
13. Replaying a seed with the same commands produces equal state after every operation.

Manual QA: tutorial, every case's witness solution, deliberate wasted-power loss, door-detour path, pause/restart/quit/switch cleanup, default and light themes, and `80×28` / `94×30` / wide terminal frames. Verify every glyph fallback preserves alignment.

## Implementation milestones

### 0 — Rules proof and paper prototype

Author the orientation case, a 9-room graph, four staff files, an intruder route pair, and a hand-worked proof timeline. Draw the `80×28` wireframe.

**Done when:** someone can identify the intruder from the printed timeline and explain why each other suspect fails.

### 1 — Pure engine vertical slice

Implement types, graph routing, seeded state, evidence model, assessment reducer, operations, resolution ordering, and tests for Orientation plus Printer Wake.

**Done when:** tests can win both cases from command transcripts and explain the evidence gate.

### 2 — Terminal vertical slice

Implement renderer, start/briefing/report screens, full/compact layouts, input mapping, minimum-size behavior, shared pause menu, and proper alternate-buffer lifecycle.

**Done when:** a fresh player can complete Orientation at `80×28` without external instructions.

### 3 — Campaign content

Add cases 2–6, staff/brief writing, case reports, route variants, and campaign ranking. Keep all main cases authored and solver-validated.

**Done when:** a full campaign has a clear difficulty curve with one new rule per case.

### 4 — Replayability and balance

Implement After-hours templates, solver validation, deterministic seed display/replay, debug trace panel, and seed-batch testing. Tune battery/deadlines from actual solution-path lengths rather than intuition.

**Done when:** 500 generated cases contain no solver failure and common strategies use genuinely different sensor/door choices.

### 5 — Release pass

Add title glitch, restrained camera/static flashes, final Help copy, icon fallback documentation, registry entry, and public documentation. Run `npm run typecheck`, `npm test`, and `npm run build`.

**Done when:** all tests pass, terminal cleanup works on every exit route, and a light-theme `80×28` run remains fully understandable without colour.

## Gamr integration

- Export `runGhostShiftGame(terminal)` with `stop()` and `isRunning`.
- Use `getCurrentThemeColor`, `dispatchGameQuit`, `dispatchGameSwitch`, `dispatchGamesMenu`, `PAUSE_MENU_ITEMS`, `renderSimpleMenu`, and `navigateMenu`.
- Enter alternate buffer/hide cursor once, and clear intervals/listeners, restore cursor/styles, and leave the buffer exactly once on all exits.
- Render at 20 FPS for title/static polish only. The game engine advances only on validated commands.
- Add the active-game registry entry: `{ id: 'ghost-shift', name: 'Ghost Shift', description: 'Catch the intruder from cameras, door logs, and dwindling power.', run: runGhostShiftGame }`.

## Explicit Version-1 non-goals

- Combat, visible chases, weapons, or a controllable character.
- Real-time countdowns, audio-dependent clues, mouse input, or graphical hidden-object scenes.
- Face recognition, biometrics, real-world surveillance advice, or realism claims about security systems.
- Arbitrary random intruder behaviour, generated unverified mysteries, or evidence that depends on prose interpretation alone.
- Online leaderboards, cloud saves, daily challenges, achievements, or persistent upgrades.

## Definition of done

Ghost Shift is ready when a new player can make an evidence-backed detention in the tutorial; every campaign and generated case has a deterministic solver-confirmed proof route; every rejected suspect has a readable contradiction; battery and intruder movement change only on explicit operations; the game is legible at `80×28` in light and dark themes; and typecheck, unit tests, content validation, and build all pass before the game is registered.
