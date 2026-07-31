# Last Train Home — game and implementation plan

## One-line pitch

Run the final evacuation railway through a collapsing disaster zone. Each turn, issue a few emergency orders, then watch every train move one segment while fires, floods, and failures close in. Get people to the safe terminus before the network is cut apart.

The game should feel like a compact railway dispatcher puzzle with visible human stakes: a delayed passenger train is not just lost score; its manifest names the stranded group and its reason for travelling. The challenge is choosing which limited intervention prevents the worst future, not operating trains quickly.

## Product goals

- Make the entire decision space legible from one terminal screen at `80x28` or larger.
- Use discrete turns, not a timer. The player should be able to inspect the map and plan without pressure.
- Make every command a meaningful trade-off: one repair may save a full train but leaves a junction exposed; one evacuation order may overload the safe terminus.
- Keep the rules learnable in a first five-minute run, with depth coming from map topology, train priorities, forecasts, and scarce actions.
- Support deterministic seeds so difficult situations can be replayed and tested.
- Keep the disaster fictional and respectful: no graphic content; focus on logistics, responsibility, and rescue.

## Player fantasy and tone

The player is the night dispatcher at a regional emergency rail desk. Radio updates are spare and practical: “Bridge team reports scour at Marsh Crossing; one more turn at most.” Train names make the stakes specific: `04: Morrow Clinic — 28 patients`, `07: Eastbank School — 46 evacuees`, `12: Supply — water & generators`.

Use a high-contrast railway/control-room aesthetic. The track map is the primary interface; status text is secondary. Cyan or the selected gamr theme is the base colour, with fixed semantic accents:

| Meaning | ASCII / colour suggestion |
|---|---|
| Safe track | `─ │ ┌ ┐ └ ┘ ┬ ┴ ├ ┤ ┼` in theme colour |
| Open station / safe terminus | `O`, `H` in green |
| Train | `>` `<` `^` `v`, followed by a short ID, in bright white or its priority colour |
| Flood/fire/landslide | `≈`, `*`, `#` in blue/red/yellow |
| Closing track | dim track with `!` or amber highlight |
| Closed track | `×` in red |
| Selected junction or train | inverse video |

Avoid relying on colour alone: the glyph and the status panel must always state the hazard and remaining time.

## Core loop

One **turn** represents roughly ten minutes. A campaign is 12 turns plus an optional final extraction turn.

1. **Read the situation.** The player sees every train, its current route, capacity, onboard people/supplies, forecasted closures, and the two nearest hazard advances.
2. **Spend up to two emergency actions.** Select a tile or train and choose an action. The player may also end the action phase early.
3. **Commit the turn.** The simulation resolves in a fixed, readable order:
   1. apply player actions;
   2. move each train at most one track segment;
   3. unload at `H` (the safe terminus) and record rescued people/supplies;
   4. advance disaster fronts and resolve scheduled track closures;
   5. apply derailments/stranding only after movement and closure resolution;
   6. generate an event log and increment the turn.
4. **Reassess.** The new map shows exactly why the state changed. Brief “turn report” messages only pause for severe events (a derailment, a route isolated, or the final turn).

The player wins by reaching the evacuation target by the end of the campaign, or by evacuating every passenger train. They lose immediately if a passenger train derails, if all routes to `H` are cut while passenger trains remain, or if the safe terminus is destroyed/blocked. A run may end with a qualified result (for example, target met but supplies lost), giving score and narrative replay value without weakening the clear fail states.

## Board and network model

### Map scale

Use a logical grid of **17 columns x 11 rows**. Render each logical cell at three terminal columns (`CELL_WIDTH = 3`), yielding a 51-column map plus margins and a 24–27 column dispatch panel. This fits the established minimum of `80x28` and permits a wider panel at `96+` columns.

Each cell is one of:

- `void`: outside the playable railway area.
- `track`: a traversable segment with one or more directions (`N`, `E`, `S`, `W`).
- `station`: a track tile with a name, loading/unloading role, and optional waiting passengers/supplies.
- `junction`: a track tile where the player selects the active exit; it has a switch state and may be jammed.
- `bridge` / `tunnel`: a track tile with a hazard vulnerability and repair state.
- `block`: permanently unavailable terrain.
- `hazard`: an overlay that marks a closed or impassable track.

The initial implementation should use authored maps rather than random geometry. Four map templates give intentional route dilemmas and can each be varied by seeded trains, hazards, and event timing:

| Scenario | Lesson / main tension |
|---|---|
| `River Line` (tutorial) | Switch one junction; repair a bridge before its closure. |
| `Split Valley` | Two branches, one repair crew, passengers versus medical supply train. |
| `Night Freight` | Congestion and station holds; sequencing trains matters. |
| `Last Crossing` | Multiple advancing fronts and a difficult final priority decision. |

Campaign mode selects three scenarios in a seed-derived order, with 8–12 turns each. The first playable version can ship `River Line` and `Split Valley`; the data model must not assume a fixed map count.

### Natural ASCII map rules

Render actual topology rather than a symbolic node graph. A horizontal track has `───`; a vertical track occupies the centre character (` │ `); corners and junctions use box-drawing glyphs based on their `connections` set. The train marker replaces the centre of the cell but preserves the track context, e.g. `─A─` for train `A` on horizontal track and ` A ` on vertical track.

An illustrative frame:

```text
                 LAST TRAIN HOME // TURN 04 OF 10
   EVACUATED  74 / 120 people      ACTIONS  ◆◆      WEATHER: RISING WATER

       N O R T H   R I V E R                         DISPATCH
   ┌───O───┬───≈───O───H                        ◆ Actions: 2
   │       │   !                               1 Switch  (selected junction)
   │  ┌───┘  ┌A┐                              2 Hold    (selected train)
   O  │      │ │                              3 Repair  (bridge / damaged track)
      └───O──┴─┘                              4 Clear   (remove obstruction)
         !                                    
   Eastbank School: 46 aboard A                FORECAST
   Marsh bridge closes after this turn         ! Marsh bridge: closes T5
                                               ≈ water reaches North River T6

   ARROWS/WASD select  ENTER action  1–4 command  SPACE commit turn  H help  ESC pause
```

The exact art may change, but these invariants must remain: a player can locate every train, tell which tracks are usable, see the safe terminus, and read the next two threats without opening another view.

## Trains, stations, and passengers

### Train state

Each train has:

```ts
type TrainKind = 'passenger' | 'medical' | 'supply' | 'engineer';
type Direction = 'N' | 'E' | 'S' | 'W';

interface Train {
  id: string;                     // A–F: stable short map label
  name: string;                   // Morrow Clinic, Eastbank School, etc.
  kind: TrainKind;
  position: Point;
  heading: Direction;
  plannedExit: Direction | null;  // route choice at next junction
  people: number;                 // 0 for freight/engineer trains
  supplies: number;               // rescue score / later objective
  priority: 1 | 2 | 3;
  status: 'moving' | 'held' | 'blocked' | 'stranded' | 'evacuated' | 'derailed';
  holdUntilTurn: number | null;
}
```

Passenger and medical trains carry people; supply trains can satisfy a scenario’s hospital/water objective; the engineer train enables a stronger repair action but is itself another moving constraint. The first version needs only passenger, medical, and supply trains. Leave `engineer` defined for the expansion path but do not expose it until its rules are implemented.

### Movement and routing

- Every non-held, non-evacuated train moves exactly one valid segment per committed turn.
- A train’s `plannedExit` is used when it enters a junction. If absent, use the junction’s active switch exit; if neither is valid, it becomes `blocked` rather than choosing unpredictably.
- The player can issue **Route** to a selected train to choose its next junction exit. This consumes no action only before the train has moved this turn; it is an order, not a teleport.
- If two trains target the same cell, movement resolves by priority, then by fixed train ID. The other train stays in place and receives a visible `WAITING FOR A` event. This deterministic tie-break prevents hidden randomness.
- Head-on swaps are forbidden; both trains stay in place unless one has been held before the commit. This makes passing loops and holds useful.
- A train may not enter a closed, hazard-overlaid, or occupied cell.
- Arrival at `H` removes the train on the same turn, adds its people/supplies to totals, and opens capacity for following trains.

Do not simulate acceleration, braking distance, or continuous collisions. One-tile movement and explicit contention rules are readable in a terminal and create enough scheduling puzzles.

### Passenger stakes without punitive surprise

Each passenger train receives a short manifest line generated from scenario data: number, group, and destination reason. Examples: `46 Eastbank students`, `28 clinic patients`, `19 residents from Low Ward`. The log reports rescues by name and count. This contextualises decisions but never hides mechanical priority; people counts and the evacuation target are always visible.

## Emergency actions

The player starts each turn with **two action points (AP)**. AP do not carry over. The action menu is context-sensitive, but its four stable slots prevent control overload:

| Key | Action | Cost | Target | Effect / trade-off |
|---|---|---:|---|---|
| `1` | Switch | 1 AP | Junction | Changes the active outgoing branch. A switch cannot be altered after a train has entered it that turn. |
| `2` | Hold | 1 AP | Train | Prevents that train moving this turn; can avoid a conflict but may let a closure catch it. |
| `3` | Repair | 1 AP | Damaged bridge/tunnel/track | Cancels one pending closure or reopens a recently closed repairable tile. One repair crew limits use to once per turn. |
| `4` | Clear | 1 AP | Blocked tile | Removes an obstruction for the next movement phase; cannot clear disaster terrain. |
| `R` | Route | 0 AP | Train | Set its exit at the next junction; only permitted before commit. |
| `Space` | Commit | — | — | Resolve the turn. |

`Repair` is the defining emergency action. It must display whether it buys one turn, permanently stabilizes a tile, or reopens it for only one turn. For the initial ruleset, use the most readable version: **repair removes the scheduled closure and marks the tile `reinforced`; a reinforced tile ignores its next hazard advance but can still be closed by a second hit.** This gives a meaningful but not absolute intervention.

At least one early scenario should force a choice between repairing a bridge and holding a train to avoid a junction conflict. The best answer should depend on passenger counts and downstream routes, rather than being a fixed puzzle trick.

## Disaster system

Hazards are a deterministic event deck defined in each scenario. Each event has a turn, target, kind, and warning window:

```ts
interface HazardEvent {
  id: string;
  turn: number;
  warningTurns: number;           // normally 1–2
  kind: 'flood' | 'fire' | 'landslide' | 'signal-failure';
  target: Point;
  effect: 'close-track' | 'block-junction' | 'obstruct-track';
  repairable: boolean;
}
```

- At `turn - warningTurns`, the target gets an amber `!` overlay and appears in the forecast panel.
- On its resolution turn, the track closes or the junction becomes unusable unless the relevant action neutralized it.
- Some events can originate from a hazard front. To remain understandable, a front advances only along an authored path, one tile per turn; it never performs hidden pathfinding.
- Late scenarios may include a seeded **radio uncertainty** event: two possible danger tiles are shown, and the event resolves to one deterministically from the seed. Do not add this before the base version is proven fun.

The rule ordering is deliberate: trains move before hazards resolve, allowing a train to escape a “closes after this turn” warning; a train that waits on that tile is stranded. The renderer must state this timing in tutorial text and in the hazard description.

## Scoring and endings

Primary success is the people target, not point optimization.

```text
rescueScore = evacuatedPeople * 10 + deliveredSupplies * 3
              + remainingAPAtFinish * 5 + turnsRemaining * 15
penalty = strandedPeople * 20 + derailments * 250
finalScore = max(0, rescueScore - penalty)
```

- **Gold extraction:** every passenger evacuated and the primary supply objective met.
- **Successful extraction:** evacuation target met, no derailments.
- **Partial extraction:** campaign clock ends with some people stranded; show an honest report, then allow replay. This is not a “win” for the menu/achievement state.
- **Failure:** immediate loss conditions described in the core loop.

End screens should show saved people, lost/stranded people, supplies delivered, turns used, hardest decision log, and seed. `R` restarts with the same seed; a normal new campaign gets a new seed.

## Onboarding and difficulty

### Start screen

```text
P: CAMPAIGN     T: TUTORIAL     Q: QUIT
```

The start screen explains only the two-phase loop: “Issue two emergency orders. Then commit the turn.”

### Tutorial: River Line

Use scripted micro-goals and suppress nonessential events:

1. Move the selection cursor and inspect a train.
2. Switch the only junction to send `A` toward `H`.
3. Commit; observe one segment of movement.
4. Read a bridge closure forecast and repair it.
5. Hold a second train to avoid a conflict.
6. Evacuate both trains; show the report.

Contextual callouts should occupy the dispatch panel, not cover the map. `H` opens a concise permanent help card. Tutorial state belongs in game state, so it can be unit tested and replayed consistently.

### Difficulty ramp

- Scenario 1: one junction, one closure, two trains, no obstructions.
- Scenario 2: branch choice, one repair, a supply objective, three trains.
- Scenario 3: shared track conflict, closure chain, four trains, limited turn budget.
- Scenario 4: two fronts, uncertain radio report, hard passenger-versus-supplies choice.

Do not add new action types after `Clear`. Increase challenge with the same verbs and tighter network topology.

## State machine and data design

Separate pure simulation state from controller/UI state. Follow the `dead-letter-department` model: an engine with commands, immutable-or-explicitly-mutating deterministic rules, a renderer, and a thin terminal controller.

```ts
type Phase =
  | 'start'
  | 'briefing'
  | 'planning'
  | 'turnReport'
  | 'tutorial'
  | 'ending'
  | 'gameOver';

interface GameState {
  version: 1;
  seed: number;
  phase: Phase;
  scenarioIndex: number;
  scenario: ScenarioState;
  turn: number;
  maxTurns: number;
  actionPoints: number;
  repairUsedThisTurn: boolean;
  board: Tile[][];
  trains: Record<string, Train>;
  selected: Selection;
  forecast: HazardEvent[];
  resolvedEvents: HazardEvent[];
  evacuatedPeople: number;
  evacuatedSupplies: number;
  targetPeople: number;
  eventLog: LogEntry[];
  lastResolution: TurnResolution | null;
  tutorialStep: number | null;
}

type Command =
  | { type: 'startCampaign'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'dismissBriefing' }
  | { type: 'moveSelection'; dx: number; dy: number }
  | { type: 'selectNextTrain'; direction: 1 | -1 }
  | { type: 'switchJunction'; at: Point }
  | { type: 'holdTrain'; trainId: string }
  | { type: 'repair'; at: Point }
  | { type: 'clear'; at: Point }
  | { type: 'setRoute'; trainId: string; exit: Direction }
  | { type: 'commitTurn' }
  | { type: 'dismissReport' }
  | { type: 'toggleHelp' }
  | { type: 'restart'; seed?: number };
```

`applyCommand(state, command)` returns `{ state, events }`. `commitTurn` is the only command allowed to move trains, alter turn count, or resolve hazards. Its return should include a structured `TurnResolution`, so the controller can add visual effects later without placing game rules in `index.ts`.

### Resolution pseudocode

```ts
function resolveTurn(state: GameState): TurnResolution {
  requirePlanningPhase(state);
  const result = createResolution();

  // 1. Planned holds and repairs are already recorded by commands.
  // 2. Determine every requested move from the pre-move board.
  const intents = activeTrains(state)
    .map(train => movementIntent(state, train))
    .sort(byPriorityThenStableId);

  // 3. Accept only valid, non-conflicting moves in deterministic order.
  for (const intent of intents) resolveMoveIntent(state, intent, result);

  // 4. Remove arrivals and account for their people/supplies.
  resolveTerminusArrivals(state, result);

  // 5. Resolve scheduled closures/front movement for this turn.
  resolveHazards(state, result);

  // 6. Mark trains with no viable future departure as stranded; evaluate loss.
  resolveStrandingAndOutcome(state, result);

  state.turn++;
  state.actionPoints = 2;
  state.repairUsedThisTurn = false;
  state.lastResolution = result;
  return result;
}
```

Never iterate raw object keys when order influences results; sort train IDs or use the priority/id comparator. Use a small local seeded PRNG for scenario selection/variation, and store the seed in state. Do not call `Math.random()` after `createState`.

## File layout

```text
src/games/last-train-home/
├── index.ts          # Terminal controller, inputs, pause integration, 50 ms render loop
├── types.ts          # Public game/domain types and command/result contracts
├── content.ts        # Manifest text, radio lines, tutorial copy, ending copy
├── scenarios.ts      # Authored maps, initial trains, hazard decks, objectives
├── seed.ts           # Small deterministic PRNG / seed derivations
├── engine.ts         # createState, applyCommand, turn resolution, win/loss checks
├── render.ts         # Pure renderFrame(state, cols, rows, theme, glitchFrame)
└── engine.test.ts    # Rule-focused unit tests
```

Register it in `src/games/index.ts` with:

```ts
{ id: 'last-train-home', name: 'Last Train Home', description: 'Dispatch the last evacuation trains through a collapsing rail network.', run: runLastTrainHomeGame }
```

Keep it in the active `games` array if it is release-ready; otherwise add it to `archivedGames` only with a clear reason. Update `README.md` and its Controls section when registering it publicly.

## Terminal controller and controls

The controller follows existing games:

- Enter alternate buffer and hide cursor on launch; restore both in `stop()`.
- Render at 20 FPS only for title glitch/polish; no game time advances from the render loop.
- Require a minimum `80x28` terminal and show `Need 80x28 / Have CxR` if smaller.
- Use `PAUSE_MENU_ITEMS`, `navigateMenu`, `renderSimpleMenu`, and `dispatchGameQuit` / `dispatchGamesMenu` / `dispatchGameSwitch`.

Controls in planning phase:

| Input | Behaviour |
|---|---|
| Arrow keys / `WASD` | Move map selection one logical tile. |
| `Tab` / `Shift+Tab` | Cycle through trains for fast inspection. |
| `1` | Switch at selected junction. |
| `2` | Hold selected train. |
| `3` | Repair selected repairable tile. |
| `4` | Clear selected obstruction. |
| `R` | Open/cycle valid exits for selected train’s next junction. |
| `Space` / `Enter` | Commit turn; Enter also dismisses briefing and reports. |
| `H` | Toggle help card. |
| `Esc` | Pause (outside start/ending screens). |
| `Q` | Quit from start/end; while playing, reserve it for pause-menu quit for consistency. |

Action attempts that are invalid must not spend AP. Provide a one-line reason: `REPAIR UNAVAILABLE: line is already closed by flood` or `HOLD UNAVAILABLE: train A has arrived`.

## Rendering specification

`renderFrame` should clear the screen (`\x1b[2J\x1b[H`) and build ANSI-positioned output in an array, as the current deeper games do. It must be a pure function of game state, terminal dimensions, theme colour, and glitch frame.

### Screen regions

1. **Header (rows 1–3):** title, turn, evacuation total/target, AP pips, general threat label.
2. **Map (rows 5–16):** authored grid at 3 columns per cell; labels only on station cells or in a below-map legend.
3. **Dispatch panel (right):** selected item details, four action labels with enabled/disabled state, the next two forecast events.
4. **Log / stakes (rows 18–23):** latest 3 event lines and selected train manifest. At 96+ columns, show these side-by-side.
5. **Controls (final two rows):** terse, phase-sensitive input hint.

Use a selected-tile inverse-video outline and a small direction arrow for a train’s planned exit. If a train is at risk, show `!` next to both the train and its detail panel. Keep animation restrained: optional single-frame flashes for a closure, an arrival, or a blocked move; the simulation itself remains stepped.

## Testing strategy

Write engine tests before or alongside each resolution rule. No terminal/ANSI output needs exhaustive snapshot testing initially; favour pure behavior tests.

Required tests:

1. `createState(seed)` produces identical scenario, trains, forecast, and map for identical seeds.
2. Train moves one legal segment on a simple line and unloads at `H`.
3. Switch state changes the next junction exit and does not teleport a train.
4. A hold uses one AP, blocks movement only for the current turn, and cannot make AP negative.
5. Repair cancels/reinforces the intended scheduled closure and cannot be used twice in one turn.
6. A warning appears before the matching closure turn; trains move before that closure resolves.
7. Two trains claiming a tile resolve by priority then stable ID; the other reports blocked.
8. Head-on swap is rejected deterministically.
9. Closed/occupied tracks cannot be entered.
10. Passenger evacuation updates totals and removes the train exactly once.
11. All specified immediate loss conditions transition to `gameOver`.
12. Replaying a seed with the same command sequence yields equal `GameState` after every turn.

Add render-focused unit tests only for small pure helpers such as connection glyph selection, ANSI stripping/visible width, and map-cell text. Manually verify `80x28`, `96x30`, and a light theme during implementation.

## Implementation sequence

### Milestone 1 — Domain skeleton (no UI polish)

1. Create `types.ts`, `seed.ts`, and `scenarios.ts` with `River Line` and data validation helpers.
2. Build `createState`, selection movement, `applyCommand`, AP validation, and the basic planning/briefing phases in `engine.ts`.
3. Add tests for seed determinism, legal movement, and terminus evacuation.

**Exit criterion:** a test can complete a two-train River Line extraction using commands only.

### Milestone 2 — Turn simulation and hazards

1. Implement intent generation, occupancy/conflict resolution, holds, switch routing, and deterministic ordering.
2. Implement forecast overlays, scheduled closures, repair/reinforcement, obstruction clear, stranding, victory/failure.
3. Add `Split Valley` and the conflict/hazard tests.

**Exit criterion:** all 12 required engine tests pass and the two maps have viable, nontrivial routes under their scripted hazards.

### Milestone 3 — Readable terminal experience

1. Build the pure ASCII renderer: tracks/glyphs, trains, hazards, right panel, warnings, logs, all phase screens.
2. Add `index.ts` controller, input mapping, pause menu integration, alternate-buffer cleanup, and minimum-size fallback.
3. Add start/tutorial/report/end copy in `content.ts`.

**Exit criterion:** a new player can complete the tutorial without external instructions at `80x28`.

### Milestone 4 — Campaign and balance

1. Add the other authored scenarios, scenario sequencing, difficulty tuning, and event/manifest variation from the seed.
2. Add end-report qualification and replay seed display.
3. Run ten seeded dry runs per scenario; document a known successful command sequence for each while ensuring more than one solution exists where intended.

**Exit criterion:** campaign has a reliable difficulty slope, no unwinnable seeded setup, and a full run takes roughly 12–20 minutes.

### Milestone 5 — Release integration

1. Register `runLastTrainHomeGame` in `src/games/index.ts` and add the public menu description.
2. Update `README.md` game and controls tables if the game is active.
3. Run `npm run typecheck`, `npm test`, and `npm run build`.
4. Manually run through tutorial, a loss, a partial extraction, a full extraction, pause/restart/quit, and a resize check.

## Acceptance checklist

- A full map, forecast, AP count, selected train/tile, and evacuation target are visible at `80x28`.
- Pressing no key never changes game state; only `commitTurn` advances the simulation.
- Every action says why it succeeded or failed and spends AP only on success.
- Every hazard gives its promised warning, and its resolution order is visible in the rules/help.
- Train conflict results are deterministic and described in the event log.
- Runs are reproducible from their displayed seed.
- Tutorial, campaign, pause, restart, game-over, and victory all restore terminal state correctly.
- Typecheck, tests, and build succeed before the game is added to the active lineup.

## Explicit non-goals for version 1

- No real-time clock, train physics, freehand track construction, or signal-block simulator.
- No procedural map generator; authored topology is needed for fair, readable rescue dilemmas.
- No permanent save/load or external leaderboard.
- No hidden random disaster outcomes during a committed turn.
- No audio requirement; events must communicate fully through text and map changes.

These constraints deliberately protect the game’s core: compact, understandable emergency decisions with a strong “one more train” narrative pull.
