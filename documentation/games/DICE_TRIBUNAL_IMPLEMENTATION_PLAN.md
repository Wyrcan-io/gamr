# Dice Tribunal — Full Game & Implementation Plan

## Product decision

Build **Dice Tribunal** as a deterministic, turn-based dice-placement roguelite for Gamr.

The player is an advocate in a court where stolen moons, haunted umbrellas, unionized ghosts, and legally distinct groups of ferrets all receive due process. Every case is won by rolling five persistent custom dice, assigning their faces to selected exhibits, deciding whether a reroll is worth the risk of a Gaffe, and building a run-long body of precedent.

The version-1 promise is:

> Read the bench. Roll the argument. Risk the reroll. Make today's absurd ruling become tomorrow's law.

This should enter the registry as a `workshop`, `turn-based`, difficulty-3, `campaign` game. It can move to beta only after the fairness, balance, renderer, and lifecycle gates in this document pass.

The concept originated in [GAME_IDEAS_RESEARCH.md](./GAME_IDEAS_RESEARCH.md). That research points to three useful lessons without making this game a copy of any reference:

- Dice tactics work best when the player can inspect every face, reverse assignments, and understand the result before committing. [Slice & Dice](https://play.google.com/store/apps/details?id=com.com.tann.dice) is the clearest reference for transparent dice decisions.
- Run-long rule combinations and disclosed boss constraints create replayability from a compact content set. [Balatro](https://play.google.com/store/apps/details?id=com.playstack.balatro.android) is a useful reference for that structure.
- A repeated bureaucratic job can carry narrative and tension without a separate story mode. [Papers, Please](https://papersplea.se/) is the tonal and structural reference, not a mechanical template.

No further external dependency or service is required. The current repository already has the needed terminal lifecycle, pause menu, theme helpers, seeded-engine patterns, and Vitest setup.

## Design pillars

1. **Chance creates a puzzle, not a verdict.** Rolling and rerolling are the only random events inside a hearing. Assignment and commit are deterministic and previewable.
2. **Evidence is selected, not merely drawn.** The player brings four exhibits from an eight-item portfolio after seeing the case and judge.
3. **Every reroll is a legible gamble.** The six faces of every die, desired-face odds, reroll count, and pending Gaffe penalty are inspectable.
4. **Precedent is the build.** Won cases produce run-long rules. The four-opinion capacity forces the player to adopt, distinguish, or overrule prior choices.
5. **The bench is strange but fair.** Judges have powerful quirks, but the active interpretation and the next hearing's pressure are always visible.
6. **Courtroom comedy comes from institutions and situations.** The game mocks procedure, vanity, metaphysics, and officious power—not real defendants or vulnerable groups.
7. **Terminal-native clarity comes first.** One-cell glyphs, compact cards, keyboard-first navigation, and a complete state view matter more than decorative animation.

## Player fantasy and intended experience

The player should feel like a brilliant, increasingly compromised advocate constructing a legal engine from ridiculous facts.

A successful turn has a specific emotional rhythm:

1. “This roll is awkward.”
2. “I can make two exhibits work if I risk the Oratory die.”
3. “That reroll could become a Gaffe, but my objection will absorb the judge's pressure.”
4. “The precedent from the goose case turns this exact assignment into a winning line.”
5. “Of course the court now considers a notarized sandwich to be a person.”

The game should reward calculation, adaptation, and build recognition. It should not require knowledge of real law.

## Session shape

### Main campaign

A complete run contains three Circuits. Each Circuit contains:

1. ordinary case — choose one of two disclosed dockets;
2. chambers — buy at most one service, or save Fees;
3. ordinary case — choose one of two new dockets;
4. chambers;
5. fixed Landmark Case for that Circuit;
6. circuit report and automatic transition.

That is nine cases in a winning run. Target duration is **18–28 minutes**, with ordinary cases taking 90–150 seconds and Landmark Cases taking 2–4 minutes.

### Tutorial

The tutorial is a fixed five-minute case with scripted rolls and three short lessons:

1. assign Fact and Law dice to admit an exhibit;
2. lock good results and reroll one bad die;
3. use Objection to block Pressure, inspect the exact preview, and commit.

The tutorial uses the balanced advocate, a fixed judge, no chambers, and no run rewards. It never relies on the normal random stream.

### Run ending

- Win: defeat the Circuit III Landmark Case while Standing is above zero.
- Loss: Standing reaches zero after a failed case or sanction.
- A lost individual case does not immediately end the run unless its Standing damage is fatal.
- The report shows seed, advocate, cases won, perfect verdicts, rerolls, Gaffes, final precedent chain, and final dice.

## Core loop

```text
Choose advocate
  -> inspect two disclosed dockets
  -> choose case and judge
  -> optionally file one motion on the bench rule
  -> select four exhibits from the eight-item portfolio
  -> begin hearing
       -> roll five dice
       -> lock or mark dice
       -> optionally reroll marked dice, at most twice
       -> assign dice to exhibits or court actions
       -> inspect exact resolution preview
       -> commit
       -> admit evidence, absorb Pressure, gain Argument/Contempt
       -> win, lose, or begin next hearing
  -> receive Fees
  -> on a win, adopt/distinguish/overrule an offered precedent
  -> visit chambers
  -> next docket
```

The memorable verbs are **roll**, **assign**, **reroll**, **object**, **commit**, and **cite**.

## The courtroom model

### Run resources

| Resource | Start | Range | Purpose |
|---|---:|---:|---|
| Standing | 12 | 0–12 | Run health. Failed cases and sanctions remove it. |
| Fees | 2 | 0+ | Pays for chambers services and optional motions. |
| Precedents | 0 | 0–4 active | Run-long passive rules; this is the primary build. |
| Evidence portfolio | 8 | exactly 8 | Persistent exhibit loadout. Four are selected per case. |
| Advocate dice | 5 | exactly 5 | Persistent custom dice. Each always has six faces. |

Standing does not drain during a successful hearing. This keeps the tactical pressure on the case-local Contempt track and makes run damage easy to attribute.

### Case-local resources

| Resource | Default | Meaning |
|---|---:|---|
| Argument | 0 / case Burden | Persistent progress toward winning the current case. |
| Contempt | 0 / 7 | Case-local danger. Reaching the limit causes an immediate sanction and case loss. |
| Hearing | 1 / 3 | Ordinary cases allow three commits. Landmark Cases allow four. |
| Pressure | case schedule | The judge/opponent's disclosed threat for the current hearing. Unblocked Pressure becomes Contempt. |
| Reroll actions | 2 / hearing | Each action can reroll any non-empty selection of dice. |

Argument and Contempt persist across hearings within a case. Assignments, current results, reroll marks, and action sockets reset at the start of each new hearing.

### Case victory and failure

After each commit, resolve the outcome in this order:

1. If Contempt is at or above its limit, the player is sanctioned and loses the case.
2. Otherwise, if Argument is at or above Burden, the player wins immediately.
3. Otherwise, if no hearings remain, the player loses for insufficient Argument.
4. Otherwise, begin the next hearing.

Sanction intentionally takes priority over a simultaneous winning Argument. The preview must display `SANCTION — VERDICT VOID` before the player commits, so this is a calculated risk rather than a surprise.

Failure damage is exact:

```text
sanction damage = 4 Standing
timeout damage  = min(5, 2 + ceil((Burden - Argument) / 5))
```

A win grants `2 + Circuit` Fees. A perfect verdict—winning with zero Contempt and at least one unused hearing—grants one additional Fee. A loss grants one Fee and no precedent draft.

## Custom dice

### Face language

Every normal face has a symbol and rank. The terminal representation is always three characters, such as `[F2]`.

| Face | Meaning | Typical use |
|---|---|---|
| `F` | Fact | documents, objects, physical proof |
| `W` | Witness | testimony, experts, character evidence |
| `L` | Law | statutes, procedure, citation-heavy evidence |
| `R` | Rhetoric | emotional or theatrical arguments |
| `O` | Objection | evidence recipes or the Objection court action |
| `X` | Gaffe | cannot normally be assigned; becomes risky after rerolling |

Ranks are 1–3. A rank is not a generic pip score. It must satisfy an exhibit's minimum rank, and ranks above that minimum add overqualification Argument.

### Starting dice

The baseline advocate begins with these five dice:

| Die | Faces |
|---|---|
| Casebook | `F1 F1 F2 L1 O1 X` |
| Witness | `W1 W1 W2 F1 R1 X` |
| Statute | `L1 L1 L2 O1 F1 X` |
| Oratory | `R1 R1 R2 W1 O1 X` |
| Clerk | `F1 W1 L1 R1 O1 X` |

The result is broad coverage with clear specialties. Five Gaffe faces across thirty total faces make rerolls meaningfully risky without making the initial roll punitive.

### Roll and reroll rules

1. The initial roll rolls all five dice.
2. The player may mark any number of dice and spend one reroll action to reroll only those dice.
3. Unmarked dice are locked at their current result.
4. The player may do this a second time with any dice, including a die already rerolled once.
5. A die tracks `rerollCount` for the current hearing.
6. A final `X` result creates pending Contempt equal to that die's `rerollCount`.
7. An initial `X` that was never rerolled is an unusable blank but creates no Contempt.
8. If a rerolled die escapes `X` before commit, it creates no Gaffe penalty.

Examples:

- Initial `X`, never rerolled: blank, zero pending Contempt.
- `F1 -> X` after one reroll: one pending Contempt.
- `R1 -> W1 -> X` after two rerolls: two pending Contempt.
- `X -> X -> L2`: no pending Contempt at commit.

There is no random event after a reroll. The current results and pending penalty are final until another reroll.

### Odds display

Selecting a die and opening Inspect shows:

```text
CASEBOOK: F1 F1 F2 L1 O1 X
Need F: 3/6 (50%)   Need F2+: 1/6 (17%)   Gaffe: 1/6 (17%)
This die has rerolled once; a final X adds 1 Contempt.
```

The engine computes these values from face data. They must never be hand-authored strings.

### Dice customization

Chambers can modify individual faces. A die must always contain exactly six valid faces.

- **Polish** — raise one rank-1 or rank-2 normal face by one rank; cost 2 Fees.
- **Re-ink** — change one normal face's symbol without changing its rank; cost 2 Fees.
- **Expunge** — replace one `X` with a chosen rank-1 normal face; cost 4 Fees.

No face can exceed rank 3. Expunging every Gaffe is possible only with a very strong economy and competes directly with healing, evidence, and motions.

## Evidence selection and assignment

### Portfolio and case file

The player owns exactly eight Evidence definitions. After seeing the case, case tags, judge rule, Burden, Pressure schedule, and both motion interpretations, the player selects exactly four exhibits for the case file.

Selected exhibits:

- remain available in every hearing until admitted;
- exhaust for the rest of the case when admitted;
- return to the portfolio after the case;
- can be selected or deselected freely until `CONFIRM CASE FILE`;
- show whether the current five dice can satisfy their slots in principle.

There is no random evidence draw during a case. Dice already supply enough uncertainty.

### Evidence recipe

An exhibit contains:

- one to three required slots;
- accepted symbol and minimum rank for each slot;
- base Argument;
- zero or one concise effect;
- one or more case tags for synergies and flavor;
- optional upgrade state.

Example:

```text
◇ NOTARIZED GOOSEPRINT
  [F1] [W1]  -> ◆4
  If both assigned ranks match: +2 Argument.
  Tags: creature, property
```

A die can occupy only one slot. A slot accepts only its declared symbol at or above its minimum rank unless a visible rule transforms that result. The player can unassign and rearrange dice without cost before commit.

When an exhibit is complete, its Argument is:

```text
base Argument
+ sum(max(0, assigned rank - slot minimum rank))
+ exhibit effect
+ applicable precedent and judge modifiers
```

Partial exhibits do nothing and make Commit illegal. The UI highlights them with `! INCOMPLETE` and explains which die must be unassigned or which slot remains empty.

### Court actions

Each hearing also provides two sockets that do not exhaust.

- **Clarify** accepts one non-Gaffe die and adds Argument equal to its rank.
- **Object** accepts one `O` die and blocks Pressure equal to `rank + 1`.

An Objection may block more than the current Pressure. Excess block normally disappears, although precedents can convert it into Argument. These sockets ensure that a useful die can still contribute when no exhibit accepts it without making raw dice as efficient as evidence.

### Initial Evidence set

The balanced starting portfolio should contain:

1. Notarized Gooseprint — `[F1][W1]`, base 4, matching ranks +2.
2. Municipal Tide Chart — `[F1][L1]`, base 4, +1 block.
3. Expert Chronomancer — `[W2][L1]`, base 6.
4. Emotional Support Boulder — `[W1][R1]`, base 4, reduce Contempt by 1.
5. Nine Hundred Footnotes — `[L1][L1]`, base 5.
6. Demonstrative Sandwich — `[F1][R1]`, base 4, +2 in contract cases.
7. Hostile Stenographer — `[O1][W1]`, base 4, +2 block.
8. Closing Monologue — `[R2]`, base 3, +2 if it is the last exhibit admitted.

These names and numbers are a vertical-slice set, not final balance commitments.

### Evidence upgrades

The chambers Subpoena service offers three seeded Evidence candidates. The player chooses one and replaces one portfolio item. Duplicate IDs are never offered. Version 1 does not stack upgrades on a card; stronger evidence is represented by a distinct definition and rarity.

## Pressure, judges, and motions

### Pressure

Every case publishes its entire Pressure schedule before evidence selection.

Example: `PRESSURE: H1 2 / H2 3 / H3 4`.

At commit:

```text
unblocked Pressure = max(0, current Pressure - total block)
Contempt gained    = pending Gaffe + unblocked Pressure + disclosed rule effects
```

This makes Objection dice a tactical defense, not a second damage system.

### Judge design

Each judge has:

- a visual/name identity;
- a default Bench Rule;
- one alternate interpretation available by motion;
- short reactive barks;
- compatibility tags used by docket generation.

Example judges:

| Judge | Default interpretation | Motion interpretation |
|---|---|---|
| Hon. Pendulum | First even-rank die used in Evidence each hearing adds +1 Argument. | First odd-rank die used in Evidence adds +1 block instead. |
| Justice Goose | First exhibit using duplicate symbols adds +3 Argument; other exhibits using duplicates add +1 Pressure. | Duplicate-symbol exhibits give +1 Argument each with no Pressure clause. |
| Magistrate Null | The first rank-1 die assigned each hearing contributes no overqualification or effect trigger. | Rank-1 dice work normally, but Pressure is +1. |
| The Empty Chair | The first active precedent does not resolve. Gain a third reroll action. | All precedents resolve, but the Contempt limit is 6. |
| Judge Aeon | Pressure resolves in reverse schedule order. | Normal Pressure order; Law exhibits have +1 minimum rank. |
| Chief Justice Moth | Rhetoric adds +1 Argument but every final rerolled R face counts as lit and adds 1 Contempt. | Rhetoric is normal; Fact overqualification is doubled. |

Every condition uses mechanical language in the briefing. Flavor text is separate.

### Motions

At case briefing the default and alternate interpretations are both shown. The player may pay one Fee to file a motion and switch to the alternate for this case. The alternate is a side-grade, not a guaranteed easier mode; it should favor different dice or precedents.

The selection is final once the case file is confirmed. Motions are the player's direct way to manipulate how existing law applies before rolling.

## Precedent: the run-long build

### Opinion draft

Winning any case opens a draft of three seeded Opinions. The player chooses one of three actions:

1. **Adopt** — add the Opinion to the active precedent chain.
2. **Overrule** — if at the four-Opinion cap, replace one active precedent with the selected Opinion.
3. **Distinguish** — reject the draft and gain two Fees.

An Opinion already active is never offered. Landmark wins may offer Landmark Opinions in addition to the common pool.

The four-slot cap is essential. Without it, every win is a passive power increase and “manipulate precedent” becomes simple accumulation.

### Resolution and ordering

Active precedents are displayed from slot 1 to slot 4. Most triggers resolve in that order. The player may reorder the chain freely in chambers. The commit preview shows a trace line for every fired rule.

Precedent stages are fixed:

1. face interpretation;
2. slot validation;
3. exhibit scoring;
4. block conversion;
5. Gaffe and Contempt modification;
6. post-commit cleanup.

A precedent may act in only one stage in version 1. If two rules change the same value, chain order breaks the tie. This makes reordering meaningful while keeping the trace readable.

### Example precedents

| Opinion | Stage | Rule |
|---|---|---|
| *Marmot v. Moon* | face | The first `F1` assigned each hearing counts as `F2`. |
| *Crown v. Crown* | block | Excess Objection block becomes Argument, to a maximum of 3. |
| *In re Echo* | scoring | The first Witness exhibit each hearing gains +2 Argument. |
| *The Teapot Doctrine* | scoring | An exhibit whose assigned ranks all match gains +2 Argument. |
| *Clean Hands, Mostly* | contempt | A commit with no final Gaffe reduces Contempt by 1. |
| *Against Perpetuities* | scoring | Three-slot exhibits gain +3 Argument. |
| *Footnote 900* | face | The first `L1` used in Clarify counts as `L3`. |
| *Harmless Error* | contempt | Once per case, ignore exactly one pending Gaffe Contempt. |
| *Res Ipsa Sandwich* | scoring | Fact/Rhetoric exhibits gain +2 in contract cases. |
| *The Reasonable Goose* | cleanup | A perfect hearing restores one spent reroll action in the next hearing. |

Every content definition needs a short label, exact rules text, stage, priority, tags, rarity, and effect data. Complex one-off closures in `content.ts` are forbidden because they are difficult to serialize, validate, and trace.

## Hearing resolution

### Preview contract

`previewHearing(state)` is the single authority for assignment legality and outcomes. It returns:

- effective face for every die after face-stage rules;
- invalid or incomplete assignments with reasons;
- each admitted Evidence resolution;
- Argument delta and ordered sources;
- block total and unblocked Pressure;
- Gaffe and other Contempt deltas;
- final Argument and Contempt;
- whether the result is `continue`, `win`, `timeout`, or `sanction`;
- Standing damage and rewards if the case ends;
- an ordered human-readable trace.

Commit calls the same evaluator again and applies its result. Renderer math must never independently reproduce scoring.

### Exact commit pipeline

```text
1. Reject commit if no initial roll exists.
2. Apply face-stage judge and precedent transformations.
3. Validate unique die use, slot symbols/ranks, complete exhibits, and action sockets.
4. Resolve complete exhibits in case-file order.
5. Apply exhibit effects and scoring-stage precedents in chain order.
6. Resolve Clarify and Object.
7. Convert excess block through block-stage precedents.
8. Calculate final Gaffe penalty from current X faces and per-die rerollCount.
9. Apply contempt-stage exhibit, judge, and precedent effects.
10. Add unblocked Pressure and clamp Contempt to a non-negative integer.
11. Add Argument and clamp it to a non-negative integer.
12. Evaluate sanction, victory, timeout, or continuation in that priority.
13. Produce trace and events; do not roll or generate content here.
```

### Worked hearing

Case: *The Borough v. Whoever Stole the Moon*

```text
Burden 15    Contempt limit 7    Pressure [2, 3, 4]
Judge: Hon. Pendulum — first even-rank Evidence die adds +1 Argument.
```

Selected exhibits include Municipal Tide Chart `[F1][L1] -> 4, +1 block` and Expert Chronomancer `[W2][L1] -> 6`.

The initial roll is:

```text
Casebook F2 | Witness W2 | Statute L2 | Oratory X | Clerk O1
```

The player leaves the `X` untouched, assigns `F2 + L2` to the Tide Chart, `W2` to the Chronomancer's first slot, and cannot complete that second exhibit because its Law slot is empty. Commit is illegal while that partial assignment remains.

The player instead rerolls Oratory once and gets `L1`. The final assignment is:

```text
Tide Chart:     F2 + L2 = base 4 + 2 overqualification + 1 Pendulum + 1 block
Chronomancer:   W2 + L1 = base 6
Object:         O1      = 2 block
```

The hearing gains 13 Argument. Three total block absorbs Pressure 2. The rerolled die is no longer `X`, so there is no Gaffe. Final state: `Argument 13/15, Contempt 0/7`. The next hearing needs only two Argument, but both admitted exhibits are exhausted.

## Advocates

Four advocates provide distinct starting states without creating a permanent unlock grind.

| Advocate | Passive | Starting variation | Difficulty |
|---|---|---|---|
| Ada Brief, Public Defender | First Clarify each hearing gains +1 Argument. | Baseline dice and portfolio. | Introductory |
| C. Gull, Seaside Counsel | First excess Objection block each hearing converts to Argument, max 2. | Statute die replaces `F1` with `O2`. | Standard |
| Three Ferrets, One Bar Card | Once per hearing, one die may take a third reroll; its final Gaffe penalty is doubled. | Oratory-forward portfolio. | Volatile |
| Automaton 12-B | First exhibit resolved with exact minimum ranks gains +3 Argument. | All dice are balanced; starts at 10 Standing. | Expert |

All four should be available from the start in version 1. The tutorial always uses Ada Brief.

## Dockets, cases, and escalation

### Case definition

Each case defines:

- ID, title, client, opponent, premise, and tags;
- Circuit range and ordinary/Landmark tier;
- Burden range;
- hearing count;
- Pressure schedule pattern;
- compatible and incompatible judge tags;
- optional case rule;
- reward pool tag;
- win, loss, and perfect-verdict text.

Case rules are rare and always visible. A case with a strong judge does not also receive an opaque or highly punitive case rule.

### Difficulty bands

| Stage | Burden | Hearings | Typical Pressure | Added complexity |
|---|---:|---:|---|---|
| Tutorial | 9 | 3 | `1 / 1 / 2` | scripted rules |
| Circuit I ordinary | 14–16 | 3 | total 6–8 | one judge rule |
| Circuit I landmark | 18–20 | 4 | total 10–12 | judge + mild case rule |
| Circuit II ordinary | 18–21 | 3 | total 8–11 | stronger judge interactions |
| Circuit II landmark | 23–25 | 4 | total 12–15 | Landmark Opinion pool |
| Circuit III ordinary | 22–26 | 3 | total 10–14 | build test, not raw attrition |
| Final landmark | 28–32 | 4 | total 15–18 | multi-stage disclosed rule |

Numbers must be tuned by simulation and playtest. The table defines the intended shape.

### Initial case concepts

- *The Borough v. Whoever Stole the Moon* — property, municipal, occult.
- *Estate of Umbrella v. The Rain* — contract, weather, occult.
- *People v. Several Geese in a Coat* — creature, identity, fraud.
- *The Clockmaker's Alibi* — temporal, criminal, expert.
- *Union of Ghosts v. Vacant Premises* — labor, occult, property.
- *In re Sentient Footnote* — identity, procedural, contract.
- *The Sandwich Personhood Petition* — identity, food, constitutional.
- *City of Below v. Gravity* — municipal, scientific, property.
- *The Crown v. Its Own Reflection* — identity, fraud, constitutional.
- *Department of Tuesday v. The Weekend* — temporal, labor, municipal.
- *The Last Will of Nobody* — probate, occult, identity.
- *The Court v. Itself* — final Landmark Case; it cites the player's own precedent chain.

The final case should test the run's build by mirroring one active Opinion as an adverse rule. Which Opinion is mirrored is shown before evidence selection, and filing the alternate motion changes which slot is mirrored.

### Seeded docket generation

Generation uses static case and judge definitions plus deterministic selection:

1. Create independent PRNG streams for dockets, rolls, rewards, shops, and flavor.
2. Filter cases by Circuit and node tier.
3. Exclude cases already seen in the run.
4. Filter judges by compatibility and avoid the immediately previous judge.
5. Compute Burden and Pressure from a bounded difficulty template; do not roll each number independently.
6. Create two docket choices with distinct primary tags and judges.
7. Validate both choices before exposing them.

A balance patch that adds a flavor line or reward must not silently alter roll results. Independent streams protect seed stability within a content version.

## Chambers

Chambers appears between cases and allows at most one purchase. The player can always leave without buying.

| Service | Cost | Effect |
|---|---:|---|
| Polish a face | 2 | Raise one eligible normal face by one rank. |
| Re-ink a face | 2 | Change one normal face to another normal symbol. |
| Expunge a Gaffe | 4 | Replace one `X` with a chosen rank-1 face. |
| Restore Standing | 3 | Restore 2 Standing, capped at 12. |
| Subpoena Evidence | 2 | Choose one of three Evidence offers and replace one portfolio item. |
| Reorder precedent | 0 | Rearrange active Opinions; does not consume the purchase. |

Offers and eligible targets must be previewed before confirmation. A purchase is disabled if it has no legal target.

## Content scope for version 1

Target a compact but combinatorial content set:

- 4 advocates;
- 8 judges, each with two interpretations;
- 18 ordinary case definitions;
- 3 Landmark Cases;
- 36 Evidence definitions across six mechanical families;
- 24 common Opinions;
- 8 Landmark Opinions;
- 6 chambers services;
- 40 concise judge barks;
- 60 case-specific result lines.

Evidence families should cover:

- reliable two-slot scoring;
- difficult three-slot bursts;
- Contempt control;
- Pressure/block control;
- case-tag payoffs;
- precedent/rank manipulation.

Every item must have a mechanical reason to exist. Flavor-only duplicates do not count toward the content target.

## Interface and visual language

### Terminal requirements

- Minimum supported size: **80×28**.
- Full layout: **100×32** or wider.
- At 80–99 columns, use a compact two-panel layout and abbreviate flavor, never mechanics.
- Below 80×28, render only a centered resize message with required and current dimensions.
- Centering and clipping use ANSI-stripped display width.
- Verify default and at least one light theme.

### Semantic vocabulary

Dice face letters are already ASCII and never depend on color. Other symbols use a one-cell fallback.

| Concept | Preferred | ASCII fallback | Use |
|---|---|---|---|
| Argument | `◆` | `+` | score and Burden bar |
| Evidence | `◇` | `E` | exhibit cards |
| Precedent | `¶` | `P` | Opinion chain |
| Standing | `♥` | `H` | run health |
| Contempt | `▲` | `!` | risk meter |
| Reroll | `↻` | `R` | action counter and selected dice |
| Selected | `▶` | `>` | keyboard focus |
| Locked | `■` | `#` | die not marked for reroll |
| Admitted | `✓` | `+` | exhausted successful evidence |
| Invalid/Gaffe | `×` | `X` | failure and dangerous face |
| Bench rule | `§` | `L` | judge and law text |
| Trace branch | `↳` | `>` | resolution explanation |

Avoid emoji presentation characters and ambiguous multi-column glyphs. Document the mapping next to renderer constants.

### Full hearing layout

```text
                     § D I C E   T R I B U N A L §
 CIRCUIT II  CASE 5/9   ♥ STANDING 9/12   $ FEES 4   SEED 0042
┌─ CASE / BENCH ─────────┬─ CASE FILE / ASSIGNMENT ───────┬─ DICE ───────────┐
│ Borough v. Moon        │ 1 ◇ TIDE CHART                 │ 1 Casebook [F2] ■│
│ ◆ 13/19  ▲ 2/7         │   [F1:D1] [L1:D3]  ◆6  ✓      │ 2 Witness  [W2] ↻│
│ H2/3  PRESSURE 3       │ 2 ◇ CHRONOMANCER              │ 3 Statute  [L2] ■│
│                        │   [W2:D2] [L1:__]  ! INCOMPLETE│ 4 Oratory  [X ] ↻│
│ § HON. PENDULUM        │ 3 ◇ HOSTILE STENOGRAPHER      │ 5 Clerk    [O1] ■│
│ First even Evidence    │   [O1:__] [W1:__]             │                  │
│ die: +1 Argument.      │ 4 ◇ CLOSING MONOLOGUE         │ REROLLS 1/2      │
│                        │   [R2:__]                      │ X RISK: +1 ▲     │
│ PRESSURE 2 / 3 / 4     ├─ COURT ACTIONS ───────────────┼─ PRECEDENT ──────┤
│ Case tag: PROPERTY     │ CLARIFY [__:__]  OBJECT [O1:D5]│1 ¶ Marmot v Moon │
│                        │                                │2 ¶ Clean Hands   │
├─ COMMIT PREVIEW ───────┴────────────────────────────────┴──────────────────┤
│ BLOCK 2 -> UNBLOCKED PRESSURE 1   GAFFE +1   ARGUMENT +6   CONTEMPT +2     │
│ ↳ Commit would continue: ◆19/19? WIN / ▲4/7                                │
└────────────────────────────────────────────────────────────────────────────┘
 TAB PANEL  ARROWS MOVE  SPACE PICK/PLACE  1-5 MARK  R REROLL  ENTER COMMIT
```

The actual width and clipping must be computed; the mock-up communicates hierarchy, not fixed string positions.

### Screen flow

```text
start
 -> advocateSelect
 -> docket
 -> briefing/motion
 -> evidenceSelect
 -> hearing
 -> hearingResult (short audit card)
 -> caseResult
 -> precedentDraft (win only)
 -> chambers (unless Landmark report)
 -> docket or circuitReport
 -> ending / gameOver
```

Pause is a runtime overlay using the shared menu and is not a domain phase.

### Controls

Global:

- `Esc` — shared pause menu during an active run.
- `Q` — quit from start, pause, ending, or game-over screens.
- `H` — contextual help/odds card.
- `Tab` / `Shift+Tab` — cycle panels.
- Arrow keys or `WASD` — move focus within the active panel.
- `Enter` — confirm the focused action.
- `Backspace` or `U` — undo the focused assignment where legal.

Hearing:

- `1`–`5` — mark/unmark that die for the next reroll.
- `R` — reroll marked dice after a confirmation preview.
- `Space` — pick up or place the focused die.
- `Enter` — commit only when the preview is legal.
- `I` — inspect focused die, Evidence, judge rule, or precedent.

Every screen must print its current controls on the bottom row. Keyboard shortcuts cannot exist only in help.

### Effects

Use restrained shared effects:

- 4–6 `§`, `◆`, or `·` particles when Evidence is admitted;
- a small score popup for Argument deltas;
- light shake and yellow flash on a Gaffe;
- medium shake and red flash on sanction;
- a short gavel accent and success particles on verdict;
- a restrained title glitch during idle/start screens only.

Dice-roll animation should last no more than 250 ms and must never obscure final results. It uses display-only frames and never consumes domain RNG.

## TypeScript architecture

### Proposed file tree

```text
src/games/dice-tribunal/
├── index.ts                 # Terminal lifecycle, input adapter, effects
├── types.ts                 # Domain types and IDs
├── seed.ts                  # PRNG streams and seed hashing
├── content.ts               # Dice, advocates, Evidence, judges, Opinions, cases
├── evaluator.ts             # Assignment validation and exact hearing preview
├── generator.ts             # Dockets, rewards, chambers offers, validators
├── engine.ts                # State creation and command reducer
├── render.ts                # ANSI rendering and layout helpers
├── evaluator.test.ts
├── generator.test.ts
├── engine.test.ts
└── render.test.ts
```

Keep the domain engine free of `Terminal`, timers, ANSI sequences, DOM events, and `Math.random()`.

### Core domain types

```ts
export type FaceSymbol = 'fact' | 'witness' | 'law' | 'rhetoric' | 'objection' | 'gaffe';
export type Rank = 1 | 2 | 3;
export type Phase =
  | 'start' | 'advocateSelect' | 'docket' | 'briefing' | 'evidenceSelect'
  | 'hearing' | 'hearingResult' | 'caseResult' | 'precedentDraft'
  | 'chambers' | 'circuitReport' | 'gameOver' | 'ending';

export interface DieFace {
  id: string;
  symbol: FaceSymbol;
  rank: Rank | 0;
}

export interface AdvocateDie {
  id: string;
  name: string;
  faces: [DieFace, DieFace, DieFace, DieFace, DieFace, DieFace];
}

export interface RolledDie {
  dieId: string;
  faceIndex: number;
  rerollCount: 0 | 1 | 2 | 3;
  marked: boolean;
}

export interface EvidenceSlot {
  symbol: Exclude<FaceSymbol, 'gaffe'>;
  minRank: Rank;
}

export interface EvidenceDefinition {
  id: string;
  name: string;
  slots: EvidenceSlot[];
  baseArgument: number;
  tags: CaseTag[];
  effect?: EvidenceEffect;
  rarity: 'common' | 'uncommon' | 'rare';
}

export interface Assignment {
  dieId: string;
  target: { kind: 'evidence'; evidenceId: string; slotIndex: number }
    | { kind: 'clarify' }
    | { kind: 'object' };
}

export interface HearingState {
  index: number;
  rolled: RolledDie[];
  rerollsRemaining: number;
  assignments: Assignment[];
}

export interface CaseState {
  definitionId: string;
  judgeId: string;
  interpretationId: string;
  burden: number;
  pressure: number[];
  argument: number;
  contempt: number;
  contemptLimit: number;
  selectedEvidenceIds: string[];
  admittedEvidenceIds: string[];
  hearing: HearingState;
}

export interface GameState {
  version: 1;
  contentVersion: 1;
  seed: number;
  rng: RngStreams;
  phase: Phase;
  advocateId: string | null;
  circuit: 1 | 2 | 3;
  caseNumber: number;
  standing: number;
  maxStanding: number;
  fees: number;
  dice: AdvocateDie[];
  evidencePortfolio: string[];
  precedentIds: string[]; // ordered; resolution follows this chain
  docket: DocketChoice[];
  activeCase: CaseState | null;
  pendingPreview: HearingPreview | null;
  history: CaseRecord[];
  notice: string;
}
```

Use discriminated unions for `EvidenceEffect`, `PrecedentEffect`, and judge rules. The initial union should be deliberately small:

```ts
type Effect =
  | { kind: 'argument'; amount: number }
  | { kind: 'block'; amount: number }
  | { kind: 'contempt'; amount: number }
  | { kind: 'promoteFace'; symbol: Exclude<FaceSymbol, 'gaffe'>; from: Rank; to: Rank; limit: number }
  | { kind: 'convertExcessBlock'; cap: number }
  | { kind: 'ignoreGaffe'; amount: number; once: 'hearing' | 'case' };
```

Add a new effect kind only when at least two content definitions need it or a Landmark encounter cannot be expressed otherwise.

### Commands

```ts
export type Command =
  | { type: 'startRun'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'chooseAdvocate'; advocateId: string }
  | { type: 'chooseDocket'; choiceId: string }
  | { type: 'chooseInterpretation'; interpretationId: string }
  | { type: 'toggleEvidence'; evidenceId: string }
  | { type: 'confirmCaseFile' }
  | { type: 'roll' }
  | { type: 'toggleRerollMark'; dieId: string }
  | { type: 'rerollMarked' }
  | { type: 'assignDie'; assignment: Assignment }
  | { type: 'unassignDie'; dieId: string }
  | { type: 'commitHearing' }
  | { type: 'continueAfterHearing' }
  | { type: 'continueAfterCase' }
  | { type: 'choosePrecedent'; precedentId: string }
  | { type: 'replacePrecedent'; oldId: string; newId: string }
  | { type: 'distinguishOpinions' }
  | { type: 'reorderPrecedent'; from: number; to: number }
  | { type: 'chooseChambersService'; serviceId: string }
  | { type: 'chooseChambersTarget'; target: ChambersTarget }
  | { type: 'leaveChambers' }
  | { type: 'restart'; seed?: number };

export interface CommandResult {
  state: GameState;
  events: GameEvent[];
  error?: string;
}
```

Invalid commands return an unchanged state plus a development-visible error. The UI normally prevents them, but the engine remains authoritative.

The engine derives whether an interpretation is the free default or the one-Fee alternate from the active judge definition. It never trusts a UI-supplied price or payment flag.

### Deterministic random streams

Use the existing repository's small seeded-PRNG approach, but separate streams:

```ts
type RngStreamId = 'docket' | 'roll' | 'reward' | 'shop' | 'flavor';
```

Derive each stream from `hashSeed(runSeed, contentVersion, streamId)`. Store each stream's current 32-bit state or cursor in `GameState` so the run can be reproduced and serialized.

Rules:

- only `roll` and `rerollMarked` consume the roll stream;
- docket construction consumes only docket state;
- Opinion drafts consume only reward state;
- chambers offers consume only shop state;
- flavor selection consumes only flavor state;
- rendering consumes no domain stream;
- preview and commit consume no stream.

Same seed + advocate + command sequence must produce byte-equivalent domain state.

### Engine invariants

At every applicable command boundary:

- after advocate selection, exactly five dice exist and each has exactly six faces;
- normal face ranks are 1–3 and Gaffe rank is 0;
- after advocate selection, exactly eight unique Evidence IDs exist in the portfolio;
- selected case file contains zero to four unique portfolio IDs, and exactly four after confirmation;
- no admitted Evidence may be admitted twice in one case;
- one die has at most one assignment;
- one target slot has at most one die;
- `rerollsRemaining` stays within the advocate's allowed range;
- `rerollCount` never exceeds the advocate's maximum;
- Standing, Fees, Argument, and Contempt are finite non-negative integers;
- active precedents are unique and never exceed four;
- phase-specific required state exists;
- preview has no side effects;
- commit recomputes rather than trusting a cached total supplied by the UI.

### Renderer and controller

`render.ts` receives only state, dimensions, theme colors, focus/view state, and animation frame. It returns one complete ANSI frame.

`index.ts` owns:

- alternate-buffer entry and restoration;
- cursor hide/show;
- the 50 ms render loop;
- keyboard mapping to commands;
- focus, open help/inspect overlays, and short display-only animations;
- shared pause menu integration with `PAUSE_MENU_ITEMS`, `renderSimpleMenu`, and `navigateMenu`;
- game transition dispatch;
- all interval, timeout, and key-listener cleanup.

The controller exports:

```ts
export interface DiceTribunalController {
  stop: () => void;
  isRunning: boolean;
}
```

`stop()` must be idempotent and restore `\x1b[?25h\x1b[?1049l` exactly once.

## Gamr integration

Add to `src/games/index.ts`:

```ts
import { runDiceTribunalGame } from './dice-tribunal';

{
  id: 'dice-tribunal',
  name: 'Dice Tribunal',
  description: 'Roll the evidence. Risk the reroll. Rewrite precedent.',
  maturity: 'workshop',
  pace: 'turn-based',
  difficulty: 3,
  session: 'campaign',
  run: runDiceTribunalGame,
}
```

Also add `runDiceTribunalGame` to the individual runner exports. Import paths from the game directory are:

```ts
import { getCurrentThemeColor, isLightTheme } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';
```

Use shared effects from `../shared/effects`; do not duplicate the particle, popup, shake, or flash infrastructure.

## Content validation

`validateContent()` should run in tests and development builds. It reports all failures rather than stopping at the first.

Validate that:

- all IDs are globally unique within their definition family;
- every referenced Evidence, judge, case, Opinion, advocate, tag, and effect exists;
- every die has six valid faces;
- Evidence has one to three valid slots and non-negative values;
- every effect kind has evaluator support;
- Opinions declare exactly one valid resolution stage;
- default and motion interpretations are distinct;
- each Circuit has enough compatible ordinary cases and judges to build both branches;
- Landmark Cases have valid fixed content;
- reward pools can always produce three unique non-active Opinions;
- shop pools can always produce three Evidence choices not already owned, or provide a documented fallback;
- all player-facing mechanical text fits its compact line budget or wraps safely;
- no content definition embeds an executable function.

## Test plan

### Dice and RNG tests

- Same stream seed produces the same long sequence.
- Different stream IDs do not share sequences.
- Docket or flavor generation does not change roll results.
- Each die rolls only one of its six face indexes.
- Rerolling a marked subset changes only those dice and consumes exactly one action.
- A final Gaffe penalty equals reroll count; an untouched initial Gaffe is safe.
- The Ferrets' third reroll and doubled final Gaffe are enforced exactly.
- Odds display values equal counts calculated from the actual six faces.

### Assignment and evaluator tests

- One die cannot fill two slots.
- Wrong symbol and insufficient rank are rejected with distinct reasons.
- Transformed effective faces affect legality before slot validation.
- Partial Evidence makes commit illegal.
- Exhausted Evidence cannot be assigned again.
- Overqualification is calculated per slot.
- Clarify and Object accept only legal dice.
- Pressure never becomes negative.
- Precedent ordering is stable and appears in the trace.
- Preview does not mutate state or consume RNG.
- Commit produces exactly the previewed deltas and outcome.
- Sanction wins a tie against Burden on the same commit.

### Engine flow tests

- Start -> advocate -> docket -> briefing -> case file -> hearing is legal.
- Exactly four selected exhibits are required.
- Case Argument and Contempt persist across hearings.
- Hearing assignments and reroll counters reset between hearings.
- Won cases pay correct Fees and open an Opinion draft.
- Lost cases apply exact Standing damage and skip the draft.
- Perfect verdict bonus is awarded once.
- Adopt, Distinguish, and Overrule respect capacity and costs.
- Chambers purchases mutate one legal target and charge once.
- Circuit and final-case transitions occur at the correct case numbers.
- Standing zero enters game over; final Landmark victory enters ending.
- Restart creates a clean run with the requested seed.

### Generator and content tests

- Representative seeds generate two valid, distinct docket choices at every ordinary node.
- A run does not repeat a case or immediately repeat a judge.
- Burden and Pressure stay in their Circuit bands.
- Opinion offers are unique and exclude active Opinions.
- Evidence shop offers are unique or use the explicit fallback.
- All static content passes `validateContent()`.
- At least one legal four-exhibit case file exists for every starting advocate and generated Circuit I docket.

### Property/fuzz tests

For thousands of generated states and legal command sequences:

- no numeric field becomes `NaN`, infinite, fractional where integer is required, or negative outside its declared range;
- evaluator output is deterministic;
- preview then commit preserves invariants;
- replacing/reordering precedents never duplicates or drops unrelated IDs;
- all generated cases eventually terminate within their hearing count.

### Rendering and lifecycle tests

- 80×28 renders all mechanical panels and the control footer without out-of-bounds cursor positions.
- 100×32 renders the full layout.
- undersized terminals show only the resize view.
- ANSI-stripped lines do not exceed terminal width.
- default and light themes preserve warning, selection, admitted, and disabled distinctions without color.
- start, pause, inspect, hearing, result, sanction, game-over, and ending screens render without exceptions.
- pause uses the shared menu and all five menu actions work.
- repeated `stop()` calls are safe.
- intervals, timeouts, and the xterm key listener are cleaned up on quit, switch, list, restart, and external stop.

## Balance strategy and instrumentation

### Metrics to collect in tests or an offline simulator

- case and run win rates by advocate, seed band, Circuit, judge, and case;
- Argument per hearing and Evidence admitted per hearing;
- reroll actions used and dice rerolled;
- Gaffe Contempt versus Pressure Contempt;
- Evidence selection and contribution rates;
- Opinion offer, pick, trigger, and replacement rates;
- motion usage by judge;
- chambers purchase distribution;
- Standing entering each Circuit;
- perfect verdict rate;
- average real input count and hearing count.

No analytics service is needed. A deterministic simulation report or test helper is sufficient during development.

### Initial targets

- Tutorial completion: above 85% in observed manual tests.
- First-run campaign win rate: 20–35%.
- Experienced win rate with the same content: 55–70%.
- Ordinary case success: 70–85% in Circuit I, 60–75% in II, 50–70% in III.
- Sanction should cause fewer than 15% of case losses.
- Average case: 2.2–2.7 hearings.
- At least one reroll action in 65–85% of hearings.
- Average admitted Evidence: 2.5–3.5 per case.
- No single starting Evidence selected in more than 80% of all eligible cases.
- No common Opinion chosen in more than 35% of offers after a meaningful sample.
- Motions used in 25–60% of matching dockets; near-0% or near-100% indicates a false choice.

Use simple heuristic bots for trend detection, not as a substitute for human balance. At minimum implement a cautious bot and a greedy-Argument bot so large outliers are visible across 1,000 seeds.

## Implementation milestones

### 0 — Paper proof and contracts

- Implement the five starting dice, eight starting Evidence items, one judge, and one case on paper or in pure test data.
- Play at least 20 hearings manually with recorded rolls.
- Confirm that assignment, reroll risk, Object, and commit preview all produce distinct decisions.
- Lock terminology and the commit resolution order.

Exit gate: a player can explain why a reroll is tempting, why it is dangerous, and how the exact result will resolve.

### 1 — Pure dice and evaluator vertical slice

- Add `types.ts`, `seed.ts`, starter `content.ts`, and `evaluator.ts`.
- Implement roll/reroll state, assignments, Evidence scoring, court actions, Pressure, and exact trace output.
- Add evaluator and RNG tests before terminal code.

Exit gate: a complete case can be simulated through commands in Vitest with preview exactly matching commit.

### 2 — Run engine and deterministic generation

- Implement phases, advocates, Standing/Fees, case outcome, docket generation, Opinion drafts, and chambers.
- Add all engine invariants and representative-seed tests.
- Implement content validation.

Exit gate: a headless run can reach win and loss endings with a reproducible seed.

### 3 — Terminal vertical slice

- Implement `render.ts` at 80×28 and 100×32.
- Implement focus navigation, assignment controls, odds inspection, help, and the exact preview panel.
- Integrate shared pause menu and cleanup lifecycle.
- Add restrained admission, Gaffe, sanction, and verdict effects.

Exit gate: one Circuit is fully playable using only the keyboard and no debug console.

### 4 — Full content and campaign

- Expand to all advocates, judges, cases, Evidence, common Opinions, and three Landmark Cases.
- Implement the final case's disclosed mirrored-precedent rule.
- Add tutorial, flavor text, circuit reports, and ending variants.
- Validate every definition and seed band.

Exit gate: at least 100 generated runs can initialize without invalid or duplicate offers, and every content item is reachable.

### 5 — Balance, accessibility, and release polish

- Run heuristic simulations and manual playtests.
- Tune Burden, Pressure, costs, Opinion caps, Evidence numbers, and advocate starts.
- Verify semantic glyphs and ASCII fallbacks at 80×28 and wide sizes.
- Check a light theme, keyboard-only use, help text, warning states, and reduced visual noise.
- Register the game and run repository verification.

Required commands:

```text
npm run typecheck
npm test
npm run build
```

Exit gate: all definition-of-done items pass and the game is honest about its `workshop` maturity.

## Risks and protected decisions

### Risk: too many interacting modifiers

Mitigation: four active Opinions, one stage per Opinion, short traces, no hidden triggers, and a small effect grammar.

Protected decision: do not raise the precedent cap to solve content balance.

### Risk: a bad roll feels like automatic failure

Mitigation: two reroll actions, reversible assignments, two fallback court actions, four preselected Evidence items, and multi-hearing cases.

Protected decision: no random event occurs after Commit.

### Risk: optimal play becomes “reroll every Gaffe”

Mitigation: a rerolled die that finishes on Gaffe creates Contempt based on reroll count; initial Gaffes are safe blanks; Pressure competes for Objection coverage.

Protected decision: risk remains attached to the final face and is displayed numerically.

### Risk: Evidence selection is fake because four cards dominate

Mitigation: varied case tags, judge interpretations, rank profiles, Pressure needs, simulation pick-rate reports, and forced replacement choices only when the player opts into Subpoena.

Protected decision: no random mid-case Evidence draw in version 1.

### Risk: courtroom language becomes inaccessible

Mitigation: use plain mechanical verbs, define all terms in contextual help, separate rules from flavor, and teach one new system at a time.

Protected decision: no real legal knowledge is required and the game must not present itself as legal education.

### Risk: terminal layout becomes card-wall clutter

Mitigation: four exhibits only, five fixed-width dice, one-line Opinion summaries, focused Inspect overlay, compact layout, and ANSI-width tests.

Protected decision: 80×28 remains the minimum supported gameplay size.

## Accessibility and writing guidelines

- Never use color as the only state signal; pair it with icon, label, or shape.
- Do not use blinking text during decisions.
- Keep roll animation short and allow immediate input to skip it.
- Use direct mechanical wording: `Final rerolled X adds 2 Contempt`, not `The court may react badly`.
- Wrap flavor separately so it cannot push controls or mechanics off-screen.
- Make disabled commands explain why they are disabled.
- Avoid jokes based on real criminal cases, protected identities, disability, poverty, or incarceration.
- Make institutions, supernatural bureaucracy, pompous officials, and impossible objects the targets of absurdity.
- Include an ASCII fallback switch if runtime glyph checks are impractical.

## Version-1 non-goals

- online daily challenges, leaderboards, accounts, or network calls;
- permanent stat progression or power unlocks between runs;
- collectible loot boxes or randomized monetization;
- real legal simulation, jurisdiction-specific law, or legal advice;
- free-form typed arguments or language-model judging;
- voice input, mouse-only controls, or real-time timers;
- PvP or cooperative play;
- procedural generation of rules text from unconstrained templates;
- more than five dice, more than four selected Evidence items, or more than four active Opinions;
- save migration across content versions;
- animated courtroom character portraits.

Seed entry/export, archived challenges, alternate campaign modifiers, and mid-run save/resume are reasonable later additions only after the base campaign survives repeated local play.

## Definition of done

Dice Tribunal is version-1 complete when:

- the five-dice roll, two-reroll, Evidence assignment, Object, and exact Commit loop is satisfying without presentation effects;
- the tutorial teaches the loop in one fixed case;
- a full three-Circuit run can be won and lost;
- all randomness is seeded and isolated by stream;
- assignment is reversible and every commit outcome is fully previewed;
- Gaffe risk is calculated from actual current faces and reroll counts;
- the player can adopt, distinguish, overrule, and reorder precedents;
- all four advocates are meaningfully different and viable;
- the full version-1 content set validates;
- no generated docket, reward, or shop can dead-end;
- balance metrics are within the initial target ranges or deviations are documented;
- 80×28 and wide layouts are readable in default and light themes;
- the semantic symbol vocabulary is consistent and has ASCII fallbacks;
- start, pause, restart, quit, list-games, next-game, game-over, and external stop all clean up correctly;
- `npm run typecheck`, `npm test`, and `npm run build` pass;
- the registry description, maturity, pace, difficulty, and session metadata are accurate.
