# Hyper Fighter — Rules and Implementation Notes

This folder contains a terminal-based gem battle versus puzzle game inspired by Super Puzzle Fighter.

Files:
- `index.ts`: game loop, rendering, input, resolution phases, garbage drop animation.
- `engine.ts`: pure board/gameplay logic (movement, gravity, clears, attack math, counters).
- `characters.ts`: 11 character definitions with drop patterns, damage modifiers, portraits.
- `ai.ts`: AI decisions by difficulty.
- `effects.ts`: particles, shake, flash, projectile visuals.
- `engine.test.ts`: gameplay unit tests.

## Game Flow

1. **Difficulty Select** — choose Easy / Normal / Hard
2. **Character Select** — pick your fighter from an 11-character roster (4+4+3 grid)
3. **VS Match** — play against AI with your chosen character

## Character System

Each character has:
- A **4x6 drop pattern** (`GemColor[4][6]`) that determines the color and column of garbage sent to the opponent
- A **damage modifier** that scales attack output
- A unique **ASCII portrait** with 5 poses (idle/attack/hit/win/lose)

### Roster

| Character | Pattern | Damage | Notes |
|-----------|---------|--------|-------|
| Ryu | Vertical columns | 100% | Predictable column garbage |
| Ken | Horizontal rows | 100% | Full-width same-color rows |
| Chun-Li | 2x2 color blocks | **120%** | Bonus damage, gifts power gems |
| Sakura | Fixed edges, alt middle | 100% | G/Y edges with R/B alternating |
| Morrigan | Symmetric mirrored | 100% | Left-right mirrored pattern |
| Hsien-Ko | Diagonal staircase | 100% | Color shifts diagonally |
| Felicia | Fixed edges, swap mid | 100% | G/Y edges swap per row pair |
| Donovan | 3-col halves + alt base | 100% | Split pattern with mixed base |
| Dan | ALL RED | 100% | Joke character — easy to counter |
| Akuma | Diagonal rainbow | **70%** | Best pattern, reduced damage |
| Devilotte | Reverse diagonal rainbow | **70%** | Best pattern, reduced damage |

### Drop Pattern Mechanics

When a player attacks, their character's 4x6 drop pattern determines what garbage the **opponent** receives:
- The pattern is a grid of 4 rows x 6 columns of gem colors
- A cursor cycles through all 24 cells (row-major order)
- At each step: column = cell's column index, color = cell's color value
- If the target column is full, adjacent columns are tried while keeping the intended color
- The cursor persists between attacks, creating varied placement across the match

## Gameplay Model

- Board size: `12 x 6` (`BOARD_ROWS=12`, `BOARD_COLS=6`).
- Spawn/drop alley: column `3` (0-based), i.e. the 4th column.
- Pieces are 2-gem pairs with four orientations (`up/right/down/left`).
- Gem types:
  - `normal`: regular color gem.
  - `crash`: detonator gem for same-color connected clears.
  - `counter`: incoming garbage gem with a visible countdown timer.
  - `diamond`: special gem that clears all gems of one color.

## Controls

- Move: `Left/Right` or `A/D`
- Rotate CW: `Up` or `W`
- Rotate CCW: `Z`
- Soft Drop: `Down` or `S`
- Hard Drop: `Space`
- Pause: `Esc`

## Clear and Chain Rules

Crash clear pipeline:
1. A `crash` gem must touch at least one adjacent same-color `normal` gem to trigger.
2. Triggered clear uses flood fill across connected gems of the same color.
3. Only `normal` and `crash` gems are part of that flood fill.
4. **Counter gem shattering**: any counter gem adjacent to a cleared cell is also destroyed. Shattered counters do not propagate further shattering.

Counter gems become clearable via flood fill after timer expiry converts them to `normal`.

Chain loop:
1. Detect crash targets (including counter shatter pass).
2. Clear.
3. Apply gravity.
4. Re-check for new crash targets.
5. Continue until no more clears.

## Attack and Counter Math

Per-step attack formula (matching real Super Puzzle Fighter II Turbo):

```text
For each chain step N (1-based):
  pgBonus = sum of floor(area / 8) for each power gem destroyed
  stepAttack = floor((gemsCleared + pgBonus) * N)

total = sum of stepAttack across all chain steps
attack = floor(total * damageModifier)
if diamond: attack = floor(attack * 0.5)
```

**Example**: 20 gems cleared across 4 chain steps of 5 gems each:
- Step 1: 5 × 1 = 5
- Step 2: 5 × 2 = 10
- Step 3: 5 × 3 = 15
- Step 4: 5 × 4 = 20
- **Total: 50** (vs old formula: 8)

Power gem bonus: destroying a 4×4 power gem (area 16) adds `floor(16/8) = 2` to that step's cleared count.

- `damageModifier` comes from the attacker's character (e.g., 1.2 for Chun-Li, 0.7 for Akuma)
- Diamond clears apply a 50% penalty — clearing via diamond gems sends half the garbage

Countering pending incoming garbage (2:1):

```text
cancelable      = floor(attack / 2)
canceledGems    = min(cancelable, pendingGarbage)
remainingAttack = attack - (canceledGems * 2)
remainingPending= pendingGarbage - canceledGems
```

If a player cancels at least one pending gem and still has pending garbage left, the remaining pending garbage is marked as "defended" so it spawns with a shorter timer.

## Counter Gem Timers

Two timer values are used when garbage is delivered:
- Normal incoming counter: `5`
- Defended incoming counter: `3`

Counters tick down in `decrementCounters()` after each resolution cycle.
When a counter reaches `0`, it converts into a `normal` gem. If a converted gem is adjacent to a crash gem of the same color, a new resolution cycle starts immediately — the crash triggers without waiting for the next piece drop.

## Resolution and Phase State Machine

Phases:
- `PHASE_NONE`
- `PHASE_FLASH`
- `PHASE_DISSOLVE`
- `PHASE_GRAVITY`
- `PHASE_CHECK`
- `PHASE_GARBAGE`

Typical lock flow:
1. Piece locks.
2. Run clear/chain phases.
3. Compute/cancel/send attack (with character damage modifier + diamond penalty).
4. Tick existing counters — if any converted gems trigger crash gems, restart from step 2.
5. Animate any pending garbage (`PHASE_GARBAGE`) using attacker's drop pattern.
6. Check game-over.
7. Spawn next pair.

## Game Over Rule

Loss is triggered when the top of the spawn/drop alley is blocked:

```text
board[0][DROP_ALLEY_COL] !== null
```

There is also a spawn-failure fail-safe: if a new pair cannot spawn, that side loses immediately.

## UI/Render Architecture

Arcade-inspired but terminal-native, with a dynamic layout that scales to fill the terminal.

### Dynamic Sizing

Cell dimensions scale based on terminal size:
- `cellWidth`: 3–6 chars, `cellHeight`: 2–4 rows
- Aspect-capped at ~1.5× (width ≤ 1.5 × height)
- `recalcCellStrings()` regenerates all cell fill strings (`cellSolid`, `cellPower`, `cellGhost`, etc.) when size changes

| Terminal | cellW | cellH | Board Size | Side Panels |
|----------|-------|-------|------------|-------------|
| 60×36 | 3 | 2 | 20×26 | No |
| 100×40 | 4 | 2 | 26×26 | Yes |
| 120×48 | 4 | 3 | 26×38 | Yes |
| 160×50 | 5 | 3 | 32×38 | Yes |
| 200×60 | 5 | 4 | 32×50 | Yes |

### Layout Components

- **Header bar** (2 rows): "HYPER FIGHTER" title left, matchup info right, separator line.
- **Side panels** (14 chars wide, toggle on/off by terminal width): NEXT piece, SCORE (7-digit zero-padded), SPEED (percentage + mini bar), CHAIN (during active chains only), INCOMING (garbage count + threat meter + level label).
- **Boards**: centered dual-board layout with middle VS lane. Empty cells show a dim `·` dot on the first height row for visual grid reference.
- **VS column**: character portraits with pose changes (idle/attack/hit/win/lose), energy bar.
- **Footer bar** (2 rows): separator line, centered controls text.
- **Fallback**: when terminal is too narrow for side panels, inline labels/next strips/score panels render above/below the boards instead.

### Other Visual Details

- Game-over shown in a readable modal panel with character names.
- Counter gems display with a colored background matching their gem color and bold white timer text.
- Layout recalculates on terminal resize — adapts live mid-game.

Color palette:
- Uses higher-contrast ANSI-256 values for red/green/blue/yellow in both board and effects.

## AI Difficulty

| Setting | Think Frames | Mistake Rate | Drop Speed | Chain Sim |
|---------|-------------|-------------|------------|-----------|
| Easy | 14 | 30% | Same as player | None |
| Normal | 8 | 10% | 33% faster | None |
| Hard | 4 | 2% | 50% faster | 1 step |

- **Drop speed boost**: Hard AI drops pieces at double speed (divides drop interval by `dropSpeedBoost`).
- **Chain simulation**: Hard AI simulates one crash step when evaluating placements, giving it chain awareness.
- **Smart rotation**: AI picks the shorter rotation direction (CW vs CCW) instead of always rotating clockwise.

## Known Intentional Differences vs Original Arcade

- Rendering is ANSI terminal art, not sprite/bitmap.
- Garbage uses character-specific drop patterns for strategic variety.
- Timing/animation values are tuned for CLI legibility and may differ from arcade frame pacing.
- 11 characters (including Devilotte) rather than the original 10.

## Development Notes

Run focused tests:

```bash
npm run test -- src/games/hyper-fighter/engine.test.ts
```

Run typecheck:

```bash
npm run typecheck
```
