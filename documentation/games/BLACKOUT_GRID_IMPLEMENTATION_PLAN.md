# Blackout Grid — full game and implementation plan

## Product decision

**Blackout Grid is a real-time, pause-friendly power-restoration strategy game.** A storm has split the city distribution network into dark islands. The player operates breakers, repairs damaged feeder spans, builds a few emergency tie lines, sheds non-critical demand, and deploys temporary generation while further faults arrive.

The defining mechanic is **cold-load pickup**: a district that has been dark draws substantially more power for a short time when it is restored. Reconnecting every district as quickly as possible is therefore dangerous. The player must restore the city in deliberate sections, keep line and substation loading visible, and decide which service can wait.

Version 1 should ship as one 10–15 minute **Standard Restoration** across five storm stages, plus a scripted tutorial, seeded variations, eight upgrades, an end rank, and same-seed replay. Endless mode, dailies, procedural topology, and realistic AC power flow are explicitly later ideas.

## Why this is a game and not a simulation

The real electrical grid is too complex to reproduce faithfully in a small terminal game. Blackout Grid deliberately models the operational decisions that are legible and interesting:

- topology: what is connected, isolated, broken, or supplied from another source;
- capacity: whether a feeder or substation is carrying too much demand;
- sequencing: which district should be restored first and when it is safe to reconnect another;
- protection: faults and overloads trip breakers instead of causing unexplained failure;
- prioritisation: hospitals, water, communications, transit, homes, and industry have different civic value;
- resilience: tie lines, batteries, and local generation can form intentional islands.

It does **not** model voltage phase angles, reactive power, three-phase imbalance, relay coordination curves, frequency dynamics, or real switching procedures. The help screen and documentation should call it a fictional operational abstraction, not training or safety guidance.

## Research translated into mechanics

The grounded rules have useful real-world roots:

- Distribution systems are commonly operated as radial feeders, and breakers, reclosers, switches, and sectionalizers isolate faults. The game translates this into a visible **energized forest**: closing a link that creates an unsafe live loop is rejected, and a fault trips its nearest upstream protective edge. [U.S. Department of Energy distribution-system baseline](https://www.energy.gov/sites/prod/files/2017/01/f34/Electricity%20Distribution%20System%20Baseline%20Report.pdf)
- Service restoration commonly involves network reconfiguration, controllable switches, critical-load prioritisation, and intentional islands supplied by distributed resources. These become tie-line switching, district priority, and limited mobile generators/microgrids. [PNNL service-restoration framework](https://www.pnnl.gov/publications/generalized-framework-service-restoration-resilient-power-distribution-system)
- Demand immediately after restoration can exceed normal feeder demand; restoring a feeder in sections can mitigate that cold-load pickup. This becomes the main pressure mechanic and gives every reconnect order a readable risk. [PNNL cold-load pickup study](https://www.pnnl.gov/publications/evaluating-magnitude-and-duration-cold-load-pick-residential-distribution-feeders)
- Microgrids can preserve service in smaller islands when bulk supply is unavailable. The game simplifies this into local grid-forming sources that may energize an isolated component but cannot be paralleled with another live source. [PNNL distribution resiliency and microgrids report](https://www.pnnl.gov/publications/improving-distribution-resiliency-microgrids-and-state-and-parameter-estimation)
- Severe-weather resilience work uses forecasts, component-failure risk, and restoration priorities. The player therefore gets an honest two-event storm forecast instead of surprise random failures. [PNNL EGRASS overview](https://www.pnnl.gov/projects/wildfire-risk-resilience/tools/egrass)

The design consequence is simple: use authentic concepts as readable verbs, but prefer predictable game rules over realism whenever the two conflict.

## Identity relative to Packet Panic

Blackout Grid may share a live terminal-control-room cadence with Packet Panic, but it must not be a reskin.

| Packet Panic | Blackout Grid |
|---|---|
| Individual packets move tile by tile. | Power energizes an entire connected component immediately. |
| The player places and rotates router shapes. | The player restores authored feeder spans and operates breakers. |
| Congestion is caused by moving entities competing for tiles. | Stress comes from aggregate demand, capacity, and reconnection surges. |
| A shortest path is recalculated for every packet. | A radial energized forest determines downstream load on every edge. |
| Malware is an external network enemy. | Storm faults, flooding, and overload trips are physical failures. |
| Success means delivery quota and streak. | Success means stable critical service sustained through each storm stage. |
| Purge and firewall are emergency counters. | Isolation, repair, load shedding, ties, and mobile generation are the counters. |

The emotional rhythm is also different. Packet Panic is about keeping many small things flowing. Blackout Grid is about the weight of one consequential switch: the map changes from dark to bright instantly, followed by the question, “Can the feeder hold?”

## Player fantasy and tone

The player is the overnight restoration controller for the fictional city of Lumen. Field crews are already outside; the player decides where they go and how repaired sections are re-energized.

Tone should be grounded, humane, and hopeful:

- dispatch messages are brief and operational: `NORTH FEEDER ISOLATED — CREW CAN ENTER`;
- district details make priorities concrete: `ST ANNE HOSPITAL — backup fuel 38%`;
- failure avoids graphic disaster language: `WATER PUMPS LOST — CIVIC STRAIN RISING`;
- successful restoration visibly relights district names and nearby streets;
- the storm is dangerous, but the fantasy is competent recovery rather than catastrophe spectacle.

## Design pillars

1. **Every switch changes the picture.** Energized lines brighten immediately; capacity, served demand, and risk update on the same simulation beat.
2. **Restore in the right order.** Cold-load pickup makes sequencing more important than raw speed.
3. **Failures explain themselves.** A trip names the overloaded edge, its load, its rating, and the district that caused the surge.
4. **Critical service matters.** The hospital and water plant are not just higher-scoring colored nodes; their outages visibly accelerate civic strain.
5. **Pressure is real but pausable.** The simulation runs continuously, Focus slows it, and Escape opens the normal full pause.
6. **The whole decision space fits on one screen.** Map, forecast, crews, demand, edge loading, and current objective remain visible at `80x28`.

## Target experience

| Beat | Player experience | Typical duration |
|---|---|---:|
| Assess | Read dark islands, damaged spans, capacity, and the first forecast. | 20–30s |
| First light | Repair and close a feeder to one critical district. | 30–60s |
| Pickup | Watch reconnection demand surge and decide whether to wait or shed. | 15–30s |
| Fault | A warned storm strike trips a feeder; trace the outage and isolate it. | 20–45s |
| Reconfigure | Backfeed through a tie or deploy a generator while the crew repairs. | 30–60s |
| Stabilize | Hold required service long enough to clear the storm stage. | 10–20s |
| Upgrade | Choose one new operational advantage. | 10–15s |
| Final squall | Manage multiple sources, faults, and pickup surges on the full map. | 2–3m |

A loss should provoke a specific correction: “I restored East Ward before its pickup had settled,” “I closed the tie with both sources live,” or “I kept industry on while the hospital feeder heated.”

## Core loop

1. Read the current stage objective, city map, district demand, damaged spans, and the next two storm events.
2. Move the selection cursor to a feeder edge, switch, district, or local generator.
3. Assign the repair crew to a faulted span or build one of the limited emergency ties.
4. Open and close breakers to energize safe radial components.
5. Watch newly restored districts enter cold-load pickup and increase downstream feeder load.
6. Shed low-priority districts, wait for pickup to settle, backfeed from another substation, or deploy a mobile generator before equipment trips.
7. When a fault lands, protection opens the nearest upstream breaker. Use the event log and darkened topology to isolate, repair, and reclose.
8. Keep the required critical districts powered and the weighted service ratio above the stage target for a continuous stability window.
9. Clear the stage, freeze the simulation, choose one upgrade, and receive the next storm briefing.
10. Complete five stages before `CIVIC STRAIN` reaches 100.

## Board and topology

### Screen scale

- Logical drawing grid: **15 columns × 9 rows**.
- Render width: 3 terminal columns per logical cell, for a 45-column map.
- Map origin: approximately column 3, row 6.
- Right operations panel: 26–28 columns.
- Minimum terminal size: **80 columns × 28 rows**.
- Wider terminals may expand the event log and district detail panel, but may not reveal mechanically important information hidden at `80x28`.

The electrical model is a graph laid out on this grid, not a free-placement tile board. Nodes occupy fixed points. Edges contain an authored orthogonal route used only for drawing and selection. This preserves a clean circuit-map appearance and lets scenarios be balanced intentionally.

### Node kinds

| Kind | Map identity | Rule |
|---|---|---|
| Bulk substation | `◆A`, `◆B` | Grid-forming source with a MW capacity and transformer heat. |
| Distribution substation | `◇N`, `◇S` | Junction/transformer; may have its own capacity limit. |
| Critical district | `H`, `W`, `C`, `T` | Hospital, water, communications, or transit load. High strain weight. |
| Normal district | `R`, `I` | Residential or industry demand. Good candidates for controlled shedding. |
| Microgrid/battery | `B` | Limited local supply and fuel; energizes only an isolated island. |
| Switch node | `○` / `●` | Sectionalizer or tie control with open/closed state. |

### Edge kinds and states

Each `GridEdge` is an electrical span between two nodes. Its drawn route can pass through several logical cells, but it is one capacity/protection object.

| Kind/state | Meaning |
|---|---|
| `feeder` | Normal permanent line. Usually intact at start. |
| `tie` | Normally open alternate route. May be intact or unbuilt. |
| `underground` | Lower storm vulnerability, slower repair. |
| `intact` | Can conduct when its breaker is closed. |
| `faulted` | Cannot conduct; a crew repair is required. |
| `repairing` | Crew is assigned; progress is visible. |
| `unbuilt` | Candidate emergency tie; building consumes a line kit. |
| `open` | Intact but deliberately disconnected. |
| `closed` | Intact and in the active topology. |
| `tripped` | Protection opened the edge due to overload or a transient. |

An edge has one controllable protection state even if the fiction implies multiple field devices. That keeps every span to one selectable object and avoids a breaker-simulator interface.

### Authored map, seeded incident variations

Version 1 uses one authored city map with:

- 2 bulk substations;
- 3 distribution substations;
- 8 demand districts;
- 2 batteries or mobile-generator connection points;
- 13–16 permanent feeder edges;
- 3 normally open tie candidates;
- enough sectionalization that no single fault must always black out the whole city.

Seeds may vary initial damaged edges, storm-event targets, demand modifiers, and upgrade choices only within validated sets. They must not generate topology. Every seed must retain at least one viable restoration route for all required critical districts.

## Electrical abstraction

### Radial operation invariant

The closed, intact electrical topology must be a forest:

- each energized component has at most one grid-forming source;
- closing an edge that would create a cycle is rejected with `CLOSE BLOCKED — LOOP WOULD BE LIVE`;
- closing an edge between two energized sources is rejected with `CLOSE BLOCKED — LIVE SOURCES NOT SYNCHRONIZED`;
- a dark component may be connected to one live component;
- a microgrid may energize a component only while every connection to a bulk-supplied component is open.

This is both a usability rule and an algorithmic guarantee. A tree gives every load one unambiguous upstream path, so downstream line loading is readable and deterministic.

The player may build a physical loop, but one tie in that loop must remain open. Reconfiguration is therefore “open one path, close another,” a strong and understandable operator verb.

### Energization pass

For every simulation beat:

1. Remove faulted, repairing, unbuilt, open, and tripped edges from the active graph.
2. Sort grid-forming sources by stable source ID.
3. Breadth-first search from each source through closed intact edges.
4. Record `rootSourceId`, `parentNodeId`, and `parentEdgeId` for every reached node.
5. Mark an unreached district `dark`; mark a reached district `energized` unless its own service breaker is shed.
6. Treat a shed district as connected but drawing zero demand.

Because illegal loops and source paralleling are blocked at command time, BFS order never changes actual load paths.

### District demand and cold-load pickup

Each district has a deterministic base demand and a stage multiplier:

```text
requestedMW = baseMW × stageDemandMultiplier × pickupMultiplier × eventMultiplier
```

Initial tuning:

| District state | Pickup multiplier | Duration |
|---|---:|---:|
| Just restored | 1.60× | 4 simulation beats |
| Recovering | 1.30× | next 6 beats |
| Settled | 1.00× | until next outage |
| Deliberately shed | 0× | while open |

An outage lasting at least 6 beats resets the district to full pickup on its next restoration. Rapid breaker toggling cannot erase pickup. A district that was dark for less than 6 beats resumes at the remaining pickup phase, which prevents exploiting momentary switching.

Critical facilities have smaller absolute loads but higher civic importance. Residential and industrial districts create the biggest pickup surges and are often the correct loads to delay.

### Downstream power flow

With the energized component rooted as a tree, compute flow in post-order:

```text
nodeDemand(node) = served district demand at node, otherwise 0
subtreeDemand(node) = nodeDemand(node) + sum(subtreeDemand(child))
edgeFlow(parentEdge(node)) = subtreeDemand(node)
sourceFlow(source) = subtreeDemand(source)
```

This is intentionally not an AC or DC power-flow solver. It is a tree load sum. The rule is cheap, deterministic, and lets the detail panel say exactly why an edge reads `24 / 20 MW`.

### Loading and heat

Every feeder, distribution substation, and source transformer has `flowMW`, `capacityMW`, and `heat` from 0–100.

```text
utilization = flowMW / capacityMW

if utilization > 1.00:
  heat += 8 + (utilization - 1.00) × 32
else if utilization < 0.85:
  heat -= 7
else:
  heat -= 3

heat = clamp(heat, 0, 100)
```

- At 70 heat, the edge pulses amber and an alarm names it.
- At 100 heat, its protective breaker trips before the next beat's energization pass.
- An overload trip does not physically damage the line. It may be reset only after heat falls below 40.
- A reset into the same overload will heat and trip again; the game never silently forgives it.
- Storm faults physically damage an edge and require repair before reset.

The heat formula is a tuning starting point, not a realism claim. It gives roughly 2–5 seconds to react to a serious overload at the 500 ms simulation rate.

### Capacity shortfall

While a connected component exceeds source or line capacity, districts remain temporarily energized and the responsible equipment heats. This creates a visible intervention window. The game does not partially distribute power or choose a hidden load to brown out.

The player resolves a shortfall by:

- shedding one or more districts;
- waiting for a pickup surge to decay before restoring another district;
- moving a dark branch to a different source with an open-before-close tie operation;
- deploying a generator to create an isolated local supply;
- completing a capacity upgrade between stages.

## Protection, faults, and restoration

### Storm event forecast

The next two scheduled storm events always appear in the operations panel at least 8 simulation beats before impact. Forecasts identify a zone and event type. In Standard mode the exact target edge becomes known 4 beats before impact. Tutorial events reveal the exact edge immediately.

Seeded uncertainty is allowed only within a displayed zone. Once selected during state creation, the target is fixed; the engine never calls `Math.random()` during play.

### Fault resolution

When a storm event faults an edge:

1. Mark the edge `faulted` and store the fault kind.
2. Use the energized parent map from the preceding beat to walk upstream.
3. Find the nearest closed protective edge; if none exists, use the source main breaker.
4. Set that protective edge to `tripped` with cause `fault`.
5. Recompute energization immediately so the affected branch goes dark on the same beat.
6. Add one structured event naming the damaged edge and opened protection.

This ordering produces an understandable chain: `LIGHTNING — EAST SPAN FAULTED; NORTH BREAKER TRIPPED`.

### Repair sequence

Physical restoration is three clear steps:

1. **Isolate.** The fault's protective breaker is already tripped; any alternate path that could energize the fault must also be open. `canStartRepair` verifies both endpoints are de-energized.
2. **Repair/build.** Assign a crew with key `2`. Faulted overhead spans take 8 beats, underground spans 12, and unbuilt emergency ties 10. A tie consumes one line kit when work starts.
3. **Reclose.** Completed work leaves the edge intact and open. The player explicitly closes it with key `1`, sees pickup demand, and owns the result.

Invalid work never consumes a crew or line kit. The panel must state the reason: `CREW BLOCKED — SOUTH END STILL LIVE`.

### Crew model

- Start with one crew slot.
- A crew may work on one edge at a time and progresses automatically every simulation beat.
- The selected job shows a compact progress meter on the map and panel.
- Work pauses during the normal Escape pause, but not during Focus slow mode.
- A crew cannot be reassigned until its job completes in version 1; this keeps commitment meaningful and avoids refund rules.
- The `Second Crew` upgrade adds one concurrent slot.

### Transient events and reclosers

Not every incident is permanent damage:

- `lightning-transient` trips an edge but does not fault it; it may be reset below 40 heat;
- `fallen-tree` and `wind-damage` create physical faults;
- `flood-warning` derates a named substation for the rest of the stage;
- `demand-surge` temporarily raises one district's event multiplier;
- `debris-delay` adds 4 beats to an active crew job, but is always forecast and never destroys progress.

Avoid a random auto-reclose loop in base rules. The `Smart Recloser` upgrade may automatically clear one transient trip per stage after a 2-beat visible countdown.

## Civic strain, stage objective, and outcomes

### Civic strain

`CIVIC STRAIN` is the single loss meter. It represents the accumulating consequences of prolonged outages, not electrical instability alone.

Each district has a `strainWeight`:

| District | Symbol | Example base MW | Strain per dark beat |
|---|---:|---:|---:|
| Hospital | `H` | 8 | 1.20 |
| Water | `W` | 10 | 0.90 |
| Communications | `C` | 6 | 0.65 |
| Transit | `T` | 9 | 0.55 |
| Residential | `R` | 12–18 | 0.18 |
| Industry | `I` | 16–22 | 0.10 |

- A deliberately shed district is still dark and still adds strain; shedding is a trade, not a free capacity button.
- Serving all stage-required critical districts reduces strain by 0.35 per beat, never below 0.
- A feeder trip adds a one-time +2 strain; a source-main trip adds +5.
- During the initial 12-beat planning grace, normal residential/industrial darkness adds no strain, but critical districts still add half strain.
- At 75 strain, event copy escalates and the bar pulses; nothing secretly becomes harder.
- At 100, the shift ends after the current beat with a restoration report.

Exact values must be balance-tested; all weights live in content/configuration, not scattered through the engine.

### Stage stability objective

Each storm stage defines:

- required critical district IDs;
- minimum weighted service ratio;
- consecutive `holdBeats` required;
- event deck and demand multiplier;
- available tie builds and any new district revealed.

```text
weightedServiceRatio =
  sum(servedDistrict.baseMW × district.serviceWeight)
  / sum(activeDistrict.baseMW × district.serviceWeight)
```

The stability counter advances only while all required critical districts are served and the ratio meets target. Falling below target resets the consecutive counter to zero. The HUD always shows `STABLE 07 / 16`, so the rule never feels hidden.

### Five-stage difficulty curve

One simulation beat is 500 ms outside Focus.

| Stage | Active city | Target | Hold | New pressure |
|---:|---|---:|---:|---|
| 1 — Black Start | Hospital, water, one residential | 55% | 12 beats | One damaged feeder; learn repair, close, pickup, shed. |
| 2 — North Wind | + communications and second residential | 62% | 16 beats | First forecast fault and normally open tie. |
| 3 — River Rise | + transit and industry | 68% | 18 beats | Flood derates a substation; mobile generator unlocks. |
| 4 — Broken Ring | Full map | 74% | 20 beats | Overlapping demand surge and physical fault; two-source reconfiguration. |
| 5 — Final Squall | Full map | 82% | 24 beats | Two forecast zones, scarce crew time, sustained critical-service requirement. |

Between stages the simulation freezes, strain does not change, heat cools to at most 30, completed repairs persist, incomplete crew jobs remain paused, and the player chooses one upgrade. The feeder topology persists, making the city feel rebuilt rather than replaced by five unrelated levels.

### Win, loss, and score

- **Win:** clear stage 5 before civic strain reaches 100.
- **Loss:** civic strain reaches 100. There are no random instant-loss events.
- **Gold restoration:** finish with every critical district served, at least 80% total service, no source-main trips, and strain below 35.
- **Standard restoration:** finish stage 5 by any legal means.
- **Emergency survival:** stage 5 clears but one critical district is supplied only by a nearly exhausted generator; this is still a win with a lower report rank.

Initial score formula:

```text
serviceScore = sum(weighted served MW on every beat)
stageBonus = 750 × stages cleared
resourceBonus = 100 × line kits remaining + 3 × generator fuel remaining
tripPenalty = 150 × feeder trips + 400 × source-main trips
strainPenalty = 20 × maxCivicStrain

finalScore = max(0, serviceScore + stageBonus + resourceBonus
                    - tripPenalty - strainPenalty)
```

Ranks: `GRIDKEEPER`, `CONTROLLER`, `DISPATCHER`, `TRAINEE`, `CITY DARK`.

The end report shows score, rank, seed, maximum strain, critical uptime, total trips, lines repaired/built, worst overload, and the last five major events. `R` restarts the same seed; `N` starts a new seed or moves to the next Gamr game according to the existing end-menu convention.

## Player actions and controls

### Stable action vocabulary

| Key | Action | Target | Rule |
|---|---|---|---|
| Arrows / `WASD` | Move selection | Map | Moves among logical cells; empty cells remain selectable for inspection. |
| `Tab` / `Shift+Tab` | Cycle assets | Selectables | Cycles faulted edges, critical districts, then all nodes/edges in stable order. |
| `1` / `Enter` | Open / close | Selected controllable edge or district breaker | Validates radial/source rules before closing. Enter is the contextual primary action. |
| `2` / `R` | Repair / build | Faulted or unbuilt edge | Assigns an available crew; build consumes one line kit. |
| `3` / `L` | Shed / restore load | District | Opens or closes the district service breaker. Restoration triggers pickup. |
| `4` / `G` | Generator | Eligible dark district/microgrid node | Deploys, starts, or stops a limited mobile source. |
| `Space` / `F` | Focus | Global | Spends one Focus charge and slows simulation for 6 real seconds. |
| `H` | Help | Global | Opens concise rules/legend without changing the simulation only if help itself pauses. Prefer a help overlay that pauses. |
| `Esc` | Pause | Global | Uses Gamr's shared pause menu. |

Do not overload `Q` during live play. Quitting should happen through the pause menu, consistent with other active games.

### Command validation

Every action returns a structured success or failure. Failed actions do not spend resources and the log gives one reason:

- `CLOSE BLOCKED — EDGE IS STILL FAULTED`
- `CLOSE BLOCKED — LOOP WOULD BE LIVE`
- `CLOSE BLOCKED — LIVE SOURCES NOT SYNCHRONIZED`
- `RESET BLOCKED — BREAKER STILL HOT 63%`
- `CREW BLOCKED — NO CREW AVAILABLE`
- `CREW BLOCKED — FAULT NOT ISOLATED`
- `BUILD BLOCKED — NO LINE KITS`
- `GENERATOR BLOCKED — ISLAND CONNECTED TO BULK SOURCE`

## Focus, pause, and time

- Rendering: 50 ms interval (20 FPS).
- Normal simulation: one beat every 500 ms.
- Focus simulation: one beat every 1000 ms for 6 real seconds.
- Focus starts with 2 charges per run; some upgrades add one charge per stage.
- Escape pause stops simulation, repair progress, timers, effects, and event resolution.
- Stage briefings, upgrade choices, help, win, and loss screens also stop simulation.
- Resizing never advances the engine.
- The engine accepts discrete `advance(state)` calls and knows nothing about wall-clock time. The controller decides when to call it.

## Upgrades

After stages 1–4, show three seed-determined choices. Upgrades should change plans, not merely add score.

| Upgrade | Effect |
|---|---|
| Second Crew | +1 concurrent repair/build job. |
| Spare Conductor | +2 line kits; emergency ties build 2 beats faster. |
| Demand Response | Residential pickup is 1.35× then 1.15× instead of 1.60× then 1.30×. |
| Smart Recloser | Clears one transient trip per stage after a visible 2-beat countdown. |
| Mobile Reserve | +18 generator fuel and +4 MW generator capacity. |
| Thermal Margin | Permanent feeder capacity +15%; trip threshold stays visible at 100 heat. |
| Field Intel | Exact storm targets reveal 8 beats before impact instead of 4. |
| Operator Focus | +1 Focus charge at the start of every remaining stage. |

For `Thermal Margin`, apply the percentage to base capacity at flow calculation time; do not mutate every edge repeatedly. Duplicate upgrades are either disallowed or explicitly stack through a content-defined `maxStacks`.

Upgrade choice generation uses the run seed and stage number. At least one offered choice must address the next stage's primary pressure category (crew, capacity, information, or generation), so a seed cannot produce three irrelevant options.

## Storm event system

### Event shape

```ts
interface StormEvent {
  id: string;
  stage: number;
  impactTick: number;
  revealTick: number;
  kind:
    | 'lightning-transient'
    | 'fallen-tree'
    | 'wind-damage'
    | 'flood-derate'
    | 'demand-surge'
    | 'debris-delay';
  zoneId: string;
  targetId: string;
  magnitude: number;
  resolved: boolean;
}
```

### Event fairness rules

- Every damaging event is forecast before impact.
- Event targets are chosen at stage creation, not impact time.
- Two physical faults may not target the same edge in one stage.
- An event may not fault an edge currently being repaired unless the briefing explicitly marks the zone as unsafe; version 1 should simply exclude active jobs.
- A physical-fault target must have at least one legal isolation and restoration plan from the current authored topology.
- A flood derate may not reduce all possible source capacity below the stage's minimum service target.
- Event ordering for equal ticks is stable by event ID.
- Difficulty comes from overlapping known pressures, not concealed dice rolls.

## Tutorial

The tutorial is a small scripted version of stage 1 using the same engine rules.

1. **Read the map.** Move to the broken `NORTH FEEDER`; the panel explains `×`, capacity, and isolation.
2. **Repair.** Press `2`; the crew meter advances while the rest of the tutorial remains frozen until the job finishes.
3. **Reclose.** Press `1`; the hospital and one residential district light up immediately.
4. **Observe pickup.** The residential load flashes `PICKUP 18→12 MW`, making the shared feeder amber.
5. **Shed.** Press `3` on residential so the hospital stays powered while the line cools.
6. **Restore in sequence.** Wait for the pickup phase to reset appropriately, then restore residential without a trip.
7. **Handle a fault.** A scripted transient trips the south tie; inspect the event log and reset it once cool.
8. **Backfeed.** Open the north path before closing the south tie, demonstrating the no-live-loop rule.
9. **Stabilize.** Hold hospital and water service for 8 beats and finish with a short report.

Tutorial callouts live in the right panel and never cover the topology. The engine exposes tutorial objectives and completion predicates so each step can be unit tested. Tutorial mode is unscored and can be exited through pause at any time.

## Visual language

Build and document one semantic vocabulary before renderer polish. Important state must remain legible in monochrome and with ASCII fallback.

| Concept | Preferred glyph | ASCII fallback | Colour/weight |
|---|---|---|---|
| Bulk source | `◆` | `G` | bold theme |
| Distribution substation | `◇` | `S` | theme |
| Closed switch | `●` | `o` | bright/green |
| Open switch | `○` | `.` | dim |
| Faulted span | `×` | `x` | red |
| Forecast impact | `!` | `!` | amber |
| Repair crew | `◈` | `+` | cyan |
| Battery/generator | `▣` | `B` | magenta |
| Energized line | heavy box line | `=` | bright theme |
| Dark intact line | light box line | `-` | dim |
| Overloaded line | heavy line plus `!` | `=!` | amber/red pulse |
| Critical served | `H/W/C/T` | same | green/bright |
| Critical dark | same plus `×` | same plus `x` | red/dim |
| Heat/capacity meter | `■·` | `#.` | semantic colour |

Use one-character, predictable-width symbols only after testing them in the supported terminal. If `◆`, `◇`, `◈`, or `▣` misalign, ship the ASCII fallback rather than accepting a broken map.

### Line rendering

- Derive each route cell's box-drawing glyph from its adjacent route directions.
- Energized lines are bright/heavy; dark intact lines are dim/light.
- Faulted edge midpoint replaces the line with `×` and retains a red broken segment on both sides.
- An open switch interrupts the line with `○`; closed uses `●`.
- A selected edge uses inverse video at its midpoint and highlights its full route subtly if the terminal supports it.
- Do not animate flowing particles. Electricity is not a packet. Use a one-frame energization pulse along the whole edge when it changes from dark to live.

### Illustrative `80x28` frame

```text
                       ◆ BLACKOUT GRID ◆
 STAGE 03/05  STRAIN [■■■■■·········] 27   STABLE 09/18   FOCUS ◆◆

   CITY NETWORK                                  OPERATIONS
   ◆A●━━━━◇N●━━━━H                               SELECT: NORTH FEEDER
    ┃      ○                                     LIVE   18 / 20 MW
    ┃      └────R                                HEAT   [■■■■■···] 61
    ●━━━━◇C×----◇E----W                          STATE  OVERLOAD
          ┃       ○
          C       └────▣B                        1 OPEN     2 REPAIR
          └────T----I                            3 SHED     4 GENERATOR

 CRITICAL  H HOSPITAL ✓   W WATER ×   C COMMS ✓  FORECAST
 CREWS     ◈ EAST SPAN [■■■··] 6 beats           ! T+06 RIVER FLOOD / EAST
 KITS      1    GEN FUEL 14                        ! T+14 HIGH WIND / NORTH

 > RESIDENTIAL PICKUP SETTLED — 12 MW
 > EAST SPAN ISOLATED — CREW SAFE TO WORK

 ARROWS MOVE  TAB ASSETS  1 SWITCH  2 REPAIR  3 LOAD  4 GEN  SPACE FOCUS  ESC
```

The exact topology will change during implementation, but these invariants cannot:

- live versus dark path is visible without reading colour;
- selected asset shows flow, capacity, heat, and state;
- required critical loads and stability counter are always visible;
- next two storm events and all crew jobs remain visible;
- control hints reflect the current phase.

### Effects

Use the existing shared effects sparingly:

- short bright pulse when a district is energized;
- small `+SERVICE` popup on stage stability milestones, not every beat;
- one-cell spark burst at a faulted edge;
- restrained screen shake on a source-main trip or game over only;
- no constant particles, scrolling rain, or animation that hides topology;
- title glitch on start and end screens, not during normal operations.

## State machine

```ts
type Phase =
  | 'start'
  | 'tutorial'
  | 'briefing'
  | 'running'
  | 'upgrade'
  | 'won'
  | 'gameOver';
```

- `start`: simulation stopped; choose Standard Restoration or Tutorial.
- `briefing`: simulation stopped; show stage objective and forecast zones.
- `running`: input, repair jobs, demand, heat, storm events, and strain advance.
- `upgrade`: simulation stopped; choose one of three upgrades.
- `won` / `gameOver`: simulation stopped; show report and replay controls.
- Shared `paused` and `helpOpen` are controller/UI state or explicit engine flags that prevent calls to `advance`; they do not form hidden simulation phases.

## Domain model

Keep the engine free of Terminal, ANSI codes, timers, and wall-clock access.

```ts
interface Point { x: number; y: number; }

type NodeKind =
  | 'bulk-source'
  | 'substation'
  | 'district'
  | 'microgrid'
  | 'switch';

type DistrictKind =
  | 'hospital'
  | 'water'
  | 'communications'
  | 'transit'
  | 'residential'
  | 'industry';

interface GridNode {
  id: string;
  label: string;
  kind: NodeKind;
  position: Point;
  capacityMW: number;
  heat: number;
  sourceOnline: boolean;
  district?: DistrictState;
  generator?: GeneratorState;
}

interface DistrictState {
  kind: DistrictKind;
  baseDemandMW: number;
  requestedMW: number;
  serviceWeight: number;
  strainPerDarkBeat: number;
  serviceBreaker: 'open' | 'closed';
  powered: boolean;
  darkBeats: number;
  pickupBeatsRemaining: number;
  eventMultiplier: number;
}

type EdgeCondition = 'intact' | 'faulted' | 'repairing' | 'unbuilt';
type BreakerState = 'open' | 'closed' | 'tripped';
type TripCause = 'overload' | 'transient' | 'fault' | null;

interface GridEdge {
  id: string;
  label: string;
  from: string;
  to: string;
  route: Point[];
  kind: 'feeder' | 'tie' | 'underground';
  condition: EdgeCondition;
  breaker: BreakerState;
  tripCause: TripCause;
  capacityMW: number;
  flowMW: number;
  heat: number;
  energized: boolean;
  faultKind: StormEvent['kind'] | null;
  repairBeats: number;
}

interface CrewJob {
  id: string;
  edgeId: string;
  kind: 'repair' | 'build';
  remainingBeats: number;
  totalBeats: number;
}

interface PowerAssignment {
  nodeId: string;
  sourceId: string | null;
  parentNodeId: string | null;
  parentEdgeId: string | null;
  depth: number;
}

interface StageDefinition {
  id: string;
  name: string;
  requiredDistrictIds: string[];
  minimumServiceRatio: number;
  holdBeats: number;
  demandMultiplier: number;
  events: StormEvent[];
  briefing: string[];
}

interface LogEntry {
  tick: number;
  text: string;
  tone: 'normal' | 'good' | 'warn' | 'bad';
  entityId?: string;
}

interface GameState {
  version: 1;
  seed: number;
  phase: Phase;
  mode: 'standard' | 'tutorial';
  tick: number;
  stageIndex: number;
  nodes: Record<string, GridNode>;
  edges: Record<string, GridEdge>;
  assignments: Record<string, PowerAssignment>;
  jobs: CrewJob[];
  crewSlots: number;
  lineKits: number;
  generatorFuel: number;
  focusCharges: number;
  upgrades: string[];
  civicStrain: number;
  maximumStrain: number;
  stabilityBeats: number;
  score: number;
  feederTrips: number;
  sourceTrips: number;
  selected: Selection;
  eventLog: LogEntry[];
  tutorialStep: number | null;
}
```

Focus timing belongs to the controller because real time is not deterministic simulation state. The engine stores only `focusCharges`; the controller chooses a 1000 ms schedule while Focus is active.

### Commands and results

```ts
type Command =
  | { type: 'startStandard'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'dismissBriefing' }
  | { type: 'moveSelection'; dx: number; dy: number }
  | { type: 'cycleSelection'; direction: 1 | -1 }
  | { type: 'toggleBreaker'; entityId: string }
  | { type: 'startCrewJob'; edgeId: string }
  | { type: 'toggleDistrict'; districtId: string }
  | { type: 'toggleGenerator'; nodeId: string }
  | { type: 'chooseUpgrade'; upgradeId: string }
  | { type: 'toggleHelp' }
  | { type: 'restartSameSeed' };

interface CommandResult {
  state: GameState;
  accepted: boolean;
  events: EngineEvent[];
  reason?: string;
}

interface TickResult {
  events: EngineEvent[];
  energizedEdges: string[];
  deenergizedEdges: string[];
  trips: string[];
  faults: string[];
  districtsRestored: string[];
  jobsCompleted: string[];
  stageCleared: boolean;
}
```

Controller effects must react to structured `EngineEvent` kinds, not parse human log strings.

## Deterministic simulation order

`advance(state)` is the only function that moves simulation time. Use this exact high-level order:

```ts
function advance(state: GameState): TickResult {
  assert(state.phase === 'running');
  state.tick += 1;

  progressCrewJobs(state);                // completion leaves edge intact/open
  revealForecastsForTick(state);
  resolveStormEventsForTick(state);       // faults use previous assignment map

  let topology = buildEnergizedForest(state);
  updateDistrictDemandAndPickup(state, topology);
  computeDownstreamFlow(state, topology);
  const trips = updateHeatAndTrip(state); // simultaneous trip decisions

  if (trips.length > 0) {
    topology = buildEnergizedForest(state);
    updatePoweredDistricts(state, topology);
    computeDownstreamFlow(state, topology);
  }

  consumeGeneratorFuel(state);
  updateCivicStrain(state);
  updateStabilityCounter(state);
  updateScoreAndStats(state);
  evaluateStageOrRunOutcome(state);
  trimEventLog(state);

  return structuredTickResult();
}
```

Important details:

- Crew completion happens before same-tick storm impact, but events may not target an active or just-completed job in version 1.
- Heat trip decisions are computed from the pre-trip flow snapshot and committed simultaneously.
- After trips, topology and visible power state are recomputed immediately; heat is not updated twice.
- District pickup decrements once per simulation beat while powered. Darkness duration increments only while not powered.
- Stage-clear evaluation occurs after strain and service for the beat. If stability and strain 100 happen on the same beat, stage clear wins only if strain was below 100 at the start of that beat; encode and test this explicit tie rule.
- Iterate nodes, edges, jobs, sources, and events in sorted stable-ID order whenever order can affect output.

## Core algorithms

### `canCloseEdge`

1. Reject unless condition is intact and breaker is open/tripped-resettable.
2. Reject a tripped overload edge with heat ≥ 40.
3. Build a disjoint-set union from every other closed intact edge.
4. If endpoints already share a component, closing creates a cycle: reject.
5. Count active grid-forming sources in both endpoint components.
6. If combined count exceeds one, reject live-source paralleling.
7. Otherwise accept and set breaker closed.

For the small graph, a fresh DSU or DFS per player command is simpler and safer than maintaining incremental connectivity.

### `buildEnergizedForest`

1. Clear all assignments and edge `energized` flags.
2. Gather online bulk and microgrid sources in stable ID order.
3. For each source, BFS through closed/intact edges.
4. If a node is already assigned to another source, assert an invariant violation; command validation should have prevented it.
5. Record parent and depth on first visit.
6. Mark the parent edge energized.

### `computeDownstreamFlow`

1. Set every edge flow to zero.
2. Calculate requested/served demand at each assigned district.
3. Sort assignments by descending depth then stable node ID.
4. Accumulate each node's demand into its parent node.
5. Write the accumulated child demand to its parent edge.
6. Write source total to the source transformer's flow field.

### `tripProtectionForFault`

1. Capture the faulted edge's previously energized endpoint nearest its source using assignment depth.
2. Walk parent edges toward the root.
3. Choose the first edge flagged `protective`; in the simplified model every controllable feeder edge is protective.
4. If none, trip the source-main virtual breaker.
5. Store `tripCause = 'fault'` and a causal event containing both fault and protection IDs.

### Scenario validator

Add a pure validator used by tests and optionally development builds:

- all node/edge IDs are unique;
- every edge endpoint exists;
- every route is orthogonal, contiguous, and within 15×9;
- route cells do not ambiguously overlap unrelated edges;
- every critical district has at least two potential paths or an eligible generator if the scenario claims redundancy;
- all event targets exist and are compatible with the event kind;
- every stage target is achievable under base capacities with at least one authored legal switching plan;
- initial closed topology is acyclic and has at most one source per component;
- selectable midpoint cells are unique.

The last “achievable” check may initially use documented fixture solutions rather than a general solver.

## File layout

Blackout Grid is complex enough to separate domain logic from terminal code.

```text
src/games/blackout-grid/
├── index.ts              # controller, intervals, input, pause/menu transitions
├── types.ts              # domain, command, event, and result contracts
├── seed.ts               # small deterministic PRNG and seed mixing
├── content.ts            # districts, upgrades, tutorial copy, tuning constants
├── scenario.ts           # authored city graph, stages, storm decks, validation
├── topology.ts           # DSU/DFS, radial validation, BFS assignments, flow sums
├── engine.ts             # commands, ticks, demand, heat, faults, strain, outcomes
├── render.ts             # pure ANSI frame and map/panel helpers
├── engine.test.ts        # command, simulation, outcome, replay tests
└── topology.test.ts      # graph, capacity, and validator tests
```

Keep `content.ts` and `scenario.ts` data-first. If `engine.ts` grows beyond roughly 700–800 lines, split progression/tutorial rules into their own modules instead of creating a monolithic controller.

### Repository integration

1. Import `runBlackoutGridGame` in `src/games/index.ts`.
2. Register:

   ```ts
   {
     id: 'blackout-grid',
     name: 'Blackout Grid',
     description: 'Restore the city. Isolate faults. Hold the load.',
     maturity: 'workshop',
     pace: 'real-time',
     difficulty: 2,
     session: '10–15 min',
     run: runBlackoutGridGame,
   }
   ```

3. Export `runBlackoutGridGame` with the other individual runners.
4. Keep it `workshop` until the acceptance checklist and seed audit pass; promote to `beta` only after manual playtesting.
5. Update the public README game table only when it joins the active menu.

## Controller and lifecycle

`index.ts` should follow current Gamr conventions:

- export `BlackoutGridController` with `stop()` and `isRunning`;
- enter the alternate buffer and hide the cursor after the startup timeout;
- keep render and simulation intervals separate;
- use `getCurrentThemeColor()` on every render so theme changes apply;
- use `PAUSE_MENU_ITEMS`, `navigateMenu`, and `renderSimpleMenu` exactly as shared;
- route quit/list/next through `dispatchGameQuit`, `dispatchGamesMenu`, and `dispatchGameSwitch`;
- clear render interval, simulation timeout/interval, Focus timeout, effects, and key listener in idempotent `stop()`;
- restore cursor, ANSI reset, and primary buffer on every exit path;
- never let a paused, briefing, upgrade, help, end, or undersized state call `advance`.

A self-scheduling simulation timeout may be cleaner than swapping intervals for Focus:

```ts
function scheduleNextBeat(): void {
  if (!running) return;
  const delay = focusActive ? 1000 : 500;
  simulationTimer = setTimeout(() => {
    if (canAdvance()) applyTick(advance(state));
    scheduleNextBeat();
  }, delay);
}
```

Do not put real-time timestamps into engine decisions. Focus duration may be stored as “six slowed beats” instead of six wall-clock seconds if that produces simpler cleanup and replay behavior; choose one definition and test it.

## Rendering architecture

`renderFrame(state, viewport, uiState)` should be deterministic and side-effect free. It returns one ANSI string assembled from positioned fragments.

### Screen regions

1. **Header, rows 1–3:** title, stage, civic strain bar, stability counter, Focus charges.
2. **City map, rows 5–14:** 15×9 logical grid using 3-column cells.
3. **Operations panel, right side:** selected asset, flow/capacity, heat, state, contextual actions, forecasts.
4. **Critical status, rows 16–18:** required district service, crews, kits, fuel.
5. **Event log, rows 20–23:** latest three causal messages.
6. **Controls, rows 26–27:** phase-sensitive key guide.

### Render helpers to keep pure and testable

- `visibleWidth` / ANSI stripping;
- `writeAt` and clipped write;
- `routeGlyph(directions, energized)`;
- `edgeStyle(edge, selected)`;
- `districtGlyph(node)`;
- `meter(value, max, width)`;
- `formatFlow(flowMW, capacityMW)`;
- `renderSelectedDetails`;
- `renderForecast`;
- `renderMinimumSize`.

At `80x28`, labels must be clipped predictably and never overwrite the map. At wider sizes, add descriptive district names and up to five log events, but do not change controls or rules.

## Testing strategy

The engine and topology are the product. Test them without a terminal.

### Topology and flow tests

1. Initial scenario passes all validation rules.
2. Closing a legal edge energizes its previously dark component.
3. Closing an edge that creates a cycle is rejected without mutation.
4. Closing an edge that parallels two live sources is rejected.
5. Opening one path then closing a tie legally transfers a dark branch to another source.
6. A microgrid energizes only its isolated component.
7. BFS assignments have one source and one parent per reached node.
8. Post-order flow equals the exact sum of downstream district demand.
9. A shed district contributes zero edge flow while remaining topologically connected.
10. Equal topology and demand produce equal assignments and flows regardless of object insertion order.

### Demand, heat, and pickup tests

11. A newly restored district receives the 1.60× pickup multiplier for exactly 4 beats and 1.30× for exactly 6.
12. A sufficiently long outage resets pickup; a one-beat toggle does not erase or fully reset it.
13. Restoring two districts together sums both pickup surges upstream.
14. Under-capacity equipment cools and heat clamps at zero.
15. Over-capacity equipment heats according to the formula and trips exactly at 100.
16. An overload trip cannot reset above 40 heat and can reset below 40.
17. Simultaneous trips are computed from one flow snapshot and committed deterministically.

### Fault, repair, and event tests

18. A physical fault marks its edge and trips the nearest upstream protective edge.
19. The same fault in the same state always trips the same protection.
20. The outage map recomputes on the fault beat.
21. Repair is rejected if any alternate path can energize the fault.
22. Repair consumes a crew slot but no line kit; building consumes both crew and one kit.
23. A completed job leaves the edge intact and open.
24. Underground repair takes longer than overhead repair.
25. Forecast reveal and impact ticks are exact.
26. Same-tick events resolve by stable event ID.
27. Event generation never targets an excluded active crew job.

### Progression and outcome tests

28. Dark districts add their configured strain and served critical districts provide only the specified recovery.
29. Deliberately shed load still adds outage strain.
30. Stability advances only while all required districts and ratio conditions hold.
31. Dropping below target resets consecutive stability to zero.
32. Stage clear freezes simulation and produces deterministic upgrade choices.
33. Upgrade effects apply once and respect stack limits.
34. Civic strain 100 ends the run after the current beat.
35. The same-beat stage-clear/strain tie follows the documented rule.
36. Completing stage 5 produces win, score, rank, and report statistics exactly once.

### Determinism and lifecycle tests

37. Identical seed creates identical initial damage, events, demand modifiers, and upgrade choices.
38. Identical seed plus tick-stamped command sequence yields equal state after every beat.
39. The engine never reads `Date.now()` or `Math.random()` after seed creation.
40. `stop()` is idempotent in a small controller harness or manual lifecycle test.

### Render tests and manual checks

Unit test only focused helpers rather than snapshotting every ANSI frame:

- route glyphs for straight, corner, T, crossing, open, faulted, and selected states;
- ANSI-free visible widths;
- capacity/heat meter clamping;
- minimum-size text at width-only, height-only, and both-too-small conditions.

Manually inspect:

- `80x28`, `96x30`, and one much wider terminal;
- default theme and at least one light theme;
- start, briefing, tutorial, running, Focus, help, pause, upgrade, win, loss, and resize states;
- ASCII fallback mode if one is provided;
- glyph width and alignment on Windows Terminal and the xterm.js host.

## Implementation milestones

### Milestone 0 — paper/engine prototype

1. Encode a 7-node miniature network in a test fixture.
2. Implement radial close validation, BFS assignment, downstream flow, pickup, heat, and trip.
3. Script a command sequence: restore hospital, overheat on residential pickup, shed, cool, restore safely.
4. Tune until the correct decision is visible from state alone.

**Exit criterion:** the miniature scenario creates one understandable failure and at least two viable recovery sequences without any terminal UI.

### Milestone 1 — domain skeleton and authored city

1. Add `types.ts`, `seed.ts`, `content.ts`, and `scenario.ts`.
2. Author the 15×9 city network and its initial stage-1 state.
3. Build the scenario validator and fixture solutions.
4. Implement commands for selection, open/close, shed/restore, and generator state.

**Exit criterion:** tests can legally energize hospital and water from commands, and every illegal loop/source close is rejected with a reason.

### Milestone 2 — restoration simulation

1. Implement pickup demand, flow aggregation, equipment heat/cooling, and protection trips.
2. Implement crew jobs, fault isolation checks, physical repair, tie construction, and generator fuel.
3. Implement storm forecast/reveal/impact and causal structured events.
4. Add civic strain, stability windows, score, and stages 1–3.

**Exit criterion:** a deterministic command script can clear stages 1–3, and all topology/demand/fault tests pass.

### Milestone 3 — terminal vertical slice

1. Implement map route glyphs, energized/dark/faulted styles, cursor, operations panel, meters, and event log.
2. Add `index.ts` input mapping, render/simulation scheduling, Focus, help, minimum-size handling, shared pause, and cleanup.
3. Add start, briefing, upgrade, win, and loss screens.
4. Use structured tick results for the first-light pulse, fault burst, popup, and severe-trip shake.

**Exit criterion:** a new player can understand why a feeder tripped and recover it at `80x28` without reading source code.

### Milestone 4 — full run, tutorial, and balance

1. Add stages 4–5, all event types, validated seed variations, and eight upgrades.
2. Build the scripted tutorial with state-based objectives.
3. Add final scoring, ranks, stats, and same-seed replay.
4. Run at least 20 seeded automated fixture replays and 10 manual runs.
5. Record capacity, trip, strain, and stage-duration telemetry in development-only logs; tune content constants, not core rules.

**Exit criterion:** no audited seed is unwinnable, the tutorial takes under four minutes, and Standard runs average 10–15 minutes.

### Milestone 5 — release integration

1. Register the runner as `workshop` in `src/games/index.ts`.
2. Add README/menu copy only if it is entering the active lineup.
3. Run focused tests, full tests, typecheck, and build.
4. Manually verify pause/restart/quit/next-game, resizing, theme switching, same-seed replay, and terminal restoration after errors.
5. Promote maturity only after external playtest feedback confirms that pickup, flow, and trip causes are readable.

**Exit criterion:** all acceptance criteria below pass with no lifecycle leaks or unexplained state changes.

## Balance process

Do not balance only by playing reactively. Add a small deterministic simulation harness that can execute timestamped command scripts and print per-beat CSV-like diagnostics in development:

```text
tick,stage,strain,serviceRatio,stable,edge,flow,capacity,heat,event
```

For each stage maintain:

- one conservative “safe” fixture solution;
- one fast/high-strain solution;
- one recovery solution that survives a deliberate trip;
- expected completion-beat range;
- expected maximum strain range;
- capacity headroom before and during pickup.

Tune in this order:

1. Can the player read the cause?
2. Is there enough time to act after the warning?
3. Are at least two decisions viable?
4. Does the objective prevent passive waiting?
5. Only then adjust score and rank thresholds.

## Risks and mitigations

| Risk | Symptom | Mitigation |
|---|---|---|
| Power flow feels arbitrary | Player cannot predict which edge overloads. | Enforce radial topology; show parent path, downstream demand, exact MW/rating. |
| Too similar to Packet Panic | Players describe it as slower router placement. | Use authored spans, aggregate component energization, switching/repair/pickup, and no moving entities. |
| Cold pickup feels like punishment | District trips immediately after a seemingly correct reconnect. | Preview post-close pickup demand and projected worst edge before confirmation/close. |
| Real-time repair creates waiting | Player stares at a crew bar with nothing to do. | Overlap forecasts, switching, load planning, and inspection; keep early repairs short. |
| Too many states on one edge | Open/tripped/faulted/repairing is confusing. | One dominant glyph plus a plain-language detail line and contextual valid actions. |
| Critical-load weights dictate one solution | Hospital-first is always mechanically forced. | Vary topology, pickup, backup fuel, and stage requirements; keep critical priority clear but routes flexible. |
| Seed creates impossible incident chain | Required district loses all feasible sources. | Choose only from validated event target sets and audit with fixture scripts. |
| Unicode breaks alignment | Map topology becomes unreadable. | Central glyph table, visible-width helpers, ASCII fallback, Windows/xterm manual check. |
| Controller state leaks | Simulation advances while paused/help/upgrade. | Single `canAdvance()` gate and lifecycle test matrix. |
| Scope expands into real grid simulation | Engine becomes opaque and untestable. | Protect the tree load-sum abstraction and explicit v1 non-goals. |

### Required close preview

To mitigate the most important usability risk, selecting an open edge should calculate a **non-mutating close preview**:

- whether the close is legal;
- which dark districts would energize;
- their immediate pickup MW;
- projected source and edge flows;
- the worst projected utilization;
- a red warning if any equipment would exceed 100%.

The preview is advisory and deterministic. It makes the central decision strategic rather than trial-and-error. Implement it with a cloned lightweight breaker map or a topology override argument; do not mutate and roll back live state.

## Acceptance checklist

### Mechanics

- Closing a line produces immediate, deterministic component energization.
- Every energized edge displays exact flow and capacity on selection.
- Newly restored districts visibly follow the documented pickup curve.
- The player can prevent an overload by sequencing, shedding, reconfiguration, or generation.
- Illegal loop and live-source closures are rejected before mutation.
- Physical faults trip understandable upstream protection and require isolation, repair, and explicit reclose.
- No damaging event arrives without its documented forecast.
- Every stage has at least two validated legal completion approaches.

### UX

- Full mechanical state is readable at `80x28`.
- Colour is never the only indication of power, fault, switch, warning, or selection state.
- The selected edge panel shows condition, breaker, flow/rating, heat, source, downstream districts, and valid action.
- Close preview warns about immediate pickup overload before the player commits.
- Failed actions spend no resource and state one reason.
- Tutorial teaches repair, pickup, shedding, trip/reset, and open-before-close reconfiguration through play.

### Determinism and quality

- Same seed plus same tick-stamped commands reproduces the run.
- Engine contains no Terminal, ANSI, wall-clock, or unseeded randomness.
- Scenario validation and all required tests pass.
- Pause/help/briefing/upgrade/end states cannot advance simulation.
- Stop/restart/quit/next-game restore cursor and terminal buffer every time.
- Default and light themes, minimum size, wider layouts, and glyph fallback have been inspected.
- `npm run typecheck`, `npm test`, and `npm run build` succeed.

## Explicit non-goals for version 1

- No AC/DC load-flow solver, voltage, reactive power, frequency, phase synchronization minigame, or real relay settings.
- No freehand wire drawing or arbitrary node placement.
- No procedural city topology.
- No manual vehicle routing for repair crews.
- No economy, electricity pricing, staffing roster, or long-term city-builder layer.
- No permanent unlock grind, cloud save, online leaderboard, daily challenge, or achievements.
- No multiplayer or competitive sabotage.
- No hidden storm target chosen at impact time.
- No real utility names, real disaster recreation, or claim of training value.

These boundaries protect the core promise: **bring the city back one deliberate section at a time, and understand exactly why the grid holds or trips.**
