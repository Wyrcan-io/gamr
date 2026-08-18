# Gamr compact-terminal layout implementation plan

**Created:** 2026-08-18  
**Catalog:** 20 active games  
**Compact gameplay target:** `80x24`  
**Standard reference:** `80x28`  
**Wide reference:** `100x30`  
**Launcher floor:** retain `60x20`  
**Outcome:** Every game remains playable, legible, and state-complete at the conventional `80x24` terminal size

## 1. Decision

Use `80x24` as the catalog-wide compact gameplay floor. Do not target widths below 80 in this program; dense maps, ledgers, and schedules need a stable horizontal contract. The launcher keeps its existing `60x20` floor and single-column compact composition.

Compact support means more than replacing a resize warning. At `80x24`, every required action, state distinction, warning, forecast, objective, and completion reason must remain reachable without changing game rules.

## 2. Source-verified baseline

| State | Games |
|---|---|
| Already accepts `80x24` | Stack Trace, The 13th Lift |
| Requires `80x28` | The other 18 active games |
| Launcher | Supports `60x20`; switches to compact composition below 76 columns |

The 18-game group includes every other Featured, Preview, and Workshop title. Several renderers use local minimum constants or inline resize checks, so the support floor is duplicated rather than defined by one shared contract.

## 3. Shared layout contract

Introduce or standardize shared layout definitions:

```text
launcher-minimum    60x20
gameplay-compact    80x24
gameplay-standard   80x28
gameplay-wide      100x30
```

Each renderer receives dimensions and chooses a composition tier. It must not resize typography, depend on browser font scaling, or mutate game state to fit the terminal.

At every tier:

- rendered display width never exceeds terminal columns;
- required frame height never silently exceeds terminal rows;
- ANSI sequences and wide Unicode glyphs are measured by terminal-cell width;
- current, selected, projected, committed, hidden, success, and failure states remain textually distinct;
- footer commands match the current controller phase;
- overlays close before pause according to controller precedence;
- resize preserves engine state, selection, scroll position where valid, timers, and seed;
- returning to a larger terminal restores the richer layout without restarting.

## 4. Compact composition rules

When four rows are removed from the current `80x28` design, use this order:

1. remove decorative blank rows and repeated mastheads;
2. shorten labels through tested vocabulary, not unexplained abbreviations;
3. merge static metadata into one status line;
4. collapse secondary panels into tabs or explicit overlays;
5. add scroll or continuation markers for logs and evidence lists;
6. keep objectives, danger, action consequence, and available controls visible;
7. never hide required state behind color alone;
8. never truncate a decisive failure or legality reason without a reachable detail view.

No card-within-card terminal composition is introduced. Dense games should read as one coherent instrument, board, ledger, map, or desk.

## 5. Phase 1: shared infrastructure

- Add shared exported constants or a layout-tier resolver.
- Consolidate cell-width clipping, padding, wrapping, and visible-height assertions in `src/ui/terminal.ts`.
- Add a renderer test helper that strips ANSI, computes display width, counts rows, and asserts required tokens.
- Add fake-terminal resize support that can move through `80x24 -> 100x30 -> 80x24` without restarting.
- Add playtest dimensions as explicit profile options and include dimensions in reports.
- Keep per-game composition in each renderer; shared helpers must not flatten distinct visual identities.

### Infrastructure gate

- [ ] Helpers handle ANSI, combining marks, and double-width glyphs.
- [ ] Compact overflow fails tests with the offending row and visible width.
- [ ] Resize tests prove no duplicate listeners, timers, or terminal writes after stop.
- [ ] Existing `80x28` and `100x30` snapshots remain understandable.

## 6. Phase 2: implementation cohorts

Use the established product cohorts so findings transfer without making all games look alike.

| Order | Cohort | Games | Primary compact risk |
|---:|---|---|---|
| 1 | Existing compact references | Stack Trace, The 13th Lift | Validate the target and shared test harness |
| 2 | Featured | Five-Minute Kingdom, Dead Letter Department, Packet Panic | Board plus preview, desk hierarchy, real-time topology |
| 3 | Preview | Signal//Noise, Last Train Home | Instrument density and route/timetable causality |
| 4 | Documents and evidence | Market of Mirrors, Rogue Ledger, Ghost Shift, Dice Tribunal, Time Capsule, Night Frequency | Logs, ledgers, evidence provenance, and long reports |
| 5 | Systems | Blackout Grid, Containment Protocol, Orbital Post, Botany Lab | Forecast density, topology, schedules, and shared-resource tracks |
| 6 | Maps and routes | The Quiet Heist, Tiny Fleet, Dungeon Courier | Map readability, hidden-state boundaries, and action detail |

Finish a cohort's renderer, controller, resize, theme, ASCII, and playtest matrix before starting the next cohort.

## 7. Per-game implementation packet

For each game:

1. inventory every phase, overlay, success, failure, help, pause, report, and ending frame;
2. capture current `80x28` and `100x30` baselines in Carbon and Contrast;
3. identify which four or more rows can be recovered without losing required facts;
4. implement the `80x24` composition and continuation behavior;
5. make resize immediate and state-preserving;
6. add Unicode and ASCII compact assertions;
7. add Carbon, Paper, and Contrast compact captures;
8. run the game-specific seeded-completion profile at `80x24`;
9. inspect the final screen and at least one dense intermediate screen;
10. record any intentional difference from the standard or wide composition.

## 8. Automated matrix

Every game must pass:

| Dimension | Modes | Required evidence |
|---|---|---|
| `80x24` | Carbon, Paper, Contrast | All phases fit; required state and controls visible |
| `80x24` | ASCII, Unicode | Equivalent mechanics and continuation cues |
| `80x28` | Carbon | No regression from current supported floor |
| `100x30` | Carbon | Wide composition uses space without stretching critical controls apart |
| Resize sequence | Carbon | State, seed, timers, selection, and overlay survive |
| Below floor | `79x24`, `80x23` | Clear resize frame with required dimensions; no simulation progression while blocked where relevant |

For real-time games, prove whether undersize state pauses or continues. The behavior must be consistent, documented, and tested; required decisions must not occur while their state is invisible.

## 9. Visual and interaction review

Review captures at native cell dimensions. Do not approve from reflowed proportional-font text.

Reject a frame when:

- controls, objective, danger, or forecast are clipped;
- two mechanical states differ only by color;
- a long word or wide glyph breaks a border;
- overlay content displaces an unrelated required status incoherently;
- scrolling exists without position or continuation feedback;
- a resize causes a turn, timer, seed, or selection change;
- the compact version becomes a generic text dump that loses the game's instrument identity.

Compact visual review is a prerequisite for participant sign-off, not a substitute for it.

## 10. Evidence packet

```text
artifacts/compact-layout/<game-id>/
  implementation-summary.md
  automated-results.txt
  80x24-carbon.txt
  80x24-paper.txt
  80x24-contrast.txt
  80x24-ascii.txt
  80x28-carbon.txt
  100x30-carbon.txt
  resize-sequence.txt
  review.md
```

## 11. Completion gate

- [ ] One shared layout contract defines `80x24`, `80x28`, and `100x30`.
- [ ] All 20 games accept `80x24`; only smaller dimensions show resize guidance.
- [ ] Every phase and overlay has compact renderer evidence.
- [ ] Every game passes compact seeded-completion at a fixed seed.
- [ ] Width, height, Unicode, ASCII, theme, and continuation assertions pass.
- [ ] Real-time games behave safely while undersized and during resize.
- [ ] Resize preserves state and creates no lifecycle leaks.
- [ ] Human visual review passes for every game at `80x24`.
- [ ] README and CLI support text state the new `80x24` gameplay floor.
- [ ] Full typecheck, tests, build, playtest regression, and package smoke pass.
- [ ] Compact completion is recorded before catalog-wide human sign-off begins.

