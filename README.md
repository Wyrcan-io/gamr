# @wyrcan/gamr

Gamr is a curated anthology of terminal games that run in any xterm.js terminal or directly in your CLI.

> `0.4.0-beta.1` is a public beta. Install it explicitly with `npm install -g @wyrcan/gamr@beta`. Automated cross-platform lifecycle, rendering, package, and security gates are enforced; independent human terminal and accessibility validation is still in progress.

The lineup contains twenty original games. The former compatibility archive has been retired so the package, launcher, and support promise all describe the same catalog.

Small, stylish terminal games where every system is visible and every failure can be understood.

The TUI catalog has four Featured placements, two previews, and fourteen Workshop experiments. Featured describes catalog placement, not independent production sign-off. The index shows readiness, difficulty, pace, and expected session length before launch. The current active-game layout supports terminals at least 80 columns by 24 rows; the launcher supports 60 columns by 20 rows.

## Quick Start

```bash
# Play now — no install needed
npx @wyrcan/gamr

# Launch a specific game
npx @wyrcan/gamr stack-trace

# Use a material edition
npx @wyrcan/gamr stack-trace --theme carbon
```

## Install

```bash
# Global install
npm install -g @wyrcan/gamr
gamr

# Public beta channel
npm install -g @wyrcan/gamr@beta

# Or as a project dependency (for xterm.js integration)
npm install @wyrcan/gamr
```

Gamr is an ESM package and supports Node.js 22 or newer. Informational commands never perform a network update check. Interactive launches show any cached notice immediately and refresh the cache in the background; failed checks back off for one hour. Set `GAMR_DISABLE_UPDATE_CHECK=1` in offline, automated, or privacy-sensitive environments.

## CLI Usage

```bash
gamr                    # Interactive game menu
gamr <game>             # Launch a game directly
gamr --theme <theme>    # Set color theme
gamr --reduced-motion   # Disable animated transitions and optional effects
gamr --list             # List all games
gamr --help             # Show help
```

### Available Themes

The current editions are `carbon` (default), `paper`, `indigo`, `lichen`, and `contrast`. Older theme IDs remain accepted as compatibility aliases while the new semantic theme system rolls out.

### Terminal and accessibility contract

- Interactive games require at least `80x24`; the launcher requires `60x20`.
- Output is UTF-8 and uses box-drawing and symbol glyphs. Use a terminal font with those glyphs; an ASCII-only mode is not currently claimed.
- Set a non-empty [`NO_COLOR`](https://no-color.org/) value to suppress ANSI color and style sequences in the CLI.
- Use `--reduced-motion` or `GAMR_REDUCED_MOTION=1` to skip shared animated transitions, particles, flashes, and shake effects.
- Statuses include textual or shape markers in addition to color. Full screen-reader support is not currently claimed because interactive games use cursor positioning and the alternate screen.

## Library Usage (xterm.js)

```typescript
import { games, setReducedMotion, setTheme, runGame } from '@wyrcan/gamr';

// Set the color theme
setTheme('carbon');
setReducedMotion(true); // Optional application-level accessibility preference

// Run a game in an xterm.js Terminal instance
const controller = runGame('stack-trace', terminal);

// Stop the game
controller?.stop();

// Browse all games
for (const game of games) {
  console.log(`${game.id}: ${game.name} - ${game.description}`);
}

```

### Automated Playtesting

Gamr includes a terminal-level playtesting harness. It drives games through the same keyboard path as a human, captures the ANSI screen, records milestones, and emits replayable action traces.

```typescript
import { runPlaytest } from '@wyrcan/gamr/playtest';

const report = await runPlaytest('dead-letter-department', { seed: 42 });
console.log(report.status, report.milestones, report.replay);
```

From a checkout, run one game with `node scripts/playtest.mjs dead-letter-department --seed=42`, run a tier with `node scripts/playtest.mjs --suite=progression`, or inspect the catalog with `node scripts/playtest.mjs --coverage-report`. New games receive generic launch and interaction coverage automatically; deeper progression is added through a game-specific playtest profile.

Gamr also exports `@wyrcan/gamr/playtestr-adapter`. It creates a stable external-process manifest and maps Gamr's existing milestones into Playtestr's structural adapter protocol without adding a Playtestr runtime dependency:

```ts
import { createGamrPlaytestrTarget } from '@wyrcan/gamr/playtestr-adapter';

const { manifest, adapter } = createGamrPlaytestrTarget('blackout-grid', {
  cliPath: '/path/to/gamr/dist/cli.js',
});
```

Gamr remains responsible for game-specific milestones and semantics; Playtestr remains the generic external autonomous engine.

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

The table below is the complete active catalog. Use `gamr --list` to print the same lineup from the CLI.

| Game | Description |
|------|-------------|
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
