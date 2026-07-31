# Dead Letter Department — Full Game & Implementation Plan

## Product decision

**Dead Letter Department is a deterministic, turn-based mail-inspection game about making defensible judgments under an ever-changing rulebook.** The player works the night desk of an interplanar postal service. Every message must be sent to exactly one desk:

- **DISPATCH** — a genuine, routine message.
- **EXPRESS** — a genuine message whose deadline makes it urgent.
- **RETURN** — a forged, invalid, or misaddressed message.
- **SEAL** — a cursed message; it is never safe to deliver or return.

The fantasy is deliberately administrative rather than combat-focused: compare a letter's fields, stamps, wording, and physical anomalies with the current shift's regulations, then commit. A wrong decision costs trust and changes the story; a correct decision feels like catching a specific contradiction.

Version 1 ships a complete **First Week** campaign: a short playable induction, six escalating shifts, seeded procedural mail, a shift rulebook, recurring case threads, an end rank, local best-run storage, and a replay seed. It is designed to be playable entirely with a keyboard and readable in a terminal.

## Design goals and constraints

The existing Gamr direction identifies Papers, Please-style meaningful work, fully visible rules, short runs, procedural variation, and optional seeded challenges as unusually strong fits for a terminal. This game applies those lessons without copying any particular game's content or interface.

1. **Judgment, not memorisation.** The active regulations remain visible or one keypress away. Difficulty comes from combining visible facts and resolving exceptions, never from recalling hidden rules.
2. **Every error must be explainable.** Audit feedback names the decisive rule and the conflicting field. No generated letter may have an ambiguous correct destination.
3. **The mail itself tells the story.** Recurring senders, locations, and phrases turn individual documents into a small occult-bureaucratic mystery.
4. **Turn-based first.** There is no countdown that forces a player to misread text. Optional performance scoring rewards efficient, accurate shifts without penalising deliberate play.
5. **Variation with guardrails.** Seeds vary messages, sender names, stamps, exceptions, case ordering, and upgrade offers; handcrafted rule templates and validation keep every case solvable.
6. **A compact terminal fit.** One message, its relevant fields, the decisive rules, and four destinations fit on screen at 80x28. Wider terminals show the full document and case-log panel.

## Player experience

> “I did not just spot a fake seal. I stopped something from learning my name.”

| Beat | Player feeling | Target duration |
|---|---|---:|
| Intake | Scan sender, destination, stamps, and body for an obvious signal. | 8–15 s |
| Cross-check | Compare suspicious facts against the shift's rules and ledger. | 15–35 s |
| Commitment | Route the letter and receive an audit explanation. | 2–5 s |
| Pattern | Recognise a recurring sender, exception, or curse motif. | 30–90 s |
| Escalation | A new regulation changes how familiar evidence should be read. | per shift |
| Resolution | Learn which case threads were protected or allowed through. | 1–2 min |

An induction takes about two minutes. A single shift is three to five minutes. A full First Week is 18–28 minutes on a first playthrough and 12–18 minutes once the player understands the systems.

## Core loop

1. Read the **Shift Bulletin**: active acceptance conditions, urgency rule, fraud signals, curse signals, and any exception/priority rule.
2. Inspect the next generated message. Its envelope and letter body expose all facts needed to decide.
3. Optionally open the **Reference Ledger** or spend a limited **Verification Mark** to inspect one questionable field (useful on later shifts, never required for the tutorial).
4. Choose Dispatch, Express, Return, or Seal.
5. The Audit Clerk immediately confirms the decision or explains the violated rule; update score, trust, case thread, and shift report.
6. Continue until the shift inbox is empty. Meet the accuracy threshold to advance, then accept one small, run-changing office perk.
7. Complete the sixth shift to receive an ending based on trust, sealed curses, and recurring narrative threads.

There is no “skip” action. The dead-letter desk exists because every message must be accounted for.

## Exact classification logic

### Message truth model

Each message is generated from a structured ground truth. The player does not see its hidden truth field; the engine uses it only to verify that presentation is internally consistent.

```ts
type PrimaryDisposition = 'routine' | 'urgent' | 'forged' | 'cursed';

interface MessageFacts {
  senderId: string;
  senderName: string;
  senderRegistryCode: string | null;
  recipientName: string;
  recipientAddress: string;
  destinationOffice: string;
  issueDate: number;
  deliveryDeadline: number | null;
  postmarkOffice: string;
  postageTier: 'standard' | 'priority' | 'black-seal';
  seal: 'copper' | 'ivory' | 'violet' | 'black' | 'broken';
  bodyTemplateId: string;
  bodyText: string;
  anomalies: AnomalyId[];
  tags: MessageTag[];
}

interface Message {
  id: string;
  facts: MessageFacts;
  primaryDisposition: PrimaryDisposition;
  decisiveRuleIds: RuleId[];
  caseThreadId?: CaseThreadId;
}
```

`routine` and `urgent` are genuine mail. `forged` and `cursed` are unsafe. The engine initially creates one primary disposition per letter. On shifts 5–6 it may add **secondary red flags**, but the bulletin explicitly states the precedence rule so a letter still has one correct destination.

### Decision precedence

This exact order is printed in every bulletin after it is introduced:

1. **Seal beats everything.** If a message satisfies any active curse condition, choose **SEAL**, even if it is also forged or marked urgent.
2. **Return invalid mail.** If it has no active curse condition and violates an authenticity, registry, address, or date rule, choose **RETURN**.
3. **Express valid urgent mail.** If it is valid and meets the current urgency condition, choose **EXPRESS**.
4. **Dispatch the remainder.** A valid, non-urgent message goes to **DISPATCH**.

The precedence turns apparently complicated later letters into a readable procedure rather than a subjective role-play choice.

### Rule families

Every shift contains a small authored set from these families. A rule states its exact condition in plain language and carries an ID used by generator and audit feedback.

| Family | Example visible rule | Evidence on message | Typical result |
|---|---|---|---|
| Registry | “Guild mail must show its current 3-letter registry code.” | sender code, sender title | invalid → Return |
| Address | “Ash Ward accepts only addresses ending `//ASH-9`.” | destination address | invalid → Return |
| Date | “Moonwax postmarks expire after 3 nights.” | issue date, postmark | invalid → Return |
| Seal | “Ivory seal is required for hospital notices.” | seal glyph and label | invalid → Return |
| Urgency | “A valid letter is urgent when it has a red deadline within 2 nights.” | deadline, priority stamp | valid + urgent → Express |
| Curse | “Black wax, a self-addressed recipient, or the phrase ‘OPEN ME LAST’ requires sealing.” | envelope/body anomaly | cursed → Seal |
| Exception | “The Registry Office may use violet wax instead of ivory during fog.” | sender, seal, shift condition | overrides one earlier rule |
| Priority | “A curse signal overrides an express stamp.” | all relevant evidence | sets destination order |

Rules always name the feature that expresses them. For example, a “Moonwax” rule only appears in a shift that makes the Moonwax postmark visually distinct and explains it in the ledger.

### Proof of a correct answer

The engine evaluates a message by applying the shift rules in priority order and returns a structured explanation:

```ts
interface Evaluation {
  expectedDestination: Destination;
  status: 'sealed' | 'returned' | 'expressed' | 'dispatched';
  appliedRuleIds: RuleId[];
  decisiveRuleId: RuleId;
  evidence: EvidenceRef[];
  explanations: string[];
}
```

The generator must call this evaluator after rendering every candidate. It may only emit a letter when the evaluator returns the candidate's intended destination and at least one visible evidence reference. This prevents impossible or “designer knows best” mail.

## Shift structure and campaign escalation

First Week has six 10–14-message shifts. Each shift uses a curated rule deck and a seeded message deck. The first three letters of each shift are deliberately legible examples of its newly introduced rule; ambiguity only appears after the player has seen the rule work once.

| Shift | New idea | Active rule load | Message count | Story pressure |
|---:|---|---|---:|---|
| Induction | Genuine routine vs. deadline urgency | address + urgency | 6 | Find the right desk for normal work. |
| 1: Counterfeit Monday | Registry codes and broken seals | 2 validity + urgency | 10 | A new sender keeps changing one letter of its code. |
| 2: The Quiet Bin | First curse tells | 2 validity + urgency + 2 curse | 11 | Sealed mail begins responding to the player. |
| 3: Fog Protocol | Exceptions and postmark age | 3 validity + urgency + 2 curse + 1 exception | 12 | A citywide fog invalidates familiar checks. |
| 4: Night Express | Conflicting stamps and precedence | 3 validity + 2 urgency + 3 curse + precedence | 13 | Someone marks dangerous letters as urgent. |
| 5: The Thirteenth Run | Compound evidence and case threads | 4 validity + 2 urgency + 3 curse + 2 exceptions | 14 | The missing postmaster's messages enter the queue. |
| 6: Last Collection | Final audit and deliberate callbacks | selected best-of rules | 14 | Resolve the sender behind the forged-and-cursed campaign. |

### Shift success and failure

- Each shift begins with **4 Trust**.
- A correct route awards 100 points and preserves trust. A fast, accurate streak awards a small nonessential score bonus.
- A wrong route loses one Trust, logs the exact audit reason, and may advance or damage a narrative thread.
- A shift passes with at least 2 Trust. At 0 Trust the shift ends in an audit failure; the player may retry the same seed without penalty.
- The campaign carries a separate **Department Standing** (0–100), calculated from correct decisions, sealed curses, and major case outcomes. It affects epilogue rank, not core access.

There is no irreversible campaign lockout. A loss is a teachable failed shift, not the end of the player’s story.

### Perks between shifts

After a cleared shift, offer three deterministic, seed-drawn perks. They provide utility or information without making correctness pay-to-win.

| Perk | Effect |
|---|---|
| Carbon Copy | Once per shift, mark a letter; the audit explanation is shown before committing, but it scores no streak bonus. |
| Registry Tabs | The ledger highlights the registered portion of any sender code. |
| Quiet Gloves | Sealing a cursed letter restores 1 Trust once per shift. |
| Priority Tray | The urgency field is shown in the compact envelope view. |
| Wax Reference | Adds plain-text seal labels beside seal glyphs. Useful for low-colour terminals. |
| Audit Memory | Shows the last two violated rules in the side panel. |
| Night Overtime | +1 maximum Trust, but the next shift includes one additional message. |
| Postmaster’s Key | Reveals an optional piece of a case thread in the next shift. |

Offer only perks that have a meaningful use in the next two shifts. Do not introduce currency, grinding, or permanent power progression in version 1.

## Procedural message generation

### Content grammar

A message is assembled from a consistent envelope, optional insert, and short body. The writing should feel bureaucratic and uncanny, but facts must remain easy to locate.

```text
ENVELOPE
FROM: KESTREL & SONS / REG: KES-41
TO:   DR. IONE VELL, 12 LANTERN ST // ASH-9
POST: MOONWAX DEPOT / NIGHT 17
SEAL: IVORY        POSTAGE: STANDARD
DEADLINE: --

LETTER
Dear Dr. Vell,
The replacement lamps have begun humming in a language our invoices
do not recognise. Please return the old glass by first collection.

— M. Kestrel, Accounts
```

Content tables include:

- 24 registered senders across six factions (hospitals, guilds, ferrymen, observatories, courts, and illicit offices).
- 32 recipients and 20 valid addresses, with recognisable ward suffixes.
- 18 body templates, each reserving slots for a relevant phrase, item, deadline, and case-thread clue.
- 12 postmarks, five seals, six postage labels, and 10 physical anomaly descriptions.
- 8 recurring case threads with two to four authored beats each.

The first release needs roughly 150–220 short authored fragments, not thousands of freeform lines. Recombination creates variety while keeping tone and facts controlled.

### Candidate construction algorithm

1. Pick a shift-approved disposition, weighted toward recently taught concepts and away from three repeats in a row.
2. Pick a sender, recipient, ward, body template, and optional case thread using the run PRNG.
3. Build a **valid base letter** that satisfies every active authenticity rule.
4. Apply mutations appropriate to the desired disposition:
   - routine: no outcome-changing mutation;
   - urgent: add a valid urgency condition;
   - forged: mutate one or two authenticity facts;
   - cursed: add one active curse signal, optionally a secondary forged/urgent signal on advanced shifts.
5. Apply an authored exception only when its visible condition is present.
6. Evaluate the finished facts with the same rule evaluator used by gameplay.
7. Reject and regenerate if evaluation differs from desired destination, evidence is absent, body text contradicts facts, or the deck violates pacing constraints.
8. Store the serialisable message deck in the run state before the shift begins.

### Fairness constraints

- Every decisive condition appears in the compact envelope or one clearly labelled detail panel; flavour text never hides a mandatory clue in the middle of prose.
- A new rule is demonstrated by at least one non-deceptive example before being combined with another rule.
- Generated codes use a single displayed format per sender family, never typo-like arbitrary strings.
- No message depends on real-world knowledge, colour alone, a timer, or an external document.
- If multiple rules apply, the bulletin contains the active priority clause and Audit feedback reports both the winning clause and subordinate conflicts.
- Generated decks must contain at least two routine, two urgent, two forged, and two cursed examples after Shift 2, unless a tutorial objective deliberately constrains the mix.

### Determinism and replay

- Create one 32-bit seed for a run; derive independent named PRNG streams for shift deck, sender names, content wording, perks, and cosmetic effects.
- Use a deterministic PRNG such as Mulberry32 or the repository’s existing seed-hash style. Never call `Math.random()` in generator, evaluator, progression, or tests.
- Save `seed`, content version, chosen perks, all decisions, and deck snapshots as serialisable JSON. Deck snapshots protect old replays if content tables later change.
- Show the seed in pause, end-of-run, and report screens. Version 1 supports replaying an exact completed seed; typed seed import and daily challenges are post-release work.

## Story system

The narrative is a procedural case file, not a branching novel. Each case thread has an owner, a suspicion, escalation beats, and outcomes based on player classifications.

Example: **The Vanishing Postmaster** begins as a genuine express request from Acting Postmaster Rusk. Later messages imitate Rusk’s registry code, then use the phrase “OPEN ME LAST,” then reveal a cursed letter addressed to the player. Correctly sealing the last letter prevents the department from sending the entity a return address. Returning it is still incorrect, but creates a different epilogue line from dispatching it.

```ts
interface CaseThread {
  id: CaseThreadId;
  beats: CaseBeat[];
  condition: CaseThreadCondition;
  resolvedState: 'unseen' | 'protected' | 'compromised' | 'unknown';
}

interface CaseBeat {
  shift: number;
  disposition: PrimaryDisposition;
  messagePatch: Partial<MessageFacts>;
  onCorrect: ThreadEffect[];
  onWrong: ThreadEffect[];
}
```

Keep the outcome language consequence-focused but non-punitive. Players should want to replay for another report, not feel their first ending was invalid.

## Interface, screens, and controls

### Main workbench

```text
                         DEAD LETTER DEPARTMENT
SHIFT 03 / 06    INBOX 05 / 12    TRUST [####]    STANDING 0610

┌─ ACTIVE REGULATIONS ──────────┐  ┌─ INCOMING MESSAGE ─────────────────────────┐
│ 1  Seal cursed mail first.    │  │ FROM: HOLLOW FERRY CO.   REG: HFC-77         │
│ 2  Guild mail needs REG code. │  │ TO:   MIRA SOL, 8 HUSH QUAY // FOG-2         │
│ 3  Urgent = deadline <= 2.    │  │ POST: FOG OFFICE / NIGHT 4    SEAL: VIOLET   │
│ 4  Violet is valid in fog.    │  │ DEADLINE: NIGHT 5         POSTAGE: PRIORITY  │
│                                │  │                                                │
│ [L] Ledger  [V] Verify x2     │  │ Dear Mira, the ferry has returned without a    │
└────────────────────────────────┘  │ crew. Their names are still taking seats.      │
                                    │                                                │
                                    │ ─ M. Hollow, Dispatcher                         │
                                    └────────────────────────────────────────────────┘

 [1] DISPATCH        [2] EXPRESS        [3] RETURN        [4] SEAL
 Routine genuine     Valid + urgent      Invalid / forged  Curse signal

  Tab: envelope/body  L: ledger  V: verification  H: help  Esc: pause
```

- Full layout minimum: **94x30**. It places regulations and a document side by side.
- Compact layout: **80x28**. Regulations occupy the top four rows; the current message fills the centre; non-current details move to `Tab` panels. The player never has to scroll a mandatory field off screen.
- Below 80x28, freeze input and display the standard Gamr resize message with required/current size.
- ANSI colour is supplementary only: each destination has a number, icon, and label; suspicion uses textual tags such as `CURSE SIGNAL`, `INVALID`, and `URGENT`.
- The start screen uses the repository’s subtle glitch-title convention. The desk itself should be calm, paper-like, and low-animation so text remains readable.

### State-specific screens

| State | Purpose | Primary input |
|---|---|---|
| Start | Explain role; choose Induction, First Week, or replay seed. | `T`, `P`, `R`, `Q` |
| Briefing | Show only new regulations and examples for the coming shift. | Enter |
| Workbench | Inspect and route mail. | `1`–`4`, Tab, L, V |
| Audit flash | Give correct/incorrect result and rule explanation. | Enter / any key |
| Perk choice | Choose one of three office perks. | `1`–`3` |
| Shift report | Accuracy, trust, case changes, and next-shift teaser. | Enter |
| Game over / ending | Rank, report, seed, and replay actions. | `R`, `N`, `Q` |

### Controls

| Key | In workbench | Result |
|---|---|---|
| `1`, `D` | Route | Dispatch as routine genuine mail. |
| `2`, `E` | Route | Express as valid urgent mail. |
| `3`, `R` | Route | Return invalid/forged mail. |
| `4`, `S` | Route | Seal cursed mail. |
| `Tab` | Inspect | Switch envelope, letter, and insert/details views. |
| `L` | Reference | Toggle full ledger/rule wording. |
| `V` | Assist | Spend/activate Verification Mark when available. |
| `H` | Help | Show destination precedence and keyboard legend. |
| `Esc` | Global | Open the shared Gamr pause menu. |

When a key selects a route, show an audit card before advancing. This removes accidental rapid-fire mistakes and makes every decision observable.

## Tutorial

The induction is a playable six-letter micro-shift, not an exposition wall.

1. Route a genuine ordinary hospital note to Dispatch. Highlight sender, address, and action row.
2. Route a genuine deadline notice to Express. Introduce the urgency field.
3. Return a letter with a broken registry code. Audit points to the code mismatch.
4. Seal a message with black wax. Explain that curses override urgency.
5. Use the ledger on an address rule, then route a valid exception correctly.
6. Handle one straightforward generated-looking letter without highlights.

Spawning is not time-based, so tutorial state simply locks unavailable controls and advances on the intended decision. It is skippable after its first completion and never alters campaign scores.

## Architecture

The core must be model-first: no terminal import, ANSI sequences, wall-clock dependency, or uncontrolled randomness in game rules. The controller owns lifecycle and presentation; the engine owns facts, rules, evaluation, progression, and deterministic generation.

```text
src/games/dead-letter-department/
├── index.ts                 # Gamr controller, intervals, screen state, cleanup
├── types.ts                 # Domain types, constants, serialisable save schema
├── seed.ts                  # Deterministic PRNG streams and seed parsing
├── content.ts               # Senders, wards, fragments, rules, case-thread data
├── rules.ts                 # Rule predicates, precedence evaluator, explanations
├── generator.ts             # Candidate construction, deck constraints, validation
├── engine.ts                # Commands, scoring, trust, shift/campaign progression
├── tutorial.ts              # Scripted induction state and objectives
├── input.ts                 # Keyboard event → pure command mapping
├── render.ts                # Pure ANSI layout/render helpers and responsive modes
├── persistence.ts           # Local best-run/replay snapshot adapter (guarded storage)
├── engine.test.ts           # Rules, commands, progression, deterministic replay
├── generator.test.ts        # Deck validity, pacing, and property-style seed tests
└── render.test.ts           # Layout sizing and colour-independent labels
```

### Domain state

```ts
type Destination = 'dispatch' | 'express' | 'return' | 'seal';
type Phase =
  | 'start'
  | 'briefing'
  | 'tutorial'
  | 'working'
  | 'audit'
  | 'perk'
  | 'report'
  | 'gameOver'
  | 'ending';

interface ShiftRules {
  shift: number;
  rules: ActiveRule[];
  precedence: Destination[];
  knownExamples: RuleExample[];
}

interface DecisionRecord {
  messageId: string;
  selected: Destination;
  expected: Destination;
  correct: boolean;
  evaluation: Evaluation;
}

interface GameState {
  version: number;
  seed: number;
  phase: Phase;
  mode: 'tutorial' | 'campaign' | 'replay';
  shift: number;
  rules: ShiftRules;
  deck: Message[];
  inboxIndex: number;
  trust: number;
  maxTrust: number;
  score: number;
  standing: number;
  streak: number;
  perks: PerkId[];
  verificationMarks: number;
  inspectionView: 'envelope' | 'letter' | 'insert';
  ledgerOpen: boolean;
  helpOpen: boolean;
  pendingAudit: DecisionRecord | null;
  caseThreads: Record<CaseThreadId, CaseThreadState>;
  history: DecisionRecord[];
}
```

State uses plain arrays and objects so it can be snapshot-tested and saved. IDs are stable (`shift-03-mail-08`) rather than derived from render order.

### Engine command API

```ts
type Command =
  | { type: 'startCampaign'; seed?: number }
  | { type: 'startTutorial' }
  | { type: 'dismissBriefing' }
  | { type: 'chooseDestination'; destination: Destination }
  | { type: 'dismissAudit' }
  | { type: 'toggleLedger' }
  | { type: 'toggleHelp' }
  | { type: 'cycleInspectionView' }
  | { type: 'useVerification' }
  | { type: 'choosePerk'; perkId: PerkId }
  | { type: 'continueReport' }
  | { type: 'restart'; seed?: number };

function createRun(seed: number, mode: GameState['mode']): GameState;
function applyCommand(state: GameState, command: Command): CommandResult;
function evaluateMessage(message: Message, rules: ShiftRules): Evaluation;
function generateShiftDeck(context: DeckContext): Message[];
function validateDeck(deck: Message[], rules: ShiftRules): ValidationIssue[];
```

`applyCommand` validates phase and command legality, returns a new state (or a carefully cloned immutable result), and produces named presentation events such as `correctRoute`, `wrongRoute`, `curseSealed`, `shiftPassed`, and `campaignEnded`. The renderer maps those events to particles, popups, flash, and shake; it does not decide outcomes.

### Shift resolution pipeline

```text
create run
  → derive ShiftRules from authored shift template + chosen perks
  → generate and validate deterministic deck
  → briefing
  → player command: choose destination
  → evaluate facts against active rules
  → append DecisionRecord and apply score/trust/thread effects
  → audit card
  → next letter OR shift report
  → deterministic perk offer OR ending
```

### Gamr integration

- Export `runDeadLetterDepartmentGame(terminal)` with the same `stop()`/`isRunning` controller contract as Packet Panic.
- Use `getCurrentThemeColor`, `getVerticalAnchor` where useful, `dispatchGameQuit`, `dispatchGameSwitch`, `dispatchGamesMenu`, and the shared pause-menu helpers.
- Enter alternate buffer and hide the cursor on launch. `stop()` must clear render intervals, dispose `terminal.onKey`, and return terminal control exactly once.
- Render at 20 FPS only for presentation; the game has no simulation interval. Commands advance state synchronously, making replays exact and paused by nature.
- Use shared effects sparingly: a contained wax-spark effect for sealing, a short flash on an audit error, and no screen shake on normal correct decisions. Respect reduced-motion preference if the existing terminal integration exposes one; otherwise provide an `ANIMATIONS: LOW` toggle later.
- Register the game in `src/games/index.ts` with description: **“Inspect the mail. Seal what answers back.”** Add it to README’s active game list and controls once implementation is complete.

## Implementation milestones

### 0 — Paper prototype and content contract

Write one full briefing and 20 static messages in a Markdown test sheet. Hand-evaluate every message with the precedence rules. Produce both 94-column and 80-column ANSI wireframes.

**Done when:** five outside readers can identify the correct desk for at least 18/20 letters and explain why; every miss maps to a wording or layout fix, not a player failure.

### 1 — Pure judgment engine

Implement `types`, seeded PRNG, the rule schema, evaluator, command reducer, score/trust updates, and a static Shift 1 deck. No terminal controller yet.

**Done when:** unit tests show evaluator precedence, invalid-command safety, and an identical replay snapshot for the same seed plus command list.

### 2 — Procedural mail vertical slice

Add sender/content tables, valid-base construction, mutations, candidate rejection, deck constraints, and the first two shifts. Add debug text output that prints rule IDs, facts, expected destination, and explanations.

**Done when:** 1,000 generated seeds across Shifts 1–2 create no missing evidence, ambiguous expected destinations, duplicate IDs, or impossible deck mixes.

### 3 — Playable terminal desk

Implement controller, start screen, briefing, workbench, inspection panels, route keys, audit card, pause integration, small-terminal handling, and end/restart cleanup. Keep the vertical slice at two shifts until the desk is effortless to read.

**Done when:** a player can finish two shifts without developer keys at 80x28 and 100x35 in dark and light themes.

### 4 — Full First Week and story threads

Add shifts 3–6, exceptions, compound evidence, all four destinations, perks, eight case threads, reports, endings, and local replay/best-run persistence.

**Done when:** the campaign supports three recognisably different seed runs and each final shift has clear, counterable rules rather than surprise traps.

### 5 — Balance and release polish

Conduct blind playtests, tune deck weights and trust thresholds, improve the wording of high-miss rules, add accessibility text, register the game, update README, and run typecheck/build/tests.

**Done when:** new players can explain the precedence order after induction, a wrong route is followed by a useful audit explanation, and the game can be stopped/switched/restarted without leaked terminal listeners or buffer state.

## Test plan

Use Vitest following the repository’s current engine-test pattern. Test the pure model much more heavily than ANSI rendering.

### Rules and evaluation

- Routine valid message evaluates to Dispatch.
- Valid message with the active deadline condition evaluates to Express.
- Each authenticity-rule violation evaluates to Return when no curse condition exists.
- Each curse signal evaluates to Seal.
- Curse beats urgent, forged, and valid conditions exactly as the bulletin says.
- An exception overrides only its documented base rule and only when every exception condition is visible.
- Evaluation always contains a decisive rule and visible evidence reference.
- Audit explanation names the relevant field and never leaks hidden `primaryDisposition` data.

### Generator and content validation

- Every content-table sender, address, seal, postmark, and body-template reference resolves.
- Same seed + shift + perks produces byte-for-byte equal normalised decks.
- Generated IDs are unique and stable.
- Every generated message passes `evaluateMessage` and has the intended expected destination.
- Deck validation enforces category counts, new-rule teaching examples, and anti-repetition rules.
- Across at least 10,000 generated seeds, no deck has an invalid date, absent evidence, body/fact contradiction, or category outside its shift’s unlocked possibilities.
- Case beats appear in correct order and preserve their authored decisive evidence.

### Engine and progression

- Destination commands are ignored outside `working` and cannot route a letter twice.
- Correct/wrong decisions update trust, score, streak, and standing exactly once.
- Trust reaches game-over only after the audit result is recorded.
- Shift report, perk choice, and next shift preserve seed, perks, history, and case state.
- A complete command transcript reproduces final state and report exactly.
- Restarting with a displayed seed regenerates the same deck and perk offers.
- Save/load handles corrupt or old-version payloads safely by falling back to a new run with a user-visible message.

### Rendering and lifecycle

- Full layout contains all mandatory fields at 94x30; compact layout contains them at 80x28.
- Too-small terminal displays requirement/current dimensions and does not accept routing input.
- Every destination has numeric and text labels without ANSI colour.
- Long generated names/body lines wrap or truncate without overwriting action controls.
- Pause, restart, quit, games menu, and next game dispose listeners and clear alternate-buffer state correctly.
- Test dark/light theme output manually; inspect screen-reader-friendly plain text snapshots where practical.

## Balance instrumentation

Add a development-only debug overlay and end-run log. It should be disabled in the release UI but inexpensive to maintain.

```text
SEED 38291047  SHIFT 04  MAIL 07/13
EXPECTED seal  CHOSEN return  RULE CURSE_BLACK_WAX
DECISIVE EVIDENCE envelope.seal  DECK: D3 E3 R4 S3
ACCURACY 86%  AVG DECISION 18.4s  TOP MISSED RULE POSTMARK_FOG
```

For every run, record seed, content version, shift, chosen perks, trust path, destination distribution, rule miss rates, Verification use, decisions, and case-thread outcome. Use this to find rules that are unclear, not merely difficult. A rule with high error rate after players have seen its teaching example should be rewritten or visually strengthened before its weight is reduced.

## Accessibility and content guidelines

- Never rely on red/green, wax colour, animation, or sound alone. Pair every symbol with an ASCII label (`[BLACK WAX]`, `[BROKEN]`, `[URGENT]`).
- Keep required prose short: 2–5 lines in compact mode, with optional flavour insert for richer writing.
- Use a high-contrast-safe palette from the active Gamr theme and preserve a plain-text rendering path.
- Avoid real-world bureaucracy, immigration, nationality, class, race, disability, or identity as the source of a “validity” decision. The game judges fictional document consistency and supernatural safety, not people.
- Keep horror uncanny rather than graphic. The player’s job is to contain, not ridicule or exploit, the people represented in the mail.

## Version-1 non-goals

- Real-time inbox pressure, typing challenges, mouse interaction, or pixel-art documents.
- Freeform AI-generated prose at runtime; authored grammar preserves tone, safety, and solvability.
- Online accounts, leaderboards, cloud saves, or obligatory daily rewards.
- A huge branching novel; case threads provide replayable texture with a contained content budget.
- More than four routing destinations or more than two active exception rules in a standard shift.
- Seed sharing UI, daily/weekly challenge archives, localisation, and mod support before First Week is proven fun.

## Definition of done

Dead Letter Department is ready to ship when:

1. A new player learns Dispatch, Express, Return, Seal, and curse precedence through the playable induction.
2. First Week contains six fair shifts, 10–14 messages each, four destinations, at least eight perks, and eight recurring case threads.
3. Every generated message is deterministically reproducible, has a single documented correct destination, and exposes its decisive evidence to the player.
4. Engine tests cover evaluation precedence, generation validity, command progression, and replay determinism independently of terminal rendering.
5. The game uses Gamr’s controller lifecycle, shared pause menu, themes, terminal-size handling, transitions, and game registry cleanly.
6. Blind-playtest feedback describes mistakes as a missed visible rule—not unfair wording, hidden information, or an unclear control.
