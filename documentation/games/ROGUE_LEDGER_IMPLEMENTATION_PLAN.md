# Rogue Ledger — Full Game & Implementation Plan

## Product decision

**Rogue Ledger is a deterministic, turn-based accounting roguelite about keeping an impossible company solvent through six bizarre quarters.** The player is the newly appointed Chief Ledgerkeeper of a company whose ordinary business—freight, research, public works, hospitality—has become entangled with lunar repossessions, sentient invoices, a dragon-union strike, and an audit from tomorrow.

The player does not play cards, make poker hands, or try to reproduce Balatro. Each quarter they draft a small set of **accounting rules** and **expense categories**, then classify a queue of strange transactions. The value comes from discovering elegant, readable interactions: an expense category can become profitable when a policy recognizes it; a policy can multiply a subtotal, redirect a loss, or make a riskier transaction legal. The player builds a compact financial machine and has to survive its consequences.

Version 1 is a complete 25–35 minute campaign: six quarters, eight transaction decisions per quarter, a deterministic draft after each cleared quarter, a small authored event pool, a final annual audit, replay seeds, local best-run storage, and a compact 80×28 terminal interface.

## Design pillars

1. **Accounting is the verb.** Every action is a recognizable financial decision: classify a transaction, choose its ledger treatment, draft a policy, or accept/reject an event contract. There is no combat layer hiding the premise.
2. **Synergies are explicit.** Every modifier names its trigger and result. A player should be able to point to the rule chain that made a $30 loss become a $550 quarterly gain.
3. **Risk has a ledger.** Powerful effects create visible liabilities: audit exposure, deferred costs, restricted categories, or a future obligation. High scores come from planned risk, not random jackpot rolls.
4. **No unknowable accounting.** The current rules, each transaction's tags, projected result, and audit risk are visible before commitment. Weird fiction supplies flavour, never hidden requirements.
5. **Short decisions, long build.** A transaction should take 5–20 seconds; a quarter should change the build materially; a full run should create a memorable engine without demanding spreadsheet endurance.
6. **Deterministic and testable.** A seed plus command sequence recreates every offer, event, transaction, and result. The financial evaluator remains pure TypeScript, fully independent of ANSI rendering.

## Player fantasy and experience

> “I did not beat the quarter by finding a lucky combo. I made the Moonlight Depreciation rule, the Long-Term Liability category, and the Emergency Reclassification policy agree with each other.”

The emotional arc is a controlled escalation:

| Beat | Player sees | Player feels |
|---|---|---|
| First books | A clean purchase, income, and ordinary expense. | “I understand the basic ledger.” |
| First rule | A policy turns a tagged cost into an advantage. | “This has build potential.” |
| First liability | A strong conversion adds audit exposure or delayed cost. | “I can take this, but I must plan around it.” |
| Compound quarter | Several policies fire in a legible order. | “I built a machine.” |
| Crisis event | The company asks for a one-quarter exception. | “My build has a distinctive answer to this problem.” |
| Final audit | A report explains the annual result and every major trigger. | “The outcome follows from my decisions.” |

Target timing:

- Tutorial: 3–5 minutes.
- Normal quarter: 3–4 minutes.
- Complete run: 25–35 minutes on a first attempt, 15–25 minutes after learning the content.
- Decision count: 48 base transactions plus 4–7 event contracts.

## Core loop

1. Read the quarterly forecast: revenue target, audit tolerance, one new event modifier, and the categories most likely to appear.
2. Inspect the next transaction: amount, direction, tags, source, timing, and any unusual clause.
3. Choose a **ledger treatment**—book it normally, capitalize/defer it, expense it now, reserve it, or decline it—when that transaction permits multiple treatments.
4. The engine calculates the entry using the currently drafted rules, shows a compact pre-commit projection, then commits it.
5. Resolve effects in a fixed, visible order: category base value → treatments → rule triggers → multipliers → liabilities → audit checks → quarter totals.
6. Clear the quarter by meeting its solvency target before audit exposure reaches its limit. Draft one policy or category from a deterministic offer, then proceed.
7. After Quarter 6, pass a final audit and receive an ending/rank based on cash, standing, liabilities settled, and how the company survived.

The central decisions are not “what is the highest number?” They are:

- Which recurring tag should become the build's financial identity?
- Is a short-term loss worth a category that later turns losses into assets?
- Do I take a rule that doubles high-risk outcomes when my audit meter is already fragile?
- Should I decline an attractive transaction because its delayed liability will arrive during the next crisis?

## Financial model

### Resources

All monetary amounts are integer **credits**. The game displays positive credits with `+` and costs with `-`; it never uses floating-point currency.

| Resource | Range | Meaning | Loss condition |
|---|---:|---|---|
| Cash | unbounded | Current available operating money. | Cash below the emergency floor at quarter close causes insolvency. |
| Quarterly profit | unbounded | Sum of all entries this quarter after rules. | Must meet that quarter's target. |
| Audit exposure | 0–12 | How suspicious the books look to hostile auditors. | At 12, the run ends in an audit seizure. |
| Standing | 0–100 | Supplier, employee, and public confidence. | Low standing raises future costs; 0 ends the run. |
| Deferred liabilities | 0–99 | Scheduled future debits created by certain policies. | They are paid at specified future checkpoints. |
| Rule slots | 0–6 | Capacity for policies. | Full slots require replacing a policy. |
| Category slots | 0–5 | Capacity for custom expense categories. | Full slots require replacing a category. |

The run begins with Cash 120, Standing 60, Audit 0, three rule slots, and two category slots. It cannot be lost because of a single surprising transaction: loss comes only from a visible quarter-close cash/profit check, exposure 12, or standing 0.

### Transaction anatomy

Every transaction is a structured object. Text rendering is built from this data; game logic never parses prose.

```ts
type TransactionKind = 'income' | 'expense' | 'asset' | 'liability' | 'contract';
type Tag =
  | 'routine' | 'emergency' | 'research' | 'infrastructure'
  | 'occult' | 'personnel' | 'luxury' | 'interplanetary'
  | 'recurring' | 'one-off' | 'regulated' | 'volatile';

type Treatment = 'book' | 'capitalize' | 'defer' | 'reserve' | 'decline';

interface Transaction {
  id: string;
  title: string;
  description: string;
  kind: TransactionKind;
  baseCredits: number;          // signed: income +, cost -
  tags: Tag[];
  allowedTreatments: Treatment[];
  dueQuarter?: number;
  source: string;
  categoryHint?: CategoryId;
  eventId?: EventId;
  visibleClauses: string[];
}
```

Each transaction always has a base value and at least two visible facts that can trigger rules. For example:

```text
MOONLIGHT REPOSSESSION FEE                         EXPENSE  -42
Tags: OCCULT · INFRASTRUCTURE · RECURRING
Source: Lunar Municipal Authority
Clause: “Pay before the moon notices the building.”

Treatments: [B] Book now  [C] Capitalize  [D] Defer
```

### Treatments

Treatments are transaction-level choices, distinct from persistent draft choices. The initial implementation uses five simple, reusable treatments:

| Treatment | Immediate result | Future consequence | Typical use |
|---|---|---|---|
| Book | Apply base credits normally. | None. | Safe default. |
| Capitalize | Apply 35% of an eligible expense now. | Add equal installments for the next two quarters; +1 audit. | Smooth a large infrastructure/research cost. |
| Defer | Apply 0 credits now. | Pay 120% next quarter; +1 audit. | Survive a momentary cash crunch. |
| Reserve | Apply base credits now; mark it reserved. | Rules may reward or release the reserve; otherwise it remains a liability. | Feed a reserve-oriented build. |
| Decline | Apply 0 credits. | Lose small standing for contracts; avoids unsafe commitments. | Refuse a poisonous opportunity. |

Only treatments that make narrative and financial sense appear. Income normally allows Book or Reserve; a paid contract can allow Book or Decline; an asset purchase can allow Book, Capitalize, or Defer. No treatment may create an ambiguous or hidden outcome.

### Persistent build pieces

The draft contains two intentionally different object types.

**Accounting Rules** are policies with a concise trigger and effect. They fire automatically when a committed entry matches.

**Expense Categories** are classifications that attach to future transactions, change how their subtotal is counted, or create a one-time category ability. Categories are not cards; they model company budgeting choices such as “Long-Term Weirdness” or “Crew Retention.”

```ts
type RuleEffect =
  | { type: 'addCredits'; amount: number }
  | { type: 'multiplyEntry'; numerator: number; denominator: number }
  | { type: 'reduceAudit'; amount: number }
  | { type: 'addAudit'; amount: number }
  | { type: 'addStanding'; amount: number }
  | { type: 'scheduleLiability'; amount: number; dueQuarterOffset: number }
  | { type: 'retag'; add: Tag[]; remove?: Tag[] }
  | { type: 'convertLossToReserve'; percent: number };

interface AccountingRule {
  id: RuleId;
  name: string;
  text: string;
  trigger: Trigger;
  effects: RuleEffect[];
  priority: number;
  rarity: 'common' | 'unusual' | 'singular';
}

interface ExpenseCategory {
  id: CategoryId;
  name: string;
  text: string;
  match: Tag[];
  entryModifier: RuleEffect[];
  quarterCloseModifier?: RuleEffect[];
  icon: string;
}
```

### Example rules and categories

The initial release needs 36 rules and 24 categories. That pool is large enough for replayability but small enough to balance deliberately.

| Build piece | Trigger / match | Effect | Cost or limit |
|---|---|---|---|
| Moonlight Depreciation | Occult asset is capitalized | +18 credits; mark it recurring. | +1 audit. |
| Emergency Procurement | Emergency expense booked now | First one each quarter gains +30 credits. | Second emergency expense adds +2 audit. |
| Polite Collection Notices | Recurring income | +15 credits per prior recurring entry this quarter. | Maximum +60. |
| Interstellar Withholding | Interplanetary income | Keep 20% in reserve instead of cash. | Reserve releases only at close. |
| Dragon-Union Accord | Personnel expense | +10 Standing; if Standing ≥75, refund 20 credits. | Cannot trigger on a declined contract. |
| Auditable Miracles | Regulated + occult entry | Double positive entry effects. | +2 audit once per quarter. |
| Asset of Last Resort | First loss of 40+ | Convert 50% of loss to a reserve. | Reserve is released next quarter. |
| Predictable Catastrophe | Volatile transaction | +25 credits if it was forecast this quarter. | -8 Standing if it was not. |
| Long-Term Weirdness | Occult + recurring expenses | Every second matching cost is reduced by 25%. | No effect on first entry. |
| Crew Retention | Personnel expenses | +1 Standing per 15 spent. | At 90 Standing, excess becomes cash. |
| Deferred Infrastructure | Infrastructure expenses | Capitalize costs pay 15% less next quarter. | Capitalize adds no audit reduction. |
| Compliance Theatre | Regulated entries | The first three matching entries reduce audit by 1. | Fourth and later gain no benefit. |

These combinations create the intended “score explosion” without opaque arithmetic. For example, a player with **Long-Term Weirdness**, **Moonlight Depreciation**, and **Asset of Last Resort** can capitalize an occult recurring asset: the category reduces the cost, the rule adds immediate credit and recurring status, and a large loss becomes a scheduled reserve. The preview lists each line, so the player understands the chain rather than merely seeing a large number.

### Resolving one entry

The evaluator always uses this order and returns a record for the renderer:

1. Validate the chosen treatment is allowed.
2. Create the base ledger entry from transaction credits and treatment.
3. Assign matching player categories and category modifiers.
4. Apply rules sorted by `priority`, then stable `id`.
5. Apply capped multipliers to the current entry subtotal.
6. Add scheduled liabilities and reserve changes.
7. Apply audit and standing effects.
8. Clamp audit and standing, update cash/profit, and validate invariants.
9. Create an explanation line for every applied modifier and every skipped capped modifier.

```ts
interface EntryResolution {
  transactionId: string;
  treatment: Treatment;
  baseCredits: number;
  treatmentCredits: number;
  categoryCredits: number;
  ruleCredits: number;
  multiplier: { numerator: number; denominator: number };
  finalCredits: number;
  auditDelta: number;
  standingDelta: number;
  scheduledLiabilities: ScheduledLiability[];
  triggered: TriggerRecord[];
}
```

**Balance guardrails:** Multipliers are represented as integer rational numbers; their combined per-entry cap is ×5. Positive one-entry credits are capped at +300 before quarter-close bonuses. A rule can fire at most once per transaction unless it explicitly declares a bounded counter. This preserves spectacular turns while preventing exponential, unreadable loops.

## Quarter structure and campaign

### Quarter sequence

1. **Forecast.** Display target, cash floor, audit capacity, upcoming scheduled liabilities, and one visible bizarre market condition.
2. **Transaction desk.** Resolve eight transactions. After transaction 4, reveal a short mid-quarter forecast to prevent accidental liability surprises.
3. **Quarter close.** Pay due liabilities, release reserves, apply quarter-close category effects, and determine whether the target was met.
4. **Draft.** Offer three items: normally two rules and one category, with occasional event-specific replacements. Pick one, skip, or replace an installed item when full.
5. **Quarter report.** Explain profit sources, audit changes, standing changes, and the next quarter's crisis.

Each quarter has a target matched to plausible build power, rather than a static score gate. Target formula:

```ts
target = baseTargetByQuarter[quarter]
  + 12 * installedBuildPieces
  + 8 * acceptedOptionalContracts;
```

It is generated before the quarter starts and shown in full. At least one conservative route through each quarter should meet the target without rare content; stronger engines exceed it substantially.

### Six-quarter campaign

| Quarter | Theme | New pressure | Design lesson |
|---:|---|---|---|
| 1: Provisional Books | The company’s mundane bills awaken. | Only Book/Decline plus one category. | Tags and profit target. |
| 2: Lunar Lease | The moon claims office space. | Capitalization and one scheduled cost. | Current versus future money. |
| 3: Union of Dragons | Staff bargain collectively and breathe fire. | Standing becomes relevant. | Profit can support a non-cash resource. |
| 4: Tomorrow’s Audit | Auditors know outcomes before entries occur. | Regulated/forecast interactions; rising audit pressure. | Rule sequencing and risk. |
| 5: The Infinite Invoice | A supplier bill recursively references itself. | Volatile entries and optional crisis contract. | Deliberate liability management. |
| 6: Annual Reckoning | The company must explain the impossible year. | Final audit and a selected rule callback. | Build expression under a clear finish line. |

### Win, loss, and annual audit

A quarter is cleared if, after close, cash is at least the shown emergency floor, profit meets the shown target, audit is under 12, and standing is above 0. On a failed quarter, show the exact failing condition and offer restart-from-quarter with the same seed and build (Version 1 is forgiving; it does not erase the whole run).

At the end of Quarter 6, the annual audit calculates a rank:

```text
Annual result = ending cash
              + total positive rule credits
              + 5 × standing
              - 12 × audit exposure
              - unpaid liabilities
```

Rank thresholds: **Probationary Clerk**, **Certified Survivor**, **Director of Improbable Finance**, **Legendary Ledgerkeeper**. The ending text also highlights the most profitable rule, most-used category, and one event consequence. This is a report, not a leaderboard-only score screen.

## Events and content generation

### Event design

Events are authored financial conditions that modify a quarter; they are not random punishments. An event appears on the forecast screen, states its rule in plain language, and offers transactions whose tags make that rule relevant.

| Event | Visible condition | Opportunities and trade-off |
|---|---|---|
| Lunar Repossession | Capitalized occult assets add 1 audit this quarter. | Buy lunar equipment cheaply, but accept audit pressure. |
| Dragon-Union Strike | Personnel costs are 25% higher. | Sign a retention contract for standing and future income. |
| The Glass Tax | Luxury entries gain 30 credits but are regulated. | Exploit a temporary rebate at audit risk. |
| Tomorrow’s Audit | Forecast transactions are marked. | Predictable Catastrophe and forecast rules become valuable. |
| Sentient Invoice | The first deferred cost is duplicated next quarter. | Decline it, reserve it, or build around the liability. |
| Interplanetary Mail Delay | Interplanetary income is delayed one entry. | Reserve/recurring builds can turn delay into a benefit. |

Content is authored as concise data tables: 45 transactions, 18 event contracts, 12 quarterly modifiers, 36 rules, 24 categories, and roughly 80 flavour fragments. Transactions may recombine source, title, and clause text, but every decision-critical fact is selected from structured fields.

### Deterministic deck generation

1. Generate a 32-bit run seed.
2. Derive named PRNG streams for quarterly events, transaction deck, draft offers, cosmetic wording, and title glitch. Gameplay streams must never use `Math.random()`.
3. Pick each quarter’s authored event and create an eight-transaction deck matching its lesson.
4. Guarantee baseline coverage: at least two positive, two negative, one treatment choice, one tag matching an offered/installed build piece, and no more than two transactions with the same primary tag consecutively.
5. Inject event contracts only after their rule has been shown in the forecast.
6. Generate three draft offers with no duplicate IDs, at least one relevant synergy/repair option, and no singular item before Quarter 3.
7. Snapshot the generated deck and offers into serializable state.

Generator validation rejects a candidate deck if its conservative simulated policy cannot clear its quarter, if it requires an unavailable treatment, or if a key event tag never appears. A small internal “advisor” heuristic is sufficient; this is not an AI opponent.

## Interface and controls

### Semantic visual vocabulary

| Concept | Glyph | ASCII fallback | Colour role |
|---|---|---|---|
| Cash / income | `+` | `+` | green |
| Cost / liability | `−` | `-` | red |
| Audit exposure | `!` | `!` | amber |
| Standing | `★` | `*` | cyan |
| Rule | `§` | `S` | violet |
| Category | `◇` | `o` | blue |
| Reserve | `▣` | `#` | yellow |
| Scheduled liability | `↳` | `>` | red |
| Forecast | `◌` | `o` | grey |
| Correct close | `✓` | `OK` | green |

All important concepts include text labels; colour and symbols improve scanning but are never the only signal.

### Workbench mock-up

```text
                         ROGUE LEDGER // Q3: UNION OF DRAGONS
 CASH +184       PROFIT +071 / +090 TARGET       AUDIT [!!!.........] 3/12
 STANDING ★★★★...... 42       DUE NEXT Q: -28      INBOX 05 / 08

┌ ACTIVE RULES ───────────────────────┐  ┌ TRANSACTION ─────────────────────────┐
│ § Moonlight Depreciation             │  │ DRAGON-SAFE CANTEEN RETAINER   -36    │
│   Occult capitalized asset: +18, !+1 │  │ EXPENSE · PERSONNEL · EMERGENCY       │
│ § Emergency Procurement              │  │ The kitchen is technically a volcano. │
│   First emergency cost: +30           │  │ Source: Local 900 (Fireproof)         │
│ ◇ Crew Retention                      │  │                                        │
│   Personnel: +1 ★ per 15 spent        │  │ [B] Book -36    [R] Reserve -36       │
└──────────────────────────────────────┘  │ [D] Decline +0   standing -3          │
                                          └────────────────────────────────────────┘
 PROJECTION: BOOK  -36 cash, +0 profit bonus, +2 ★, audit +0
 [Tab] Details  [L] Full ledger  [F] Forecast  [H] Help  [Esc] Pause
```

When a treatment is highlighted, the projection must list every known resolved effect before commitment. `Enter` confirms; `1–5` can choose a treatment directly. If the player cannot read the compact projection, the design has failed.

### Layout requirements

- Full layout: 94×30. Rules and transaction panels appear side by side, with a ledger trace under the entry.
- Compact layout: 80×28. Transaction remains central; rules collapse to a two-line summary and open through `L`; one preview remains visible.
- Below 80×28: freeze gameplay and display the standard Gamr resize message.
- `Tab`: cycle transaction / entry trace / quarterly ledger panel.
- `L`: full ledger and installed rules/categories.
- `F`: forecast and scheduled liability timeline.
- `H`: controls and explanation of all treatment terms.
- `Esc`: shared pause menu. `Q` requests quit through the existing transition helper.

### Screen flow

`start → briefing → working → entryPreview → entryResult → quarterClose → draft → report → next briefing → annualAudit → ending`

The preview can be folded into `working` state if input handling is simpler, but it must be a distinct visual confirmation step for a treatment with a future cost. Choosing Book on an obvious normal transaction may commit immediately after one confirming keypress; Capitalize, Defer, and Reserve always require confirmation.

## TypeScript architecture

Create `src/games/rogue-ledger/` with the following modules:

```text
rogue-ledger/
  index.ts          terminal controller, input mapping, lifecycle
  types.ts          serializable domain types and display constants
  seed.ts           hash/PRNG helpers and named streams
  content.ts        rules, categories, events, transaction templates
  generator.ts      deterministic quarterly decks and draft offers
  evaluator.ts      pure entry-resolution pipeline and explanations
  engine.ts         pure command reducer, quarter-close and progression
  render.ts         ANSI layouts, overlays, compact/full modes
  engine.test.ts    engine and generator unit/property-style tests
  evaluator.test.ts exact rule-order and cap tests
```

### State model

```ts
type Phase =
  | 'start' | 'briefing' | 'working' | 'preview' | 'result'
  | 'quarterClose' | 'draft' | 'report' | 'gameOver' | 'annualAudit' | 'ending';

interface GameState {
  version: 1;
  seed: number;
  phase: Phase;
  quarter: number;
  cash: number;
  quarterProfit: number;
  profitTarget: number;
  emergencyFloor: number;
  audit: number;
  standing: number;
  rules: AccountingRule[];
  categories: ExpenseCategory[];
  liabilities: ScheduledLiability[];
  reserves: Reserve[];
  event: QuarterEvent;
  deck: Transaction[];
  transactionIndex: number;
  selectedTreatment: Treatment | null;
  preview: EntryResolution | null;
  history: LedgerEntry[];
  offers: DraftOffer[];
  notices: string[];
}
```

### Commands

The engine accepts only explicit commands and returns state plus presentation events. Renderer/input code must never mutate business state directly.

```ts
type Command =
  | { type: 'startRun'; seed?: number }
  | { type: 'dismissBriefing' }
  | { type: 'selectTreatment'; treatment: Treatment }
  | { type: 'confirmEntry' }
  | { type: 'dismissResult' }
  | { type: 'chooseDraft'; offerId: string; replaceId?: string }
  | { type: 'skipDraft' }
  | { type: 'continueReport' }
  | { type: 'restartQuarter' }
  | { type: 'restartRun'; seed?: number };
```

`evaluateEntry(state, transaction, treatment)` is pure and must be the single source of truth for both the preview and committed entry. `applyCommand` calls that evaluator, appends a `LedgerEntry`, moves the index, and performs quarter close only after the final entry is resolved.

### Engine invariants

- Cash, profit, audit, standing, liability amounts, and all counters are integers.
- Audit remains in 0–12 and standing in 0–100 after every command.
- No rule or category can be installed twice.
- A treatment cannot be selected if absent from `allowedTreatments`.
- An entry is committed exactly once; leaving/reopening an overlay cannot duplicate it.
- A scheduled liability is paid exactly once in its due quarter.
- The preview and committed resolution are byte-for-byte equivalent for the same pre-command state.
- Replaying a recorded command list from the same seed reaches an equal serialized state.

## Gamr integration

Follow the repository’s controller conventions:

- Export `runRogueLedgerGame(terminal)` with `stop()` and `isRunning`.
- Use `getCurrentThemeColor`, the shared pause menu, `dispatchGameQuit`, `dispatchGamesMenu`, and `dispatchGameSwitch`.
- Enter alternate buffer/hide cursor on start; on stop clear both intervals, dispose `terminal.onKey`, reset styles, and leave the alternate buffer.
- Render at 20 FPS for responsive overlays; only update title glitch/cosmetic effects on the timer. The turn-based engine updates only on input.
- Use shared `ScorePopup`/flash effects sparingly: one popup for a completed rule chain, a quiet screen flash for audit danger, no animation that obscures a projected total.
- Register the game in `src/games/index.ts` with description: `Draft rules. Survive bizarre quarters.`

Persistence is Version 1.1 unless the repository already has a safe local storage helper. Version 1 still displays a run seed and allows restarting it; do not introduce browser storage simply for a score table.

## Implementation milestones

### 0 — Paper proof and content slice

Write one full Quarter 1 deck, six rules, four categories, and a terminal mock-up. Manually calculate at least three synergies and two dangerous liabilities. Confirm every projection can fit in 80 columns.

**Done when:** a reviewer can follow one entry from transaction facts to final credits using only the proposed UI and evaluator order.

### 1 — Pure financial engine

Implement types, seeded PRNG, basic content tables, transaction generation, treatments, evaluator, quarter-close, and commands. No terminal code.

**Done when:** a fixed seed and command transcript reproduce exact cash, profit, audit, standing, liabilities, and trigger trace.

### 2 — Playable vertical slice

Implement controller, renderer, compact/full layout, forecast, two quarters, preview/confirm, audit/standing HUD, and shared pause menu. Use 12–15 build pieces only.

**Done when:** a player can finish the first two quarters without developer commands and explain why each modifier fired.

### 3 — Full campaign

Add six quarterly events, all treatments, 36 rules, 24 categories, draft/replacement UI, annual audit, and fail/restart-from-quarter flow. Curate transaction decks before broad random recombination.

**Done when:** six distinct quarters can be cleared by a conservative build and each has at least one strong but bounded synergy path.

### 4 — Fairness, test, and balance pass

Add generator validation, reproducibility tests, rule-explanation checks, debug trace overlay, seeded replay display, accessibility review, and light-theme/manual size checks.

**Done when:** the game meets the test plan, no test seed produces an unclear required decision, and the user can see why a run failed.

### 5 — Release polish

Add title treatment, concise help, introduction tutorial, soundless event accents, ending variants, game registry entry, and run `npm run typecheck`, `npm test`, and `npm run build`.

## Test plan

Use Vitest for pure modules. Keep snapshots limited to serializable state and human-readable rule traces; do not snapshot ANSI frames as core correctness tests.

### Evaluator tests

- Book, Capitalize, Defer, Reserve, and Decline produce the documented immediate and scheduled results.
- Categories apply before rules; rule priority then stable ID decides every conflict.
- A rule’s once-per-quarter and once-per-entry limits hold.
- Multiplier rational math is exact and the ×5 cap is visible in the trace.
- Trigger chains cannot recursively fire forever; a retagged entry is only reconsidered if an explicit rule allows it.
- Every modifier produces an explanation line naming source, trigger, and numeric delta.
- Preview equals commit result on a cloned state.

### Engine and progression tests

- Quarter close pays only liabilities due that quarter and releases eligible reserves once.
- Cash floor, target, audit, and standing failures identify their exact reason.
- A failed quarter restart restores the stored quarter-start snapshot, not a newly generated deck.
- Draft offers are unique, seed-deterministic, and obey quarter rarity restrictions.
- Replacement removes only the chosen installed item and updates slot counts correctly.
- Same seed plus same commands produces an identical final serialized state after 1,000 replay runs.

### Generator and content tests

- Across 2,000 seeds, each quarter has eight valid transactions and the stated tag/choice coverage.
- All transaction IDs, rule IDs, and category IDs are unique.
- Every generated treatment is allowed by that transaction and has a non-empty projection.
- A conservative advisor policy clears each curated quarter across 500 seeds; investigate, do not silently discard, failures.
- No rule refers to a tag, treatment, or resource absent from the displayed glossary.

### Manual QA

- Play at 80×28, 94×30, and a wide terminal; verify every mandatory fact remains visible.
- Test dark and light themes; verify glyph fallbacks and no colour-only warnings.
- Hammer rapid input at preview/result boundaries; verify no entry duplicates.
- Verify pause, restart, quit, list-games, and next-game clean up listeners and restore terminal state.
- Follow a rule trace in a high-synergy run and confirm the labels match the actual calculation.

## Balance instrumentation

In development builds, `~` toggles a non-shipping trace panel:

```text
SEED 38492017  Q4  TX 05/08
BASE -42  TREAT +27  CAT +11  RULE +48  MULT ×2  FINAL +88
AUDIT +2  STANDING +0  DUE Q5 -18
FIRED: long-term-weirdness, moonlight-depreciation, auditable-miracles
```

At run end, log seed, chosen build pieces, rule-credit totals, treatment distribution, highest audit, largest liability, quarter failures, and ending rank. Use these values to tune targets and individual rules; do not balance by making rare rolls more common.

## Version 1 non-goals

- Poker hands, playing cards, deck construction, or card imagery.
- Real accounting education, tax law simulation, or claims of financial correctness.
- Timers, reflex tests, mouse input, multiplayer, online accounts, cloud save, or live leaderboards.
- Unbounded procedural writing or LLM-generated transactions.
- Meta-currency, grinding, mandatory daily runs, or permanent stat upgrades.
- Hidden odds and effects that cannot be previewed.

## Definition of done

Rogue Ledger is ready when:

1. A new player can explain profit, audit exposure, a category, and an accounting rule after the tutorial quarter.
2. Every committed transaction has a visible, deterministic explanation of its financial result.
3. A productive build emerges from categories, treatments, and rules—not from an analogue of a card hand.
4. Six quarters provide distinct decisions, readable risks, and at least several viable build identities.
5. Same seed + command sequence gives the same complete annual report.
6. The game follows Gamr lifecycle, terminal-size, pause-menu, theme, transition, and visual-language conventions.
7. Automated evaluator/generator tests, typecheck, and build pass, and manual testing confirms the game is legible at 80×28.
