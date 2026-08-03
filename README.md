# @wyrcan/gamr

Gamr is a curated anthology of terminal games that run in any xterm.js terminal or directly in your CLI.

The active lineup contains twenty games. Nineteen classic games remain importable and directly launchable through the **Arcade Archive** for compatibility; they are intentionally separate from the active support promise.

Small, stylish terminal games where every system is visible and every failure can be understood.

The TUI catalog is curated by maturity: four Featured games, two public betas, and fourteen Workshop experiments. The index shows difficulty, pace, and expected session length before launch. The current active-game layout targets terminals at least 80 columns by 28 rows; compact-layout work is in progress.

## Quick Start

```bash
# Play now — no install needed
npx @wyrcan/gamr

# Launch a specific active or archived game
npx @wyrcan/gamr snake

# Use a material edition
npx @wyrcan/gamr stack-trace --theme carbon
```

## Install

```bash
# Global install
npm install -g @wyrcan/gamr
gamr

# Or as a project dependency (for xterm.js integration)
npm install @wyrcan/gamr
```

Gamr is an ESM package and supports Node.js 22 or newer. The CLI performs a best-effort npm registry update check on startup; set `GAMR_DISABLE_UPDATE_CHECK=1` in offline, automated, or privacy-sensitive environments.

## CLI Usage

```bash
gamr                    # Interactive game menu
gamr <game>             # Launch a game directly
gamr --theme <theme>    # Set color theme
gamr --list             # List all games
gamr --archive          # List Arcade Archive games
gamr --help             # Show help
```

### Available Themes

The current editions are `carbon` (default), `paper`, `indigo`, `lichen`, and `contrast`. Older theme IDs remain accepted as compatibility aliases while the new semantic theme system rolls out.

## Library Usage (xterm.js)

```typescript
import { games, archiveGames, setTheme, runGame } from '@wyrcan/gamr';

// Set the color theme
setTheme('carbon');

// Run a game in an xterm.js Terminal instance
const controller = runGame('snake', terminal);

// Stop the game
controller?.stop();

// Browse all games
for (const game of games) {
  console.log(`${game.id}: ${game.name} - ${game.description}`);
}

// Compatibility collection, intentionally separate from the active catalog.
for (const game of archiveGames) {
  console.log(`archive/${game.id}: ${game.name}`);
}
```

### Automated Playtesting

Gamr includes a terminal-level playtesting harness. It drives games through the same keyboard path as a human, captures the ANSI screen, records milestones, and emits replayable action traces.

```typescript
import { runPlaytest } from '@wyrcan/gamr/playtest';

const report = await runPlaytest('dead-letter-department', { seed: 42 });
console.log(report.status, report.milestones, report.replay);
```

From a checkout, run one game with `node scripts/playtest.mjs dead-letter-department --seed=42` or run the complete catalog with `node scripts/playtest.mjs --all`. New games receive generic launch and interaction coverage automatically; deeper progression is added through a game-specific playtest profile.

### Themes

```typescript
import {
  themes,
  getTheme,
  getAnsiColor,
  getTerminalTheme,
  type PhosphorMode,
} from '@wyrcan/gamr/themes';

// Get a full xterm.js theme object
const xtermTheme = getTerminalTheme('carbon');
terminal.options.theme = xtermTheme;
```

## Games

The table below is a complete compatibility reference. The interactive index separates the active catalog from the Arcade Archive; use `gamr --list` for active games and `gamr --archive` for the nineteen classic games.

| Game | Description |
|------|-------------|
| Tetris | Stack the blocks |
| Snake | Eat and grow |
| 2048 | Slide and combine tiles |
| Runner | Jump and duck |
| Pong | Classic paddle game |
| Wordle | Guess the word |
| Minesweeper | Clear the mines |
| Hangman | Guess the word |
| Space Invaders | Defend Earth |
| Tower | Build a tower |
| Simon | Memory game |
| Frogger | Cross the road |
| Breakout | Break all the bricks |
| Asteroids | Shoot the rocks |
| Typing Test | Test your speed |
| Tron | Light cycle battle |
| Crack | Hack the system |
| Chopper | Deliver passengers |
| Hyper Fighter | Gem battle vs AI |
| Packet Panic | Route packets and stop the trace |
| Dead Letter Department | Inspect the mail and seal what answers back |
| Signal//Noise | Isolate transmissions, locate the source, choose your reply |
| Last Train Home | Dispatch evacuation trains through a collapsing rail network |
| Rogue Ledger | Draft rules and survive bizarre quarters |
| Containment Protocol | Learn the rules and hold the rooms |
| Five-Minute Kingdom | Draft a tiny kingdom where every square counts |
| Ghost Shift | Catch the intruder using cameras, door logs, and power |
| Stack Trace | Repair blocks and pass every test |
| The Quiet Heist | Predict patrols, steal the object, find a new exit |
| Market of Mirrors | Trade strange goods and sell the story |
| Blackout Grid | Restore the city and isolate faults |
| Orbital Post | Schedule the relay and outrun solar weather |
| Dice Tribunal | Roll the evidence and rewrite precedent |
| Time Capsule | Keep three truths and rewrite five minutes |
| Tiny Fleet | Seal orders, read the fog, outguess pirates |
| Night Frequency | Take calls, build the case, stay on air |
| Botany Lab | Grow strange plants and fill contracts |
| The 13th Lift | Program the route and do not stop at thirteen |
| Dungeon Courier | Read the parcel, choose a route, deliver it intact |

## Controls

- **Arrow keys** or **WASD** — Move / navigate
- **Enter** — Confirm / select
- **ESC** — Pause menu
- **Q** — Quit

### Dungeon Courier

- **Arrow keys / WASD** — Step; **Shift + direction** — Hurry
- **B** — Brace; **. / Space** — Wait; **E / Enter** — Interact
- **1–4** — Use satchel item; **I** — Inventory; **Tab** — Survey overlays

### Packet Panic

- **Arrow keys / WASD** — Move the network cursor

- **1–4** — Select Link, Bend, Split, or Firewall
- **Enter** — Place a router
- **R** — Rotate a router
- **X** — Salvage a router
- **F** — Purge infected routers
- **Space** — Focus mode / slow the network
- **ESC** — Pause

### Signal//Noise

- **Arrow keys / A,D** — Tune the carrier; **Up/Down** changes bandwidth
- **M / G / Tab** — Modulation, gain, and receiver station
- **S / Enter / N / P** — Sweep, capture, notch filter, phase-lock
- **1–4** — Select broadcast response after triangulating the source

### Last Train Home

- **Arrow keys / WASD** — Select a tile; **Tab** selects trains
- **1–4** — Switch, hold, repair, or clear
- **R** — Route the selected train; **Space** — Commit the turn
- **H** — Help; **ESC** — Pause

## About

Built by wyrcan.io.

These games are part of the gamr project, built for developers and terminal-puzzle players. Session length varies by game; the menu labels quick sessions and campaigns clearly.

## Contributing

Contributions welcome via pull requests. Add a new game, improve an existing one, or fix a bug.

## License

AGPL-3.0 — see [LICENSE](LICENSE) for details.
