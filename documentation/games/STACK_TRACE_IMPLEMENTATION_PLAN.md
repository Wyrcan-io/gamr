# Stack Trace — Full Game & Implementation Plan

## Product decision

**Stack Trace is a turn-based program-repair puzzle game.** Each case supplies a small, damaged tray of pseudo-code blocks and a fully visible test suite. The player repairs the program by placing, moving, and mutating those blocks into a short stack-machine routine, then runs it against every case.

The intended feeling is the compact satisfaction of a Zachtronics-style programming puzzle without its intimidating surface area:

- A player manipulates labelled blocks; they never type or memorise syntax.
- Each puzzle is a 30-second to 5-minute deterministic repair job, not a real-time challenge.
- Every input and expected output is visible before execution. There are no surprise hidden tests in the main campaign.
- One command runs the full suite; another steps the selected case instruction-by-instruction and shows the stack changing.
- Failure names the first failing test, expected value, actual value, and exact block that produced it.
- A stable daily challenge and compact solution code make comparison and sharing natural, without an account, network service, or leaderboard requirement.

This is deliberately not a general-purpose programming language, code editor, or typing tutor. It is a tactile **repair-the-pipeline** game: arrange a handful of physical-looking instructions until a constrained machine behaves correctly.

## Research translated into design

The reference point is the *programming / logic / simulation* puzzle space exemplified by Zachtronics' own description of [SHENZHEN I/O](https://store.steampowered.com/app/504210/SHENZHENIO/): components, compact instructions, reference material, and optimisation can make computation itself feel like a construction puzzle. Stack Trace adopts the readable-system and post-solve-comparison appeal, but avoids the manual-heavy assembly syntax, mouse requirement, and open-ended optimisation barrier.

Design consequences:

1. **Rules before mystery.** The operation reference is always one key away and each block displays its stack effect.
2. **Diagnosis is gameplay.** A trace must reveal why a repair failed; a red result alone is not acceptable feedback.
3. **Small search spaces, real expression.** A level offers 4–9 blocks and at most 8 editable slots. It supports clever order and parameter choices without becoming brute-force combinatorics.
4. **Visible correctness, optional elegance.** Passing all cases completes a puzzle. Block-count and step-count targets create the “one more improvement” impulse but never gate progression.
5. **Offline reproducibility.** Campaign content is curated; daily puzzles derive from a versioned UTC date seed and are certified by the same evaluator as the player program.

## Player promise and session shape

> “Give me a broken little program and enough evidence to fix it. Let me see exactly what my fix does.”

| Beat | Player experience | Target |
|---|---|---:|
| Read task | Compare a short contract with 3–6 input/output examples. | 10–20s |
| Repair | Move blocks, adjust a literal or input selector, and inspect stack effects. | 20s–3m |
| Verify | Run all tests at once; inspect the first red mismatch if needed. | 2–8s |
| Understand | Step the failing case to see values flow through the stack. | 10–45s |
| Ship | Earn pass/elegance marks, see a solution stamp, continue or improve. | 5–15s |

Campaign completion should take roughly 2–3 hours for a new player. A daily puzzle should take 2–8 minutes. The game must be pleasant to leave and return to because every puzzle is static until the player acts.

## The core loop

1. Read a one-line repair ticket and all of its tests.
2. Inspect the available blocks and their current, deliberately damaged ordering/parameters.
3. Move blocks into the execution tape, reorder them, or return unused blocks to the tray.
4. Mutate editable values or selectors until the pseudo-code says what the player intends.
5. Run the complete suite; every test gets a green pass, red mismatch, or amber runtime fault.
6. If it fails, select a case and step through the same deterministic evaluator.
7. Pass all tests to clear the case; optionally reduce used blocks or executed steps to earn advisory elegance marks.
8. Continue to the next ticket, replay a cleared one, attempt the daily, or share/import a solution code.

There is no countdown, life system, random test ordering, or punishment for experimentation. Reset and undo are first-class repair tools.

## Exact machine rules

### Data domain

Version 1 operates only on signed integers in the inclusive range **-99 to 99**. Each test supplies named input values, normally `X` and optionally `Y`, and expects one integer output.

- The stack starts empty for every test.
- A program has 3–8 editable instruction slots plus a locked final `RETURN` block.
- The available tray contains a fixed set of block *instances*. Instances may be used once; a blank slot does nothing.
- A valid result is one `RETURN` value. Extra stack values are allowed in an early puzzle only when its contract explicitly says so; all normal puzzles require the stack to contain exactly one value at `RETURN`.
- Division is intentionally absent in Version 1 so there is no rounding-rule ambiguity. A future expansion can add it only with an explicit floor/truncate rule and tests.

All arithmetic is checked. An operation producing a value outside `-99..99` faults with `RANGE`, rather than wrapping or silently clamping. Stack underflow faults with `UNDERFLOW`. A `RETURN` with zero or multiple stack values faults with `RETURN ARITY`.

### Block vocabulary

Only a level's listed blocks are available. The global vocabulary remains deliberately small.

| Family | Block | Stack effect | Mutable field | Purpose |
|---|---|---|---|---|
| Load | `LOAD X` / `LOAD Y` | `[] → [value]` | input selector | Introduces an input. |
| Literal | `PUSH n` | `[] → [n]` | `n` within level range | Adds a constant. |
| Unary | `NEG`, `ABS`, `DUP` | `[a] → [-a]`, `[|a|]`, `[a,a]` | none | Sign, distance, reuse. |
| Binary | `ADD`, `SUB`, `MUL` | `[a,b] → [a+b]`, `[a-b]`, `[a*b]` | operator family in selected levels | Basic composition. |
| Pair | `SWAP` | `[a,b] → [b,a]` | none | Makes operand order visible. |
| Choice | `MIN`, `MAX` | `[a,b] → [min/max]` | min/max selector | Branch-free comparisons. |
| Predicate | `ZERO?`, `NEG?` | `[a] → [1 or 0]` | predicate selector | Builds a Boolean integer. |
| Select | `SELECT` | `[false,true,condition] → [condition ? true : false]` | none | Conditional behaviour without jumps. |
| Return | `RETURN` | `[answer] → output` | locked | Ends every program. |

The stack notation is always bottom-to-top; in `[a,b]`, `b` is on top. `SUB` therefore means “second-from-top minus top.” The renderer repeats this notation in the hover/selection inspector, so operand order never has to be inferred.

### Moving, sequencing, and mutation

These three actions are the game’s verbs, and each must be mechanically distinct.

| Verb | Result | Primary input |
|---|---|---|
| Place / sequence | Insert an available block at the selected tape slot, shifting later blocks right when possible. | `Enter` |
| Move | Lift a placed block, select another slot, and drop it; intermediate blocks shift rather than being destroyed. | `Space`, arrows, `Enter` |
| Return | Remove the selected non-locked block to the tray. | `Backspace` or `X` |
| Mutate | Cycle a selected block's allowed parameter/selector. `Shift` reverses the cycle. | `M` |
| Undo / redo | Reverse or restore the last tape edit, including a mutation. | `Z` / `Y` |

Mutation is bounded by the puzzle definition. A literal might cycle `-3, -2, -1, 0, 1, 2, 3`; a load block might cycle `X, Y`; a binary card in a later puzzle might cycle `ADD, SUB, MUL`. The inspector previews the next and previous mutation, and an edited field is marked `*`, so mutations remain deliberate rather than a hidden mode.

### Evaluation order

Running a test executes non-blank tape slots from top to bottom, then the locked `RETURN`.

```text
for instruction in tape:
  skip blanks
  apply instruction to a fresh stack
  stop at the first runtime fault
return the final stack value or a precise fault
```

The full-suite runner executes tests in their printed order, always evaluates all tests, and preserves a `TraceFrame[]` for the selected test and the first failure. This makes the results stable for testing, debugging, snapshots, and solution sharing.

## Difficulty curve and curated campaign

Campaign content is data, not procedural. Each chapter introduces exactly one new idea, immediately reinforces it, then combines it with prior ideas. A mandatory solution never depends on a trick absent from the ticket or block reference.

| Chapter | Cases | New concept | Representative ticket | Required insight |
|---|---:|---|---|---|
| 0: Boot | 4 | Tape order, run, trace | “Return X plus 1.” | Load before literal before `ADD`. |
| 1: Bad Constants | 6 | Literal mutation | “Correct sensor drift by a signed offset.” | Change `PUSH` as well as moving it. |
| 2: Stack Discipline | 6 | `DUP`, `SWAP`, operand order | “Compute `Y - X`.” | Follow bottom/top values, not text order. |
| 3: Signatures | 6 | `NEG`, `ABS`, overflow | “Report distance from zero.” | Choose stable operations and avoid invalid intermediate values. |
| 4: Two Inputs | 6 | `MIN`, `MAX`, both loads | “Return the safer reading.” | A stack is an ordered pair, not a bag. |
| 5: Decisions | 6 | predicates and `SELECT` | “Apply a fee only to negative balances.” | Build condition and both outcomes in correct stack order. |
| 6: Patch Budget | 5 | limited slots, optional elegance | “Use every supplied part—or find the shorter repair.” | Minimise without sacrificing clarity. |
| 7: Incident Report | 5 | mixed final repairs | “Repair legacy routines under tight contracts.” | Combine all prior skills. |

That is **44 campaign cases**, including a four-case interactive onboarding. Each standard case has 3–6 explicit tests, except final cases with 6–8. Tests must include zero, a negative value when signs matter, non-commutative ordering checks, and at least one value that rejects plausible-but-wrong shortcut programs.

### First eight tickets

These form the playable vertical-slice content and define the teaching tone.

| ID | Contract | Tray / damage | Visible tests | Lesson |
|---|---|---|---|---|
| `B01` | Return `X`. | `LOAD X` is after `RETURN` placeholder. | `0→0`, `5→5`, `-2→-2` | Move a block, run. |
| `B02` | Return `X + 1`. | `ADD`, `PUSH 1`, `LOAD X` shuffled. | `0→1`, `4→5`, `-3→-2` | Sequence matters. |
| `B03` | Return `X - 2`. | Mutable `PUSH 1`; `LOAD X`, `SUB`. | `2→0`, `0→-2`, `-4→-6` | Mutate a literal. |
| `B04` | Return `2 × X`. | `LOAD X`, `PUSH 2`, `MUL`, one blank. | `1→2`, `4→8`, `-3→-6` | First complete stack recipe. |
| `C01` | Return `Y - X`. | `LOAD X`, `LOAD Y`, `SUB`. | `(2,5)→3`, `(9,1)→-8`, `(0,0)→0` | Operand order. |
| `C02` | Return `X + X`. | `LOAD X`, `DUP`, `ADD`. | `0→0`, `3→6`, `-4→-8` | Duplication. |
| `C03` | Return `abs(X)`. | `LOAD X`, mutable `NEG/ABS`, `RETURN`. | `-5→5`, `0→0`, `7→7` | Unary mutation. |
| `C04` | Return larger of `X`,`Y`. | `LOAD X`, `LOAD Y`, mutable `MIN/MAX`. | `(2,5)→5`, `(8,-1)→8`, `(3,3)→3` | Read stack effects. |

### Fairness rules for content authors

- Do not use an output-only test set where two substantially different intended behaviours pass by accident. Add a discriminating case.
- Do not require arithmetic that reaches the range limit unless the ticket explicitly introduces range safety.
- Do not punish an aesthetically unusual but valid solution. Reference solutions support hints and balancing, never a “wrong style” verdict.
- Introduce a block in a case where it is necessary and its effect is isolated.
- Never introduce more than one new block family in the same case.
- Test all content with the exhaustive bounded solver before release; every campaign case needs at least one valid program within its declared slots.

## Failure, hints, and success

### Result taxonomy

| Result | UI treatment | Copy example | Player action |
|---|---|---|---|
| Pass | `✓` and green/bright row | `T03  X=-3  expected -2  got -2` | Continue or optimise. |
| Mismatch | `×` and red row | `T02  expected 5  got 3` | Step that test or change tape. |
| Underflow | `!` and amber row | `L03 SUB needs 2 values; stack has [4]` | Load/duplicate before consuming. |
| Range | `!` and amber row | `L04 MUL produced 120; allowed -99..99` | Reorder or choose a safer mutation. |
| Return arity | `!` and amber row | `RETURN needs one value; stack is [2, 7]` | Consume or avoid extra values. |
| Incomplete | muted `·` | `No program run since last edit.` | Run the suite. |

One failure is enough to identify, but never hides the rest: all test outcomes render after a full run. The focus key `F` jumps to the earliest failing test and offending line.

### Hints

Hints are opt-in, puzzle-specific, and progressive; they do not auto-solve or reduce a score because there is no competitive score in the core game.

1. **Read:** restate the contract in stack terms, such as “`SUB` needs the value to subtract on top.”
2. **Diagnose:** point to an observable cause, such as “the first failing test reaches `SUB` with only one value.”
3. **Nudge:** identify a relevant block family or required intermediate value, never a full placement.
4. **Reveal:** show the reference tape only after confirmation. Mark the case as `assisted` in the local session report, but still allow it to unlock progression.

### Completion and elegance

A case clears when all tests pass. It also has optional targets:

- **PATCHED** — all explicit tests pass.
- **LEAN** — uses at or under a listed non-blank-block target.
- **CLEAN** — executes at or under a listed maximum instruction count across the suite.

Targets are advisory badges shown on the completion card. They drive replayability without requiring a time score or an objectively “best” solution. A puzzle with no verified Lean solution cannot ship.

## Daily challenge and solution sharing

### Daily mode

The Daily Trace is one single puzzle for the whole world per **UTC calendar date**, calculated locally. It must work completely offline.

```text
dailyKey = "stack-trace/v1/" + YYYY-MM-DD (UTC)
seed = fnv1a32(dailyKey)
templateIndex = seed % DAILY_TEMPLATES.length
puzzle = instantiateDaily(DAILY_TEMPLATES[templateIndex], seed)
```

Daily templates are hand-designed schemas (for example, absolute difference, capped adjustment, signed comparison) with seeded but bounded constants and test inputs. Instantiation may only choose from a pre-validated finite parameter table. It may never create a brand-new random problem shape at runtime.

Before a template/parameter table is released, the content build test must:

1. instantiate a large representative seed set plus all table entries;
2. execute a bundled reference program for each instance;
3. use the bounded solver to prove at least one legal solution exists;
4. reject instances with duplicate tests or insufficient discriminating cases;
5. snapshot a sample of dates to prevent accidental rule-version drift.

Version 1 has no online streak, notification, login, leaderboards, or forced reward loop. The title screen shows `DAILY TRACE · 2026-07-31 UTC` and the puzzle remains playable forever when opened by date through the archive field.

### Solution stamp

After a successful run, render a short, copyable stamp such as:

```text
ST1-D-2026-07-31-4F2K.1A0C.73R
```

The code encodes the content version, puzzle identity, slot order, block instance IDs, and mutable variant indices; it does **not** encode test results or trust a claimed pass bit. On import, the game reconstructs the program, checks the puzzle identity/version, reruns every test, and reports the actual result.

- `V` opens the current solution stamp panel.
- `I` opens an import field that accepts printable characters, Backspace, Escape, and Enter. This is terminal-safe and works with paste.
- An invalid or other-puzzle code leaves the current tape untouched and shows a precise rejection reason.
- Browser hosts may offer clipboard copy behind feature detection; manual copy is always supported.

Share codes are intentionally a solution exchange, not an external leaderboard API. The daily URL/date and the stamp are enough for chat, screenshots, and terminal transcripts.

## Terminal UI and controls

The screen should resemble a compact repair console, not a text editor. Minimum terminal size is **80×28**; gameplay freezes and shows the standard resize message below that. At 100×35, extra vertical space shows a fuller trace rather than stretching the core layout.

### Semantic visual vocabulary

| Concept | Preferred glyph | ASCII fallback | Meaning |
|---|---|---|---|
| passing test | `✓` | `+` | Verified. |
| failing test | `×` | `x` | Mismatch. |
| runtime fault | `!` | `!` | Invalid execution. |
| current instruction | `▶` | `>` | Next/active trace frame. |
| stack value | `◇` | `o` | Value in the stack. |
| empty slot | `·` | `.` | Editable absence. |
| lifted block | `⇅` | `^v` | In move mode. |
| mutable field | `↻` | `~` | `M` cycles it. |
| locked return | `◆` | `#` | Cannot move/remove. |
| objective complete | `★` | `*` | Patch/elegance mark. |

Colour reinforces, never replaces, these symbols: theme colour is neutral/selected, cyan or green-like bright text is passed, amber is a fault requiring attention, and red is a mismatch. In light themes, use bold/underline and explicit words as well as colour.

### 80×28 wireframe

```text
                         S T A C K   T R A C E
 CASE C02 / 44  "ECHO CHAMBER"                  PATCHED ✓  LEAN ·  CLEAN ·
 Return X + X.  Repair the tape, then verify every supplied case.
 ┌─ EXECUTION TAPE ──────────────────────────────┐ ┌─ TEST SUITE ─────────────┐
 │ L01  [ LOAD X ]                                │ │ ✓ T01  X= 0  →  0       │
 │ L02  [ DUP    ]                                │ │ × T02  X= 3  →  5  got 3│
 │ L03  [ ADD    ]                                │ │ ✓ T03  X=-4  → -8       │
 │ L04  [   ·    ]                                │ │                           │
 │ L05  [◆ RETURN]                                │ │ ALL: 2/3 PASS             │
 └────────────────────────────────────────────────┘ └───────────────────────────┘
 ┌─ BLOCK TRAY ───────────────────────────────────┐ ┌─ INSPECT / TRACE ────────┐
 │ [LOAD X] [DUP] [ADD] [PUSH 2 ↻] [NEG]          │ │ T02  line 03 ▶ ADD       │
 │ selected: ADD   [a,b] → [a+b]                  │ │ stack before: [3, 3]     │
 └────────────────────────────────────────────────┘ │ stack after : [6]        │
                                                      │ expected 5 / got 6       │
 Arrows move · Enter place/drop · Space lift · M mutate · R run · S step · H hint · Esc pause
```

The tape is the primary focus. The tray uses compact cards; when a card is lifted, the source slot displays `⇅`, the target cursor is high-contrast, and invalid drops are blocked with a short status message rather than silently replacing a block.

### Input map

| Context | Key | Action |
|---|---|---|
| Start | `T` / `P` / `D` | Tutorial / campaign / daily. |
| Tape or tray | arrows / WASD | Move focus. |
| Tape or tray | `Tab` | Toggle tape/tray focus. |
| Tray | `Enter` | Insert selected block at selected tape slot. |
| Tape | `Space`, move, `Enter` | Lift, reposition, drop a placed block. |
| Tape | `Backspace` / `X` | Return selected non-locked block to tray. |
| Selected block | `M` / `Shift+M` | Cycle mutable value forward/back. |
| Active puzzle | `Z` / `Y` | Undo / redo. |
| Active puzzle | `R` | Run all tests immediately. |
| Active puzzle | `S` / `N` | Start or advance selected-test trace; `P` previous frame. |
| Active puzzle | `F` | Jump to first fault/mismatch. |
| Active puzzle | `H` | Progressive hint panel. |
| Active puzzle | `V` / `I` | View solution stamp / import a stamp. |
| Active puzzle | `?` | Block reference and controls overlay. |
| Any active game | `Esc` | Shared Gamr pause menu. |
| Start/end | `Q` | Quit through Gamr transition. |

`R`, `S`, and hint actions never change the program, so an input log can clearly distinguish repair commands from inspection commands.

## Tutorial

Use four playable tickets, not a tutorial wall of text.

1. **Run the evidence:** move `LOAD X` before `RETURN`, run three tests, and see all green rows.
2. **Order makes a program:** make `X + 1`; the trace explicitly says which value `ADD` consumes.
3. **Mutate the corruption:** correct a `PUSH 1` to `PUSH -2` with `M`; show the `↻` marker before input is accepted.
4. **Diagnose the stack:** intentionally start with an underflowing tape, step it, then use `DUP` to solve `X + X`.

The tutorial advances only after the relevant action is taken. `H` remains available, and `Skip tutorial` begins campaign at `B02`; skipping must not conceal any game-only rule, because each newly introduced card has a contextual reference line.

## Architecture

The game must be model-first. The evaluator, content validation, solution codec, and daily generator must have no Terminal, DOM, ANSI, timer, or unseeded-random dependency. Rendering only displays state and command results.

```text
src/games/stack-trace/
├── index.ts              # Gamr controller, lifecycle, pause/import key modes
├── types.ts              # serialisable domain types, commands, constants
├── content.ts            # 44 curated cases, tutorial and block labels
├── daily.ts              # UTC key, seeded template instantiation, archives
├── machine.ts            # executeInstruction, runProgram, trace frames
├── engine.ts             # immutable-ish command reducer, undo/redo, progression
├── solver.ts             # bounded authoring solver and ambiguity diagnostics
├── solutionCode.ts       # versioned encode/decode/validation
├── render.ts             # pure ANSI layout and overlay rendering
├── input.ts              # key → command/modal parser helpers
├── content.test.ts       # curated and daily solvability checks
├── machine.test.ts       # evaluator unit and regression tests
├── engine.test.ts        # commands, undo, progression, deterministic replay
└── solutionCode.test.ts  # codecs, malformed/import mismatch cases
```

### Domain model

```ts
export type BlockKind =
  | 'load' | 'push' | 'neg' | 'abs' | 'dup' | 'swap'
  | 'add' | 'sub' | 'mul' | 'minmax' | 'predicate' | 'select' | 'return';

export interface BlockInstance {
  id: string;                 // stable content ID, e.g. "b3"
  kind: BlockKind;
  variant: string | number;   // e.g. "X", 2, "max", "neg"
  variants?: Array<string | number>; // legal mutation cycle, omitted when fixed
  locked?: boolean;
}

export interface TestCase {
  id: string;
  input: Partial<Record<'X' | 'Y', number>>;
  expected: number;
}

export interface PuzzleDefinition {
  id: string;
  chapter: number;
  title: string;
  contract: string;
  teachingNote?: string;
  slotCount: number;
  blocks: BlockInstance[];       // includes exactly one locked RETURN
  tests: TestCase[];
  targets?: { maxBlocks?: number; maxTotalSteps?: number };
  hints: [string, string, string];
  referenceProgram: string[];    // block IDs in order, content validation only
}

export interface TraceFrame {
  line: number;
  blockId: string;
  instruction: string;
  stackBefore: number[];
  stackAfter: number[];
  output?: number;
  fault?: 'UNDERFLOW' | 'RANGE' | 'RETURN_ARITY';
}

export interface TestResult {
  testId: string;
  status: 'pass' | 'mismatch' | 'fault' | 'unrun';
  actual?: number;
  trace: TraceFrame[];
  fault?: TraceFrame['fault'];
}

export interface StackTraceState {
  version: 1;
  phase: 'start' | 'brief' | 'editing' | 'complete' | 'ending';
  mode: 'tutorial' | 'campaign' | 'daily' | 'archive';
  puzzleId: string;
  tape: Array<string | null>; // block ids; RETURN is always last, locked
  tray: string[];
  selectedTapeSlot: number;
  selectedTrayIndex: number;
  focus: 'tape' | 'tray' | 'tests';
  liftedBlockId: string | null;
  results: TestResult[];
  selectedTestIndex: number;
  traceFrameIndex: number;
  undo: RepairSnapshot[];
  redo: RepairSnapshot[];
  clears: Record<string, ClearRecord>; // session-only until a persistence adapter exists
  notice: string;
}
```

Keep `PuzzleDefinition` immutable. The engine owns mutable runtime copies of block variants and tape/tray placement. `cloneState` must use explicit structured clones rather than JSON cloning, so TypeScript types and future fields remain visible in review.

### Evaluator API

```ts
export function runProgram(
  puzzle: PuzzleDefinition,
  tape: Array<string | null>,
  blockState: Record<string, BlockInstance>,
  test: TestCase,
): TestResult;

export function runSuite(state: StackTraceState): TestResult[];
export function executeInstruction(
  block: BlockInstance,
  stack: number[],
  input: TestCase['input'],
): { stack: number[]; output?: number; fault?: FaultCode };
```

`runProgram` returns every frame, including the frame that faults. It cannot mutate its input stack, content block instance, or program tape. This is the single source of truth used by run-all, stepping, hints, the solver, imported solutions, and tests.

### Command reducer

The controller converts browser/terminal keys to commands. The pure reducer validates and applies them, returning both state and named presentation events.

```ts
export type Command =
  | { type: 'start'; mode: 'tutorial' | 'campaign' | 'daily' }
  | { type: 'selectFocus'; focus: 'tape' | 'tray' | 'tests' }
  | { type: 'moveCursor'; delta: -1 | 1 }
  | { type: 'insert'; blockId: string; at: number }
  | { type: 'lift'; at: number }
  | { type: 'drop'; at: number }
  | { type: 'returnToTray'; at: number }
  | { type: 'mutate'; blockId: string; direction: -1 | 1 }
  | { type: 'undo' } | { type: 'redo' }
  | { type: 'runSuite' }
  | { type: 'selectTest'; delta: -1 | 1 }
  | { type: 'stepTrace'; delta: -1 | 1 }
  | { type: 'hint'; tier: 1 | 2 | 3 | 4 }
  | { type: 'importSolution'; code: string }
  | { type: 'nextPuzzle' } | { type: 'restartPuzzle' };

export interface CommandResult {
  state: StackTraceState;
  events: Array<'placed' | 'moved' | 'mutated' | 'run' | 'pass' | 'fault' | 'complete' | 'invalid'>;
}
```

Only successful tape edits are pushed to undo history, capped at 50 snapshots. Running, stepping, selecting, and showing a hint never create an undo entry. Any edit clears stale result rows to `unrun`, preserves the prior trace only until the next render cycle if needed for a transition, and marks the notice `PROGRAM MODIFIED — VERIFY AGAIN.`

### Bounded solver

The solver is an authoring/test tool, never a player-facing “solve” button. Given a puzzle’s finite block instances, variants, slot count, and tests, it enumerates legal tape permutations using depth-first search with early rejection:

1. Place one unused candidate at the next slot or leave it blank where allowed.
2. For each partial tape that cannot yet return, run only prefix-safe simulations to prune immediate guaranteed underflows/range faults.
3. When a complete tape is formed, run every test with `runProgram`.
4. Record pass programs, block count, and total steps; stop once the configured evidence threshold is reached.

For content with up to nine blocks, cache semantic state signatures (slot index, remaining block/variant multiset, stack outcomes across tests) so validation stays fast. Content validation should report all valid solution count buckets (`0`, `1`, `2–10`, `10+`) without treating many valid solutions as an error. It should report a warning when a puzzle has an unexpectedly huge solution space or no test distinguishes a common wrong operator.

## Gamr integration

Implement `runStackTraceGame(terminal)` and register it in `src/games/index.ts`:

```ts
import { runStackTraceGame } from './stack-trace';

{ id: 'stack-trace', name: 'Stack Trace',
  description: 'Repair the blocks. Pass every test.', run: runStackTraceGame },
```

The controller follows the repository’s current engine/render pattern:

- import `Terminal`, `getCurrentThemeColor`, `dispatchGameQuit`, `dispatchGameSwitch`, `dispatchGamesMenu`, `navigateMenu`, `PAUSE_MENU_ITEMS`, and `renderSimpleMenu`;
- enter the alternate terminal buffer and hide the cursor at launch; restore both on every stop path;
- render at 20 FPS only for cursor/title/trace presentation; the game model advances solely on input, so no simulation interval is required;
- use the shared pause menu for resume, restart, quit, games list, and next game;
- dispose the terminal key listener and clear the render interval in `stop()`;
- use `getVerticalAnchor` for larger terminals and a standard 80×28 resize screen;
- use restrained shared effects: a small spark burst/pop-up on a passed suite and a short amber flash on fault. Never animate stack values so quickly that a trace becomes unreadable.

The start screen uses the repository’s minor title-glitch treatment. Gameplay must not glitch or randomly shift; it is an inspection screen.

## Implementation sequence

### Milestone 0 — Rules proof and content worksheet

- Define the block vocabulary, stack notation, range rule, failure messages, and first eight puzzles in `content.ts` draft form.
- Hand-run every first-eight test and make an 80-column plain-text mock-up.
- Write reference programs and enumerate a few common wrong orders per case.

**Exit:** a reviewer can solve `B01`–`C04` from the text alone and understand each expected stack transition.

### Milestone 1 — Pure evaluator

- Add `types.ts` and `machine.ts` for loads, literals, unary, binary, return, traces, all fault conditions, and complete test suites.
- Add table-driven Vitest coverage before terminal code.
- Keep all arithmetic/stack arrays immutable at public boundaries.

**Exit:** a reference tape passes each vertical-slice case and intentionally malformed tapes produce exact `TraceFrame` snapshots.

### Milestone 2 — Repair reducer

- Add tape/tray placement, stable block identity, lifting/insert shifting, mutation, undo/redo, stale-result invalidation, selected-test trace navigation, and completion records.
- Reject illegal moves (locked return, unavailable block, filled/no-capacity insert) without changing state.

**Exit:** a command log can reproduce any vertical-slice repair from a fresh state, including undo/redo.

### Milestone 3 — Terminal vertical slice

- Add controller, 80×28 renderer, start screen, ticket brief, tape/tray/test panels, run-all results, single-case step trace, help/hint overlay, pause menu, resize handling, transitions, and success/fault effects.
- Register the game behind its final `stack-trace` id once the slice is playable.

**Exit:** a player can complete `B01`–`C04` using only documented keys, then restart/quit/switch games without leaked listeners or terminal state.

### Milestone 4 — Full campaign and content certification

- Implement the remaining 36 curated cases and progressive hints.
- Add solver and content tests. Tune tests and elegance targets from solver output, not intuition.
- Add chapter/ending screens and case-select/replay flow.

**Exit:** all 44 cases have a verified reference solution, valid hints, a pass target, and no puzzle is blocked by a renderer-only limitation.

### Milestone 5 — Daily and sharing

- Add date-seeded templates, UTC/archive UI, codec, import modal, stamp panel, and exhaustive table validation.
- Test malformed code, wrong date/puzzle, old version, and code that reconstructs but does not pass.

**Exit:** two independent instances given the same UTC date and solution stamp reconstruct the same tape and result offline.

### Milestone 6 — Accessibility and release polish

- Validate dark/light themes, ASCII fallbacks, 80×28 and 100×35 layouts, tab order, rapid key input, and every overlay’s Escape path.
- Add small animated accents only where they reinforce a completed or faulty run.
- Run `npm run typecheck`, `npm test`, and `npm run build`.

**Exit:** all acceptance criteria below are met.

## Test plan

### Machine tests

- Every block consumes and produces the documented stack shape.
- `SUB` verifies operand order; `SWAP` and `SELECT` get explicit truth-table tests.
- `NEG`, `ABS`, `MIN`, `MAX`, `ZERO?`, and `NEG?` cover negative, zero, and positive values.
- Underflow identifies the line/block and leaves the previous stack intact in the trace.
- Values at `-99`, `99`, and overflow boundaries fault consistently.
- Empty/multiple value returns produce `RETURN_ARITY`.
- A run suite executes tests in content order and evaluates all of them after an earlier failure.

### Engine tests

- Insert/lift/drop shifts blocks correctly and preserves stable instance IDs/variants.
- A locked return cannot be moved, mutated, returned, or duplicated.
- Mutation wraps and reverse-mutation reverses for every legal variant cycle.
- Invalid actions are no-ops with an `invalid` event.
- Undo/redo restores tape, tray, variants, selection, and stale results exactly; an edit after undo clears redo.
- Any repair edit invalidates old suite results; read-only trace navigation does not.
- Case completion requires every test to pass, and next/restart preserve only the intended campaign fields.

### Content and solver tests

- Every block ID is unique; every test input is inside range and declares all required inputs.
- Each reference program only uses supplied blocks, fits slots, and passes all tests.
- Solver finds at least one legal solution for every campaign and daily parameter instance.
- Every Lean/Clean target is actually attainable.
- Each two-input or non-commutative puzzle has at least one discriminating test that rejects its common swapped/incorrect-op alternative.
- Daily seed/date functions are UTC-stable and snapshots of known dates do not change unintentionally.

### Solution-code tests

- Encode/decode round trip preserves order and variants.
- Malformed base32/token/length/version fields fail safely.
- Codes for another puzzle/date cannot overwrite the current program.
- A syntactically valid but failing program imports, then correctly displays failed tests; it never receives a forged completion.

### Manual QA

- Test at 80×28, 100×35, too-small terminals, default dark theme, and one light theme.
- Check all semantic glyph fallbacks and that every critical result is understandable in monochrome.
- Complete a tutorial, campaign case, daily case, imported solution, pause restart, quit, list-games, and switch-games route in one session.
- Hold navigation/mutation keys and paste a long invalid code; no listener leak, stuck lifted block, or broken alternate buffer is allowed.
- Ask a fresh player to explain why their first failure happened before they use a hint. If they cannot, improve trace/copy rather than add a larger hint.

## Balance instrumentation

In development builds, provide a compact `~` diagnostic overlay (never in normal screenshots by default):

```text
CASE C04  EDITS 11  RUNS 4  HINT 1  FIRST PASS 02:14
SOLUTIONS 2–10  REF 3 BLOCKS / 12 STEPS  CURRENT 4 / 15
FIRST FAULT L03 UNDERFLOW  CONTENT v1  DAILY SEED 418882011
```

At case completion, retain only session-local aggregate metrics: number of edits, runs, hints, first-pass duration, first fault type, and whether Lean/Clean was achieved. Do not create player telemetry, accounts, or network requests. These metrics support playtest balancing and can be removed from production builds.

## Version-1 non-goals

- Freeform text programming, arbitrary variables, labels, loops, recursion, or Turing-complete puzzles.
- Hidden mandatory tests, time limits, failure lives, grinding, advertisements, or paywall-style daily rewards.
- Online leaderboard, cloud saves, multiplayer collaboration, or a backend service.
- A level editor or user-authored puzzle publishing workflow; the solution format is deliberately narrower.
- Automatic clipboard access as a requirement.
- Division/modulo, floating point, strings, arrays, or Boolean types beyond `0`/`1` predicates.

## Definition of done

Stack Trace is ready when:

1. A new player can solve the first four tickets and explain the stack trace without external documentation.
2. The full campaign has 44 fair, curated, fully test-visible cases with progressive hints and verified reference/Lean targets.
3. Moving, sequencing, and mutating blocks are responsive, reversible, distinct actions using stable block instances.
4. The pure evaluator is the sole source of correctness for gameplay, traces, solver validation, daily generation, and imported solutions.
5. Every daily puzzle is reproducible from UTC date and content version, works offline, and has a manual-copyable solution stamp.
6. The game meets Gamr’s controller, pause, alternate-buffer, transition, theme, minimum-size, effects, registration, typecheck, build, and test conventions.
7. Playtest failures read as “I can see the value/order mistake” rather than “the game hid the rule from me.”
