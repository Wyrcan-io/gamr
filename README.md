# @abhirup/gamr

18 terminal games that run in any xterm.js terminal or directly in your CLI.

**Snake, Tetris, 2048, Pong, Asteroids, Space Invaders, Breakout, Frogger, Tron, Minesweeper, Wordle, Hangman, Simon, Runner, Tower, Typing Test, Crack, Chopper.**

Gamr is a collection of terminal games for developers. Play while your code ships.

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

## Controls

- **Arrow keys** or **WASD** — Move / navigate
- **Enter** — Confirm / select
- **ESC** — Pause menu
- **Q** — Quit

## About

Built by wyrcan.io.

These games are part of the gamr project, built for developers who enjoy quick arcade-style breaks in the terminal.

## Contributing

Contributions welcome via pull requests. Add a new game, improve an existing one, or fix a bug.

## License

AGPL-3.0 — see [LICENSE](LICENSE) for details.
