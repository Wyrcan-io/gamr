# Time Capsule — Game Design and Implementation Plan

## 1. Executive summary

**Time Capsule** is a turn-based narrative puzzle game about reliving the same five minutes before a disaster. The world resets exactly; the player does not. At the end of each loop, a portable temporal capsule can carry three things into the next version of the day:

- one **Memory**: a relationship, promise, confession, or emotional truth;
- one **Object**: a physical item removed from the reset;
- one **Clue**: an objective fact the protagonist can act on or prove.

Each category has one slot. A newly selected anchor replaces the previous anchor in that category. The central puzzle is therefore not just discovering facts, but assembling the right memory/object/clue loadout for one decisive loop.

The game should be implemented as a deterministic reducer-driven terminal game, following the architecture already used by the repository's newer narrative titles. The first release should contain one polished episode, **The Last Bell**, with three solution routes and endings. The engine and content schema should make later episodes primarily an authoring task rather than an engine rewrite.

Recommended registry metadata:

```ts
{
  id: 'time-capsule',
  name: 'Time Capsule',
  description: 'Keep three truths. Rewrite five minutes.',
  maturity: 'workshop',
  pace: 'turn-based',
  difficulty: 2,
  session: 'campaign',
  run: runTimeCapsuleGame,
}
```

An individual loop takes roughly 60–120 seconds of real play. A first episode should take 20–35 minutes and usually 4–7 loops.

## 2. Research basis and repository fit

This plan is based on the current repository rather than an external engine assumption:

- `src/games/index.ts` requires a controller with `stop()` and `isRunning`, plus a direct game import and registry entry.
- Recent state-heavy games such as `ghost-shift`, `the-quiet-heist`, `dead-letter-department`, and `stack-trace` split their code into typed state, deterministic engine logic, content, renderer, controller, and Vitest coverage.
- `ghost-shift` demonstrates authored timelines, evidence, finite resources, and a campaign flow.
- `the-quiet-heist` demonstrates free planning actions followed by explicit time advancement.
- `dead-letter-department` demonstrates content validation and deterministic generated content.
- The shared pause menu, game transitions, theme utilities, alternate-buffer cleanup, and the `80x28` narrative-game layout should all be reused.

No external research is required to settle the implementation. The difficult decisions are specific to this codebase and to the supplied persistence premise. External comparisons would not change the state model, terminal interaction, or acceptance criteria.

## 3. Product vision

### Player fantasy

The player is not a time-travelling action hero. They are an archivist of impossible moments: someone who learns a tiny world intimately, decides what deserves to survive, and turns a failed five minutes into one exact intervention.

### Design pillars

1. **Persistence is the puzzle.** The capsule loadout must change which actions are possible, not merely add lore or bonuses.
2. **The loop is deterministic and fair.** The same action at the same time produces the same result. Failure teaches something reproducible.
3. **Every reset creates a meaningful choice.** The player chooses what to keep, replace, or deliberately forget.
4. **Knowledge is visible.** The journal, timeline, locked-action reasons, and anchor board make deductions inspectable without external notes.
5. **Repetition is compressed.** Previously read scenes can resolve in a short “echo” form; the strategic time cost remains, but repeated prose does not.
6. **Episodes are authored data.** New places, people, schedules, discoveries, and endings should not require controller or renderer changes.

### Non-goals for the first release

- No real-time five-minute timer.
- No parser or free-text command input.
- No procedural generation of puzzle-critical facts.
- No combat, reflex challenge, or random fail chance.
- No unrestricted inventory or permanent accumulation of every discovery.
- No cross-process save system in the MVP; repository games currently do not expose a storage adapter. State remains versioned and serializable so persistence can be added later.

## 4. The core game loop

```text
Read the current world
        ↓
Choose an action with a visible time cost
        ↓
The clock advances and scheduled events resolve
        ↓
Discover a memory, object, or clue
        ↓
Noon arrives (or the player ends the loop early)
        ↓
Keep/replace one anchor in each category
        ↓
The world resets with those three exceptions
        ↺
```

The player wins an episode by entering a loop with a compatible three-anchor loadout, then performing the required actions inside the ten-turn time budget.

### Exact time model

- The loop covers **11:55:00 through 12:00:00**.
- It contains **10 action windows**, each worth 30 seconds.
- `tick = 0` represents 11:55:00; `tick = 9` represents 11:59:30.
- At the beginning of a loop, tick-0 events are already visible.
- A costly action resolves against the current snapshot, then advances the clock by one tick.
- After advancing, scheduled events for the new tick resolve in stable authored order, actors move, and discovery triggers are checked.
- Advancing beyond tick 9 resolves the noon catastrophe and enters the capsule phase.
- Browsing the map, journal, timeline, help, or action descriptions is free.
- Travel, conversation, waiting, taking/using an object, and manipulating machinery normally cost one tick. An authored action may cost two ticks but must display that cost before confirmation.

There is no wall-clock pressure. This preserves the “five-minute day” fiction while making deductions, accessibility, tests, and terminal play reliable.

### Manual reset

After the first tutorial loop, the player may choose **End Loop** from the capsule panel. It requires confirmation. The current tick's world does not advance further; the episode's reset event is summarized and all valid discoveries from that loop remain eligible. This prevents waiting through a solved or ruined route without turning reset into an accidental keystroke.

## 5. The clean persistence rule

### The three anchor slots

| Slot | What it represents | Typical gameplay gate | Example |
|---|---|---|---|
| Memory | Subjective continuity between the protagonist and another person | special dialogue, trust, recognizing a lie, fulfilling a promise | “Ivo admitted where the manual cutoff is.” |
| Object | One physical thing carried outside the reset | open, repair, trade, install, reveal | Ceramic relay link |
| Clue | An objective fact recorded by the capsule | code, timing, proof, deduction, safe sequence | Bell current is safe on the third chime |

At a reset, each category's candidate list contains:

1. the currently anchored entry, if it still exists and is eligible;
2. entries of that category acquired during the loop that just ended.

Historical discoveries that were neither kept nor reacquired are **not** selectable. This makes route planning matter.

### Keep, replace, or empty

For each slot the player may:

- keep the current anchor;
- replace it with a candidate acquired this loop;
- empty it deliberately.

The capsule screen previews the consequences before commitment. Replacements are applied only when the player confirms all three categories, so navigation can never accidentally destroy an anchor.

### Object identity and the duplication rule

An anchored object is moved through time; it is not copied.

Reset logic first recreates the episode baseline, then removes the anchored object's original spawn and places exactly one instance in the player's inventory. If an anchored object is consumed, installed, surrendered, or destroyed during a loop, it is not automatically eligible at the next reset unless an authored rule returns it to the capsule.

This rule prevents duplicate keys and makes physical persistence legible:

```text
baseline world + anchored object overlay
= object absent from original location + object present in inventory
```

### Journal versus actionable knowledge

The journal permanently records that the player once discovered an entry, but a non-anchored record is shown as a **faded echo**. It includes a short lead such as “I once understood the bell pattern” without exposing the exact actionable payload.

Only an active anchor satisfies `hasAnchor` conditions. This resolves the common time-loop problem where the human player remembers a code that the reset protagonist should not remember. There is no free-text code entry that could bypass this rule.

### State persistence matrix

| State | Persists across loops? | Notes |
|---|---:|---|
| Active Memory/Object/Clue anchors | Yes | Maximum one of each |
| Discovered journal IDs | Yes | Faded when not active; not usable as gates |
| Mastered scene IDs | Yes | Enables compressed replay text only |
| Loop number and ending unlocks | Yes | Campaign/report information |
| Current room, actor locations, local flags | No | Rebuilt from episode baseline |
| World items and inventory | No | Except the one anchored object overlay |
| Doors, machines, alarms, injuries | No | Episode baseline wins |
| Scheduled-event cursor and current tick | No | Restart at tick 0 |
| Current-loop event log | No | A short last-loop summary may be retained in the report |
| Cosmetic frame/glitch state | No | Controller-only state |

## 6. Player actions and information model

### Focus model

The screen has three focusable panels:

- **Map**: select an adjacent room and confirm travel.
- **Actions**: select an interaction available in the current room.
- **Journal**: inspect discoveries, leads, timeline events, and anchors for free.

`Tab` cycles panels. Arrow keys or WASD move the selection. `Enter` confirms. Number keys `1–5` activate visible actions directly. Every costly action includes a `[30s]` or `[60s]` label; free information actions include `[free]`.

### Standard action families

- **Travel** to an adjacent room.
- **Talk** to an actor currently present.
- **Inspect** a world feature.
- **Take / drop / give / use / install** an item.
- **Wait** for 30 seconds.
- **Recall** an anchored memory in a conversation.
- **Present** an anchored clue as proof.
- **Invoke echo** to replay a mastered scene in compressed form.
- **End loop** with confirmation.

An unavailable action may still appear if its absence teaches the player. It must show a concrete reason, for example:

```text
× OPEN RELAY CABINET [30s]
  Needs Ivo's trust or the witness key.
```

Avoid generic text such as “You cannot do that yet.”

### Inventory

The protagonist has two ordinary carried-item spaces during a loop. The anchored Object begins in one of those spaces. Inventory pressure is secondary, not the main puzzle; two slots prevent collecting the entire map while still allowing one temporary tool alongside the anchor.

Dropping an anchored object is allowed and clearly marked. Ending the loop without that object in the protagonist's possession normally makes it ineligible to remain anchored.

## 7. Episode 1: The Last Bell

### Premise

At 11:55, assistant archivist **Rowan Vale** stands in the Meridian Civic Archive as staff prepare to open a hundred-year time capsule at noon. The ceremony instead sends a destructive pulse through the clock tower. Rowan wakes at 11:55 holding a small experimental capsule that can preserve three anchors.

The catastrophe is not caused by a single villain. Director Senn ordered engineer **Ivo Mar** to bypass a damaged relay rather than delay the ceremony. Curator **Mara Vale** concealed evidence of the order, fearing the archive would be closed. Courier **Jun Oris** unknowingly delivered the replacement part to the wrong cabinet. Different combinations of trust, matter, and proof can save the archive while producing different public truths.

### Locations

```text
            [ROOF / BELL]
                  |
[RECORDS] — [ATRIUM] — [GALLERY]
                  |
             [WORKSHOP]
                  |
               [VAULT]
```

Travel along one edge costs 30 seconds. Locked edges remain visible with their requirement.

### Authored timeline

| Tick | Time | World event |
|---:|---:|---|
| 0 | 11:55:00 | Ceremony preparation; Rowan begins in the Atrium with Ivo and Jun nearby. |
| 1 | 11:55:30 | Jun moves toward the Gallery with the mislabeled relay parcel. |
| 2 | 11:56:00 | Mara leaves Records and intercepts Director Senn in the Atrium. |
| 3 | 11:56:30 | The bell performs a three-chime rehearsal; the roof ammeter briefly shows the safe phase. |
| 4 | 11:57:00 | Workshop power browns out; Ivo leaves for the Roof unless redirected. |
| 5 | 11:57:30 | The Records security shutter closes. |
| 6 | 11:58:00 | Mara enters the Vault with the witness key. |
| 7 | 11:58:30 | The bypass relay begins to arc. A prepared player can install or disable it. |
| 8 | 11:59:00 | Warning lamps activate; unpersuaded actors abandon their posts. |
| 9 | 11:59:30 | Final intervention window. |
| 10 | 12:00:00 | The bell/capsule pulse occurs unless an ending condition has been satisfied. |

The engine must not reveal hidden actor motives merely because their movement is scheduled. The timeline records observable events; exact routes become visible only after Rowan witnesses them or acquires the relevant clue.

### Anchor set

The first episode should ship with nine major anchors: three in each category.

| ID | Category | Discovery route | What it enables |
|---|---|---|---|
| `mem-ivo-confession` | Memory | Witness the workshop brownout, then speak with Ivo alone before he reaches the Roof | Ivo trusts Rowan's warning and reveals/operates the manual cutoff |
| `mem-mara-oath` | Memory | Return the red ledger to Mara and hear why she hid it | Mara yields authority over the vault and supports public disclosure |
| `mem-jun-promise` | Memory | Prevent the Gallery display from falling on Jun | Jun reroutes the parcel immediately in a later loop |
| `obj-ceramic-link` | Object | Open Ivo's relay cabinet after correctly diagnosing the chime phase | Repairs the bypass relay |
| `obj-witness-key` | Object | Earn Mara's trust or intercept her Vault handoff | Opens the sealed chronal housing without damaging it |
| `obj-chronal-shard` | Object | Use the witness key during the arc window and remove the unstable core fragment | Allows the loop mechanism to be destroyed or displaced |
| `clue-bell-phase` | Clue | Observe the tick-3 chimes and inspect the scorched roof ammeter | Identifies the only safe intervention window |
| `clue-senn-order` | Clue | Combine the Records memo with the Atrium argument | Proves that Director Senn ordered the unsafe bypass |
| `clue-vault-map` | Clue | Inspect the old floor plan and the Vault's false wall in one loop | Reveals the isolation channel around the capsule |

Smaller non-anchor discoveries may update the journal or master a scene, but should not bloat the capsule selection list.

### Dependency shape

The canonical route deliberately teaches the three-slot system:

```text
observe rehearsal + inspect ammeter
              ↓
      CLUE: bell phase
              ↓
diagnose relay for Ivo during next loop
        ↙                 ↘
MEMORY: Ivo confession    OBJECT: ceramic link
        \                 /
         final repair loop
```

The player can keep `clue-bell-phase`, then acquire both the memory and object in the following loop. At that reset, all three canonical anchors are available together.

### Final routes and endings

Each ending requires one compatible anchor from each category. This makes the final loadout readable and validates the core hook.

#### 1. Mend the Bell — stable/canonical ending

- Memory: `mem-ivo-confession`
- Object: `obj-ceramic-link`
- Clue: `clue-bell-phase`

Rowan recalls Ivo's cutoff confession, installs the ceramic link, and calls the safe third-chime window. Ivo and Rowan break the feedback loop without destroying the archive. The official cover-up remains unresolved, leaving a lead toward the disclosure route.

#### 2. Open the Record — truth ending

- Memory: `mem-mara-oath`
- Object: `obj-witness-key`
- Clue: `clue-senn-order`

Rowan persuades Mara to unlock the chronal housing, isolates it with the witness key, and broadcasts Senn's signed order through the ceremony system. The archive survives and the bypass becomes public.

#### 3. Break the Capsule — severance ending

- Memory: `mem-jun-promise`
- Object: `obj-chronal-shard`
- Clue: `clue-vault-map`

Jun reroutes the ceremony crowd, Rowan reaches the isolation channel, and the shard is removed from the pulse path. The loop ends permanently, but much of the century capsule's contents are lost. This is not labelled the “bad” ending; it is a defensible sacrifice.

Ending conditions must require both the three-anchor loadout and a valid sequence of in-loop actions. Possessing the answer is not itself victory.

### A valid canonical final-loop sequence

One solution should be explicitly captured in a test fixture:

1. Start with the three anchors already loaded; the ceramic link is in inventory.
2. Travel Atrium → Workshop `[30s]`.
3. Install the anchored ceramic link `[30s]`.
4. Travel Workshop → Atrium → Roof `[60s]`.
5. Arm the relay during the phase identified by the anchored clue `[30s]`.
6. Confirm Ivo's cutoff on the third chime `[30s]`.
7. Resolve `ending-mend-bell` before noon.

The remaining four ticks give the player tolerance for one navigation mistake or optional conversation.

## 8. Onboarding and hint design

### First-loop teaching sequence

The first loop should be partially staged, not a separate tutorial episode:

1. The start screen explains only movement, actions, and visible time costs.
2. The player can complete three ordinary actions before an abbreviated first catastrophe.
3. The first reset explains the three categories with one simple candidate already highlighted.
4. The next loop runs the full ten ticks and unlocks the journal/timeline.
5. Replacing an anchor is introduced only when the player has a genuine replacement choice.

Do not front-load the condition system, all nine anchors, or all endings.

### Hint ladder

`H` opens optional hints. Each lead has three authored levels:

1. **Direction:** names a room or person to investigate.
2. **Timing:** names the relevant event window.
3. **Requirement:** names the missing anchor or action explicitly.

Hints do not consume time or reduce an ending. The report records hints used for players who care about mastery, but experimentation should never be punished with a worse narrative outcome.

After two consecutive loops without a new major discovery, the UI may softly highlight an unused lead. It must not automatically reveal level-2 or level-3 text.

### Repetition controls

- A mastered conversation uses its short `echoText` by default; the full transcript remains in the journal.
- Previously observed scheduled events render as a single log line unless they change the current state.
- Holding Enter is not required for dialogue paging; one press advances one compact page.
- Manual reset is available after onboarding.
- The current anchor loadout is always visible, avoiding trips into a separate menu just to remember it.

## 9. Screen design and terminal visual language

### Minimum layout

Target `80x28`, with a wider layout taking advantage of extra columns but never requiring them.

```text
 T I M E   C A P S U L E       LOOP 04   11:57:30   ◷◷◷◷◷·····
 ┌─ ARCHIVE MAP ─────────────────┐ ┌─ WORKSHOP ──────────────────┐
 │          [ROOF]               │ │ ● IVO MAR                   │
 │             │                 │ │                             │
 │ [REC]─>[ATRIUM]─[GALLERY]     │ │ 1. Inspect relay      [30s] │
 │             │                 │ │ 2. Install ceramic ◆  [30s] │
 │        [WORKSHOP]             │ │ 3. Talk to Ivo        [30s] │
 │             │                 │ │ × Open vault hatch           │
 │          [VAULT]              │ │   Needs the witness key.     │
 └───────────────────────────────┘ └──────────────────────────────┘
 ┌─ CAPSULE ──────────────────────────────────────────────────────┐
 │ ◉ MEMORY  Ivo's confession   ◆ OBJECT  Ceramic link           │
 │ ◇ CLUE    Bell phase         ✦ NEW     Scorched ammeter        │
 └────────────────────────────────────────────────────────────────┘
 T07  Workshop power browns out. Ivo looks toward the roof.
 Tab focus  ↑↓ select  Enter act  J journal  H hint  Esc pause
```

The clock meter should show both exact time and remaining action windows. Never rely on color alone for urgency.

### Capsule selection screen

Use a dedicated full-screen phase after reset:

```text
 THE DAY IS GONE. THREE THINGS MAY CROSS.

 [MEMORY]              [OBJECT]              [CLUE]
 ▣ Ivo's confession    ▣ Ceramic link        ▣ Bell phase
   Mara's oath           Witness key           Senn's order

 Current → staged replacement is shown before confirmation.
 Tab category  ↑↓ choose  Enter stage  Backspace restore  C commit
```

### Semantic icon vocabulary

| Concept | Primary glyph | ASCII fallback | Meaning without color |
|---|---:|---:|---|
| Loop/reset | `↺` | `R` | day restarts |
| Time cost | `◷` | `T` | action advances clock |
| Memory | `◉` | `M` | subjective anchor |
| Object | `◆` | `O` | physical anchor/item |
| Clue | `◇` | `C` | objective anchor |
| Anchored | `▣` | `A` | currently crosses reset |
| New discovery | `✦` | `*` | acquired this loop |
| Actor | `●` | `P` | person present |
| Room | `□` | `#` | map node |
| Locked/unavailable | `×` | `X` | failed precondition |
| Scheduled warning | `!` | `!` | imminent world event |
| Resolved/success | `✓` | `+` | completed requirement |

Keep glyphs one cell wide in supported fonts and centralize them in the renderer with fallbacks. Use the theme color for borders and selection, cyan/blue for memory, amber for objects, violet for clues, red for imminent reset, and green for resolved conditions. Labels and shapes must remain sufficient in monochrome and light themes.

### Effects

- Use a restrained title glitch during the start screen and final two ticks.
- Pulse the clock border once when a costly action advances time.
- Flash the capsule slots at reset; do not shake the entire screen during ordinary narrative actions.
- Use a brief success accent or shared sparkle effect only when an episode ending resolves.
- Render at 20 FPS for compatibility, but gameplay state changes only on commands.

## 10. State architecture

### File structure

```text
src/games/time-capsule/
├── index.ts                 # Terminal lifecycle, keys, pause menu, transitions
├── types.ts                 # State, content, conditions, effects, commands
├── engine.ts                # Reducer, time advancement, reset/anchor algorithm
├── selectors.ts             # Visible actions, journal rows, clock/anchor helpers
├── render.ts                # ANSI renderer and overlays
├── validate.ts              # Episode reference/content validation
├── content.ts               # Episode registry
├── episodes/
│   └── the-last-bell.ts     # First complete authored episode
├── engine.test.ts
├── validate.test.ts
└── render.test.ts
```

Keep puzzle rules out of `index.ts`. The controller should translate keys into typed commands, apply the reducer, and render.

### Suggested state types

```ts
export type AnchorKind = 'memory' | 'object' | 'clue';
export type Phase =
  | 'start'
  | 'briefing'
  | 'exploring'
  | 'capsule'
  | 'report'
  | 'ending';

export interface AnchorLoadout {
  memory: string | null;
  object: string | null;
  clue: string | null;
}

export interface CampaignProgress {
  anchors: AnchorLoadout;
  discovered: string[];
  masteredScenes: string[];
  unlockedEndings: string[];
  loopsCompleted: number;
  hintsUsed: Record<string, number>;
}

export interface LoopState {
  number: number;
  tick: number;
  playerRoom: string;
  inventory: string[];
  actorRooms: Record<string, string>;
  worldItems: Record<string, string | null>;
  flags: Record<string, boolean | number | string>;
  discoveriesThisLoop: string[];
  masteredThisLoop: string[];
  eventLog: Incident[];
  resolvedEventIds: string[];
}

export interface CapsuleDraft {
  memory: string | null;
  object: string | null;
  clue: string | null;
}

export interface GameState {
  version: 1;
  seed: number;
  mode: 'tutorial' | 'campaign';
  phase: Phase;
  episodeId: string;
  progress: CampaignProgress;
  loop: LoopState;
  capsuleDraft: CapsuleDraft | null;
  focus: 'map' | 'actions' | 'journal';
  selection: number;
  overlay: 'none' | 'journal' | 'timeline' | 'help';
  notice: string;
  endingId: string | null;
}
```

Arrays are sufficient for the small ID sets; selectors may create `Set`s locally. Keep state JSON-serializable and versioned.

### Command API

```ts
export type Command =
  | { type: 'start'; mode: 'tutorial' | 'campaign'; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'setFocus'; focus: GameState['focus'] }
  | { type: 'moveSelection'; delta: -1 | 1 }
  | { type: 'travel'; roomId: string }
  | { type: 'perform'; actionId: string }
  | { type: 'wait' }
  | { type: 'openOverlay'; overlay: Exclude<GameState['overlay'], 'none'> }
  | { type: 'closeOverlay' }
  | { type: 'endLoop' }
  | { type: 'stageAnchor'; kind: AnchorKind; anchorId: string | null }
  | { type: 'restoreAnchor'; kind: AnchorKind }
  | { type: 'commitAnchors' }
  | { type: 'requestHint'; leadId: string }
  | { type: 'restartEpisode' }
  | { type: 'nextEpisode' };

export interface CommandResult {
  state: GameState;
  events: EngineEvent[];
}
```

The engine should clone the input state once at the start of `applyCommand`, mutate that working copy internally, and return it. This avoids accidental mutation of caller-owned snapshots without requiring a fully persistent data structure.

## 11. Declarative episode content

### Condition grammar

Avoid arbitrary callbacks in content. A small typed condition language makes episodes testable and validates references.

```ts
export type Condition =
  | { op: 'all'; conditions: Condition[] }
  | { op: 'any'; conditions: Condition[] }
  | { op: 'not'; condition: Condition }
  | { op: 'phase'; phase: Phase }
  | { op: 'room'; roomId: string }
  | { op: 'tick'; min?: number; max?: number }
  | { op: 'actorAt'; actorId: string; roomId: string }
  | { op: 'hasAnchor'; anchorId: string }
  | { op: 'hasItem'; itemId: string }
  | { op: 'flag'; key: string; equals: boolean | number | string }
  | { op: 'discoveredThisLoop'; anchorId: string }
  | { op: 'endingUnlocked'; endingId: string };
```

### Effect grammar

```ts
export type Effect =
  | { op: 'setFlag'; key: string; value: boolean | number | string }
  | { op: 'moveActor'; actorId: string; roomId: string }
  | { op: 'discover'; anchorId: string }
  | { op: 'masterScene'; sceneId: string }
  | { op: 'addItem'; itemId: string }
  | { op: 'removeItem'; itemId: string }
  | { op: 'placeItem'; itemId: string; roomId: string }
  | { op: 'log'; text: string; kind: Incident['kind'] }
  | { op: 'notice'; text: string }
  | { op: 'endLoop'; reason: string }
  | { op: 'finishEpisode'; endingId: string };
```

### Episode definition

```ts
export interface EpisodeDefinition {
  id: string;
  title: string;
  synopsis: string[];
  loopTicks: number;
  startRoom: string;
  rooms: RoomDefinition[];
  actors: ActorDefinition[];
  items: ItemDefinition[];
  anchors: AnchorDefinition[];
  actions: ActionDefinition[];
  scheduledEvents: ScheduledEvent[];
  endings: EndingDefinition[];
  leads: LeadDefinition[];
}

export interface ActionDefinition {
  id: string;
  label: string;
  roomId: string;
  actorId?: string;
  cost: 0 | 1 | 2;
  visibleWhen?: Condition;
  availableWhen?: Condition;
  blockedReason?: string;
  fullText: string[];
  echoText?: string;
  effects: Effect[];
}
```

The content file owns prose, schedules, conditions, effects, anchor metadata, hints, and endings. The generic engine owns time, reset, selection, evaluation, and command legality.

### Content validation

`validateEpisode()` should run in tests and return human-readable errors for:

- duplicate IDs across each namespace;
- missing room, actor, item, anchor, action, ending, or lead references;
- invalid room graph edges;
- event ticks outside `0..loopTicks`;
- action costs outside the supported range;
- mismatched anchor IDs and categories;
- an anchored object's missing baseline spawn;
- ending requirements that do not include one memory, one object, and one clue for this episode;
- unreachable direct dependencies detectable from the condition/effect graph;
- missing `blockedReason`, `fullText`, or levelled hints on progression-critical actions;
- more text lines than the renderer's content budget without pagination.

Validation is not a full automated puzzle solver. Final routes should also be captured as command-sequence integration tests.

## 12. Engine rules and ordering

### Costly command resolution

```ts
function performCostlyAction(state: GameState, action: ActionDefinition): void {
  assertExploring(state);
  assertVisibleAndAvailable(state, action);

  applyEffects(state, action.effects);
  markSceneMastery(state, action);

  for (let step = 0; step < action.cost; step += 1) {
    if (state.phase !== 'exploring') break;
    advanceOneTick(state);
  }
}

function advanceOneTick(state: GameState): void {
  state.loop.tick += 1;

  if (state.loop.tick >= activeEpisode(state).loopTicks) {
    resolveNoon(state);
    return;
  }

  resolveScheduledEvents(state, state.loop.tick); // source order
  applyActorSchedules(state, state.loop.tick);    // actor definition order
  evaluateTriggeredDiscoveries(state);
  evaluateEndings(state);                         // ending priority order
}
```

If an action itself finishes the episode, do not advance into the catastrophe. If an action ends the loop, stop processing remaining cost steps.

### Reset algorithm

```ts
function commitCapsule(state: GameState): GameState {
  const episode = activeEpisode(state);
  const nextProgress = applyValidatedDraft(state.progress, state.capsuleDraft);

  // Journal and mastery are permanent meta-records.
  mergeUnique(nextProgress.discovered, state.loop.discoveriesThisLoop);
  mergeUnique(nextProgress.masteredScenes, state.loop.masteredThisLoop);
  nextProgress.loopsCompleted += 1;

  const nextLoop = createBaselineLoop(episode, state.loop.number + 1);
  overlayAnchoredObject(nextLoop, nextProgress.anchors.object, episode);

  return {
    ...state,
    phase: 'exploring',
    progress: nextProgress,
    loop: nextLoop,
    capsuleDraft: null,
    focus: 'actions',
    selection: 0,
    overlay: 'none',
    notice: describeArrival(nextProgress.anchors),
  };
}
```

Before `applyValidatedDraft`, confirm that every staged candidate is either the current anchor or was acquired this loop. For an object, also confirm that it is physically eligible at reset. Reject invalid drafts without partial state changes.

### Determinism

- Puzzle-critical content uses authored schedules and stable array order.
- A seed may choose cosmetic prose variants only if every variant conveys identical actionable information.
- IDs, not display text, drive rules.
- No `Math.random()` in engine resolution.
- Given the same initial seed and command sequence, state and engine events must deep-equal.

## 13. Controller and input implementation

`index.ts` should follow the current narrative-game lifecycle:

1. Capture `getCurrentThemeColor()` during rendering, not as puzzle state.
2. Enter the alternate buffer and hide the cursor.
3. Render every 50 ms for the subtle glitch/clock effects.
4. Change game state only in the key listener through `applyCommand`.
5. Use `PAUSE_MENU_ITEMS`, `navigateMenu`, and `renderSimpleMenu` unchanged.
6. Keep pause state and pause-menu selection in the controller, outside the deterministic game state.
7. On stop, clear intervals, dispose the key listener, restore the cursor, reset ANSI styles, and leave the alternate buffer.
8. Use `dispatchGameQuit`, `dispatchGamesMenu`, and `dispatchGameSwitch` for transitions.

Suggested keys:

| Key | Action |
|---|---|
| Arrows / WASD | Move selection within focused panel |
| Tab / Shift+Tab | Cycle panel focus |
| Enter | Confirm selected travel/action/anchor |
| `1–5` | Trigger a visible action shortcut |
| Space | Wait 30 seconds when exploring |
| `J` | Journal |
| `T` | Observed timeline |
| `H` / `?` | Hint/help |
| `C` | Open capsule/end-loop confirmation or commit capsule draft |
| Backspace | Restore current anchor while drafting |
| Escape | Shared pause menu / close overlay |
| `Q` | Quit only from start, ending, or pause flow |

Do not let a gameplay `Q` immediately discard a run from the exploration screen.

## 14. Renderer implementation

Build rendering from small functions rather than one large interpolated string:

```ts
renderStart(...)
renderBriefing(...)
renderGameChrome(...)
renderMapPanel(...)
renderActionPanel(...)
renderCapsuleBar(...)
renderClock(...)
renderEventLog(...)
renderJournalOverlay(...)
renderCapsulePhase(...)
renderReport(...)
renderPauseOverlay(...) // controller appends shared menu
```

Use an ANSI-aware `visibleLength()`/`stripAnsi()` helper when clipping or centering. Clip every authored line to its panel width and paginate long transcript text. At less than `80x28`, clear the screen and show exact required/current dimensions plus a directional resize hint.

The standard renderer should show:

- current loop and exact fictional time;
- remaining tick meter;
- current room, nearby actors, exits, and selected focus;
- all visible actions with cost or blocked reason;
- all three current anchors at all times;
- newest discovery and latest incident;
- controls appropriate to the current phase.

## 15. Testing strategy

### Unit tests: persistence and reset

- A reset clears tick, room, flags, actor positions, ordinary inventory, event log, and resolved events.
- Memory and clue anchors persist only when kept in the draft.
- An anchored object appears once in inventory and is absent from its baseline world spawn.
- Replacing an object restores the old object's baseline spawn in the following loop.
- A consumed or surrendered object cannot be kept unless explicitly returned to the capsule.
- A historical but unreacquired faded entry cannot be newly selected.
- Capsule commit is atomic when one staged candidate is invalid.
- Category mismatches are rejected.

### Unit tests: time and actions

- Free selection, journal, timeline, help, and hint commands do not advance time.
- Travel and standard interactions advance exactly one tick.
- Two-tick actions resolve event ordering correctly.
- Scheduled events fire once, in source order.
- An ending resolved by an action prevents the noon catastrophe.
- Manual reset enters the capsule phase without losing this-loop discoveries.
- Locked actions return a useful event/notice and do not consume time.

### Determinism tests

- Same seed and command list produce deep-equal states.
- Cosmetic render frames never affect engine state.
- Restarting an episode recreates the identical baseline.

### Content tests

- `validateEpisode(THE_LAST_BELL)` returns no errors.
- Every ending ID has title, report text, and exactly one required anchor per category.
- Every major anchor has a discovery effect and a journal entry.
- Every progression-critical blocked action has a reason and three hint levels.

### Solution integration tests

Write one explicit command sequence for each ending:

- discovery route(s) acquire the required candidates;
- capsule drafts accept the intended loadout;
- final route resolves before tick 10;
- the expected ending unlocks and no other ending wins first.

Also test near-misses:

- correct object and clue but wrong memory;
- correct three anchors but missed timing window;
- final action one tick late;
- replacing a required anchor immediately before the final loop.

### Renderer and controller tests

- Default, briefing, exploring, capsule, report, ending, and undersized phases render without throwing.
- ANSI-stripped lines fit at `80x28`.
- Selected, blocked, new, and anchored states remain distinguishable with colors stripped.
- Default and a light theme remain readable under manual inspection.
- Stop is idempotent and restores cursor/alternate-buffer state.

### Required verification commands

```sh
npm run typecheck
npm test
npm run build
```

## 16. Implementation milestones

### Milestone 0 — Content paper prototype

- Finalize the ten-tick timeline, map graph, nine anchors, and three ending routes.
- Walk every discovery and final route by hand using a tick table.
- Ensure every required anchor can be reacquired after replacement.

**Exit criterion:** three complete routes fit the clock and no dependency is circular.

### Milestone 1 — Engine contract

- Add `types.ts`, `engine.ts`, and minimal `the-last-bell.ts` content.
- Implement conditions, effects, costly action ordering, and deterministic baseline creation.
- Add core time/action tests.

**Exit criterion:** a headless command sequence advances through a loop deterministically.

### Milestone 2 — Capsule persistence vertical slice

- Implement discoveries, candidate eligibility, staged loadouts, atomic commit, reset partitioning, and object overlay/removal.
- Add persistence invariants and duplication tests.

**Exit criterion:** a test can discover one entry of each type, carry them through reset, and use all three as conditions.

### Milestone 3 — Playable terminal shell

- Add `index.ts`, shared pause integration, inputs, lifecycle cleanup, and a minimal `80x28` renderer.
- Register the game as `workshop` in `src/games/index.ts`.

**Exit criterion:** the game launches from the menu, plays through repeated loops, pauses, switches games, and exits cleanly.

### Milestone 4 — Complete The Last Bell

- Author all rooms, actors, scheduled events, actions, anchors, journal text, hints, and three endings.
- Add scene mastery and echo text.
- Add solution-route integration tests and content validation.

**Exit criterion:** all three endings are reachable from a fresh campaign with no debug commands.

### Milestone 5 — Visual-language and usability pass

- Apply the semantic glyph vocabulary and ASCII fallbacks.
- Add clock/capsule accents, start-title glitch, reset transition, and ending celebration.
- Test default/light themes, `80x28`, and a wide terminal.
- Run several blind playthroughs focused on time-cost clarity and anchor replacement comprehension.

**Exit criterion:** a new player can explain why something did or did not survive a reset and can identify their next lead without external notes.

### Milestone 6 — Release hardening

- Run typecheck, full tests, and build.
- Fix controller cleanup and transition edge cases.
- Reclassify maturity only after playtest issues are closed.

**Exit criterion:** no failing checks, no known soft locks, and all acceptance criteria below are met.

## 17. Scope estimate

Approximate first-release size:

| Area | Estimate |
|---|---:|
| Types and content grammar | 150–250 lines |
| Generic engine/selectors/validation | 500–750 lines |
| Episode 1 content | 450–700 lines |
| Renderer and controller | 450–650 lines |
| Tests | 350–550 lines |
| Total | roughly 1,900–2,900 lines |

The episode prose can increase this without increasing engine complexity. The implementation should remain split across files rather than becoming a single 2,000-line `index.ts`.

## 18. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Player remembers a non-anchored clue | Apparent rule contradiction or sequence break | No free-text solution entry; active-anchor gates; faded journal separates player history from protagonist recall |
| Reset becomes repetitive | Players abandon before synthesis | Echo text, mastered scenes, manual reset, compact event log, deterministic fast inputs |
| Three categories feel cosmetically identical | Persistence hook lacks texture | Category-specific gates: trust/dialogue, physical manipulation, objective proof/timing |
| Combinatorial content explosion | Episodes become impossible to author/test | One slot per category, nine major anchors, three authored final triples, declarative conditions |
| Object duplication across reset | Broken logic and exploits | Baseline removal plus single inventory overlay; invariant tests |
| Players accidentally waste time | Puzzle feels arbitrary | Visible costs, explicit confirm, free inspection, no time charge on invalid actions |
| Hidden event ordering causes confusion | Correct-looking plans fail | Fixed resolution order, observable timeline, before/after notices, integration tests |
| Generic content DSL becomes over-engineered | Delays the actual episode | Implement only listed condition/effect primitives; add new operations when a real episode requires them |
| No cross-process save in MVP | Long campaign progress can be lost | One episode is 20–35 minutes; clearly state session behavior; keep versioned JSON-serializable progress for a later host adapter |

## 19. Definition of done

The first release is complete when:

- The player can traverse a deterministic ten-turn five-minute loop.
- Time advances only on explicitly labelled actions.
- One Memory, one Object, and one Clue can be kept or replaced at reset.
- Anchored objects never duplicate and can be consumed meaningfully.
- The journal records past discoveries without making inactive anchors actionable.
- The Last Bell contains nine major anchors and three tested ending routes.
- At least one ending requires all three anchor categories during the final action sequence.
- All locked progression actions explain their unmet condition.
- A player can recover from every failed plan by resetting; there are no permanent soft locks.
- The game is fully usable at `80x28`, under a light theme, and with ASCII fallbacks.
- The shared pause menu and all gamr transitions work.
- Controller cleanup restores the cursor and alternate buffer.
- Content validation, engine tests, solution tests, typecheck, and build all pass.

## 20. Post-MVP episodic expansion

Once the engine is stable, new episodes should vary what the same three categories mean rather than adding more slots:

- **The Flooded Platform:** retain a commuter's promise, an emergency crank, and a tide-table discrepancy.
- **Ward Seven:** retain a patient's recognition, a medicine vial, and a monitor rhythm.
- **The Empty Broadcast:** retain a caller's voice, a reel of tape, and a station frequency.

An episode is ready for production when it has:

1. a ten-tick observable timeline;
2. a compact room graph;
3. three to five recurring actors;
4. three anchors per category;
5. at least two valid final triples;
6. a command-sequence test for every ending;
7. a reason each category could not simply be replaced by another.

Do not add capsule capacity as routine progression. The one-of-each constraint is the game's identity. Later episodes may temporarily jam, invert, or threaten a slot, but the normal rule should remain stable enough that players can reason about it across the campaign.
