# Market of Mirrors — Full Game and Implementation Plan

## Product decision

**Market of Mirrors is a deterministic, turn-based market game about buying surreal raw goods, combining them into singular artifacts, and manipulating tomorrow's prices with rumors that rival merchants may believe, exploit, or expose.**

The release version is a complete nine-day market run against four simulated factions. Each day, the player receives three actions to trade, combine goods, sell an artifact, or publish one rumor. Rival circulars appear before the player acts; all rumors and orders resolve together at the closing bell. After Days 3 and 6, the player drafts a permanent workshop method that turns a collection of trades into an economic engine. At the end of Day 9, every estate is liquidated and ranked.

The intended session is 12–18 minutes after the tutorial. The game supports a separate three-day guided fair, deterministic seeds, same-seed restart, concise transaction previews, an 80×28 terminal layout, and a final chronicle assembled from the actual objects, rumors, and buyers in that run.

This is not a stock-market simulator with whimsical nouns pasted onto it. The market, crafting, bluffing, and story systems must be one loop:

- buying removes stock and creates visible demand;
- combinations preserve the lineage and cost basis of their ingredients;
- active rumors affect both raw prices and artifact bids;
- artifact sales can give a rumor evidence and move its ingredients;
- faction preferences determine who believes a claim and who values an artifact;
- the final story names the exact trades and beliefs that created the result.

## Repository research and design constraints

This plan is based primarily on the repository's own strongest precedents because they determine what can be implemented and shipped successfully in Gamr:

- `src/games/rogue-ledger/engine.ts` demonstrates deterministic financial evaluation, visible previews, delayed consequences, and rule drafts. Its production review also shows the danger of many nominal choices collapsing into one dominant strategy.
- `src/games/five-minute-kingdom/engine.ts` demonstrates a compact pure reducer, nine-turn session structure, persistent build synergies, and preview/commit parity.
- `src/games/tiny-fleet/` demonstrates separating full hidden state from player observation and testing simulated opponents against only the information they are allowed to use.
- `documentation/games/TEN_GAME_PRODUCTION_READINESS_REVIEW.md` establishes the practical release bar: at most five starting verbs, a genuine tutorial, causal failure, complete feature wiring, deterministic completion transcripts, lifecycle safety, and actual 80×28 support.
- `.agents/skills/game-dev/SKILL.md` requires the shared pause menu and transitions, alternate-buffer lifecycle, theme awareness, minimum-size handling, and a consistent semantic glyph vocabulary with ASCII fallbacks.

External research is not required for Version 1. Real financial microstructure would add terminology and edge cases without answering the central game-design question. This plan intentionally uses a small, inspectable fictional market whose rules can be explained in one help screen and reproduced in unit tests.

## Player promise

> “I bought eclipses before the Cabinet called them scarce, turned one into a portable midnight, then sold it to the Ministry after convincing everyone that darkness was counterfeit.”

Every good run should produce a sentence like that. The player should be able to explain both the arithmetic and the fiction.

The emotional arc is:

| Beat | What happens | What the player learns or feels |
|---|---|---|
| First purchase | A raw good enters inventory and its stock falls. | “I can read this market.” |
| First combination | Two known goods become a named artifact with a transparent bid value. | “The things I buy can become more than inventory.” |
| First rumor | A claim waits until the bell; some factions believe it and others do not. | “I am influencing agents, not pressing a price button.” |
| First successful sale | A buyer's preference, a rumor, and the artifact's lineage all appear in the bid breakdown. | “My systems connect.” |
| First counter-bluff | A rival's public claim conflicts with its later order. | “Their words and positions are different sources of evidence.” |
| First method draft | A persistent rule rewards a chosen pattern. | “I am building a machine.” |
| Final bell | Estates are liquidated and the chronicle names the run's defining artifact and rumor. | “This market made a story that belongs to my decisions.” |

## Design pillars

1. **Tomorrow, not immediately.** A rumor published today affects the closing bell and future quotes. The player must hold risk overnight and cannot buy, pump, and sell at the manipulated price in one action sequence.
2. **Words move agents.** Rumors affect prices only through faction belief and resulting orders. The report always shows who believed, doubted, or exploited each claim.
3. **Crafting is economic expression.** Combining goods preserves cost basis and provenance, creates a specific artifact, unlocks buyer premiums, and can reinforce a market story. It is never a detached recipe minigame.
4. **Rivals bluff but do not cheat.** Factions act from public market state, their own holdings, personality, private agenda, and seeded tie-breaks. They never inspect future player input or hidden RNG outcomes.
5. **Arithmetic is inspectable.** Prices, bid components, fees, rumor reach, credibility changes, and liquidation value use bounded integer math with visible traces.
6. **Few verbs, layered consequences.** Version 1 has five market actions: Buy, Sell, Combine, Offer Artifact, and Publish Rumor. Inspecting information and ending the day are free interface operations.
7. **Short run, distinctive build.** Nine days and two method drafts are enough to create a strategy without requiring save/suspend or a long campaign.
8. **The surreal language is structured.** Names and chronicles are authored from data and actual events. No runtime LLM, arbitrary prose parser, or decision-critical flavor text is required.

## The core loop

Each run lasts three acts of three market days.

### Start of day: Morning Circular

1. Restock each raw good one step toward its normal supply.
2. Reveal the day's public condition, such as a lunar holiday or customs inspection.
3. One rival faction publishes a circular. Its claim is public before the player acts.
4. Show opening mid-prices, bid/ask quotes, stock, active rumors, the current commission, and every faction's public track record.
5. Generate artifact bids from the opening snapshot. Newly published player rumors cannot retroactively change these bids.

### Player market: three actions

The player takes any three actions, with only one Publish action per day:

- **Buy** one raw lot at the displayed ask price.
- **Sell** one raw lot at the displayed bid price.
- **Combine** two raw lots into their authored artifact.
- **Offer** one artifact and accept one currently displayed faction bid.
- **Publish** a rumor by choosing its subject, frame, and intensity.

The player may freely inspect goods, artifact lineage, bid explanations, faction histories, active rumors, and the projected consequences of an action. A committed action is not undoable, but every action receives a confirmation preview.

The player may end the day with unused actions. Passing can be correct when inventory is full, quotes are poor, or publishing another claim would create too much suspicion.

### Closing bell: simultaneous resolution

When the player ends the day:

1. Freeze the public end-of-action snapshot.
2. Activate the player's queued rumor.
3. Calculate how strongly each faction believes every newly active rumor.
4. Let each faction choose its market orders from its legal observation, doctrine, portfolio, belief results, and private agenda.
5. Aggregate player raw trades, faction orders, public-condition pressure, stock pressure, mean reversion, and rumor-driven demand.
6. Move each raw good once, with a strict daily movement cap.
7. Execute faction orders at the new closing price and update their portfolios.
8. Apply artifact-sale spillover and commission rewards already earned that day.
9. Settle rumors whose deadlines have arrived; update source credibility and suspicion.
10. Produce a causal bell report before advancing time.

The bell report must never say only “Pocket Eclipse +4.” It should say:

```text
POCKET ECLIPSE  29 → 34  (+17%)
  +2 low stock
  +1 player bought 1
  +3 Cabinet believed “Eclipses are vanishing”
  -1 Ministry sold into the claim
  capped at +5 for the day
```

### End of act

After Days 3 and 6:

1. Settle the act's commission if its deadline has arrived.
2. Offer three workshop methods, including at least one that relates to behavior already present in the run.
3. Install one method. The player has exactly two active methods by the final act.
4. Reveal one additional clue about each faction's private agenda.
5. Start the next act with a new commission and slightly stronger market pressure.

After Day 9, liquidate all estates and show the final ranking and chronicle.

## Why the rumor delay is essential

The obvious failure mode is: buy a good, declare that it is fashionable, immediately sell it for a guaranteed profit. The following rules remove that dominant loop without removing the fantasy of manipulation:

- trades execute at the current morning quote;
- a new rumor contributes only at the closing bell;
- the player cannot trade at that new closing quote until the next day;
- factions may reject the claim, countertrade it, or exploit the player next morning;
- every claim occupies the public record for two closes;
- loud claims create suspicion whether or not they work;
- claims are judged against later price movement, so a failed pump damages future reach;
- holding inventory through a bell exposes the player to public conditions and rival claims.

Manipulation remains powerful, but profit requires a position, a believable audience, a later exit, and a willingness to risk reputation.

## Worked two-day example

This example uses provisional balance values to show how the systems connect.

At the start of Day 1, Pocket Eclipse is 30 crowns with an ask of 32 and Borrowed Shadow is 22 with an ask of 24. The player has 100 crowns and takes three actions:

1. Buy one Pocket Eclipse for 32.
2. Buy one Borrowed Shadow for 24.
3. Publish a Broadside claiming Pocket Eclipses are Vanishing, gaining 1 Suspicion.

The player ends the action phase with 44 crowns and two exposed ingredients. They cannot sell at a changed price yet.

At the bell, the Velvet Cabinet amplifies the claim because Eclipse stock is low and it favors Celestial goods. The Choir believes it because Eclipse already has positive momentum. The Ministry doubts it, while the Pale Exchange sells one Eclipse into the enthusiasm. Together with the player's purchase, the net order flow is positive. The uncapped calculation would move Eclipse from 30 to 37, but the 20% daily cap sets the close to 36. The report shows the contribution from stock, player flow, faction flow, and each belief result.

On Day 2, opening artifact bids use the new quote. The player spends one action combining the Eclipse and Shadow into **Portable Midnight**:

```text
PORTABLE MIDNIGHT — best bid: 68 from the Velvet Cabinet
  reference: floor(0.80 × (36 + 22))       +46
  recipe resonance                           +8
  likes Celestial and Forbidden              +8
  believes the Vanishing Eclipse claim       +6
  saturation                                  +0
```

The player spends a second action accepting 68, returning to 112 crowns. The sale also creates ingredient demand at the Day 2 bell. If Eclipse closes at 33 or higher, the two-close rumor has risen at least 8% from its origin of 30: it is fulfilled, Credibility rises from 3 to 4, and Suspicion returns to 0.

This is a strong line, not a guaranteed one. Different stock, an anti-rumor condition, a skeptical Cabinet, a better rival acquisition claim, or enough faction selling could hold Eclipse below the fulfillment threshold and leave the artifact bids lower. The full preview is accurate about current bids and deterministic rules but never reveals faction orders that have not yet been chosen.

## Run structure and objectives

### Starting state

The standard run begins with:

- 100 crowns;
- Credibility 3 of 6;
- Suspicion 0 of 6;
- eight total inventory slots;
- no goods, artifacts, or workshop methods;
- eight listed goods with three to five lots of public stock each;
- four rival factions;
- one public three-day commission;
- three actions per day;
- a numeric seed shown in the header and ending.

The player cannot spend crowns they do not have and cannot buy out-of-stock goods. Cash therefore never becomes negative through an ordinary player action.

### Victory and ranking

At the final bell, calculate each estate with the same public accounting rules:

```text
estate value = cash
             + raw lots × final market bid
             + 70% of each artifact's best final bid
             + 6 × credibility
             - 5 × suspicion
             + completed commission bonuses
```

Rival artifact holdings purchased from the player are appraised with the same 70% rule. All values are integer crowns.

The player wins the market by finishing first among the five estates. The ending still provides a meaningful placement and rank when the player does not win:

| Result | Ending rank |
|---|---|
| 1st, high credibility | Curator of the True Reflection |
| 1st | Master of Mirrors |
| 2nd | Silver-Tongued Broker |
| 3rd | Respectable Fabricator |
| 4th | Stallholder of Questionable Goods |
| 5th | Collector of Own Mistakes |

There is no abrupt run loss for one bad day. At Suspicion 6, the player pays a 12-crown inspection fine, Credibility falls by one, and publishing is disabled on the following day; Suspicion then resets to 3. This is severe but lets the economic story finish. A player who has no cash and no inventory receives no rescue currency; they may pass the remaining days and receive the resulting rank.

### Three acts

| Act | Days | New pressure | Lesson |
|---|---:|---|---|
| I — The Stalls Open | 1–3 | Mild public conditions, skeptical rival rumors, simple commission | Quotes, stock, combinations, delayed rumor impact |
| II — Fever of Value | 4–6 | Stronger faction orders, conflicting claims, first method active | Reading behavior, timing exits, building a synergy |
| III — The Last Reflection | 7–9 | Louder rumors, tight stock, agenda-driven orders, final commission | Bluffing into counterplay and converting the whole build |

## Raw goods

Eight raw goods are always listed. Keeping the complete market visible is more important than procedural breadth.

| Ticker | Good | Glyph | Traits | Base | Volatility | Market identity |
|---|---|---:|---|---:|---:|---|
| ECH | Bottled Echo | `e` | Memory, Ceremonial | 18 | 1 | Stable social good; often useful as evidence |
| SHD | Borrowed Shadow | `s` | Living, Forbidden | 22 | 2 | Scarce, faction-sensitive, dangerous under inspections |
| RAI | Yesterday's Rain | `r` | Celestial, Memory | 14 | 2 | Cheap, liquid, responsive to public conditions |
| PEA | Clockwork Pear | `p` | Clockwork, Edible | 20 | 1 | Stable craft input favored by institutional buyers |
| MAP | Unfinished Map | `m` | Prophetic, Memory | 24 | 2 | Momentum-sensitive and valuable in commissions |
| ECL | Pocket Eclipse | `c` | Celestial, Forbidden | 30 | 3 | Expensive, volatile, and attractive to bluffers |
| APO | Amber Apology | `a` | Ceremonial, Edible | 16 | 1 | Reliable bid support and reputation stories |
| CAN | Sleepless Candle | `l` | Living, Prophetic | 26 | 2 | Flexible high-end component with narrow stock |

All goods have:

- a mid-price;
- a bid and ask derived from volatility;
- public market stock from 0–6;
- an immutable base anchor;
- today's net flow and price delta;
- up to three active rumor markers;
- two traits used by recipes, buyers, methods, and conditions.

Player raw lots stack by good but each lot consumes one of the eight inventory slots. Combining two lots creates one artifact and frees one slot.

## Combining goods

### Scope rule

Version 1 allows **raw + raw** combinations only. Artifacts cannot be recursively combined. This gives 28 authored pair recipes, keeps every outcome previewable, and prevents a combinatorial content explosion.

Before confirming Combine, show:

- the artifact name and inherited traits;
- both ingredient spot values and actual cost basis;
- recipe resonance;
- current best bid and its complete explanation;
- the active commission or method interactions;
- any same-day sale restriction. An artifact may be offered immediately if an action remains, but it uses bids generated from the opening snapshot.

### Complete recipe matrix

The artifact title is determined by the unordered pair. Ingredient order never changes mechanics.

| Pair | Artifact | Pair | Artifact |
|---|---|---|---|
| ECH + SHD | Quiet Witness | ECH + RAI | Weather That Remembers |
| ECH + PEA | Orchard Refrain | ECH + MAP | Map of What Was Said |
| ECH + ECL | Blackened Chorus | ECH + APO | Forgiveness Engine |
| ECH + CAN | Night's Last Testimony | SHD + RAI | Storm's Alibi |
| SHD + PEA | Fruit of Another Body | SHD + MAP | Fugitive Atlas |
| SHD + ECL | Portable Midnight | SHD + APO | Guilt Without an Owner |
| SHD + CAN | Second Darkness | RAI + PEA | Mechanical Monsoon |
| RAI + MAP | Forecast of Lost Roads | RAI + ECL | Eclipse in a Teacup |
| RAI + APO | Apology for the Weather | RAI + CAN | Candle That Rains Upward |
| PEA + MAP | Orchard of Possible Roads | PEA + ECL | Clockwork Nightfruit |
| PEA + APO | Courteous Hunger | PEA + CAN | Insomniac Harvest |
| MAP + ECL | Atlas of Closed Suns | MAP + APO | Route to Reconciliation |
| MAP + CAN | Map of Tomorrow's Ash | ECL + APO | Polite End of the World |
| ECL + CAN | Sunless Vigil | APO + CAN | Vigil of Small Regrets |

Each recipe entry in `content.ts` also defines:

- `resonance`, an authored value from 4–12;
- one `featuredTrait` used for its strongest buyer premium;
- one short `description`;
- one `saleFragment` for the chronicle;
- optional `commissionKeywords`, not an arbitrary mechanical ability.

Traits are inherited as the unique union of ingredient traits. If that would produce four traits, the recipe's featured trait plus the two traits shared or most relevant to the recipe are retained, for a maximum of three. The exact result is data, not computed prose.

### Artifact value and bids

Artifacts do not receive a universal ticker price. Each faction makes a private-value bid from public facts and its own preference:

```text
reference value = floor(0.80 × sum of ingredient opening mid-prices)
bid             = reference value
                + recipe resonance
                + 4 per preferred trait, maximum 8
                + agenda premium, 0–8
                + believed-rumor premium, -6 to +8
                + commission premium, 0–12
                + workshop-method modifier
                - saturation penalty, 0–8
```

The final bid is clamped to 5–90 crowns. The renderer lists every non-zero term. A buyer may bid below the artifact's cost basis; the player is never told that combining guarantees profit.

Selling an artifact adds it to the buyer's estate, records its lineage, and creates one point of demand spillover for each ingredient at the next bell. It can also satisfy the current commission or supply evidence to a related rumor.

## Rumors

### Rumor anatomy

A player rumor has three decisions:

1. **Subject:** one of the eight listed goods.
2. **Frame:** the story being told and the kind of faction most likely to care.
3. **Intensity:** how much pressure and suspicion the claim creates.

| Frame | Direction | Most receptive behavior | Example |
|---|---:|---|---|
| Coveted | Bullish | Trend followers and trait collectors | “Clockwork pears are this season's only acceptable dessert.” |
| Vanishing | Bullish | Hoarders and factions facing low stock | “There are only three eclipses left, and two are spoken for.” |
| Counterfeit | Bearish | Regulators and value buyers | “Half the bottled echoes are merely jars with good acoustics.” |
| Cursed | Bearish | Risk-averse factions; contrarians may buy the fall | “Every unfinished map now leads back to its owner.” |

| Intensity | Mechanical magnitude | Immediate Suspicion | Duration |
|---|---:|---:|---:|
| Whisper | 1 | 0 | 2 closes |
| Broadside | 2 | +1 | 2 closes |
| Proclamation | 3 | +2 | 2 closes |

Only one player rumor may be published per day. A rumor cannot target the same good with the same frame on consecutive days; this prevents one-button spam and encourages narrative variation.

### Belief

Each faction evaluates a rumor independently:

```text
belief score = source credibility
             + faction trust in source
             + frame affinity
             + stock corroboration
             + momentum corroboration
             + artifact evidence
             - doctrine skepticism
             - repeated-subject fatigue
```

Clamp the score to 0–9:

- 0–2: doubts; no rumor order pressure;
- 3–5: listens; half pressure, rounded down;
- 6–7: believes; full pressure;
- 8–9: amplifies; full pressure and may repeat the claim next morning.

All terms are integers. Faction preferences are fixed content; seeded randomness is used only to break equal candidate scores, never to replace the belief calculation.

The bell report reveals the result and the two largest reasons, for example:

```text
◇ Cabinet BELIEVES (+5 credibility, +2 low stock)
□ Ministry DOUBTS   (+2 trusted source, -4 anti-fashion doctrine)
≈ Choir AMPLIFIES   (+3 momentum, +3 Coveted affinity)
```

### Settlement and reputation

A rumor remembers its subject's price immediately before its first affected bell. After its second affected close:

- a bullish claim is fulfilled if price rose by at least 8%;
- a bearish claim is fulfilled if price fell by at least 8%;
- it is exposed if price moved at least 8% in the opposite direction;
- otherwise it is unresolved.

For the player:

| Outcome | Credibility | Suspicion |
|---|---:|---:|
| Fulfilled | +1, maximum 6 | -1, minimum 0 |
| Unresolved | no change | +1 only for Proclamation |
| Exposed | -1, minimum 0 | +1, plus another +1 for Proclamation |

Factions use the same credibility updates. This public track record is the main evidence for judging future faction circulars.

The market is deliberately reflexive: a claim can become “true” because agents acted on it. The game does not pretend there is an objective oracle behind every surreal assertion.

## Price formation

All prices and cash amounts are integers. The engine never uses floating-point currency or an unbounded multiplier chain.

### Quotes

```ts
spread = 1 + Math.floor(volatility / 2);
ask = midPrice + spread;
bid = Math.max(MIN_PRICE, midPrice - spread);
```

The player trades one lot at the displayed bid or ask. The price does not change inside the action phase; the trade contributes flow at the bell.

### Closing price

For each good:

```ts
anchor = basePrice + publicConditionAnchorDelta + (3 - stock) * 2;

meanReversion = clamp(trunc((anchor - openPrice) / 6), -3, 3);
flowPressure = trunc((playerNetFlow + factionNetFlow) * volatility / 2);
rumorPressure = trunc(sumBelievedRumorPressure / 3);
eventPressure = publicConditionFlowDelta;
artifactPressure = soldArtifactIngredientCount;

rawDelta = meanReversion
         + flowPressure
         + rumorPressure
         + eventPressure
         + artifactPressure;

dailyCap = Math.max(2, Math.round(openPrice * 0.20));
closePrice = clamp(openPrice + clamp(rawDelta, -dailyCap, dailyCap), 3, 80);
```

Definitions:

- buying is `+1` flow per lot and selling is `-1`;
- a faction order is at most two lots per good per day;
- believed rumor pressure is `direction × intensity × belief band`, where Listen is 1, Believe is 2, and Amplify is 3;
- public conditions use authored deltas in the range -2 to +2;
- each sold artifact contributes at most +1 to each ingredient;
- daily movement is capped at 20%, preventing one claim from deciding a run;
- price is always 3–80, so a good cannot become free or grow without bound.

The `PriceResolution` returned by the pure market function contains every component, the uncapped delta, cap, final delta, new price, orders, and explanation lines. Preview and report code must consume this record rather than recalculate the price.

### Stock

Public stock ranges from 0–6:

- a player or faction purchase removes one lot;
- a sale adds one lot, up to 6;
- at the next morning, stock moves one step toward that good's normal stock unless a condition overrides restocking;
- attempted faction buys beyond available stock are reduced in deterministic faction order;
- the player cannot select Buy at stock 0.

The stock rule gives “Vanishing” claims visible corroboration and lets hoarding create real but bounded pressure.

## Simulated factions

All four factions participate in every standard run. Their public doctrine is visible; one private agenda is selected per run and revealed through clues after each act.

| Faction | Glyph | Public doctrine | Preferred traits | Typical bluff |
|---|---:|---|---|---|
| Velvet Cabinet | `◇` | Collects scarce goods and singular provenance | Celestial, Ceremonial | Calls owned goods Vanishing before selling into belief |
| Ministry of Measures | `□` | Values stable anchors and distrusts fashion | Clockwork, Memory | Calls a desired input Counterfeit to acquire it cheaply |
| Choir of Needles | `≈` | Follows momentum and amplifies fashionable claims | Living, Edible | Repeats Coveted claims until the trend breaks |
| Pale Exchange | `○` | Contrarian value buyer with high risk tolerance | Forbidden, Prophetic | Publishes Cursed claims against rivals' largest holdings |

Each faction stores:

- cash, raw lots, and purchased artifacts;
- credibility and public rumor history;
- trust toward each source;
- doctrine weights and preferred traits;
- one private agenda;
- a saturation count for artifact traits;
- its own serializable RNG stream for tie-breaks.

### Private agendas

An agenda is a scoring preference, not a secret exception to market rules. Examples:

- finish with three Celestial lots;
- own artifacts containing all four of a trait set;
- make a named rival finish below it;
- fulfill two bullish rumors it originated;
- hold the lowest-stock good at the final bell.

Agenda clues are behavioral and concise:

- after Act I: reveal a desired trait or target market;
- after Act II: reveal whether the agenda rewards holding, selling, or reputation;
- final report: reveal the exact agenda and points earned.

### Rival circular generation

At morning, exactly one faction publishes a rumor. The source rotates with a seeded shuffle so one loud faction cannot occupy every day.

Candidate claims are scored from:

- benefit to current holdings;
- benefit to an intended acquisition;
- compatibility with private agenda;
- current stock and momentum plausibility;
- frame preference;
- suspicion cost;
- repeated-subject fatigue.

The faction chooses the highest-scoring legal claim, with its private RNG only breaking ties. This means some claims are sincere forecasts, some are self-serving, and some are acquisition bluffs. The player can infer intent by comparing words, public holdings changes, and later orders.

### Faction market orders

At the bell, each faction receives two action-equivalents. A rumor published that morning consumes one; otherwise it may trade twice. Each trade is one or two raw lots subject to cash, stock, and inventory limits.

For each legal buy or sell candidate:

```text
utility = expected price movement
        + preferred-trait value
        + agenda value
        + inventory target value
        + rumor belief signal
        - concentration risk
        - spread cost
```

The faction selects the best positive-utility action, updates its projected observation, then selects again if an action remains. A small minimum utility allows passing.

### Fairness boundary

`planFactionTurn` accepts only:

- public market and stock;
- active public rumors;
- public completed player trades and visible inventory totals;
- public condition and commission;
- that faction's own full portfolio, doctrine, agenda, and RNG state.

It does not accept UI selection, an unconfirmed player action, future content RNG, other factions' private agendas, or a future closing price. Equal observations, agenda, and RNG state must produce equal orders.

## Commissions

One public commission spans each three-day act. It gives crafting a concrete market purpose and produces story objectives without adding quests or dialogue trees.

Examples:

| Commission | Requirement | Reward |
|---|---|---:|
| A Memory of Weather | Sell an artifact with Memory + Celestial | +18 crowns, +1 Credibility |
| The Respectable Contraband Exhibition | Sell an artifact with Forbidden to the Ministry | +24 crowns, -1 Suspicion |
| Feast for a Sleepless Court | Sell an Edible + Living artifact | +20 crowns |
| Proof of a Popular Claim | Sell an artifact descended from a good under a fulfilled Coveted rumor | +16 crowns, +1 Credibility |
| Cabinet of Three Histories | Sell an artifact with three inherited traits | +22 crowns |
| Buyer's Remorse | Sell an artifact to a faction that doubted its ingredient rumor | +25 crowns |

Commission requirements are generated from reachable recipe/faction combinations. A validator must enumerate the recipe table and reject impossible commissions. A commission can be completed once; missing it has no extra penalty beyond the lost reward.

## Workshop methods and engine building

The player drafts one of three methods after Days 3 and 6. Methods use fixed trigger/effect records and a stable resolution order. No method may silently modify a displayed number.

Initial pool:

| Method | Trigger | Effect | Build direction |
|---|---|---|---|
| Resonant Shelves | Price an artifact | Add half of both ingredients' positive momentum, max +6, to all bids | Momentum crafting |
| Echo Chamber | First Memory-subject rumor each act | Treat player Credibility as +1 for belief; no extra reach beyond 6 | Credible rumors |
| Provenance Thread | Artifact sale helps fulfill a rumor | +1 Credibility once per act | Craft-to-rumor loop |
| Patient Glass | Hold an artifact through a bell | Add +3 appraisal, maximum +9 | Slow collecting |
| Contrarian Kiln | Combine two ingredients that both fell yesterday | +7 recipe resonance | Buy-the-dip crafting |
| Public Demonstration | Sell an artifact | Ingredient spillover is +2 total instead of +1, divided deterministically | Market pressure |
| Honest Counterfeit | Counterfeit rumor settles fulfilled | Next artifact with that subject gets +8 Ministry bid | Bearish acquisition |
| Velvet Rope | Cabinet or Choir makes the highest bid | Second-highest matching bidder adds half its preference bonus | Competitive auctions |
| Split Ledger | First raw sale each day | It does not consume an action, but still creates flow | Active trading |
| Quiet Source | Publish a Whisper | It lasts three closes; settlement still occurs after the third | Patient manipulation |
| Salvaged Reflection | Artifact bid is below cost basis | Refuse all bids to recover one ingredient of choice, once per act | Downside control |
| Closing Argument | Final action of the day is Publish | +1 intensity for price pressure only; +1 Suspicion | High-risk bluffing |

Release only methods whose effect is implemented, traced, and tested. The draft generator offers:

- one method related to the player's most frequent action or held trait;
- one method from a different strategic family;
- one repair or flexibility method if Credibility is 1 or Suspicion is 4+.

Duplicate methods are never offered. There are no method slots to replace in Version 1 because the run grants exactly two.

### Resolution order for modifiers

Use one explicit order everywhere:

1. validate action and snapshot base values;
2. apply recipe or rumor base rule;
3. apply method effects sorted by `priority`, then stable ID;
4. apply faction preference and agenda terms;
5. apply commission term;
6. apply saturation and spread costs;
7. clamp the final value;
8. return a trace containing applied and capped effects;
9. commit the already calculated resolution exactly once.

Methods cannot trigger other methods recursively. A method fires at most once per action unless its data explicitly names a bounded count.

## Public conditions

Each day has one announced market condition. Conditions alter anchors, restock, or one narrow action rule and are included in the morning circular.

Examples:

| Condition | Visible rule |
|---|---|
| Lunar Holiday | Celestial anchors +3 today; Cabinet bids +4 for Celestial artifacts |
| Customs Inspection | Forbidden restock is zero; selling a Forbidden raw lot adds +1 Suspicion |
| Rain Recall | Yesterday's Rain restocks +2; Memory artifact bids +3 |
| Mechanical Harvest | Clockwork Pear stock moves toward 5 instead of 3 |
| Court of Apologies | First Ceremonial artifact sold gains +6 |
| Mapmakers' Strike | Unfinished Map stock does not restock; Prophetic rumors gain +1 corroboration |
| Candlewake | Living goods gain +1 flow pressure from purchases |
| Quiet Market | All rumor pressure is reduced by 1 belief band, minimum zero |
| Speculators' Bell | Daily movement cap is 25% instead of 20% |

Conditions are authored and deterministic. Day 1 uses a benign fixed condition; high-volatility conditions cannot appear before Day 4.

## Narrative system

### Provenance

Every artifact stores:

- both ingredient IDs;
- actual acquisition cost of each consumed lot;
- craft day and recipe ID;
- inherited traits;
- active rumors involving either ingredient at craft time;
- methods that modified its value;
- buyer bids received over time;
- eventual buyer and sale price, if sold.

### Sale chronicle

When an artifact is sold, select a sentence template from the largest bid modifier, not at random. Examples:

```text
The Velvet Cabinet paid 51 for Portable Midnight, chiefly because
its eclipse was scarce and its shadow had already acquired a scandal.
```

```text
The Ministry paid 38 for Forgiveness Engine after doubting your claim
about counterfeit echoes; the contradiction increased its provenance.
```

The result panel shows the numeric trace first and the prose second. Flavor never replaces causality.

### Final chronicle selection

At the end, derive four lines from actual records:

1. the highest-profit artifact or raw trade;
2. the most influential fulfilled or exposed rumor;
3. the faction whose belief changed the player's result most;
4. the installed method with the largest traced contribution.

If a category has no qualifying event, use a specific fallback based on the player's holdings or rank. Never fabricate a sale, belief, or relationship that did not occur.

## Onboarding and help

### Guided Fair

The title screen offers:

```text
[Enter] Market Run     [T] Guided Fair     [Q] Quit
```

The Guided Fair is a deterministic three-day scenario lasting 4–6 minutes:

1. **Day 1 — Quotes:** buy a Bottled Echo and Yesterday's Rain, observe ask price and stock change, then pass. Only Buy, Inspect, and End Day are enabled.
2. **Day 2 — Combination:** combine those lots into Weather That Remembers, inspect the Cabinet and Ministry bid traces, and sell to either. Combine and Offer unlock.
3. **Day 3 — Rumor:** buy one Clockwork Pear, publish a Whisper that pears are Coveted, close the market, and inspect who believed. The scenario ends after explaining why the new quote cannot be traded until the following morning.

The tutorial uses the real engine with a fixed content configuration and command locks represented in scenario data. It is not the normal run with different introductory copy.

### Contextual campaign guidance

The standard run remains playable without the tutorial:

- Day 1 highlights bid/ask and stock.
- The first Combine preview explains cost basis and resonance.
- The first Publish preview states “Affects the closing bell; trade the new quote tomorrow.”
- The first rival contradiction highlights its circular and later order in the same report.
- Help is always available with `?` or `H` and pauses no game clock because the game is turn-based.

### One-page help contract

The help overlay must fit 80×28 and include:

- objective: finish with the most valuable estate after Day 9;
- five actions: Buy, Sell, Combine, Offer, Publish;
- three persistent pressures: Cash, Credibility, Suspicion;
- turn order in one sentence;
- price arrows and belief pips;
- controls and pause behavior;
- reminder that rumors act at the bell, not immediately.

## Interface and controls

### Interaction model

Use a menu-driven interface so the player learns five actions rather than many hotkeys:

- `↑/↓` or `W/S`: move selection;
- `←/→` or `A/D`: change panel/tab or value where shown;
- `Enter` or `Space`: choose/confirm;
- `Backspace`: go back from an uncommitted action;
- `E`: end day;
- `I`: inspect selected item or cycle detail;
- `?` or `H`: help;
- `Esc`: shared pause menu;
- `Q`: quit only from title/end screens or through pause confirmation.

The action menu also shows `[B] Buy [S] Sell [C] Combine [O] Offer [P] Publish`; direct shortcuts are optional accelerators, not required knowledge.

### 80×28 layout

The minimum supported terminal is exactly 80 columns × 28 rows. At that size, use two 38-column panels with a two-column gutter and reserve the bottom three rows for notice and controls.

```text
 ✦ MARKET OF MIRRORS ✦     DAY 4/9  ACT II  SEED 18473
 CASH 73   CRED ●●●○○○   SUSP !●○○○○   ACTIONS ◆◆◇
┌─ MARKET ───────────────────────────┐ ┌─ CIRCULARS ───────────────────────┐
│ ECH  e  19 ↑2  bid18 ask20 stock 3│ │ ≈ ECL VANISHING  ●●●  1 close   │
│ SHD  s  17 ↓3  bid15 ask19 stock 5│ │ □ ECH COUNTERFEIT ●●   2 closes │
│ RAI  r  14  ·  bid12 ask16 stock 4│ │ Your source record: 2/3 fulfilled│
│ PEA  p  23 ↑1  bid22 ask24 stock 2│ └────────────────────────────────────┘
│ MAP  m  26 ↑2  bid24 ask28 stock 2│ ┌─ FACTIONS ────────────────────────┐
│ ECL  c  34 ↑5  bid32 ask36 stock 1│ │ ◇ Cabinet   cred 5  estate RICH   │
│ APO  a  15 ↓1  bid14 ask16 stock 5│ │ □ Ministry  cred 4  estate STEADY │
│ CAN  l  27  ·  bid25 ask29 stock 3│ │ ≈ Choir     cred 3  estate STEADY │
└────────────────────────────────────┘ │ ○ Exchange   cred 2  estate RICH   │
┌─ INVENTORY 5/8 ───────────────────┐ └────────────────────────────────────┘
│ e ECH@17  r RAI@15  p PEA@21      │ ┌─ SELECTED: POCKET ECLIPSE ─────────┐
│ ◆ Weather That Remembers  bid 41  │ │ Celestial · Forbidden · volatile   │
│ ◆ Quiet Witness             bid 36│ │ Cabinet believes Vanishing (+3).   │
└────────────────────────────────────┘ └────────────────────────────────────┘
 NOTICE: New rumors affect the bell, not today's quote.
 ↑↓ SELECT  ENTER CHOOSE  I INSPECT  E END DAY  ? HELP  ESC PAUSE
```

Exact box widths must be measured after stripping ANSI codes. Longer artifact names and explanations wrap or truncate inside their declared panel; they may never push a border beyond column 80.

At 100+ columns, the renderer may widen detail and log panels but must not reveal new decision-critical information.

### Semantic visual vocabulary

| Concept | Glyph | ASCII fallback | Color role |
|---|---:|---:|---|
| Raw good | `○` | `o` | neutral/theme |
| Crafted artifact | `◆` | `#` | bright theme |
| Rumor | `≈` | `~` | magenta |
| Belief pip | `●` / `○` | `#` / `.` | cyan/dim |
| Price up | `↑` | `+` | green |
| Price down | `↓` | `-` | red |
| Flat price | `·` | `.` | dim |
| Action remaining | `◆` / `◇` | `#` / `.` | theme/dim |
| Suspicion | `!` | `!` | yellow/red |
| Fulfilled rumor | `✓` | `+` | green |
| Exposed rumor | `×` | `x` | red |
| Commission | `✦` | `*` | yellow |
| Faction order | `→` / `←` | `>` / `<` | semantic direction |

Color reinforces state but never carries it alone. All important glyphs are one terminal cell in the supported font; replace any ambiguous-width glyph found during inspection.

The title can use a restrained mirror/glitch offset during the start screen and bell transition. Turn-based reports remain still. Use shared particles or flashes only for a fulfilled commission, an exposed proclamation, and the final winning bell.

## Architecture

Create the game as a multi-file complex game:

```text
src/games/market-of-mirrors/
├── index.ts                 # Terminal lifecycle, input mapping, UI state
├── types.ts                 # Serializable engine/content types
├── content.ts               # Goods, recipes, factions, methods, conditions, commissions
├── seed.ts                  # Named serializable PRNG streams
├── market.ts                # Quotes, stock, order clearing, price resolution
├── rumors.ts                # Belief, activation, settlement, reputation
├── crafting.ts              # Recipe lookup, artifacts, bid calculations, provenance
├── ai.ts                    # Fair faction observations and planners
├── engine.ts                # Phase reducer and command validation
├── render.ts                # 80×28 renderer and view models
├── story.ts                 # Sale and ending chronicle selection
├── market.test.ts
├── rumors.test.ts
├── crafting.test.ts
├── ai.test.ts
├── engine.test.ts
└── content.test.ts
```

Do not begin in one 1,500-line `index.ts`. The economic model, AI, and renderer need independent tests and will change at different rates.

### Core types

```ts
export type GoodId = 'echo' | 'shadow' | 'rain' | 'pear' |
  'map' | 'eclipse' | 'apology' | 'candle';

export type Trait = 'memory' | 'living' | 'clockwork' | 'celestial' |
  'edible' | 'forbidden' | 'prophetic' | 'ceremonial';

export type RumorFrame = 'coveted' | 'vanishing' | 'counterfeit' | 'cursed';
export type RumorIntensity = 'whisper' | 'broadside' | 'proclamation';
export type SourceId = 'player' | FactionId;

export interface MarketGoodState {
  id: GoodId;
  midPrice: number;
  previousPrice: number;
  stock: number;
  playerFlow: number;
  artifactFlow: number;
}

export interface RawLot {
  id: string;
  goodId: GoodId;
  acquisitionDay: number;
  costBasis: number;
  acquiredFrom: 'market' | 'recovery';
}

export interface Artifact {
  id: string;
  recipeId: string;
  ingredientIds: [GoodId, GoodId];
  ingredientLotIds: [string, string];
  ingredientCosts: [number, number];
  traits: Trait[];
  resonance: number;
  craftedDay: number;
  heldBells: number;
  witnessedRumorIds: string[];
  methodTrace: TraceLine[];
}

export interface Rumor {
  id: string;
  sourceId: SourceId;
  subject: GoodId;
  frame: RumorFrame;
  direction: -1 | 1;
  intensity: 1 | 2 | 3;
  publishedDay: number;
  activeClosesRemaining: number;
  originPrice: number;
  evidence: number;
  beliefByFaction: Partial<Record<FactionId, BeliefResult>>;
  outcome: 'active' | 'fulfilled' | 'unresolved' | 'exposed';
}

export interface FactionState {
  id: FactionId;
  cash: number;
  lots: RawLot[];
  artifacts: Artifact[];
  credibility: number;
  rumorHistory: RumorOutcomeRecord[];
  trust: Record<SourceId, number>;
  agendaId: AgendaId;
  rng: RngState;
}

export type GamePhase =
  | 'title'
  | 'briefing'
  | 'market'
  | 'actionPreview'
  | 'bellPreview'
  | 'bellReport'
  | 'methodDraft'
  | 'actReport'
  | 'ending';

export interface GameState {
  version: 1;
  mode: 'tutorial' | 'standard';
  seed: number;
  phase: GamePhase;
  day: number;
  act: number;
  actionsRemaining: number;
  publishedToday: boolean;
  cash: number;
  credibility: number;
  suspicion: number;
  publishLockedUntilDay: number | null;
  market: Record<GoodId, MarketGoodState>;
  rawInventory: RawLot[];
  artifacts: Artifact[];
  activeRumors: Rumor[];
  rumorHistory: Rumor[];
  factions: Record<FactionId, FactionState>;
  methods: MethodId[];
  conditionId: ConditionId;
  commission: CommissionState;
  pendingAction: PendingAction | null;
  lastAction: ActionResolution | null;
  lastBell: BellResolution | null;
  journal: JournalEvent[];
  rng: RunRngState;
}
```

Engine state contains serializable gameplay only. Cursor positions, open panel, selected row, help visibility, animation frame, and pause selection belong in a separate `UiState` in `index.ts`.

### Commands and pure APIs

```ts
export type MarketAction =
  | { type: 'buy'; goodId: GoodId }
  | { type: 'sellRaw'; lotId: string }
  | { type: 'combine'; firstLotId: string; secondLotId: string }
  | { type: 'sellArtifact'; artifactId: string; factionId: FactionId }
  | { type: 'publish'; subject: GoodId; frame: RumorFrame; intensity: RumorIntensity };

export type Command =
  | { type: 'start'; mode: 'tutorial' | 'standard'; seed?: number }
  | { type: 'previewAction'; action: MarketAction }
  | { type: 'confirmAction' }
  | { type: 'cancelPreview' }
  | { type: 'endDay' }
  | { type: 'dismissBellReport' }
  | { type: 'chooseMethod'; methodId: MethodId }
  | { type: 'continueAct' }
  | { type: 'restart'; sameSeed: boolean };

export function createGame(seed: number, mode: GameMode): GameState;
export function validateAction(state: GameState, action: MarketAction): ValidationResult;
export function evaluateAction(state: GameState, action: MarketAction): ActionResolution;
export function applyCommand(state: GameState, command: Command): GameState;
export function resolveBell(state: GameState): BellResolution;
export function derivePublicView(state: GameState): PublicGameView;
export function deriveFactionObservation(state: GameState, factionId: FactionId): FactionObservation;
```

`evaluateAction` and `resolveBell` return complete resolution records. `confirmAction` commits the stored resolution instead of re-running random or order-sensitive logic. This guarantees preview/commit parity.

### Engine invariants

- Cash, prices, stock, action counts, credibility, and suspicion are integers.
- Mid-prices remain 3–80 and stock remains 0–6.
- Player cash never becomes negative through a validated action.
- Total player inventory slots equal raw lots plus artifacts and never exceed eight.
- Every raw lot ID and artifact ID is unique.
- Combining consumes exactly two distinct owned raw lots and creates exactly one artifact.
- Every artifact references a valid unordered recipe and preserves both cost bases.
- A sold artifact exists in exactly one faction estate and no longer in player inventory.
- One player rumor at most is published per day.
- A newly published rumor cannot affect an opening quote or bid generated before it.
- Every active rumor loses exactly one close at a bell and settles exactly once.
- Credibility remains 0–6; Suspicion follows the inspection rule and never exceeds 6 after resolution.
- Faction orders respect their cash, holdings, stock, and action allowance.
- The sum of stock and held raw lots changes only through authored restock/condition rules; ordinary trades conserve lots.
- Gameplay never calls `Math.random()` or reads wall-clock time after seed creation.
- Same seed and command transcript produce byte-equivalent serializable gameplay state, bell reports, bids, and ending.

## Determinism and replay

Use a serializable 32-bit PRNG and named streams:

```ts
interface RunRngState {
  content: RngState;       // conditions, commissions, method offers
  circulars: RngState;     // source rotation and equal-score claim ties
  faction: Record<FactionId, RngState>; // faction order ties only
  flavour: RngState;       // equivalent story-fragment variants
}
```

Animation, title glitches, and cursor pulses use an independent cosmetic counter and never advance gameplay RNG.

A replay transcript stores:

- engine/content version;
- numeric seed and mode;
- high-level accepted commands;
- optional expected final hash, rank, and journal digest for tests.

Same-seed restart resets all streams and content. A new-seed restart creates only a new seed; it does not reuse a partially consumed stream.

## Content validation

Run content validation in tests and fail loudly when:

1. a good, recipe, faction, agenda, method, condition, or commission ID is duplicated;
2. any of the 28 unordered raw-good pairs lacks exactly one recipe;
3. a recipe references the same ingredient twice or an unknown trait;
4. artifact titles are duplicated or exceed the compact renderer's declared width without a short label;
5. resonance, base prices, volatility, stock, or condition deltas are outside declared ranges;
6. a commission cannot be completed by at least one recipe and eligible buyer;
7. a method references an event or trace field the engine never emits;
8. a public condition affects no listed good, recipe, rumor, or faction decision;
9. a faction can generate no legal claim or order in a valid empty/low-cash state;
10. tutorial locks allow a command that bypasses the lesson or make the required transcript illegal.

Use static content, not generated names, for every decision-critical object in Version 1.

## Test plan

### Market arithmetic

- Bid/ask spreads match volatility and never cross.
- Mean reversion moves toward the correct stock-adjusted anchor.
- Buy and sell flow have equal and opposite effects in symmetric fixtures.
- Rumor, event, artifact, and flow terms appear once in the trace.
- The 20% cap and absolute 3–80 bounds hold at both extremes.
- Stock constrains player and faction purchases and restocks exactly one step.
- Permuting faction record order does not change prices or fills.
- A bell with zero flow, rumor, condition, and anchor gap leaves price unchanged.

### Trading and accounting

- Buy consumes one action, cash at ask, and one stock; it creates one lot with correct cost basis.
- Sell consumes one action, pays bid, adds stock, and removes exactly one selected lot.
- Illegal cash, stock, ownership, inventory, and action cases leave state unchanged with a reason.
- Confirmation applies a preview once; repeated confirmation cannot duplicate cash or items.
- Final liquidation uses the displayed final bid and 70% artifact appraisal.
- Player and faction estate values use the same shared function.

### Crafting and bids

- Every unordered pair resolves to the same artifact regardless of selected order.
- All 28 recipes exist, inherit declared traits, and produce unique names.
- Combining consumes two lots, frees one slot, and preserves their individual cost bases.
- Every bid term matches the explanation trace and final sum.
- Preferences cap at +8, saturation caps at -8, and bids clamp to 5–90.
- Newly published same-day rumors do not change already generated artifact bids.
- Artifact sale transfers ownership once, creates correct ingredient spillover, and satisfies an eligible commission once.
- Final chronicle never names an artifact, sale, buyer, method, or rumor absent from the journal.

### Rumors and reputation

- A queued rumor does not alter an action-phase quote.
- Each faction's belief band matches score thresholds and top reasons.
- Low stock supports Vanishing while repeated-subject fatigue reduces belief.
- Rumors affect exactly two closes unless Quiet Source explicitly changes duration.
- Settlement compares against the pre-effect origin price and occurs once.
- Bullish/bearish fulfilled, exposed, and unresolved outcomes update resources correctly.
- Suspicion inspection locks publishing for exactly one following day and applies one fine.
- Equal faction observations and RNG states yield equal belief results.

### Faction AI and secrecy

- AI cannot buy without cash/stock or sell a lot it does not own.
- Publishing consumes an action-equivalent for the morning source.
- Each doctrine exhibits its documented bias in curated fixtures.
- A hoarder favors scarce owned/desired goods; a contrarian can buy a believed bearish fall.
- Changing an unobserved UI selection or future RNG stream does not change an order.
- Equal `FactionObservation`, faction private state, and RNG produce identical plans.
- Candidate tie resolution is stable and seeded.
- Public view serialization contains no agenda ID before its reveal stage.

### Engine and run flow

- Standard start creates the documented resources, market, factions, commission, and morning circular.
- The player receives exactly three actions per day and at most one Publish.
- End Day resolves in the documented ten-step order.
- Days 3 and 6 enter a legal, non-duplicate method draft; Day 9 enters ending.
- Conditions obey act restrictions and commissions are reachable.
- Inspection, act transition, method draft, commission, and ending occur once.
- Same seed plus transcript produces the same final state hash and chronicle.
- Same-seed restart reproduces the opening; new-seed restart changes only allowed content.
- A fixed Guided Fair transcript completes all lessons.
- At least three fixed standard-run transcripts finish with valid first, middle, and last placements.

### Renderer and lifecycle

- Snapshot or smoke-render every phase at 80×28 and 100×32.
- Strip ANSI and assert no rendered line exceeds terminal width and no positioned row exceeds height.
- Inspect title, tutorial locks, action selection, invalid action, combine preview, bid detail, rumor builder, bell report, method draft, inspection, help, pause, victory, and non-winning ending.
- Inspect default and at least one light theme; verify every status remains legible without color.
- Check the longest artifact, commission, condition, faction clue, and trace text.
- Verify resize messages at width-only, height-only, and both-too-small cases.
- Stop, quit, restart, list games, next game, and errors dispose listeners/intervals, reset ANSI style, show the cursor, and leave the alternate buffer exactly once.

## Balance targets and simulation

Initial numbers are hypotheses. Add test-only heuristic players and faction soak runs over at least 5,000 seeds.

| Metric | Initial target |
|---|---:|
| Standard run | 12–18 minutes |
| Player decision time | 15–35 seconds per action |
| First post-tutorial win rate | 40–60% |
| Any single faction win rate | 15–30% |
| Player actions spent trading | 35–55% |
| Player actions spent combining/offering | 25–45% |
| Player actions spent publishing | 10–25% |
| Artifacts sold per run | 2–5 |
| Rumors published per run | 2–5 |
| Rumors fulfilled | 35–60% |
| Inspection triggers | fewer than 1 per typical run |
| Commissions completed | 1–3 per run |
| Final first-to-last estate spread | 20–70 crowns |

Soak reports should include faction/player estate distribution, good price ranges, stockouts, action mix, artifact profitability, rumor outcomes by frame/intensity, credibility/suspicion, method pick/win rates, commission completion, and the largest single bell movement.

### Dominant-strategy checks

Compare simple scripted policies across seeds:

- buy lowest / sell highest without rumors or crafting;
- always publish the loudest bullish claim about current holdings;
- never publish and only craft the current best displayed bid;
- hoard the highest-volatility good;
- always complete the commission;
- random legal actions;
- balanced heuristic using prices, bids, and faction belief.

No trivial policy should beat the balanced heuristic across most seeds. Specifically:

- Proclamation spam must lose value through suspicion and credibility often enough to be a situational strategy;
- pure raw speculation must remain viable but not make artifact creation irrelevant;
- automatic “combine whichever pair has the highest immediate bid” must not dominate holding, rumors, and commissions;
- a bearish rumor must be useful for acquisition or denial even without short selling;
- one method must not improve win rate by more than roughly 15 percentage points without a narrow build requirement.

Human playtests decide whether bluffing is readable and exciting; soak tests only reveal arithmetic and policy imbalance.

## Implementation milestones

### Milestone 0 — Paper and spreadsheet proof

Implement the eight goods, four factions, four rumor frames, one condition, and six sample recipes in a disposable calculation sheet or pure test fixture. Hand-resolve six days including:

- one successful bullish rumor;
- one exposed Proclamation;
- one faction countertrade;
- one low-stock cap;
- one artifact sold because of a believed rumor;
- final estate liquidation.

**Done when:** two manual resolutions of the same transcript produce identical prices, cash, stock, belief bands, and estates, and the obvious buy/pump/sell line carries at least one full bell of risk.

### Milestone 1 — Types, content, and deterministic kernel

Create `types.ts`, `seed.ts`, and `content.ts`. Add the complete goods and recipe tables, factions, initial methods, conditions, commissions, ID utilities, content validation, and named RNG streams.

**Done when:** all 28 pairs validate, same seeds create identical opening content, and gameplay code contains no `Math.random()`.

### Milestone 2 — Trading, prices, and rumors

Implement quote calculation, action validation, lot accounting, stock, price clearing, rumor activation, faction belief, settlement, credibility, suspicion, and full traces. Use a minimal fixed faction-order fixture before real AI.

**Done when:** preview/commit parity, price bounds, stock conservation, rumor delay, settlement, and permutation independence pass unit/property tests.

### Milestone 3 — Crafting, bids, commissions, and story records

Implement raw-pair crafting, artifact provenance, faction bid evaluation, sale transfer, ingredient spillover, commission validation/completion, and journal-based sale/ending story selection.

**Done when:** any pair can be combined and sold with an exact bid explanation, every commission is reachable, and story tests prove no fabricated facts.

### Milestone 4 — Fair faction simulation

Implement faction observations, doctrines, private agendas, public clues, circular generation, two-action planning, portfolio updates, public wealth bands, and deterministic tie-breaking.

**Done when:** AI legality/fairness tests pass, each doctrine behaves distinctly in fixtures, and a nine-day headless run completes over thousands of seeds without invalid state.

### Milestone 5 — Pure engine and terminal vertical slice

Implement the phase reducer, standard three-day Act I, UI state, input mapping, 80×28 renderer, action previews, inspect panels, bell report, shared pause menu, resize state, and lifecycle cleanup. Include six polished recipes and four methods first, even though the data layer already validates the full table.

**Done when:** a new player can complete Act I in the terminal, explain the delayed rumor rule, create and sell one artifact, and identify why a faction believed or rejected a claim.

### Milestone 6 — Guided Fair and full nine-day content

Implement the actual tutorial locks/transcript, all recipes, twelve methods, nine or more conditions, at least nine reachable commissions, all act transitions, agenda clues, inspection consequence, liquidation, ranks, and final chronicle.

**Done when:** the guided transcript and at least three standard fixed-seed transcripts complete, every displayed feature is wired, and no run requires save/suspend to meet the session target.

### Milestone 7 — Balance, visual language, and integration

Run soak simulations and 5–10 new-player tests. Tune formulas and content weights; do not add systems. Complete the glyph/ASCII pass, light-theme inspection, long-text audit, start/bell/end accents, controller cleanup, registry metadata, and documentation.

Register:

```ts
{
  id: 'market-of-mirrors',
  name: 'Market of Mirrors',
  description: 'Trade strange goods. Plant the rumor. Sell the story.',
  maturity: 'workshop',
  pace: 'turn-based',
  difficulty: 3,
  session: '10–15 min',
  run: runMarketOfMirrorsGame,
}
```

Keep it at `workshop` until the tutorial, layout, full-run transcripts, and balance gates pass. Promote based on playtest evidence, not feature count.

**Done when:** `npm run typecheck`, `npm test`, and `npm run build` pass; all normal phases fit 80×28; lifecycle checks pass; first-time testers use trade, craft, and rumor without external explanation; and no simple dominant policy wins the soak suite.

## Gamr integration requirements

- Export `runMarketOfMirrorsGame(terminal)` returning `{ stop, isRunning }`.
- Import `getCurrentThemeColor()` and light-theme helpers rather than hard-coding neutral UI colors.
- Import and use `PAUSE_MENU_ITEMS`, `renderSimpleMenu`, and `navigateMenu`.
- Use `dispatchGameQuit`, `dispatchGamesMenu`, and `dispatchGameSwitch` for transitions.
- Enter the alternate buffer and hide the cursor once after startup.
- Render at about 20 FPS for title accents and input responsiveness, but call the reducer only for accepted commands; there is no gameplay update interval.
- On stop, clear the render interval, dispose the key listener, reset ANSI state, restore the cursor, and leave the alternate buffer once.
- Display a centered, accurate resize message below 80×28.
- Add the import, active registry entry, and named export in `src/games/index.ts` only after the release gate for the intended maturity is met.

## Risks and protected decisions

| Risk | Mitigation / decision to protect |
|---|---|
| Rumors feel like a free price button | Preserve next-bell latency, independent faction belief, counterorders, credibility, suspicion, and daily caps. |
| The best play is always buy then publish bullish | Include bearish acquisition play, rival responses, spread, stock constraints, holding risk, repeated-subject fatigue, and policy soak tests. |
| Players cannot tell whether rivals lie | Keep doctrines public, rumor records visible, order reports causal, and agenda clues staged. Do not make bluff truth a random coin flip. |
| Price math overwhelms the fiction | Keep only eight goods, integer deltas, one daily movement, short traces, and deeper inspect on demand. |
| Fiction obscures mechanics | Put ticker, traits, price, direction, and bid arithmetic before prose. Never parse flavor text. |
| Crafting becomes an obvious conversion table | Use cost basis, buyer-specific bids, saturation, commissions, rumors, and holding methods so the best pair depends on the run. |
| Crafting content explodes | Restrict Version 1 to raw + raw and author exactly 28 unordered recipes. |
| Factions cheat accidentally | Give AI a typed observation, test equal-observation determinism, and keep future state out of the function signature. |
| One faction snowballs | Cap orders, use shared estate accounting, limit agenda bonuses, and track win rate by faction across seeds. |
| Too many panels clip at 80 columns | Design and snapshot the compact layout first; wrap/truncate within measured boxes after stripping ANSI. |
| Tutorial is only renamed campaign play | Use fixed tutorial scenario data, command locks, explicit lesson completion, and a regression transcript. |
| Methods are displayed but inert | Data-driven trace requirements plus a test for every released method; cut any unimplemented method. |
| A nine-day run drags | Three actions, one market move per day, concise reports, direct shortcuts, and a 12–18 minute playtest target. |
| Generated stories claim false events | Build chronicles only from journal records and test every referenced ID. |

## Explicit Version 1 non-goals

- Real equities, realistic exchanges, order books, leverage, margin, options, short selling, interest, taxes, or financial advice.
- Online multiplayer, hot-seat secrecy, matchmaking, spectators, or networked leaderboards.
- Recursive artifact crafting, dismantling trees, material quality tiers, durability, or an unlimited inventory.
- More than eight raw goods, 28 pair recipes, four factions, two methods per run, or one commission per act.
- A persistent campaign, meta-currency, unlock grind, save file, shop upgrades, or achievements required for balance.
- Runtime LLM story generation, free-text rumor entry, semantic text parsing, or internet access.
- Hidden random price shocks, random critical sales, or untraceable faction decisions.
- Negotiation dialogue trees, relationship meters, combat, theft, sabotage, or legal trials.
- Mouse-required controls, real-time deadlines, sound-dependent cues, or animation that delays a turn report.

These can be reconsidered only after the nine-day game proves that reading a rival, timing a rumor, and selling a meaningful combination are fun without them.

## Definition of done

Market of Mirrors Version 1 is complete when a new player can finish the Guided Fair without outside instructions, then play a nine-day run in which they buy and sell at visible quotes, create at least one of 28 authored artifacts, understand every faction bid, publish a rumor whose effect waits until the bell, identify why each faction believed or rejected it, draft two functioning methods, and read a final estate ranking and chronicle derived only from actual events.

The engine must be deterministic from seed and command transcript; prices, lots, stock, belief, reputation, AI actions, recipes, and estate accounting must satisfy their invariants and tests. Every released method, condition, commission, faction behavior, control hint, and tutorial step must be implemented. The interface must fit every phase at 80×28 in dark and light themes with ASCII fallbacks, and quitting or switching must restore the terminal safely. `npm run typecheck`, `npm test`, and `npm run build` must all pass before the game leaves workshop status.
