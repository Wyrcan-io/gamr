# Five-Minute Kingdom — Full Game & Implementation Plan

## Product decision

**Five-Minute Kingdom is a deterministic, turn-based micro strategy game about drafting a landscape and then making its people thrive under the laws you enact.** A run takes roughly five minutes: draft one option from a compact market, place it on a 5×5 kingdom board, watch its immediate and future consequences, and leave behind a tiny kingdom with a distinctive score story.

It is deliberately closer to a tactical tile board game than to a real-time city builder. There are no workers walking, no production timers, and no hidden simulation. Every meaningful change happens because the player chose a tile, citizen, or law and placed it in a specific square.

Version 1 is a complete seedable game with nine turns, a 5×5 board, a three-card draft market, 24 terrain tiles, 18 citizen tiles, 15 laws, a transparent scoring preview, end-of-run chronicle, local seed replay, and an 80×28 terminal interface.

## Design pillars

1. **One square, many consequences.** A placement must usually affect an immediate score, adjacency relationships, a district’s future potential, and at least one law or citizen condition.
2. **Read before committing.** Hovering/selecting a legal square shows the exact current score, persistent change, and relevant triggered effects. Surprise rules have no place in a five-minute tactical game.
3. **Terrain makes opportunity; citizens cash it in; laws bend the board.** These three systems must remain distinct so a run develops in comprehensible stages.
4. **Small board, hard geometry.** A 5×5 grid makes every edge, connection, and reserved square valuable. Depth comes from topology rather than an oversized content pool.
5. **Scores tell a kingdom story.** A high score is not enough: the end screen identifies the prosperous districts, landmark law, and the placement that mattered most.
6. **Deterministic and replayable.** A run seed plus a recorded command sequence recreates the offer order, board, score trace, and ending exactly. Gameplay never depends on `Math.random()`.

## Player fantasy and timing

> “I made the river valley fertile, built a market town at its crossing, and passed a law that turned all those humble farms into the kingdom’s engine.”

The game’s pacing is intentionally brisk:

| Segment | Turns | Target time | What the player learns |
|---|---:|---:|---|
| Founding | 1–3 | 90 sec | Establish terrain and one clear district identity. |
| Settlement | 4–6 | 100 sec | Place citizens to exploit terrain and manage conflicts. |
| Legacy | 7–9 | 90 sec | Use laws and landmarks to specialize or rescue the board. |
| Chronicle | — | 30 sec | Read final score, district breakdown, and replay seed. |

First runs should take 6–8 minutes while reading help; familiar seeded runs should average 4–5 minutes. A turn should normally require 15–35 seconds. The game must not include a real-time countdown: the title refers to intended session length, not execution pressure.

## Core loop

Each turn has one visible draft and one placement.

1. The market reveals **three choices** appropriate to the current chapter: terrain, citizens, or laws.
2. The player inspects an option’s plain-language effects and selects it.
3. Legal board squares highlight. For laws, the player either chooses a target district/cell or enacts a kingdom-wide rule, as clearly stated.
4. Selecting a target opens a **projection**: immediate glory, changed district values, active law triggers, and any harm caused to citizens.
5. The player confirms. The engine records an immutable score event and updates the board.
6. At turn milestones, resolve a short **season check**: citizens score from their homes and laws evaluate their stated condition. The next market then appears.
7. After Turn 9, calculate final glory, present a breakdown, rank the kingdom, and offer same-seed replay.

The central questions are:

- Do I extend this river/farm/forest district now, or leave a precise home for an upcoming citizen?
- Which option has the best immediate score **and** preserves useful shapes for later?
- Does a law reward the kingdom I already have, or tempt me into a difficult pivot?
- Is it worth breaking a strong district to place a citizen whose adjacency can multiply the whole board?

## Board and placement rules

### Board

The board is a 5×5 grid. The center square starts as the capital: `Castle` terrain with an empty citizen slot. All other squares start empty. A square contains one terrain and at most one citizen; a law may add a marker to a square, district, or the entire kingdom.

Orthogonal adjacency only (north, east, south, west) is used for gameplay. Diagonals are never silently relevant. This keeps terminal rendering and score reasoning clear.

```ts
type TerrainKind =
  | 'castle' | 'field' | 'forest' | 'hill' | 'river' | 'lake'
  | 'road' | 'village' | 'ruin' | 'garden';

type CitizenKind =
  | 'farmer' | 'forester' | 'miner' | 'fisher' | 'merchant' | 'ranger'
  | 'mason' | 'scholar' | 'shepherd' | 'steward';

interface Cell {
  terrain: TerrainKind | null;
  citizen: PlacedCitizen | null;
  markers: MarkerId[];
}

interface Position { x: number; y: number }
```

### Districts

A **district** is one orthogonally connected group of the same terrain. The engine calculates districts from the board after every placement; it never stores an independently mutable district list.

District identity matters because terrain, citizens, and laws use it differently:

- Terrain tends to reward size, edges, or compatible borders.
- Citizens generally require a local terrain condition and then contribute to their whole district or nearby cells.
- Laws reward shapes, district counts, diversity, or kingdom-wide patterns.

The board contains no unplaceable traps. A terrain tile can always be placed on any empty cell. A citizen can only be placed on a terrain listed in its `homeTerrains`; a targeted law can only target a valid item defined by the law. Invalid positions are visibly disabled and explain why.

### The capital and roads

The starting Castle creates a stable early anchor:

- It is part of the `castle` district, cannot be replaced, and can house a Steward, Scholar, Merchant, or Mason.
- Any terrain orthogonally adjacent to the Castle is **connected**. Roads extend that connection through a continuous road chain.
- Several citizen and law effects reward connection, but no normal terrain placement requires it. This makes planning around the capital rewarding rather than restrictive.

## Resources, score, and loss model

The only score resource is **Glory**, stored as an integer. The game has no lose state during the nine turns: every draft is playable, and a poor decision leads to a modest chronicle rather than an abrupt failed run. That fits the cozy board-game tone and makes experiments with a seed worthwhile.

| Value | Range | Purpose |
|---|---:|---|
| Glory | integer, normally 0–450 | Primary score and rank. |
| Favour | 0–6 | A scarce reroll/repair resource earned by specific effects. Version 1 uses it only to refresh the market once per season. |
| Prosperity | derived, not stored | Final score contributed by satisfied citizens. |
| Harmony | derived, not stored | Final score from compatible terrain borders and laws. |

Score is deliberately split in the final report:

```text
Final Glory = placement glory + season glory + citizen prosperity
             + law legacy + harmony bonus + favour conversion
```

The main HUD uses current Glory. The renderer exposes a projected delta before any commitment; the final report shows the categories above and all large positive/negative events.

## Content model

### Three draft families

The market always contains exactly three options, normally two from the scheduled family and one flexible option. The turn schedule teaches systems before it asks for compound planning.

| Turns | Primary family | Secondary family | Purpose |
|---:|---|---|---|
| 1–2 | Terrain | Terrain | Build a map and learn district connections. |
| 3 | Terrain | Citizen | Decide whether to deepen geography or score an early inhabitant. |
| 4–5 | Citizen | Terrain | Convert district plans into prosperity. |
| 6 | Law | Citizen | Introduce a strategic rule with an established board. |
| 7–8 | Mixed | Law | Adapt, specialize, or repair weak geometry. |
| 9 | Landmark law | Mixed | Create a final memorable expression. |

The generator guarantees at least one playable option each turn; it does not guarantee the optimal one. A market can contain awkward but interesting choices, never three choices that have no legal target.

### Terrain tiles

Each terrain placement starts a district or joins an existing one. Terrain carries a concise placement score and a district property.

| Terrain | Placement rule | District identity | Typical score role |
|---|---|---|---|
| Field | +1 per adjacent Field or River, max +3 | Fertility | Farmers and Shepherds reward large fertile districts. |
| Forest | +1 per adjacent Forest; +2 beside a Hill | Wilds | Foresters/Rangers and boundary laws. |
| Hill | +2 if beside a Forest or Ruin | Highlands | Miners and lookout-style laws. |
| River | Must touch an existing River, Lake, or Castle; first River may touch Castle | Waterway | Fishers, Merchants, bridges, long connected lines. |
| Lake | +2 if it touches 2+ different terrains | Shore | Makes water hubs; limited to two per run. |
| Road | +1 per adjacent non-Road terrain, max +3 | Connection | Extends capital connectivity and supports merchants. |
| Village | +2 if adjacent to two different terrain kinds | Settlement | Flexible housing and compact mixed districts. |
| Ruin | +3 if adjacent to Hill or Forest; otherwise +0 | Ancient | High upside for Scholars/Masons and law transforms. |
| Garden | +1 per adjacent citizen, max +3 | Beauty | Late compact scoring and harmony. |

`Castle` is starting terrain only. The content table also includes displayed icon, ASCII fallback, flavour line, and rule tags; the engine does not parse natural-language descriptions.

### Citizens

Citizens are placed on their allowed home terrain and remain there. They score first when placed, then at each season check and at game end. A citizen is never removed in Version 1; effects can mark them `content`, `strained`, or `renowned` for scoring, but do not create surprise elimination.

| Citizen | Home terrains | Immediate effect | Ongoing / end-game effect |
|---|---|---|---|
| Farmer | Field, Village | +1 per adjacent River/Field | +1 per Field in its district at each season check, max +5. |
| Forester | Forest | +2 if Forest district has 3+ cells | +1 per Forest edge bordering a different terrain at end. |
| Miner | Hill, Ruin | +2 per adjacent Hill/Ruin, max +4 | +3 if its district touches a Ruin at end. |
| Fisher | River, Lake | +1 per adjacent water cell | +2 for each connected water district of size 4+, max +4. |
| Merchant | Road, Village, Castle | +1 per connected neighbour | +1 for each distinct terrain reachable by road from Castle, max +5. |
| Ranger | Forest, Hill | +2 if beside a district boundary | +1 for every Forest–Hill border in the kingdom, max +5. |
| Mason | Hill, Village, Ruin, Castle | +2 if adjacent to Castle/Ruin | Laws targeting its district gain +2 Glory once each. |
| Scholar | Ruin, Castle, Garden | +1 per distinct adjacent terrain | +3 for each enacted law that has a satisfied condition, max +9. |
| Shepherd | Field, Hill | +1 per empty adjacent cell | +2 if Field district and Hill district both have size 3+, once per season. |
| Steward | Castle, Village, Garden | +2 if connected to Castle | Converts first negative season score each season to 0. |

All numeric caps are explicit in descriptions. Citizens use structural facts the player can see directly; none require guessing future cards.

### Laws

The player may enact up to three laws. On a fourth law, the player selects an existing law to repeal before confirmation. Repeal is an intentional board-state decision, not a random penalty.

Laws are one of three scopes:

- **Kingdom laws** apply to a global pattern and remain visible in the HUD.
- **District charters** target a qualifying district and put a marker on all its cells.
- **Edicts** target a cell/citizen and create a focused exception.

| Law | Scope | Condition and effect |
|---|---|---|
| River Tithe | Kingdom | Each connected River/Lake district of size 4+ gives +4 Glory at season checks. |
| Common Fields | District charter | Target a Field district of size 3+; Farmers there gain +1 seasonal Glory, and placement beside it gains +1. |
| Forest Accord | Kingdom | Each Forest–Hill border is worth +1 Harmony at game end; Rangers gain +1 immediately. |
| Market Rights | Edict | Target a connected Village/Road/ Castle citizen; its Merchant effect counts one extra terrain kind. |
| Protected Ruins | Kingdom | First Scholar or Mason placed on a Ruin gains +5; subsequent Ruins give +1 glory when bordered by Forest/Hill. |
| Open Roads | Kingdom | Roads adjacent to two different terrain kinds score +1 extra when placed. |
| Festival Charter | District charter | Target a Village or Garden district; +1 per citizen adjacent to it at game end, max +6. |
| Royal Survey | Kingdom | The first time each terrain kind reaches a 3-cell district, gain +3. |
| Quiet Borders | Kingdom | End-game: +1 Harmony for each non-Road cell with exactly two different terrain neighbours. |
| Miners’ Claim | District charter | Target Hill/Ruin district; Miners there score +2 at end, but the district’s new terrain placements score 1 less. |
| Keepers of the Gate | Edict | Target Castle-connected citizen; it gains `renowned` (+3 end game) but cannot receive another edict. |
| Living Map | Kingdom | Gain +2 for every terrain type represented at end; costs one Favour when enacted. |
| Grand Orchard | Landmark | Target Garden or Field; +1 per adjacent citizen and +1 per different neighbouring terrain at end. |
| Stone Crown | Landmark | Target Castle-connected Hill/Ruin; +2 per connected road and +2 per adjacent different terrain at end. |
| Concord of Five | Landmark | If five terrain kinds are represented, +15 at end; otherwise +0. Shows live progress. |

The initial pool contains 15 laws; a run will see 5–7. Each law includes `preview()` metadata that reports its current target availability and its minimum/maximum foreseeable score. Landmark laws appear only in Turn 9’s market.

## Scoring system and resolution order

### Score events, not opaque totals

The engine represents all score changes as score events. The UI uses them for the preview, compact event log, final chronicle, and test assertions.

```ts
type ScoreSource = 'terrain' | 'citizen' | 'law' | 'season' | 'harmony' | 'favour';

interface ScoreEvent {
  id: string;
  source: ScoreSource;
  label: string;
  amount: number;
  position?: Position;
  relatedIds: string[];
  timing: 'placement' | 'season' | 'final';
}

interface Resolution {
  legal: boolean;
  reason?: string;
  events: ScoreEvent[];
  changes: StateChange[];
  projectedGlory: number;
  previewText: string[];
}
```

### Placement resolution

Every option is evaluated against a cloned, immutable pre-placement state. The preview and final commitment invoke exactly the same evaluator.

1. Validate the chosen option and target (empty terrain cell, compatible citizen home, or valid law target).
2. Apply the tile/citizen/law to a temporary board.
3. Recalculate districts and derived connectivity.
4. Apply the option’s own placement score.
5. Apply direct adjacency effects belonging to the newly placed piece.
6. Apply triggered law effects in stable `priority`, then `id` order.
7. Apply any once-per-turn/once-per-run marker changes.
8. Clamp and add Favour changes, add Glory events, and generate an ordered explanation.

Terrain/citizen placements normally change only immediate Glory; season and end-game effects are calculated later from board state. This prevents historical score bugs when a later placement changes a district’s shape. A legal placement may have `+0` immediate Glory if it deliberately builds a future structure; the preview explicitly says so.

### Seasonal checks

After Turns 3, 6, and 9, run a deterministic season check. It is a scoring checkpoint rather than a simulation tick.

1. Resolve citizens in reading order (top-to-bottom, left-to-right).
2. Resolve kingdom laws in stable priority/ID order.
3. Resolve any district charter effects in district anchor order.
4. Add final-only Harmony only after Turn 9.

Each effect can award a maximum noted in its data definition. Season checks calculate from current board geometry and do not mutate tile locations. The preview panel before confirming Turn 3/6/9 shows a **next season estimate** for the selected placement, including items it will unlock or invalidate.

### Final scoring

At game end, calculate all ending effects once in this order: final citizen prosperity → active laws → Harmony → unused Favour conversion (2 Glory each). The chronicle breaks out every source, highlights the five largest events, and lists any enacted law whose condition remained unmet.

Balance guardrails:

- All values are integers; no floating point score math.
- A single standard placement should normally yield 0–6 Glory; a strong compound placement can reach 10–14.
- A season check should yield 8–28 Glory; end-game effects should yield 12–65.
- No law may multiply score. Synergy is additive and capped, keeping projections readable.
- A repeated trigger has an explicit cap or `once` key. The engine records consumed keys in state.
- The board has a maximum of 24 placed terrain cells and 9 non-start placement turns, preventing exponential content density.

## Drafting and deterministic generation

### Seeded PRNG

Use a small serializable 32-bit PRNG (for example Mulberry32) and independent named streams. Gameplay code must never call `Math.random()`.

```ts
interface RunRng {
  seed: number;
  streams: {
    markets: RngState;
    flavour: RngState;
    cosmetics: RngState;
  };
}
```

- `markets` selects content and shuffles option ordering.
- `flavour` selects only non-mechanical text.
- `cosmetics` is safe for title flicker and must not alter gameplay.

At run start, generate and persist all nine market offers. This makes debugging, replay, and same-seed comparison straightforward. A restart with the same seed regenerates the same offers; a new run displays a new seed.

### Market generator rules

For each turn:

1. Pick the scheduled family mix from the turn table.
2. Draw from eligible content, honoring limits (two Lakes, max three laws, landmarks only on Turn 9).
3. Reject duplicate offer IDs in a market and avoid showing the same item on consecutive turns unless the pool is exhausted.
4. Simulate legal target availability from the current board; replace an option with no legal target.
5. Guarantee one **foundation**, **synergy**, or **repair** option:
   - Foundation: extends an existing terrain or fills an essential early terrain role.
   - Synergy: directly supports a placed citizen/law or a district of size 2+.
   - Repair: offers flexible placement (Road/Village/Garden, Steward, or compatible law).
6. Preserve at least one genuine trade-off. The other two choices must not merely be strictly lower-scoring versions of the guarantee.

Because the board changes after each choice, later markets are generated at the start of their turn from the seed state and current board while their candidate ordering remains deterministic. Generator tests compare seeded state, not visual copy.

### Favour and market refresh

Favour is a modest escape valve, not an optimization tax. If the player has at least 1 Favour, they may press `R` before selecting an option to replace all three offers once per season. The reroll consumes Favour and uses the next deterministic market stream values. The UI warns that rerolling cannot be undone. Version 1 grants Favour from only a few clear effects (such as completing a 4+ terrain diversity condition or a specific Steward/Law combination) so it stays rare.

## Interface, semantic language, and controls

### Visual vocabulary

All symbols have a text label or ASCII fallback; color reinforces, but never carries, meaning.

| Concept | Glyph | ASCII | Colour role |
|---|---|---|---|
| Castle | `♜` | `K` | royal / theme |
| Field | `·` | `.` | green |
| Forest | `♣` | `F` | dark green |
| Hill | `▲` | `^` | amber |
| Water | `≈` | `~` | blue |
| Road | `═` | `=` | grey |
| Village | `⌂` | `V` | warm yellow |
| Ruin | `◇` | `R` | violet |
| Garden | `✿` | `G` | magenta |
| Citizen | `●` | `o` | cyan |
| Law | `§` | `S` | violet |
| Glory | `✦` | `*` | gold |
| Favour | `♥` | `+` | rose |
| Legal target | `□` | `[]` | theme highlight |
| Selected target | `◆` | `X` | bright theme |

Document this table close to the renderer. The map always also includes a compact terrain/citizen label in the inspect panel, so unusual fonts do not block play.

### Main board mock-up

```text
                   FIVE-MINUTE KINGDOM  •  TURN 6 / 9  •  SEED 842913
 GLORY ✦ 074     FAVOUR ♥ 1     LAWS § 2/3       NEXT SEASON AFTER THIS TURN

 ┌──────────── KINGDOM ────────────┐  ┌──────────── MARKET ──────────────┐
 │    A   B   C   D   E             │  │ [1] RIVER ≈                       │
 │ 1  ·   ·   ≈   ⌂   □             │  │     +1 per adjacent Field/River   │
 │ 2  ♣   ▲   ♜●  ═   □             │  │ [2] MERCHANT ●                    │
 │ 3  ♣   ◇   □   □   □             │  │     Home: Road, Village, Castle   │
 │ 4  □   □   □   □   □             │  │ [3] FOREST ACCORD §                │
 │ 5  □   □   □   □   □             │  │     Forest–Hill borders: +1 end   │
 └─────────────────────────────────┘  └──────────────────────────────────┘

 SELECTED: [1] RIVER at E1                 PROJECTION: +1 now
 • touches Field (+1)                       NEXT SEASON: Fisher homes +1 water
 [Arrows] target   [1–3] choose   [Enter] preview/confirm   [I] inspect
 [R] refresh (♥1)   [L] laws/ledger   [H] help   [Esc] pause
```

At 94×30, show the market and a short active-laws panel side by side. At 80×28, retain the board, chosen-card description, one projection, and HUD; open market details/law ledger through `I`/`L`. Below 80×28, display the repository-standard resize screen and freeze input except quit/pause.

### Controls and state flow

```text
start → briefing → chooseOffer → chooseTarget → preview → result
      → (season) → nextTurn → finalChronicle → ending
```

- `1`, `2`, `3`: select market offer.
- Arrow keys / `WASD`: move target cursor on the board.
- `Enter` / Space: enter projection, then confirm it.
- `Backspace` / Esc (inside preview): return to targeting without spending the choice.
- `I`: inspect cursor cell/district and score facts.
- `L`: active laws, citizens, and chronological score ledger.
- `R`: refresh market if Favour is available and the season refresh is unused.
- `H`: plain-language glossary and controls.
- `Esc`: shared Gamr pause menu; `Q` quits through the standard transition helper.

The projection state is compulsory for all laws, Favour refreshes, and placements that create more than one score event. It may be a single `Enter` confirm for straightforward terrain placements, but the resulting score toast/ledger line must still appear.

## TypeScript architecture

Create `src/games/five-minute-kingdom/`:

```text
five-minute-kingdom/
  index.ts          Gamr controller, key mapping, intervals, lifecycle
  types.ts          Serializable domain/game/UI types and constants
  content.ts        Terrain, citizens, laws, flavour and tuning tables
  seed.ts           Seed normalization, hash and PRNG streams
  board.ts          Pure adjacency, districts, paths, target helpers
  generator.ts      Deterministic market construction and validation
  evaluator.ts      Pure placement, season and final-score evaluation
  engine.ts         Command reducer, phase progression, replay state
  render.ts         ANSI map/panels/overlays, full and compact layouts
  content.test.ts   Content validation (ids, caps, valid references)
  board.test.ts     District/connectivity and legal-target tests
  evaluator.test.ts Score ordering, projections and limit tests
  engine.test.ts    Full seeded runs, phase and replay tests
```

Keep `index.ts` intentionally thin. Renderer/input code may select UI state but must not mutate business state; all game transitions flow through `applyCommand`.

### State model

```ts
type Phase =
  | 'start' | 'briefing' | 'chooseOffer' | 'chooseTarget' | 'preview'
  | 'result' | 'season' | 'finalChronicle' | 'ending' | 'paused';

interface GameState {
  version: 1;
  seed: number;
  phase: Phase;
  turn: number;
  board: Cell[][];
  glory: number;
  favour: number;
  refreshesUsedThisSeason: number;
  laws: EnactedLaw[];
  consumedTriggerKeys: string[];
  market: DraftOption[];
  marketHistory: DraftOption[][];
  selectedOfferId: string | null;
  selectedTarget: Target | null;
  preview: Resolution | null;
  scoreLedger: ScoreEvent[];
  notices: Notice[];
  rng: RunRng;
}

type Command =
  | { type: 'startRun'; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'selectOffer'; optionId: string }
  | { type: 'selectTarget'; target: Target }
  | { type: 'openPreview' }
  | { type: 'confirmPlacement' }
  | { type: 'dismissResult' }
  | { type: 'refreshMarket' }
  | { type: 'dismissSeason' }
  | { type: 'restartSameSeed' }
  | { type: 'restartNewSeed'; seed?: number };
```

`evaluatePlacement(state, option, target)` and `evaluateSeason(state)` are pure functions. `applyCommand` uses the resulting events to create a new state. The renderer can call `evaluatePlacement` for previews but must never invent score values itself.

### Engine invariants

- Board dimensions are always 5×5; the center Castle always exists and is not replaced.
- Every ordinary terrain placement targets an empty cell; every citizen placement targets a cell with its permitted terrain and no resident.
- A law is enacted at most once; no more than three laws are active.
- IDs, score-event IDs, trigger keys, and market option IDs are unique in their expected scopes.
- Glory and Favour remain integers; Favour remains within 0–6.
- A preview is evaluated from the exact state before confirmation, and confirmation commits an equivalent resolution exactly once.
- A `once` trigger cannot fire after its consumed key has been recorded.
- Districts and road connectivity derive only from board state; no stale cache may affect scoring.
- Same seed plus same command sequence serializes to the same gameplay state, excluding cosmetic animation fields.
- Every offered item has a legal target when the market is generated, unless the option is explicitly a kingdom-wide law.

## Gamr integration

Follow the existing project conventions:

- Export `runFiveMinuteKingdomGame(terminal)` and a controller exposing `stop()` and `isRunning`.
- Register `{ id: 'five-minute-kingdom', name: 'Five-Minute Kingdom', description: 'Draft a tiny kingdom. Make every square count.', run }` in `src/games/index.ts`.
- Use `getCurrentThemeColor`, `dispatchGameQuit`, `dispatchGamesMenu`, `dispatchGameSwitch`, and the shared pause menu.
- Use alternate terminal buffer and hidden cursor while running; cleanly dispose input, reset style, and restore the buffer when stopped.
- Render at roughly 20 FPS for cursor, title, and overlays, but mutate game state only from player input. There is no continuous gameplay update loop.
- Use shared effects sparingly: small Glory score popups, one gentle border flash for a fulfilled law, and no animation that obscures targeting or a projection.
- Run the visual checklist at both 80×28 and a wider layout, including a light theme. Replace ambiguous glyphs with their documented ASCII fallback.

## Implementation milestones

### 0 — Paper proof and content slice

Write a playable six-turn paper scenario: starting board, six markets, five terrain tiles, four citizens, three laws, and hand-calculated score traces. Validate two focused builds (river commerce and forest highlands) plus one mixed recovery build.

**Done when:** a reviewer can calculate three placements and a season check using only the option text, board, and stated resolution order.

### 1 — Pure board and scoring engine

Implement types, content tables, seed PRNG, board topology helpers, legal targets, score events, placement evaluator, season/final evaluator, and command reducer. No ANSI rendering yet.

**Done when:** fixed-seed command transcripts reproduce board, market sequence, Glory, Favour, active laws, and complete ledger byte-for-byte.

### 2 — Playable vertical slice

Implement controller and renderer for a six-turn slice: terrain, Farmer/Forester/Merchant, River Tithe/Forest Accord/Market Rights, targeting, preview, season panel, and shared pause menu.

**Done when:** a player can complete a coherent six-turn kingdom in the terminal and identify each awarded score event before confirming it.

### 3 — Full nine-turn campaign

Add the full terrain/citizen/law pool, Favour refresh, law replacement, Turn 9 landmarks, final chronicle, same-seed replay, help/inspect overlays, responsive compact layout, and registry entry.

**Done when:** all nine turns are playable from the games menu, every offer is legal, and the final report explains the score rather than only displaying it.

### 4 — Fairness and balance pass

Add generator validation, deterministic replay tests, content linting, test seeds representing common strategies, debug score trace, and a manual balance spreadsheet/test harness that measures score distributions across scripted heuristics.

Target first-pass result bands:

| Run quality | Expected final Glory |
|---|---:|
| Learning / scattered | 70–120 |
| Sound focused plan | 125–180 |
| Strong synergy | 185–250 |
| Exceptional seeded puzzle | 250–320 |

**Done when:** a simple terrain-first heuristic earns a respectable score on representative seeds, focused builds outperform it, and no option consistently dominates its market family.

### 5 — Release polish

Add title treatment, event accents, clear tutorial copy, rank names/endings, light-theme fixes, ASCII fallback audit, game registry documentation, and run `npm run typecheck`, `npm test`, and `npm run build`.

## Test plan

Use the repository’s existing test runner for pure modules. Test state and human-readable score traces rather than ANSI frame snapshots.

### Board and targeting

- District finder returns correct connected components for isolated, merged, and split-looking terrain layouts.
- Road connectivity includes Castle adjacency and contiguous roads, but never diagonal cells.
- Terrain cannot replace occupied cells; citizens respect home terrains and occupancy.
- Every targeted law accepts only the scope described in content data.
- The center Castle survives all legal command sequences.

### Evaluator

- Each terrain and citizen gives its documented immediate score at zero, normal, and capped adjacency values.
- Law priority and stable IDs resolve conflict conditions predictably.
- `once` and capped triggers do not duplicate across preview, confirmation, season, or final scoring.
- Preview events equal committed events for an identical cloned pre-command state.
- Changing future board geometry affects derived seasonal/end effects only, never rewrites an already committed placement score.
- Final-score components sum exactly to displayed final Glory.

### Generator and engine

- The same seed produces equal markets and game state after an equal command transcript.
- Flavour/cosmetic random draws do not change markets or score outcomes.
- Every generated market has three unique choices and at least one legal choice/target.
- Refresh consumes exactly one Favour, is limited once per season, and has deterministic replacement offers.
- Law replacement preserves the board and removes only the selected law’s ongoing effects.
- Turn 3/6/9 season checks occur once and Turn 9 final scoring occurs once.
- Restart same seed restores the identical initial sequence; restart new seed changes it.

### Rendering and manual QA

- Check start, target selection, invalid target explanation, multi-event preview, season panel, refresh confirmation, law replacement, pause, final chronicle, and ending.
- Check 80×28 and 94×30 layouts, default and light themes, and copied-log ASCII readability.
- Confirm the cursor never visually lands on an illegal target without a reason.
- Play at least ten complete seeds, recording decision time, final score, moments of confusion, and any choice that lacks a visible rationale.

## Risks and decisions to protect

| Risk | Mitigation |
|---|---|
| Tile rules become a pile of exceptions. | Keep every rule as structured data with scopes, caps, and a shared evaluator; reject one-off renderer logic. |
| Markets feel random or unwinnable. | Generate against current board and guarantee a foundation/synergy/repair option, while preserving deterministic seeds. |
| Players cannot anticipate season scores. | Show current and next-season preview lines; `I` opens exact district facts. |
| Laws become passive arithmetic. | Give laws targeting, board-shape conditions, or a visible strategic cost/slot pressure. |
| Too much content obscures the five-minute goal. | Ship with a curated 9/10/15 terrain/citizen/law pool and add variants only after balance tests. |
| Terminal glyphs misalign. | Use one-cell symbols with ASCII fallbacks and test at minimum size/light theme. |

## Deferred ideas

These are promising, but intentionally outside Version 1:

- Daily shared seed and local score history.
- Difficulty modifiers (scarce water, mountain realm, wandering court).
- Optional asynchronous rival kingdom “ghost” score benchmarks.
- Unlockable cosmetic chronicles; no power unlocks that undermine seed fairness.
- Larger 6×6 “long kingdom” mode after the core 5×5 game is proven.
- Sound, mouse input, or external persistence beyond an already-safe repository helper.

The release criterion is not content quantity. It is that every one of nine placements feels like a small, legible board-game decision whose consequences make the final kingdom feel authored by the player.
