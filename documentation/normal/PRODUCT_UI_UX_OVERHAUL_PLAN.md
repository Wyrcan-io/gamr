# Gamr product, UI/UX, and production-readiness plan

**Audit date:** 2026-08-03  
**Repository:** `@wyrcan/gamr` on `master` at `1887140`  
**Scope:** CLI shell, xterm.js surface, theme API, active catalog, legacy catalog, interaction model, accessibility, experience testing, packaging, and release posture

## Executive decision

Gamr is a healthy **public beta package**, but it is not ready to call itself a finished production product or `1.0`.

The engineering base is substantially healthier than the experience:

- strict TypeScript, all 201 automated tests, the production build, and packed-package smoke test pass;
- `0.3.2` is published as npm `latest` and the latest CI run on `master` is green;
- the active catalog has 20 original games with unusually good premises;
- four games are marked Featured, two Beta, and fourteen Workshop;
- the shell, themes, transitions, and shared overlays still use a generic cyber/hacker vocabulary inherited from another product;
- most automated coverage proves engines, not complete player journeys, layouts, accessibility, or controller cleanup.

The next milestone should **not** add another game. It should replace the product identity and prove the replacement across the launcher and four Featured games before rolling it through the other sixteen.

The recommended product shape is:

1. **Featured** — four deliberately finished games on the first screen.
2. **Full collection** — all 20 active games, with Beta and Workshop labels that set an honest support expectation.
3. **Arcade Archive** — 19 legacy games behind a separate entry, still directly launchable for compatibility.
4. **Themes as a small semantic system** — five original, accessible editions instead of 26 pop-culture costumes.
5. **One shell, twenty visual languages** — consistent navigation and accessibility, but game-specific interfaces derived from each game’s fiction and mechanics.

The design north star is:

> **Gamr is a playable index of small machines. Every game exposes a different system; every action leaves readable evidence.**

This keeps the strongest existing product promise—visible systems and understandable failure—without the borrowed cyberpunk presentation.

## Implementation status

The first V2 slice has now landed in the working tree while this plan is being executed:

- the new `g/ index` launcher replaces the two-column game grid;
- Home, All, Workshop, Arcade Archive, Appearance, and Help routes exist;
- the Archive route exposes all 19 compatibility games without mixing them into Featured;
- `gamr --archive` lists the compatibility collection;
- five semantic editions (`carbon`, `paper`, `indigo`, `lichen`, `contrast`) exist alongside compatibility theme IDs;
- cell-aware width, clipping, padding, and wrapping helpers protect launcher layout;
- focused launcher, theme, and terminal-width tests were added;
- Stack Trace now has the first game-specific “code gutter + test ledger” renderer at the 80×24 target;
- direct game IDs and old theme IDs remain compatible.

This is foundation work, not the completed twenty-game overhaul. Existing game renderers still need migration to semantic tokens, game-specific visual languages, and the full accessibility/frame matrix described below.

## Repository snapshot

### Catalog and package

| Measure | Current state |
|---|---:|
| Active games | 20 |
| Featured / Beta / Workshop | 4 / 2 / 14 |
| Legacy games | **19**, not 18 |
| Total callable games in `allGames` | 39 |
| Theme IDs | 31 total — 5 current editions plus 26 compatibility IDs |
| Active game TypeScript | about 998 KiB / 14,038 lines |
| Legacy game TypeScript | about 640 KiB / 17,230 lines |
| Built CLI/library JavaScript | about 1.36 MiB each before source maps |

All 39 games are directly imported into the public registry. Hiding the legacy entries from the menu does not remove their bundle cost, exported API, or compatibility burden.

### Verification performed for this audit

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | Pass — 35 files, 201 tests |
| `npm run build` | Pass |
| `npm run pack:smoke` | Pass — packed, installed, imported, and invoked CLI |
| npm registry | `0.3.2` is `latest` |
| Latest `master` CI run | Pass at `1887140` |
| Public tags | `v0.3.2`, `v0.3.1` |
| Public GitHub releases | None |

The public release chain is much better than it was at `0.3.0`, but it remains incomplete: `v0.3.0` is missing, there are no GitHub Release records, and repository settings such as branch protection, release-environment reviewers, trusted-publisher configuration, and vulnerability reporting cannot be proven from the working tree.

### What the tests actually cover

The suite has solid deterministic engine coverage. It does not yet provide equivalent confidence in the experience layer:

- only three active games have a dedicated renderer test file;
- most renderer tests check for a heading or resize message, not overflow, alignment, contrast, or every phase;
- there is no catalog-wide 80-column/row-boundary assertion;
- there is no automated dark/light/monochrome matrix;
- there is no fake-terminal journey covering menu → game → pause → restart → menu → quit;
- there is no timer/listener/cursor/alternate-buffer soak test across all controllers;
- there is no committed usability evidence from first-time players.

This is why green tests support a beta verdict, not a finished-product verdict.

## Current experience findings

### What is already strong

- The active games have original, marketable premises. Dead Letter Department, Signal//Noise, The Quiet Heist, Night Frequency, The 13th Lift, and Stack Trace are particularly easy to pitch.
- Pure engines and authored content files give many games a good base for safe UI work.
- The catalog already has maturity, pace, difficulty, and session metadata.
- Every active game has a terminal-size guard; nineteen target 80×28 and The 13th Lift targets 80×24.
- Preview/commit/result loops appear in several games and fit the product promise well.
- Alternate-buffer helpers, CI, package smoke testing, and a guarded publish workflow now exist.

### 1. The shared identity is borrowed and over-specified

The current common language includes:

- themes named Cyberpunk, Fallout, Matrix, Blade Runner, Tron, Synthwave, and Kawaii;
- randomized “hacker” boot messages, glitch characters, scan lines, loading bars, and fake security/uplink copy;
- a large block-art launcher title, double-line boxes, reverse-video selection, and a bright “Vibe Code” banner;
- old `hypersurge:*` event names and comments referring to “Easter Egg Games”;
- the same centered pause menu and title-glitch pattern across unrelated games.

These choices do not arise from Gamr’s best games. A supernatural mail room, a kingdom draft, an elevator mystery, and a botany lab should not all boot through the same fake network intrusion.

### 2. The theme collection is wider than it is deep

The theme API exposes background, primary, secondary, glow, status-bar, and foreground values, but the CLI games mainly receive one ANSI accent from `getCurrentThemeColor()`. Many screens then hard-code red, yellow, green, cyan, reverse video, and faint text.

Consequences:

- twenty-six advertised themes often behave like accent swaps rather than complete themes;
- `secondary`, glow values, and several surface values do not meaningfully reach game renderers;
- the Node CLI cannot reproduce the CSS/xterm appearance promised by the theme record;
- invalid `--theme` values are cast to the theme type and silently fall back to green;
- theme selection is not available in the main interactive shell and is not persisted;
- light-theme correctness relies partly on escape-sequence rewriting instead of semantic rendering;
- emoji theme icons are unsafe for predictable terminal width.

The project should have fewer themes with stronger contracts.

### 3. Consistency currently means sameness

Shared behavior is good: Escape should pause, arrows should navigate, Enter should confirm, and quit should restore the terminal. Shared art direction is not automatically good.

Today, boxes, all-caps headings, dim text, colored warnings, centered overlays, and glitch titles dominate the collection. This makes authored games look as though they came from one generator. The mechanics differ; the visual grammar often does not.

The redesign should standardize **interaction contracts and semantic tokens**, while letting each game own its map, meters, marks, panels, and transitions.

### 4. The launcher is a catalog dump, not a front door

The launcher puts twenty two-line entries into one scrolling one- or two-column box. It has several problems:

- Featured, Beta, and Workshop games are visually mixed instead of curated;
- descriptions and maturity metadata compete inside a 38-column card;
- numeric shortcuts stop at nine but remain part of every row’s visual structure;
- the two-column reading order is less natural than one list plus detail view;
- there is no filtering by pace, session, difficulty, status, or recent play;
- the selected game gets no meaningful preview, control summary, or minimum-size warning;
- the “Vibe Code Your Own Game” call to action competes with the act of playing.

The developer hub belongs in a secondary command or Tools area, not the primary play surface.

### 5. The catalog asks for too much learning at once

Fourteen of twenty active games are correctly labeled Workshop. Many games expose seven to twelve keys before the player has experienced the core verb. Several “tutorial” modes are a different heading over nearly the same scenario rather than staged instruction.

The collection is difficult in a repetitive way: dense panel, many controls, multiple resources, and a manual before intuition. Complexity is welcome when the player opts into it; unstaged complexity is not.

### 6. Layout and accessibility are declared, not proven

The nominal contract is mostly 80×28, even though 80×24 remains a common terminal size. Earlier review found normal screens extending beyond column 80 in several games. The current tests do not prove that those issues are resolved across every phase.

Other gaps:

- color is still important to some protocol, warning, and selection states;
- faint text and reverse video are fragile on light backgrounds;
- there is no reduced-motion setting despite frequent 20 FPS loops and random glitching;
- Unicode width is handled with JavaScript string length in many places;
- ASCII fallbacks are a guideline, not an enforced capability mode;
- screen-reader/log-friendly output is not a defined mode;
- Help, pause, game-over, victory, upgrade, report, and resize states are not all snapshot-tested.

### 7. “Legacy” is hidden but still supported accidentally

The repository currently has 19 legacy games. They are:

- absent from the interactive menu and `--list`;
- included in `allGames`;
- callable by direct CLI ID;
- individually exported from the root package;
- listed beside active games in the README;
- bundled into the same CLI and library output;
- mostly outside the active test and support standard.

That is not a clear product contract. Users can launch them, so failures still look like Gamr failures.

## New product direction: the Small Machines Index

This is a design decision, not final marketing copy. It gives implementation a coherent test:

> Does this screen feel like a useful index or a specific working instrument, or does it feel like generic terminal decoration?

### Shared shell: editorial, quiet, functional

Use a small `g/` mark, one-line masthead, list typography, whitespace, rules, and precise annotations. Avoid a giant logo and avoid invented lore.

The launcher becomes one list with a live detail pane:

```text
g/ index                                      Carbon  20:14
──────────────────────────────────────────────────────────────
FEATURED                         STACK TRACE
› Stack Trace                    Repair a program by moving
  Five-Minute Kingdom            visible blocks through tests.
  Dead Letter Department
  Packet Panic                   turn-based · medium · 10–15 min

CONTINUE                         core keys  arrows  enter  u  r
  Last Train Home · scenario 2   minimum    80×24

──────────────────────────────────────────────────────────────
[A] all  [W] workshop  [X] arcade archive  [T] appearance  [?]
```

At narrow widths, the detail pane becomes three lines below the selected entry. At wide widths, it remains on the right. Reading order stays top-to-bottom in both layouts.

### Information architecture

1. **Home**
   - Featured four.
   - Continue/recently played when local state exists.
   - One quiet link each to All, Workshop, Archive, Appearance, and Help.
2. **All games**
   - Twenty active entries.
   - Filters for pace, difficulty, session, and maturity.
   - Search by `/` only if it can be implemented without making navigation worse.
3. **Workshop**
   - Fourteen experiments with a short, honest label: “Playable; rules and balance may change.”
4. **Arcade Archive**
   - Nineteen classic games.
   - Explicit note: “Compatibility collection. Maintained for direct play; not part of the active design standard.”
5. **Appearance**
   - Theme preview using real semantic states, not color swatches alone.
   - Motion, Unicode/ASCII, and contrast controls.

### Navigation contract

- Arrows or `j/k`: move in lists.
- Enter: activate the focused action.
- Escape: close the current layer; pause during play; return one level in the shell.
- `?`: contextual help everywhere.
- `q`: quit only when the current screen makes quitting unambiguous.
- Tab: cycle major panels only in games that visibly label those panels.
- Commands shown on screen must work in that exact phase.
- Shortcuts must never collide inside one phase.

The footer shows only commands available **now**. A full key map belongs in Help.

### Motion contract

- Default transitions last no more than 120 ms.
- A transition explains navigation: a rule slides, a selection stamps, a panel unfolds, or a game-specific instrument activates.
- No randomized corruption, fake loading, full-screen flash, or time-wasting progress bar.
- Reduced motion uses an immediate redraw.
- Turn-based games animate only the consequence of a committed action.
- Real-time games keep effect density proportional to information value.

## Theme system V2

### Principle

A theme is an accessibility-tested material system, not a pop-culture costume. Game identity must come from layout, symbols, copy, and state change—not from calling a palette “Matrix.”

### Semantic token contract

Replace the primary-color-only game interface with tokens such as:

```ts
interface UiTheme {
  id: string;
  appearance: 'dark' | 'light';
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  focus: string;
  good: string;
  warning: string;
  danger: string;
  data: readonly [string, string, string, string];
}
```

Renderers request meaning—`focus`, `warning`, `data[1]`—rather than raw cyan, yellow, or ANSI 96.

### Initial editions

Ship five, then stop until evidence justifies another:

| ID | Role | Direction |
|---|---|---|
| `carbon` | Default dark | Warm black, bone ink, rust focus; low glare |
| `paper` | Default light | Warm paper, near-black ink, vermilion focus |
| `indigo` | Cool dark | Deep blue-black, chalk ink, apricot focus |
| `lichen` | Soft dark | Charcoal-green, pale mineral ink, amber focus |
| `contrast` | Accessibility | Black/white with shape-first status markers |

These are working, descriptive names. They should receive a human naming and contrast review before release; they should not acquire invented backstories.

### Appearance is more than theme

Store these independently:

- color edition;
- motion: full or reduced;
- glyph mode: Unicode or ASCII-safe;
- density: comfortable or compact, only where layouts support both.

### Compatibility migration

1. Introduce `ThemeId` and `UiTheme` without immediately deleting `PhosphorMode`.
2. Map old IDs to the closest V2 edition for one deprecation window.
3. Hide old IDs from interactive selection and documentation.
4. Validate `--theme`; print valid IDs and exit non-zero on an unknown value.
5. Persist the selected appearance in the platform config directory.
6. Let xterm hosts opt into transparency explicitly; do not silently claim a background that remains transparent.
7. Remove the legacy aliases at the next declared breaking release.

### Theme acceptance tests

- contrast checks for ink, muted, focus, good, warning, and danger on every declared surface;
- all launcher and game snapshots in `carbon`, `paper`, and `contrast`;
- status remains understandable after stripping ANSI;
- no important state uses color as its only distinction;
- no emoji or ambiguous-width glyph is required;
- invalid theme IDs fail clearly in CLI and library APIs.

## Shared UI architecture

Create a small UI kernel before restyling twenty games.

### Renderer primitives

- cell-aware `Canvas` or line buffer with bounds checking;
- `displayWidth`, `clip`, `wrap`, and `truncate` based on terminal cell width;
- horizontal rule, label, list, meter, table, toast, and overlay primitives;
- layout breakpoints for compact, standard, and wide terminals;
- semantic styles resolved through `UiTheme`;
- one glyph registry with Unicode and ASCII pairs;
- deterministic frames: render output must not depend on `Math.random()`.

Do not create a giant component framework. The kernel should solve width, layout, semantics, and accessibility. Game-specific composition remains local to each game.

### Session/controller shell

One owner should manage:

- alternate-buffer entry and exit;
- cursor visibility and SGR reset;
- input listeners and resize listeners;
- intervals, animation frames, and timeouts;
- pause, restart, game list, next game, and quit transitions;
- idempotent stop and error recovery;
- current game metadata and local settings.

Games provide state, update logic, render logic, and their key map. They should not each reimplement terminal ownership.

### Catalog schema

Extend `GameInfo` with explicit product data:

```ts
interface GameInfo {
  id: string;
  name: string;
  description: string;
  status: 'featured' | 'beta' | 'workshop' | 'archive';
  pace: 'real-time' | 'turn-based';
  difficulty: 1 | 2 | 3;
  session: '5 min' | '10–15 min' | 'campaign';
  minimum: { cols: number; rows: number };
  tags: string[];
  controls: ControlDefinition[];
  glyph: { unicode: string; ascii: string };
}
```

The launcher, Help, CLI `--list`, README generation, and tests should all read the same metadata.

## The twenty-game overhaul

The shared shell should be recognizable, but every game needs an interface derived from its own activity. The “signature” column is the visual system to preserve across briefing, play, pause, result, and ending screens.

| Game | Signature interface | UX focus | Rollout |
|---|---|---|---|
| **Stack Trace** | Code gutter, block tape, stack trace, test ledger | Guide the first edit; make run/failure diffs immediate; keep editor and tests visible without generic boxes | Pilot |
| **Five-Minute Kingdom** | Cadastral map with a seasonal margin ledger | Make placement preview the hero; reduce starting rules; explain final score in human ranks | Pilot |
| **Dead Letter Department** | Sorting desk, envelope face, regulation slips, rubber-stamp decisions | Short guided induction; remove or implement inert perks; segment the campaign into satisfying shifts | Pilot |
| **Packet Panic** | Network topology and oscilloscope-like traffic lanes | Teach Link/Bend/destination before advanced tools; protocol shapes must work without color | Pilot |
| **Signal//Noise** | Receiver scale, waveform, station strip, bearing plot | Stage tuner controls case by case; point to the next useful dimension after a failed lock | Beta pass |
| **Last Train Home** | Railway diagram, timetable ribbon, hazard forecast | Create a real three-turn tutorial; simplify route/switch overlap; make scenario progression explicit | Beta pass |
| **Market of Mirrors** | Auction tape, inventory shelf, rumor broadsheet | Reduce the always-visible command surface; show cause from claim → faction belief → closing quote | Batch A |
| **Rogue Ledger** | Accounting columns with red-pencil annotations | Rebuild treatments around real trade-offs; shorten the default run; preview liabilities in the same row | Batch A |
| **Ghost Shift** | CCTV quad and chronological evidence tape | Make contradiction chains, not candidate elimination, the central display; rebuild evidence before polish | Batch A |
| **Dice Tribunal** | Court docket, dice rack, precedent margin | Teach one hearing loop before modifiers; distinguish dice by pip/label as well as color | Batch A |
| **Time Capsule** | Before/after timeline diff with pinned truths | Make causal changes traceable; separate immutable anchors from editable events by shape and position | Batch A |
| **Night Frequency** | Call board, transcript strip, evidence pins, broadcast queue | Reveal controls with the show phases; make every programming choice cite the evidence it uses | Batch A |
| **Blackout Grid** | Electrical one-line diagram with breaker and load flow | Stage grid concepts; use arrows/patterns for energized, isolated, overloaded, and failed states | Batch B |
| **Containment Protocol** | Four-room cross-section with environmental bands | Cut or delay inert systems; keep configure → forecast → commit order visually stable | Batch B |
| **Orbital Post** | Orbit-window timeline and relay lanes | Center scheduling conflicts instead of panel count; make solar weather readable before commitment | Batch B |
| **Botany Lab** | Greenhouse bench, plant silhouettes, chamber tracks, contract clipboard | Make growth changes visible cycle to cycle; introduce lab controls only when a contract requires them | Batch B |
| **The Quiet Heist** | Architectural plan with current and forecast sight layers | Clearly separate “now” from “after commit”; remove decorative affordances until they are interactive | Batch C |
| **Tiny Fleet** | Plotting table with grease-pencil contacts and sealed order chits | Show uncertainty honestly; give a complete pre-commit order summary and readable resolution replay | Batch C |
| **Dungeon Courier** | Parcel label, route map, satchel manifest | Keep parcel condition and route risk causal; replace the permanent control wall with contextual verbs | Batch C |
| **The 13th Lift** | Elevator annunciator, button matrix, passenger manifest, route tape | Preserve its restrained light-theme work; clarify clue source time and the two-stage route commit | Batch C |

### Cross-game experience rules

Every active game must satisfy these rules before its status can be promoted:

1. One core verb is experienced within 60 seconds.
2. No more than five gameplay controls are introduced initially.
3. Every visible command works in the current phase.
4. Preview and commit are visually distinct when an action has a delayed or costly consequence.
5. Failure names the visible rule and the player action that triggered it.
6. The default unit fits its advertised session length.
7. Campaigns either save between units or make each unit independently satisfying.
8. Help fits one 80×24 screen or is split into short contextual pages.
9. Pause and result screens use the game’s signature interface, not a pasted generic theme.
10. All states remain understandable in `contrast`, reduced-motion, and ASCII-safe modes.

## Decision on the legacy games

### Yes: include them, under a separate Archive entry

The count is 19. The user-facing name should be **Arcade Archive**, not “Legacy 19” and not “More games.” This makes the distinction intentional rather than apologetic.

The root shell should show one quiet row or footer action:

```text
[X] Arcade Archive · 19 classics · compatibility collection
```

Inside the Archive:

- list the nineteen games with simple pace/control metadata;
- state the support boundary once, plainly;
- allow search/direct launch;
- use the new shell and terminal lifecycle, but preserve the games themselves initially;
- do not show them in Featured, random active-game selection, or active `--list` output;
- add `gamr --archive` and an `archiveGames` export.

### Do not redesign all nineteen in this cycle

The requested overhaul already covers twenty active games. Restyling nineteen classic clones would dilute the original collection and delay the identity change.

If an archived game deserves promotion later, rebuild it as an original Gamr interpretation with a clear design pitch. Do not promote it because it received a new border and palette.

### Compatibility and bundle plan

1. **Now:** preserve direct IDs, individual runners, and `allGames` to avoid an unannounced API break.
2. **UI V2 release:** add `activeGames` and `archiveGames`; move archive discovery behind its own shell route.
3. **Next breaking release:** move archive runners to `@wyrcan/gamr/archive` and load them lazily in the CLI.
4. **After usage review:** decide whether root-level individual legacy exports remain deprecated aliases or are removed.

This reduces the default bundle and makes the support promise enforceable without deleting source.

## Production-readiness verdict

### Status by area

| Area | Verdict | Reason |
|---|---|---|
| Package installation | Ready | Packed install, root import, executable shim, and help smoke pass |
| Compile/test/build | Ready | Typecheck, 201 tests, and production build pass |
| CI on `master` | Ready | Latest public push runs are green across the configured matrix |
| Release traceability | Needs work | npm `0.3.2` and tag exist; no GitHub Releases and no historical `v0.3.0` tag |
| CLI lifecycle | Beta | Helpers exist, but catalog-wide transition/soak coverage does not |
| Product positioning | Not ready | Current identity is derivative and conflicts with the original games |
| Launcher UX | Not ready | Twenty-item dump, weak curation, no preview/filter/archive route |
| Theme system | Not ready | Too many costume names; semantics do not reach renderers consistently |
| Active games | Beta/workshop | Only four Featured; onboarding and density remain inconsistent |
| Accessibility | Not ready | No enforced contrast, reduced-motion, ASCII, or color-independent gate |
| Experience evidence | Not ready | No first-time-player study or full-journey acceptance suite |

### Release recommendation

- Keep `0.x` labeled public beta.
- Do not market the current UI as final or promote the package to `1.0`.
- A UI V2 beta can ship once the shell, theme system, Archive, and four pilot games pass the new acceptance gates.
- A `1.0` candidate should wait until Featured is proven, Beta is honestly separated, Workshop and Archive have clear contracts, and the lifecycle/accessibility matrices are automated.

## Implementation roadmap

### Phase 0 — freeze and baseline

**Goal:** stop visual drift before writing new UI.

- Freeze new games and new mechanics.
- Capture representative frames for every active game: start, play, help, pause, failure, victory, and one game-specific overlay.
- Record current overflow and control conflicts at 80×24, 80×28, and 100×30.
- Lock the Small Machines direction, the five theme editions, and the anti-slop rules with one human design review.
- Turn this document into tracked issues grouped by phase and game.

**Exit:** the team can compare V1 and V2 against the same frame and behavior set.

### Phase 1 — UI kernel and lifecycle

**Goal:** create the infrastructure that prevents twenty bespoke bugs.

- Add cell-aware rendering, semantic theme tokens, glyph fallbacks, bounds assertions, and layout breakpoints.
- Add one session/controller owner and migrate the shared pause/restart/menu/quit flow.
- Add catalog-driven controls, minimum sizes, statuses, and tags.
- Add deterministic render snapshots and fake-terminal lifecycle tests.
- Add feature flags so V1 remains playable while V2 is built.

**Exit:** a sample screen renders correctly in Carbon, Paper, Contrast, Unicode, ASCII, full motion, and reduced motion; repeated start/stop leaves no listeners, timers, cursor, or buffer state behind.

### Phase 2 — launcher, appearance, and Archive

**Goal:** make the first thirty seconds unmistakably Gamr.

- Replace `gamesMenu.ts` with Home, All, Workshop, Archive, Appearance, and Help routes.
- Replace generic hacker transitions with short editorial navigation and game-owned entry cues.
- Move Vibe/Create into Tools or keep it as an explicit CLI command.
- Validate and persist appearance settings.
- Add `archiveGames` and `--archive` without breaking direct legacy launches.

**Exit:** a first-time player can select a suitable game by maturity, difficulty, pace, and session length without opening external documentation.

### Phase 3 — four-game pilot

**Goal:** prove the system across four different interaction types.

Order:

1. Stack Trace — editor/puzzle.
2. Five-Minute Kingdom — calm spatial drafting.
3. Dead Letter Department — document/narrative classification.
4. Packet Panic — real-time network management.

For each game:

- make one annotated low-fidelity terminal wireframe before code;
- assign a semantic glyph vocabulary with ASCII fallbacks;
- stage the first minute;
- implement compact/standard layouts;
- snapshot all phases in three themes;
- run at least five first-time-player sessions before promotion.

**Exit:** all four meet the Featured definition of done below.

### Phase 4 — two Beta games

- Rework Signal//Noise around progressive receiver controls.
- Rework Last Train Home around a true tutorial, readable forecast, and reachable scenario flow.

**Exit:** each has a legal full-content transcript and can be completed by a new player without verbal instruction.

### Phase 5 — fourteen Workshop games in three batches

- **Batch A — evidence and documents:** Market of Mirrors, Rogue Ledger, Ghost Shift, Dice Tribunal, Time Capsule, Night Frequency.
- **Batch B — systems and instruments:** Blackout Grid, Containment Protocol, Orbital Post, Botany Lab.
- **Batch C — maps and routes:** The Quiet Heist, Tiny Fleet, Dungeon Courier, The 13th Lift.

Do not promote an entire batch together. A game moves from Workshop only when its own mechanics and UX pass.

### Phase 6 — production candidate

- Run cross-platform terminal coverage on Windows Terminal, iTerm2, kitty/WezTerm, and a basic ANSI terminal.
- Verify Node 22 and 24 in actual interactive sessions.
- Add GitHub Releases and historical traceability where source can be verified.
- Confirm branch protection, trusted publishing, release environment, private vulnerability reporting, and credential scope.
- Update README from catalog metadata and add short recordings of the four Featured games.
- Publish a release candidate, collect issue data, then decide on `1.0`.

## Experience test plan

### Automated frame matrix

For every active game, render:

- start/briefing;
- first playable turn/tick;
- help;
- pause;
- preview/commit when applicable;
- warning/danger;
- report/upgrade/interlude when applicable;
- game over;
- victory/ending;
- resize fallback.

Test at:

- 80×24 target;
- 80×28 compatibility;
- 100×30 wide;
- Carbon, Paper, and Contrast;
- Unicode and ASCII-safe glyphs;
- ANSI-stripped monochrome.

Assertions should include:

- no write outside terminal bounds;
- no line wider than the target;
- no ambiguous-width required glyph;
- current controls fit and match the input map;
- all critical statuses contain a non-color marker;
- repeated rendering is deterministic for the same state.

### Interaction transcripts

Each Featured and Beta game needs at least:

- one tutorial completion;
- one normal victory or successful unit;
- one intentional failure with the expected explanation;
- pause/resume;
- restart;
- game list and next game;
- quit and direct relaunch;
- resize during play;
- repeated controller start/stop under fake timers.

### Human playtests

Use five to eight people who have not read implementation plans. Do not explain the controls verbally. Record:

- time to first meaningful action;
- time to first understood success;
- first point of confusion;
- controls pressed that were not shown or did not work;
- whether the player can explain a failure;
- whether session-length expectation matched reality;
- one moment of delight and one moment of friction;
- whether the game’s screen looked authored for its premise.

Repeated confusion from three players is a release issue, not a tutorial-copy preference.

## Anti-slop craft rules

These are release constraints.

### Do

- derive the interface from the game’s central activity;
- use whitespace and alignment before borders;
- write sentence-case, specific copy;
- keep one distinctive mark per game and use it consistently;
- animate a cause or consequence, not empty atmosphere;
- show the player where a number came from;
- use real domain language only when the interaction teaches it;
- review every final screen manually at actual terminal size.

### Do not

- use generic glitch, scan-line, matrix rain, fake boot, or “access granted” effects;
- add a centered ASCII logo to every screen;
- fill every region with double-line boxes;
- use all caps as the default voice;
- use emoji as layout-critical icons;
- invent lore to explain navigation;
- add decorative meters, logs, or data that do not affect a decision;
- expose every advanced key in the first frame;
- solve a weak interaction with more prose;
- rename a borrowed pattern and call it original.

### Human review questions

Before merging a visual pass, ask:

1. Could this screen belong to any other game in the collection?
2. Does every decorated element communicate state, affordance, or hierarchy?
3. Can a player identify the next useful action in three seconds?
4. Does the copy sound written for this situation rather than generated from a genre prompt?
5. Does the screen still work with no color and no animation?

If the first answer is yes or any later answer is no, the pass is incomplete.

## Featured definition of done

A game may be Featured only when:

- its first meaningful action occurs within 60 seconds;
- a new player can complete the first unit without external help;
- every displayed system and mode has real behavior and tests;
- all advertised controls work and no phase has shortcut collisions;
- all required frames fit 80×24 or the catalog honestly declares a larger minimum;
- Carbon, Paper, Contrast, reduced motion, and ASCII-safe modes pass;
- failure and score are causal and inspectable;
- campaign/session behavior matches the menu label;
- controller lifecycle and error recovery pass the shared harness;
- a full successful transcript exists;
- five first-time-player sessions reveal no repeated release-blocking confusion;
- README/catalog/help text are generated from or checked against the same metadata.

## Immediate next actions

Do these next, in order:

1. Freeze new games and mechanics.
2. Approve or revise the Small Machines Index direction; do not start with colors alone.
3. Open a UI V2 workstream behind a feature flag.
4. Implement cell-aware rendering, semantic theme tokens, and the shared session owner.
5. Prototype the new launcher plus Stack Trace and Packet Panic. These two prove both turn-based/editor and real-time/topology extremes.
6. Test that prototype with five new players.
7. Adjust the design system from observation, then complete the four Featured games.
8. Only then begin the remaining sixteen active-game passes.

The first implementation PR should touch the UI kernel and a disposable launcher prototype—not all twenty renderers. A successful overhaul will come from one strong system and repeated human review, not twenty parallel reskins.

## Likely file-level work

| Area | Current file(s) | Direction |
|---|---|---|
| Theme API | `src/themes/index.ts`, `src/games/utils.ts` | Semantic V2 tokens, five editions, validation, compatibility aliases |
| Launcher | `src/games/gamesMenu.ts` | Replace with routed index/list/detail/archive/appearance shell |
| Transitions | `src/games/gameTransitions.ts` | Remove hacker effects; use short shell and game-owned cues |
| Catalog | `src/games/index.ts`, `src/games/archived.ts` | Canonical metadata, `activeGames`, `archiveGames`, minimums, controls, tags |
| Shared menus | `src/games/shared/menu.ts` | Keep input contract; replace universal visual treatment with overlay primitives |
| Lifecycle | `src/cli.ts`, game controllers | One session owner and fake-terminal integration harness |
| UI kernel | new `src/ui/*` | Canvas, width, layout, theme resolver, glyphs, input map, overlays |
| CLI | `src/cli.ts` | Theme validation/persistence, archive command, generated list/help |
| Tests | new UI/lifecycle/catalog tests | Frame matrix, bounds, contrast, transcripts, soak tests |
| Documentation | `README.md`, game docs | Generate catalog tables, clarify support levels, add recordings |

## Final answer

Gamr has enough games and enough engineering to be a credible public beta. It does not yet have a finished product identity or a consistent production experience.

The right next move is a controlled redesign:

- quiet editorial shell;
- five semantic themes;
- game-specific instrument interfaces;
- four genuinely finished Featured games;
- two honest Betas;
- fourteen visible but separated Workshop games;
- nineteen classics in an explicit Arcade Archive;
- lifecycle, layout, accessibility, and first-time-player evidence as release gates.

That is a more original and defensible product than another cyberpunk terminal arcade, and it gives every future design decision a clear standard.
