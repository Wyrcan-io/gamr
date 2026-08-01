# Tiny Fleet — Full Game & Implementation Plan

## Product decision

**Tiny Fleet is a deterministic, turn-based naval tactics game in which the player gives one sealed order to each of three ships, then watches both fleets resolve their choices simultaneously on a 9×9 sea.** The game is about predicting whether a contact will fire, turn, hide, or run; using incomplete but explicitly represented intelligence; and coordinating three different ships without a long command sequence.

Version 1 should be a polished solo campaign with six authored battles, a replayable skirmish mode, seeded AI, full same-seed replay, and an 80×28 terminal interface. Local two-player hot-seat is a planned second release: the engine and information boundaries must support it from the start, but campaign quality comes first.

The game must never resolve combat with hit percentages. A shot hits when a ship occupies the targeted cell and the line is clear. Apparent uncertainty comes from an opponent's hidden choice, not a hidden die roll.

## Research basis and repository fit

The repository's own [game direction research](./GAME_IDEAS_RESEARCH.md) already identifies Tiny Fleet as a candidate with strong terminal fit: a small board, simultaneous orders, limited information, a solo campaign, and later local hot-seat. That direction also establishes useful Gamr constraints: keep all actionable state on screen, prefer deliberate keyboard play, make loss causes legible, and use procedural variation only after the core game is satisfying.

Existing games provide the implementation conventions to reuse:

- `src/games/the-quiet-heist/` demonstrates a thin terminal controller around a pure tactics engine, authored scenarios, command reduction, and deterministic forecasts.
- `src/games/signal-noise/` demonstrates information-focused presentation and a compact 80×28 layout.
- `src/games/shared/menu.ts`, `src/games/gameTransitions.ts`, and `src/games/utils.ts` provide the shared pause, lifecycle, transition, and theme behavior.
- The project uses strict TypeScript, Vitest, `tsup`, and a controller contract of `{ stop, isRunning }`.

External research is not required to define Version 1. The important work is resolving Tiny Fleet's own rules precisely and testing whether prediction remains understandable after repeated play.

## Player promise and design pillars

> “I knew the raider would break for the fog, so my scout exposed it and my flagship put a shell where it was going.”

1. **Orders are simultaneous and binding.** The enemy never selects an order after reading the player's queued choices. Once the fleet is sealed, both sides resolve the same pipeline.
2. **Uncertainty has a visible shape.** An unseen contact leaves a last-known marker, age, heading, and possible-position cloud. “Unknown” never means the engine silently knows while the player sees nothing useful.
3. **Prediction replaces accuracy rolls.** Weapons target cells and use deterministic damage. A miss means the opponent was elsewhere, smoke blocked the line, or the shot was obstructed.
4. **Three ships, three jobs.** The Scout finds and chases, the Escort controls sight-lines, and the Flagship punishes correct reads. Losing a ship changes the plan without creating a separate tech tree.
5. **Every resolution is explainable.** Movement, fouled maneuvers, reveals, blocked shots, hits, brace reductions, reloads, sinks, and objective progress appear in a short causal report.
6. **The terminal is the bridge.** Coordinates, headings, order stamps, contact tracks, and a compact log should feel like a command table rather than a graphical game compressed into text.
7. **Campaign AI obeys the fog.** AI receives the same kind of observation a human would receive. Difficulty changes evaluation and telegraphing, not access to hidden positions or orders.

## Session shape

| Mode | Target length | Purpose |
|---|---:|---|
| Tutorial battle | 4–6 minutes | Learn headings, sealed orders, movement impulses, and cell-targeted fire. |
| Campaign battle | 8–14 minutes | Solve one authored tactical problem in 8–14 rounds. |
| Six-battle campaign | 55–80 minutes | Introduce fog, smoke, objectives, and stronger doctrines in a controlled sequence. |
| Skirmish | 10–15 minutes | Replay a seeded map against a chosen pirate doctrine. |
| Hot-seat, later | 12–20 minutes | Symmetric local duel with private handoffs and filtered reports. |

There is no real-time timer. A 20 FPS render interval may animate a cursor, wake, or title treatment, but battle state changes only through commands and round resolution.

## Core loop

1. Read the mission card: objective, round limit, sea features, enemy doctrine, and any public special rules.
2. Inspect the 9×9 chart, exact contacts, stale tracks, possible-position clouds, ship hulls, headings, reload state, and objective markers.
3. Select each surviving friendly ship and assign exactly one order. Orders may be replaced or cleared freely before sealing.
4. Preview friendly paths, known friendly collisions, weapon line and target, smoke placement, and how many cells in a contact's current possibility set a shot covers.
5. Press `Enter` to **SEAL FLEET** once every surviving ship has an order. The enemy's orders were already generated from its pre-order observation and cannot react to the seal.
6. Resolve both fleets through facing, movement impulses, detection, utility, simultaneous fire, damage, sinking, objectives, and intelligence updates.
7. Read or step through the concise round report. Hidden events are filtered: the report cannot reveal an enemy maneuver the player had no way to observe.
8. Begin the next planning round with updated tracks, smoke, reloads, hulls, and mission status.

The repeated decision is deliberately small: **maneuver, attack, defend, gather information, or shape information** with each ship.

## The 9×9 sea

Columns are `A–I`; rows are `1–9`. Internally positions remain zero-based `{ x, y }`, but every player-facing message uses chart coordinates such as `D6`.

```text
       A B C D E F G H I
    1  · · · █ █ · · ? ·
    2  · S>· · █ · ░ ? ·
    3  · · · · · · ░ ░ ·
    4  · · ◇ · E^· · · ·
    5  █ █ · · · · · · ·
    6  · · · F>· · ◎ · ·
    7  · ░ ░ · · · · · ·
    8  · ░ · · █ █ · · ·
    9  · · · · · · · · ⇱
```

### Static cells

| Cell | Rule |
|---|---|
| Open sea | Passable and transparent. Most of the chart should remain open so heading choices matter. |
| Island | Impassable; blocks normal sight and direct fire. Islands are public from the briefing onward. |
| Fog bank | Passable. A normal lookout sees only the first fog cell; a ship inside fog can be seen normally only from an adjacent cell. A Scout sweep ignores fog. |
| Objective buoy/zone | Passable unless a scenario declares otherwise. Capture and escort rules use these public cells. |
| Exit marker | A public scenario marker, not a separate terrain type. An eligible ship exits when it ends a round on that marked edge cell. |

Version 1 should not add currents, tides, mines, reefs, fuel, wind, elevation, or destructible islands. Each would add a rule without strengthening the central sealed-order prediction loop.

### Dynamic cells

- **Smoke** is created by the Escort. It blocks normal sight and direct fire beyond its first cell, including for the fleet that created it.
- **Wrecks** remain after a ship sinks. A wreck blocks movement but not sight or fire, ensuring a loss changes local routes without turning the chart opaque.
- **Order previews** and **contact possibility cells** are overlays, never terrain mutations.

### Distance and line rules

Use one shared geometry contract everywhere:

- Range uses Chebyshev distance: `max(abs(dx), abs(dy))`. A range-3 weapon therefore has a clear square-shaped reach that is easy to highlight.
- Line of sight and direct fire use a deterministic integer **supercover line** from origin to target. Every crossed cell is considered, including both cells touched by an exact corner.
- The origin is excluded from obstruction checks; the target is included.
- An island before or on the target blocks the shot.
- Smoke before the target blocks the shot. A shot may deliberately target the first smoke cell and can hit a ship there, but it cannot hit a cell beyond that smoke.
- Normal vision uses the same supercover obstruction rule plus the special fog rule. Renderer and engine must call the same helpers.

The Help overlay should explain this as “range counts the larger of rows or columns; islands and smoke cut the line,” while the implementation and tests preserve the exact definition.

## The player's three ships

Every campaign battle begins with the same fleet identity. Scenario damage does not persist between battles; persistent attrition would make later authored puzzles hard to balance and would punish learning.

| Ship | Glyph | Hull | Ahead speed | Lookout | Gun | Identity |
|---|---|---:|---:|---:|---|---|
| Scout `Swift` | `S` | 2 | 2 cells | 3 | Range 2, 1 damage | Fast contact hunter; can perform a wide signal sweep. |
| Escort `Aegis` | `E` | 3 | 1 cell | 3 | Range 3, 1 damage | Controls sight-lines; can lay smoke in or beside its cell. |
| Flagship `Atlas` | `F` | 4 | 1 cell | 2 | Range 4, 2 damage, then reloads | Slow threat that turns good predictions into decisive damage. |

Hull is public for an exactly observed ship and shown as pips. It has no hidden armor roll. A ship at zero hull sinks after the simultaneous weapon batch.

The Flagship's battery sets `reload = 1` after firing. During its next planning round, `FIRE` is illegal and the reason is displayed. At the end of that non-firing resolution, reload returns to zero. The Flagship may maneuver, brace, or hold while reloading.

There is no mid-battle repair order in Version 1. Repair tends to lengthen a small deterministic battle and weakens the meaning of a successful prediction.

## Orders

Each living ship must receive one order. Sunk ships require none. Queuing an order never advances the battle.

### Universal orders

| Order | Input | Facing | Movement | Resolution effect |
|---|---|---|---|---|
| Ahead | `W` | Unchanged | Move forward up to Ahead speed. | Scout attempts two movement impulses; other ships attempt one. |
| Port | `A` | Rotate 90° left | Move one cell in the new direction. | Facing changes even if movement is fouled. |
| Starboard | `D` | Rotate 90° right | Move one cell in the new direction. | Facing changes even if movement is fouled. |
| About | `S` | Rotate 180° | None | Reorients in place. |
| Fire | `F` | Unchanged | None | Fire at a selected cell during the simultaneous weapon phase. |
| Brace | `G` | Unchanged | None | Reduce this round's aggregate incoming weapon damage by 1, minimum zero. |
| Hold | `.` | Unchanged | None | Do nothing; useful for reloads, ambushes, and tutorials. |

### Signature orders

| Ship | Order | Input | Rule |
|---|---|---|---|
| Scout | Signal sweep | `X` | Stay still. During the utility phase, reveal the exact cell, facing, class, and hull of every enemy within range 5, ignoring fog, smoke, and islands. The sweep exposes the Scout's exact cell to the enemy through the following planning phase. |
| Escort | Lay smoke | `X` | Stay still. Choose the Escort's cell or one orthogonally adjacent non-island cell. Smoke blocks the current weapon phase, the next planning phase, and the next weapon phase, then expires. |
| Flagship | No extra order | — | Its range-4, 2-damage battery is its signature. Keeping the command set asymmetric avoids adding a weak or redundant ability. |

`X` opens the appropriate special targeting state only when the selected ship has a signature order.

### Fire order rules

- The target may be any chart cell within the selected ship's range at planning time, whether currently visible or not.
- The firing ship does not move, so the origin is stable between planning and the weapon phase.
- A shot attacks exactly the selected cell. There is no homing, retargeting, splash, or random scatter.
- If multiple ships occupy the target only because of an engine bug, combat must fail validation; the movement invariant permits at most one non-sunk ship per cell.
- Friendly and protected neutral ships can be hit. The preview warns on known friendly fire, but blind fire remains the player's responsibility.
- Firing creates a gun-flash observation at the shooter's exact cell for the opposing side, even when the line is blocked or the target is empty.
- A hit creates a public impact event for sides able to observe the target. The shooter always receives `HIT CONFIRMED` or `NO CONFIRMED HIT`; it does not receive unrelated hidden details.

### Brace order rules

Brace reduces the sum of all weapon damage assigned to the ship in the batch by exactly 1. It does not reduce collision effects, scenario damage, or damage in a later round. Examples:

- One Scout hit for 1 becomes 0.
- One Flagship hit for 2 becomes 1.
- Two 1-damage hits become 1 total.
- A braced ship that also sinks after the reduction still completes a queued Fire order, because all weapons in the batch are simultaneous.

## Planning and previews

Planning is reversible until the fleet is sealed.

- `1`, `2`, `3`, or `Tab` selects a living ship.
- The map displays that ship's projected path, final facing, selected target or smoke cell, and any known obstruction.
- The fleet panel stamps a queued order beside each ship: `S AHEAD`, `E SMOKE E5`, `F FIRE H3`.
- `Backspace` or `U` clears only the selected ship's order. A second key can clear all after confirmation, but is not required for Version 1.
- `Enter` confirms a target while targeting. Outside targeting, it seals the fleet only if every living ship has a valid order.
- Invalid orders do not silently fall back to Hold. The notice names the reason: `ATLAS BATTERY RELOADING`, `D6 OUT OF RANGE`, or `SMOKE CANNOT OCCUPY ISLAND`.

The preview may use public information only. It can state:

- exact friendly paths and known friendly collision points;
- terrain-obstructed movement or fire;
- `P1 EXACT AT H3` for a currently observed contact;
- `SHOT COVERS 1 / 7 POSSIBLE P1 CELLS` for a stale track;
- `UNKNOWN CONTACT MAY OCCUPY THIS CELL` when a path intersects a possibility cloud.

It must never peek at the enemy's sealed order to label a future hit, collision, or escape.

## Limited information

Limited information is the defining system, so it requires a strict data contract rather than renderer-side hiding.

### Exact contact

A side has an exact contact when an enemy is within normal vision, revealed by a current Scout sweep, exposed by its own sweep, or revealed by a gun flash. An exact contact shows:

- ship ID/class;
- exact chart cell and facing;
- current hull and reload marker;
- campaign-only broad behavior tell, if the contact is normally visible rather than known only from a stale event.

Enemy sealed targets and exact maneuver choices are never shown during planning.

### Contact track

When exact contact is lost, retain a track:

```ts
interface ContactTrack {
  contactId: string;
  classId: ShipClassId | 'unknown';
  lastExact: Point;
  lastFacing: Direction | null;
  lastSeenRound: number;
  source: 'visual' | 'sweep' | 'gunFlash' | 'impact';
  possibleStates: Array<{ pos: Point; facing: Direction }>;
  certainty: 'exact' | 'track' | 'lost';
}
```

At the end of every unseen round, expand `possibleStates` by simulating every legal public maneuver or stationary order for that known class from every prior state. Remove states that cross islands, wrecks, or known forbidden scenario cells. Do not remove a state because of an unobserved collision, smoke interaction, or another hidden ship; doing so would leak secret information.

Deduplicate by position and facing. The map usually renders possible **positions**, while the contact panel reports count and possible headings. When the set reaches every reachable chart cell or is older than three rounds, mark it `LOST`, suppress the full cloud, and retain only the last-known marker and age. This prevents the board becoming solid question marks.

### Observation events

The resolution engine emits full internal events with an explicit audience. `deriveObservation` converts them to side-specific reports.

| Event | Information granted |
|---|---|
| Enemy enters normal view | Exact cell, facing, class, hull. |
| Enemy leaves normal view | Last exact cell/facing becomes a track. |
| Scout sweep | Exact contacts in range; sweeping Scout exposed to opponent. |
| Gun flash | Shooter's exact cell, facing, class, hull, and reload state for the next planning phase; target is not revealed by the flash. |
| Shot at unseen target | Shooter learns confirmed hit/no confirmed hit; no extra map detail on a miss. |
| Visible impact/sink | Exact target cell and resulting observed hull/sink. |
| Hidden maneuver | No event and no animation. The track expands only from public movement capability. |

### Campaign tells

Pirate doctrines add readable behavior without revealing exact orders. If a pirate is in normal visual contact at the start of planning, show one broad tell derived from its already-selected order:

- `FULL SAIL` — Ahead, Port, or Starboard.
- `GUN CREW` — Fire.
- `LOW PROFILE` — Brace, Hold, or a utility order.

The tell never reveals direction or target. Tutorial and early missions always show tells. Later missions may hide tells for elite captains, but this is declared in the briefing. Skirmish exposes a `Signals: Full / Sparse / None` option. Hot-seat uses `None` for both sides unless a later symmetric signal rule is added.

## Simultaneous round resolution

Resolution must be a pure deterministic pipeline. A complete `ResolutionFrame[]` is built first; animation merely plays those frames and cannot change outcomes.

1. **Freeze orders.** Verify one legal order per living combat ship. AI orders must already exist and must have been produced without player pending orders. Generate any public scenario-controlled neutral order, such as the courier's next route step, from authored data.
2. **Expire old exposure markers.** Remove only markers whose declared expiry is before this round; retain effects scheduled through the current resolution.
3. **Apply facing changes.** Port, Starboard, and About update headings for both sides simultaneously.
4. **Movement impulse 1.** Ahead, Port, and Starboard ships propose their first cell; resolve all proposals simultaneously.
5. **Movement impulse 2.** Only an unfouled Scout on Ahead proposes its second cell; resolve simultaneously.
6. **Update visual observations.** Record contacts gained or lost at each impulse for a faithful replay.
7. **Resolve utility orders.** Scout sweeps reveal; Escort smoke is placed; Brace flags become active. Utility effects do not let a player retarget a sealed shot.
8. **Build weapon outcomes from one snapshot.** Check range, supercover obstruction, target occupancy, weapon damage, and friendly fire for every valid Fire order. A shooter alive at the start of this phase contributes its shot even if it will sink in the batch.
9. **Apply weapon damage simultaneously.** Sum assigned damage, apply Brace once per target, update hull, create wrecks for zero-hull ships, and set Flagship reloads.
10. **Resolve scenario objectives.** Update escorts, zone control, escapes, protected units, victory, defeat, and the round limit in the scenario's declared priority.
11. **Advance temporal effects.** Age smoke and tracks; decrement reload only for Flagships that did not fire this round; advance round and deterministic RNG state; precompute next enemy orders from its new observation.
12. **Build side-filtered reports.** Store the full debug transcript separately from each legal player view.

### Movement collision algorithm

For each impulse, create at most one proposal per moving ship.

1. A proposal outside the chart, into an island, or into a wreck fails and stops that ship's remaining movement.
2. If two or more ships propose the same destination, all those proposals fail.
3. A direct two-ship swap fails for both ships.
4. A proposal into an occupied cell succeeds only if that occupant has a successful proposal that vacates it in this impulse.
5. Chains ending in an empty cell succeed together. Closed cycles fail together.
6. Commit all successful proposals simultaneously; failed ships retain the facing already applied in Step 3.

Collision/fouling causes no hull damage in Version 1. Losing movement and remaining exposed for the weapon phase is already a meaningful cost, while collision damage would create hard-to-read accidental kills. The report names every observed failure, such as `SWIFT FOULED WITH RAIDER AT E4`.

Engine tests must prove that movement results do not depend on iteration order or ship ID ordering.

## Combat, sinking, and victory priority

### Default battle result

- **Victory:** all hostile combat ships are sunk, or the scenario's primary objective succeeds.
- **Defeat:** all player combat ships are sunk, a protected critical unit is sunk, an enemy completes its primary objective, or the round limit expires without player success.
- **Mutual terminal result:** if both primary fleets are destroyed in the same weapon batch, the scenario declares the result. Elimination scenarios count it as a draw, not a win.

Scenario result priority is explicit and tested:

1. Apply all simultaneous sinks.
2. Resolve objective arrivals/control using surviving units.
3. Check protected-unit failure.
4. Check player success.
5. Check enemy success or fleet elimination.
6. Check round limit.
7. If incompatible terminal conditions occurred in the same step, use the scenario's declared `simultaneousOutcome`.

### Mission rating

Each battle awards up to three signal flags, with criteria printed in the briefing:

1. Complete the primary objective.
2. Keep at least two player ships afloat.
3. Complete the mission-specific mastery condition, such as `finish by Round 9`, `courier hull untouched`, or `hold both buoys`.

Flags unlock the next campaign battle but do not improve ship stats. The after-action report also records remaining hull, rounds, friendly-fire incidents, shots fired/hit, contacts acquired, and same-seed replay data. Avoid an opaque aggregate score until playtests show it adds value.

## Solo AI

### Fairness contract

The AI receives an `ObservationState`, never `FullBattleState`. It may use:

- its own ships and orders;
- public terrain, objectives, round, and scenario rules;
- exact contacts and tracks it legally observed;
- its own doctrine and deterministic RNG stream.

It may not use hidden player cells, player queued orders, filtered resolution events, or the true identity behind an unknown track. A strong regression test should create two full states that produce the same enemy observation but differ in hidden player positions; AI output must be identical for the same AI RNG state.

Enemy orders are computed at the start of each player planning round and sealed internally. Campaign tells are derived after selection. If orders are generated lazily on player commit, the function signature must still exclude all player pending orders; precomputation is preferable because it makes the fairness boundary obvious.

### Decision model

Do not begin with a search-heavy omniscient bot. Enumerate legal orders per enemy ship, score combinations from the AI's observation, and choose deterministically among top candidates.

Candidate scoring uses readable components:

- expected damage from coverage of an exact contact or track possibility set;
- expected incoming danger inferred from known player firing lanes, never sealed orders;
- progress toward the scenario objective;
- retaining useful gun range and avoiding chart edges;
- maintaining separation so one smoke cell or collision cannot disable the fleet;
- survival preference based on hull and doctrine;
- information value of finding or refreshing a stale track;
- a small deterministic doctrine/tie-break value from the AI RNG stream.

For three ships and roughly 8–12 orders each, evaluate per-ship candidates first, retain the best 4–6, then score the Cartesian fleet combinations. Reject combinations with known self-collisions unless the doctrine deliberately permits the risk. This keeps the AI fast and testable.

### Pirate doctrines

| Doctrine | Visible behavior | Evaluation bias |
|---|---|---|
| Raider | Closes quickly, fires at fresh tracks, retreats when badly damaged. | Objective pressure and speed; weaker formation discipline. |
| Gunline | Holds range, braces under threat, concentrates on one observed ship. | Damage coverage and mutual support. |
| Fogrunner | Breaks contact, uses smoke/fog, attacks stale-track assumptions. | Information denial and flank routes. |
| Black Pennant | Uses mirrored roles and coordinated focus fire. | Balanced two-ply evaluation for the final battle. |

Difficulty should change candidate breadth, weighting quality, and campaign tells:

- **Deckhand:** full tells, top three candidates with occasional declared suboptimal doctrine choice.
- **Corsair:** full or sparse tells, stronger combination scoring.
- **Admiral:** sparse tells, broader combination scoring and one-round opponent track projection.

No difficulty may add weapon damage, hidden hull, extra orders, or privileged vision unless a scenario openly declares an asymmetric boss rule.

## Campaign content

The campaign is the **Lantern Coast Patrol**, a concise story about three harbor-defense ships tracking the Black Pennant fleet through islands and fog. Tone should be adventurous and procedural rather than grim; ships are disabled or sunk as game pieces, and the story avoids crew casualty detail.

| # | Battle | New lesson | Setup and objective | Mastery flag |
|---:|---|---|---|---|
| 0 | Signal Drill | Headings, one order per ship, two movement impulses, deterministic fire. | Three player ships against three stationary/telegraphed practice hulks. Hit marked targets in four rounds; no hostile fire. | Hit all targets without a friendly collision. |
| 1 | Grey Shoal Raiders | Enemy sealed orders, broad tells, brace, gun flashes. | Open chart with two islands; defeat two pirate raiders by Round 10. | Keep all three ships afloat. |
| 2 | Whitewater Fog | Tracks, possibility clouds, Scout sweep, Flagship reload. | Three pirates use two fog banks; recover and hold the chart buoy for two consecutive round ends by Round 11. | Confirm every hostile contact at least once. |
| 3 | Smoke on the Mail Run | Escort smoke, protected unit, line blocking. | A neutral courier follows a public four-cell route. Keep it afloat until it exits while three raiders attack. | Courier takes no damage. |
| 4 | Bells at Narrows | Split attention and control objectives. | Hold either two of three signal buoys at the end of three rounds before Round 12; Fogrunner enemies can contest. | Hold all three at one round end. |
| 5 | The Black Pennant | Full mirrored fleet, sparse tells, mutual-sink rules. | Sink the enemy Flagship before it ends a round on its marked escape cell, while preserving Atlas; Round 14 is the final chance. | Win with at least two ships and no friendly fire. |

Every battle is authored and has a fixed public terrain template. A seed may select one of 2–4 prevalidated enemy deployments, cosmetic captain names, and deterministic AI tie breaks. Do not generate arbitrary maps or starting fleets for the campaign.

### Skirmish mode

Skirmish is unlocked after Battle 2 and reuses validated content:

- choose one of 6–10 authored maps;
- choose Raider, Gunline, Fogrunner, or mixed doctrine;
- choose tells `Full`, `Sparse`, or `None`;
- use elimination or one supported control objective;
- display and accept a numeric seed;
- offer same-seed replay after the report.

Version 1 does not need a fleet builder. The fixed trio is the game's identity and keeps observations, AI, and balance bounded.

## Local hot-seat, planned second release

Hot-seat should use the same engine with sides renamed `blue` and `red`, mirrored or scenario-declared deployments, no campaign tells, and equal fleet data.

### Private handoff flow

```text
ROUND START
  → BLUE HANDOFF SCREEN
  → Blue observation and planning
  → Blue seals orders
  → CLEAR ALTERNATE BUFFER / RED HANDOFF SCREEN
  → Red observation and planning
  → Red seals orders
  → shared “both fleets sealed” gate
  → resolve
  → BLUE PRIVATE REPORT
  → handoff
  → RED PRIVATE REPORT
  → next round
```

Requirements:

- A handoff screen requires a fresh neutral key press and never accepts the key that sealed the previous side.
- The terminal is cleared before the next player's observation is rendered.
- Sealed orders are stored by side but omitted from the other side's view, report, debug copy shortcuts, and pause overlay.
- A shared spectacle replay is unsafe under fog because it can reveal hidden paths. Each side receives its own filtered resolution, with an optional public summary containing only mutually public events.
- Pause/restart confirmation must not reveal the other player's current planning screen.
- Hot-seat tests should search rendered output for hidden ship IDs, cells, orders, and events after every phase.

Design `SideId`, `ObservationState`, `OrdersBySide`, and event audiences now so hot-seat does not require replacing the solo engine later.

## Interface and controls

### Semantic visual language

Use single-cell glyphs and always pair unusual symbols with text in a panel or Help. Provide ASCII fallbacks as constants beside the renderer.

| Concept | Glyph | ASCII fallback | Text label |
|---|---|---|---|
| Open sea | `·` | `.` | OPEN |
| Island | `█` | `#` | ISLAND |
| Fog | `░` | `~` | FOG |
| Smoke | `≋` | `s` | SMOKE 1/2 |
| Scout / Escort / Flagship | `S` / `E` / `F` | same | SWIFT / AEGIS / ATLAS |
| Exact hostile | `P` plus ID | `P` | EXACT CONTACT |
| Last-known contact | `?` | `?` | TRACK T-1 |
| Possible contact cell | `◦` | `:` | POSSIBLE |
| Heading | `↑→↓←` | `^>v<` | HEADING |
| Queued path | `›` | `+` | ORDER PATH |
| Fire target | `◎` | `X` | FIRE |
| Objective | `◇` | `O` | OBJECTIVE |
| Wreck | `×` | `x` | WRECK |
| Hull full / empty | `◆` / `◇` | `*` / `-` | HULL |
| Sealed order | `✓` | `+` | SEALED |

Color reinforces ownership and danger but is never the only signal. Friendly ships use the theme color plus class letters; exact enemies use red/magenta plus `P#`; tracks use amber plus `?`; selected cells use inverse/bright style. Check all glyph widths at 80×28 and replace any ambiguous-width symbol with its fallback.

### Full layout at 96×30

```text
                         T I N Y   F L E E T                 BATTLE 2 / 6
 ROUND 06 / 11   FLAGS ◆◆◇   BUOY D4: BLUE 1/2   SEED 482913   SIGNALS FULL
┌─ LANTERN COAST CHART ─────────────┐ ┌─ FLEET ORDERS ───────────────────────┐
│      A  B  C  D  E  F  G  H  I   │ │ [1] S SWIFT  ◆◆   C3 →   SWEEP      │
│  1   ·  ·  ·  █  █  ·  ·  ◦  ·   │ │ [2] E AEGIS  ◆◆◆  D4 ↑   SMOKE E4  │
│  2   ·  ·  ·  ·  █  ·  ░  ?  ·   │ │ [3] F ATLAS  ◆◆◇◇ E6 →   FIRE H3   │
│  3   ·  · S→  ·  ·  ·  ░  ◦  ·   │ └──────────────────────────────────────┘
│  4   ·  ·  · E↑  ◇  ·  ·  ·  ·   │ ┌─ CONTACTS ──────────────────────────┐
│  5   █  █  ·  ·  ·  ·  ·  ·  ·   │ │ P1 TRACK T-1  LAST H2 →  7 CELLS  │
│  6   ·  ·  ·  · F→  ·  ◎  ·  ·   │ │ P2 EXACT H3 ↓  HULL ◆◇  GUN CREW │
│  7   ·  ░  ░  ·  ·  ·  ·  ·  ·   │ │ Shot H3 covers exact P2; line clear│
│  8   ·  ░  ·  ·  █  █  ·  ·  ·   │ └──────────────────────────────────────┘
│  9   ·  ·  ·  ·  ·  ·  ·  ·  ⇱   │ ┌─ ROUND LOG ─────────────────────────┐
└────────────────────────────────────┘ │ R05 P1 gun flash at H2              │
 SELECT F AT E6  BATTERY READY          │ R05 Swift lost contact with P1      │
 PATH —   TARGET H3   RANGE 3/4 CLEAR   │ OBJ Hold buoy once more             │
 [1–3/Tab] ship  [WASD] helm  [F] fire │ Enter: SEAL FLEET   ? Help  Esc     │
                                        └──────────────────────────────────────┘
```

At 80×28, keep the complete 9×9 chart, fleet orders, selected-order preview, current objective, and two most relevant contacts on the main screen. `Tab`/`I` cycles the lower-right panel between `CONTACTS`, `ROUND LOG`, and `MISSION`. Do not shrink chart cells below two columns if it makes headings or selection ambiguous.

Below 80×28, freeze planning input except pause/quit and show the repository-standard resize screen with required and current dimensions.

### Input map

| Key | Action |
|---|---|
| `1`, `2`, `3` / `Tab` | Select Scout, Escort, Flagship / next living ship. |
| Arrow keys | Move targeting/inspection cursor. |
| `W` | Queue Ahead. |
| `A` | Queue Port turn and move. |
| `D` | Queue Starboard turn and move. |
| `S` | Queue About turn. |
| `F` | Enter Fire targeting for the selected ship. |
| `G` | Queue Brace. |
| `X` | Queue selected ship's signature order, if any. |
| `.` | Queue Hold. |
| `Enter` / Space | Confirm target; otherwise seal all completed orders. |
| `Backspace` / `U` | Clear selected unsealed order / leave targeting. |
| `I` | Cycle Contacts, Round Log, and Mission panels. |
| `?` | Help: rules, order glossary, line/range explanation, glyph legend. |
| `Esc` | Shared Gamr pause menu. |
| `Q` | Quit on title/report; active battle opens pause/confirmation rather than immediately discarding it. |

### Screen states

```text
title → modeSelect → campaignMap/skirmishSetup → briefing → planning
      → sealing → resolution → roundReport → planning
      → battleReport → campaignMap/ending
```

Resolution may be skipped or accelerated without changing state. `Space` advances one meaningful frame; holding/pressing `Enter` shows the final legal report. Never require the player to watch a long animation before regaining control.

## TypeScript architecture

Create a multi-file complex game rather than a 1,500-line `index.ts`:

```text
src/games/tiny-fleet/
├── index.ts             terminal lifecycle, key mapping, shared pause/transitions
├── types.ts             serializable battle, observation, order, event, content types
├── content.ts           ships, doctrines, scenario definitions, campaign copy
├── seed.ts              seed normalization and named deterministic RNG streams
├── grid.ts              coordinates, headings, supercover line, range, neighbours
├── movement.ts          path construction and simultaneous impulse/collision resolver
├── visibility.ts        normal vision, smoke/fog, observations, contact-track expansion
├── combat.ts            fire validation, obstruction, damage batches, brace/reload/sinks
├── objectives.ts        elimination, escort, control, escape, result priority
├── ai.ts                observation-only candidate generation and doctrine evaluation
├── engine.ts            command reducer, order sealing, resolution pipeline, replay
├── render.ts            ANSI chart/panels/overlays, compact/full layouts, glyph constants
├── content.test.ts      scenario and doctrine validation, scripted solution transcripts
├── grid.test.ts         line/range and obstruction geometry
├── movement.test.ts     impulse, chain, contest, swap, cycle, order-independence tests
├── visibility.test.ts   fog/smoke, event audiences, track growth, secret-leak tests
├── combat.test.ts       targeting, batching, brace, reload, mutual-sink tests
├── ai.test.ts           deterministic output and observation-only fairness tests
└── engine.test.ts       full rounds, missions, replay, campaign progression
```

`index.ts` owns terminal resources only. It maps key events to commands, selects pause actions, runs cosmetic rendering, and cleans up. No pathing, sight, AI, or damage rule belongs in it.

### Core types

```ts
type SideId = 'player' | 'enemy';
type FactionId = SideId | 'neutral';
type ShipClassId = 'scout' | 'escort' | 'flagship';
type Direction = 'N' | 'E' | 'S' | 'W';
type BattlePhase =
  | 'briefing' | 'planning' | 'sealing' | 'resolution'
  | 'roundReport' | 'battleReport';

interface ShipState {
  id: string;
  side: FactionId;
  classId: ShipClassId;
  pos: Point;
  facing: Direction;
  hull: number;
  reload: 0 | 1;
  afloat: boolean;
}

type ShipOrder =
  | { type: 'ahead' | 'port' | 'starboard' | 'about' | 'brace' | 'hold' }
  | { type: 'fire'; target: Point }
  | { type: 'sweep' }
  | { type: 'smoke'; target: Point };

interface FullBattleState {
  version: 1;
  seed: number;
  scenarioId: string;
  phase: BattlePhase;
  round: number;
  terrain: TerrainCell[][];
  ships: Record<string, ShipState>;
  wrecks: Point[];
  smoke: SmokeState[];
  objectives: ObjectiveState;
  intelligence: Record<SideId, IntelligenceState>;
  orders: Partial<Record<SideId, Record<string, ShipOrder>>>;
  aiRng: RngState;
  contentRng: RngState;
  resolution: ResolutionState | null;
  outcome: BattleOutcome | null;
  campaign: CampaignState;
}

interface ObservationState {
  viewer: SideId;
  scenario: PublicScenarioView;
  round: number;
  ownShips: ShipState[];
  contacts: ContactTrack[];
  publicTerrain: TerrainCell[][];
  visibleSmoke: SmokeState[];
  objectives: ObjectiveState;
  legalEvents: ObservedEvent[];
}
```

The renderer accepts `ObservationState` plus a separate `UiState`; it must not accept `FullBattleState`. The AI accepts the same observation type with UI-only fields removed. This API boundary is more reliable than asking each caller to remember which properties are secret.

### Commands and pure APIs

```ts
type BattleCommand =
  | { type: 'queueOrder'; shipId: string; order: ShipOrder }
  | { type: 'clearOrder'; shipId: string }
  | { type: 'sealOrders' }
  | { type: 'advanceResolution' }
  | { type: 'dismissRoundReport' }
  | { type: 'restartBattle'; sameSeed: boolean }
  | { type: 'nextBattle' };

function createBattle(scenarioId: string, seed: number): FullBattleState;
function deriveObservation(state: FullBattleState, viewer: SideId): ObservationState;
function validateOrder(state: FullBattleState, side: SideId, shipId: string, order: ShipOrder): ValidationResult;
function previewOrder(view: ObservationState, shipId: string, order: ShipOrder): OrderPreview;
function applyCommand(state: FullBattleState, command: BattleCommand): FullBattleState;
function resolveRound(state: FullBattleState): RoundResolution;
```

`previewOrder` may consume only an observation and therefore cannot accidentally expose sealed AI choices. `resolveRound` produces a final state, full events for debug/replay, side-filtered event streams, and animation frames in one deterministic result.

### Engine invariants

- The chart is always 9×9; every terrain row has nine cells.
- Every afloat ship has an in-bounds, passable, unique position.
- Every sunk ship has zero hull and exactly one corresponding wreck unless a scenario explicitly removes it after resolution.
- One side has at most one sealed order per afloat ship and no order for a sunk ship.
- A side cannot seal until all its living ships have valid orders.
- Fire target and smoke target validation use the same range/terrain helpers as preview rendering.
- No full-state-only enemy property is present in `ObservationState` or its serialized events.
- AI output is a pure function of observation, doctrine, and AI RNG state.
- Facing and movement results are independent of record iteration order.
- No two afloat ships finish an impulse on the same cell.
- Weapon damage is computed from one pre-damage snapshot and applied in a batch.
- A firing Flagship reloads for exactly the following planning round.
- Gameplay never calls `Math.random()` or reads wall-clock time after seed creation.
- Same scenario, seed, and command transcript produce byte-equivalent serializable gameplay state and reports.

## Determinism, replay, and debugging

Use a serializable 32-bit seeded PRNG with named streams:

```ts
interface BattleRng {
  content: RngState; // vetted deployment/cosmetic selection
  ai: RngState;      // AI tie breaks only
  flavour: RngState; // non-mechanical report wording
}
```

Animation, title flicker, and cursor pulse must use a cosmetic counter or separate non-gameplay source and must never advance an engine stream.

A replay record contains:

- engine version;
- scenario ID and content version;
- seed;
- player command transcript;
- optional expected outcome/hash for regression tests.

Store the full debug transcript only in memory/test output. The normal after-action screen must not reveal secret enemy paths that remained unobserved, especially because the same battle may later support hot-seat.

During development, provide a guarded debug helper that can print a full-state round trace outside the renderer. It must not be reachable through normal gameplay input in a published build.

## Content validation

Every scenario should pass structural and playability checks:

1. Chart dimensions are 9×9 and contain only known cells.
2. All deployments, objectives, routes, exits, and smoke restrictions are in bounds and compatible with terrain.
3. Ships begin on unique passable cells with valid headings and class IDs.
4. Public briefings name the round limit, primary objective, result priority exceptions, signals level, and mastery flag.
5. An escort route is contiguous and does not cross islands/wrecks at start.
6. Control objectives have reachable contest cells for both sides under static terrain.
7. Every enemy doctrine has at least one legal order for every initial ship.
8. Each campaign battle has a fixed-seed scripted player transcript that earns at least one flag against its deterministic AI seed.
9. Alternative transcripts exercise intended smoke, sweep, brace, and mutual-fire branches.
10. The longest objective, contact line, and validation reason fit the compact panel or wrap within its declared limit.

Do not attempt an exhaustive imperfect-information solver before the core feels good. Scripted winning transcripts, AI-vs-AI soak runs, and targeted state-space checks are sufficient for Version 1.

## Test plan

### Grid and targeting

- Chart coordinates convert correctly between `A1–I9` and zero-based points.
- Chebyshev range handles orthogonal, diagonal, zero-distance, and boundary cases.
- Supercover lines are symmetric and include all corner-touching cells in a stable order.
- Islands, smoke before target, smoke at target, and open lines match the documented fire behavior.
- Normal visibility and weapon obstruction share geometry without sharing the fog exception incorrectly.
- Every rendered legal target is accepted by `validateOrder`; every invalid target shows a reason.

### Movement

- Ahead, Port, Starboard, and About produce correct headings and paths for every starting direction.
- Scout Ahead receives two impulses; turns receive one; blocked impulse 1 prevents impulse 2.
- Same-destination contests, swaps, occupied stationary cells, chains to empty cells, and closed cycles match the algorithm.
- Facing changes survive a failed turn maneuver.
- Reordering ship records produces the same movement output and event set.
- Property test: after any valid impulse, afloat positions are unique and passable.

### Visibility and secrecy

- Fog, islands, smoke, adjacency into fog, sweep, gun flash, and sweep exposure grant exactly their declared observations.
- Losing contact captures the last observed cell/facing, not the enemy's later hidden position.
- Track expansion includes every publicly possible stationary/maneuver result and never prunes based on secret collisions.
- Track deduplication, age, and `LOST` transition are deterministic.
- Two full states with equal player observations serialize to equal renderer input even when enemy hidden positions/orders differ.
- Side-filtered reports contain no hidden ship ID, coordinate, heading, hull, order, or event text.
- Renderer snapshot/search tests use sentinel secret values and confirm they never appear.

### Combat

- Exact-cell fire hits only current target occupancy after movement.
- Blocked and out-of-range shots cannot deal damage.
- Friendly and neutral occupancy receive damage normally.
- Multiple hits batch; Brace reduces the aggregate once; hull never drops below zero.
- A ship sunk in the batch still fires its sealed shot.
- Mutual sinks, Flagship 2-damage shots, reload timing, and firing reveals resolve correctly.
- Wreck creation happens once and affects the next round's movement.

### AI

- Same observation, doctrine, and AI RNG state produce identical orders.
- Changing a hidden player position while preserving AI observation does not change AI orders.
- Player pending orders are absent from the AI function signature and cannot influence output.
- Each doctrine exhibits its declared bias over curated tactical fixtures.
- AI rejects known self-collisions when a safe comparable candidate exists.
- AI always produces one valid order per living ship within a small time budget.

### Engine, objectives, and campaign

- Sealing is rejected until every living player ship has an order.
- Enemy orders exist before player sealing and remain unchanged as player orders are edited.
- Resolution phase order matches movement → observation → utility → weapon batch → objectives → temporal effects.
- Elimination, escort exit, control duration, protected-unit failure, round limit, and simultaneous outcomes follow scenario priority.
- Same replay transcript yields the same state hash, event audiences, outcome, and flag report.
- Same-seed restart restores scenario deployment and AI stream; new-seed restart changes only allowed variants.
- Campaign advancement, flags, battle unlocks, and ending occur once.

### Rendering and lifecycle QA

- Inspect title, briefing, incomplete orders, targeting, invalid order, exact/stale/lost contact, smoke, reload, resolution, pause, victory, defeat, and draw screens.
- Test at 80×28 and 96×30 in default and light themes.
- Confirm all critical states remain readable in monochrome and with ASCII fallbacks.
- Confirm animation skipping produces the same state and no missed report.
- Restart, quit, list games, next game, and controller `stop()` dispose the key listener and intervals, reset ANSI style, restore the cursor, and leave alternate buffer exactly once.
- Play at least 20 full battles and record round length, order revisions, hit rate, time without contact, collision frequency, unused signature orders, and each confusion report.

## Balance targets and instrumentation

Initial targets are hypotheses to validate, not constants to protect:

| Metric | Target |
|---|---:|
| Standard campaign battle | 8–12 resolved rounds |
| Planning time after tutorial | 25–60 seconds per round |
| Player weapon hit rate | 30–50% |
| Rounds with at least one exact hostile contact | 55–80% |
| Scout sweep uses in fog missions | 1–3 per battle |
| Escort smoke uses after introduction | 1–3 per battle |
| Friendly movement collisions | Fewer than 1 per two battles after tutorial |
| First-attempt campaign success | 55–75% early, 30–55% late |

Add a test-only soak harness that runs deterministic AI-vs-AI battles across seeds and reports wins, draws, average rounds, shots, hits, sinks by class, brace damage prevented, sweep reveals, smoke blocks, and objective completions. Soak results catch dominant weapons or endless avoidance, but human playtests decide whether prediction is interesting.

Balance guardrails:

- Do not tune with random accuracy.
- Do not make a class mandatory by placing every objective inside its unique ability's reach.
- The Scout must survive enough mistakes to teach information play, but its speed cannot make control objectives uncontestable.
- Smoke should create one useful prediction window, not permanent hiding chains.
- The Flagship must feel dangerous without deciding every battle in the first observed shot.
- Round limits should prevent indefinite hiding while leaving at least two plausible approaches to the primary objective.

## Gamr integration

- Export `runTinyFleetGame(terminal)` returning a controller with `stop()` and `isRunning`.
- Register the game in `src/games/index.ts` with:

  ```ts
  {
    id: 'tiny-fleet',
    name: 'Tiny Fleet',
    description: 'Seal three orders. Read the fog. Outguess the pirates.',
    maturity: 'workshop',
    pace: 'turn-based',
    difficulty: 3,
    session: 'campaign',
    run: runTinyFleetGame,
  }
  ```

- Use `getCurrentThemeColor()` and theme helpers rather than fixed foreground colors for neutral chrome.
- Use `PAUSE_MENU_ITEMS`, `renderSimpleMenu`, and `navigateMenu` for pause behavior.
- Use `dispatchGameQuit`, `dispatchGamesMenu`, and `dispatchGameSwitch` for transitions.
- Enter the alternate buffer and hide the cursor after startup; dispose listeners/intervals and restore the buffer/cursor exactly once on stop.
- Render at about 20 FPS for visual polish, but call the game reducer only from accepted input commands.
- Use shared effects sparingly: a brief gun-flash accent, one-cell wake, hit flash, gentle sink shake, and flag-award popup. Never animate hidden movement or obscure a contact cloud/order preview.
- Run `npm run typecheck`, `npm test`, and `npm run build` before the registry entry is considered ready.

## Implementation milestones

### 0 — Paper proof and rules fixtures

Finalize this rules contract, then play a paper battle on one open 9×9 chart with three ships per side. Hand-resolve at least six rounds including a Scout two-step, contested cell, swap, smoke-blocked shot, sweep reveal, brace, Flagship reload, and mutual sink.

Create compact TypeScript fixture data for Battle 0 and Battle 1 before writing the renderer.

**Done when:** two reviewers independently produce the same final state from the same sealed order transcript.

### 1 — Pure movement and combat kernel

Implement `types`, `seed`, `grid`, `movement`, and `combat`. Include order validation, facing, both impulses, collision dependencies, line obstruction, weapon batching, Brace, reload, and wrecks.

**Done when:** unit/property tests prove order-independent movement and simultaneous combat, and a command-line test transcript resolves without ANSI rendering.

### 2 — Observation and sealed-order engine

Implement `visibility`, contact tracks, event audiences, `ObservationState`, preview restrictions, engine phases, replay records, and precomputed enemy orders using a trivial legal AI.

**Done when:** secret-sentinel tests prove no hidden enemy state reaches renderer/AI views, and equal seed/transcript replays are byte-equivalent.

### 3 — Terminal vertical slice

Implement `index` and `render` for Signal Drill and Grey Shoal Raiders: title, briefing, chart, ship selection, all universal orders, targeting, fleet seal, skippable resolution, round report, battle report, Help, compact panel tabs, resize behavior, and shared pause menu.

**Done when:** a new player can clear Signal Drill at 80×28 without external instructions and can explain why each shot hit or missed.

### 4 — Information warfare and real AI

Add fog, possibility clouds, Scout sweep, Escort smoke, gun-flash observations, campaign tells, all four doctrine evaluators, AI fairness tests, and Whitewater Fog.

**Done when:** the AI never consumes hidden state, a stale track remains useful without being exact, and playtesters deliberately use sweep/smoke rather than treating them as tutorial chores.

### 5 — Full campaign and skirmish

Add the remaining three battles, escort/control/escape objectives, campaign map and flag progression, validated deployment variants, skirmish setup, same-seed replay, authored solution transcripts, and campaign ending.

**Done when:** all six battles are solvable at their fixed regression seeds, every objective result is causal and readable, and skirmish can replay a numeric seed exactly.

### 6 — Balance, visual language, and release

Run human playtests and AI soak tests; tune hull, ranges, round limits, doctrine weights, fog shapes, and scenario deployments. Complete the semantic glyph pass, title treatment, light-theme and ASCII audit, after-action statistics, and lifecycle cleanup.

Register the game only after typecheck, complete tests, and build pass.

**Done when:** repeated battles produce meaningful maneuver/fire/defend/information choices, no class dominates, no secret leaks, and the minimum layout remains readable.

### 7 — Hot-seat follow-up

Implement private handoff gates, two human planning phases, per-side filtered reports, symmetric setup, pause privacy, and adversarial secret-output tests. Do this after the solo campaign is stable; do not delay Version 1 for it.

**Done when:** two players can complete a full battle on one terminal without seeing the other side's chart, contacts, or sealed orders before resolution.

## Risks and decisions to protect

| Risk | Mitigation |
|---|---|
| Exact-cell fire feels like guessing. | Show contact option clouds, broad campaign tells, gun flashes, and deterministic coverage facts; keep early maps open and signals full. |
| Limited information becomes visual noise. | Collapse tracks after three unseen rounds, emphasize the selected contact, and tab secondary details in compact layout. |
| AI cheats accidentally. | Make `ObservationState` the only AI input and add equal-observation/hidden-state regression tests. |
| Simultaneous movement has edge-case bugs. | Specify impulses and collision dependencies exactly; property-test invariants and permutation independence. |
| Three orders per round feels laborious. | Keep one order per ship, direct hotkeys, persistent ship selection, one target cursor, and no inventories or action-point submenus. |
| Flagship damage creates snowballing. | Require exact prediction, enforce reload, keep Brace useful, and use authored starting distances. |
| Smoke causes stalemates. | Limit duration, tie it to the Escort giving up its action, and use round-limited objectives. |
| Campaign scenarios are brittle across AI tuning. | Store fixed solution transcripts, deployment variants, doctrine versions, and objective-specific regression seeds. |
| Hot-seat leaks hidden information. | Separate full state from observation/report types now; design handoff and event audiences before adding the mode. |
| Terminal glyphs misalign. | Prefer one-cell symbols, maintain fallbacks, strip ANSI when measuring, and inspect 80×28/light theme manually. |

## Explicit Version-1 non-goals

- Online multiplayer, networking, matchmaking, asynchronous turns, or spectators.
- Hot-seat in the initial solo release; only its architectural boundaries are required.
- Procedurally generated arbitrary campaign maps or a map editor.
- Fleet building, ship purchases, persistent stat upgrades, crew skills, loot, or crafting.
- Wind, fuel, ammunition counts, mines, tides, submarines, aircraft, boarding, or realistic naval simulation.
- Random accuracy, critical hits, hidden damage rolls, or randomized turn order.
- Mouse-only interactions, real-time deadlines, sound-required cues, or animations that reveal secret movement.
- A giant roguelike campaign before the six authored battles prove the core loop.

## Definition of done

Tiny Fleet Version 1 is ready when a new player can command Scout, Escort, and Flagship through a complete 9×9 battle using only the visible controls; seal three orders and understand the full simultaneous result; lose contact with an enemy yet make an informed prediction from its track; deliberately trade an attack for sweep, smoke, or Brace; and read exactly why every shot hit, missed, was blocked, or had its damage reduced.

The six-battle campaign and seeded skirmish must be deterministic, every AI order must derive only from legal observation, every side-filtered report must be free of secret state, movement and combat invariants must be covered by tests, the renderer must remain readable at 80×28 in light and dark themes with ASCII fallbacks, and `npm run typecheck`, `npm test`, and `npm run build` must pass before the game is added to the active registry.
