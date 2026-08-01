# Botany Lab — Full Game Design and Implementation Plan

## Product decision

**Botany Lab is a deterministic, turn-based optimisation puzzle about cultivating alien specimens in four sealed growth chambers.** The player distributes limited light and water, performs one lab operation per cycle, combines mutations into useful phenotypes, and ships plants that satisfy visible research contracts. The same high-output traits that make a specimen valuable also create root pressure and airborne spores, so growth and containment are one connected problem.

The game is deliberately not a farming simulator, idle game, or real-time crisis game. Nothing advances until the player commits a lab cycle. Configuration is reversible before commitment, the next cycle is previewed exactly, and a first containment mistake does not immediately end the run. A standard shift lasts 12 cycles and should take 10–15 minutes after the tutorial.

Version 1 is a complete, seedable game with:

- a 2×2 array of growth chambers;
- shared light-power and irrigation budgets;
- five alien species with distinct response profiles;
- ten mutations and eight named two-mutation expressions;
- local root pressure and a shared spore-filter containment system;
- fifteen authored contract templates arranged in three difficulty tiers;
- a six-cycle guided tutorial and a 12-cycle standard shift;
- exact cycle forecasting, same-seed replay, and deterministic content generation;
- a terminal-native 80×28 interface with a deliberate glyph vocabulary;
- pure engine logic, replayable command transcripts, content validation, and automated tests.

## The concise player promise

> “I tuned the lamps, let the vine become dangerously luminous, spliced in a sterile crown just before it flowered, and shipped a perfect beacon specimen with one filter cycle to spare.”

Every good run should produce a story like this: a small number of understandable inputs create a surprising plant, the plant creates a visible containment problem, and the player turns that problem into a contract solution.

## Design pillars

1. **Configure calmly, then commit.** Light, water, and the pending operation may be revised without cost. Only `Enter` advances the simulation.
2. **One system, two consequences.** Productive growth improves contract traits and usually increases root or spore pressure. Containment is not a disconnected penalty meter.
3. **Mutation means recombination, not roulette.** The player chooses from deterministic mutation offers. Pairs can unlock named expressions with clearly previewed benefits and liabilities.
4. **Forecast everything mechanical.** Before commitment, the selected chamber and facility panel show exact stat deltas, pressure changes, filter load, newly satisfied contracts, and any breach.
5. **Four chambers are enough.** Depth comes from shared resource budgets, adjacency, timing, and contracts rather than a large board or many currencies.
6. **Plants must visibly become strange.** Compact growth grammars make each specimen branch, flower, glow, wilt, and mutate in the terminal without turning its appearance into hidden state.
7. **Failure teaches instead of erasing.** The first two escapes cost biosecurity seals and destroy the culprit, but the shift continues. The third escape shuts down the lab.
8. **A complete rule set fits on one help screen.** Initial play uses arrows, `L`, `W`, `Space`, and `Enter`; contextual operations live inside one menu.

## Research basis and deliberate abstraction

The mechanics use a few real ideas as inspiration, then simplify them aggressively for playability:

- Plant-growth models commonly treat light, water, and nutrients as interacting constraints, with allocation changing under the most limiting resource. Botany Lab translates this into `growth = min(light fit, water fit)` followed by light-mode-specific allocation into mass, bloom, or glow. See the review of [resource allocation in plant growth models](https://pmc.ncbi.nlm.nih.gov/articles/PMC3179639/) and the overview of [plant growth modelling and architecture](https://pmc.ncbi.nlm.nih.gov/articles/PMC2710283/).
- Plant development can be represented with rewriting systems and compact growth grammars. The renderer uses a constrained, stage-based grammar inspired by [L-system plant modelling](https://algorithmicbotany.org/papers/) rather than implementing a general botanical simulator.
- In invasion biology, establishment risk depends strongly on propagule pressure and on whether the receiving environment is suitable. The game turns this into cumulative airborne spore load plus chamber-specific root pressure, both modified by the plant and its environment. See the [meta-analysis of propagule pressure and establishment](https://pmc.ncbi.nlm.nih.gov/articles/PMC5933808/) and the [joint propagule-pressure/invasibility model](https://pmc.ncbi.nlm.nih.gov/articles/PMC2275890/).

These sources justify the direction, not the numeric balance. Alien species, mutations, contracts, thresholds, and all output values are fictional and designed for legibility. The game must never present itself as a real greenhouse, biosecurity, or genetics model.

## What the game is not

The following are explicit Version 1 exclusions:

- no real-time growth, timers, idle income, or input-speed challenge;
- no free-form genetic sequence editor;
- no random mutation failure after the player confirms a splice;
- no more than four simultaneous plants;
- no temperature, soil chemistry, fertilizer, pests, employees, money shop, or equipment tree;
- no permanent metagame unlocks required to make contracts solvable;
- no hidden contract requirements or probabilistic containment breaches;
- no fully simulated L-system geometry affecting rules;
- no online service, account, leaderboard, or save migration beyond the state version;
- no endless mode until the standard shift is demonstrably balanced.

## Session structure

### Modes

| Mode | Length | Chambers | Purpose |
|---|---:|---:|---|
| Training Protocol | 6 cycles | 2 active | Teaches configure → forecast → commit, then contracts, mutation, and filter service. |
| Standard Shift | 12 cycles | 4 | Full seeded optimisation puzzle. |

The start screen exposes only:

```text
P  STANDARD SHIFT
T  TRAINING PROTOCOL
Q  QUIT
```

There is no campaign selector or upgrade screen in Version 1.

### Standard-shift arc

| Segment | Cycles | Design purpose |
|---|---:|---|
| Establish | 1–3 | Learn the starting species, create basic mass/bloom/glow, fulfill or approach a simple contract. No generated opening may force a breach here. |
| Specialise | 4–7 | Add cultures, spend mutation reagent, discover a pair expression, and start competing for UV/soak capacity. |
| Contain | 8–10 | High-output plants stress seals and filter capacity. Shipping, pruning, and filter service become timing decisions. |
| Deliver | 11–12 | Finish advanced contracts, protect the remaining seals, and convert the lab into a final report. |

Familiar runs should average 35–60 seconds per cycle. The game has no turn timer.

## Core loop

Each cycle follows one stable pattern:

1. Inspect the three active contracts, facility budgets, filter forecast, and four chambers.
2. Select a chamber with the arrow keys.
3. Press `L` to cycle its lamp mode and `W` to cycle its irrigation mode. Configuration changes are free and reversible.
4. Optionally press `Space` and queue one contextual lab operation: seed, splice, prune, service filter, deliver, or cull.
5. Read the exact cycle forecast. Resolve any over-budget configuration or predicted containment breach.
6. Press `Enter` to commit.
7. The engine applies the operation, grows every plant simultaneously, resolves mutation/adjacency effects, updates containment, and advances the contract board.
8. Repeat until the shift reaches Cycle 12, the funding target is met early and the player elects to close, or biosecurity reaches zero.

The recurring questions are:

- Which plants receive the scarce UV lamp and soak line this cycle?
- Do I spend the operation on faster mutation, immediate containment, a new seed, or a shipment?
- Can one mutation pair meet two contract requirements without making the plant impossible to contain?
- Should I ship a merely adequate specimen now or grow it one more cycle for an early-delivery bonus?
- Can an adjacency mutation let one chamber grow while its own lamp or irrigation is off?

## The lab board

The lab contains four orthogonally adjacent chambers in a 2×2 layout:

```text
A1 ─ A2
│    │
B1 ─ B2
```

Adjacency is orthogonal only. A1 touches A2 and B1; it does not touch B2. Chamber IDs are also the stable reading and resolution order: A1, A2, B1, B2.

Each chamber stores:

- one plant or `null`;
- a persistent lamp mode;
- a persistent irrigation mode;
- local root pressure from 0 to the current seal threshold;
- any one-cycle warning or effect markers;
- a deterministic cosmetic growth seed.

An empty chamber keeps its lamp and irrigation configuration. A newly seeded plant can therefore grow on the cycle in which it is inserted, and the forecast must include that growth.

A standard shift begins with a young Heliox Fern in A1 and one seed-derived young plant in B2 chosen to support an opening contract. Both start at Mass 1, all other productive stats and pressure at 0, and no mutations. Five additional vials are generated: three visible in the rack and two queued. This gives enough total specimens to complete all six generated contracts without making complete clearance the expected outcome.

### Shared facility budgets

The player can configure any chamber, but committed settings must fit both budgets:

| Input | Modes | Cost | Main role |
|---|---|---:|---|
| Lamp | Off | 0 power | Recovery and nocturnal expressions. |
| Lamp | Blue | 1 power | Efficient mass growth. |
| Lamp | Red | 1 power | Flower allocation. |
| Lamp | UV | 2 power | Glow and mutation-specialist output; often stressful. |
| Water | Dry | 0 water | Preferred by xeric species; dangerous to wet species. |
| Water | Mist | 1 water | Flexible baseline hydration. |
| Water | Soak | 2 water | High wet-species output and high root risk. |

Standard budgets are **5 lamp power** and **5 water**. Basic blue/red plus mist configurations fit all four chambers; multiple UV or soak settings compete for the shared supply. This keeps early play forgiving and late specialisation constrained.

The renderer always shows both used and maximum values, for example `LIGHT 4/5` and `WATER 6/5 OVER`. Over-budget editing is allowed so the player can rearrange a plan, but `Enter` is rejected until the configuration is legal.

There is no stored water, battery, money, or per-cycle income.

## Plant state and visible phenotype

Contracts use only current, visible state. A plant has three productive stats, one health stat, and a small set of tags:

| Value | Range | Meaning |
|---|---:|---|
| Mass | 0–12 | Overall vegetative size. High mass also drives root pressure. |
| Bloom | 0–8 | Flowering output. Blooming plants may emit spores. |
| Glow | 0–8 | Bioluminescent output created by UV, darkness, species, and mutations. |
| Stress | 0–6 | Poor environmental fit. At 4+, growth is reduced; at 6 the plant is dormant until recovered. |
| Mutations | 0–2 | Chosen installed mutations. |
| Expressions | derived | Named mutation-pair synergies; never independently mutable. |

Mass, Bloom, Glow, Stress, mutation names, expression names, and root pressure are visible in the selected-chamber panel. Contracts may not inspect an undisclosed counter or historical exposure.

### Base response profiles

Each species defines a fit value from 0 to 2 for every lamp and water mode. Mutations and adjacency effects may raise effective fit to a hard maximum of 3.

| Species | Off | Blue | Red | UV | Dry | Mist | Soak | Identity and risk |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Heliox Fern | 0 | 2 | 1 | 1 | 0 | 2 | 1 | Safe starter; efficient blue mass. |
| Cinder Orchid | 0 | 1 | 2 | 0 | 2 | 1 | 0 | Dry red bloomer; UV-sensitive. |
| Mire Bell | 0 | 1 | 2 | 1 | 0 | 1 | 2 | Rapid wet bloom; heavy spore output. |
| Nocturne Moss | 2 | 1 | 0 | 2 | 0 | 2 | 1 | Cheap dark glow; naturally creeping. |
| Prism Vine | 0 | 2 | 1 | 2 | 0 | 1 | 2 | Flexible high output; severe root risk. |

The exact numbers live in content data, not conditionals spread through the engine.

### Per-cycle growth formula

For each plant, using the state at the start of growth resolution:

```text
effectiveLightFit = clamp(species.lightFit[lamp] + mutation/adjacency modifiers, 0, 3)
effectiveWaterFit = clamp(species.waterFit[water] + mutation/adjacency modifiers, 0, 3)

baseGrowth = min(effectiveLightFit, effectiveWaterFit)
stressPenalty = currentStress >= 4 ? 1 : 0
growth = currentStress >= 6
  ? 0
  : clamp(baseGrowth + growth modifiers - stressPenalty, 0, 3)

massGain = growth + blue-mass modifiers
bloomGain = red and hydrated and resultingMass >= 2 ? 1 + bloom modifiers : 0
glowGain = UV and hydrated ? 1 + glow modifiers : nocturnal modifiers
```

All gains are integers and individually capped before being applied. A normal plant gains 0–3 Mass and 0–2 of Bloom or Glow in one cycle. A strong expression can exceed that only where its content definition explicitly says so.

### Stress update

Stress changes after output is calculated:

```text
+1 if effectiveLightFit is 0
+1 if effectiveWaterFit is 0
+1 for UV when the species/mutations do not provide UV tolerance
-1 if both fits are at least 1 and no positive stress was added
additional explicit mutation modifiers
clamp to 0...6
```

At Stress 4–5, the next cycle loses one growth. At Stress 6, the plant becomes dormant: it produces no new Mass, Bloom, or Glow but can recover when placed into a fitting environment. Plants do not die merely from stress in Version 1.

This ordering is intentional: the forecast for the current cycle uses current stress, then reports the resulting stress that will affect the next cycle.

## Mutation system

### Deterministic offers

Each newly created plant receives a seed-derived queue of compatible mutation offers. When the player queues **Splice**:

1. The action panel shows two mutation candidates, their exact modifiers, any expression they would complete, reagent cost, and the current cycle forecast with each candidate.
2. The player chooses one candidate.
3. The choice becomes the pending operation and is not applied until `Enter`.
4. Committing consumes one mutation reagent and installs the mutation before growth for that cycle.
5. A plant has two mutation slots. Duplicate mutations are illegal.

The offer queue contains four unique compatible mutations. Each splice exposes the next two as a candidate window; choosing one removes only the chosen mutation, leaving the other candidate available for the next splice. The generator must place both mutations of any required contract expression in reachable windows for at least one available specimen.

Standard shifts begin with four mutation reagents. Reagents are not random rewards and are never required for Tier 1 contracts.

### Mutation content

| Mutation | Benefit | Containment or growth trade-off |
|---|---|---|
| Solar Sails | +1 Blue fit; +1 extra Mass under Blue. | At Mass 8+, growing adds +1 root pressure. |
| Reservoir Bladders | Dry fit is at least 1; +1 Soak fit. | Soak growth adds +1 root pressure. |
| Ember Corolla | +1 Bloom under Red. | +1 airborne spore output while blooming. |
| Lumen Veins | +1 Glow under UV; grants UV tolerance. | UV uses the same expensive 2-power lamp. |
| Anchor Roots | One additional Stress recovery in a fitting cycle. | Any positive growth adds +1 root pressure. |
| Sterile Crown | Airborne spore output becomes 0. | Base Bloom gain is reduced by 1, minimum 0. |
| Mirror Skin | +1 UV fit and activates light reflection. | If reflection triggers, the source gains +1 Stress. |
| Mycelial Bridge | Activates water sharing with adjacent chambers. | If sharing triggers, the source gains +1 root pressure. |
| Night Clock | Off fit is at least 1; +1 Glow while Off and hydrated. | Red fit is reduced by 1. |
| Runner Nodes | +1 Mass under Soak. | +2 root pressure whenever the bonus triggers. |

Every mutation entry contains machine-readable modifiers and separate display text. The engine must never parse the prose.

### Named pair expressions

Installing two compatible mutations can automatically express a named phenotype. Expressions are derived from mutation IDs every time state is evaluated; they are not separately stored as authoritative state.

| Required pair | Expression | Additional effect |
|---|---|---|
| Solar Sails + Ember Corolla | Solar Corolla | Red cycles that produce Bloom also produce +1 Mass. |
| Reservoir Bladders + Lumen Veins | Starwell | Soak + UV gives +2 additional Glow and +1 additional root pressure. |
| Ember Corolla + Sterile Crown | Sealed Bouquet | Cancels Sterile Crown's Bloom penalty while retaining zero spore output. |
| Mirror Skin + Lumen Veins | Prism Relay | A successful reflection gives the dark neighbour +1 additional Glow. |
| Mycelial Bridge + Reservoir Bladders | Shared Cistern | Water sharing grants +2 effective Water fit instead of +1. |
| Night Clock + Lumen Veins | Moon Lantern | Off + hydrated produces +2 additional Glow and recovers 1 Stress. |
| Anchor Roots + Runner Nodes | Living Trellis | Chamber root threshold is +2 for this plant; Runner Nodes adds only +1 pressure. |
| Solar Sails + Mirror Skin | Heliostat Canopy | An adjacent Off chamber may use the source's Blue fit as 1 Light fit. |

Expressions produce a discovery accent and a log entry the first time they appear in a run. Discovery is informational and contributes a small end score bonus; it is not permanent progression.

### Cross-chamber interactions

Only three adjacency rules exist in Version 1:

1. **Mirror reflection:** a UV-lit plant with Mirror Skin grants each orthogonally adjacent Off plant +1 effective Light fit. Prism Relay also grants those neighbours +1 Glow. Heliostat Canopy permits the same Light-fit transfer while the source uses Blue instead of UV. A source that reflects pays +1 Stress total, not per neighbour.
2. **Mycelial sharing:** a plant with Mycelial Bridge and effective Water fit 2+ grants each adjacent plant with base Water fit 0 a +1 Water-fit boost. The source gains +1 root pressure total if any transfer occurs.
3. **Bloom contact:** two adjacent blooming plants do not gain stats, but each adds +1 spore output. This makes dense flower production efficient but dangerous.

All cross-chamber modifiers are calculated from an immutable pre-growth snapshot and applied simultaneously. A boost created during the current resolution cannot recursively create another boost.

## One operation per cycle

Configuration is free; physical lab work is scarce. The player may queue zero or one operation:

| Operation | Legal target | Resolution and purpose |
|---|---|---|
| Seed | Empty chamber + visible vial | Inserts that species before growth and consumes the vial. |
| Splice | Plant with open mutation slot + reagent | Installs the selected offered mutation before growth. |
| Prune | Plant | `Mass -2`, `Bloom -1`, local root pressure `-3`, all clamped. |
| Service Filter | Facility | Reduces filter load by 6, minimum 0. Selection does not matter. |
| Deliver | Plant matching an active contract | Ships/removes the plant, awards funding, and queues the next contract before growth. |
| Cull | Any plant | Removes it and reduces that chamber's root pressure to 0. Emergency containment with no reward. |

The operation is shown as `PENDING` and can be changed or cancelled before commitment. It resolves before growth so a splice affects the same cycle, a seed receives the configured inputs immediately, and a shipped/cull plant emits nothing that cycle.

There are always three visible seed vials in the rack when stock remains. Filling a rack slot from the deterministic queue does not consume an operation beyond the Seed operation itself.

## Contracts

### Contract model

Three contracts are visible at once. Completing one reveals the next contract from the generated queue at the end of the committed cycle. Contracts do not disappear at a hard deadline. Instead, each has a **priority cycle**:

- delivery on or before the priority cycle grants the displayed `+1 early funding`;
- delivery later remains legal and grants its base funding;
- unfulfilled contracts simply remain until the shift ends.

This creates timing pressure without turning one missed date into an unsalvageable run.

A shipment removes the whole plant. If a specimen matches multiple active contracts, the Deliver menu makes the player choose one; a single specimen never completes two contracts.

### Requirement DSL

```ts
type ContractRequirement =
  | { kind: 'statMin'; stat: 'mass' | 'bloom' | 'glow'; value: number }
  | { kind: 'statMax'; stat: 'stress' | 'rootPressure'; value: number }
  | { kind: 'species'; speciesId: SpeciesId }
  | { kind: 'speciesTag'; tag: SpeciesTag }
  | { kind: 'mutation'; mutationId: MutationId }
  | { kind: 'expression'; expressionId: ExpressionId }
  | { kind: 'sterile' }
  | { kind: 'mutationCount'; value: 0 | 1 | 2 };
```

Natural-language contract copy is generated from, but never used to evaluate, these requirements. The contract card and Deliver menu show a checklist against the selected plant.

### Contract tiers and examples

| Contract | Tier | Requirements | Base funding | Priority |
|---|---:|---|---:|---|
| Verdant Biomass | 1 | Mass ≥ 6, Stress ≤ 3 | 2 | Opening +4 cycles |
| Ceremonial Bloom | 1 | Bloom ≥ 3, Stress ≤ 3 | 2 | Opening +4 |
| Lantern Sample | 1 | Glow ≥ 3, Mass ≥ 3 | 2 | Opening +5 |
| Unmodified Control | 1 | Mass ≥ 5, 0 mutations | 2 | Opening +5 |
| Dryland Orchid | 1 | Cinder Orchid, Bloom ≥ 2 | 2 | Opening +4 |
| Sterile Bouquet | 2 | Bloom ≥ 4, sterile | 3 | Activation +4 |
| Safe Giant | 2 | Mass ≥ 9, root pressure ≤ 5 | 3 | Activation +4 |
| Prism Culture | 2 | Glow ≥ 5, any expression | 3 | Activation +5 |
| Dual-Use Specimen | 2 | Mass ≥ 6, Bloom ≥ 3, Glow ≥ 2 | 3 | Activation +5 |
| Rooted Survivor | 2 | Anchor Roots, Stress ≤ 1, Mass ≥ 7 | 3 | Activation +5 |
| Deep-Space Beacon | 3 | Starwell or Moon Lantern, Glow ≥ 7 | 4 | Cycle 12 |
| Biosecure Floral Array | 3 | Sealed Bouquet, Bloom ≥ 6, Stress ≤ 2 | 4 | Cycle 12 |
| Living Trellis Sample | 3 | Living Trellis, Mass ≥ 11, root pressure ≤ 7 | 4 | Cycle 12 |
| Heliostat Demonstrator | 3 | Heliostat Canopy, Glow ≥ 4, Mass ≥ 8 | 4 | Cycle 12 |
| Impossible Colors Grant | 3 | any 2 mutations, Bloom ≥ 4, Glow ≥ 5 | 4 | Cycle 12 |

The shipped Version 1 pool contains at least fifteen templates. Exact values must be tuned from automated witness recipes and playtests, not treated as final because they appear in this plan.

### Contract queue generation

A standard run generates six contracts:

- two Tier 1;
- two Tier 2;
- one Tier 3;
- one wildcard from Tier 1 or 2.

Generation constraints:

1. At least one opening contract is satisfiable without mutation.
2. No opening set requires more copies of a species than are available in the starting plants plus visible/queued vials.
3. At most one active contract names an exact species.
4. At most one active contract requires a particular expression.
5. The mutation decks and vial queue contain witness paths for the selected advanced contracts.
6. A reference transcript can reach the 12-funding target without spending all three biosecurity seals.
7. Contract order, vial order, and mutation offers are derived from independent named seed streams.

Use authored witness recipes and a bounded validation solver; do not try to make arbitrary random requirements and repair them afterward.

## Containment and invasive escape

Containment is deterministic and has two visible paths.

### Local root pressure

Each chamber begins at Pressure 0 with a base threshold of 8. Positive growth adds:

```text
rootGain = species.baseRooting
         + floor(max(0, massGain - 1) / 2)
         + explicit mutation/expression modifiers
```

Soak and invasive mutations can add more. Pruning reduces pressure by 3; delivery/culling removes the plant and resets it to 0. Living Trellis raises the threshold to 10 for its plant.

If resulting pressure reaches or exceeds the threshold, the chamber breaches.

### Shared airborne filter

The facility filter begins at Load 0 with Capacity 9. Each blooming plant emits after growth:

```text
sporeOutput = species.baseSporesIfBlooming
            + bloomGain
            + mutation/expression modifiers
            + adjacentBloomContact
            - sterility modifiers
```

Output is clamped to 0...5 per plant. The filter load is cumulative across cycles. Service Filter reduces it by 6 before the current cycle's emissions.

If resulting load exceeds Capacity 9, airborne propagules escape.

### Incident resolution

Containment incidents resolve after all plant outputs are applied:

1. Collect local breaches and sort by overflow descending, then chamber ID.
2. Resolve each local breach: lose one biosecurity seal, auto-cull that plant, reset the chamber pressure, and log the exact cause.
3. If the filter is over capacity and at least one seal remains, resolve one airborne incident: lose one seal, auto-cull the highest current emitter (ties by chamber ID), and emergency-scrub filter load to 4.
4. If biosecurity reaches 0, stop resolving plant consequences and enter `gameOver` with a shutdown report.

The preview uses this exact same resolver, so simultaneous incidents cannot surprise the player. A red `BREACH ON COMMIT` line identifies the chamber and/or filter before `Enter`.

### Biosecurity seals and failure

The lab starts with three seals:

- 3 seals: clean lab;
- 2 seals: one documented escape, run continues;
- 1 seal: final warning, run continues;
- 0 seals: immediate lab shutdown and failed shift.

A successful shift may contain one or two incidents, but the best rank requires a clean lab. This provides recovery without making “do not let invasive species escape” optional.

The first generated three cycles must have at least one legal no-breach line. The tutorial's first incident is forecast but preventable.

## Funding, score, victory, and reports

### Primary objective

The standard target is **12 Funding by the end of Cycle 12**, with at least one biosecurity seal remaining.

The player may close the shift early once the target is reached, but the confirmation panel must explain that remaining contracts, clean cycles, and discoveries can improve score.

### Score

Funding determines victory; score differentiates successful labs:

```text
score = funding × 100
      + remainingSeals × 150
      + completedContracts × 25
      + uniqueExpressionsDiscovered × 20
      + unusedMutationReagent × 10
      - containmentIncidents × 50
```

Do not award points for unused light/water or raw plant stats left in chambers. The game should reward purposeful specimens and safe practice, not hoarding.

### Outcome ranks

| Rank | Requirement |
|---|---|
| Xenobotanist | Funding ≥ 15, 3 seals, at least one Tier 3 contract |
| Senior Cultivator | Funding ≥ 12, 2–3 seals |
| Licensed Technician | Funding ≥ 12, 1 seal |
| Grant Deferred | Shift ends below 12 funding but lab remains intact |
| Facility Shutdown | Biosecurity reaches 0 |

The final report shows:

- funding and score breakdown;
- seals remaining and every containment incident;
- completed and unfulfilled contracts;
- named expressions discovered;
- a “specimen of the shift” chosen by delivered contract value, then stats;
- seed and same-seed replay command;
- `R` replay, `N` next game, `Q` quit.

## Determinism and randomness policy

Gameplay must never use `Math.random()`.

Use a serializable 32-bit PRNG with independent streams:

```ts
interface RunSeedStreams {
  contracts: RngState;
  vials: RngState;
  mutations: RngState;
  names: RngState;
  cosmetics: RngState;
}
```

- `contracts` selects compatible authored templates.
- `vials` creates species stock order.
- `mutations` creates per-plant compatible offer queues.
- `names` gives specimens harmless callsigns.
- `cosmetics` drives title flicker and non-mechanical accents only.

Changing cosmetic rendering must not change any gameplay stream. A seed plus command transcript must recreate the same state hashes, contract queue, vial queue, mutation offers, forecasts, incidents, and result.

## Exact cycle resolution order

This order is part of the rules and must be documented near `resolveCycle`:

1. Validate phase, budgets, operation legality, reagent/vial availability, and contract target.
2. Clone the authoritative state.
3. Apply the pending operation.
4. Derive mutation expressions for all remaining/new plants.
5. Snapshot species, stats, configurations, pressure, mutations, expressions, and adjacency.
6. Calculate base Light and Water fit for every plant.
7. Calculate Mirror Skin and Mycelial Bridge contributions from the snapshot.
8. Calculate each plant's growth, stat deltas, stress delta, root delta, and spore output without mutating neighbours.
9. Apply all plant deltas simultaneously in chamber-ID order for stable event text.
10. Re-derive expressions and visual growth stage.
11. Add airborne output to filter load.
12. Resolve local breaches, then a possible filter breach.
13. Award a queued delivery, fill its contract slot, and refill any vial slot. Delivery funding is known from Step 3 but contract-board replacement waits until here for a clean presentation.
14. Record newly discovered expressions and contract-ready notices.
15. Increment cycle and evaluate shutdown, early-close eligibility, or end-of-shift result.
16. Store ordered engine events, clear the pending operation, and return the new state plus forecast/result metadata.

Preview and commit both call the same pure function:

```ts
const projection = resolveCycle(state, state.pendingOperation);

// Preview renders projection without assigning it.
// Commit assigns projection.state and records projection.events.
```

There must not be a second “approximate preview” implementation.

## Core TypeScript model

```ts
export type Phase =
  | 'start'
  | 'briefing'
  | 'running'
  | 'won'
  | 'report'
  | 'gameOver';

export type LampMode = 'off' | 'blue' | 'red' | 'uv';
export type WaterMode = 'dry' | 'mist' | 'soak';
export type ChamberId = 'a1' | 'a2' | 'b1' | 'b2';

export interface PlantState {
  id: string;
  name: string;
  speciesId: SpeciesId;
  age: number;
  mass: number;
  bloom: number;
  glow: number;
  stress: number;
  mutationIds: MutationId[];
  mutationOfferQueue: MutationId[];
  discoveredExpressionIds: ExpressionId[];
  visualSeed: number;
}

export interface ChamberState {
  id: ChamberId;
  plant: PlantState | null;
  lamp: LampMode;
  water: WaterMode;
  rootPressure: number;
  lastRootDelta: number;
}

export type PendingOperation =
  | { type: 'seed'; chamberId: ChamberId; vialId: string }
  | { type: 'splice'; chamberId: ChamberId; mutationId: MutationId }
  | { type: 'prune'; chamberId: ChamberId }
  | { type: 'serviceFilter' }
  | { type: 'deliver'; chamberId: ChamberId; contractId: string }
  | { type: 'cull'; chamberId: ChamberId }
  | null;

export interface ContractState {
  id: string;
  templateId: ContractTemplateId;
  requirements: ContractRequirement[];
  baseFunding: number;
  priorityCycle: number;
  activatedCycle: number;
}

export interface FacilityState {
  lightBudget: number;
  waterBudget: number;
  filterLoad: number;
  filterCapacity: number;
  biosecuritySeals: number;
  mutationReagent: number;
  funding: number;
  fundingTarget: number;
}

export interface GameState {
  version: 1;
  seed: number;
  mode: 'training' | 'standard';
  phase: Phase;
  cycle: number;
  maxCycles: number;
  chambers: Record<ChamberId, ChamberState>;
  facility: FacilityState;
  activeContracts: Array<ContractState | null>;
  contractQueue: ContractState[];
  completedContracts: CompletedContract[];
  vialRack: Array<SeedVial | null>;
  vialQueue: SeedVial[];
  selectedChamberId: ChamberId;
  pendingOperation: PendingOperation;
  discoveries: ExpressionId[];
  incidents: ContainmentIncident[];
  eventLog: LogEntry[];
  lastEvents: EngineEvent[];
  tutorialStep: number | null;
  helpOpen: boolean;
  score: number;
}
```

`discoveredExpressionIds` on a plant is presentation history only; current expressions are always derived from `mutationIds`. If this field proves redundant, keep only the run-wide discovery log.

### Commands

```ts
export type Command =
  | { type: 'startStandard'; seed?: number }
  | { type: 'startTraining' }
  | { type: 'dismissBriefing' }
  | { type: 'moveSelection'; dx: number; dy: number }
  | { type: 'cycleLamp' }
  | { type: 'cycleWater' }
  | { type: 'queueOperation'; operation: Exclude<PendingOperation, null> }
  | { type: 'cancelOperation' }
  | { type: 'commitCycle' }
  | { type: 'closeShiftEarly' }
  | { type: 'toggleHelp' }
  | { type: 'restartSameSeed' };

export interface CommandResult {
  state: GameState;
  accepted: boolean;
  events: EngineEvent[];
  reason?: string;
}
```

UI-only action-menu selection should stay in the controller where possible. A command enters the engine only when it represents a real state/configuration change.

## Content architecture

Content definitions are declarative and validated at test time.

```ts
interface SpeciesDefinition {
  id: SpeciesId;
  name: string;
  glyph: string;
  asciiGlyph: string;
  tags: SpeciesTag[];
  lightFit: Record<LampMode, number>;
  waterFit: Record<WaterMode, number>;
  baseRooting: number;
  baseSporesIfBlooming: number;
  modifiers: Modifier[];
  growthGrammarId: GrowthGrammarId;
  compatibleMutations: MutationId[];
}

interface MutationDefinition {
  id: MutationId;
  name: string;
  description: string;
  modifiers: Modifier[];
  incompatibleWith?: MutationId[];
}

interface ExpressionDefinition {
  id: ExpressionId;
  name: string;
  requires: [MutationId, MutationId];
  modifiers: Modifier[];
}

interface ContractTemplate {
  id: ContractTemplateId;
  tier: 1 | 2 | 3;
  requirements: ContractRequirement[];
  baseFunding: number;
  priorityOffset: number;
  witnessRecipes: WitnessRecipe[];
}
```

Use a finite modifier union such as `fitDelta`, `statGain`, `stressDelta`, `rootDelta`, `sporeDelta`, `setSporeOutput`, `thresholdDelta`, and `adjacencyRule`. Avoid arbitrary callbacks in content; serializable data is easier to validate and explain.

## Growth visuals

### Constrained grammar

Each species maps Mass into one of five visual stages. A stage is a 7×3 or 7×4 logical bitmap containing semantic tokens rather than final ANSI strings:

```ts
type PlantVisualToken =
  | 'empty' | 'stem' | 'branchLeft' | 'branchRight'
  | 'leaf' | 'bloom' | 'glow' | 'root' | 'stress';
```

The renderer then overlays:

- up to two Bloom markers based on current Bloom;
- up to two Glow markers based on current Glow;
- a mutation accent when mutation slots are filled;
- a warning marker when Stress ≥ 4 or root pressure is within 2 of threshold.

The cosmetic `visualSeed` chooses symmetric branch variants within a stage. It never changes fit, stats, adjacency, or collision. Visual stage progression must be monotonic with Mass except when pruning, when the smaller stage is intentionally shown.

This provides the visual pleasure of growing forms while keeping game state inspectable and renderer tests finite.

### Semantic glyph vocabulary

| Concept | Unicode | ASCII fallback | Colour role |
|---|---|---|---|
| Stem/root | `│` / `┴` | `|` / `+` | Theme colour |
| Leaf/mass | `◆` | `#` | Green/cyan |
| Bloom | `✿` | `*` | Magenta/yellow |
| Glow | `✦` | `+` | Cyan/white |
| Lamp | `☼` | `L` | Blue/red/magenta by mode |
| Water | `≈` | `W` | Cyan |
| Mutation | `⚗` | `M` | Magenta |
| Root pressure | `⌁` | `P` | Yellow/red |
| Filter | `◉` | `F` | Cyan/yellow/red |
| Contract ready | `✓` | `+` | Green |
| Warning | `⚠` | `!` | Yellow |
| Breach | `×` | `X` | Red |
| Empty chamber | `◇` | `.` | Dim theme |

Do not use emoji or glyphs with unreliable double width. The renderer must select a consistent `UNICODE_GLYPHS` or `ASCII_GLYPHS` map and never mix widths inside a frame.

## Terminal UI

### Minimum size

The supported minimum is **80 columns × 28 rows**. Smaller terminals show only a centered resize message with required and current dimensions. A wider layout may add contract explanations and a longer log, but it must not expose information absent at 80×28.

### 80×28 wireframe

```text
 BOTANY // LAB       CYCLE 05/12   FUND 7/12   SEALS ◆◆◆   ⚗ 2
 LIGHT 4/5  WATER 5/5              FILTER ◉◉◉◉○○○○○ 4/9
┌──────────────────────┐┌──────────────────────┐┌─ CONTRACTS ─────────┐
│A1 HELIOX FERN       ✓││A2 PRISM VINE        !││✓ Verdant Biomass    │
│      ◆─│─◆           ││      ✦─│─◆           ││  M6 S≤3  +2 [EARLY] │
│        │             ││     └──┴──⌁          ││○ Sterile Bouquet    │
│M6 B1 G0 S0  ⌁2/8     ││M7 B2 G4 S2  ⌁7/8     ││  B4 STERILE  +3     │
│☼ BLUE   ≈ MIST       ││☼ UV     ≈ SOAK       ││○ Deep-Space Beacon │
└──────────────────────┘└──────────────────────┘│  G7 EXPRESSION +4   │
┌──────────────────────┐┌──────────────────────┐├─ SELECTED A2 ───────┤
│B1 NOCTURNE MOSS      ││B2 ◇ EMPTY            ││Prism Vine // IVY-4  │
│       ✦◆✦            ││                      ││Solar Sails          │
│        │             ││      seed ready      ││Mirror Skin          │
│M3 B0 G5 S1  ⌁3/8     ││☼ OFF    ≈ DRY        ││= Heliostat Canopy   │
│☼ OFF    ≈ MIST       ││                      │├─ FORECAST ──────────┤
└──────────────────────┘└──────────────────────┘│M +2  G +1  S +0     │
 EVENT  Shared Cistern discovered in A1.         │⌁ +2 → 9/8 BREACH!  │
 PENDING: PRUNE A2  | forecast now safe          │Filter +1 → 5/9      │
 ↑↓←→ SELECT  L LAMP  W WATER  SPACE ACTION  ENTER COMMIT  H HELP ESC
```

The exact spacing can change during implementation, but automated width tests must prove that no visible line exceeds 80 stripped columns or row 28.

### Information hierarchy

1. Header: cycle, funding target, seals, mutation reagent.
2. Facility bar: current committed budget usage and filter load.
3. Chamber cards: identity, small plant visual, three stats, stress, root pressure, inputs.
4. Contract panel: three compact checklists; selected plant readiness uses both icon and text.
5. Selected panel: full mutations, expression, and contract compatibility.
6. Forecast: exact next-cycle deltas and warnings.
7. Event/pending line and single-line control footer.

If vertical space becomes tight, shorten flavour and event history. Never remove the forecast, pressure threshold, contract requirements, or control footer.

### Controls

| Context | Input | Result |
|---|---|---|
| Running | Arrow keys | Select one of four chambers. |
| Running | `L` | Cycle Off → Blue → Red → UV for selected chamber. |
| Running | `W` | Cycle Dry → Mist → Soak for selected chamber. |
| Running | `Space` | Open contextual operation menu. |
| Running | `Enter` | Commit the forecast cycle. |
| Running | `Backspace` | Cancel pending operation. |
| Running | `H` | Toggle one-page help. |
| Any play phase | `Esc` | Shared pause menu. |
| Menus | Arrows + `Enter` | Navigate and confirm. |

The contextual operation menu only lists legal or explainably disabled choices for the selected state. Splice opens two candidates; Deliver opens matching contracts; Seed opens visible vials. Filter Service appears regardless of selected chamber because it is a facility action.

The controller must use the shared pause menu and transitions. `Q` is handled through the shared pause/start/report flow rather than as an undocumented destructive shortcut during play.

### Exact preview language

The forecast should be short and causal:

```text
A2  MASS +2  GLOW +1  STRESS +0
ROOT +2 → 9/8  × CHAMBER BREACH
FILTER +1 → 5/9
CHANGE INPUTS, PRUNE, DELIVER, OR CULL BEFORE COMMIT
```

When safe:

```text
A2  MASS +1  BLOOM +2  STRESS -1
ROOT +1 → 6/8   FILTER +3 → 8/9
✓ STERILE BOUQUET WILL BE READY
```

Use `WILL`, not `MAY`, because gameplay is deterministic.

## Tutorial design

Training uses authored state and locked/staged controls rather than setting a boolean on the standard game.

| Step | Cycle | New concept | Required understanding |
|---|---:|---|---|
| 1 | 1 | Select, Lamp, Water, forecast, Commit | Put Heliox under Blue + Mist and see exact Mass gain. |
| 2 | 2 | Contract checklist | Grow until Verdant Biomass becomes ready. |
| 3 | 3 | Deliver operation | Ship the matching plant; see funding and empty chamber. |
| 4 | 4 | Seed and shared budget | Seed Mire Bell and fit two chambers within resource limits. |
| 5 | 5 | Splice and expression preview | Choose Sterile Crown for a blooming plant; see spore difference. |
| 6 | 6 | Filter pressure and service | A scripted high-bloom setup forecasts overflow; service the filter and finish safely. |

Tutorial rules:

- Expose only relevant inputs at each step; disabled inputs explain what they will do later.
- Never require the player to guess a key not visible in the footer.
- If the player selects an unexpected but legal configuration, explain the rule and let them continue unless the lesson requires a specific safe commit.
- Do not consume tutorial progress on an invalid commit.
- End with a concise report and offer Standard Shift, replay, or quit.

## State machine and controller lifecycle

### Phases

```text
start → briefing → running → report → won
                           ↘ gameOver
```

Help and operation menus are controller overlays, not simulation ticks. Pause can overlay any running/menu state and uses the shared `PAUSE_MENU_ITEMS`, `renderSimpleMenu`, and `navigateMenu` helpers.

### Controller requirements

`runBotanyLabGame(terminal)` returns:

```ts
export interface BotanyLabController {
  stop: () => void;
  isRunning: boolean;
}
```

The controller must:

- enter the alternate screen and hide the cursor after setup;
- render at approximately 20 FPS only for title/accent animation;
- never advance game state on the render interval;
- install exactly one key listener;
- clear intervals, dispose the listener, restore cursor, and leave the alternate screen exactly once on `stop()`;
- delegate Quit, Games List, and Next Game to shared transitions;
- preserve the same seed on Restart and use a new seed only for a deliberate new run.

## File layout

```text
src/games/botany-lab/
├── index.ts              # Terminal controller, key mapping, overlays, lifecycle
├── types.ts              # State, commands, content, events, forecast types
├── content.ts            # Species, mutations, expressions, contract templates, glyph metadata
├── seed.ts               # PRNG, named streams, vial/contract/mutation generation
├── growth.ts             # Fits, adjacency contributions, plant output, containment resolution
├── contracts.ts          # Requirement evaluation, queue generation, witness helpers
├── engine.ts             # State creation, commands, operations, resolveCycle, scoring
├── render.ts             # ANSI frame, cards, growth grammar, overlays, reports
├── validate.ts           # Content/schema/witness validation used by tests
├── engine.test.ts
├── growth.test.ts
├── contracts.test.ts
├── render.test.ts
└── validate.test.ts
```

Register the game in `src/games/index.ts`:

```ts
import { runBotanyLabGame } from './botany-lab';

{
  id: 'botany-lab',
  name: 'Botany Lab',
  description: 'Grow strange plants. Fill the contracts. Hold the glass.',
  maturity: 'workshop',
  pace: 'turn-based',
  difficulty: 2,
  session: '10–15 min',
  run: runBotanyLabGame,
}
```

Promote maturity only after the release gates in this plan pass.

## Engine events and explanations

Every material change emits an event:

```ts
type EngineEventKind =
  | 'info' | 'growth' | 'mutation' | 'expression'
  | 'contractReady' | 'delivery' | 'warning'
  | 'breach' | 'filter' | 'complete';

interface EngineEvent {
  kind: EngineEventKind;
  text: string;
  chamberId?: ChamberId;
  contractId?: string;
  value?: number;
}
```

Events are generated from the same modifiers that produced the result. Important logs should be causal:

```text
PRISM VINE +2 MASS — BLUE FIT 2, WATER FIT 2
STARWELL +2 GLOW — UV + SOAK
FILTER +3 — MIRE BELL BLOOM 2, CONTACT +1
A2 BREACHED — ROOT PRESSURE 9/8; SPECIMEN AUTO-CULLED
```

Do not log every zero or repeat unchanged warnings. Keep the visible event log to the newest 4–6 entries, with the full ordered event list available to tests and the final report.

## Content validation and solvability

### Static validation

`validateContent()` must reject:

- duplicate IDs;
- fit values outside 0–2 in base species;
- mutations absent from a species' compatibility list or expression requirement;
- expressions whose mutations are mutually incompatible;
- contracts with impossible bounds or no witness recipe;
- contract display text that disagrees with machine requirements;
- modifiers with unknown triggers, stats, or values;
- species without all five visual stages and ASCII fallbacks;
- any content line that cannot fit its designated 80-column panel after wrapping.

### Witness recipes

Every contract template has at least one machine-readable recipe:

```ts
interface WitnessRecipe {
  speciesId: SpeciesId;
  mutations: MutationId[];
  cycles: Array<{ lamp: LampMode; water: WaterMode }>;
  optionalPruneAt?: number[];
  expectedMaxCycle: number;
}
```

The validator simulates the recipe with the production growth resolver and asserts:

- the contract matches by `expectedMaxCycle`;
- no stat cap or modifier invariant is violated;
- the recipe does not require more than two mutations;
- a safe containment line exists, allowing filter service where the recipe declares it;
- Tier 1 recipes require no mutation reagent;
- the displayed minimum requirements equal the evaluator requirements.

### Full-run transcripts

Ship at least these deterministic transcript tests:

1. Tutorial completion with every intended lesson.
2. Standard seed clean win at or above 12 Funding.
3. Standard seed win after one recoverable breach.
4. Same seed with different resource allocation producing a different valid expression path.
5. Shutdown caused by a predicted local breach.
6. Shutdown caused by cumulative filter overflow.

### Seed batch checks

For at least 500 fixed seeds in tests:

- generation terminates;
- all six contracts pass generator constraints;
- opening contracts have a no-mutation witness in available stock;
- advanced required mutations appear in reachable plant offer queues;
- the reference bounded planner can reach 12 Funding with at least one seal;
- the first three cycles admit at least one no-breach path;
- no generated label or name violates renderer bounds.

The bounded planner is a validation tool, not the game AI. It may abstract cosmetic state and use dominance pruning over `(cycle, plants, filter, seals, funding, stock)`.

## Test plan

### Growth unit tests

- every species × lamp × water fit pair;
- minimum-resource growth and all caps;
- Blue Mass, Red Bloom, UV Glow, Off/nocturnal output;
- Stress gain, recovery, penalty, and dormant recovery;
- pruning clamps and pressure reduction;
- each mutation in isolation;
- all eight expressions;
- Mirror and Mycelial adjacency snapshot behavior;
- no recursive adjacency boost;
- Bloom-contact spore output;
- simultaneous plant resolution independent of object insertion order.

### Containment tests

- root pressure threshold and Living Trellis threshold;
- filter capacity at exactly 9 is safe; 10 breaches;
- Service Filter occurs before emission;
- zero-spore Sterile Crown and Sealed Bouquet;
- multiple root breaches sort by overflow then chamber ID;
- root incidents resolve before the filter incident;
- auto-culling and emergency scrub values;
- biosecurity never drops below 0;
- preview incidents exactly equal committed incidents.

### Contract tests

- every requirement kind at pass/fail boundaries;
- one specimen matching two contracts completes only the selected one;
- early bonus at priority boundary and not after it;
- delivery removes plant and resets chamber pressure;
- contract and vial slot refill order;
- every witness recipe;
- generator tier mix, duplicate prevention, named-species cap, and seed determinism.

### Engine/invariant tests

- invalid commands do not mutate state;
- over-budget commit is rejected with a reason;
- only one pending operation exists;
- preview does not mutate authoritative state;
- preview and commit next-state hashes match;
- same seed + command list gives the same final state;
- different cosmetic stream consumption does not affect gameplay;
- all stats, budgets, filter, seals, reagent, and pressure remain in bounds;
- win, grant-deferred, and shutdown transitions;
- restart-same-seed and new-run semantics.

### Renderer/controller tests

- every major phase at 80×28 and 100×32;
- dark and at least one light theme;
- ANSI-stripped width/height bounds;
- Unicode and ASCII glyph maps;
- start, briefing, running, operation menu, mutation menu, help, pause, report, won, and game-over frames;
- budget overflow, contract ready, near breach, predicted breach, and completed expression states;
- controller stop restores cursor and alternate buffer once;
- every displayed shortcut has a functioning input branch.

## Balancing targets

These are tuning guardrails, not immutable constants:

| Metric | Target |
|---|---|
| Familiar standard-shift length | 10–15 minutes |
| First Tier 1 delivery | Cycles 3–5 |
| Clean reference win | 12–15 Funding |
| Contracts completed in a typical win | 4–5 of 6 |
| Mutation operations in a typical win | 2–4 |
| Filter services in a typical win | 1–3 |
| Prunes/culls in a typical win | 0–2 |
| Predicted-danger cycles | 3–6 |
| Actual incidents for a new successful player | 0–2 |
| Actual incidents for an expert clean route | 0 |
| Cycles with a strictly dominant configuration | Fewer than 20% in sampled seeds |

Balance warnings:

- If players always use Blue + Mist, species profiles or contract mix are too flat.
- If every run requires Service Filter on the same cycles, filter capacity is a schedule rather than a decision.
- If mutations are always superior to pruning or delivery, the operation economy is unbalanced.
- If the exact forecast makes every decision obvious, contracts need competing priorities or mutation trade-offs—not hidden randomness.
- If a clean win requires memorizing content, opening contracts or forecasts are insufficiently legible.
- No effect should multiply a stat. Additive, capped effects keep previews comprehensible.

## Implementation milestones

### Milestone 0 — Mechanical spike

- Implement types, five species profiles, input budgets, pure one-cycle growth, stress, root pressure, and filter load.
- Hard-code four plants and print a diagnostic text frame.
- Prove exact preview equals commit.
- Simulate 100 manual/scripted cycles to choose plausible caps and thresholds.

**Exit:** The resource/containment loop creates at least three non-obvious but explainable configuration choices without mutations or contracts.

### Milestone 1 — Playable engine

- Add state creation, commands, operations, contract requirement evaluation, scoring, and outcome phases.
- Add deterministic PRNG streams and same-seed replay.
- Add unit/invariant tests for growth and containment.

**Exit:** A hard-coded 12-cycle shift can be completed entirely through engine commands with no renderer.

### Milestone 2 — Mutation and content system

- Add ten mutations, eight expressions, adjacency rules, contract templates, vial/mutation queues, and generation constraints.
- Add static validation, witness recipes, and initial full-run transcripts.

**Exit:** Every authored contract has a production-engine witness, and fixed seeds contain clean winning lines.

### Milestone 3 — Terminal interface

- Implement the 80×28 renderer, growth grammar, glyph maps, exact forecast, compact contracts, action submenus, help, start/report screens, and theme handling.
- Integrate shared pause menu and transitions.
- Add resize, ANSI dimension, and lifecycle tests.

**Exit:** A player can finish a standard seed using only information visible at 80×28, with no clipped text or undocumented key.

### Milestone 4 — Guided tutorial and polish

- Implement six authored tutorial steps with staged controls.
- Add expression discovery accents, restrained title glitch, warning flash, and report chronicle.
- Verify Unicode and ASCII in dark/light themes.
- Conduct first-session playtests with no verbal explanation.

**Exit:** At least 4 of 5 new players finish training, can explain both containment meters, and begin a standard shift without asking how time advances.

### Milestone 5 — Release gate

- Run `npm run typecheck`, `npm test`, and `npm run build`.
- Run 500-seed validation and all reference transcripts.
- Manually verify pause/restart/list/next/quit and terminal cleanup.
- Tune funding/thresholds from playtest evidence.
- Register at `workshop`; promote to `beta` only after all acceptance criteria below pass.

## Acceptance criteria

### Core rules

- [ ] A complete standard shift lasts exactly 12 committed cycles unless closed early or shut down.
- [ ] Light and water settings remain reversible until commit.
- [ ] The player can queue at most one operation per cycle.
- [ ] Growth is deterministic and uses the documented resolution order.
- [ ] Preview and commit use the same resolver and produce identical outcomes.
- [ ] Every contract requirement is visible and evaluated from visible current state.
- [ ] Both local root and shared filter escapes can be prevented after their warning first appears.

### Content

- [ ] Five species, ten mutations, eight expressions, and fifteen contracts are implemented as data.
- [ ] Every mutation has a visible benefit and trade-off.
- [ ] Every contract has a passing witness recipe.
- [ ] Generated runs satisfy stock/mutation reachability constraints.
- [ ] No Tier 1 contract requires mutation.

### Experience

- [ ] The complete help fits one 80×28 screen.
- [ ] The first two tutorial cycles expose no more than five play controls.
- [ ] No gameplay state advances in real time.
- [ ] A first or second containment incident does not end the shift; a third does.
- [ ] Every predicted breach says exactly why it will occur and how much the threshold is exceeded.
- [ ] Plant visuals visibly respond to Mass, Bloom, Glow, Stress, and mutation.

### Technical

- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.
- [ ] No gameplay call uses `Math.random()`.
- [ ] Same-seed command transcripts are byte-for-byte deterministic in serialized mechanical state.
- [ ] All phases fit 80×28 in Unicode/ASCII and dark/light modes.
- [ ] Stop/restart/quit restores terminal state and disposes resources exactly once.
- [ ] The game is registered with accurate maturity, pace, difficulty, and session metadata.

## Major risks and planned countermeasures

### Risk: the simulation feels opaque

Countermeasure: exact forecast from the real resolver, small integer deltas, causal event text, and only three productive stats. Cut modifiers before weakening forecast clarity.

### Risk: mutations become a memorisation test

Countermeasure: show both candidates, resulting expression, and full current-cycle effect before queuing. Keep two slots and ten mutations. No hidden compatibility outcomes.

### Risk: containment feels like meter maintenance

Countermeasure: root and spore risk must derive from the same Mass/Bloom/environment decisions used by contracts. Service Filter is an operation competing with growth actions, not a periodic tax. Playtest whether service timing varies across seeds.

### Risk: exact forecasting removes uncertainty and challenge

Countermeasure: challenge comes from shared budgets, one operation, limited cycles, contract sequencing, and shipment timing. Do not add random failure; add conflicting visible objectives if choices are too easy.

### Risk: four chamber cards do not fit 80 columns

Countermeasure: prototype the 80×28 frame before content polish, keep the visual grammar 7×3, abbreviate stats consistently, wrap contract prose into checklists, and enforce stripped-width tests.

### Risk: content generation creates impossible shifts

Countermeasure: authored contract templates, named seed streams, witness recipes, stock-aware constraints, a bounded validation planner, and large fixed-seed tests.

### Risk: the scope repeats earlier workshop overreach

Countermeasure: no upgrades, campaign, third resource, hard deadlines, or persistent progression in Version 1. If schedule pressure appears, cut Tier 3 content quantity or cosmetic variants before cutting tests, tutorial, preview, or terminal-fit work.

## Post-Version-1 possibilities

Only consider these after the release gate and observed player demand:

- a daily shared seed with score comparison;
- an endless greenhouse sandbox with escalating filter capacity choices;
- a second 12-cycle contract set with different species, not more base controls;
- authored “quarantine incident” challenge seeds;
- crossbreeding that produces a new vial from two delivered parents;
- optional lab modules that replace, rather than stack onto, an existing rule;
- a compact run-code export containing seed plus command transcript.

Temperature, fertilizer, staff management, equipment durability, and free-form gene editing should remain excluded unless the game is intentionally redesigned around a larger complexity budget.

## Final implementation recommendation

Build Botany Lab around this single causal chain:

```text
shared light + water allocation
              ↓
deterministic plant growth
              ↓
mutation expressions and contract traits
              ↓
root pressure + airborne spores
              ↓
ship, prune, service, or risk a breach
```

That chain is the game. The strongest implementation will make it legible enough that a player can predict the next cycle, compact enough that four strange plants fit comfortably in one terminal, and rich enough that two chosen mutations turn an ordinary specimen into a memorable solution—and a memorable containment problem.
