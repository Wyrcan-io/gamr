# Containment Protocol — Full Game & Implementation Plan

## Product decision

**Containment Protocol is a turn-based containment-management game about learning and using explicit environmental rules under a shrinking power budget.** The player is the overnight control officer at the Halcyon Annex, a research station whose four containment chambers have begun to fail. Every creature reacts to three visible inputs—light, sound, and the proximity of the station's lone field technician—and every reaction is deterministic.

The player promise is:

> “I do not need to defeat the unknown. I need to make it understandable long enough to keep everyone alive.”

It should feel tense and uncanny, but never arbitrary. Horror comes from watching a known rule become difficult to satisfy when another room needs the opposite condition, the generator falters, or the technician must enter a corridor. The player loses because they made an observable trade-off too late, not because an unseen die roll decided an anomaly was angry.

Version 1 is a 20–35 minute, six-shift campaign, a 3–6 minute tutorial, and seeded **Night Watch** challenge runs. The game has no real-time countdown: the station advances only when the player explicitly commits a cycle, moves the technician, or triggers a facility action.

## Why this concept fits Gamr

The terminal can make a small control room unusually legible: room boxes, lock meters, status lamps, a floor plan, and a terse incident log communicate a whole management puzzle without needing animation-heavy art. The design also complements the active lineup:

| Existing game | Primary verb | Containment Protocol's distinct verb |
|---|---|---|
| Packet Panic | Route | **Stabilize** conflicting systems |
| Dead Letter Department | Inspect | **Experiment** on visible rules |
| Signal//Noise | Tune / locate | **Configure** rooms and move a human risk |
| Last Train Home | Dispatch | **Contain** escalating hazards |
| Rogue Ledger | Draft | **Exploit** learned behavioural constraints |

The internal game-direction research recommends compact, fully visible, turn-based systems with deterministic explanation and replayable seeds. This plan follows that direction: a small board, complete state on screen, authored rule combinations, and no reflex test.

## Design pillars

1. **Rules, not monsters.** Each anomaly has one or two short conditional behaviours. Its dossier, telemetry, and observed changes make the rule inferable and then confirmable in plain language.
2. **A single shared environment creates real trade-offs.** Light, sound, technician location, door seals, and generator capacity cannot satisfy every chamber at once.
3. **The technician is a precious variable, not an action hero.** Proximity is a controllable input with path costs and risk; entering a room is never a combat sequence.
4. **Failure is explained.** Threat changes list their cause in the incident log. The end report names the exact breach condition and the last safe alternative.
5. **Tension without a timer.** Committing a cycle advances all rooms, planned station events, and battery drain. Reading, configuring controls, opening Help, and reviewing the log are free.
6. **Readable terminal horror.** Colours, symbols, labels, and meters all carry information; no essential state depends only on colour, flicker, or a frightening sound effect.

## Session shape

| Beat | Player activity | Intended feeling | Typical duration |
|---|---|---|---:|
| Briefing | Read facility fault and the two known facts for new anomaly. | Professional unease | 15–30 s |
| Observe | Inspect chamber telemetry and run a safe comparison. | Curiosity | 30–60 s |
| Diagnose | Identify the condition that raises or lowers pressure. | “I understand it.” | 30–90 s |
| Stabilize | Configure rooms, route the technician, and commit cycles. | Controlled tension | 2–4 min |
| Incident | Adapt when power, routes, or a second anomaly changes. | Improvisation | 30–90 s |
| Report | See evidence, breaches avoided, and the next complication. | Closure | 15–30 s |

The tutorial must teach this loop in under six cycles. A first campaign should be completable without restarting, while high ranks reward low cycle count, few emergency seals, and confirmed research.

## Core loop

1. Read the shift brief: station fault, active anomalies, any known rule fragment, and announced events.
2. Inspect each chamber's current condition and the last reaction in the incident log.
3. Freely set the next cycle's lighting, speaker mode, and selected door seal. These controls show their power demand before commitment.
4. Move the field technician if proximity is needed. Movement is an explicit committed action and advances the station once per room crossed.
5. Optionally use a diagnostic probe or emergency facility action; both list their risk and cost before confirmation.
6. Commit a **Cycle**. The engine evaluates every anomaly from the same stable snapshot, applies their pressure changes, then applies announced facility events.
7. Turn newly observed outcomes into a confirmed rule, use that rule to keep pressure down, and survive the shift's required number of cycles.
8. Receive a report, select a limited facility upgrade, and continue to the next shift.

The meaningful question is rarely “what key should I press?” It is “which chamber can tolerate a bad condition for one cycle while I satisfy this other condition?”

## The station model

### Floor plan

Version 1 uses a fixed, deliberately small graph. It is enough for proximity and routing decisions while always fitting in a terminal.

```text
              [A] Atrium Cell —— [B] Bell Cell
                    |                  |
  [G] Generator —— [H] Service Hub —— [C] Cold Cell
                                       |
                                  [D] Deep Cell
```

- `A–D` are containment rooms. An anomaly never changes rooms in Version 1; it attempts to cross its own threshold when its pressure reaches maximum.
- `H` is the technician's normal safe position and the place from which emergency power can be reset.
- `G` is not a playable room, but a generator fault can reduce capacity or disable a circuit.
- Graph distance from the technician to a containment room is calculated with breadth-first search. The UI reports it as `IN`, `ADJ`, or `REMOTE`, never asks the player to count edges.
- A technician may occupy a chamber only when its door is unsealed. This lets door state matter without adding a separate line-of-sight system.

Keeping anomalies in their own rooms is an important scope decision. A roaming-enemy simulation would hide causality, complicate the renderer, and turn the game into pathfinding. The pressure track expresses an escape attempt clearly and keeps the puzzle about containment conditions.

### Room controls

Each containment room has three persistent environmental controls plus a one-cycle door seal. The player can change light and audio settings freely before the next committed action; the pending station demand is shown immediately.

| Control | Values | Cost / constraint | What it means |
|---|---|---|---|
| Lamp | `DARK`, `DIM`, `BRIGHT` | 0 / 1 / 2 grid power | A local, unambiguous light level. |
| Speaker | `SILENT`, `HUSH`, `WHITE`, `TONE` | 0 / 1 / 1 / 2 grid power | A local sound category, not a volume slider. |
| Door | `OPEN`, `SEALED` | Seal costs 1 battery at cycle start; technician cannot enter | A temporary hard barrier and a visible risk trade-off. |
| Field technician | `IN`, `ADJ`, `REMOTE` for each room | Move costs one cycle per graph edge | The proximity input each anomaly observes. |

The four sound modes are semantic categories, not simulated audio:

- `SILENT`: no imposed sound.
- `HUSH`: active dampening; cancels speaker noise, but cannot cancel an anomaly's own sound.
- `WHITE`: broad, non-patterned masking noise.
- `TONE`: a stable, repeating test tone.

Anomaly data may test only these named values. The game never expects the player to reason about an undisclosed numeric decibel threshold.

### Shared resources and loss conditions

| Resource | Range | Purpose |
|---|---:|---|
| Grid power | `0–10` available each cycle | Pays lamps and speakers; overloaded configurations shed circuits predictably. |
| Battery | `0–6` | Pays seals, probes, and emergency actions; regained only by a rare upgrade/event. |
| Station integrity | `0–6` | Lost when an anomaly breaches; at 0, the run ends. |
| Cycle budget | shift-specific | A shift ends successfully when the countdown reaches 0 with no active breach. |
| Research | `0–2` per shift | Earned for confirming a rule; spent only between shifts on an upgrade choice. |

At the start of each committed cycle, demand is evaluated in fixed priority order: life-support base load, `SEALED` doors, lamps, then speakers. If demand exceeds available power, the engine disables the lowest-priority configured circuits in this deterministic order: `TONE`, `WHITE`, `BRIGHT`, then `DIM`, scanning rooms `D → A`. The UI marks every shed circuit with `SHED` before the anomaly phase. This makes overload a visible tactical choice, never a surprise.

An anomaly breach subtracts one integrity and locks that room in `BREACH` for the rest of the shift. The player may still finish the shift if integrity remains, but cannot earn a perfect report. At integrity zero the run ends. Campaign shifts do not require a flawless run; this allows players to learn difficult combinations without replaying everything.

## Anomaly rules and readable discovery

### Pressure track

Every anomaly has a pressure value from `0` to `6`.

| Pressure | State | Meaning |
|---:|---|---|
| 0–1 | `SETTLED` | Safe; offers an occasional research observation. |
| 2–3 | `RESTLESS` | Warning state; its telemetry begins to look wrong. |
| 4–5 | `CRITICAL` | Breach is one or two harmful cycles away. |
| 6 | `BREACH` | The room is lost and integrity falls by one. |

On each cycle, a rule calculates one pressure delta from the condition snapshot. The normal range is `-2` to `+2`; no hidden random component exists. A sealed door prevents the final `5 → 6` breach for that cycle, but pressure remains at 5 and the seal consumes battery. This is a tactical delay, not a permanent solution.

Each anomaly has a **primary trigger** (the condition that destabilizes it) and a **countercondition** (a known way to settle it). Some have a second, late-campaign interaction to prevent the game becoming rote. The renderer shows the current reaction label, delta, and causal icon after every cycle—for example, `☼ BRIGHT: -2 | ◉ TECH IN: +1`.

### Evidence model

The player starts each new anomaly with a short dossier clue and a list of unknown tests. The game records one observation per cycle:

```ts
interface Observation {
  cycle: number;
  roomId: RoomId;
  input: ConditionSnapshot;
  reactionIds: string[];
  pressureBefore: number;
  pressureDelta: number;
}
```

A rule is confirmed when the player has caused either:

- its explicitly authored safe and unsafe test outcomes, or
- one unmistakable signature outcome (`+2` / `-2`) whose dossier identifies the stimulus.

Confirmation is deterministic and has no probability. Until a rule is confirmed, the panel says `EVIDENCE: 1/2`, gives its neutral-language clue, and preserves the exact logged observations. On confirmation, the panel writes the actual rule in plain language, such as **“The Glass Niche advances in darkness; bright light reduces pressure by 2.”** It is acceptable for an observant player to act on the rule before the label appears; confirmation rewards testing, not guessing.

### Version 1 anomaly roster

The roster is authored, not a random grammar. Every entry can be understood from on-screen evidence alone.

| ID / glyph | Dossier clue | Primary behaviour | Counterplay / complication | Introduced |
|---|---|---|---|---:|
| `GLASS NICHE` `◇` | “It is never where the light finds it.” | `DARK` gives `+2`; `DIM` gives `+1`. | `BRIGHT` gives `-2`. Baseline tutorial rule. | T0 |
| `THE CHOIR` `≋` | “Do not let it hear itself.” | `WHITE` or `TONE` gives `+2`. | `HUSH` gives `-1`; silence is neutral. Its own hum is only flavour. | S1 |
| `THE GUEST` `◉` | “It becomes attentive when attended.” | Technician `IN` gives `+2`; `ADJ` gives `+1`. | `REMOTE` gives `-1`. Makes routing a risk. | S2 |
| `ASH MOTH` `✦` | “The bright chamber attracts it to the door.” | `BRIGHT` gives `+2`. | `DIM` gives `-1`; `DARK` is neutral. Conflicts with Glass Niche during a lighting fault. | S3 |
| `HOLLOW WIRE` `⌁` | “A tone completes its circuit.” | `TONE` gives `+2`. | `WHITE` gives `-2`. Tests sound category, not simply noise. | S3 |
| `MIRROR FOLD` `◫` | “It wants someone close, but not inside.” | Technician `REMOTE` gives `+1`; `IN` gives `+2`. | `ADJ` gives `-2`. Requires holding the technician in a corridor. | S4 |
| `THE KEEPER` `▣` | “It sleeps only behind a closed door.” | `OPEN` gives `+2`. | `SEALED` gives `-2`, but costs battery; `HUSH` prevents its late-cycle escalation. | S4 |
| `VIOLET STATIC` `≈` | “The lamps hear it before the speakers do.” | `BRIGHT + TONE` gives `+2`; either alone is neutral. | `DIM + WHITE` gives `-2`. First compound rule. | S5 |
| `THE WITNESS` `?` | “It reacts to the conditions used to hide another.” | Copies the highest positive reaction in an adjacent active chamber. | Copies the lowest negative reaction if technician is `ADJ`. Finale rule; source reaction is named. | S6 |

The exact names and prose may change during writing, but the input/effect table is the design contract. Do not add an anomaly with an effect that the renderer cannot name, meter, or log.

### Rule evaluator

Rules are ordered data, not hand-written branches distributed through input code. A simple condition DSL is enough for Version 1.

```ts
type Predicate =
  | { kind: 'lamp'; is: LampMode }
  | { kind: 'audio'; is: AudioMode }
  | { kind: 'proximity'; is: Proximity }
  | { kind: 'door'; is: DoorMode }
  | { kind: 'all'; of: Predicate[] }
  | { kind: 'any'; of: Predicate[] };

interface BehaviourRule {
  id: string;
  when: Predicate;
  pressureDelta: -2 | -1 | 1 | 2;
  reaction: string;
  evidenceKey: string;
  priority: number;
}

function evaluateAnomaly(
  anomaly: AnomalyState,
  snapshot: ConditionSnapshot,
  context: EvaluationContext,
): EvaluationResult {
  // Apply all matching authored rules in ascending priority, clamp total to [-2, 2],
  // then return the named reaction trace used by both the renderer and evidence system.
}
```

The evaluator must use a full immutable cycle snapshot. `THE WITNESS` therefore reads already-calculated reaction results from its declared neighbour, never evaluation order by accident. Compound rules must specify whether they replace or add to a basic rule; Version 1 should prefer a single result per anomaly per cycle and use explicit `exclusiveGroup` fields to make that choice testable.

## Turn resolution and fairness contract

### Phases

```text
start → modeSelect → briefing → working → cycleReport → shiftReport
      ↘ gameOver ↗                ↘ upgrade ↗          ↘ ending
```

`working` is the only active containment phase. `cycleReport` is a short, dismissible incident overlay after a committed action; it prevents a rapid key press from hiding why state changed.

### One committed cycle

```text
1. Validate the selected action and the pending room configuration.
2. If moving, move technician exactly one graph edge; otherwise retain position.
3. Build a single condition snapshot: lamp/audio/door states, distances, capacity.
4. Apply deterministic circuit shedding and append SHED notices.
5. Evaluate every non-breached anomaly against that same final snapshot.
6. Apply pressure deltas and collect named reaction traces.
7. Consume seal battery; block any 5 → 6 threshold breach for this cycle only.
8. Resolve breaches, integrity loss, and locked rooms.
9. Resolve the announced shift event (fault advance, repair completion, etc.).
10. Update evidence from the snapshot and reaction trace.
11. Decrement remaining shift cycles; build an incident report; check end conditions.
```

Every step is represented in the `CycleResult` returned by the pure engine. A renderer must never recompute a pressure delta. This is what makes incident logs, diagnostic panels, replay transcripts, and tests agree.

### Explicit fairness rules

- No anomaly changes its behaviour within a campaign run unless the shift briefing explicitly says that it is unstable and gives the new observable.
- All random content is selected before a shift starts and recorded in the seed; no per-cycle random reactions exist.
- All future station events appear in the `NEXT` panel with their cycle number and exact effect, for example `CYCLE 5: A LAMP CIRCUIT -1 CAPACITY`.
- The player can inspect every current environmental condition and every anomaly pressure before committing.
- A configuration that will shed a circuit shows the expected `SHED` marker before commitment.
- Every available shift has at least one no-breach solution using only its starting tools. Validate this automatically in content tests.
- The player may restart the current shift from its immutable shift-start snapshot, keeping the same seed and content.

## Campaign

### Fiction

Halcyon Annex is being decommissioned after a structural storm. The operator is not asked to destroy or exploit the contained beings; the overnight protocol is to preserve separation, document behaviour, and evacuate staff if the station can no longer hold them. The narrative should be spare, humane, and unsettling rather than militaristic or jump-scare driven.

Each report adds one optional line to a `CASE LOG`. The emerging story is that older incident reports deliberately described anomalies as irrational because the previous director found predictable beings less profitable to study. The ending asks the player to transmit the archive, erase it, or leave the station under automatic protocol. These are tonal choices after a successfully completed campaign; none changes the mechanical correctness of the final shift.

### Shift progression

| Shift | Active lesson | New anomaly / fault | Success target |
|---:|---|---|---|
| T0: Orientation | Observe, lamp controls, cycle report | Glass Niche in a clear room | Hold 4 cycles; no failure state. |
| S1: Acoustic Leak | Sound is a second independent axis | The Choir; speaker calibration fault | Hold 6 cycles. |
| S2: Visitor Policy | Technician movement is an input | The Guest; field repair requires a hub visit | Hold 7 cycles. |
| S3: Brownout | One supply cannot meet conflicting light/sound needs | Ash Moth + Hollow Wire; capacity reduced to 7 | Hold 8 cycles. |
| S4: Sealed Wing | Door seals buy time but spend battery | Mirror Fold + The Keeper; one blocked corridor event | Hold 9 cycles. |
| S5: Coupled Systems | Compound stimuli and circuit shedding | Violet Static; scheduled lamp capacity loss | Hold 10 cycles. |
| S6: Exit Audit | Combine all systems and transfer a technician safely | The Witness; two faults, four active rooms | Hold 10 cycles and finish with technician at H. |

Later shifts retain selected earlier anomalies. Do not use every unlocked anomaly at once: S6 should have four active chambers, not nine. The final challenge is conflict and routing, not a wall of unreadable meters.

### Upgrades

After each successful shift, offer three authored choices and allow one. Upgrades add a decision but must not erase the need to reason about rules.

| Upgrade | Effect | Why it is safe scope |
|---|---|---|
| Reserve Cell | +2 maximum battery, starts future shifts with +1 battery. | Supports seal-heavy routes. |
| Quiet Relay | One chosen room's `HUSH` costs 0 power. | Enables a sound build without hiding information. |
| Flood Lamps | One chosen room treats `DIM` as `BRIGHT` for anomaly rules but costs only 1. | A clear lighting efficiency tool. |
| Transit Badge | First technician move each shift is free of cycle cost. | Reduces routing pressure once, visibly. |
| Diagnostic Recorder | Confirmation needs one less evidence outcome, minimum one. | Speeds learning but does not reveal a rule for free. |
| Manual Bypass | Once per shift, preserve one shed circuit for one cycle. | A legible emergency resource. |

Keep upgrades deterministic per seed and prevent duplicate offers. The tutorial grants no upgrade. A run should never require a specific upgrade to solve a shift; upgrades create alternate safe lines and score improvements.

### Scoring and ending

```text
shiftScore = 500
           + 80 × confirmedRules
           + 40 × batteryRemaining
           - 60 × cyclesUsedBeyondMinimum
           - 150 × emergencySeals
           - 400 × breaches
```

Campaign rank prioritizes humane containment over score:

| Rank | Requirement |
|---|---|
| CLEAN HANDOFF | Complete S6 with no breaches across the run. |
| STABLE SHIFT | Complete S6 with integrity at 5–6. |
| HOLDING ACTION | Complete S6 with integrity at 3–4. |
| EVACUATION LOG | Reach S6 but lose the station. |
| INCIDENT CLOSED | Lose before S6. |

The final report includes seed, shifts cleared, integrity remaining, rules confirmed, breaches with causes, upgrades, and a compact command timeline. It should tell a player exactly what to improve on replay.

## User interface and visual language

### Symbol vocabulary

The renderer must use the same glyphs in map, status panels, log, and help. ASCII fallbacks are required in comments/constants.

| Concept | Primary glyph | ASCII fallback |
|---|---|---|
| Contained / settled | `◆` | `*` |
| Restless | `◇` | `o` |
| Critical | `!` | `!` |
| Breach | `×` | `X` |
| Bright lamp | `☼` | `L` |
| Dim lamp | `◐` | `l` |
| Dark | `·` | `.` |
| Hush / white / tone | `≈` / `~` / `♫` | `H` / `W` / `T` |
| Technician | `@` | `@` |
| Door sealed | `▣` | `#` |
| Battery | `▰` | `=` |
| Power shed | `↓` | `v` |
| Rule confirmed | `✓` | `+` |

Use colour as a secondary cue: settled teal/green, restless amber, critical red, and equipment in the active theme colour. Critical panels must say `CRITICAL +2` even in monochrome. Reserve glitch/flicker for the title and for a single cycle-report flash; it must never move UI columns.

### Full layout: 94×30 minimum

```text
                  C O N T A I N M E N T   P R O T O C O L              SHIFT 03 / 06
  INTEGRITY ◆◆◆◆◆◆  POWER 7/7  BATTERY ▰▰▰▱▱▱  CYCLES 06  NEXT: C5 A capacity -1
┌─ STATION MAP ─────────────────────────┐ ┌─ CHAMBER A / GLASS NICHE ◇ ─────────────┐
│        [A ◇  4 !]──[B ≋  1 ◆]          │ │ PRESSURE  [####--] 4/6  CRITICAL         │
│             │          │                │ │ LAMP    BRIGHT ☼      AUDIO  SILENT ·   │
│ [G]───────[H @]──────[C ✦ 2 ◇]          │ │ DOOR    OPEN           TECH   ADJ        │
│                         │               │ │ LAST: ☼ bright exposure     -2 pressure │
│                       [D ▣ 3 ◇]         │ │ EVIDENCE  ✓ Dark raises pressure         │
└────────────────────────────────────────┘ └─────────────────────────────────────────┘
┌─ ALL ROOMS / PENDING DRAW ─────────────┐ ┌─ INCIDENT LOG ──────────────────────────┐
│ A ☼ · OPEN  -2   B ◐ ≈ OPEN  -1        │ │ C04: A  ☼ BRIGHT        -2  [CONFIRMED]│
│ C ◐ ~ OPEN   0   D · · SEALED +1       │ │ C04: B  ≈ HUSH          -1               │
│ demand 7/7  battery after seal 2       │ │ C03: TECH entered HUB                     │
└────────────────────────────────────────┘ └─────────────────────────────────────────┘
  [Arrows] select room/control  [1–3] lamp  [S/H/W/T] sound  [D] door
  [M] move technician  [Enter] commit cycle  [P] probe  [R] rules  [L] log  [H] help  [Esc] pause
```

### Compact layout: 80×28

- Keep the station map, global resources, selected chamber, and the next event visible at all times.
- Replace the all-rooms panel with one line of room summaries: `A!4☼  B◆1≈  C◇2~  D◇3▣` and show the selected room in full.
- `Tab` cycles the lower panel between `LOG`, `RULES`, and `ROOMS`; a critical room always has a one-line alert above the tabs.
- Below 80×28, freeze gameplay input and show the standard Gamr resize message including required and current size.

### Input map

| Context | Keys | Action |
|---|---|---|
| Start | `T` / `C` / `N` | Tutorial / campaign / Night Watch. |
| Working | Arrow keys or `A/D`, `W/S` | Select chamber and control row. |
| Working | `1`, `2`, `3` | Set `DARK`, `DIM`, `BRIGHT`. |
| Working | `S`, `H`, `W`, `T` | Set `SILENT`, `HUSH`, `WHITE`, `TONE`. |
| Working | `D` | Toggle pending door seal. |
| Working | `M` then direction | Move technician one graph edge; confirm a cycle. |
| Working | `Enter` | Commit a configuration cycle. |
| Working | `P` | Open probe preview/confirmation. |
| Working | `R`, `L`, `Tab`, `H` | Rules, log, panel cycle, help. |
| Overlay | `Enter` / Space | Dismiss report / confirm safe action. |
| Any active game | `Esc` | Shared pause menu. |

Direct configuration keys must update the render immediately but must not change pressure until a committed action. An `UNDO CONFIG` key is unnecessary because uncommitted state is free to adjust; restarting a shift covers committed mistakes.

## Technical architecture

Create a new game directory with strict separation between pure game rules and terminal presentation:

```text
src/games/containment-protocol/
  index.ts          terminal controller, key mapping, lifecycle, pause integration
  types.ts          serializable domain types, ids, display constants
  content.ts        anomaly roster, shift scenarios, events, upgrades, text
  seed.ts           integer hash/PRNG and stable named streams
  graph.ts          station adjacency and proximity calculations
  evaluator.ts      predicates, power shedding, anomaly reaction traces
  engine.ts         pure command reducer, phases, breach/end checks
  evidence.ts       authored observation-to-confirmation rules
  render.ts         ANSI full/compact screens and overlays
  engine.test.ts    command, cycle-order, fail/restart tests
  evaluator.test.ts rule, clamp, shed, and compound-condition tests
  content.test.ts   scenario validation and solvability checks
```

### Serializable state

```ts
type Phase =
  | 'start' | 'modeSelect' | 'briefing' | 'working' | 'cycleReport'
  | 'shiftReport' | 'upgrade' | 'gameOver' | 'ending';

interface GameState {
  version: 1;
  seed: number;
  mode: 'tutorial' | 'campaign' | 'nightWatch';
  phase: Phase;
  shiftIndex: number;
  cycle: number;
  cyclesRemaining: number;
  integrity: number;
  powerCapacity: number;
  battery: number;
  technicianRoom: StationNodeId;
  rooms: Record<RoomId, RoomState>;
  anomalies: Record<AnomalyId, AnomalyState>;
  pending: PendingConfiguration;
  activeFaults: FaultState[];
  observations: Observation[];
  confirmedEvidence: Set<EvidenceKey>;
  upgrades: UpgradeId[];
  log: Incident[];
  lastCycle: CycleResult | null;
  shiftStartSnapshot: ShiftSnapshot;
  score: ScoreState;
}

interface RoomState {
  id: RoomId;
  anomalyId: AnomalyId | null;
  lamp: LampMode;
  audio: AudioMode;
  door: DoorMode;
  circuitState: 'powered' | 'shed';
  breached: boolean;
}

interface AnomalyState {
  id: AnomalyId;
  roomId: RoomId;
  pressure: number;
  behaviourVariant?: string;
  knownEvidence: EvidenceKey[];
}
```

Use arrays, sorted IDs, and plain integers in serialized state. `Set` can be convenient in memory, but save/test snapshots should convert it to a sorted array. Keep `PendingConfiguration` separate from committed room state so the renderer can preview controls and the engine can enforce that only a command advances time.

### Commands

```ts
type Command =
  | { type: 'startRun'; mode: GameMode; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'selectRoom'; roomId: RoomId }
  | { type: 'setLamp'; roomId: RoomId; lamp: LampMode }
  | { type: 'setAudio'; roomId: RoomId; audio: AudioMode }
  | { type: 'setDoor'; roomId: RoomId; door: DoorMode }
  | { type: 'moveTechnician'; to: StationNodeId }
  | { type: 'commitCycle' }
  | { type: 'useProbe'; roomId: RoomId }
  | { type: 'dismissCycleReport' }
  | { type: 'chooseUpgrade'; upgradeId: UpgradeId }
  | { type: 'restartShift' }
  | { type: 'restartRun'; seed?: number }
  | { type: 'togglePanel'; panel: PanelId }
  | { type: 'toggleHelp' };
```

`setLamp`, `setAudio`, and `setDoor` update only `pending`; they must not consume a cycle. `moveTechnician`, `commitCycle`, and `useProbe` all call the same `resolveCycle` pipeline after their action-specific validation. The probe should cost one battery, add a known, documented `WHITE`-like local pulse for the cycle, and show the predicted impact before confirmation. Do not add a generic action-point system; it obscures the central time/power trade-off.

### Engine invariants

- A committed cycle has exactly one immutable snapshot and one `CycleResult`.
- Pressure, integrity, battery, capacity, and remaining cycles are always integer and in their declared bounds.
- No pressure can change after a room is marked breached.
- A seal blocks only the defined terminal breach transition; it does not erase pressure or alter a rule.
- A circuit marked shed cannot count as its configured lamp/audio condition in the snapshot.
- Same content version + seed + command transcript yields byte-for-byte equal serialized game state.
- Restarting a shift restores the original shift-start state and does not reroll upgrades, content, or events.
- A confirmation is awarded once per evidence key; repeated cycles cannot farm research.
- Renderer code owns no rule decision, resource subtraction, random choice, or phase transition.

## Content generation and Night Watch

Campaign shifts are curated scenarios: exact anomaly pairings, faults, and cycle budgets. This is required for fair teaching and story progression.

Night Watch unlocks after one campaign completion. It is a 10-cycle, three-room challenge generated from vetted scenario templates:

1. Pick three anomalies from the eligible roster using a named PRNG stream.
2. Reject combinations that have no safe lamp/audio/proximity assignment under the selected capacity.
3. Pick one fault template and one fixed event schedule; reject schedules that invalidate all safe assignments.
4. Choose three upgrade offers and one starting upgrade only if the solver says at least one line is safe without it.
5. Display `SEED`, content version, and a short difficulty label.

Version 1's generator should be conservative: recombine certified templates rather than inventing free-form behaviours. A small solver over discrete configurations is feasible because the board is tiny. It should find at least one path that keeps pressure below 6, assuming it may change controls each cycle and move only one graph edge per cycle. Run this solver in tests and development tooling, not every render frame.

Daily/weekly challenges and browser persistence are explicitly deferred. If added later, publish only seed + content version and retain the same deterministic evaluator.

## Implementation milestones

### 0 — Paper prototype and rules proof

Define the floor graph, implement Glass Niche, The Choir, The Guest, and three hand-solved shifts in a document or test fixture. Draw the 80-column wireframe and calculate an overload example by hand.

**Done when:** a reviewer can predict every room's pressure after two cycles using only the displayed conditions and proposed log.

### 1 — Pure containment engine

Implement `types`, graph distance, content data, conditions, circuit shedding, reaction evaluator, cycle resolution, breaches, evidence, seeded scenarios, and restart snapshots. No terminal UI yet.

**Done when:** a fixed seed and command transcript reproduce exact state and a test can explain every pressure change with a trace.

### 2 — Vertical slice

Build the terminal controller and renderer for T0–S2. Include map, selected chamber, pending-power preview, cycle report, Help, compact layout, start screen, shared pause menu, and one upgrade screen.

**Done when:** a new player can learn Glass Niche and The Choir, safely route the technician around The Guest, and explain every reaction without developer tools.

### 3 — Full campaign and content pass

Add all anomalies, six campaign shifts, events, upgrades, end reports, fail/restart, and carefully written dossier/log text. Keep scenario data authored and reviewed before adding Night Watch.

**Done when:** a complete campaign takes 20–35 minutes, each shift teaches one new relationship, and no shift depends on an unannounced event.

### 4 — Solver, tests, and balance

Implement content validation, Night Watch template generation, deterministic replay tests, and a development trace panel. Play a matrix of campaign routes and 500+ generated seeds; tune capacity, batteries, and cycle budgets from evidence.

**Done when:** every shipped scenario and generated seed tested has a solver-confirmed safe route, and no reaction or shed state is unexplained in the UI.

### 5 — Visual-language and release pass

Add restrained title glitch, incident flash, pressure change popups, final help copy, glyph fallbacks, theme checks, registry entry, and documentation. Run `npm run typecheck`, `npm test`, and `npm run build`.

**Done when:** the game is readable at 80×28 in a light theme, lifecycle cleanup works through pause/restart/quit/switch, and all automated checks pass.

## Test plan

Use Vitest for all pure modules. Avoid ANSI snapshot tests as a primary correctness mechanism; test renderer helpers for width stripping and use manual visual QA for frames.

### Evaluator tests

- Every primary and countercondition produces its documented delta.
- Nonmatching conditions produce neutral delta unless an authored secondary rule says otherwise.
- Compound predicates (`Violet Static`) require both specified inputs and do not accidentally match either alone.
- `THE WITNESS` copies the declared neighbour's final trace from the same snapshot, independent of object iteration order.
- Multiple matching rules respect `exclusiveGroup` / priority and clamp total delta to `[-2, 2]`.
- Shed circuits become the documented effective condition before anomalies evaluate.
- Door seals block exactly one `5 → 6` transition, consume battery exactly once, and do not protect an already breached room.

### Engine tests

- Configuration commands do not advance `cycle`, consume resources, or change pressure.
- Each committed action advances exactly one cycle and emits exactly one ordered `CycleResult`.
- Technician movement only follows graph edges; room proximity labels match shortest-path distance.
- A breach loses one integrity once, freezes that room, and produces a causal incident.
- Event schedules apply after reaction traces and at their announced cycle number.
- Evidence confirmation occurs from the exact authored outcomes and can be awarded only once.
- Shift restart restores the initial snapshot exactly; full restart preserves an explicit seed or changes only when requested.
- Same seed plus 1,000 randomly generated valid command transcripts results in identical serialized end state on replay.

### Content and solvability tests

- All anomaly IDs, room IDs, evidence keys, shift IDs, event IDs, and upgrade IDs are unique.
- Every dossier clue references an actual renderer label and every reaction string fits the compact panel.
- Every campaign scenario has a solver-confirmed no-breach route with no upgrades.
- Every Night Watch template validates 500 seeds across its supported capacity range.
- Every scheduled event is shown in the briefing/next-event model and has nonempty player-facing text.
- No upgrade offer duplicates an installed upgrade; every offered upgrade has a valid effect.

### Manual QA

- Play tutorial and campaign at 80×28, 94×30, and a wide terminal; verify no required fact is clipped.
- Test default and light themes. Confirm icons, labels, and status meters communicate without colour.
- Rapidly change pending controls, dismiss reports, pause/unpause, restart, quit, list games, and switch games. Confirm listeners and alternate buffer clean up exactly once.
- Intentionally overload power; verify predicted and actual shed circuits match.
- Trigger each breach and confirm the report names the final condition, effective (not merely configured) circuit state, and missing counterplay.
- Play Night Watch using a displayed seed twice and confirm the same content and result after the same commands.

## Balance instrumentation

In development builds, `~` toggles a non-shipping trace panel:

```text
SEED 481920  SHIFT S4  CYCLE 06  DEMAND 8/7
SHED: C audio WHITE
A GLASS NICHE   configured BRIGHT / effective BRIGHT  delta -2
B THE GUEST     tech ADJ                             delta +1
C HOLLOW WIRE   configured WHITE / effective SILENT  delta  0
EVENT: corridor H-C blocked after resolution
```

At report time, collect seed, upgrades, starting/final integrity, cycles used, power-shed count, seal count, rules confirmed, breach causes, and per-anomaly pressure history. Use this information to tune authored scenarios; do not balance by introducing opaque random relief.

## Gamr integration

- Export `runContainmentProtocolGame(terminal)` returning a controller with `stop()` and `isRunning`.
- Use `getCurrentThemeColor`, `dispatchGameQuit`, `dispatchGameSwitch`, `dispatchGamesMenu`, and the shared pause menu exactly as the existing terminal games do.
- Enter the alternate buffer and hide the cursor once at startup; dispose the key listener, clear rendering timers, reset styles, show cursor, and leave the buffer once on every exit route.
- Render at 20 FPS only for title/effect polish. The rules engine advances only from committed input, never from an interval.
- Reuse shared flash, shake, particle, and score-popup utilities sparingly: one brief flash on a breach, a small `RULE CONFIRMED` popup, and no movement that interferes with reading the report.
- Register the game in `src/games/index.ts` with: `{ id: 'containment-protocol', name: 'Containment Protocol', description: 'Learn the rules. Hold the doors.', run: runContainmentProtocolGame }`.

## Version 1 non-goals

- Combat, killing anomalies, weapons, health bars, or a controllable action character.
- Real-time countdowns, timed key sequences, mouse controls, or audio required to play.
- Free-roaming anomalies, procedural prose, arbitrary traits, or per-turn random behaviour.
- A room-builder, staff simulator, research tree, inventory grid, or crafting system.
- Persistence, online leaderboards, daily reward pressure, multiplayer, cloud saves, or actual SCP/other licensed fiction.
- A moral scoring system that treats an anomaly's destruction as the optimal play.

## Definition of done

Containment Protocol is ready when:

1. A new player can identify why Glass Niche's pressure changed after the tutorial's first two cycles.
2. Every anomaly pressure change has a readable, deterministic reaction trace and a matching incident-log line.
3. The player has to resolve genuine conflicts among light, sound, technician position, doors, and finite power—not merely set every room to its known safe state once.
4. Every campaign shift and generated Night Watch seed has an evidence-verified safe route.
5. Same seed and command sequence produces the same full incident report.
6. The game is legible at 80×28, usable in light and dark themes, and follows Gamr's controller, pause, transition, and cleanup conventions.
7. Typecheck, unit/content tests, solver validation, and build pass before registration in the active game menu.
