# The Quiet Heist — Full Game & Implementation Plan

## Product decision

**The Quiet Heist is a deterministic, turn-based stealth tactics game about stealing one valuable object from a small museum and getting out before security closes around you.** It takes the readable intent language of *Into the Breach*—every immediate enemy action is shown before the player commits—and applies it to patrol routes, sight-lines, investigations, cameras, doors, and noise.

The player never needs reflexes, pixel-perfect timing, or knowledge of hidden random rules. They receive two actions per turn, revise the security forecast after each action, then deliberately commit the turn. Guards execute the forecast they were showing. A mistake should always answer: *which visible tile, predicted route, or stated security response caused this?*

Version 1 should be a compact, single-player terminal campaign of six authored museum heists, with seeded cosmetic variants and replayable individual jobs. Build a two-job vertical slice before expanding the campaign.

## Player promise and pillars

> “I escaped because I read the room, redirected the guards, and made the right plan when the job changed.”

1. **Intent is a contract.** The map shows each guard’s next step, destination, facing, and next-turn vision. Unless the player changes the board with an announced action, the guard does exactly that.
2. **Stealth is spatial, not a timing test.** Position, cover, doors, attention, and noise determine danger. There is no real-time movement and no hidden detection roll.
3. **Distraction creates plans, not chaos.** A distraction pulls a guard according to an explicitly displayed response priority and lasts for a stated number of turns.
4. **The objective evolves visibly.** A job moves through preparation, acquisition, and extraction. Branches are printed in the contract before the player triggers them; an alarm or theft can change the next objective, never rewrite an already-resolved fact.
5. **Failure teaches and retries cleanly.** A loss report contains a turn-by-turn causal replay, the final guard forecasts, the alarm source, and the same seed for a one-key retry.
6. **Small board, high consequence.** A complete job has 2–4 guards, 1–2 cameras, a target, two exits, and a few interactable objects. The player can understand the entire floor at a glance.

## Session shape and core loop

A tutorial should take 4–6 minutes. Standard jobs should take 8–14 minutes; a first campaign should take about 50–75 minutes.

1. Read the contract: target, starting escape route, named security response, tools, and the first objective.
2. Inspect the whole floor for free: guard intent arrows, vision cones, camera arcs, noise targets, doors, and alarm status.
3. Spend up to two player actions: walk, hide, interact, deploy a distraction, or use a tool.
4. After each action, recompute and redraw the next security forecast. The player may change plan before committing.
5. Press `Enter` to end the player turn. Guards and cameras resolve their displayed intents in a fixed order.
6. Show a short resolution strip, advance the turn, apply announced contract triggers, and present the new objective if it changed.
7. Repeat until the player has fulfilled the current objective and exits with the asset, or security captures/locks down the museum.

Free inspection, panel switching, opening Help, and moving a cursor never spend an action or advance the turn. Only `Enter` resolves guard movement.

## The museum board

Use a compact authored tile grid: **11–13 columns × 7–9 rows**. This is large enough for flanking and route manipulation but small enough to render alongside panels at 80×28.

```text
        STREET EXIT [E]             STAFF EXIT [S]
  ┌──────────────────────────────────────────────────┐
  │  [C] Camera      Gallery A        Gallery B       │
  │       ┌──────┐  ┌──────────┐    ┌──────────┐      │
  │ Entry │  ▒▒  │──│   ◇ key  │────│  ◎ case  │      │
  │   @   └──────┘  └────┬─────┘    └────┬─────┘      │
  │                       │  Atrium      │            │
  │  Storage [H] ─────────┴───────┬──────┘  Office    │
  │     coin cache                [G]                 │
  └──────────────────────────────────────────────────┘
```

- `#` wall: impassable.
- `.` floor: walkable, exposed unless in a guard/camera cone.
- `▒` cover: a player on cover cannot be seen through that tile, but a guard may enter it and discover them.
- `D` / `d` door: closed/open, blocks travel and sight when closed. Some doors are lockable by the player or security.
- `◎` display case: contains the current target or a required key tool.
- `◇` utility object: keycard, breaker, coat rack, bell, or decoy source. Its interaction is authored per job.
- `H` hiding spot: lets the player become hidden with an action; it is safe from vision but not from a guard searching the same tile.
- `@` player, `G` guard, `C` camera, `E` normal exit, `S` service exit.

The map is fixed for a job. Doors, objects, guard positions, guard attention, camera rotation, alarm locks, and objective markers are all stateful and rendered directly on it.

## Turn economy and player actions

The player begins each turn with **2 Actions**. All actions are deterministic. A selected command first shows its destination/effect and the recalculated intent forecast; a second confirmation executes it where accidental activation would be costly.

| Action | Cost | Rule | Tactical use |
|---|---:|---|---|
| Walk | 1 AP | Move one orthogonal tile; cannot enter a currently visible tile or guard tile. | Reposition through safe lanes. |
| Sneak | 2 AP | Move one tile without changing nearby guard attention; only legal from/to cover or darkness. | Cross a short watched threshold after creating cover. |
| Hide / leave hide | 1 AP | Toggle at a `H` tile. Hiding blocks vision; guard occupancy still catches. | Let a patrol pass. |
| Interact | 1 AP | Use adjacent display, door, breaker, key, exit, or job object. | Advance the contract or reshape the map. |
| Toss decoy | 1 AP + 1 token | Place a noise marker within range 4 and clear line of throw. | Pull one or more guards into a known route. |
| Trigger fixture | 1 AP | Activate an authored bell, shutter, light, or exhibit from adjacent. | A reusable but job-specific distraction. |
| Jam camera | 1 AP + 1 jammer | Disable a selected adjacent/control-linked camera for 2 guard turns. | Open a visible lane. |
| Wait | 0 AP | Spend no AP but allows `Enter`. | Advance a patrol when already safe. |

The player has 2 decoy tokens in normal jobs and at most 1 camera jammer. Tools may be replenished only by explicit map objects. Version 1 should avoid inventories larger than three slots.

### Visibility and immediate legality

The engine uses two related but distinct concepts.

- **Current danger** is every tile visible from each guard’s present facing or active camera arc. A normal `Walk` into one is illegal; the renderer labels it `SEEN NOW` and explains by which observer.
- **Forecast danger** is every tile visible after the guard/camera’s displayed next intent resolves. It is legal to step there, but the tile is striped amber/red and the action preview warns `WILL BE SEEN ON COMMIT`.

This rule prevents confusing “I moved and instantly lost” moments while preserving the core planning question: can the player use their second action to hide, close a door, distract the guard, or escape the predicted cone before the commit?

## Security forecast: exact guard logic

Each guard has an explicit state, facing, patrol route, awareness level, and one **Intent**. Intent is recomputed after every player action and is always shown on the board and in a text panel.

```ts
type GuardMode = 'patrol' | 'investigate' | 'search' | 'pursue' | 'return';

interface GuardIntent {
  guardId: string;
  reason: 'PATROL' | 'NOISE' | 'LAST_SEEN' | 'LOCKDOWN' | 'RETURN';
  from: Point;
  to: Point;                 // may equal from for a turn/look action
  facing: Direction;
  nextVision: Point[];
  routePreview: Point[];     // up to three tiles, informational only
  certainty: 'exact';        // V1: no intentional uncertainty
}
```

Guard priority is simple, global, and shown in Help:

1. If the guard has a visible player or a `lastSeen` marker, **pursue** the shortest legal path to it.
2. Else if a live noise marker is within its hearing radius, **investigate** the oldest/loudest reachable marker. Ties break by fixed guard ID, then reading order.
3. Else if its search timer is active, **search** the printed adjacent search tile sequence.
4. Else advance its authored **patrol** route; if a closed/locked door blocks it, wait and face the door.
5. After all guards move, an active camera executes its printed rotate/hold intent.

Pathfinding uses deterministic breadth-first search with neighbour order `N, E, S, W`. Closed doors block both movement and guard vision; a guard can open only doors the job marks as security-openable, which is itself part of its intent. Guards do not teleport, improvise a route, or gain a movement bonus offscreen.

### Guard phase resolution

When the player presses `Enter`, resolve in this exact order:

1. Reject commit if a modal confirmation is open; otherwise retain the displayed intent snapshot for the report.
2. Decrease existing noise durations; apply any security response that was explicitly armed by the last contract action.
3. Move guards in ascending `guardId` order, executing their snapshot intent. Each move/open-door/wait becomes an incident-log event.
4. If a guard enters the player’s tile, capture immediately.
5. Resolve active camera rotations and alarm door changes.
6. Evaluate every guard/camera cone. If it sees an unhidden player, add one Alarm, write the observer and tile to the log, and set that guard’s `lastSeen` marker for the next forecast.
7. Resolve contract triggers (for example, display theft, keycard collected, timed exhibit transfer, or alarm lockdown) in authored priority order.
8. Test win/loss conditions, refresh all intents, restore player AP to 2, and advance the turn number.

All visibility is calculated after movement against the final board. This removes order ambiguity. If multiple observers see the player, Alarm rises once and the report lists every observer.

## Alarm, capture, and recovery

The **Alarm track** has four visible levels: `0 QUIET`, `1 ALERT`, `2 LOCKDOWN`, `3 CAUGHT`.

| Level | Trigger/result | Player-facing consequence |
|---:|---|---|
| 0 Quiet | Normal starting state. | Standard patrols and exits. |
| 1 Alert | Seen during guard phase, loud forced theft, or one job-specific mistake. | A guard gains a printed last-seen pursuit marker; some objective branches change. |
| 2 Lockdown | Seen again, or a stated mission escalation. | One named exit closes, a listed service route opens/activates, and guards use lockdown patrols. |
| 3 Caught | Seen while already at 2, guard enters player tile, or a deadline explicitly expires. | Job ends; show causal replay. |

An Alarm increase is never a dice roll. The preview panel lists exact post-commit exposure: `COMMIT: G2 will see Atrium tile (6,4) → ALARM 1`.

At Alert, the player can still recover by breaking sight, hiding, using a distraction, or choosing the contract’s contingency objective. At Lockdown, the job remains winnable but should require a new route; it is a change in puzzle state, not a soft game-over.

## Objective system: a heist that changes honestly

Each job has a small finite-state **Contract**. The current directive is prominent at the top of the screen. Upcoming conditional directives are visible in a “Security response” line from the beginning, so the player can plan for them.

```ts
type ObjectiveKind = 'reach' | 'collect' | 'disable' | 'placeDecoy' | 'escape';

interface ObjectiveStep {
  id: string;
  text: string;
  kind: ObjectiveKind;
  target: Point | string;
  completeWhen: ContractPredicate;
  transitions: Array<{
    when: ContractPredicate;
    nextStepId: string;
    announcement: string;
    effects: ContractEffect[];
  }>;
}
```

The engine evaluates transitions in stable content order after every commit and after any immediate `Interact` that can complete a step. Only the step ID, effects, and already-declared conditions determine a transition.

### Example contract: The Blue Sapphires

| Phase | Current directive | Known transition / why it changes |
|---|---|---|
| 1. Prepare | `STEAL THE NIGHT KEY from Gallery A.` | Taking the key wakes the Sapphire case sensor. |
| 2. Acquire | `OPEN THE SAPPHIRE CASE in Gallery B.` | Quiet opening sets `ESCAPE: STREET EXIT`. Forced opening sets Alarm 1 and `ESCAPE: TAKE THE CASE THROUGH THE RESTORATION CHUTE`. |
| 3. Extract | `LEAVE WITH THE SAPPHIRE via the marked exit.` | At Alarm 2, street gates close and the contract visibly switches to `RESTORATION CHUTE → STAFF EXIT`. |

This is the desired “changing objective”: acquisition choices and visible security states alter the escape problem. It is not an opaque random retargeting system. Every job should have 3–5 phases, only one live directive, and at most two branches in Version 1.

### Required fairness rules for contracts

- The contract briefing names all possible exit closures, sensor consequences, and branch triggers in plain language.
- A new directive appears before the player regains control and is recorded in the incident log.
- A branch cannot invalidate all routes; content validation must prove at least one safe/alert/lockdown escape route where that branch is intentional.
- An objective never changes merely because an unseen guard rolled a random value.
- If an asset is dropped, it remains on its exact tile and becomes the current directive; it is never silently reset.

## Content and campaign

The museum is the discreet, slightly strange **Morrow Museum of Small Wonders**. Tone: elegant objects, quiet staff notices, night lighting, no violence. The player is a professional thief attempting clean, contained jobs; guards are obstacles, not targets.

| Job | New lesson | Target / changing objective | Guards / difficulty |
|---:|---|---|---|
| 0: After Hours | Read forecast and hide. | Take a practice tag, leave through the obvious exit. | 1 guard; no alarm failure. |
| 1: Borrowed Light | Tossing a decoy. | Steal a lamp key, then reach a display while its camera is pulled aside. | 2 guards, 1 camera. |
| 2: Blue Sapphires | Quiet vs forced acquisition. | Key → case → normal exit or restoration-chute contingency. | 2 guards, sensor response. |
| 3: The Cartographer’s Case | Doors reshape both paths and cones. | Disable an exhibit grid, steal map, escape through a door-dependent route. | 3 guards, lockable door. |
| 4: Unscheduled Loan | Planned lockdown. | Swap a decoy before a scheduled transfer; missed timing changes the target wing and exit. | 3 guards, moving target. |
| 5: The Quiet Heist | Combine systems. | Acquire two pieces in either order; the first choice determines which exit is monitored. | 4 guards, 2 cameras, multi-stage escape. |

Authored jobs are the campaign. A seed may vary guard names, cosmetic artifact labels, decorative map dressing, and one of a small number of prevalidated patrol variants. Do not generate arbitrary floor plans, patrol routes, or objective text in Version 1.

## Interface and controls

### Semantic visual language

Define this vocabulary as constants near the renderer, with the ASCII fallback displayed in Help and used if Unicode rendering is unreliable.

| Concept | Glyph | ASCII fallback | Text label |
|---|---|---|---|
| Player | `@` | `@` | PLAYER |
| Guard | `G` | `G` | GUARD |
| Guard forecast | `→` | `>` | NEXT |
| Current vision | `·` red | `.` | SEEN NOW |
| Forecast vision | `░` amber | `:` | SEEN ON COMMIT |
| Cover | `▒` | `+` | COVER |
| Door open / closed | `▯` / `▮` | `-` / `#` | OPEN / CLOSED |
| Camera active / jammed | `◉` / `⊘` | `O` / `X` | CAMERA / JAMMED |
| Noise | `♪` | `~` | NOISE Tn |
| Objective | `◇` | `*` | OBJECTIVE |
| Alarm pip | `◆` | `!` | ALERT |
| Safe exit | `⇱` | `E` | EXIT |

Colour is supplementary: current sight must also have a label/texture; a forecast cone must be distinguishable from ordinary floor in monochrome. Guard IDs (`G1`, `G2`) and arrows must remain readable in light themes.

### Full layout (96×30)

```text
                 T H E   Q U I E T   H E I S T                  JOB 03 / 06
 TURN 05   AP ●●   ALARM ◆◇◇◇ QUIET   DECOYS 1   JAMMER 1   OBJ: OPEN SAPPHIRE CASE
┌─ MUSEUM FLOOR ──────────────────────────────────┐ ┌─ SECURITY FORECAST ────────────┐
│  E  .  .  ◉→  ░░░   #   .  .  S                 │ │ G1 PATROL: Gallery A → Atrium  │
│  .  #  ▒  .   ░░░   #   ◎  .  .                 │ │     NEXT SIGHT: (6,3) → (6,6) │
│  @  .  .  .   .     d   .  G2→ .                │ │ G2 NOISE: Storage → (3,6)     │
│  .  .  H  .   ◇     .   .  .  .                 │ │ CAM 1 ROTATE: EAST → SOUTH    │
│  .  .  ♪2 .   .     .   .  .  .                 │ └────────────────────────────────┘
└─────────────────────────────────────────────────┘ ┌─ CONTRACT / INCIDENTS ─────────┐
┌─ ACTION PREVIEW ─────────────────────────────────┐ │ NOW: OPEN SAPPHIRE CASE        │
│ WALK (3,4) → (4,4)  1 AP                          │ │ IF FORCED: ALERT +1, CHUTE RUN │
│ AFTER ACTION: G2 reroutes to noise; Atrium safe.  │ │ T04 G2 investigated Storage    │
│ ENTER: COMMIT SECURITY TURN    U: undo action     │ │ T04 Case sensor remains armed  │
└─────────────────────────────────────────────────┘ └────────────────────────────────┘
  ARROWS/WASD move cursor  ENTER commit  D decoy  I interact  J jam  H help  ESC pause
```

At **80×28**, preserve status, the map, current objective, and the security forecast; place Contract/Incidents/Preview in a tabbed lower panel (`Tab`). Below 80×28, freeze game input and show the standard resize message. Target the full layout at 96×30, but do not require it.

### Controls

| Key | Action |
|---|---|
| Arrow keys / `WASD` | Move cursor / choose adjacent move destination. |
| `Space` | Queue the selected walk or sneak action. |
| `I` | Interact with selected adjacent object/door/exit. |
| `D` | Aim and place a decoy. |
| `J` | Jam selected eligible camera. |
| `H` | Toggle hiding at a hiding spot. |
| `U` | Undo the most recent uncommitted action. |
| `Enter` | Commit the security turn; confirm costly/objective actions. |
| `Tab` | Cycle information panel in compact layout. |
| `?` | Open rules, glyph legend, and guard-priority help. |
| `Esc` | Shared Gamr pause menu. |
| `Q` | Quit from start/end screens; pause during an active job first. |

`U` only rolls back actions from the current uncommitted turn. It cannot erase resolved guard turns, ensuring the game is forgiving while preserving consequence.

## Technical architecture

Use a pure deterministic rules engine and keep terminal concerns out of it. The game controller only maps keys to engine commands, manages overlays/pause/alternate buffer, and renders state.

```text
src/games/the-quiet-heist/
├── index.ts          terminal lifecycle, input mapping, pause/transitions
├── types.ts          serializable state, commands, content interfaces
├── content.ts        six job definitions, text, map templates, objectives
├── grid.ts            points, line of sight, neighbours, BFS, tile helpers
├── forecast.ts        guard priority, intent generation, cone calculation
├── contracts.ts       objective transition predicates and effects
├── engine.ts          createState, reducer, preview/commit resolution pipeline
├── seed.ts            deterministic PRNG and vetted variant selection
├── render.ts          ANSI map/panels, compact layout, overlays, icon constants
├── engine.test.ts     action, commit, alarm, victory/loss regression tests
├── forecast.test.ts   pathing, visibility, priority, tie-breaker tests
├── contracts.test.ts  objective branches and route-validation tests
└── content.test.ts    every job's declared branch/solvability validation
```

### Core state and commands

```ts
type Phase = 'title' | 'briefing' | 'planning' | 'turnReport' | 'jobReport' | 'gameOver' | 'ending';
type AlarmLevel = 0 | 1 | 2 | 3;

interface GameState {
  version: 1;
  seed: number;
  mode: 'tutorial' | 'campaign' | 'jobSelect';
  phase: Phase;
  jobIndex: number;
  turn: number;
  ap: 0 | 1 | 2;
  alarm: AlarmLevel;
  grid: Tile[][];
  player: PlayerState;
  guards: Record<GuardId, GuardState>;
  cameras: Record<CameraId, CameraState>;
  noise: NoiseMarker[];
  contract: ContractState;
  inventory: { decoys: number; jammers: number; asset?: AssetId };
  forecast: ForecastSnapshot;
  pendingActions: PlayerAction[];
  checkpoint: GameStateSnapshot | null;
  incidentLog: Incident[];
  selected: Selection;
  notice: string;
}

type Command =
  | { type: 'queueMove'; to: Point; style: 'walk' | 'sneak' }
  | { type: 'queueInteract'; target: Point }
  | { type: 'queueDecoy'; target: Point }
  | { type: 'queueJam'; cameraId: CameraId }
  | { type: 'queueHide' }
  | { type: 'undoPending' }
  | { type: 'commitTurn' }
  | { type: 'select'; selection: Selection }
  | { type: 'dismissBriefing' | 'dismissReport' | 'restartJob' | 'nextJob' };
```

`applyCommand(state, command)` returns a new state plus structured events. It must not write to the terminal or read wall-clock time. A top-level `validateAction` returns a human-readable reason for every rejected command; the renderer uses the same reason in its preview, so UI and engine cannot disagree.

### Preview and commit model

For a queued action, do the following in an immutable simulation:

1. Validate AP, adjacency/range, target type, and immediate current-vision constraints.
2. Apply only the player action to a cloned planning state.
3. Rebuild guard/camera forecast from that state.
4. Derive warning annotations: predicted sight, route interception, imminent locked exit, contract transition, and alarm result.
5. Store the action/checkpoint only after explicit confirmation.

`commitTurn` starts from the queued state, snapshots the currently displayed forecast, executes the fixed guard phase, applies contract effects, calculates alarm/win/loss, and then creates the next turn’s forecast. The engine must retain `forecastAtCommit` in the incident record so final reports can prove that an outcome was forecast.

### Objective and content validation

Every authored job receives a validation pass during unit tests/build tests:

1. Every map point and object reference is in bounds and on a compatible tile.
2. Every patrol route is traversable under its declared door permissions.
3. Every contract state has a label, completion predicate, at least one transition or success terminal, and no unreachable state.
4. Every declared objective branch has an escape route under the branch’s door/alarm effects.
5. A scripted solution transcript completes the default branch; additional transcripts complete intended alert/lockdown branches where offered.
6. The renderer can show the job’s longest objective and guard explanation without overflowing the compact panel.

This validator is intentionally content-specific rather than an expensive generic stealth solver. A true exhaustive solver is deferred until authored content is stable.

## Test plan

Tests should focus on rules players rely on and on regression-safe job scripts.

| Area | Required assertions |
|---|---|
| Visibility | Wall/closed-door occlusion, cover, camera arcs, current vs forecast distinction. |
| Guard priority | Pursuit overrides noise; noise overrides patrol; tie order is fixed and documented. |
| Forecast contract | A guard/camera performs the exact displayed intent if player state is unchanged. |
| Distractions | Correct range, duration, route, expiration, and post-expiry patrol return. |
| Commit order | Guard move order, capture, camera rotation, exposure, contract transition, then next forecast. |
| Alarm | One rise for multiple observers; lockdown effects appear once; caught conditions are correct. |
| Actions | AP, invalid target reasons, interact effects, uncommitted undo, no undo after commit. |
| Contracts | Quiet, alert, and lockdown objective branches; all visible announcements and route effects. |
| Determinism | Same job + same seed + same command transcript produces byte-equivalent serializable state/events. |
| Campaign | Job advancement, retry preserves seed, scoring/report data, end state. |

Add transcript helpers such as `play(state, [{ type: 'queueMove', ... }, { type: 'commitTurn' }])`. Keep one concise “golden heist” transcript per job to ensure a full clean clear stays valid when maps or content change.

## Balance targets

- A clean solution should finish with 1–3 unused tools or one meaningful tool choice, rather than requiring every item.
- The shortest obvious route should be dangerous; at least one quieter route should exist and be visually inferable.
- A first visibility error should normally mean Alert, not a loss. Capture should require ignored warnings, a blocked escape, or intentional risk.
- A player who reads forecast arrows should never lose to an unshown guard turn, random detection, or secret exit closure.
- Each job introduces one new rule first, then combines it with prior rules only after the player has demonstrated it.
- Use playtest transcripts and job completion metrics to tune patrol positions, tool counts, and extraction deadlines. Do not tune detection through random percentages.

## Delivery plan

### 0 — Paper/engine contract

Finalize tiles, action costs, guard priority, visibility rules, alarm effects, and the first two jobs in `content.ts` data form. Write the player Help copy before renderer work.

**Done when:** another developer can predict a full turn from the specification without reading implementation code.

### 1 — Pure playable vertical slice

Implement `types`, `grid`, `forecast`, `contracts`, and `engine` for Job 0 and Job 1. Include deterministic state creation, queued-action undo, exact forecast snapshots, decoy behavior, alert, job report, and solution transcripts.

**Done when:** tests complete both jobs with a clean transcript and show an explained alert/recovery path.

### 2 — Terminal vertical slice

Implement title/start/briefing/planning/report screens, full and compact renderer, action previews, shared pause menu, Help overlay, resize handling, and alternate-buffer cleanup. Use a 20 FPS render interval only for title/event polish; state advances strictly on commands.

**Done when:** a new player can learn and clear Job 0 at 80×28 with no external instructions.

### 3 — Campaign content

Add Jobs 2–5, all planned contract branches, narrative copy, object behaviours, and content validation/transcripts. Keep the maps authored and small.

**Done when:** the campaign offers a clear progression from patrol reading to objective-contingency planning, with every job solvable in its advertised branches.

### 4 — Polish and balance

Add restrained title glitch, guard/noise/alert visual accents, end-of-job causal replay, score/rank flavour, seeded cosmetic variants, light-theme review, and 80×28 alignment review. Playtest clean, Alert, and Lockdown clears for every job.

**Done when:** all outcomes are legible without colour and every loss report names a visible cause.

### 5 — Integration and release checks

Register the game and export its runner. Run `npm run typecheck`, `npm test`, and `npm run build`; manually verify pause, restart, quit, switch-game, and terminal cleanup paths.

**Done when:** all checks pass and the game leaves no input listener, interval, hidden cursor, or alternate buffer behind.

## Gamr integration

- Export `runTheQuietHeistGame(terminal)` returning `{ stop, isRunning }`.
- Use `getCurrentThemeColor`, `dispatchGameQuit`, `dispatchGameSwitch`, `dispatchGamesMenu`, `PAUSE_MENU_ITEMS`, `renderSimpleMenu`, and `navigateMenu`.
- Add `src/games/the-quiet-heist/index.ts` and register:

  ```ts
  { id: 'the-quiet-heist', name: 'The Quiet Heist', description: 'Predict patrols. Steal the object. Find a new way out.', run: runTheQuietHeistGame }
  ```

- Follow the standard 80×28 minimum-size behaviour and restore the cursor/alternate buffer exactly once from every exit path.
- Reuse `src/games/shared/effects.ts` only for restrained feedback: a decoy ping, an alert flash, a gentle screen shake on capture, and a report popup. Effects may not obscure actionable forecast information.

## Explicit Version-1 non-goals

- Combat, attacks, weapons, guard knockouts, or violence.
- Real-time clocks, twitch movement, audio-required cues, mouse controls, or hidden reaction checks.
- Procedurally generated unvalidated museums, arbitrary guard AI, or random detection percentage.
- Large inventories, crafting, skill trees, persistent upgrades, or online leaderboards.
- Complex civilian crowds, facial recognition, biometric surveillance, or claims of real-world security realism.
- A full sandbox mission editor or a generic solver before the authored campaign proves the core loop.

## Definition of done

The Quiet Heist is ready when a new player can inspect an entire small museum floor, alter visible guard intent with a distraction, understand how an acquisition changes their escape directive, and finish the tutorial without reflexes or hidden rules. Every committed guard/camera action matches its displayed forecast; every objective transition and loss is named in the incident report; quiet, alert, and lockdown routes are content-validated where they exist; the game is readable at 80×28 in light and dark themes; and typecheck, tests, and build pass before the registry entry ships.
