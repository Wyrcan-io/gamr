# The 13th Lift — Full Game & Implementation Plan

## Product decision

Build **The 13th Lift** as a turn-based, seeded logic game for `gamr`. The player is the night operator of a lift in a skyscraper whose floor labels, departments, and physical landings drift after midnight. Passengers ask for places rather than trustworthy numbers. Their requests and observations are the evidence needed to infer which buttons lead to real floors, program a safe stop order, and avoid landings that should not exist.

The first release should be a compact story campaign with 15 service rides plus one finale route, lasting roughly 20–30 minutes. A fixed tutorial sits outside that count. The release also includes deterministic seeded puzzle generation, three successful story endings, one failure ending, and a shorter replay mode for repeat sessions.

The game is not a reaction test, an elevator simulator with real-time scheduling, or a collection of hand-authored riddles. Its central promise is:

> Read the riders. Infer the building. Program the route. Do not stop at a floor that is only pretending to be there.

Recommended registry metadata:

```ts
{
  id: 'the-13th-lift',
  name: 'The 13th Lift',
  description: 'Read the riders. Program the route. Do not stop at thirteen.',
  maturity: 'workshop',
  pace: 'turn-based',
  difficulty: 3,
  session: 'campaign',
  run: runThe13thLiftGame,
}
```

## Design goals

1. **Every route is deducible.** The game may be strange, but its logic is exact. A wrong answer must be explainable from visible evidence.
2. **Passengers are mechanics, not flavor wrappers.** Requests, badges, prior journeys, and observations provide the constraints that reveal the current building law.
3. **The lift must feel physical.** Doors, button lights, direction arrows, chimes, and a changing shaft diagram make the puzzle feel like operating a machine rather than filling out a quiz.
4. **The building tells the story procedurally.** Recurring passengers, renamed departments, service notices, and route consequences advance authored story threads in seed-dependent combinations.
5. **No parsing tricks.** The player reads natural-language clue text, but the engine reasons over typed predicates. Typography, synonyms, and prose are never part of correctness.
6. **Short, calm turns.** There is no timer. A normal ride should take 45–90 seconds to inspect and solve.
7. **Mistakes continue the story.** Incorrect routes damage Continuity and alter story threads; they do not normally force an immediate restart.

## Explicit experience

The player sees the lift doors close on two or three passengers. Each passenger asks for a department and offers a small observation:

- “Records, please. It answered to seven when I came down.”
- “The Clinic is above Accounts tonight. It was not yesterday.”
- “Do not trust the button with no counterweight echo.”

The panel might show `6 7 8 9 13`. A service memo says exactly one adjacent pair of labels has traded landings. The operator cross-checks the directory and witness statements, selects an ordered route such as `7 → 9`, and commits it. The shaft display climbs. At each stop, the actual landing is revealed, the correct passengers leave, and the building reacts.

A successful ride produces satisfaction, not because the player guessed the designer's riddle, but because the route follows from a small, inspectable proof.

## Core loop

Each ride has five steps:

1. **Board** — two to four passengers enter; their destinations, priority conditions, and clue lines are visible.
2. **Inspect** — cycle passenger cards and open the directory, active service memo, prior stop log, or optional hint.
3. **Program** — select one to three panel buttons in order. The planned route is always visible and can be edited freely before departure.
4. **Commit** — press Enter. The engine resolves each stop against the hidden true floor mapping and the passenger constraints.
5. **Audit** — see the actual landings, deliveries, any rule violation, score change, Continuity change, and a short story consequence.

After every third ride, an interlude changes the service memo, advances story threads, and introduces one new puzzle concept. After the fifth shift, a final route is an explicit narrative choice rather than a secretly graded puzzle.

The moment-to-moment player verbs are deliberately limited:

- inspect a rider;
- inspect evidence;
- add or remove a stop;
- commit a route;
- ask the intercom for a hint;
- accept the consequence.

## The building model

The game must keep three concepts separate even when the fiction deliberately blurs them:

1. **Shaft position** — an internal ordered index used for above/below/distance relationships. Players see this only as the vertical shaft diagram.
2. **Landing identity** — the real place at a shaft position, such as Records, Clinic, Accounts, or the empty Service Void.
3. **Panel button** — the label the player can press. A button may open a different landing, open no landing, or be absent.

Example true world:

| Shaft position | Real landing | Button that currently opens it |
|---:|---|---|
| 6 | Mailroom | `6` |
| 7 | Accounts | `8` |
| 8 | Records | `7` |
| 9 | Clinic | `9` |
| — | no landing | `13` |

Here, buttons `7` and `8` have swapped landing connections, and `13` is a phantom button. This representation avoids the common implementation error of using “floor number” to mean a location, display label, and physical position at the same time.

## Exact puzzle logic

### Truth model

Each ride contains a `trueWorld`, a set of other plausible worlds allowed by the active service memo, and structured clues that are true in `trueWorld`.

Version 1 does **not** use arbitrary liars. If a later shift changes how a class of witness speaks, the rule is explicit and mechanically simple, for example:

- mirrored badges reverse the words “above” and “below”;
- maintenance staff report button labels, while tenants report department names;
- a passenger who boarded before the midnight bell describes the previous mapping, and their card is visibly time-stamped.

The generator applies that transformation to the typed clue before rendering it. A passenger never lies merely because their portrait or prose seems suspicious.

### Anomaly families

Every anomaly is a pure transformation from a canonical floor map to a candidate world. Only families introduced by the current shift may appear.

| Family | Mechanical effect | First use |
|---|---|---:|
| `stable` | Every button opens its canonical landing. | Tutorial |
| `adjacent-swap` | One adjacent pair of numbered buttons trades landing connections. | Shift 2 |
| `three-cycle` | Three consecutive buttons rotate their landing connections once. | Shift 3 |
| `phantom-button` | One extra lit button maps to no authentic landing. | Shift 4 |
| `echo-button` | An extra label opens an existing landing, but stopping there violates the service memo. | Shift 5 |
| `compound` | One relabel anomaly plus one existence anomaly. | Shift 5 only |

The generator must never freely shuffle all floors. A constrained anomaly family keeps the hypothesis space small enough for a human to reason about and for the solver to explain.

`13` is not hard-coded as “always bad.” Early appearances are phantom or echo buttons, teaching caution. In the finale, evidence may establish a real thirteenth landing. That change is announced by the story and represented as a different world contract, not as an exception hidden from the evaluator.

### Clue predicates

Natural-language lines are renderings of typed facts. Initial predicate kinds:

```ts
type CluePredicate =
  | { kind: 'button-opens'; button: ButtonId; landing: LandingId }
  | { kind: 'button-excludes'; button: ButtonId; landing: LandingId }
  | { kind: 'landing-above'; upper: LandingId; lower: LandingId }
  | { kind: 'button-order'; lower: ButtonId; upper: ButtonId }
  | { kind: 'distance'; a: LandingId; b: LandingId; gaps: number }
  | { kind: 'authentic-button'; button: ButtonId }
  | { kind: 'phantom-button'; button: ButtonId }
  | { kind: 'same-landing'; a: ButtonId; b: ButtonId };
```

Each predicate needs three functions:

```ts
isClueTrue(world, predicate): boolean
renderClue(predicate, voice, context): string
explainClue(predicate, world): EvidenceLine[]
```

Prose variants are selected after the fact is chosen. This means “Records answered to seven,” “Seven opened on Records,” and “I left Records by the 7 lamp” may share one predicate without creating three pieces of logic.

### Passenger requests

A passenger requests a `LandingId`, not a raw button. Each passenger may also add one route constraint:

```ts
type ServiceConstraint =
  | { kind: 'before-passenger'; otherPassengerId: PassengerId }
  | { kind: 'by-stop'; maxStopIndex: 1 | 2 | 3 }
  | { kind: 'last-off' }
  | { kind: 'share-stop'; otherPassengerId: PassengerId };
```

Constraints are always stated plainly on the card:

- `URGENT — must be the first stop`
- `ESCORT — leaves with Mara Vale`
- `NIGHT PORTER — must leave last`

Do not introduce soft preferences into correctness. Comfort, route length, and number of stops may affect score, but a route is either safe or unsafe according to explicit conditions.

### Route construction

The active panel bank contains five to nine selectable buttons. The player may queue at most three distinct stops. A generated ride has at most three distinct requested landings.

A route is represented by button IDs, for example:

```ts
['button-7', 'button-9']
```

It is resolved into a sequence of actual landing IDs by `trueWorld.buttonMap`. Passengers leave at the first stop matching their requested landing.

### Route validation precedence

`evaluateRoute` applies checks in this exact order so audits are stable and understandable:

1. The route has one to three distinct, currently enabled buttons.
2. Every selected button resolves to an authentic permitted landing.
3. Every requested landing is visited.
4. `share-stop` constraints are satisfied.
5. `before-passenger`, `by-stop`, and `last-off` constraints are satisfied.
6. Any shift-wide ordering rule is satisfied.
7. Efficiency bonuses are calculated; they never change correctness.

The evaluator returns all stop outcomes and all violations, but the audit foregrounds the first violation by this precedence. Phantom-floor failures therefore cannot be obscured by a later missed passenger.

```ts
interface RouteEvaluation {
  correct: boolean;
  stops: StopOutcome[];
  deliveredPassengerIds: PassengerId[];
  strandedPassengerIds: PassengerId[];
  violations: RouteViolation[];
  decisiveEvidence: EvidenceLine[];
  optimalStopCount: number;
}
```

### Valid answers, not one hard-coded answer

The engine must never compare the player's route to a stored answer string. It enumerates or evaluates the route against the world and constraints. If two routes are genuinely equivalent, both are accepted.

For generated puzzles, the desired standard is **unique actionable knowledge**:

- the visible clues may leave more than one candidate world;
- however, every surviving candidate world must agree on at least one safe route;
- for most campaign rides they should agree on exactly one shortest safe route;
- any other route marked correct by `evaluateRoute` is still accepted.

This is less brittle than requiring the player to reconstruct every irrelevant corner of the building.

### Worked ride

Active memo:

> One adjacent pair from 6–9 has traded call lines. One extra button has no counterweight echo.

Panel: `6 7 8 9 13`

Directory:

| Canonical position | Department |
|---:|---|
| 6 | Mailroom |
| 7 | Accounts |
| 8 | Records |
| 9 | Clinic |

Passengers:

- **Ada Rook** — requests Records; `URGENT — first stop`; says, “Accounts answered to eight when I came down.”
- **Dr. Vale** — requests Clinic; says, “The Clinic lamp is still honest.”
- **Night porter** — clue only; says, “Thirteen lit, but the counterweight never moved.”

Deduction:

1. `8` opens Accounts.
2. Exactly one adjacent pair is swapped, so `7` opens Records.
3. `9` still opens Clinic.
4. `13` is the extra phantom button.
5. Ada must leave before Dr. Vale.

Shortest safe route: `7 → 9`.

The audit for `8 → 9` should say that `8` opened Accounts, so Ada's requested landing was never visited. The audit for `13 → 7 → 9` should foreground that `13` had no authentic landing and cost extra Continuity.

## Puzzle generation and solver

### Deterministic generation pipeline

Every ride is produced from `mixSeed(campaignSeed, shiftIndex, rideIndex)`:

1. Select a local canonical floor window and three to six landing identities.
2. Select the allowed anomaly contract for the shift.
3. Enumerate every candidate world under that contract.
4. Pick one candidate as `trueWorld` with the seeded PRNG.
5. Choose two to four passenger requests whose distinct destinations fit the route budget.
6. Choose zero to two explicit service-order constraints.
7. Generate all clue predicates that are true in `trueWorld` and reference visible content.
8. Score clue candidates by information gain, wording variety, and whether they help identify a requested landing or dangerous button.
9. Add clues greedily while filtering candidate worlds.
10. Enumerate possible button routes of length one to three.
11. Reject the puzzle unless visible evidence leaves at least one route safe in every surviving world.
12. Prefer puzzles with one shortest universally safe route; accept multiple equivalent routes only when they express the intended lesson.
13. Render clues using passenger voice templates.
14. Run content and solvability validation before returning the ride.

At a maximum of nine buttons and three stops, route enumeration is small: fewer than 600 ordered routes when repetitions are forbidden. World enumeration is also intentionally bounded by anomaly contracts.

### Clue selection score

A practical scoring heuristic is:

```text
score =
  5 * eliminatedCandidateWorlds
  + 4 * requestedLandingRelevance
  + 3 * dangerousButtonRelevance
  + 2 * newPredicateFamily
  + 1 * newPassengerVoice
  - 3 * repeatedEntityReference
  - 2 * directAnswerWhenIndirectClueWouldSuffice
```

Information gain does not need floating-point entropy. Candidate elimination counts are deterministic, easy to test, and sufficient for the small hypothesis space.

### Generator fallback

Generation must have a hard attempt limit, for example 40 attempts. If it cannot produce a valid ride, it returns a tested authored fallback for that shift and logs a development-only diagnostic. It must never emit an unvalidated puzzle or loop indefinitely.

### Explanation generation

The same structured facts used by the solver should produce the audit:

1. show what each pressed button actually opened;
2. show which visible clue established that mapping;
3. show the first violated service constraint;
4. show one safe route if the player requests help after a failed ride.

No separate hand-written answer explanation should be maintained, because it can drift away from the evaluator.

## Campaign structure

### Tutorial — The Lobby Test

One fixed ride with a stable mapping and two passengers:

- one requests Laundry on `4` and must leave first;
- one requests Records on `6`;
- the panel is honest;
- the game walks through selecting `4`, then `6`, undoing a stop, and committing.

The tutorial teaches the difference between department and button, the route strip, audits, and the fact that reading has no time cost. It does not use a phantom floor.

### Shift 1 — Honest Machinery

- 3 rides.
- Stable maps and direct association clues.
- One priority constraint at a time.
- Introduces Mara Vale, a courier carrying mail addressed to an operator who disappeared twelve years ago.
- Target success rate: 90–100%.

### Shift 2 — Traded Names

- 3 rides.
- One adjacent swap per ride.
- Adds exclusion and button-order clues.
- The directory begins correcting itself after the passengers speak.
- A maintenance notice refers to the player by the missing operator's name.
- Target success rate: 75–90%.

### Shift 3 — Floors in Motion

- 3 rides.
- Adjacent swaps or a three-cycle.
- Adds relative and distance clues.
- Introduces time-stamped “previous mapping” testimony with an explicit memo rule.
- A child passenger appears at different ages on consecutive rides.
- Target success rate: 65–80%.

### Shift 4 — The Button Between Buttons

- 3 rides.
- Adds one phantom button; `13` first appears.
- Teaches authenticity clues such as counterweight echo, arrival chime, and directory seal.
- Visiting a phantom costs two Continuity instead of one.
- The hidden census thread reveals that the building once registered thirteen residents on a deleted floor.

### Shift 5 — Service for the Absent

- 3 rides.
- Allows one relabel anomaly plus one phantom or echo button.
- Uses two service constraints at most.
- Recurring passengers' outcomes determine which finale evidence is available.
- The last normal ride can establish that `13` is either a void, a duplicated landing, or an erased authentic landing in this campaign's story state. The evidence is explicit.

### Finale — Operator's Choice

The finale is not secretly scored as a normal puzzle. The panel offers three labeled courses whose consequences are previewed:

- **Seal the line** — remove `13`, stabilize the other floors, and preserve the official history.
- **Open the landing** — recognize the erased residents and allow the thirteenth floor to become real again.
- **Take the operator's key** — remain between floors and keep the building from choosing future operators; unlocked by protecting both the missing-operator and deleted-census threads.

All available choices are accepted inputs. The result screen describes the outcome and provides a score/rank separately from the moral ending.

### After Hours replay mode

After Hours is a six-ride replay mode intended for 8–12 minute sessions:

- begin with 3 Continuity and 2 Intercom charges;
- draw one ride from each shift contract, then one compound final ride;
- omit recurring-character story beats and use short service notices instead;
- retain deterministic seeds, exact audits, scoring, and rank;
- show the numeric seed on the start and result screens for reproducible challenge runs;
- end with a service report rather than a moral choice.

It is selectable from the start screen because Version 1 deliberately has no save file with which to persist an unlock. Label it `AFTER HOURS — RECOMMENDED AFTER STORY` so players understand that it uses later puzzle rules. After Hours is not endless mode. A fixed six-ride arc keeps generation validation and balance tractable, and it gives the campaign's solver systems a replayable purpose without diluting the authored story.

## Procedural story system

The story is authored, conditional, and deterministic. It is not generated prose.

### Story threads

| Thread | Central question | Progress source |
|---|---|---|
| `missing-operator` | What happened to Elias Ward, the previous night operator? | Deliver Mara and maintenance staff safely; inspect operator notices. |
| `deleted-census` | Did a real thirteenth floor exist? | Avoid premature phantom stops; deliver census clerks and the age-shifting child. |
| `building-voice` | Is the skyscraper protecting its tenants or consuming them? | Compare intercom statements with resolved routes and choose whom to trust. |

Each thread uses explicit states such as `unseen`, `active`, `protected`, `compromised`, and `resolved`. Story checks must never inspect score alone; they inspect named route outcomes and flags.

### Beat selection

A story beat contains:

```ts
interface StoryBeat {
  id: StoryBeatId;
  shift: number;
  priority: number;
  prerequisites: StoryCondition[];
  excludes?: StoryCondition[];
  lines: string[];
  effects: StoryEffect[];
  once: boolean;
}
```

At an interlude, choose the highest-priority unseen eligible beat, breaking ties with the campaign seed. A beat is at most three short lines. Critical campaign information must have a fallback beat so a failed delivery cannot make the finale incomprehensible.

### Story safety rules

- Story prose may point toward evidence but cannot override a typed clue.
- A missed recurring character changes their thread; they may reappear only through a beat that explains the return.
- A generated passenger name cannot collide with a recurring cast member.
- The same line cannot appear twice in one campaign.
- Finale options state their known consequences; ambiguity may remain emotional, not mechanical.
- Failure content should be uncanny, not humiliating or punitive toward the player.

## Resources, mistakes, scoring, and endings

### Continuity

The campaign begins with 5 Continuity.

- correct route: no change;
- valid landings but one or more passengers missed or mistimed: `-1` total;
- authentic but prohibited echo landing: `-1`;
- phantom landing: `-2`;
- Continuity cannot exceed 5 unless a specific story beat restores one point.

At 0 Continuity, the campaign ends with **New Operator**, a failure epilogue in which the player's name appears on an old service roster. The results screen still summarizes discovered threads and offers restart/quit.

### Intercom hints

The player receives three Intercom charges for the campaign. A hint does one of the following, in order:

1. marks one selected button as provably unsafe;
2. reveals one clue predicate in direct language;
3. if the route remains underdetermined to the player, adds the next stop of a universally safe route.

A hint costs 75 potential score, never Continuity, and does not change story state. Reading the directory, rules, passenger cards, and logs is free.

### Score

Score is secondary to completing the story:

```text
ride score =
  100 × passengers delivered
  + 150 if correct on departure
  + 50 if using a shortest valid route
  - 75 × hints used on this ride

campaign bonus =
  200 × remaining Continuity
  + 300 × resolved story threads
```

Do not add a speed bonus. The design wants careful reading. End ranks can be `Relief`, `Attendant`, `Operator`, and `Custodian`, with thresholds tuned from playtest telemetry.

## Interface and controls

### Target layout

Minimum supported size: `80×28`. Ideal size: `100×32` or wider.

At `80×28`, use three main regions and overlays instead of squeezing every reference onto screen:

```text
┌─ THE 13TH LIFT ─ SHIFT 4 / RIDE 2 ───── CONTINUITY ◆◆◆◇◇ ─ SCORE 2450 ─┐
│ ┌─ CAR / RIDERS ─────────┐ ┌─ PANEL ─────────┐ ┌─ EVIDENCE ──────────┐ │
│ │ ▲ direction            │ │   [ 6 ] [ 7 ]   │ │ ADA ROOK             │ │
│ │ current: 06 MAILROOM   │ │ > [ 8 ] [ 9 ]   │ │ Wants: RECORDS        │ │
│ │                        │ │   [13?] [ M ]    │ │ URGENT: first stop    │ │
│ │ ● Ada Rook       REC   │ │                  │ │ “Accounts answered    │ │
│ │ ○ Dr. Vale       CLI   │ │ ROUTE  7 → 9     │ │  to eight.”           │ │
│ │ ◇ Night porter   CLUE  │ │                  │ │                       │ │
│ └────────────────────────┘ └──────────────────┘ └──────────────────────┘ │
│ MEMO: ONE ADJACENT PAIR TRADED LINES. ONE EXTRA BUTTON HAS NO ECHO.      │
│ LOG: 06 DOORS CLOSED  •  COUNTERWEIGHT READY                             │
│ ↑↓←→ move  SPACE queue  BACKSPACE undo  TAB rider  D directory  ENTER go │
└───────────────────────────────────────────────────────────────────────────┘
```

On wider terminals, the full directory can remain visible under Evidence. On the minimum layout, `D`, `R`, and `?` open centered overlays.

### Controls

| Input | Action |
|---|---|
| Arrow keys / WASD | Move the button cursor. |
| Space | Add the highlighted button to the end of the route; if already queued, remove it. |
| Backspace / Delete | Remove the most recently queued stop. |
| Tab / Shift+Tab | Cycle passenger cards. |
| `D` | Toggle directory overlay. |
| `R` | Toggle active service memo/rules overlay. |
| `L` | Toggle prior stop log. |
| `I` | Spend an Intercom hint after confirmation. |
| Enter | Commit a non-empty route or advance an audit/interlude. |
| `?` | Toggle controls and symbol legend. |
| Escape | Open the shared pause menu. |

Hint confirmation is required because it spends a limited resource. No other ordinary inspection action should require confirmation.

### Visual language

Use a small semantic vocabulary with one-column symbols and an ASCII fallback. Never communicate a state with color alone.

| Concept | Primary | ASCII | Treatment |
|---|---|---|---|
| lift car/current landing | `▣` | `#` | bold theme accent |
| selected cursor | `›` | `>` | bold inverse or accent |
| queued stop | `●` | `o` | numbered route label |
| unqueued button | `○` | `.` | normal |
| suspicious button | `◇` | `?` | warning label, not color alone |
| confirmed authentic | `◆` | `+` | success label |
| phantom/invalid | `×` | `x` | danger label |
| passenger aboard | `♟` or `●` | `P` | name always present |
| clue-only witness | `◈` | `W` | `CLUE` tag |
| destination fulfilled | `✓` | `+` | `DELIVERED` text |
| priority passenger | `!` | `!` | `URGENT` text |
| Continuity full/empty | `◆` / `◇` | `#` / `-` | numeric value also available |
| route direction | `→` | `>` | route strip |
| building anomaly | `≈` | `~` | paired with anomaly name |

Use theme-aware accents from `getCurrentThemeColor()`, muted structural colors from `getSubtleBackgroundColor()`, and explicit light-theme alternatives via `isLightTheme()`. Alignment must be measured on visible text after stripping ANSI codes.

### Motion and effects

The game is turn-based, so motion should punctuate rather than distract:

- a 250–400 ms shaft travel animation after commit;
- a single chime flash at an authentic stop;
- a brief one-column shudder and red/cyan label split for a phantom stop;
- a small sparkle/chime on a perfect ride;
- a restrained title glitch that occasionally replaces `13` with a blank or `??`;
- no continuous screen shake, blinking body text, or animation during reading.

Use shared flash/shake/effect helpers where applicable. Provide an internal reduced-motion switch that collapses travel animation to one frame for tests and a future settings hook.

## Technical architecture

### File layout

```text
src/games/the-13th-lift/
├── index.ts             # xterm lifecycle, input mapping, pause menu, animation clock
├── types.ts             # serializable domain model and commands
├── seed.ts              # deterministic PRNG and seed mixing
├── content.ts           # landings, cast, voice templates, story beats, shift contracts
├── solver.ts            # candidate worlds, clue truth, route enumeration/evaluation
├── generator.ts         # seeded ride construction and fallback selection
├── validate.ts          # content and large-seed validation helpers
├── engine.ts            # pure command/state transitions and campaign progression
├── render.ts            # ANSI frame construction and layout helpers
├── solver.test.ts
├── generator.test.ts
├── engine.test.ts
└── render.test.ts
```

Keep gameplay logic out of `index.ts` and ANSI rendering out of `engine.ts`. A planned game of this complexity should not be implemented as one 1,500-line controller file.

### Core types

```ts
export type Phase =
  | 'start'
  | 'tutorial'
  | 'briefing'
  | 'boarding'
  | 'planning'
  | 'transit'
  | 'audit'
  | 'interlude'
  | 'finale'
  | 'ending'
  | 'gameOver';

export type ButtonId = string;
export type LandingId = string;
export type PassengerId = string;
export type StoryThreadId = 'missing-operator' | 'deleted-census' | 'building-voice';

export interface Landing {
  id: LandingId;
  canonicalLabel: string;
  shaftIndex: number;
  department: string;
  authentic: boolean;
}

export interface PanelButton {
  id: ButtonId;
  label: string;
  enabled: boolean;
  suspicious: boolean;
}

export interface World {
  id: string;
  anomalyIds: string[];
  landings: Record<LandingId, Landing>;
  buttonMap: Record<ButtonId, LandingId | null>;
}

export interface Clue {
  id: string;
  speakerId: PassengerId;
  predicate: CluePredicate;
  renderedText: string;
  sourceTime: 'current' | 'previous';
}

export interface Passenger {
  id: PassengerId;
  name: string;
  archetype: string;
  destination: LandingId | null;
  constraints: ServiceConstraint[];
  clueIds: string[];
  recurringId?: string;
}

export interface RidePuzzle {
  id: string;
  seed: number;
  panel: PanelButton[];
  visibleLandings: Landing[];
  passengers: Passenger[];
  clues: Clue[];
  serviceMemoIds: string[];
  trueWorld: World;
  candidateWorlds: World[];
  safeRoutes: ButtonId[][];
  shortestSafeRouteLength: number;
}

export interface ThreadState {
  state: 'unseen' | 'active' | 'protected' | 'compromised' | 'resolved';
  progress: number;
  flags: string[];
}

export interface GameState {
  version: 1;
  seed: number;
  mode: 'story' | 'tutorial' | 'after-hours';
  phase: Phase;
  shiftIndex: number;
  rideIndex: number;
  campaignRideIndex: number;
  puzzle: RidePuzzle | null;
  selectedButtonIndex: number;
  selectedPassengerIndex: number;
  plannedRoute: ButtonId[];
  continuity: number;
  intercomCharges: number;
  score: number;
  hintsUsedThisRide: number;
  lastEvaluation: RouteEvaluation | null;
  threads: Record<StoryThreadId, ThreadState>;
  seenBeatIds: string[];
  activeOverlay: 'none' | 'directory' | 'rules' | 'log' | 'help' | 'hint-confirm';
  eventLog: LogEntry[];
  endingId: string | null;
}
```

`RidePuzzle.trueWorld` is included in runtime state for evaluation but must never be read by planning-screen rendering. Render helpers should accept a deliberately redacted `PlayerRideView` so accidental solution leakage is structurally difficult.

### Engine command API

```ts
export type Command =
  | { type: 'startCampaign'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'startAfterHours'; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'moveButtonCursor'; dx: number; dy: number }
  | { type: 'cyclePassenger'; direction: 1 | -1 }
  | { type: 'toggleStop' }
  | { type: 'undoStop' }
  | { type: 'toggleOverlay'; overlay: GameState['activeOverlay'] }
  | { type: 'requestHint' }
  | { type: 'confirmHint' }
  | { type: 'commitRoute' }
  | { type: 'finishTransit' }
  | { type: 'dismissAudit' }
  | { type: 'dismissInterlude' }
  | { type: 'chooseFinale'; choiceId: string }
  | { type: 'restart'; seed?: number };

export interface CommandResult {
  state: GameState;
  events: DomainEvent[];
}
```

`applyCommand(state, command)` may mutate a cloned state or return a new state, but tests must treat it as a pure deterministic boundary: no terminal access, time reads, unseeded randomness, or intervals.

### Commit pipeline

```text
commitRoute
  → validate route syntax
  → evaluate against trueWorld
  → store complete StopOutcome list
  → emit transit animation events
  → finishTransit
  → apply score and Continuity once
  → apply named story outcome flags
  → enter audit
  → dismissAudit
  → next ride, interlude, finale, ending, or gameOver
```

The `finishTransit` split lets the controller animate without putting timers in the domain engine. Score, damage, and story effects must be guarded by a resolution ID so resize events or duplicate Enter presses cannot apply them twice.

### Key invariants

1. The same seed and command sequence always produce byte-equivalent serializable domain state.
2. Planning render code never receives `trueWorld` or `safeRoutes`.
3. Every normal ride has at least one route accepted by `evaluateRoute`.
4. Every displayed clue is true under its declared witness/time rule.
5. Every candidate world obeys the visible service memo.
6. The selected clues make at least one route safe across all surviving candidate worlds.
7. A phantom or prohibited echo stop is never accepted as safe.
8. Score and Continuity apply at most once per ride.
9. Story beats never alter a puzzle after passengers have boarded.
10. Render functions never mutate domain state.

## Content plan

Version 1 content target:

- 18 landing identities, of which 8–10 may appear in a campaign;
- 24 generated passenger names across 8 voice archetypes;
- 5 recurring named characters;
- 8 service memo rules;
- at least 4 prose templates per clue predicate/voice-compatible combination;
- 8 fixed tutorial/fallback rides;
- 30 story beats across three threads;
- 3 success endings and 1 Continuity-failure ending;
- 12 audit lines per violation family to avoid repetition without changing meaning.

Suggested departments mix ordinary and subtly impossible places:

- Lobby, Mailroom, Accounts, Records, Clinic, Laundry, Security;
- Weather Office, Tenant Census, Lost Property, Night Nursery;
- Department of Unclaimed Hours, Quiet Machinery, Absence Management;
- Service Void and the erased Thirteenth Landing.

The campaign should begin mostly mundane. Strange names gain power only after the player understands the normal directory.

## Renderer and controller integration

### `render.ts`

Expose small testable helpers rather than one concatenated frame function:

```ts
renderGame(state, view, dimensions, theme): string
renderCarPanel(view, bounds, theme): string
renderButtonPanel(view, bounds, theme): string
renderEvidencePanel(view, bounds, theme): string
renderRouteStrip(route, buttons, width, theme): string
renderAudit(evaluation, bounds, theme): string
renderOverlay(state, view, bounds, theme): string
stripAnsi(value): string
visibleWidth(value): number
```

Render a helpful resize screen below `80×28`. Clamp all coordinates to at least 1. Clear and redraw the alternate buffer per frame, but keep the normal planning screen at a low refresh rate or render on state change to avoid needless flicker.

### `index.ts`

`runThe13thLiftGame(terminal)` should:

- implement `{ stop, isRunning }`;
- enter the alternate buffer and hide the cursor;
- construct initial state;
- map xterm keys to engine commands;
- use the shared pause menu with all five standard entries;
- own the short transit/title animation clock;
- recalculate layout on current `terminal.cols` and `terminal.rows`;
- dispose key listeners and intervals exactly once;
- restore terminal state through the established game transition helpers.

The engine's `Phase` is separate from controller-level `paused`. Pausing freezes transit animation and ignores gameplay commands.

### Registry work

Update `src/games/index.ts` in three places:

1. direct import from `./the-13th-lift`;
2. active `games` metadata entry;
3. named runner export.

Do not add persistence, menu filters, or new shared infrastructure just for this game unless implementation proves it is reusable.

## Validation and tests

### Solver unit tests

- every anomaly family creates the intended `buttonMap`;
- clue predicates return true/false for hand-built worlds;
- previous-mapping witness transformations are applied exactly once;
- route evaluation accepts equivalent valid routes;
- phantom and echo buttons fail with the correct precedence;
- passenger ordering, deadline, last-off, and shared-stop rules compose correctly;
- audit evidence cites the relevant clue and stop outcome;
- shortest-route calculation is independent of route enumeration order.

### Generator tests

Run at least 10,000 mixed seeds across all shift contracts in a non-watch test or validation script. Assert:

- generation terminates within the attempt cap;
- the same seed produces the same serialized puzzle;
- IDs are unique;
- all referenced passengers, buttons, landings, voices, and story beats exist;
- `trueWorld` belongs to the visible candidate contract;
- every clue is true in `trueWorld`;
- at least one candidate world remains after applying all clues;
- at least one safe route works in every surviving candidate world;
- every stored safe route passes fresh evaluation;
- no stored safe route visits a phantom/prohibited echo;
- requested landing count does not exceed route capacity;
- generated rendered lines fit their content budgets.

Fallback usage should be counted. A high fallback rate is a generator defect even when tests technically pass; target less than 0.5% after tuning.

### Engine tests

- phase transitions for tutorial, every shift boundary, finale, ending, and game over;
- six-ride After Hours progression skips story interludes and ends in a seeded service report;
- commands outside their valid phase are no-ops with a notice where useful;
- queuing prevents duplicates and caps at three stops;
- hint confirmation spends one charge and applies one score penalty;
- duplicate commit/finish commands cannot apply damage twice;
- correct, ordinary wrong, echo, and phantom outcomes change Continuity correctly;
- story flags and beat prerequisites resolve deterministically;
- a compromised thread still receives its critical fallback exposition;
- all finale choices map to the intended ending and never masquerade as puzzle failure;
- restart resets all campaign data and can retain or replace the seed as requested.

### Render and lifecycle tests

- snapshots or semantic assertions at `80×28`, `100×32`, and `120×36`;
- start, planning, overlay, pause, transit, audit, interlude, ending, game-over, and resize states;
- default and at least one light theme;
- visible lines never exceed terminal width at the minimum size;
- ANSI-stripped alignment remains stable with all chosen symbols;
- selected, suspicious, authentic, invalid, delivered, and urgent states remain distinguishable without color;
- `stop()` is idempotent and disposes listeners/intervals;
- pause-menu Quit, List Games, and Next Game use the shared transitions.

### Manual playtest questions

- Can a new player explain landing vs. button after the tutorial?
- When a player is wrong, can they identify the overlooked clue before reading the audit explanation?
- Are phantom floors tense without feeling arbitrary?
- Does the route order matter often enough to justify queuing stops?
- Does reading passenger prose feel useful rather than ornamental?
- Is any shift longer than the mechanic can support?
- Are the three finale choices emotionally distinct and mechanically clear?

### Verification commands

```sh
npx vitest run src/games/the-13th-lift
npm run typecheck
npm test
npm run build
```

## Implementation milestones

### 0 — Rules proof and paper fixtures

- Define shaft position, landing identity, and panel button vocabulary.
- Write five hand-built worlds and ten clue fixtures.
- Prove the worked ride and two advanced compound rides by route enumeration.
- Freeze route-validation precedence and Version-1 anomaly families.

Exit criterion: the fixtures can be solved without prose interpretation or special cases.

### 1 — Pure solver vertical slice

- Add `types.ts`, `seed.ts`, and `solver.ts`.
- Implement anomaly enumeration, clue truth, candidate filtering, route enumeration, and evaluation.
- Add complete solver unit coverage.

Exit criterion: a test can generate candidate worlds, filter them with clues, and accept every valid route for a hand-built ride.

### 2 — Seeded ride generator

- Add core landings, passenger archetypes, clue templates, and shift contracts.
- Implement information-gain clue selection and authored fallbacks.
- Add `validate.ts` and large-seed validation.

Exit criterion: all shift contracts pass 10,000-seed validation with acceptable fallback rate.

### 3 — Playable terminal slice

- Implement the pure engine through one complete ride.
- Build the `80×28` planning layout, overlays, route editing, transit reveal, and audit.
- Integrate shared pause menu and controller cleanup.

Exit criterion: the tutorial and one generated Shift-2 ride are playable from the game registry with keyboard only.

### 4 — Campaign and procedural story

- Implement five shifts, 15 service rides, the finale route, Continuity, hints, score, and ranks.
- Add the six-ride After Hours replay mode after campaign completion.
- Add recurring cast, story thread state, interlude beat selection, and four endings.
- Add fixed exposition fallbacks for damaged threads.

Exit criterion: every combination of protected/compromised threads reaches a coherent finale and ending.

### 5 — Visual language and accessibility pass

- Apply the final symbol vocabulary consistently.
- Add restrained lift motion, chimes, title glitch, success, warning, pause, loss, and ending treatments.
- Verify ASCII fallbacks, minimum layout, wide layout, and a light theme.
- Tune text budgets and remove ambiguous-width glyphs.

Exit criterion: all required states remain readable at `80×28` without relying on color.

### 6 — Balance and release integration

- Run playtests and seed instrumentation.
- Tune clue counts, anomaly progression, hint supply, Continuity damage, and score thresholds.
- Add the registry entry and named export.
- Run targeted tests, full tests, typecheck, and build.

Exit criterion: the definition of done below is satisfied with no skipped validation.

## Balance instrumentation

Development-only aggregate metrics should include:

- generation attempts and fallback rate by shift;
- candidate-world count before and after each clue;
- number of universally safe routes and shortest route length;
- predicate-family frequency;
- direct versus indirect clue ratio;
- passenger and landing repetition within a campaign;
- expected Continuity loss under a simple random-route bot;
- solution rate under a solver bot;
- estimated reading load by characters per ride.

Do not ship analytics or network calls. These metrics are local test output used to spot repetitive or degenerate seeds.

Initial balance targets:

| Metric | Target |
|---|---:|
| normal ride requested landings | 2–3 |
| selectable buttons | 5–9 |
| clues | 2–5 |
| candidate worlds before clues | 3–12 |
| shortest safe route | 1–3 stops |
| universally safe shortest routes | usually 1 |
| ride reading load | under 650 characters |
| campaign fallback generation | under 0.5% |
| first-campaign completion | 50–70% in playtests |

## Accessibility and content guidelines

- No timers or speed scoring.
- All information is keyboard-accessible.
- Color always has a symbol or text equivalent.
- Avoid emoji and double-width glyphs in aligned panels.
- Use explicit `ABOVE`, `BELOW`, `FIRST`, `LAST`, `REAL`, and `PHANTOM` terms in rule text.
- Passenger voice may be uncanny, but the mechanically decisive sentence must remain short and literal.
- Never encode correctness in capitalization, punctuation, text color, or a character's perceived trustworthiness.
- Make audits corrective: “8 opened Accounts; Ada requested Records,” not “You should have known better.”
- Keep horror atmospheric and non-graphic. Avoid real-world disability, homelessness, or mental illness as shorthand for unreliability or monstrosity.
- Provide ASCII fallbacks for every domain symbol and verify them in copied logs.

## Main risks and mitigations

| Risk | Mitigation |
|---|---|
| The fiction feels arbitrary. | Typed clue predicates, explicit service memos, and evidence-backed audits. |
| The game becomes a reskinned classification desk. | Ordered multi-stop routes, physical stop reveals, passenger delivery, and route constraints. |
| Generated puzzles are underdetermined. | Enumerate candidate worlds and require universally safe actionable routes. |
| Puzzles are technically valid but exhausting. | Bound worlds/buttons/stops, score clue relevance, and enforce reading budgets. |
| Story variation breaks logic. | Story state never mutates a boarded puzzle; all mechanical changes use shift contracts. |
| `13` becomes an obvious always-avoid button. | Use multiple anomaly meanings and make the finale's authentic 13 explicit. |
| Wrong answers cause cascading unwinnability. | Reset the car between rides, cap Continuity damage, and provide exposition fallbacks. |
| Terminal layout becomes unreadable. | Design for `80×28`, use overlays, short content budgets, and visible-width tests. |
| Controller grows unmaintainable. | Split pure solver, generator, engine, content, renderer, and lifecycle adapter. |

## Version-1 non-goals

- real-time passenger queues or elevator physics;
- a fully simulated persistent skyscraper with every floor active at once;
- free-text answers or natural-language parsing;
- arbitrary liar/truth-teller personalities;
- unrestricted random floor permutations;
- procedural prose generation or external AI calls;
- save files, online seeds, leaderboards, or analytics;
- mouse-only interaction;
- branching dialogue trees unrelated to routing;
- endless content before the campaign and generator are proven fair.

## Definition of done

The 13th Lift is ready for its initial `workshop` release when:

- the fixed tutorial clearly teaches landing identity, panel mapping, and route order;
- a full five-shift campaign of 15 service rides plus one finale route can be completed;
- the six-ride After Hours mode is selectable, clearly marked as post-story content, and reports its seed;
- every generated puzzle is deterministic, solvable, and evidence-explainable;
- the evaluator accepts all valid routes rather than a single stored answer;
- all anomaly families and service constraints have unit coverage;
- 10,000-seed generation validation passes with less than 0.5% fallback use;
- all story-thread outcomes reach coherent finale options and an ending;
- shared pause behavior and controller cleanup match repository conventions;
- start, planning, transit, audit, interlude, pause, ending, loss, resize, and light-theme states are visually verified;
- the symbol vocabulary remains readable at `80×28` with ASCII fallbacks;
- `npx vitest run src/games/the-13th-lift`, `npm run typecheck`, `npm test`, and `npm run build` pass;
- registry metadata and the named runner export are present.

## Repository research basis

This plan follows the project's established patterns rather than introducing a new framework:

- a pure command engine and typed serializable state, as used by the newer complex turn-based games;
- seeded generation and validation separated from terminal rendering;
- a dedicated renderer with minimum-size and light-theme checks;
- shared pause menu and transition helpers;
- direct game registry import, metadata entry, and named runner export;
- targeted Vitest suites plus full typecheck, test, and build verification.

No external research is required for the initial design. The important uncertainties are game-specific—deduction fairness, generator termination, readable terminal layout, and procedural-story coherence—and are addressed by the solver, validation, content contracts, and playtest milestones above.
