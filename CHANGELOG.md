# Changelog

All notable changes to Gamr are documented here. Release versions correspond to npm versions and immutable Git tags.

## 0.4.0-beta.1 — 2026-08-18

- Harden CLI shutdown after signals, crashes, game switches, and rejected developer commands.
- Add real PTY lifecycle tests on Windows, macOS, and Linux, plus catalog render/resize performance budgets.
- Add type-aware linting, repository formatting checks, coverage reporting, and developer-command failure-path tests.
- Keep informational CLI commands offline-fast and add global reduced-motion and `NO_COLOR` behavior.
- Harden developer cloning, AI launch, generated descriptions, and recursive removal trust boundaries.
- Expand deterministic playtesting to all 20 games and complete the Featured-game profiles.
- Publish prereleases under npm's `beta` distribution tag so they cannot replace `latest` accidentally.

This is a public beta. Automated platform gates are production candidates; independent human terminal, usability, and accessibility sign-off remains in progress.

## 0.3.2 — 2026-08-03

- Fix clean CLI shutdown on Windows Node 24 for non-interactive commands.
- Make packed-artifact smoke testing deterministic and offline-safe.
- Remove the accidental self-dependency from the package manifest.
- Add guarded release publishing, provenance support, and SHA-pinned CI actions.
- Document active versus legacy games and supported Node.js versions.

## 0.3.1 — 2026-08-03

- Reserved tag; publication was blocked because the package metadata still declared `0.3.0`.

## 0.3.0 — 2026-08-02

- Published the public npm package `@wyrcan/gamr`.
- Shipped the active catalog, legacy runners, xterm.js library exports, and CLI.
