# Orbital Post — Full Game & Implementation Plan

## Product decision

**Orbital Post is a deterministic, turn-based scheduling game about keeping a remote orbital relay alive, connected, and useful while the Sun repeatedly changes what the station can safely do.**

The player is the sole flight director of **Kestrel Station**, an aging post, repair, and communications relay above the outer-system moon Ilyra. Every orbital window, they place jobs into a short, visible schedule: unload medical cargo, patch a coolant loop, relay an evacuation burst, shelter an antenna, or ask a freighter to wait. Solar weather changes the legal and safe windows for those jobs. The player sees the forecast before committing; tension comes from deciding what must wait, what can be moved, and which limited crew lane or power reserve to spend.

Version 1 is a complete **six-shift campaign**, plus a seeded **Open Orbit** challenge. A first campaign should take 20–30 minutes, while one Open Orbit run should take 8–12 minutes. It is designed for an 80×28 terminal, keyboard-only play, and immediately explainable outcomes.

The design uses the repository’s existing research direction: compact visible-state systems, Mini Metro-like constrained logistics, short replayable runs, seeded variation, and a control-room presentation. It does not copy another game’s jobs, economy, or interface.

## Player promise

> “I saw the flare coming. I still had to choose which part of the station would be exposed when it arrived.”

| Beat | Player action | Intended feeling | Typical duration |
|---|---|---|---:|
| Scan | Read the next four orbital windows and incoming work orders. | Calm, competent orientation. | 10–20 s |
| Plan | Place a job in a crew lane and choose its start window. | Spatial puzzle solving. | 20–45 s |
| Commit | Advance one orbital window and watch work resolve. | Consequence, not roulette. | 3–6 s |
| Recover | Re-plan around a flare, a delayed freighter, or a new fault. | Controlled crisis management. | 30–90 s |
| Resolve | Finish the shift with the relay intact and priority traffic delivered. | Earned relief and a small story beat. | 2–3 min |

## Design pillars and hard constraints

1. **Forecasts are information, not gotchas.** The next four solar-weather windows are always exact in the default campaign. The game never invalidates a plan because of an unseen dice roll.
2. **One core verb: schedule.** The player’s important action is placing, moving, and cancelling work in a short timeline. Menus and upgrades support that verb rather than becoming separate subsystems.
3. **Three work families make the station legible.** Cargo keeps the relay supplied and earns standing; repairs stop predictable deterioration; communications maintain contact and advance the story.
4. **Every failure has a trace.** A missed deadline, blocked EVA, power deficit, and station loss all name the exact work order, weather condition, and rule that caused them.
5. **Crisis follows calm.** The opening shift is a clean timetable puzzle. Later shifts combine weather restrictions, multi-window work, dependencies, and urgent arrivals, but retain complete visible information.
6. **No real-time pressure.** A turn takes as long as the player needs. Animation is decorative and must never obscure an actionable state.
7. **Small, fair procedural variation.** A seed varies job order, weather pattern, client callsigns, cosmetic wording, upgrade offers, and optional objectives. Authored templates and an offline validator ensure every campaign and generated challenge has a feasible route.
8. **Terminal-native presentation.** A compact ASCII/Unicode orbit timeline, status telemetry, log, and radar-like weather strip should look like a functional station console, without relying on colour alone.

## The playable model

### Time and planning horizon

A shift has **10 orbital windows**. One window is an abstract 20-minute operations period. Before resolving the current window, the player plans against a four-window horizon:

```text
NOW             +1              +2              +3
06:00           06:20           06:40           07:00
CLEAR           FLARE           FLARE           RECOVERY
```

- The leftmost window is the one that resolves when the player presses `Enter`.
- The next three forecast cells are guaranteed accurate in Campaign and Open Orbit modes.
- Jobs may begin in any shown window. The schedule scrolls one cell left after a window resolves.
- Jobs beyond the horizon cannot be placed yet. This keeps planning short and makes newly arriving work meaningful without concealing imminent restrictions.

The game never asks the player to micromanage seconds, movement paths, or individual crew members. A lane reservation represents the necessary people, equipment, checklists, and hand-off time.

### Station resources

The station has three exclusive operational lanes and two global tracks.

| Resource | Meaning | Scheduling rule |
|---|---|---|
| `D` Dock operations | Berthing, unloading, launch preparation, crane work. | One cargo job at a time. |
| `E` EVA systems | Exterior repairs, shielding, radiator work. | One repair job at a time. |
| `C` Comms array | Antenna alignment, burst relay, laser link maintenance. | One communications job at a time. |
| `P` Battery reserve | A visible 0–8 stored-energy track. | Work and station load consume it; clear weather restores it. |
| `I` Station integrity | A visible 0–6 failure track. | Uncontained faults reduce it; 0 ends the shift/run. |

A job has one primary lane. A few advanced jobs reserve a second lane; for example, **Guided Docking** reserves `D + C` for one window. This is the main source of scheduling conflict and should be clearly printed on the job card.

There is intentionally no currency, inventory grid, crew-stat system, or hidden morale variable. Cargo manifests have a compact `supply` effect, and their effect is stated on the card.

### Solar weather

Solar weather is a station-wide state, not a random event table. Each window has one of five conditions:

| Weather | Icon / ASCII | Safe work | Station effect | Planning implication |
|---|---|---|---|---|
| Clear | `☼` / `O` | All lanes. | +2 battery at resolution, to a maximum of 8. | Best time for high-power jobs and EVA. |
| Thin veil | `≈` / `~` | All lanes. | +1 battery. Laser relay costs +1 battery. | Mild comms tax, otherwise flexible. |
| Solar flare | `!` / `!` | Dock work only; internal repairs may proceed. | No solar charge; exposed systems take stress. | EVA and all external comms jobs are blocked. |
| Particle storm | `#` / `#` | Dock work and internal repair only. | −1 battery after work; unshielded fault severity rises. | Comms are offline; external work is unsafe. |
| Recovery | `✦` / `+` | All lanes, but external work needs 1 extra battery. | +1 battery; comms gain a reliable-send bonus. | Useful for delayed bursts, expensive for EVA. |

Each job declares one of these requirements in plain language:

- **`EVA: clear/recovery`** — cannot resolve in flare or storm.
- **`External comms: clear/veil/recovery`** — cannot resolve in flare or storm.
- **`Internal`** — resolves in every weather state.
- **`Docked only`** — resolves in every state but needs a clear dock lane.
- **`Shield before flare`** — must complete before a named forecast window; it is a normal deadline job, not a surprise event.

The validator and renderer use the same requirements; the player will never see wording that differs from engine behavior.

### Jobs, deadlines, and dependencies

Each work order is a small, explicit object. The player can schedule a job once it is in the queue and its listed dependency is complete.

```ts
type LaneId = 'dock' | 'eva' | 'comms';
type WeatherId = 'clear' | 'veil' | 'flare' | 'storm' | 'recovery';
type JobKind = 'cargo' | 'repair' | 'comms' | 'safety' | 'command';

interface Job {
  id: string;
  kind: JobKind;
  title: string;
  client: string;
  lanes: LaneId[];
  duration: 1 | 2 | 3;
  allowedWeather: WeatherId[];
  powerCost: number;
  earliestWindow: number;
  deadlineWindow: number;
  dependencyId?: string;
  onComplete: JobEffect[];
  onMiss: JobEffect[];
  state: 'queued' | 'scheduled' | 'active' | 'complete' | 'missed' | 'cancelled';
  scheduledStart?: number;
  remaining?: number;
  priority: 'routine' | 'urgent' | 'critical';
}
```

Rules:

1. A job occupies every listed lane for its full duration. Its card spans that many cells in the timeline.
2. The whole job must fit inside the currently known four-window horizon when placed. It may continue after the current window but can never be started in an unknown window.
3. A job starts only when its `earliestWindow` and dependency are satisfied. The interface rejects invalid placements and says why.
4. At resolution, an active job advances by one segment only if its current weather is allowed and enough battery is available. Otherwise it becomes **blocked**, remains in place, and logs the reason.
5. Blocked work still occupies its lane. The player must later resume it in a safe window, move it if possible, or cancel it. A blocked deadline is therefore a visible scheduling consequence rather than a silent automatic failure.
6. A job completed after its deadline is marked **late** and applies its `onMiss` effect once. Cargo may still give supplies, but a critical medicine transfer can cost relay standing.
7. A job with an expired deadline and no scheduled completion is marked missed at the end of that window and applies `onMiss` once.

The player may freely move or cancel work that has not started. Once a job has resolved at least one segment, it may be cancelled but never moved backward in time; cancellation uses a clear confirmation prompt and reports its specific consequence.

### Effects and feedback

Every job effect is a simple, serialisable state change. Effects are intentionally modest so the scheduling map, rather than arithmetic, remains the main puzzle.

```ts
type JobEffect =
  | { type: 'battery'; amount: number }
  | { type: 'integrity'; amount: number }
  | { type: 'standing'; amount: number }
  | { type: 'supply'; supply: 'spares' | 'shielding' | 'coolant'; amount: number }
  | { type: 'resolveFault'; faultId: string }
  | { type: 'setFlag'; flag: string }
  | { type: 'unlockJob'; jobId: string }
  | { type: 'log'; text: string };
```

For example:

| Job | Completion | Miss/cancel consequence |
|---|---|---|
| `MEDICAL INTAKE` | +2 standing; +1 coolant. | −2 standing. |
| `RADIATOR PATCH` | Removes `coolant-leak` fault. | Fault remains and causes −1 integrity at each storm window. |
| `COLONY BURST` | +3 standing; enables a later rescue message. | −1 standing; later message arrives as critical. |
| `ANTENNA SHIELD` | Sets `arrayShielded`; flares no longer add array stress. | The next flare creates `array-drift`, which blocks high-gain comms. |

The event log always uses causal form: `WINDOW 04: RADIATOR PATCH BLOCKED — EVA UNSAFE IN SOLAR FLARE.` It never says only “action failed.”

## Core loop in detail

1. Read the weather strip, station tracks, currently scheduled work, and new work orders.
2. Select a job card from the queue with `↑/↓` or `J/K`.
3. Use `←/→` to choose an available start cell. The placement preview highlights the lanes and all occupied cells.
4. Press `Enter` to schedule. Invalid schedules are rejected with a one-line exact reason: `COMMS OCCUPIED IN W+2`, `EVA UNSAFE: FLARE`, `NEEDS SPARES DELIVERY`, or `EXCEEDS BATTERY 3/2`.
5. Use `X` to unschedule an unstarted job; use `C` to cancel a started job after a confirmation. The game shows the job’s stated consequence before confirming.
6. When ready, press `Space` to arm the window, then `Enter` to advance. This two-step commit avoids accidental turn advancement.
7. Resolve operations in a fixed order, show the concise window report, and shift the horizon forward. The player dismisses the report with any key and plans again.
8. At the end of window 10, calculate the shift result. Pass the campaign’s integrity and priority-delivery requirement, receive an upgrade choice, then begin the next shift.

The interface must always support `H` for a compact help overlay and `R` for the current shift’s rule/forecast explanation. No core information belongs exclusively in a tutorial pop-up.

## Exact resolution logic

The engine is a pure reducer. The terminal controller never changes gameplay values directly; it maps a key to a `Command`, calls `applyCommand`, then renders the returned state.

### Commands

```ts
type Command =
  | { type: 'startRun'; mode: GameMode; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'selectJob'; jobId: string }
  | { type: 'selectWindow'; window: number }
  | { type: 'scheduleJob'; jobId: string; startWindow: number }
  | { type: 'unscheduleJob'; jobId: string }
  | { type: 'requestCancel'; jobId: string }
  | { type: 'confirmCancel'; accepted: boolean }
  | { type: 'armAdvance' }
  | { type: 'advanceWindow' }
  | { type: 'dismissWindowReport' }
  | { type: 'chooseUpgrade'; upgradeId: string }
  | { type: 'restartShift' }
  | { type: 'restartRun'; seed?: number }
  | { type: 'toggleHelp' }
  | { type: 'toggleLog' }
  | { type: 'toggleForecast' };
```

`advanceWindow` is accepted only after `armAdvance`. Any scheduling or selection change clears the armed state. This makes it impossible to consume a turn because a player was navigating a menu.

### Per-window reducer order

The following order is the game’s explicit simulation contract and should be documented in `rules.ts`:

1. **Reveal arrivals.** Add only jobs authored for this window. Arrivals cannot affect work already resolving.
2. **Expire unscheduled deadlines.** Mark queued jobs whose deadline is before the current window as missed; apply their miss effect once.
3. **Validate active segments.** For each scheduled job occupying the current window, check dependency, weather, and battery in lane order `dock → eva → comms`, then job ID for ties.
4. **Reserve and spend power.** Sum only segments that validated. If demand exceeds current battery, keep the earliest-deadline jobs first, then critical before urgent before routine, then ID. Mark remaining segments blocked with `POWER RESERVE INSUFFICIENT`. The preview uses this exact priority rule.
5. **Advance valid work.** Deduct its power cost, decrease `remaining`, and mark complete when it reaches zero. Apply completion effects immediately in stable job-ID order.
6. **Apply unresolved-fault ticks.** Faults list their weather trigger and predictable integrity cost. Example: an unpatched coolant leak costs −1 integrity in storm, not at random.
7. **Apply weather generation and stress.** Add or subtract battery according to the current weather; add flare stress only for subsystems explicitly unshielded by a fault/flag rule.
8. **Check newly expired deadlines.** A segment blocked in its final legal window becomes missed now; apply its miss effect once.
9. **Check terminal conditions.** Integrity 0 enters `gameOver`. Otherwise, after the tenth window enter `shiftReport` or `ending`.
10. **Create report.** Store resolved jobs, blocked jobs, track deltas, faults, and human-readable notices in `WindowReport`.

This order prevents accidental circularity, such as a repair completing after the storm damage it was intended to prevent. When a job is intended to prevent a weather tick, its brief explicitly says it must complete **before** the listed weather window.

### Fault model

Faults create urgency without invisible upkeep. They are structured content, visible in the left telemetry panel, and may be solved by one named job.

```ts
interface Fault {
  id: string;
  name: string;
  glyph: string;
  description: string;
  triggerWeather: WeatherId[];
  integrityLoss: number;
  blocks?: LaneId[];
  resolvedBy: string;
  active: boolean;
}
```

Example fault set:

| Fault | Trigger | Effect | Resolution |
|---|---|---|---|
| `coolant-leak` | Storm | −1 integrity. | 2-window `RADIATOR PATCH` on EVA. |
| `array-drift` | Any external-comms attempt | Blocks external comms until calibrated. | `CALIBRATE ARRAY` on COMMS. |
| `docking-latch` | Clear or veil | Incoming cargo cannot unload. | `MANUAL LATCH RESET` on DOCK. |
| `shield-fracture` | Flare | −1 integrity and creates array drift. | `APPLY SHIELDING` on EVA; consumes one shielding supply. |
| `power-bus` | Any high-power segment | Adds +1 battery cost to EVA/COMMS work. | `ISOLATE BUS` on EVA. |

Fault text must state its trigger, severity, and remedy in a maximum of two compact lines. No fault introduces an unannounced rule.

### Loss, success, score, and recovery

- **Immediate loss:** integrity reaches 0. The player may restart the current shift with the same seed.
- **Shift pass:** integrity is at least 1 and all `critical` jobs are complete or explicitly resolved by a stated alternative. Missing a noncritical job lowers standing but does not lock campaign progress.
- **Campaign result:** the six-shift ending reflects integrity, standing, completed colony/rescue threads, and major cargo contracts. A low-standing ending is valid; it is not a fake game-over.
- **Score:** `standing × 100`, plus completed priority jobs, plus remaining integrity. Score is an optional replay metric, never a requirement to unlock the ending.
- **Undo policy:** Before a window advances, unscheduling is free. After a window resolves there is no undo in v1; exact reports and deterministic restarts make a mistake understandable and replayable.

## Campaign structure

### Story premise

Kestrel Station is the last relay between Ilyra’s scattered colonies and the inner-system relief fleet. A solar maximum is arriving early. The station’s civilian post service gradually reveals that the “routine” manifests are pieces of a larger evacuation: one colony’s hospital needs coolant, another has lost navigation ephemerides, and a long-silent research vessel is requesting a relay window from behind the Sun.

The tone is calm, professional, and human rather than military. The player is not a commander shooting down threats; they are the person whose competent schedule makes other people’s lives possible.

### Shifts and escalation

| Shift | New lesson | Windows | Main conflict | Story beat |
|---:|---|---:|---|---|
| 0: Checkout | Lanes, durations, clear/veil weather, safe placement. | 6 | One cargo, one repair, one comms task never overlap. | Kestrel reopens after quiet-season maintenance. |
| 1: First Flare | Flare blocks EVA/external comms; forecasts matter. | 8 | Repair before flare vs. deadline-bearing relay burst. | A medical freighter reports a diverted route. |
| 2: Dockside Delay | Dependencies and multi-lane guided docking. | 9 | Align a ship through COMMS while preserving a rescue burst slot. | The station receives Ilyra’s incomplete evacuation register. |
| 3: Particle Wake | Storm fault ticks, battery pressure, shielding supplies. | 10 | Prevent integrity loss while accepting valuable cargo. | A research ship broadcasts from a predicted dead zone. |
| 4: Black Sun | Consecutive bad weather, alternate completion routes. | 10 | Decide whether to delay civilian traffic to maintain the relay. | The relief fleet cannot see Ilyra directly. |
| 5: Last Transit | Full system, compound deadlines, final report. | 10 | Build the only schedule that links colony, freighter, and fleet. | Kestrel forwards the route that gets the fleet through. |

New mechanics are taught by an authored job that has one plainly safe placement before they are combined with existing pressure. Shift 0 is a tutorial but remains part of the story; an experienced player can complete it in under two minutes.

### Campaign pass thresholds

| Shift | Required outcome | Optional excellence |
|---:|---|---|
| 0 | Complete all tutorial jobs. | Finish with 6 integrity. |
| 1 | Complete `RADIATOR PATCH` and medical intake. | Deliver colony burst on time. |
| 2 | Complete guided docking or use the stated manual-dock alternative. | Keep the antenna unblocked. |
| 3 | Finish with integrity ≥2. | Deliver both supply manifests. |
| 4 | Preserve one working external-comms route. | Complete all civilian traffic. |
| 5 | Complete fleet relay and finish with integrity ≥1. | Finish with standing ≥18. |

### Upgrades between shifts

After a passed shift, offer three deterministic upgrades drawn from a small, mutually compatible pool. They enhance visibility or create one interesting scheduling option; none should invalidate weather restrictions.

| Upgrade | Effect |
|---|---|
| `Reserve Capacitors` | Battery maximum +2. |
| `Dock Automator` | The first one-window cargo job each shift costs 0 battery. |
| `EVA Tether Kit` | The first EVA job in Recovery costs no extra battery. |
| `Burst Buffer` | Once per shift, an external comms job blocked by flare can hold its completed progress without losing its deadline extension. |
| `Priority Desk` | Show critical-deadline cells with an additional text marker and gain +1 standing for each critical job completed on time. |
| `Spare Manifold` | Start each shift with one `spares` supply. |
| `Weather Optics` | Show the next fifth weather window as an advisory only; it becomes exact when it enters the four-window horizon. |
| `Quiet Channel` | One routine comms job per shift can run during Veil at normal power cost. |

The campaign cannot roll an upgrade that is unusable in the next two shifts. Offers use their own seed stream so cosmetic content changes do not change gameplay offers.

## Procedural generation, determinism, and solvability

### Deterministic seed model

Create one unsigned 32-bit run seed. Derive named streams with a stable hash rather than consuming one shared sequence:

```ts
const streamSeed = (runSeed: number, label: string, shift: number) => hash32(`${runSeed}:${label}:${shift}`);
// deck, weather, names, cosmeticText, upgradeOffers, challenge
```

Use Mulberry32 (or the project’s existing deterministic helper) only inside engine/content generation. `Math.random()` is permitted solely for cosmetic title-glitch offsets or particles, never for a rules outcome. Store the seed, content version, job deck, weather timeline, selected upgrades, and player decisions as JSON-compatible state.

### Content generation rules

Each shift has an authored scenario skeleton:

```ts
interface ShiftDefinition {
  id: string;
  title: string;
  windows: number;
  weatherTemplate: WeatherId[];
  arrivals: Array<{ window: number; jobTemplateId: string }>;
  initialFaults: string[];
  requiredJobIds: string[];
  optionalJobIds: string[];
  allowedUpgrades: string[];
  briefing: string;
}
```

The generator permutes compatible optional jobs, client callsigns, commodity nouns, short radio text, and one or two weather-template alternatives. It may not randomly invent a new requirement. To keep pressure fair:

- Every required job has at least one valid schedule in the generated weather pattern.
- A required multi-window job receives enough known safe contiguous cells before its deadline.
- No arrival is impossible on the window it becomes visible unless its brief explicitly introduces an alternate response.
- A job whose dependency is generated must appear early enough to be completed before the dependent job’s last legal start.
- The deck never forces more than three simultaneous critical jobs into the same lane unless the scenario includes a visible alternative path.
- Content generation checks the baseline schedule *without upgrades*; upgrades create more options, not required routes.

### Solver validation

Build a test-only planner that explores legal schedule actions for each authored scenario and a sample of generated seeds. The solver uses the same reducer, but does not need to optimise score.

```ts
interface SolveResult {
  solvable: boolean;
  commands: Command[];
  reason?: string;
  score?: number;
}

export function solveScenario(definition: ShiftDefinition, seed: number): SolveResult;
```

Prune branches by hashing only decision-relevant state: window, integrity, battery, active faults, completed/missed job IDs, and future reservations. Start with a 250-seed suite per shift; increase to 1,000 in CI once runtime is measured. A generated deck is rejected/re-rolled up to 20 times during development. If no deck passes, fail loudly with its seed and a readable scenario dump—never quietly ship an unwinnable pattern.

## User interface and visual language

### Icon vocabulary

The renderer must define the symbols once near `render.ts`, use them consistently, and include ASCII fallbacks.

| Concept | Glyph | ASCII | Colour role | Usage |
|---|---|---|---|---|
| Dock/cargo | `▣` | `D` | cyan | lane header, cargo cards, manifests |
| EVA/repair | `◇` | `E` | yellow | lane header, repair cards, faults |
| Comms | `◉` | `C` | magenta | lane header, comm cards, relay notices |
| Power | `▰` | `=` | theme colour | battery meter |
| Integrity | `◆` | `I` | green / red warning | hull meter |
| Clear | `☼` | `O` | yellow | forecast strip |
| Veil | `≈` | `~` | cyan | forecast strip |
| Flare | `!` | `!` | red | forecast strip and blocked jobs |
| Storm | `#` | `#` | red/magenta | forecast strip and fault tick |
| Recovery | `✦` | `+` | green | forecast strip |
| Complete | `✓` | `+` | green | job history |
| Blocked | `⚠` | `!` | yellow/red | timeline and event log |
| Deadline | `⌛` | `T` | amber | job cards, schedule cell |

Colour complements a label and glyph; it is never the sole signal. Use a terminal capability option or a small internal boolean to select ASCII symbols when desired. If terminal width alignment makes a symbol ambiguous, prefer the stated ASCII fallback.

### Main operations screen (80×28 minimum)

```text
                           O R B I T A L   P O S T
SHIFT 03 / 06 · KESTREL STATION             WINDOW 04 / 10 · ARM [ ]
POWER  [▰▰▰▰····] 4/8     INTEGRITY [◆◆◆◆◆·] 5/6     STANDING 12

FORECAST  NOW          +1           +2           +3
          ! FLARE      # STORM      # STORM       ✦ RECOVERY

LANE       W04          W05          W06          W07
▣ DOCK     MED-INTAKE   MED-INTAKE   ·            ·
◇ EVA      [RADIATOR]   [RADIATOR]   ·            ·
◉ COMMS    ·            FLEET BURST  FLEET BURST  ·

┌ QUEUE — SELECTED: ANTENNA SHIELD ──────────────────────────┐
│ ◇ EVA · 1 window · 1P · CLEAR/VEIL/RECOVERY · BY W06       │
│ Shield array before incoming flare. Prevents array drift.   │
│ [←/→] place start   [ENTER] schedule   [X] remove           │
└─────────────────────────────────────────────────────────────┘
FAULTS  ⚠ COOLANT LEAK: −1 integrity during STORM; patch it.
LOG     W03 · COLONY BURST COMPLETE · RELAY STANDING +3

SPACE arm advance · ENTER resolve · J/K jobs · H help · ESC pause
```

The compact screen does not require scrolling. At widths 96+, a right panel may show up to five queued jobs and the last three log lines. At 80×28, only the selected card and the highest-priority fault are shown. Below 80×28, input freezes and the standard resize screen reports the minimum/current dimensions.

### Additional screens

- **Start/mode select:** `Campaign`, `Open Orbit (seeded)`, `How to Play`. Campaign starts with a brief diagnostic narration.
- **Briefing:** Forecast, required outcomes, one new rule, and a compact summary of current faults. It never contains a fact unavailable later with `R`.
- **Window report:** A small causal ledger: completed, blocked, deadline/fault effects, battery/integrity change, and `Enter: continue`.
- **Upgrade screen:** Three numbered, concise offers with existing-upgrade indicators and no reroll cost.
- **Pause menu:** Must use `PAUSE_MENU_ITEMS` and the shared navigation renderer.
- **Shift/end report:** A station log with missed/late jobs, outcome flags, score, seed, and a short narrative transmission. It offers restart/same seed/new Open Orbit as appropriate.

A restrained title glitch may fire briefly on the title screen only. Resolving a critical job uses a one-frame green flash and a log highlight; blocked jobs use a short warning flash. Do not shake the entire screen during scheduling because alignment is essential.

### Controls

| Key | Action |
|---|---|
| `↑/↓` or `J/K` | Select queue job / menu item. |
| `←/→` or `H/L` | Select timeline start window. |
| `Enter` | Schedule selected job, confirm, or advance after arming. |
| `Space` | Arm/cancel next-window advance. |
| `X` | Unschedule selected unstarted job. |
| `C` | Request cancellation of active work. |
| `Tab` | Cycle queue, timeline, and log focus in wide layout. |
| `R` | Toggle forecast/rules panel. |
| `L` | Toggle expanded event log. |
| `?` or `H` | Toggle contextual help. |
| `Esc` | Open shared pause menu. |

If `H/L` conflicts with help in a terminal layout, arrow keys remain the documented, reliable control path and `?` remains help.

## Recommended code architecture

Create the game as an engine-first, testable module set:

```text
src/games/orbital-post/
├── index.ts             # Terminal controller, lifecycle, input mapping
├── types.ts             # State, commands, jobs, reports, content IDs
├── engine.ts            # Pure reducer, schedule validation, resolution
├── content.ts           # Shift definitions, job/fault/upgrades, radio text
├── generator.ts         # Seeded scenario assembly and validation entry point
├── rules.ts             # Weather labels, job eligibility, fault calculations
├── render.ts            # ANSI renderer and compact/wide layouts
├── solver.ts            # Test-only solvability search (not bundled public API)
├── engine.test.ts       # Reducer and scheduling behavior
├── generator.test.ts    # Determinism and content validation
├── solver.test.ts       # Seeded campaign solvability suite
└── render.test.ts       # ANSI-stripped layout/snapshot-style assertions
```

Register only after implementation is ready:

```ts
import { runOrbitalPostGame } from './orbital-post';

{ id: 'orbital-post', name: 'Orbital Post',
  description: 'Schedule the relay. Outrun the solar weather.',
  maturity: 'workshop', pace: 'turn-based', difficulty: 3,
  session: 'campaign', run: runOrbitalPostGame }
```

Add the direct runner re-export to `src/games/index.ts`. Follow the repository’s existing `containment-protocol`, `ghost-shift`, and `last-train-home` separation of `types`, pure engine, renderer, and controller.

### Important implementation boundaries

- `content.ts` contains only authored data and text. It must not mutate game state.
- `generator.ts` creates a serialisable scenario before the first player action. It must not call the renderer or read wall-clock time.
- `rules.ts` provides the single source of truth for `isWeatherAllowed`, battery generation, power cost, and fault effects. Both the UI preview and reducer import it.
- `engine.ts` owns deep-copy discipline. Commands return a new state rather than mutating input; tests should assert input immutability for high-risk commands.
- `render.ts` reads state only. It must never decide whether a job is valid—ask `getPlacementValidation` from the engine/rules layer.
- `index.ts` owns xterm lifecycle: alternate buffer, hidden cursor, 20 FPS render interval, `onKey` cleanup, pause integration, and `stop()` restoration.
- Effects use `src/games/shared/effects.ts` only where appropriate. A simple local flash state is acceptable if shared effects do not fit; no duplicate particle framework.

## Data and state shape

```ts
type Phase =
  | 'start'
  | 'modeSelect'
  | 'briefing'
  | 'working'
  | 'cancelConfirm'
  | 'windowReport'
  | 'shiftReport'
  | 'upgrade'
  | 'gameOver'
  | 'ending';
type GameMode = 'campaign' | 'openOrbit';

interface Reservation {
  jobId: string;
  lane: LaneId;
  window: number;
}

interface WindowReport {
  window: number;
  weather: WeatherId;
  completed: string[];
  progressed: string[];
  blocked: Array<{ jobId: string; reason: string }>;
  missed: string[];
  faultTicks: string[];
  notices: string[];
  batteryBefore: number;
  batteryAfter: number;
  integrityBefore: number;
  integrityAfter: number;
}

interface GameState {
  version: 1;
  seed: number;
  mode: GameMode;
  phase: Phase;
  shiftIndex: number;
  currentWindow: number;
  totalWindows: number;
  weather: WeatherId[];
  battery: number;
  batteryMax: number;
  integrity: number;
  standing: number;
  supplies: Record<'spares' | 'shielding' | 'coolant', number>;
  faults: Record<string, Fault>;
  jobs: Record<string, Job>;
  queueIds: string[];
  reservations: Reservation[];
  selectedJobId: string | null;
  selectedStartWindow: number;
  armedAdvance: boolean;
  pendingCancelJobId: string | null;
  upgrades: string[];
  upgradeOffers: Upgrade[];
  flags: Record<string, boolean>;
  reports: WindowReport[];
  log: Incident[];
  notice: string;
  helpOpen: boolean;
  logOpen: boolean;
  shiftStartSnapshot: GameState | null;
}
```

The actual state may use string ID unions where convenient, but it must remain JSON serialisable. `shiftStartSnapshot` is a JSON clone created after scenario generation so Restart Shift reproduces the exact deck and forecast even after future generator changes.

## Implementation plan

### Milestone 1 — Define the pure model

1. Add `types.ts`, `content.ts`, and `rules.ts` with the state types, icon labels, five weather definitions, six shift skeletons, 18–24 job templates, five faults, and eight upgrades.
2. Write the tutorial and Shift 1 content first. Do not create procedural text until one authored shift feels legible.
3. Implement a deterministic `hash32` and PRNG helper with named streams.
4. Add a short content-validation function that checks IDs, duration ranges, valid weather names, known dependency IDs, valid fault remedies, and deadline ordering at module load/test time.

**Acceptance:** Shift 0 can be represented entirely as data; same seed produces byte-for-byte equivalent serialisable scenario data.

### Milestone 2 — Build and prove the scheduling engine

1. Implement `createState`, `startRun`, scenario setup, `getHorizon`, `getJobReservations`, and `getPlacementValidation`.
2. Implement scheduling and unscheduling, including overlap, horizon, dependency, deadline, lane, and weather checks.
3. Implement the fixed resolution order and `WindowReport` described above.
4. Add cancellation confirmation and one-time completion/miss effects.
5. Implement restart from a copied shift snapshot.

**Acceptance:** Engine tests prove a job cannot overlap lanes; each known weather restriction blocks the correct job; fault ticks occur only under their stated weather; completion/miss effects apply exactly once; and an identical seed plus command list produces identical state.

### Milestone 3 — Assemble authored campaign and generator

1. Finish six campaign shift definitions with first-use examples for each new mechanic.
2. Build `generator.ts` to choose approved weather variations, optional jobs, names, short transmissions, and upgrade offers from separate seed streams.
3. Implement baseline feasibility validation and the test-only solver.
4. Create Open Orbit from a compact scenario template with 10 windows, 2–3 faults, 8–12 jobs, one optional high-value contract, and an explicit pass condition.

**Acceptance:** Each campaign shift and 250 generated Open Orbit seeds solve without upgrades, with all required jobs complete and integrity at least 1.

### Milestone 4 — Make the terminal workbench

1. Implement `render.ts` with ANSI-safe helpers: `stripAnsi`, padded cells, clipped one-line labels, and centered text measured after ANSI stripping.
2. Build the 80×28 compact screen first, then add the 96+ wide enhancements. Use fixed display columns and truncate long names rather than allowing panels to drift.
3. Render job cards, selection preview, invalid-placement explanation, forecast, battery/integrity meters, faults, and last-log line.
4. Implement briefing, report, upgrade, ending, resize, and help overlays.
5. Add the required visual language notes to `render.ts`; include the icon map and ASCII fallback helper.

**Acceptance:** Screens align at 80×28 and 120×36 after ANSI stripping; no required information relies on colour; a light theme remains readable; and the selected job’s full mechanical requirement is visible in compact layout.

### Milestone 5 — Controller, lifecycle, and polish

1. Implement `index.ts` using the project’s controller lifecycle, alternate buffer, hidden cursor, 20 FPS rendering, key disposal, and shared pause menu.
2. Map all documented keys, including the two-step turn commit and cancel confirmation.
3. Add restrained report flashes, title glitch, and a small completion/blocked event accent. Respect reduced-motion-by-design: no continuous animation in the workbench.
4. Register the game as `workshop` only after its core tests and build pass.

**Acceptance:** `stop()` always disposes intervals/listeners and restores the terminal; Escape uses shared pause controls; `Q` exits through standard game transitions; game can be started/stopped repeatedly without duplicate key handling.

### Milestone 6 — Balance and release readiness

1. Play every campaign shift from a clean save on default and a light theme at 80×28.
2. Measure first-play completion time and revise only after observing at least five complete internal playthroughs per shift/seed family.
3. Tune job durations/deadlines before adding more content. Remove any case where the best choice is obvious solely because one job has a much larger score reward.
4. Run full typecheck, tests, build, and a 1,000-seed solver sweep before changing maturity from workshop.

**Acceptance:** The game has at least two meaningful plans in most Open Orbit seeds, all loss reports name a cause, no required job is obscured at minimum size, and regression tests are green.

## Test matrix

| Area | Essential tests |
|---|---|
| Determinism | Same seed and commands yield identical state/reports; named cosmetic streams do not alter job/weather stream. |
| Scheduling | Reject lane overlap, out-of-horizon placement, unsafe weather, unmet dependency, and impossible duration; accept legal multi-lane reservation. |
| Resolution | Stable job order; power priority matches preview; weather charge applies after work; blocked job remains reserved; effects apply once. |
| Faults | Every fault triggers only in its listed condition; each remedy removes/changes exactly its listed effect. |
| Deadlines | Queued expiry and blocked-final-segment expiry apply one miss effect only; late completion cannot double-penalise. |
| Progression | Correct pass threshold, restart snapshot, deterministic upgrade offers, complete ending flags. |
| Generator | Valid references, at least one baseline solution for each sampled seed, no arrival/dependency impossible by construction. |
| Rendering | ANSI-stripped line width ≤ terminal columns; 80×28 required labels exist; ASCII fallback width is stable. |
| Lifecycle | Start/stop cleans listener and intervals; pause/resume does not advance game time or mutate state. |

Use targeted commands during development:

```text
npm test -- orbital-post
npm run typecheck
npm run build
```

## Scope boundaries

### Version 1 includes

- Six deterministic campaign shifts and seeded Open Orbit.
- Three lanes, five weather states, two global tracks, five faults, job dependencies, and one layer of upgrades.
- 18–24 authored job templates, 20–30 concise radio/manifest lines, and repeatable end reports.
- Deterministic restart and visible seed at pause/end report.
- Full keyboard accessibility, compact/wide terminal layouts, light-theme check, shared pause/transition integration, and solver-backed content tests.

### Explicit non-goals

- Real-time simulation, real astronomy data, orbital mechanics, free-flying ships, combat, weapons, or crew pathfinding.
- Hidden weather rolls, reaction-time checks, mouse controls, audio requirements, or text parsers.
- A trading economy, crafting tree, base-building grid, inventory micromanagement, persistent stat grinding, or unlocks that make a failed run invalid.
- Online leaderboards, cloud saves, daily-login rewards, multiplayer, or a persistent campaign save in the first release.
- A giant procedural narrative generator. Use concise authored radio templates with variables so operational facts stay clear.

## Definition of done

Orbital Post is ready to leave workshop when:

1. A new player can explain why a chosen EVA job will be blocked by the next flare before pressing advance.
2. Every schedule rejection and window failure names its exact lane, weather, dependency, power, deadline, or fault cause.
3. The tutorial teaches scheduling, forecast reading, and one blocked-work consequence without a text wall.
4. All campaign shifts and sampled generated seeds have a solver-verified baseline route with no upgrades.
5. Same seed plus command sequence produces the same reports, ending flags, and score.
6. The operations screen is legible at 80×28 in default and light themes; colour is never required to understand a state.
7. The game follows Gamr’s terminal controller, pause-menu, transition, cleanup, typecheck, test, and build conventions.

