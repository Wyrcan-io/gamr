# @abhirup/gamr

Gamr is a curated anthology of terminal games that run in any xterm.js terminal or directly in your CLI.

The current lineup contains ten original games. Older games remain available in the source tree while they are reworked.

Small, stylish terminal games where every system is visible and every failure can be understood.

The TUI catalog is curated by maturity: four Featured games, two public betas, and four Workshop experiments. Difficulty and expected session length are shown in the game menu.

## Quick Start

```bash
# Play now — no install needed
npx @abhirup/gamr

# Launch a specific game
npx @abhirup/gamr snake

# With a color theme
npx @abhirup/gamr tetris --theme green
```

## Install

```bash
# Global install
npm install -g @abhirup/gamr
gamr

# Or as a project dependency (for xterm.js integration)
npm install @abhirup/gamr
```

## CLI Usage

```bash
gamr                    # Interactive game menu
gamr <game>             # Launch a game directly
gamr --theme <theme>    # Set color theme
gamr --list             # List all games
gamr --help             # Show help
```

### Available Themes

`cyan` (default), `amber`, `green`, `white`, `hotpink`, `blood`, `ice`, `bladerunner`, `tron`, `kawaii`, `oled`, `solarized`, `nord`, `highcontrast`, `banana`, `cream`, and their light variants (e.g. `cyanLight`).

## Library Usage (xterm.js)

```typescript
import { games, setTheme, runGame } from '@abhirup/gamr';

// Set the color theme
setTheme('cyan');

// Run a game in an xterm.js Terminal instance
const controller = runGame('snake', terminal);

// Stop the game
controller?.stop();

// Browse all games
for (const game of games) {
  console.log(`${game.id}: ${game.name} - ${game.description}`);
}
```

### Themes

```typescript
import {
  themes,
  getTheme,
  getAnsiColor,
  getTerminalTheme,
  type PhosphorMode,
} from '@abhirup/gamr/themes';

// Get a full xterm.js theme object
const xtermTheme = getTerminalTheme('cyan');
terminal.options.theme = xtermTheme;
```

## Games

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
