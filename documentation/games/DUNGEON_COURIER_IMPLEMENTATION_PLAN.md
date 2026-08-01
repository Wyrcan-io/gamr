# Dungeon Courier — full game and implementation plan

## Product decision

**Dungeon Courier is a turn-based traversal roguelike about delivering one rule-changing parcel at a time through a fully visible, periodically reconfiguring dungeon.** The courier does not attack monsters. The verbs are route, step, hurry, brace, use a tool, and decide what equipment or treasure is worth continuing to carry.

The defining mechanic is the **handling contract**. Every parcel changes how movement should be evaluated:

- a sloshing moonwater flask rewards long straight lines and punishes repeated turns;
- a sleeping bell makes loud floors, gates, and hurried movement dangerous;
- a sunless film case takes exposure on illuminated tiles;
- a folded stone familiar is too heavy to hurry and causes weak floors to collapse behind it;
- a mirror parcel cannot safely retrace recently visited tiles.

The map is not hidden. Safe routes, unstable shortcuts, patrol paths, useful caches, and the next dungeon shift are shown honestly. Difficulty comes from comparing those facts with the current parcel's rules, not from stepping on unknowable traps.

Version 1 should contain:

- a short playable tutorial;
- one 10–15 minute Standard Run of three deliveries;
- eight authored parcels and six compatible handling seals;
- six dungeon templates with deterministic seeded variants;
- five dungeon-shift mechanisms and four non-combat threat types;
- twelve courier tools, ten between-delivery upgrades, scoring/ranks, and same-seed replay;
- a pure deterministic rules engine with generator validation and Vitest coverage.

It should initially enter the Gamr registry as a turn-based `workshop` game with difficulty 2 and a `10–15 min` session. Longer campaigns, permanent unlock trees, daily challenges, and unrestricted procedural parcel combinations are later ideas.

## One-sentence pitch

**Read the label, read the dungeon, and find a route that gets both you and the impossible package there intact.**

## Why the idea works

Most traversal games treat the carried objective as a key that follows the player. Dungeon Courier makes the objective rewrite the player's movement logic. A path that was ideal on the previous delivery can be disastrous on the next one even when the floor layout is identical.

The concept produces three useful layers of decision-making without needing combat:

1. **Route decision:** choose the long stable route, the fast hazardous shortcut, or a detour with tools and repair opportunities.
2. **Handling decision:** decide when to hurry, brace, wait for a dungeon shift, or spend a limited tool.
3. **Load decision:** carry treasure and contingency gear, sacrifice something to open a shortcut, or drop weight now and possibly recover it later.

The key emotional rhythm is not “fight, loot, level.” It is:

> “I know the short way. Can this particular package survive it?”

## Repository research and resulting constraints

The current Gamr codebase already establishes the implementation shape this game should follow:

- `src/games/last-train-home` demonstrates a visible route network, forecast hazards, action points, deterministic turn resolution, and a pure engine separated from terminal rendering.
- `src/games/the-quiet-heist` demonstrates non-combat spatial pressure, predictable patrol information, undo/checkpoint concepts, and planning-before-commit interaction.
- `src/games/tiny-fleet` demonstrates a larger multi-file deterministic game with authored scenarios, seeded variation, AI/content separation, and model-first tests.
- `src/games/dead-letter-department` and `src/games/time-capsule` demonstrate content registries, explicit domain types, pure command APIs, and tests that reproduce runs from a seed.
- `src/games/shared/menu.ts`, `src/games/gameTransitions.ts`, and `src/games/utils.ts` establish the shared pause menu, navigation transitions, alternate-buffer lifecycle, and theme-aware rendering requirements.

The design therefore assumes:

- TypeScript with no new runtime dependency;
- xterm.js keyboard input and ANSI output;
- an `80x28` supported minimum terminal;
- one-character map glyphs with ASCII fallbacks;
- a pure engine that knows nothing about xterm, ANSI, timeouts, or wall-clock time;
- deterministic seed streams and replayable command transcripts;
- rendering around 20 FPS for small visual accents, while simulation advances only on commands;
- the shared pause menu and clean controller shutdown contract.

External research is not required to define Version 1. This is a fictional handling puzzle, not a simulation of commercial logistics or a real safety standard. Parcel labels should be internally consistent and immediately understandable rather than borrowing real hazardous-material markings that could imply training value.

## Design pillars

1. **The parcel is the ruleset.** A parcel must change action legality, action cost, handling stress, terrain interaction, or timing. Merely giving it more hit points is not sufficient.
2. **Plan with honest information.** The full traversable map, known threats, route hazards, contract clauses, and next shift are visible. Unknown content may be flavour or optional loot, never mandatory survival information.
3. **Every move has a readable consequence.** Before committing, the selected destination shows time, stress, noise/exposure, and any immediate break risk.
4. **Short is not automatically best.** Stable routes cost time; shortcuts cost tools, parcel condition, or future access; detours can repair and resupply.
5. **Leaving things behind is a real verb.** Inventory affects movement, dropped items remain on the map, and some shortcuts demand a permanent sacrifice.
6. **Failure teaches a specific correction.** The game names the handling clause, tile, threat, or forecast that caused damage.
7. **Combat never steals the focus.** Threats are routed around, timed, distracted, blocked, or endured. There is no attack button or damage economy for enemies.
8. **The whole decision space fits on one screen.** The current floor, parcel condition, handling clauses, upcoming shift, inventory, and action preview remain visible at `80x28`.

## Player fantasy and tone

The player is a licensed courier for **The Underway Post**, a tiny service that promises delivery to places maps would rather forget. Clients wait at sealed dungeon exits, abandoned shrines, subterranean kitchens, and impossible rooms. The postal work is treated with sincere importance even when the parcel is strange.

Tone should be dry, warm, and lightly uncanny:

- `HANDLE UPRIGHT. CONTENTS REMEMBER THE SEA.`
- `RECIPIENT: THE KEEPER BELOW BELL NINE.`
- `CLAIM DENIED: “THE FLOOR MOVED” IS A KNOWN ROUTE CONDITION.`
- `DELIVERED — ONE HAIRLINE CRACK, RECIPIENT SATISFIED.`

The courier is competent rather than helpless. Damage text should explain the physical mistake without scolding the player. The dungeon feels old, procedural, and temperamental, not gore-heavy.

## Target experience

| Beat | Player experience | Typical duration |
|---|---|---:|
| Contract choice | Compare three parcels, rewards, clauses, and destination conditions. | 15–25s |
| Survey | Read route families, the first shift forecast, patrol loops, and caches. | 20–30s |
| Establish rhythm | Learn how this package responds to ordinary steps and turns. | 30–45s |
| First trade-off | Take a longer stable hall or spend a rope/wedge on a shortcut. | 20–40s |
| Dungeon shift | Time a bridge, gate, flood, or sliding wall using the visible countdown. | 20–45s |
| Load decision | Take/drop/sacrifice a tool or valuable because carrying everything is costly. | 10–20s |
| Final approach | Combine package rule, threat timing, and remaining condition under deadline pressure. | 45–75s |
| Delivery | Receive a condition grade, explanation, payment, and upgrade choice. | 15–25s |

A complete Standard Run contains three deliveries. The first introduces one signature rule, the second adds a compatible handling seal, and the third combines a demanding parcel with a more active dungeon floor.

## Core loop

1. At the depot, inspect three contracts. Each shows the parcel rules, condition, size, deadline, route reward, and one known floor feature.
2. Choose a contract and optionally rearrange the four-slot courier satchel.
3. Survey the entire generated floor. Identify stable, fast, and resource-rich route options.
4. Move one action at a time. Preview the action's time, parcel stress, clause changes, and threat response before it resolves.
5. Brace, wait, hurry, or use limited tools to cross hazards and align with scheduled dungeon changes.
6. Pick up supplies or valuables only if their slot/weight cost is worth it. Drop or sacrifice cargo when it becomes a liability.
7. Reach the recipient before the contract expires and with at least one parcel condition pip intact.
8. Receive a delivery grade and choose one of three courier upgrades.
9. Repeat for three deliveries, then calculate a final courier rank and expose the run seed for replay.

## Run structure

### Standard Run

- **Delivery 1 — The Label:** one signature parcel rule, forgiving floor, one dynamic mechanism, generous deadline.
- **Delivery 2 — The Route:** parcel plus one compatible seal, two dynamic mechanisms, first meaningful sacrifice shortcut.
- **Delivery 3 — The Promise:** complex parcel, active threat combination, tighter but validated deadline, recipient behind a multi-state final approach.
- Target length: 10–15 minutes after the tutorial.
- A broken parcel or expired hard deadline ends the run.
- Success shows total pay, intact-condition bonus, optional cargo value, time bonus, clause violations, and rank.

### Tutorial

- Separate five-room authored route lasting 3–5 minutes.
- Does not affect scores or best runs.
- Can be replayed at any time and skipped after first completion.

### Same-seed replay

- Displays an eight-character seed on the contract and ending screens.
- Recreates template, route variants, parcels offered, shifts, threats, caches, upgrades, and tie-breaking behavior.
- A replay transcript is a seed plus ordered engine commands; animations are not recorded.

## The movement model

Dungeon Courier is turn-based and grid-based. The player occupies one cardinal tile. Diagonal movement is not supported; corridor shape and turning are important package concerns.

### Universal actions

| Action | Input | Base time | Base handling effect | Purpose |
|---|---|---:|---:|---|
| Step | Arrows / WASD | 1 tick | 0 stress | Move one cardinal walkable tile. |
| Hurry | Shift + direction | 1 tick | +1 stress | Move two clear tiles in a straight line; loud; cannot cross most interactions. |
| Brace | `B` | 1 tick | -2 stress, +1 guard | Stabilize parcel and absorb one point from the next jolt. |
| Wait | `.` / Space | 1 tick | parcel-dependent | Let patrols or a shift advance without moving. |
| Interact | Enter / `E` | 1 tick unless noted | context-dependent | Open, repair, receive, use a niche, or deliver. |
| Use tool | `1`–`4` | item-dependent | item-dependent | Use the selected satchel item. |
| Inventory | `I` | 0 ticks | none | Inspect, reorder, or mark an item to drop. |
| Drop | `X` in inventory | 0 ticks | recalculated load | Leave an item on the current tile. |
| Survey | Tab | 0 ticks | none | Cycle route, shift-zone, and threat overlays. |
| Undo | `U` | 0 ticks | none | Undo the last uncommitted action only in Assist mode; see accessibility. |

`Hurry` is one action, not two rapid key events. It is legal only if both tiles are currently traversable, neither contains a stop interaction, and the parcel rules allow it. Threats and the dungeon advance once because its base time is one tick, but the action is noisy and more stressful. Heavy terrain or parcel modifiers can raise it to two ticks.

### Parcel condition, stress, and guard

Every parcel has:

- `condition`: remaining package health, normally 4–6 pips;
- `stress`: accumulated rough handling, beginning at 0;
- `tolerance`: stress that can be held safely, normally 2–4;
- `guard`: temporary protection created by bracing or tools;
- zero or more named secondary meters such as wake, exposure, heat, or memory.

Each action produces an `ActionEvaluation` before it is committed. Terrain, threats, carried weight, tools, and parcel rules modify its stress. Resolution uses the following transparent rule:

```text
effective stress gain = max(0, action stress + jolts - guard spent)
new stress            = old stress + effective stress gain

while new stress > tolerance:
    condition -= 1
    new stress -= tolerance + 1
```

Important consequences:

- Stress carries between moves, so several small mistakes can equal one large impact.
- Bracing is proactive and visible; it is not a random chance to avoid damage.
- A two-point jolt can cause more than one condition loss only on the most fragile parcels.
- On condition loss, the event log names the rule and source: `CRACK −1: hurried turn on WET STONE (+2 stress).`
- The action preview reports `SAFE`, `STRAIN +1`, `DAMAGE LIKELY`, or `ILLEGAL`, plus a short reason.

Condition at zero means the parcel is undeliverable and the run ends. The courier has no separate hit-point bar. Falls, patrol contact, and traps cost time and parcel stress, keeping attention on the delivery.

### Time and deadlines

- Every action has an integer tick cost.
- The dungeon shift clock, threat movement, contract deadline, and parcel meters use the same tick.
- A normal floor budget is 45–70 ticks depending on shortest safe-route length and package rules.
- Hard deadlines are generated from a validated conservative solution plus a difficulty margin, never from a fixed arbitrary number.
- When an action crosses a deadline or shift boundary, the preview says `SHIFT AFTER ACTION` or `DEADLINE EXCEEDED` before confirmation.

### Deterministic action-resolution order

Resolution order must never be ambiguous:

1. Convert key input to a domain command.
2. Compute action intent and base legality.
3. Apply terrain and dynamic-tile modifiers.
4. Apply carried-item/load modifiers.
5. Apply active package-rule modifiers in stable rule-ID order.
6. Display or return the final preview. Illegal actions do not advance time.
7. Commit the player position/interact effect.
8. Apply immediate tile stress, meter changes, pickups, and tool effects.
9. For each tick of action cost:
   1. advance deadline and parcel meters;
   2. advance patrols and environmental threats;
   3. resolve contact or line-of-sight consequences;
   4. advance the shift clock and transform due shift groups;
   5. resolve any transformed tile under the courier using the advertised displacement rule.
10. Convert excess stress to condition loss.
11. Check delivery, breakage, deadline, and floor-end conditions.
12. Append named presentation events for rendering.

The exact order is documented in help. If a bridge turns after the action, the player reaches the tile first; if that state cannot hold a courier, the preview must include the resulting displacement/jolt.

## Parcels: the rules that change movement

Parcel behavior is authored, not generated from unrestricted random clauses. Each parcel has one signature rule that is easy to state in a single line, baseline size/condition/tolerance, and a small set of compatible seals used on later deliveries.

### Version 1 parcel catalog

| Parcel | Label shown to player | Exact movement effect | Route tension | Counterplay |
|---|---|---|---|---|
| Porcelain Choir | `FRAGILE — BRACE BEFORE IMPACT` | Jolts of 2+ add one extra stress. Brace grants 2 guard instead of 1. | Stable stairs vs. cracked-floor shortcut. | Brace, padding, avoid hurry on rough tiles. |
| Moonwater Ampoule | `KEEP A STEADY COURSE` | Changing direction on consecutive movement actions adds +1 slosh; three steps in one direction clear 1 slosh. At 3 slosh, +1 stress and reset. | Long straight halls become valuable; winding safe paths are less safe for this parcel. | Pause with brace, choose colonnades, use gyroscopic strap. |
| Sleeping Bell | `DO NOT WAKE` | Loud tiles, gates, and Hurry add wake. Waiting on a quiet tile clears 1. At 3 wake, +2 stress and all nearby patrols investigate. | Loud shortcut vs. slow silent route. | Softstep wrap, distract patrols before wake pulse. |
| Sunless Film | `KEEP FROM LIGHT` | Entering a lit tile adds exposure; every third exposure removes 1 condition directly. Darkness clears exposure slowly. | Bright safe halls vs. dark hazard corridors. | Hood tool, switch lamps, time eclipse shift. |
| Folded Familiar | `TWO-PERSON LIFT` | Hurry is illegal. Weak floors collapse after leaving them; climb and rubble actions cost +1 tick. The parcel itself ignores knockback. | Slow certainty creates deadline pressure but can permanently alter return routes. | Handcart upgrade, plan one-way route, drop excess load. |
| Memory Mirror | `DO NOT RETRACE YOUR STEPS` | Re-entering one of the last six visited tiles adds +2 stress; safe anchors clear the memory queue. | Loops and backtracking are dangerous; sacrifice shortcuts are attractive. | Chalk a one-way path, reach an anchor, spend a cleansing cloth. |
| Hearthseed Casket | `KEEP MOVING — KEEP COOL` | Wait and Brace add 1 heat; water tiles clear 2 heat. At 4 heat, +1 stress per tick until cooled. | Fast damp route vs. stable dry route; ordinary bracing is not always safe. | Cooling salve, fountain detour, plan shifts before entering. |
| Compass Needle | `NORTH SIDE MUST LEAD` | Southward steps add +1 polarity and cannot Hurry. Northward steps clear 1. At 3 polarity, the parcel pulls the courier one tile north if possible and adds a jolt. | Destination position and approach direction matter; lateral routes may beat a direct southern correction. | Rotate at marked turntables, magnetic wrap, enter from below. |

The first implementation milestone should use Porcelain Choir, Moonwater Ampoule, Sleeping Bell, and Folded Familiar. The other four arrive after movement preview and generator validation are stable.

### Handling seals

Seals are secondary rules attached only through a compatibility table:

| Seal | Rule | Purpose |
|---|---|---|
| Rush | Deadline margin is reduced; delivery ahead of par pays a large bonus. | Makes stable routes expensive without changing handling math. |
| Top-heavy | Turning while stressed adds +1 stress; Brace clears one extra stress. | Reinforces turn planning. |
| Uninsured | Condition starts one pip lower; payment is higher. | Simple high-risk offer. |
| Quiet claim | Patrol contact counts as a loud event and adds +1 extra stress. | Connects package and threat planning. |
| Oversized | One fewer satchel slot; narrow cracks require a compression strap. | Forces “what to leave behind” decisions. |
| Recipient asleep | Final three tiles must not generate noise 2+ or the delivery door stays shut for three ticks. | Creates a readable final-approach puzzle. |

Invalid or unfun combinations are explicitly banned. Examples: Hearthseed cannot receive a seal that requires repeated bracing; Folded Familiar cannot receive a mandatory Hurry objective; Oversized is excluded from templates whose only validated route contains a narrow crack.

### Rule implementation model

State stores rule IDs rather than functions. A static registry maps each ID to pure hooks:

```ts
interface PackageRuleDefinition {
  id: PackageRuleId;
  shortLabel: string;
  description: string;
  modifyAction?: (ctx: ActionContext, result: ActionEvaluation) => ActionEvaluation;
  afterAction?: (ctx: ResolvedActionContext) => RuleEffect[];
  onTick?: (ctx: TickContext) => RuleEffect[];
  onDungeonShift?: (ctx: ShiftContext) => RuleEffect[];
  validateContract?: (ctx: ContractValidationContext) => ValidationIssue[];
}
```

Rules must return structured reasons, not pre-colored strings. This lets preview, event log, tutorial, tests, and debug output all describe the same consequence.

## Dungeon design

### Floor dimensions and visibility

- Logical floor target: 44–50 columns by 15–18 rows.
- The entire logical floor is visible in the compact layout; no camera scrolling in Version 1.
- Walls and known route structure are always shown.
- Threat positions and their next move arrows are shown when in survey range; a threat may be hidden only if its possible region is marked and it cannot cause immediate unavoidable contact.
- Optional cache contents can remain unknown until reached.

### Tile vocabulary

| Concept | Unicode | ASCII | Rule |
|---|---:|---:|---|
| Courier | `@` | `@` | Player position. |
| Recipient | `◆` | `D` | Delivery target. |
| Stable floor | `·` | `.` | No movement modifier. |
| Rough floor | `░` | `:` | Hurry or forced movement adds +1 stress. |
| Wet floor | `≈` | `~` | Turning/Hurry adds +1 stress; cools Hearthseed. |
| Weak floor | `◇` | `,` | Collapses after heavy crossing. |
| Narrow crack | `⋮` | `|` | Oversized parcels need a strap or another route. |
| Safe anchor | `⊙` | `O` | Clears certain parcel memory and cannot shift. |
| Repair bench | `✚` | `+` | Spend a patch to restore condition or improve guard. |
| Cache | `□` | `C` | Contains a tool or optional valuable. |
| Sacrifice niche | `▽` | `V` | Consume/drop an item to open a shortcut. |
| Patrol | `◈` | `P` | Predictable non-combat mover. |
| Shift group | box/track glyph | `#/-/|` | Appearance depends on mechanism state. |

Glyph width must be tested in xterm. Any character that renders inconsistently is replaced by its ASCII form globally. Color reinforces safe/warn/danger states but is never the only cue.

### Route families

Every generated floor must expose at least two valid routes and should normally expose three recognizable choices:

1. **Stable route:** longest by ticks, fewest stress sources, more shift cycles and deadline pressure.
2. **Shortcut:** 25–40% shorter, but contains a package-relevant risk, tool gate, sacrifice niche, or tight timing window.
3. **Supply detour:** moderate length, reaches a cache/repair anchor, and rejoins a main route.

These are generator roles, not colored rails. Paths can overlap, and a player may switch between them. The survey overlay highlights route cost estimates computed for the current package rather than generic shortest distance.

### Dungeon shifts

The Underway reconfigures on a visible `SHIFT IN n` clock, normally every 6–9 ticks. The next state of each affected group is forecast. A floor uses one mechanism on Delivery 1, up to two on Delivery 2, and two or three on Delivery 3.

| Mechanism | States | Player-readable behavior |
|---|---|---|
| Rotating bridge | horizontal / vertical | Changes which two banks connect. Bridge tiles show rotation arrows one tick before movement. |
| Sliding wall | corridor A / corridor B | Opens one lane while closing another; marked safe pockets are never occupied by the wall. |
| Flood pulse | dry / shallow / deep | Shallow modifies handling; deep blocks heavy parcels and slows normal parcels. |
| Lift cage | stop A / transit / stop B | Acts as a timed moving room; transit costs a known number of ticks. |
| Lantern circuit | lit A / lit B / dark | Changes visibility and Sunless Film exposure routes; does not hide lethal information. |

Shift rules:

- The countdown and exact next state are visible in the main HUD.
- Groups transform only at tick boundaries after threat movement.
- A transforming tile under the courier has a specific advertised result: stay, move with platform, or displace to a marked safe pocket with a fixed jolt.
- A shift may temporarily block all forward paths only if a safe waiting tile is reachable and the remaining deadline still supports waiting.
- A permanent state change may close a route behind the courier, but generator validation must preserve at least one path to the recipient.
- Shift schedules use the seed and floor index, never rendering frame count or wall time.

### Non-combat threats

Threats have short deterministic patterns and clear counters:

| Threat | Behavior | Contact consequence | Counterplay |
|---|---|---|---|
| Porter beetle | Walks a 3–8 tile loop; next direction shown. | Pushes courier one tile and adds +1 jolt. | Wait, brace, take a side pocket, lure with ration. |
| Watcher statue | Rotates 90° on its shown cadence. | Sight closes its linked gate for 3 ticks and adds delay; no direct damage. | Cross after rotation, block sight with smoke cloth. |
| Draft wisp | Moves along arrows when a shift occurs. | Forces one-tile movement; rough landing adds stress. | Brace, stand on anchor, use corked jar. |
| Toll mimic | Pretends to be a cache but is always marked `?C`; revealed by survey. | Takes the top satchel item or blocks route until paid. | Detour, intentionally order inventory, use inspection chalk. |

No threat can be killed. Tools redirect or neutralize a behavior temporarily, never turn the game into attrition combat.

## Inventory and “what to leave behind”

The parcel is separate from the satchel and can never be abandoned. The satchel has four slots by default; parcel size or upgrades can modify this to two through five. Each item occupies one slot, while explicitly bulky valuables occupy two.

### Tool examples

| Item | Uses | Effect |
|---|---:|---|
| Felt padding | 1 | Cancel up to 2 stress from one action. |
| Survey chalk | 2 | Reveal a cache and one additional shift state/path estimate. |
| Door wedge | 1 | Hold a sliding gate in its current state for one cycle. |
| Courier rope | 1 | Create a one-way crossing at a marked gap. |
| Smoke cloth | 1 | Block a watcher line for two ticks. |
| Beetle ration | 1 | Redirect the nearest porter beetle to the target tile. |
| Compression strap | 2 | Pass one narrow crack with an oversized parcel. |
| Cooling salve | 1 | Clear all heat or exposure. |
| Cleansing cloth | 1 | Clear Memory Mirror's visited-tile queue. |
| Repair patch | 1 | At a bench, restore one condition; otherwise grant 2 guard. |
| Clock key | 1 | Delay the next dungeon shift by two ticks. |
| Insurance seal | 1 | Prevent one condition loss but reduce final pay. |

### Optional valuables

Valuables add final pay but consume space or alter handling:

- coin purse: one slot, small score bonus;
- bottled echo: one slot, adds noise when hurrying;
- brass idol: two slots, adds +1 tick to climb/rubble;
- recipient's lost token: one slot, significant delivery bonus on that floor;
- salvage map: one slot, improves the next contract offer if delivered.

### Dropping and sacrifice

- Opening inventory pauses input but not by consuming a game tick; the game is already command-driven.
- Dropping an item is free and leaves a persistent glyph on the current tile.
- The item can be recovered by returning to that tile if the route remains open.
- Sacrifice niches open an optional shortcut only after consuming a valid tool or valuable. The UI names exactly what will be lost and asks for confirmation.
- Some pressure plates work only below a load threshold, so dropping a heavy valuable can be a route solution.
- Dropped items are included in snapshots/replays and cannot vanish due to a dungeon shift unless the tile explicitly forecasts destruction.

The intended question is not merely “which consumable do I use?” It is “do I preserve flexibility, carry payment, or leave something useful here because the parcel matters more?”

## Contract selection and difficulty

At each depot, show three offers with no hidden clauses:

```text
┌─ CONTRACT B ─────────────────────────────┐
│ MOONWATER AMPOULE          PAY  180      │
│ CONDITION 5   TOLERANCE 3   SIZE MEDIUM  │
│ KEEP A STEADY COURSE                     │
│ Consecutive turns raise SLOSH.           │
│ SEAL: RUSH — 47 tick deadline            │
│ KNOWN ROUTE: flooded cloister             │
└───────────────────────────────────────────┘
```

Offer generation considers the player's current tools and previous parcels:

- do not offer the same base parcel twice in one run;
- include one lower-risk, one medium-risk, and one high-pay/high-risk option;
- never require a specific tool the player does not own unless the floor contains a guaranteed accessible copy;
- avoid presenting three contracts with the same dominant route behavior;
- show difficulty as concrete modifiers, not an unexplained star rating.

## Upgrades between deliveries

After successful delivery, choose one of three deterministic offers:

| Upgrade | Effect |
|---|---|
| Shock webbing | First stress gained on each floor is cancelled. |
| Slim satchel | +1 satchel slot, maximum 5. |
| Runner's sole | First Hurry each six ticks creates no noise. |
| Survey license | Forecast one extra shift group/state. |
| Sure grip | Climb/rubble never adds package stress. |
| Quiet buckle | Using a satchel tool creates no noise. |
| Bench token | First repair on each floor does not consume a patch. |
| Route memory | Route overlay includes one package-weighted alternative path. |
| Brass handcart | Heavy parcel movement penalties are reduced once per action, but narrow cracks remain blocked. |
| Claim stamp | Once per run, condition would reach zero; keep it at one and lose 30% pay. |

Upgrades should soften a constraint or create a tactical exception, not erase a parcel's signature. `Brass handcart`, for example, never enables Folded Familiar to Hurry.

There are no permanent power unlocks in Version 1. Best rank, tutorial completion, last seed, and accessibility preferences may persist, but every Standard Run begins mechanically equal.

## Scoring, grades, victory, and failure

### Per-delivery score

```text
base contract pay
+ condition remaining × condition bonus
+ ticks under par × speed bonus (capped)
+ optional valuables delivered
+ no-clause-violation bonus
+ high-risk seal bonus
− insurance claim penalty
− late penalty where lateness is allowed
```

The action log tracks a clause violation even if it did not cause condition loss. This supports useful end reports such as `2 rough turns; 1 prevented by padding`.

### Final ranks

- `S — IMPOSSIBLE ADDRESS`: all three delivered, strong condition, high-risk contracts.
- `A — UNDERWAY EXPRESS`: all three delivered with few violations.
- `B — SIGNED AND RECEIVED`: all three delivered.
- `C — ROUTE COMPLETED`: assisted finish or low-condition deliveries.
- `CLAIM FILED`: run ended with a broken or expired parcel.

Rank thresholds should be percentile-tuned after playtesting rather than guessed from raw totals.

### Failure conditions

- parcel condition reaches zero;
- a contract marked hard-expiry reaches its deadline before interaction with the recipient;
- a scripted tutorial condition demonstrates failure, then rewinds rather than ending the tutorial.

There is no random instant death, hunger clock, enemy health, or courier health. A floor generator/engine invariant violation must fail safely to a diagnostic fallback floor, never present an unwinnable run.

## Tutorial design

The tutorial is an authored route and uses Porcelain Choir. It teaches through five short rooms:

1. **Read the label.** Step across stable tiles; action preview is highlighted.
2. **Feel stress.** Cross rough stone with Hurry, deliberately adding stress, then Brace before a small jolt.
3. **Read the clock.** Wait for a rotating bridge using `SHIFT IN 2`; show that time and shift share ticks.
4. **Choose the route.** Stable hall is longer; cracked shortcut costs felt padding. Either route succeeds and explains its trade-off.
5. **Leave something.** Pick up a coin purse, then choose to sacrifice it for a door or carry it around the longer route.
6. **Deliver.** Interact with the recipient and read the condition/violation report.

Tutorial prompts point to an existing UI panel rather than covering the map. Unavailable actions are rejected with a one-line explanation. Intentional damage rewinds to the prior safe checkpoint so experimentation is encouraged.

## Interface and controls

### Compact `80x28` layout

```text
 DUNGEON COURIER   DELIVERY 2/3   TICK 23/58   SHIFT IN 3 → BRIDGE V
┌─ UNDERWAY ─────────────────────────────────────┐┌─ PARCEL ─────────────┐
│#########··········#########··········########││ MOONWATER AMPOULE    │
│# @·····#··P→·····#····≈≈≈#····◆·····#······#││ COND ◆◆◆◆◇  STRESS 1/3│
│#···O···+·········#··≈≈≈≈≈#··········#······#││ SLOSH 2/3            │
│####·####··#####·###··≈───≈####·########··#####││ KEEP A STEADY COURSE │
│   #·#   ··# C #······≈───≈·····#             ││ SEAL: RUSH            │
│####·#######+###·#####≈───≈######·#############│├─ SATCHEL ────────────┤
│#················#   ·≈≈≈·       ·            ││1 PAD  2 ROPE  3 COIN │
│#··░░░░··▽·······####····#########·###########││4 EMPTY               │
│#···········································#│├─ PREVIEW ────────────┤
│###############################################││ EAST: STRAIN +1      │
└───────────────────────────────────────────────┘│ turn again → SLOSH 3 │
 LOG: BRIDGE ROTATES AFTER 3 TICKS.               └──────────────────────┘
 [Arrows] Step  [Shift+Arrow] Hurry  [B] Brace  [1–4] Tool  [I] Bag
 [Tab] Survey  [.] Wait  [Enter] Interact  [H] Help  [Esc] Pause
```

The exact map width can shrink by two columns if double-width glyph testing requires it. ANSI-visible-width helpers must measure after stripping escape codes; string `.length` is not sufficient for styled centering.

### Wider layout

At 96+ columns:

- widen the map to its authored maximum;
- show the next two shift events instead of one;
- display full clause explanations and the last four log entries;
- keep the map glyph scale at one cell so spatial reasoning does not change.

### State screens

| Phase | Purpose | Main inputs |
|---|---|---|
| Start | Title, premise, tutorial/play/replay. | `T`, `P`, `R`, `Q` |
| Contract | Compare three offers and satchel. | Left/right, `1`–`3`, Enter |
| Briefing | Show parcel label and highlighted route facts. | Enter |
| Traversal | Move, preview, use tools, inspect overlays. | Main controls |
| Inventory | Reorder/drop/inspect items. | Arrows, Enter, `X`, Esc |
| Delivery report | Condition, pay, violations, route trace. | Enter |
| Upgrade | Choose one of three upgrades. | `1`–`3` |
| Ending / claim | Rank, seed, replay/restart/menu options. | `R`, `N`, `Q` |
| Pause | Shared Gamr pause menu. | Arrows, Enter, shortcuts |

### Input principles

- Movement keys never also select menu options while a modal is open.
- A held key must not generate repeated committed actions faster than the renderer can show previews; throttle/reject repeats at the controller boundary.
- Illegal actions do not cost time or mutate state.
- Sacrifice, destructive drop into a forecast hazard, and hard-deadline crossing require explicit confirmation.
- `Esc` closes help/inventory first, otherwise opens the shared pause menu.
- Below minimum terminal size, traversal input is frozen and the standard resize message shows required/current dimensions.

## Visual language

The renderer should feel like a route map stamped onto a dungeon delivery docket.

### Semantic vocabulary

Use a restrained set of symbols consistently across map, parcel card, log, tutorial, and reports:

- `@` courier;
- `◆/D` recipient/delivery;
- `◇/o` condition lost or fragile floor;
- `⊙/O` stable anchor;
- `≈/~` water or changing surface;
- `◈/P` patrol;
- `□/C` cache;
- `▽/V` sacrifice niche;
- `✚/+` repair;
- `!` immediate risk;
- `→/^/v/<` movement or forecast direction;
- `✓/+` safe/correct;
- `×/x` broken/blocked;
- `¦/|` deadline and meter thresholds.

### Color and emphasis

- Theme color: headings, stable route, selection cursor.
- Yellow/bright emphasis: stress, shift due on next action, uncertain cache.
- Red/magenta equivalent: predicted condition loss, expired contract, blocked action.
- Blue/cyan equivalent: water, cooling, forecast.
- Dim: walls, already visited cells, inactive route overlays.
- Every color meaning also has a symbol and label.

### Effects

- Small dust particles on a weak-floor collapse.
- One-cell route pulse when a bridge or wall changes.
- Short parcel-card shake only on actual condition loss.
- A restrained stamp animation on successful delivery.
- No continuous animation on a turn-based planning screen.
- Glitch-title treatment only on start/ending screens and rare dungeon shifts.

Manually inspect default and light themes at `80x28`, `96x32`, and a wide terminal. Verify start, traversal, inventory, warning, pause, resize, delivery, failure, and victory states.

## Technical architecture

The engine is the source of truth. The controller translates input and owns lifecycle. Rendering reads state and presentation events but cannot determine legality, damage, score, generation, or outcome.

```text
src/games/dungeon-courier/
├── index.ts                 # Gamr controller, lifecycle, key handling, pause integration
├── types.ts                 # Serializable state, commands, content schemas, event types
├── seed.ts                  # PRNG, seed parsing/display, independent stream mixing
├── content.ts               # Parcels, seals, items, upgrades, threats, text content
├── packageRules.ts          # Pure rule registry and handling hooks
├── templates.ts             # Authored ASCII floor skeletons and shift-group anchors
├── generator.ts             # Seeded template variants, placements, contract/floor assembly
├── pathfinding.ts           # Weighted routes, reachability, threat/shift state helpers
├── validate.ts              # Static content checks and bounded solvability validation
├── engine.ts                # Command reducer, action preview, ticks, delivery/progression
├── tutorial.ts              # Authored tutorial state, gates, prompts, rewind checkpoints
├── input.ts                 # Keyboard event → phase-aware domain command
├── render.ts                # Pure ANSI layouts, overlays, meters, modals, reports
├── engine.test.ts           # Rules, commands, timing, parcel behavior, progression
├── generator.test.ts        # Seed determinism, topology/content/solvability properties
├── packageRules.test.ts     # Table tests for every parcel and seal hook
└── render.test.ts           # ANSI width, compact layout, labels, resize behavior
```

Complex renderer helpers can later move into `render/`, but a flat module set is easier for the first vertical slice.

### Core domain types

```ts
type Point = { x: number; y: number };
type Direction = 'N' | 'E' | 'S' | 'W';
type Phase =
  | 'start'
  | 'contract'
  | 'briefing'
  | 'traversal'
  | 'inventory'
  | 'confirm'
  | 'deliveryReport'
  | 'upgrade'
  | 'ending'
  | 'gameOver';

type TileKind =
  | 'wall'
  | 'floor'
  | 'rough'
  | 'wet'
  | 'weak'
  | 'narrow'
  | 'anchor'
  | 'bench'
  | 'cache'
  | 'niche'
  | 'recipient'
  | 'dynamic';

interface ParcelState {
  parcelId: ParcelId;
  sealIds: SealId[];
  condition: number;
  maxCondition: number;
  stress: number;
  tolerance: number;
  guard: number;
  size: 'small' | 'medium' | 'oversized';
  meters: Partial<Record<PackageMeterId, number>>;
  flags: Record<string, boolean>;
  directionHistory: Direction[];
  visitedHistory: string[];
}

interface ContractState {
  id: string;
  parcel: ParcelState;
  basePay: number;
  deadline: number;
  hardExpiry: boolean;
  parTicks: number;
  destination: Point;
  knownFeature: string;
  violations: ClauseViolation[];
}

interface DynamicGroupState {
  id: string;
  mechanism: ShiftMechanismId;
  phaseIndex: number;
  schedule: number[];
  nextAtTick: number;
  cells: Point[];
}

interface ThreatState {
  id: string;
  kind: ThreatId;
  pos: Point;
  route: Point[];
  routeIndex: number;
  facing: Direction;
  cadence: number;
  disabledTicks: number;
  intent: ThreatIntent;
}

interface FloorState {
  id: string;
  width: number;
  height: number;
  tiles: TileState[][];
  start: Point;
  recipient: Point;
  dynamicGroups: DynamicGroupState[];
  threats: ThreatState[];
  droppedItems: DroppedItem[];
  tick: number;
  shiftPeriod: number;
  eventLog: LogEntry[];
}

interface GameState {
  version: 1;
  contentVersion: number;
  seed: number;
  mode: 'tutorial' | 'standard' | 'replay';
  phase: Phase;
  deliveryIndex: number;
  courier: CourierState;
  contractOffers: ContractOffer[];
  contract: ContractState | null;
  floor: FloorState | null;
  score: number;
  pay: number;
  upgrades: UpgradeId[];
  selectedInventoryIndex: number;
  surveyMode: 'none' | 'routes' | 'shifts' | 'threats';
  pendingConfirmation: Confirmation | null;
  lastPreview: ActionEvaluation | null;
  reports: DeliveryReport[];
  outcome: RunOutcome | null;
  notice: string;
}
```

All saved state consists of primitives, arrays, and plain objects. Derived route estimates, glyphs, and package-rule functions are recalculated from IDs and excluded from saves.

### Commands

```ts
type Command =
  | { type: 'startRun'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'chooseContract'; offerIndex: number }
  | { type: 'dismissBriefing' }
  | { type: 'previewMove'; direction: Direction; hurried: boolean }
  | { type: 'move'; direction: Direction; hurried: boolean }
  | { type: 'brace' }
  | { type: 'wait' }
  | { type: 'interact' }
  | { type: 'useItem'; slot: number; target?: Point }
  | { type: 'toggleInventory' }
  | { type: 'dropItem'; slot: number }
  | { type: 'cycleSurvey' }
  | { type: 'confirm' }
  | { type: 'cancel' }
  | { type: 'chooseUpgrade'; upgradeId: UpgradeId }
  | { type: 'continueReport' }
  | { type: 'toggleHelp' }
  | { type: 'restart'; seed?: number };

interface CommandResult {
  state: GameState;
  events: PresentationEvent[];
  accepted: boolean;
}
```

Preview and commit must use the same `evaluateAction` function. A commit carries or recomputes an action fingerprint so UI code cannot preview one consequence and execute another after state changes.

### Action evaluation

```ts
interface ActionEvaluation {
  legal: boolean;
  action: CourierAction;
  from: Point;
  to: Point;
  path: Point[];
  timeCost: number;
  stressDelta: number;
  guardSpent: number;
  conditionDelta: number;
  meterDeltas: Partial<Record<PackageMeterId, number>>;
  noise: number;
  predictedEvents: PredictedEvent[];
  reasons: RuleReason[];
  fingerprint: string;
}

function evaluateAction(state: GameState, action: CourierAction): ActionEvaluation;
function applyCommand(state: GameState, command: Command): CommandResult;
function advanceTick(state: GameState, source: ActionId): PresentationEvent[];
```

The reducer may use controlled cloning rather than strict structural immutability, following existing Gamr engines, but tests should assert that rejected commands leave serialized state byte-identical.

## Procedural generation plan

Version 1 should use **authored topology templates with seeded transformation and placement**, not unconstrained cellular caves. Pure random caves make readable route families, full-map layout, and package-specific solvability much harder to guarantee.

### Template contract

Each ASCII template defines:

- walls and stable floor;
- start and recipient anchor candidates;
- named route zones (`safe`, `fast`, `supply`);
- dynamic-group sockets and their legal mechanisms;
- threat-loop sockets;
- cache, bench, niche, gap, and safe-anchor sockets;
- critical cells that cannot be overwritten;
- optional connector groups with mutually exclusive variants.

Templates may be mirrored horizontally/vertically where semantic sockets allow it. Rotation is permitted only when the Compass Needle contract is recalculated for the transformed destination.

### Generation pipeline

1. Mix the run seed with delivery index and content version.
2. Select a template not used earlier in the run.
3. Apply allowed mirror/rotation transformation.
4. Select optional connectors while preserving the template's base stable path.
5. Select parcel-compatible dynamic mechanisms for sockets.
6. Create an exact shift schedule with at least one useful and one risky timing window.
7. Paint terrain onto route zones according to the chosen parcel's challenge tags.
8. Place threats on authored loops, never directly adjacent to start or recipient.
9. Place guaranteed tool counters, optional caches, repair benches, and sacrifice niches.
10. Compute unweighted reachability for every relevant dynamic state.
11. Compute package-weighted route estimates for stable, shortcut, and supply roles.
12. Derive par time and deadline from validated route costs plus floor-specific margin.
13. Run fast static validators. If invalid, retry placements with the next deterministic sub-seed.
14. Run bounded temporal solver validation for the selected contract.
15. After a fixed retry cap, load a known-good fallback variant while keeping the displayed run seed.

### Seed streams

Use independent mixed streams so adding flavour text does not change floor topology:

```text
mixSeed(runSeed, CONTENT_VERSION, deliveryIndex, 'template')
mixSeed(runSeed, CONTENT_VERSION, deliveryIndex, 'terrain')
mixSeed(runSeed, CONTENT_VERSION, deliveryIndex, 'shift')
mixSeed(runSeed, CONTENT_VERSION, deliveryIndex, 'threats')
mixSeed(runSeed, CONTENT_VERSION, deliveryIndex, 'loot')
mixSeed(runSeed, CONTENT_VERSION, deliveryIndex, 'contracts')
mixSeed(runSeed, CONTENT_VERSION, deliveryIndex, 'upgrades')
```

Implement a small local PRNG such as Mulberry32 or xorshift32. Never call `Math.random()` inside engine, generator, content selection, threat resolution, or scoring.

### Static validation

For every assembled floor:

- start and recipient are in bounds, distinct, and walkable;
- every referenced socket, tile, rule, item, threat, and dynamic group ID resolves;
- every dynamic state has valid cell geometry;
- no threat starts on a critical tile, cache, recipient, or courier;
- at least one route exists at tick zero;
- at least two topologically different route choices exist unless the floor is tutorial-only;
- a bench/cache/niche is not placed behind itself as the sole requirement to access it;
- package size and signature rules do not make every route illegal;
- deadline is greater than or equal to conservative validated solution cost plus configured margin;
- required tools are guaranteed reachable before their first required use;
- recipient interaction has at least one safe standing tile.

### Temporal solver

A simple BFS/A* state search is sufficient because floors are small and deadlines are bounded. Solver state should include only correctness-relevant dimensions:

```ts
type SolverNode = {
  pos: Point;
  tick: number;
  condition: number;
  stress: number;
  guard: number;
  compactMeters: number;
  compactHistory: number;
  inventoryMask: number;
  dynamicPhaseMask: number;
};
```

Use dominance pruning: at equal position/tick/dynamic state, discard a node with no better condition, stress, meters, or inventory. The solver does not need to find optimal score; it only proves at least one delivery path under conservative threat behavior.

Run this bounded solver:

- during development across thousands of seeds;
- in generator tests;
- at runtime only for the final candidate floor, with a strict expansion cap;
- never on every movement command.

Log fallback frequency. A rate above 0.5% indicates generator rules need correction rather than a larger retry cap.

## Pathfinding and route preview

The survey overlay uses package-weighted A* estimates, not the full solver:

```text
edge cost = time
          + predicted stress × stressWeight
          + predicted condition loss × largePenalty
          + deadline risk
          + threat timing risk
          + consumable use × itemValue
```

Compute three alternatives by temporarily penalizing edges from the previous result or using a small k-shortest-path implementation. Label them by actual characteristics (`STABLE 31`, `FAST 22 + ROPE`, `BENCH 37`) instead of assuming a template zone remained best after parcel modifiers.

The overlay is advice, not automation. It does not account for unknown cache contents and never moves the player.

## Rendering and controller integration

### `index.ts` responsibilities

- export `runDungeonCourierGame(terminal)` and a controller with `stop()` and `isRunning`;
- enter alternate buffer through shared utilities and hide the cursor;
- create initial state and keep presentation-only animation state separate;
- register exactly one `terminal.onKey` listener;
- translate input with `input.ts`, including held-key throttling;
- call pure engine commands synchronously;
- maintain a 20 FPS render interval for minor effects and resize responsiveness;
- integrate `PAUSE_MENU_ITEMS`, `renderSimpleMenu`, and `navigateMenu`;
- dispatch quit, next game, and games menu through shared transition helpers;
- on stop, clear intervals, dispose listeners, reset presentation effects, show cursor, and exit alternate buffer exactly once.

No game interval is required because the simulation is command-driven.

### `render.ts` responsibilities

- choose compact, wide, modal, or resize layout;
- convert semantic tiles/events to glyphs and theme-aware ANSI styles;
- strip ANSI and calculate visible width for alignment;
- draw the map and selected action preview from immutable state;
- render route, shift, or threat overlays without changing state;
- wrap/truncate authored text safely;
- render help, inventory, confirmation, pause, report, ending, and error fallback states;
- expose plain-text/normalized helpers for snapshot tests.

### Registration

After the game reaches release quality:

```ts
import { runDungeonCourierGame } from './dungeon-courier';

{
  id: 'dungeon-courier',
  name: 'Dungeon Courier',
  description: 'Read the label. Choose the route. Deliver it intact.',
  maturity: 'workshop',
  pace: 'turn-based',
  difficulty: 2,
  session: '10–15 min',
  run: runDungeonCourierGame,
}
```

Also export the runner and update the README active-game list only when implementation, tests, and lifecycle checks pass.

## Content authoring rules

- Every parcel label fits in two compact lines: command plus consequence.
- Every signature rule has at least one tutorial/example floor situation before it appears with a hard seal.
- Every damage event can name its source and handling clause.
- Every template supports at least four of the eight parcels; contract selection filters the rest.
- Flavor never hides a mechanical fact. `The bottle is restless` is optional; `TURN AGAIN → SLOSH +1` is mandatory.
- Recipients and parcel contents remain whimsical and non-graphic.
- Avoid real carrier branding, real hazardous-material codes, and claims of realistic shipping practice.

## Testing plan

Follow the repository's existing Vitest pattern. Pure model tests are more valuable than snapshots of every ANSI frame.

### Parcel-rule tests

- Each of the eight signature rules modifies precisely the documented action(s).
- Moonwater tracks consecutive movement direction, clears after three straight steps, and ignores non-movement UI commands.
- Sleeping Bell counts only documented noise sources and triggers investigation exactly at threshold.
- Sunless Film exposure uses tile state after player movement and before the next shift.
- Folded Familiar rejects Hurry without mutating state and collapses weak floor only after leaving it.
- Memory Mirror maintains exactly six visited tiles and clears at anchors.
- Hearthseed heat advances on Wait/Brace and clears on wet tiles in the documented order.
- Compass Needle polarity and forced north movement resolve deterministically at map edges.
- Every compatible seal passes validation; every banned pair fails with a named issue.
- Rule hook ordering is stable and independent of object insertion order.

### Action and engine tests

- Preview and commit produce identical time/stress/meter consequences for unchanged state.
- Illegal movement, modal input, and cancelled confirmation leave serialized state unchanged.
- Stress overflow, guard consumption, and multiple condition loss follow the formula exactly.
- Action cost greater than one advances threats, deadlines, meters, and shifts once per tick.
- Shift and patrol order at the same tick matches the documented pipeline.
- Hurry checks both intermediate and destination tiles.
- Contact consequences displace only to valid advertised tiles.
- Dropping/picking up items preserves stable IDs and updates movement preview immediately.
- Sacrifice confirmation cannot consume the wrong slot after inventory reorder.
- Delivery resolves once, records one report, and cannot be triggered twice.
- Failure records the decisive event before changing phase.
- Restart with the same seed recreates offers, floor, schedule, threats, loot, and upgrades.

### Generator tests

- Same seed/content version/delivery index produces byte-identical normalized content.
- Different RNG streams prevent flavor/content-table additions from changing topology.
- All six templates pass socket and geometry validation in every allowed transformation.
- At least 10,000 assembled floors pass ID, bounds, reachability, route-count, counter-tool, and recipient-access checks.
- Every offered contract has at least one solver-verified successful path.
- Deadlines are not below conservative solver cost plus the configured Standard margin.
- No parcel repeats in one run and no three-offer set has only one route behavior.
- Runtime fallback is deterministic and its test frequency remains below the target.
- Generated dynamic groups never place an unannounced lethal transform under start/recipient.

### Route and solver tests

- Weighted path costs change appropriately for different parcels on the same map.
- Stable/fast/supply alternatives are genuinely distinct by cells or required resources.
- Solver models shift phase, condition, stress, inventory consumption, and relevant parcel histories.
- Dominance pruning never removes a strictly better state.
- Known hand-authored solvable/unsolvable fixtures return expected results under the expansion cap.

### Rendering and lifecycle tests

- Compact layout fits `80x28` without cursor writes outside bounds.
- Wide layout uses extra space without changing the logical map.
- Too-small terminal displays required/current size and refuses traversal commands.
- ANSI-visible-width centering works for every chosen glyph and ASCII fallback.
- Condition, stress, secondary meter, deadline, and next shift are readable without color.
- Long labels/notices wrap or truncate without overwriting map/action rows.
- Pause/resume/restart/quit/list/next dispose or preserve listeners as intended.
- Alternate buffer and cursor state are restored once after every exit path.
- Manual passes cover dark/light theme, Unicode/ASCII mode, resize, reduced-effects setting, and rapid key input.

## Balance instrumentation

Add a development-only overlay toggled by a non-advertised debug key or build flag:

```text
SEED 7K4D-91QP  FLOOR 2  TEMPLATE CLOISTER-B  TICK 23/58
PARCEL moonwater + rush   COND 4/5  STRESS 1/3  SLOSH 2/3
PREVIEW E: time 1 stress +1 slosh +1  DAMAGE 0  rule STEADY_COURSE
ROUTES stable=31/0d  fast=22/1rope/1d  bench=37/0d
SOLVER cost=28 expansions=1842  GEN attempts=2  fallback=no
```

End-run debug data should include:

- seed/content version/template and generation attempts;
- contract choices and declined offers;
- path trace and route overlay usage;
- action counts by Step/Hurry/Brace/Wait/tool;
- stress sources, condition loss, and clause violations;
- tools acquired, used, dropped, recovered, and sacrificed;
- ticks under/over par and time spent waiting for shifts;
- threat contacts and forecast visibility;
- solver baseline versus player route;
- final grade and failure reason.

Use instrumentation to identify unclear rules. If many players violate the same clause after seeing it, improve label wording, preview emphasis, or teaching situation before simply lowering difficulty.

## Accessibility and usability

- Never rely on red/green, animation, or Unicode alone.
- Offer a global ASCII-glyph mode if terminal-width checks or user preference require it.
- Keep all controls keyboard-only with arrows and WASD equivalents.
- Show full written action consequences (`+1 STRESS`, `GATE CLOSES`) rather than icons alone.
- Provide reduced-effects mode: no screen shake/glitch, single-frame shift highlight.
- Provide Assist Route mode as a run modifier: +20% deadline margin, route overlay always available, and one-action undo until a cache reveal, threat contact, item consumption, or random-content reveal makes undo unsafe.
- Assisted runs remain fully playable and are labeled in the final report; they are not treated as failures.
- Pause is always available and freezes presentation effects.
- No action depends on reaction time.
- Parcel rules use short imperative labels and a detailed help explanation.

## Implementation milestones

### Milestone 0 — Paper rules and route prototype

Create two ASCII floors and manually play Porcelain Choir and Moonwater Ampoule on both. Track every action in a small table using the proposed stress formula. Prototype the `80x28` wireframe in plain text.

**Done when:** five complete sample routes produce no ambiguous action order, the two parcels favor meaningfully different paths, and all required compact UI fields fit.

### Milestone 1 — Pure movement vertical slice

Implement `types.ts`, `seed.ts`, a static floor fixture, action evaluation, Step/Hurry/Brace/Wait, stress/condition, Porcelain Choir, Moonwater Ampoule, and engine tests. No terminal controller yet.

**Done when:** command transcripts reproduce state exactly; preview equals commit; illegal actions do not mutate; package choice changes weighted best route on the same fixture.

### Milestone 2 — One playable delivery

Implement controller, input, renderer, shared pause menu, terminal lifecycle, compact layout, parcel panel, route preview, one rotating bridge, one porter beetle, Felt Padding, Courier Rope, a recipient, and a delivery report.

**Done when:** a player can complete one delivery at `80x28` and `96x32`, in a dark and light theme, without developer controls or lifecycle leaks.

### Milestone 3 — Seeded floor generation

Add three templates, seeded transforms/placements, dynamic schedules, package-weighted A*, validation, bounded solver, fallback floors, contract offers, and same-seed replay.

**Done when:** 10,000 test floors are deterministic and valid, all offered contracts have solver paths, fallback frequency meets target, and route estimates explain their resource/stress assumptions.

### Milestone 4 — Full handling system and inventory decisions

Add all eight parcels, six seals/compatibility table, all twelve tools, valuables, dropping/recovery, sacrifice niches, secondary meters, all five shift mechanisms, and all four threat types.

**Done when:** every rule has table tests, every content combination validates, and blind players can predict the selected action consequence from label plus preview.

### Milestone 5 — Three-delivery roguelike run

Add run progression, delivery scaling, ten upgrades, score/pay/ranks, reports, ending/failure, persistence for preferences/best result/last seed, and remaining templates.

**Done when:** three deliveries complete in 10–15 minutes, contract offers create distinct build/route choices, and the third floor is demanding without requiring a specific lucky drop.

### Milestone 6 — Tutorial, balance, and release polish

Add the authored tutorial, help, Assist Route, ASCII/reduced-effects modes, final visual pass, README/registry integration, debug instrumentation, and blind playtest tuning.

**Done when:** a new player can explain stress, brace, shift forecast, parcel clause, and sacrifice choice after the tutorial; all automated tests/typecheck/build pass; every exit/restart path restores the terminal cleanly.

## Recommended implementation order within files

1. `types.ts`: lock serializable contracts and IDs.
2. `seed.ts`: deterministic PRNG/mixing and seed formatting.
3. `packageRules.ts`: generic action pipeline plus two first parcels.
4. `engine.ts`: static fixture, commands, ticks, stress, delivery.
5. `engine.test.ts` and `packageRules.test.ts`: prove semantics before rendering.
6. `render.ts` and `input.ts`: compact traversal screen and phase routing.
7. `index.ts`: controller/lifecycle/pause integration.
8. `templates.ts`, `pathfinding.ts`, `generator.ts`, `validate.ts`: generation after the hand-authored vertical slice is fun.
9. Expand content and tests in pairs; never add a parcel without a fixture and validation case.
10. Register/update README only after lifecycle, typecheck, test, and build gates pass.

## Major risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Parcel rules feel like arbitrary exceptions | Players repeatedly consult help instead of reasoning. | One-line imperative labels, common stress language, no more than one signature + one seal, exact previews. |
| Best play becomes Brace every other turn | Safe but tedious dominant strategy. | Deadlines, parcel-specific Brace costs, route anchors, heat/wake rules, limited benefit once stress is zero. |
| Procedural floors are technically solvable but ugly | Solver proof does not guarantee interesting choice. | Authored topology templates, route-role metrics, playtest fixtures, distinct-path validation. |
| Full forecast removes tension | Player can calculate without pressure. | Keep information honest but combine clocks, consumables, load, and interacting deterministic threats. Tension comes from trade-offs, not hidden facts. |
| Too many meters overwhelm compact UI | Eight parcel ideas could create eight interfaces. | At most one secondary meter per base parcel; same meter component; only active rule explanations shown. |
| Inventory becomes generic loot management | Distracts from package movement. | Four slots, small item catalog, every item connects to routes/handling, no equipment-stat spreadsheet. |
| Generator validation is slow | Temporal state can explode. | Small maps/deadlines, authored mechanisms, compact solver state, dominance pruning, offline mass tests, deterministic fallback. |
| Game resembles Last Train Home or Quiet Heist | Route/forecast patterns already exist in Gamr. | Player directly traverses; the parcel changes movement; persistent dropped load and handling stress are the core, with no unit dispatch or stealth objective. |
| Unicode breaks alignment | Terminal game becomes unreadable. | One-cell vocabulary, visible-width helper, xterm tests, ASCII mode, `80x28` manual checks. |

## Version 1 non-goals

- Combat, attack animations, weapon loot, enemy health, bosses, or damage builds.
- A scrolling open world, town hub, or long narrative campaign.
- Freeform procedural rules or arbitrary parcel/seal combinations.
- Physics simulation, real fragile-shipping standards, or training claims.
- Mouse controls, online leaderboards, accounts, cloud saves, or network play.
- Permanent power progression or grind-based unlocks.
- Real-time movement pressure.
- More than one active secondary parcel meter.
- Destructible dungeon simulation beyond authored weak floors and shift groups.
- Runtime AI-generated parcel text.
- Localization before compact English layouts and content schemas stabilize.

## Definition of done

Dungeon Courier is ready to ship when:

1. A complete Standard Run contains three deterministic, distinct deliveries and reliably lasts about 10–15 minutes.
2. Eight parcels materially alter action legality, cost, stress, terrain interaction, or timing; none is merely a health/reward modifier.
3. Every committed action can be previewed with time, stress, meter, shift, and likely condition effects using the same engine logic.
4. Every offered contract/floor pair passes static validation and a bounded temporal solvability check, with a deterministic fallback for unexpected failure.
5. The map exposes meaningful stable, shortcut, and supply-route decisions for the current parcel.
6. Inventory dropping, recovery, and sacrifice create real trade-offs without exceeding the compact four-slot model.
7. Threats are predictable and solvable without attacks; the game contains no combat verbs or enemy health.
8. The tutorial teaches label, preview, stress, brace, shift clock, route choice, and leaving something behind through play.
9. Engine, rule, generator, solver, and key rendering/lifecycle tests pass, including same-seed command replay.
10. The game is readable at `80x28`, supports light/dark themes and ASCII fallbacks, and never relies on color alone.
11. Pause, restart, quit, list-games, next-game, terminal resize, and controller stop paths dispose resources and restore the terminal exactly once.
12. Blind playtest failures are described as understandable route or handling mistakes, not hidden information, unclear labels, impossible seeds, or dropped input.

## Final design test

Before implementation expands beyond the vertical slice, run one decisive comparison on the same floor:

- Porcelain Choir should prefer bracing around a short rough shortcut or taking a stable hall.
- Moonwater Ampoule should prefer a longer straight colonnade over a winding “safe” hall.
- Folded Familiar should treat the floor as a one-way load-planning problem.
- Memory Mirror should value loops, anchors, and non-retracing connectors differently from all three.

If the best path and action rhythm remain basically identical for those four parcels, the central promise has not yet been achieved. Fix package rules and floor topology before adding more content, upgrades, effects, or story.
