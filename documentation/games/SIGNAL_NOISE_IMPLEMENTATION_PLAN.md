# Signal//Noise — Full Game & Implementation Plan

## Product decision

**Signal//Noise is a turn-based signal-intelligence mystery game.** The player operates a three-station listening post: isolate a transmission from a crowded spectrum, take clean directional fixes, triangulate its origin on a small map, then choose the one safe transmission to send in reply.

It is deliberately **not** a reflex-heavy “move the dial before time runs out” game. The tactile pleasure comes from changing a few physical-looking controls and watching the terminal make a hidden system legible: a narrow band emerges from static, a waveform settles, bearings cross on a map, and a fragment of a message changes from alarming to understandable. Pressure comes from a finite action budget and escalating, announced interference—not from real-time input speed.

Version 1 ships a six-case campaign, a short playable tutorial, seedable replayable cases, a compact free-listen mode, and a satisfying end report. It should be built only after a single two-case vertical slice proves that tuning, locating, and replying all feel like parts of one investigation.

## Design pillars

1. **Every conclusion is earned from visible evidence.** A player should be able to point to the band, waveform, decoded header, and bearing lines that justify the answer.
2. **The terminal is the instrument panel.** Spectrum bars, a scope trace, meters, markers, and a paper-map-like grid convey state more directly than a prose-heavy detective UI.
3. **Partial information creates decisions, not opaque guessing.** A weak lock may be useful, but every case can be solved with the supplied tools and has at least one clear route to a clean lock.
4. **Interference changes the puzzle.** Noise is a known, observable signal source with a countermeasure, not a random accuracy penalty.
5. **Mystery stays contained.** Strange stations and transmissions add tone. The player never needs specialist radio knowledge; the game teaches its fictional instruments and rules through play.

## Player promise and session shape

> “I can hear something trying to reach us. If I separate it from the noise, I can find it—and decide whether answering will help or harm.”

| Beat | Player activity | Feeling | Target |
|---|---|---|---:|
| Brief | Read a terse tasking note and target clues. | Purpose, unease | 10–20 s |
| Sweep | Find anomalous energy and tune the right band. | Discovery | 20–60 s |
| Isolate | Match bandwidth/modulation and remove a blocker. | Hands-on mastery | 30–90 s |
| Fix | Take two or three bearings and narrow the map. | Deduction | 20–60 s |
| Decide | Decode enough message/header evidence to choose a reply. | Responsibility | 10–30 s |
| Debrief | See evidence, consequences, and a new complication. | Closure, curiosity | 15–30 s |

A first campaign should last 45–75 minutes, with individual cases growing from 3–5 minutes to 8–12 minutes. Free Listen is a 5–10 minute score-free procedural case once the campaign is complete.

## Core loop

1. Read the case brief: target call-sign fragments, a suspected frequency region, and any current operational rule.
2. Select a receiver station and sweep the 24-channel spectrum to find energy consistent with the brief.
3. Set centre frequency, bandwidth, modulation, and gain. The scope shows a stable, labelled waveform only when the settings cover a transmission correctly.
4. Identify any overlapping interference from its visible spectral shape and marker label; install a limited notch filter or choose a cleaner receiver.
5. Capture a clean **lock** at two receiver stations. Each lock adds a bearing ray to the map and exposes a little more of the packet header/message.
6. Use the ray intersection and decoded facts to identify the source zone and transmission class.
7. Select one broadcast response. The response is evaluated against the decoded protocol and the known source type.
8. Receive an evidence-backed debrief, carry forward a small resource or story consequence, and move to the next case.

The active puzzle is paused by nature. Changing a dial is free; a **sweep**, **capture**, **notch installation**, or **broadcast** consumes one Operations Tick. Escalation only occurs on those explicit actions, so the player can examine the screen and use Help without pressure.

## The instrument model

The game models a fictional but internally consistent radio system. It uses simple discrete rules rather than hidden analogue simulation.

### Spectrum

- The logical spectrum has channels `00` through `23`.
- A transmission has a centre channel and an odd occupied width: `1`, `3`, or `5` channels. Its band is all channels centred on that value.
- A station's sweep displays total energy per channel in `0–9` bars. It is a composite of every source audible at that station.
- An anomaly is never invisible: each target has at least two channels with energy `4+` at every usable receiver, unless the briefing explicitly identifies a receiver outage.
- A transmission's visible **profile** is one of `needle`, `mesa`, `twin`, or `comb`. Profile is encoded in the energy distribution, paired with an ASCII icon, and named in the legend.

Example at centre `11`, width `3`:

```text
CH  07 08 09 10 11 12 13 14 15
    .  .  :  #  @  #  :  .  .
                 ^ centre 11 / width 3
```

### Tuner settings and isolation

The player controls four values. Only the values listed here affect a lock; cosmetic animation never affects rules.

| Control | Values | Rule |
|---|---|---|
| Centre | `00–23` | Must equal the target's centre channel. |
| Bandwidth | `1 / 3 / 5` | Must equal the target's occupied width. Narrower clips it; wider admits avoidable noise. |
| Modulation | `PULSE / DRIFT / CHIRP / BURST` | Must equal the target modulation to decode a header. |
| Gain | `1–5` | Must meet the station-specific required gain but not exceed its overload limit. |

For a target `t` at station `r`, the engine calculates a deterministic lock quality:

```text
targetEnergy = t.powerAt(r)
overlapEnergy = sum(audible non-target energy inside tuned band)
gainPenalty = 0 if requiredGain <= gain <= overloadGain else 3
settingPenalty = 0 if centre, width, modulation match else 6
quality = clamp(0, 9, targetEnergy - floor(overlapEnergy / 2) - gainPenalty - settingPenalty)
purity = targetEnergy / max(1, targetEnergy + overlapEnergy)
```

- `quality 0–2`: no lock; only static and an instruction hint.
- `quality 3–5`: **rough lock**; shows a wide bearing corridor and one non-decisive message fragment.
- `quality 6–7`: **clean lock**; shows an exact bearing ray, target profile, header class, and a fragment.
- `quality 8–9`: **crisp lock**; additionally identifies the source's protocol token or reply constraint.

The UI does not expose the formula, but Help explains the observable equivalents: correct tuning, enough signal, and less overlap produce a stronger lock. A `SIGNAL`, `NOISE`, and `PURITY` meter makes why a lock failed clear.

### Interference and counterplay

Noise sources are authored entities with their own fixed band, profile, and on-screen label once discovered. They may overlap a target but never silently alter its required frequency or answer.

| Interference | Spectrum tell | Effect | Counterplay |
|---|---|---|---|
| Weather front | broad low `~~~~` mesa | adds 2 energy across five channels | Capture from the station outside its coverage. |
| Harmonic repeater | symmetric `^ ^` twin | adds energy at centre ±2 | Tune target's exact width; use a notch on its base frequency. |
| Numbers station | repeating comb `|.|.|` | occupies every second channel in a five-channel span | Match modulation, then notch it after the first identification. |
| Mirror echo | same profile as target, but `ECHO` header | creates a plausible false bearing | Take a second station fix; echoes fail to intersect at a real zone. |
| The Choir | moving three-channel mesa, announced each tick | changes centre by one channel per Operations Tick | Re-sweep after each action or spend the phase-lock resource. |

Each case gives 1–3 **notch filters**. A notch is installed by selecting a discovered interference marker and confirming it; it suppresses that source at all stations for the rest of the case and costs one Operations Tick. It cannot suppress the target, so a careless use is recoverable but makes later isolation harder. Campaign cases always reserve either a clean-receiver route or enough filters to solve them.

### Receiver stations and bearings

Every case uses the same 9×7 regional map and three fixed listening posts:

```text
      0 1 2 3 4 5 6 7 8
    0 . . W . . . . E .
    1 . . . . . . . . .
    2 . . . . . . . . .
    3 . . . . . . . . .
    4 . . . . . . . . .
    5 . . . . . . . . .
    6 . . . . S . . . .
```

`W`, `E`, and `S` are receivers; source zones occupy any non-receiver cell. A station reports one of eight named directions (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`) calculated from its location to the source by octant. A clean lock creates that octant ray. A rough lock creates the reported ray plus its clockwise and anticlockwise neighbours.

Triangulation is exact and transparent:

```text
candidateZones = all legal source cells
for each active lock:
  keep zone if its octant from lock.station is in lock.allowedBearings
```

- Two clean locks must reduce candidates to one zone for all Version-1 campaign cases.
- If a geometrically possible tie remains, the case supplies a third useful station or a decoded location clue such as `SOUTH OF THE RESERVOIR`.
- A source can only be broadcast to after candidates equal one. This prevents “lucky” location guesses and makes the map a proof, not an extra quiz.
- A player may replace a lock at a station at any time; only its latest observation counts.

### Decoding and broadcast decisions

Locks reveal packet content in a fixed order. The partial text is authored, not generated language.

| Evidence unlocked | Rough | Clean | Crisp |
|---|---:|---:|---:|
| Call-sign fragment | yes | full | full |
| Waveform/profile | yes | yes | yes |
| Packet class | no | yes | yes |
| Challenge/protocol token | no | no | yes |
| Location clue | optional | optional | full where needed |

Every source has a packet class and exactly one valid response. The case brief or an unlocked **Protocol Card** defines the rule in plain language.

| Packet class | Visible evidence | Correct broadcast | Why |
|---|---|---|---|
| Distress | `MAYDAY` header plus valid rescue token | `ACK / HOLD POSITION` | Keeps the caller on the identified band. |
| Relay | `STORE-AND-FORWARD` plus destination code | `ACK / RELAY` | Forwards the encoded payload safely. |
| Quarantine | blacklisted call sign or containment token | `SILENCE` | Any reply confirms a listening post. |
| Challenge | nonce phrase plus expected counter-token | matching `COUNTERSIGN` | Authenticates a friendly transmitter. |
| Mimic | inconsistent class/header or `ECHO` provenance | `JAM / MARK` | Flags the deceptive carrier without replying. |

The player never needs to infer a secret code from prose. A crisp lock supplies the token, and the broadcast panel renders only protocol-valid formats. The final choice is a judgment about *whether and how* to answer, grounded in visible source identity and operational rules.

## Rules, failure, and scoring

### Operations Ticks and Exposure

Each case begins with `Exposure 0/12` (tutorials use no limit). The following actions advance one tick: sweep, capture, notch, phase-lock, and broadcast. Pure inspection, tuning, map viewing, Help, and changing station are free.

At each tick, scheduled events are applied before the action result is resolved: an announced moving interferer advances, a receiver may become unavailable, or a packet may repeat a fragment. Events are listed in the brief's `NEXT CONDITIONS` panel with exact tick numbers. There are no hidden random events.

| Event | Exposure | Feedback |
|---|---:|---|
| Routine instrument action | +1 | tick marker and faint scope flicker |
| Capture no-lock | +1 | reason meter stays visible |
| Correct broadcast | ends case | debrief and score |
| Wrong broadcast | +3, then debrief | clear explanation and reduced report rank |
| Exposure reaches 12 before a broadcast | case lost | target disappears; retry / continue options |

Cases can still be completed after a wrong broadcast only in the tutorial. In campaign, an incorrect reply closes that case as a narrative failure but does not end the full campaign; it records a `BREACH` and advances to debrief. This preserves tension without forcing a long-run restart.

### Score and campaign report

```text
caseScore = 1,000
          + 100 × filtersRemaining
          + 75 × cleanLocksBeyondTwo
          - 50 × exposureUsed
          - 300 × wrongBroadcast
```

The score rewards tidy investigation but never makes taking a third confirming measurement feel wrong. End rank is based primarily on correct replies, then score:

| Rank | Requirement |
|---|---|
| CLEAR CHANNEL | 6 correct broadcasts and no failed case |
| RELIABLE HAND | at least 5 correct broadcasts |
| FIELD OPERATOR | at least 4 correct broadcasts |
| STATIC MAGNET | 2–3 correct broadcasts |
| OFF AIR | 0–1 correct broadcasts |

Track `correctReplies`, `failedCases`, `filtersSpent`, `averageExposure`, and the seed. These values support balance work and a replayable final report.

## Campaign content

The campaign is a single night at the **Asterion Listening Post**. The fiction should feel uncanny and humane rather than militaristic: transmissions are people, relays, automated systems, and one ambiguous presence—not enemies to shoot.

### Case progression

| Case | Core lesson | Target / complication | New rule | Budget |
|---:|---|---|---|---:|
| 0 | Tutorial | Clear narrowband rescue ping | Sweep, tune, two clean locks, ACK | unlimited |
| 1 | Read the profile | `MERCY-2` distress transmission under weather noise | Width matters; use a cleaner station | 12 |
| 2 | Counter an overlap | Legitimate relay beside a harmonic repeater | Identify and notch interference | 12 |
| 3 | Do not trust one bearing | An echo copies the target profile from a false angle | Two-station intersection defeats mimicry | 12 |
| 4 | Time changes information | A moving Choir sweeps through a challenge signal | Events are announced; phase-lock or act efficiently | 13 |
| 5 | Competing priorities | Quarantine packet and genuine distress share a band | Header/token decides who receives a reply | 14 |
| 6 | Finale | A familiar call sign uses an unfamiliar protocol amid two blockers | Combine all tools; choose consent over curiosity | 15 |

Case 0 is skippable after first completion and cannot fail. Cases 1–6 are authored layouts plus seed-selected harmless flavour variants (call-sign names, text fragments, profile palette), not fully generated mysteries. That keeps the central deduction fair while allowing reported seed replay value later.

### Narrative thread

Each resolved case adds a clean, optional two-line item to the Log. The recurring signal `ORPHEUS` is not a reward chase; it gradually reveals that the station has been listening to a network of people maintaining their own isolation protocol. The final choice asks whether to relay their location to a central authority, preserve radio silence, or send the requested handshake. Only the action supported by the final packet is considered correct; other choices are acknowledged narratively without framing curiosity as moral failure.

## User interface and controls

### Full layout: 94×30 minimum

```text
                         SIGNAL//NOISE                         CASE 03 / 06
  OPS 05/12  FILTERS ◈◈  TARGET: call ??-7  / expected band 09–15  / NEXT: ECHO @ 07
┌─ SPECTRUM: EAST STATION ───────────────────────┐ ┌─ REGIONAL FIX ────────────┐
│ CH 00 01 02 03 04 05 06 07 08 09 10 11 12 13   │ │ . . W . . . . E .         │
│     .  .  :  :  .  #  @  #  .  .  .  .  .  .   │ │ . . . . ╲ . . . .         │
│                    [11] width 3  PULSE         │ │ . . . . . X . . .         │
│ SIGNAL ███████░░  NOISE ███░░░░░  PURE 72%      │ │ . . . . ╱ . . . .         │
├─ SCOPE / DECODER ──────────────────────────────┤ │ . . . . S . . . .         │
│ ~~/\\~~/\\~~  LOCK: CLEAN  BEARING: SW          │ │ CANDIDATES: 1  [4,3]      │
│ HEADER: STORE-AND-FORWARD   CALL: MERCY-2       │ └───────────────────────────┘
│ FRAGMENT: "...hold the lantern beyond..."       │ ┌─ BROADCAST ──────────────┐
└────────────────────────────────────────────────┘ │ [1] ACK/HOLD [2] RELAY    │
  ←→ centre  ↑↓ bandwidth  M modulation  G gain     │ [3] SILENCE  [4] JAM/MARK │
  S sweep  Enter capture  N notch  Tab station       └───────────────────────────┘
  F map focus  L log  H help  Esc pause
```

The exact waveform is cosmetic within each named modulation, but each modulation has a consistently distinct ASCII trace:

| Modulation | Trace | Non-colour cue |
|---|---|---|
| PULSE | `__/¯¯\__/¯¯\__` | paired plateaus |
| DRIFT | `~~~~~~` | continuous wave |
| CHIRP | `..:--==##` | rising density |
| BURST | `| |  ||   |` | grouped vertical spikes |

### Compact layout: 80×28

- Spectrum and tuner remain at the top, map fills the central area, and the scope/decoded text is shown in a tabbed lower panel.
- `Tab` cycles `SCOPE`, `MAP`, `PROTOCOL`, and `LOG`; mandatory current evidence is never placed only in a hidden panel.
- At less than 80×28, freeze gameplay input and use the shared Gamr resize message showing the required and current dimensions.
- Colour is supplementary: all critical state has a label, number, icon, and text such as `LOCK: ROUGH`, `PURITY 64%`, or `INTERFERENCE: REPEATER`.

### Input map

| Context | Keys | Action |
|---|---|---|
| Start | `T`, `C`, any confirm key | Tutorial, campaign, or continue prompt |
| Analyzer | `←/→` or `A/D` | Change centre channel |
| Analyzer | `↑/↓` or `W/S` when not sweeping | Cycle bandwidth |
| Analyzer | `M` | Cycle modulation |
| Analyzer | `G` | Cycle gain |
| Analyzer | `Tab` | Cycle receiver station |
| Analyzer | `S` | Sweep selected station; consumes one tick |
| Analyzer | `Enter` | Capture current lock; consumes one tick |
| Analyzer | `N` | Open/confirm discovered-interference notch |
| Analyzer | `P` | Spend a phase-lock if available |
| Analyzer | `F`, `L`, `H` | Map focus, log, help |
| Broadcast | `1–4` then `Enter` | Select and confirm response |
| Any active state | `Esc` | Shared pause menu |

`S` must not conflict with movement because tuning is direct, not cursor-based. The controller should also accept arrow keys plus explicit letter alternatives so the game works comfortably in common terminal keymaps.

## Accessibility and clarity requirements

- Never require colour, subtle animation, audio, knowledge of real radio terminology, or exact glyph recognition.
- Every profile, modulation, station, lock quality, source class, and interference type receives a textual label.
- Help includes a one-screen “How a solve works” path and a glossary for `band`, `lock`, `bearing`, `purity`, and `notch`.
- A `REDUCED MOTION` option freezes decorative scope scroll, title glitch, and static bursts without changing the scan or lock information.
- High-frequency visual effects are limited to cosmetic static. The currently tuned channel, lock outcome, and candidate source zone must remain stable for at least one render frame and be present as text.
- No user timing, audio pattern recognition, Morse, real-world emergency procedure, or ability-related test determines success.

## Technical architecture

The core is model-first and deterministic. It must not import `Terminal`, emit ANSI, call wall-clock APIs, or use `Math.random`. The controller owns terminal lifecycle and presentation; engine functions own facts, command validation, state transitions, and evaluation.

```text
src/games/signal-noise/
├── index.ts                 # Gamr controller, intervals, controller lifecycle
├── types.ts                 # domain types, constants, serialisable state
├── seed.ts                  # 32-bit seeded PRNG and seed parsing
├── content.ts               # authored cases, packets, interference, protocol cards
├── spectrum.ts              # band maths, audible energy, isolation/quality
├── triangulation.ts         # octants, bearing rays, candidate-zone intersection
├── engine.ts                # command reducer, ticks, locks, scoring, progression
├── input.ts                 # terminal key -> pure Command mapping
├── render.ts                # pure ANSI layouts and screen-specific render helpers
├── persistence.ts           # guarded local best-result/tutorial-complete storage
├── tutorial.ts              # objectives, scripted unlock gates, hint text
├── engine.test.ts           # model rules, replay, case progression
├── spectrum.test.ts         # energy, profile, tuning, notch quality cases
├── triangulation.test.ts    # octant/ray/candidate proof tests
└── render.test.ts           # layout and colour-independent UI snapshots
```

### Domain model

```ts
export type StationId = 'west' | 'east' | 'south';
export type Modulation = 'pulse' | 'drift' | 'chirp' | 'burst';
export type Profile = 'needle' | 'mesa' | 'twin' | 'comb';
export type LockQuality = 'none' | 'rough' | 'clean' | 'crisp';
export type PacketClass = 'distress' | 'relay' | 'quarantine' | 'challenge' | 'mimic';
export type BroadcastAction = 'ack-hold' | 'ack-relay' | 'silence' | 'jam-mark';
export type Phase = 'start' | 'brief' | 'listening' | 'broadcast' | 'debrief' | 'gameOver' | 'ending';
export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface Position { x: number; y: number; }

export interface Tuner {
  centre: number;
  bandwidth: 1 | 3 | 5;
  modulation: Modulation;
  gain: 1 | 2 | 3 | 4 | 5;
}

export interface Transmitter {
  id: string;
  role: 'target' | 'interference' | 'echo';
  position: Position;
  centre: number;
  bandwidth: 1 | 3 | 5;
  modulation: Modulation;
  profile: Profile;
  powerByStation: Record<StationId, number>;
  requiredGainByStation: Record<StationId, number>;
  overloadGainByStation: Record<StationId, number>;
  packet?: Packet;
  discovered: boolean;
  notched: boolean;
}

export interface Packet {
  callSign: string;
  packetClass: PacketClass;
  correctBroadcast: BroadcastAction;
  fragments: [string, string, string];
  crispToken: string;
  locationClue?: string;
}

export interface Lock {
  stationId: StationId;
  quality: LockQuality;
  allowedBearings: Direction[];
  unlockedFragmentCount: 0 | 1 | 2 | 3;
  capturedAtTick: number;
}

export interface CaseState {
  caseId: string;
  seed: number;
  phase: Phase;
  operationsUsed: number;
  operationLimit: number;
  filtersRemaining: number;
  phaseLocksRemaining: number;
  selectedStation: StationId;
  tuner: Tuner;
  transmitters: Transmitter[];
  locks: Partial<Record<StationId, Lock>>;
  candidateZones: Position[];
  selectedBroadcast: BroadcastAction | null;
  score: number;
  notice: string;
  eventsApplied: string[];
}

export interface CampaignState {
  version: 1;
  seed: number;
  mode: 'tutorial' | 'campaign' | 'freeListen';
  currentCaseIndex: number;
  cases: CaseState[];
  correctReplies: number;
  failedCases: number;
  totalScore: number;
  log: string[];
}
```

All collections are serialisable arrays or plain objects. IDs are authored (`case-03-repeater`) and stable. The target's actual position is held in model state but is never read by rendering except through `candidateZones` and debug-only instrumentation.

### Content contract

Use authored case definitions with validation, rather than generating arbitrary RF layouts. A case definition supplies the target, blockers, scheduled events, briefing text, and validation expectations.

```ts
interface CaseDefinition {
  id: string;
  title: string;
  briefing: string[];
  operationLimit: number;
  filters: number;
  phaseLocks: number;
  target: Omit<Transmitter, 'discovered' | 'notched'>;
  interference: Array<Omit<Transmitter, 'discovered' | 'notched'>>;
  events: ScheduledEvent[];
  requiredStations: StationId[];
  allowedResponses: BroadcastAction[];
  tutorialObjectives?: TutorialObjective[];
}

interface ScheduledEvent {
  id: string;
  atTick: number;
  type: 'moveTransmitter' | 'disableStation' | 'revealFragment' | 'notice';
  transmitterId?: string;
  stationId?: StationId;
  notice: string;
}
```

`validateCase(definition)` must prove before release that:

1. the target has a solve path within the action budget;
2. two clean target locks identify exactly one legal zone, or the supplied third lock/clue resolves the tie;
3. every required transmission setting and decisive reply token appears in a player-visible source;
4. all interference can be avoided or countered with provided resources;
5. scheduled events cannot remove every solve path;
6. profile/modulation labels, fragment count, and reply options are compatible with render data.

The validator can initially inspect curated scripted paths authored alongside each case; a general solver is a post-vertical-slice improvement. It is better to fail loudly on a changed definition than to make a fair-looking but unsolvable mystery.

### Pure command API

```ts
export type Command =
  | { type: 'startCampaign'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'changeStation'; delta: 1 | -1 }
  | { type: 'setCentre'; value: number }
  | { type: 'setBandwidth'; value: 1 | 3 | 5 }
  | { type: 'setModulation'; value: Modulation }
  | { type: 'setGain'; value: 1 | 2 | 3 | 4 | 5 }
  | { type: 'sweep' }
  | { type: 'capture' }
  | { type: 'installNotch'; transmitterId: string }
  | { type: 'usePhaseLock' }
  | { type: 'selectBroadcast'; action: BroadcastAction }
  | { type: 'confirmBroadcast' }
  | { type: 'continueDebrief' }
  | { type: 'restartCase' }
  | { type: 'restartCampaign'; seed?: number };

export interface CommandResult {
  state: CampaignState;
  events: PresentationEvent[];
  accepted: boolean;
}

export function createCampaign(seed: number, mode: CampaignState['mode']): CampaignState;
export function applyCommand(state: CampaignState, command: Command): CommandResult;
export function calculateSpectrum(caseState: CaseState, station: StationId): SpectrumReadout;
export function evaluateLock(caseState: CaseState, station: StationId): LockEvaluation;
export function getCandidateZones(caseState: CaseState): Position[];
```

Invalid commands are no-ops with an explicit `notice`; they never consume an Operations Tick. `applyCommand` updates no state outside the active case and produces named presentation events such as `sweepPulse`, `roughLock`, `cleanLock`, `notchInstalled`, `candidateResolved`, `broadcastCorrect`, `broadcastWrong`, and `caseExpired`.

### Engine pipeline

```text
command received
  → validate phase, resource, and target
  → if instrument action: advance Operations Tick and apply announced events
  → execute sweep / capture / notch / phase-lock rule
  → recompute spectrum, locks, decoded evidence, and candidate zones
  → if broadcast: verify single candidate + response, resolve debrief
  → check operation limit and transition phase
  → return new state + presentation events
```

Rendering maps events to short flashes, scope settling, map highlights, popups, and restrained screen shake. It may animate a waveform between frames, but cannot reveal a hidden transmitter, generate a lock, or decide an answer.

### Determinism and persistence

- Use a stored 32-bit seed with a small PRNG such as Mulberry32 for optional call-sign/flavour variants, Free Listen case construction, and deterministic cosmetic schedule selection.
- No `Math.random` in `content`, `spectrum`, `triangulation`, `engine`, or validator code.
- The campaign's authored geometry is invariant under seed; its displayed seed is still useful for exact replay and report/debug reproduction.
- Guard browser storage access. Persist only tutorial completion, best campaign report, reduced-motion preference, and (later) resumable serialised `CampaignState` with a version tag.
- Corrupt/old saved values must fall back safely with a visible `LOCAL LOG UNREADABLE—STARTING NEW SHIFT` notice.

## Gamr integration

- Export `runSignalNoiseGame(terminal)` returning a controller with `stop()` and `isRunning`, consistent with the repository's game interface.
- Use `getCurrentThemeColor`, the existing transition dispatchers, shared pause-menu helpers, and shared effects. Never duplicate the pause menu.
- Start in the terminal alternate buffer and hide the cursor. `stop()` clears intervals, disposes `terminal.onKey`, and restores the buffer exactly once.
- Render at 20 FPS (`50ms`) for scope/static presentation. The model advances only on commands; no game clock is required.
- Re-render on terminal resize; below `80×28`, show the shared-size fallback and ignore model-changing input.
- Keep dramatic effects modest: a compact static burst for a failed lock, a lock-on line pulse, a small map flash when candidates become one, and stronger noise/flash only for an incorrect broadcast. Honour reduced motion.
- Register the game only when the vertical slice is complete, using: **“Isolate transmissions. Find the source. Choose your reply.”** Update README’s active-game list as part of release polish.

## Implementation milestones

### 0 — Paper proof and UX wireframes

Write Case 0 and Case 1 as complete static test sheets. Hand-solve them using the defined spectrum maths and bearing map. Produce 94×30 and 80×28 text wireframes, including failed-lock and debrief states.

**Done when:** two readers unfamiliar with the concept can explain why they need two locks, what the `PURITY` meter means, and how a weather front differs from a target within five minutes.

### 1 — Pure signal and triangulation engine

Implement `types`, seeded helpers, spectrum-energy calculation, tuning evaluation, octant bearing calculation, candidate intersection, and a static Case 0 definition. Add no terminal code.

**Done when:** a scripted solve creates two clean locks, yields exactly one candidate position, unlocks the correct packet token, and gives identical state snapshots for the same command transcript.

### 2 — Pure vertical-slice progression

Implement actions/ticks, notch filters, scheduled events, broadcast validation, scoring, debrief, and Case 1's weather interference. Create the case validator and authored solve transcripts.

**Done when:** all incorrect settings make a human-readable failure reason, a notch improves the documented overlap, and Case 1 remains solvable before its operation limit with and without the optional filter route.

### 3 — Playable terminal instrument

Implement controller lifecycle, start/brief/listening/broadcast/debrief screens, ANSI spectrum, scope, map, tuner controls, input mapping, Help, pause integration, resize state, and core presentation effects. Keep only Cases 0–1 playable until controls are effortless.

**Done when:** a player can complete the two-case slice at 80×28 and 100×35 in light and dark themes without developer commands or unexplained controls.

### 4 — Full night

Add Cases 2–6, protocol cards, log entries, all interference variants, phase-lock resource, ranked campaign report, persistence, and authored failure/correct debriefs. Run case validation for every definition in CI tests.

**Done when:** every new case introduces one legible complication, the final case combines rather than replaces earlier skills, and a player can replay an identical seed with identical outcomes.

### 5 — Balance and release polish

Conduct blind playtests, record where players lose locks or choose wrong broadcasts, revise wording/readout layouts, add reduced motion and accessible labels, register the game, update documentation, and run test/typecheck/build.

**Done when:** playtest mistakes are described as a missed visible clue or a knowingly risky resource decision—not unclear controls, hidden physics, an unreadable terminal, or a required real-world-radio fact.

## Test plan

Use Vitest with the repository's existing pure-engine test style. The vast majority of tests should cover state/rules rather than ANSI output.

### Spectrum and isolation

- Band calculation is correct at every legal centre and width, including edge channels.
- Each profile produces its documented energy distribution and text label.
- An exact setting with no overlap creates the expected clean/crisp quality.
- Wrong centre, width, modulation, too-low gain, and overload gain each fail with the correct named reason.
- Overlap reduces purity and quality exactly according to the documented rule.
- Installing a discovered notch suppresses only its named interference and consumes exactly one filter/tick.
- A target cannot be selected as a notch target.
- Scheduled moving interference changes only at its declared tick and is reproducible.

### Triangulation

- Octant calculation returns the documented direction for every map relation, including ties on diagonals.
- Clean locks include one ray; rough locks include the exact three adjacent rays.
- Candidate intersection excludes receiver cells and out-of-bounds cells.
- Two designated clean locks identify exactly the authored target zone in every campaign case.
- Echo locks leave multiple/false candidates until a real station lock is taken.
- Replacing a station's lock removes its former constraints and never duplicates evidence.
- Broadcast is rejected while candidates are zero or more than one.

### Commands, cases, and replay

- Pure setting commands consume no Operations Tick.
- Each valid operational action consumes exactly one tick; invalid commands consume none.
- Scheduled notices/events appear before the active action resolves at that tick.
- Capture reveals exactly the fragment/header/token promised by lock quality.
- A crisp target lock plus resolved location unlocks the appropriate broadcast options.
- Correct and incorrect broadcasts update score, report counters, story log, and phase exactly once.
- Reaching the limit before a reply yields a failure debrief without corrupting later case state.
- Tutorial gates prevent an action only until its teaching objective is complete and can never create a deadlock.
- Same seed plus command list yields equal normalised state, event list, and report.
- Every authored case definition passes `validateCase`; every documented scripted solution finishes below its limit.

### Rendering and lifecycle

- Full layout contains tasking, spectrum, tuner, quality reason, locks/map candidates, decoded evidence, and controls at 94×30.
- Compact layout retains current mandatory evidence at 80×28 and labels all tabbed panels.
- Small-terminal rendering never accepts input that changes model state.
- All critical information remains readable with ANSI colour removed.
- Start, pause, quit, restart, games-menu, and next-game flows dispose listeners and timers once and restore terminal state.
- Reduced motion changes cosmetics only; the same command transcript produces the same model result.

## Balance instrumentation

Add a development-only end-case trace, disabled in release UI but cheap to maintain:

```text
SEED 48151623  CASE 04  OPS 09/13  FILTERS 0
TARGET ORPHEUS-7  BAND 13/3/CHIRP  CLASS challenge
LOCKS west:clean east:crisp  CANDIDATES 1 [4,3]
REPLY ack-hold  EXPECTED ack-hold  RESULT correct
FAILED CAPTURES 2  NOTCHES repeater-03  EVENTS choir-shift@06
```

For playtests, aggregate per case: operations used, failed captures by reason, filters spent, final lock quality, candidate count before broadcast, wrong response selected, and tutorial-hint requests. A high failed-capture rate indicates unclear tuner feedback; a high wrong-response rate with clean locks indicates a Protocol Card or message-evidence problem. Do not “fix” either by merely increasing the action budget.

## Version-1 non-goals

- Real-time timing challenges, mouse controls, sound-based puzzles, Morse decoding, or realistic SDR/radio emulation.
- Randomly generated core mysteries without solve validation.
- Combat, shooting, jamming minigames, or treating every unknown signal as hostile.
- Online leaderboards, daily chores, cloud saves, mod support, localisation, or voice acting.
- More than three stations, five tuner controls, five response classes, or two simultaneous moving interferers in a campaign case.
- A long branching narrative. Six focused cases and debrief logs should establish the world before a larger sequel/expansion.

## Definition of done

Signal//Noise is ready to ship when:

1. A new player completes the playable tutorial and can state how to isolate a signal, why two clean bearings are required, and what evidence justifies a broadcast.
2. The six-case campaign has a fair action budget, explicitly announced interference, a distinct teachable complication per case, and a complete evidence-backed debrief for every response.
3. Every campaign target can be isolated and located with visibly available tools; every accepted broadcast has one documented, player-visible justification.
4. Pure engine tests cover spectrum math, quality, notch effects, bearing geometry, candidate resolution, ticks, progression, and deterministic replay separately from rendering.
5. The terminal implementation uses Gamr's controller lifecycle, theme support, shared pause menu, transition handling, and resize safety without leaked listeners or alternate-buffer state.
6. Blind testers describe losses as “I misread that waveform/response rule” or “I spent my filter poorly,” never “the game hid the answer” or “I had to react faster than the terminal.”
