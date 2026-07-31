# Packet Panic — Full Game & Implementation Plan

## Product decision

**Packet Panic is a real-time, pause-friendly network-routing roguelite.** The player is the only operator keeping a hostile data grid alive: place, rotate, repair, and upgrade routers while packets travel continuously to matching destinations. Congestion raises a visible **TRACE** meter; malware turns the player's own network against them.

This is a terminal control-room game, not a transit-map reskin:

- Router shape and orientation define the navigable graph.
- Every packet has a source, protocol, destination, and visible age.
- Failure comes from observable queues, bad topology, or an announced incident.
- Focus slows the system briefly; normal pause is always available through the existing Gamr menu.

Version 1 ships one **Standard Shift**: eight sectors, a playable tutorial, seeded runs, upgrades, local high score, and an end rank. Endless and daily challenges come only after Standard Shift is fun.

## Research translated into design

- [Balatro](https://play.google.com/store/apps/details?id=com.playstack.balatro.android) demonstrates that a small rule set plus run-changing modifiers creates long-term replayability.
- [Slice & Dice](https://play.google.com/store/apps/details?id=com.com.tann.dice) shows why fully visible rules and tactical choices matter.
- [Mini Metro](https://apps.apple.com/us/app/mini-metro/id837860959) proves constrained routing systems can be tense, elegant, and readable in short sessions.
- Reddit discussion on [daily versus weekly challenges](https://www.reddit.com/r/gamedesign/comments/ur1eju/) supports optional seeded challenges instead of chore-like rewards.

The design consequence: show the source of every failure, give a concrete correction, then vary the next sector through layout, incidents, and upgrades.

## Player experience

> “I am the last operator between a live network and a total breach.”

| Beat | Experience | Target |
|---|---|---:|
| Boot | Read the board and make the first route. | 20–40s |
| Flow | Observe packets and identify the first bottleneck. | 1–2m |
| Panic | A spike, jam, or malware event forces a reroute. | 30–90s |
| Recovery | Restore flow and build a delivery streak. | 30–60s |
| Upgrade | Choose a run-changing upgrade. | 10–20s |
| Climax | Sector eight combines traffic and incidents. | 2–4m |

A full Standard Shift runs 12–20 minutes. A failure should feel like “I made the wrong routing/capacity choice,” never random bad luck.

## Core loop

1. Load a sector with sources, destinations, obstacles, a traffic forecast, and finite router inventory.
2. Move a cursor across the 13×9 grid; place/rotate routers to create legal connections.
3. Sources generate protocol-coded packets into visible queues.
4. Each simulation tick, packets find a shortest legal route and advance one tile if capacity permits.
5. Packets delivered to a matching destination increase score, quota, and streak.
6. Queue overflow, stalled packets, and malware raise TRACE.
7. Reconfigure before TRACE reaches 100.
8. Meet the sector quota, pick one upgrade, and continue.
9. Finish eight sectors to win; show seed, score, rank, and replay actions.

## Exact rules

### Board

- Logical grid: **13 columns × 9 rows**.
- Render cell: 3 terminal columns × 1 row, fitting HUD and inventory at **80×28**.
- Tile kinds: empty, blocked, source, destination, router.
- Nodes expose all four ports. Routers expose only ports allowed by shape and rotation.
- Two tiles connect only when both expose the facing port.
- A healthy router holds one packet. A router holding a packet cannot be rotated or salvaged.

### Protocols

Colour is paired with a letter so no critical rule depends on colour.

| Protocol | Symbol | Colour | Fiction |
|---|---|---|---|
| Cipher | C | cyan | encrypted traffic |
| Pulse | P | magenta | priority traffic |
| Archive | A | yellow | bulk traffic |
| Ghost | G | green | low-latency traffic |

Each source produces one protocol; every packet targets a same-protocol destination.

### Router inventory

| Router | Key | Ports | Role | Unlock |
|---|---|---|---|---:|
| Link | 1 | two opposite | straight connection | start |
| Bend | 2 | two adjacent | turns a route | start |
| Split | 3 | three | enables a branch | sector 2 |
| Firewall | 4 | four | passes normal traffic; destroys malware | sector 4 |

- Enter places the selected router.
- R rotates the preview or selected empty router clockwise.
- X salvages a selected empty router for half its inventory value.
- Inventory is finite: elegant compact topology is better than covering the board in cables.

### Time and capacity

- Render every 50ms (20 FPS); normal simulation advances every 250ms.
- A packet advances at most one tile per simulation tick.
- Sources begin with a queue capacity of six. Destinations deliver one matching packet per tick.
- Space spends one **Focus** charge: simulation advances every 750ms for four seconds while rendering/input remain responsive.
- Escape pauses completely through Gamr’s shared pause menu.

### Routing and contention

Every active packet recalculates its next step each tick, so rerouting takes effect immediately.

1. Build a graph from the current tile ports.
2. Breadth-first search from packet location to destination.
3. Create a proposal for the first hop, respecting topology but ignoring occupancy.
4. Group proposals by target tile.
5. Resolve conflicting claims by oldest packet, then lowest stable packet ID.
6. Commit winners simultaneously.
7. Losers wait. A lost route causes waiting, never deletion.

BFS is correct because every hop has equal cost. Fixed neighbour order (N, E, S, W) keeps replay deterministic.

### TRACE and loss

TRACE is the sole normal loss meter and always renders as a 20-cell bar.

| Event | TRACE | Feedback |
|---|---:|---|
| Queue warning at 4+ | 0 | source turns amber |
| Queue exceeds 6 | +8 and discard oldest | red flash, DROP +8 TRACE |
| Router packet stalled 12s | +3, then every 4s | router pulses red |
| Malware infects router | +12 | static burst and shake |
| Ten clean deliveries | -4 | FLOW STABLE |
| Sector clear | -10, minimum 0 | clear effect |

At 75 TRACE, an announced **Trace Sweep** raises source spawn rate by 20% for 12 seconds. At 100 TRACE, game over occurs after the current tick resolves. There are no instant random deaths.

### Threats

| Threat | Rule | Counterplay | Sector |
|---|---|---|---:|
| Traffic spike | One source produces twice as fast. | Branch, reroute, Focus. | 2 |
| Link jam | A highlighted router cannot accept packets for 8s. | Route around or absorb queue. | 3 |
| Malware | A red ! enters from an edge and infects the first router it reaches. | Firewall it or purge. | 4 |
| Trace sweep | Temporary high spawn pressure when TRACE is high. | Stabilise before it begins. | 5 |

An infected router has no ports. Select it and press F to consume a purge charge. Players get one purge each sector and may gain more through upgrades. A Firewall destroys malware and remains operational.

### Score and win

~~~text
delivery score = 100 × multiplier
multiplier = 1.00 + min(1.00, floor(streak / 10) × 0.25)
~~~

- Streak increments on delivery and resets on overflow, infection, or sector transition.
- Priority packets unlock in sector 3: worth 250, but add +2 TRACE if waiting over eight seconds.
- Rank order is score, lower maximum TRACE, then faster completion.
- Ranks: ROOT, ADMIN, OPERATOR, INTERN, DISCONNECTED.

## Sector progression

| Sector | Sources / destinations | Quota | Spawn interval | New pressure |
|---:|---:|---:|---:|---|
| 1 | 1 / 1 | 12 | 1.6s | Learn Links and Bends. |
| 2 | 2 / 2 | 18 | 1.45s | First spike; Split unlocks. |
| 3 | 2 / 2 + 2 blocks | 24 | 1.3s | Link jam. |
| 4 | 3 / 3 | 30 | 1.2s | Malware and Firewall. |
| 5 | 3 / 3 + 4 blocks | 36 | 1.1s | Trace sweep. |
| 6 | 3 / 3 | 42 | 1.0s | Priority packets. |
| 7 | 4 / 4 + 4 blocks | 48 | 0.9s | Overlapping incidents. |
| 8 | 4 / 4 + 6 blocks | 56 | 0.8s | Final forecast cascade. |

Each sector starts in a planning grace state: traffic begins only after the first router is placed or Enter is pressed.

## Upgrades

At sector clear, show three seed-determined choices. Each creates a distinct decision, not only stat inflation.

| Upgrade | Effect |
|---|---|
| Spare Links | +3 Links next sector. |
| Junction Kit | +1 Split next sector. |
| Deep Buffer | Queue limit +1; overflow costs +10 instead of +8 TRACE. |
| Cache Flush | -15 TRACE now; next sector starts with one fewer router. |
| Operator Focus | +1 Focus each sector. |
| Clean Room | +1 purge; faster recovery after purge. |
| Priority Lane | Priority packets score +100; deadline falls to six seconds. |
| Smart Queue | Overflow drops newest instead of oldest packet. |

## UI and controls

~~~text
                 PACKET PANIC
 SCORE 012450   SECTOR 03/08   TRACE [██████░░░░░░░░░░░░]

 ┌──────────────────── NETWORK ────────────────────┐  TOOL: BEND ↻
 │ [C]───┐      ┌───[C]                             │  INV: ─×4 └×2 ┬×0 #×0
 │       └───┬──┘                                   │  FOCUS: ◆◆
 │ [A]───────┘       ↑      └──────[A]              │  NEXT: MALWARE 00:18
 └──────────────────────────────────────────────────┘  QUOTA: 17 / 24

 Arrows/WASD move · 1–4 tool · Enter place · R rotate · X salvage · Space Focus · Esc pause
~~~

- Node glyphs are [C], [P], [A], [G]; queues display both count and fill bar.
- Theme colour means healthy; amber means pressure; red means error/infection.
- Cursor preview is dim; invalid placement shows red ×.
- Use Gamr’s title glitch only on start screen; gameplay HUD stays compact.
- Shared particles: deliveries and firewall blocks. Shared popups: score, drops, purge. Shared shake: overflow, infection, clear, game over.

| State | Input | Result |
|---|---|---|
| Start | T/P or menu | Tutorial / Standard Shift |
| Gameplay | arrows or WASD | move cursor |
| Gameplay | 1–4 | select router |
| Gameplay | Enter | place router |
| Gameplay | R | rotate preview/empty router |
| Gameplay | X | salvage empty router |
| Gameplay | F | purge infected router |
| Gameplay | Space | Focus |
| Gameplay | H | help panel |
| Any active state | Escape | shared pause menu |

## Tutorial

Use a playable micro-sector, never a wall of text:

1. Connect Cipher source to Cipher destination with Links and a Bend.
2. Watch three deliveries.
3. Add a second source and use a Split.
4. Let a queue become amber, then use Focus while building a bypass.
5. Stop scripted malware using Firewall or supplied purge.
6. Finish at six deliveries and enter Standard Shift.

Tutorial state explicitly pauses spawning until expected actions/deliveries occur. It is skippable and unscored.

## Architecture

The simulation must be model-first: no Terminal import, ANSI output, real-time clock, or Math.random in core rules.

~~~text
src/games/packet-panic/
├── index.ts              # controller, lifecycle, menus, intervals
├── types.ts              # domain types/constants
├── seed.ts               # seeded PRNG
├── content.ts            # protocols, routers, upgrades, sectors
├── board.ts              # ports, placement, topology, BFS
├── simulation.ts         # ticks, packets, threats, trace
├── progression.ts        # sectors, upgrades, win/loss
├── tutorial.ts           # objectives and scripted events
├── render.ts             # pure ANSI render helpers/layouts
├── input.ts              # key-to-command mapping
└── packet-panic.test.ts  # engine and replay tests
~~~

### Domain model

~~~ts
type Direction = 'N' | 'E' | 'S' | 'W';
type Protocol = 'cipher' | 'pulse' | 'archive' | 'ghost';
type RouterKind = 'link' | 'bend' | 'split' | 'firewall';
type RouterState = 'healthy' | 'jammed' | 'infected';

interface Position { x: number; y: number; }

interface Router {
  id: string;
  kind: RouterKind;
  rotation: 0 | 1 | 2 | 3;
  state: RouterState;
  packetId: string | null;
}

interface Packet {
  id: string;
  protocol: Protocol;
  sourceId: string;
  destinationId: string;
  position: Position | null; // null while in source queue
  ageTicks: number;
  blockedTicks: number;
  priority: boolean;
  malware: boolean;
}

interface GameState {
  seed: number;
  tick: number;
  phase: 'start' | 'tutorial' | 'playing' | 'upgrade' | 'gameOver' | 'won';
  sector: number;
  board: Board;
  packets: Record<string, Packet>;
  sources: Record<string, SourceNode>;
  destinations: Record<string, DestinationNode>;
  inventory: Record<RouterKind, number>;
  upgrades: UpgradeId[];
  score: number;
  streak: number;
  trace: number;
  deliveriesThisSector: number;
  focusCharges: number;
  focusUntilTick: number;
  purgeCharges: number;
  scheduledEvents: ScheduledEvent[];
}
~~~

Use serialisable plain objects/arrays for snapshot testing. IDs must be stable and monotonic.

### Board API

~~~ts
getPorts(tile: Tile): Direction[];
getNeighbour(position: Position, direction: Direction): Position | null;
areConnected(board: Board, from: Position, to: Position): boolean;
getConnectedNeighbours(board: Board, position: Position): Position[];
canPlaceRouter(state: GameState, position: Position, kind: RouterKind): boolean;
placeRouter(state: GameState, position: Position, kind: RouterKind, rotation: Rotation): Result;
rotateRouter(state: GameState, position: Position): Result;
salvageRouter(state: GameState, position: Position): Result;
findShortestPath(board: Board, from: Position, to: Position): Position[] | null;
validateBoard(board: Board): ValidationIssue[];
~~~

### Simulation pipeline

~~~text
1. Return unless phase is playing.
2. Apply forecast events; update jams, infection, Focus.
3. Spawn packets into source queues.
4. Create proposals for router packets and source-queue heads.
5. BFS-route normal packets; route malware toward router targets.
6. Resolve target claims by age, then stable ID.
7. Commit all winners simultaneously.
8. Process deliveries, firewall blocks, infection, score, streak.
9. Apply overflow/stall TRACE penalties.
10. Check quota, upgrade phase, win, and loss.
~~~

~~~ts
interface TickResult {
  delivered: Packet[];
  droppedSourceIds: string[];
  infections: Position[];
  firewallBlocks: Position[];
  movedPacketIds: string[];
  traceDelta: number;
  phaseChanged: boolean;
}
~~~

Rendering turns TickResult into particles/popups/flash/shake; rendering never decides a game rule.

### Determinism

- Store one 32-bit seed per run.
- Use Mulberry32 or equivalent for layout, spawn destinations, upgrade draws, and events.
- Never use Math.random inside model/progression code.
- Cosmetic particles and title glitches may use Math.random.
- Show seed on end screen; replay-code import can be post-release.

## Gamr integration

The controller follows the existing repository game pattern:

- Export runPacketPanicGame(terminal) with stop() and isRunning.
- Use getCurrentThemeColor, getVerticalAnchor, shared pause-menu helpers, transition dispatch helpers, and shared effects.
- Enter alternate buffer/hide cursor at start; clear intervals and dispose terminal.onKey in stop().
- Render every 50ms. Drive simulation with an elapsed-time accumulator rather than a raw 250ms interval.
- Freeze simulation and show the standard resize message below 80×28.
- Register packet-panic in src/games/index.ts with description: “Route packets. Stop the trace.”

~~~ts
let accumulator = 0;
let lastUpdateAt = performance.now();

function update(now: number) {
  const elapsed = Math.min(now - lastUpdateAt, 250);
  lastUpdateAt = now;
  if (!gameStarted || paused || state.phase !== 'playing') return;

  const tickMs = state.focusUntilTick > state.tick ? 750 : 250;
  accumulator += elapsed;
  while (accumulator >= tickMs) {
    accumulator -= tickMs;
    applyPresentationEvents(advanceSimulation(state));
  }
}
~~~

Use Date.now if the runtime lacks performance.now.

## Delivery milestones

### 0 — Rules proof

Hand-simulate one two-protocol sector, produce an 80-column mock-up, and confirm a good route, obvious bad route, and meaningful reroute fit the grid.

### 1 — Pure routing prototype

Implement types, seed, board, simulation, source queues, Links/Bends, BFS, contention, delivery, overflow, and TRACE. No Terminal code. Done when identical seed + commands gives identical snapshots.

### 2 — Playable vertical slice

Add controller, render, cursor, preview, placement, rotation, salvage, HUD, start, pause, and game-over. Make one 3–5 minute two-protocol sector. Done when it is playable without developer controls.

### 3 — Standard Shift

Add eight sectors, quotas, upgrades, win screen, Split, Focus, spikes, and jams. Use curated layouts first. Done when every sector is distinct and fair.

### 4 — Hostile network

Add Firewall, malware, infection, purge, sweep, priority packets, forecast, and shared effects. Done when every threat is legible and counterable.

### 5 — Release polish

Add tutorial, help, accessibility symbols, seed display, score/rank, compact layout, and debug metrics. Register game, typecheck, build, and test when dependencies are installed.

## Test plan

Use Vitest against pure engine files, following the existing hyper-fighter engine-test model.

### Topology

- Port sets are correct for every router rotation.
- Connections require reciprocal ports.
- Blocks/infected routers are impassable.
- Placement rejects occupied, blocked, node, and exhausted-inventory tiles.
- Rotation/salvage rejects packet-occupied router.

### Routing

- BFS returns shortest deterministic path.
- Packets with no route wait.
- Router rotation changes next hop next tick.
- Conflicts resolve by age then ID.
- A packet moves at most once per tick.
- Packets cannot share a router or pass through each other.
- Only matching destinations deliver.

### Economy and threats

- Fixed seeds produce exact spawn/event schedules.
- Overflow drops the documented packet and adds exact TRACE.
- Ten clean deliveries award correct stability reduction.
- Focus changes cadence, not simulation rules.
- Firewall blocks malware before infection.
- Purge restores ports and consumes one charge.
- Loss triggers only after TRACE threshold tick resolves.

### Progression and property tests

- Every sector has in-bounds nodes and matching protocol pairs.
- Supplied inventory can create a valid route for every curated sector.
- Same seed + commands produces equal state after 1,000 ticks.
- Across 1,000 seeds there is no out-of-bounds packet, duplicate ID, negative inventory, or TRACE outside 0–100.

### Manual QA

- Test 80×28, 100×35, and too-small terminals.
- Test dark/light themes and colour-independent symbols.
- Confirm pause/restart/quit/list/next-game clean up listeners and terminal state.
- Hammer rapid place/rotate/salvage input.
- Verify all status is readable as text, not only colour/animation.

## Balance instrumentation

Add a development-only ~ debug overlay:

~~~text
TICK 0921  ACTIVE 8  ROUTABLE 7  BLOCKED 1
AVG WAIT 3.4s  MAX QUEUE 5/6  TRACE +8 (LAST 30s)
DELIVERY/S 1.20  SPAWN/S 1.08  SEED 38492017
~~~

At run end log seed, sector, max TRACE, router placement counts, upgrades, drops, infections, and average packet age. Balance from evidence, not intuition.

## Version-1 non-goals

- Online accounts, cloud saves, remote leaderboards, or daily-reward pressure.
- Real networking simulation or command parsing.
- Mouse requirement.
- Procedural layouts before curated sectors are excellent.
- Extra router types before the four core parts create deep choices.
- Meta-currency or grind.

## Definition of done

Packet Panic ships when:

1. A new player learns route → queue → overflow through play.
2. Standard Shift has eight fair sectors, four routers, eight upgrades, and three counterable threat types.
3. Every run is reproducible from seed and command sequence.
4. Rules are unit-tested independently of ANSI rendering.
5. The game uses Gamr lifecycle, pause menu, themes, effects, transitions, size handling, and registry.
6. Blind-playtest failures are described as routing/capacity mistakes, not luck or unclear controls.

