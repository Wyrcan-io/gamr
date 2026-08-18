# Gamr production-readiness next plan

**Audit date:** 2026-08-18  
**Audited commit:** `697a994` (`master`, matching `origin/master` at audit time)  
**Current package manifest:** `@wyrcan/gamr@0.3.2`  
**Recommended next release line:** `0.4.0-beta.1` -> `0.4.0`  
**Current verdict:** Automated production candidate / public beta. Local engineering gates are substantially complete; external repository controls and independent human evidence still block a production-ready claim.

## Implementation update - 2026-08-18

This roadmap is being executed in the working tree based on `697a994`. The original audit below remains the baseline; this section is the current status until the changes receive a commit SHA and CI run.

Completed locally:

- refreshed `nanoid` to `3.3.18`; clean install, production audit, and full audit report zero vulnerabilities;
- made update checking cache-first and non-blocking, with one-hour failure backoff and no network access for help, list, invalid arguments, or CI;
- hardened developer clone, install, AI-launch, generated-description, and removal boundaries, including immutable release checkout and physical symlink/junction containment;
- added source/secret/action-pin policy checks, test typechecking, PR dependency review, scheduled full audit, and normal-CI production audit;
- added built-CLI validation for exit codes, non-TTY cleanup, `SIGINT`, `SIGTERM`, terminal restoration, `NO_COLOR`, and first-frame budgets;
- added a 100-start catalog lifecycle/resize soak covering every controller at `80x24` and `100x30` with timer/listener/wrap assertions;
- removed idle 20 FPS redraws from Ghost Shift, Time Capsule, and Night Frequency; Dice Tribunal now redraws only on input or while effects are active;
- upgraded catalog playtesting to 16 seeded-completion and 4 versioned-progression profiles: zero generic profiles and zero Featured gaps;
- added `--reduced-motion`, `GAMR_REDUCED_MOTION=1`, and CLI `NO_COLOR` behavior, and documented the current UTF-8/font and assistive-technology limits;
- separated optional site notification from npm publishing, so downstream dispatch failure cannot make a successful package publication appear failed;
- enforced package/startup budgets. Current evidence: 1,364,230 bytes packed, 5,773,279 unpacked, 28.2 ms median root import, a recorded 788.1 ms one-time cold extraction/antivirus outlier on Windows, and 108 ms offline `--list` startup. Source maps are intentionally retained for public debugging while the artifact remains inside budget.

Current verification:

- `npm ci`: 170 packages installed; zero vulnerabilities.
- `npm test`: 58 files and 238 tests passed.
- source and test typechecking, source policy, build, CLI smoke, and packed-install smoke passed.
- the built 20-game progression suite passed at `80x24`; Packet Panic reached its real three-delivery tutorial completion in about 14 seconds.

Still requires external or human action:

- branch rules, environment approvals, secret scanning/push protection, private reporting, and a non-admin canary merge must be verified in GitHub;
- the site credential must be replaced with a GitHub App or least-privilege fine-grained token and tested;
- GitHub Releases/history decisions for `v0.3.0`, `v0.3.1`, and `v0.3.2` remain release-maintainer work;
- real PTY crash/switch coverage, cross-platform terminal evidence, complete reduced-motion review for game-specific animations, and all first-time-player/accessibility sessions remain open;
- the license expression and contribution licensing need an explicit product/legal decision;
- no beta or stable release has been created by this implementation pass.

## 1. Where the repository is now

Gamr is no longer a prototype. The active catalog, deterministic engines, terminal renderer, CLI, xterm.js library entry points, playtest harness, package smoke test, CI matrix, and OIDC-capable publish workflow all exist.

The remaining work is mostly the work that is easy to miss when feature coding moves quickly: proving cleanup and failure behavior, securing developer automation, making release state unambiguous, defining performance budgets, and collecting real terminal and first-time-player evidence.

| Area | Current status | Readiness |
|---|---|---|
| Product catalog | 20 active games: 4 Featured, 2 Beta, 14 Workshop | Strong, with intentionally mixed maturity |
| Automated tests | 56 files and 228 tests pass | Strong foundation |
| Type safety | Strict source typecheck passes | Tests are excluded from typecheck |
| Game playtests | 14 seeded completion, 2 progress-only, 4 generic smoke | Good, but Featured coverage is incomplete |
| Build/package | Production build and clean package install smoke pass | Strong |
| Runtime dependencies | Production audit reports zero known vulnerabilities | Pass |
| Full dependency tree | One high advisory in dev tooling: `tsup -> postcss -> nanoid@3.3.16` | Fix before next release |
| CI | Latest `master` CI run is green; Ubuntu Node 22/24 and Windows Node 24 are covered | Strong; branch enforcement still needs proof |
| Publishing | `0.3.2` was published from the matching tag with npm provenance | Package publish succeeded, overall workflow is red because site notification failed |
| Release history | npm `latest` is `0.3.2`; tags `v0.3.1` and `v0.3.2` exist | No GitHub Releases; `v0.3.1` is a documented failed reservation |
| Performance | Library import is fast; package size is manageable | No budgets; offline CLI startup has a measured 3-second delay |
| Security | No current-tree secret patterns found; actions are SHA-pinned | Developer automation and external repository settings need hardening |
| Accessibility/human proof | Contrast theme and some ASCII/reduced-motion work exist | No catalog-wide sign-off; no global reduced-motion or `NO_COLOR` contract |

The practical summary is: core implementation is advanced, automated correctness is good, and operational/product evidence is incomplete. This is approximately two-thirds of the way from a strong public beta to a defensible production release; the remaining third carries disproportionate release and reputation risk.

## 2. Audit evidence captured on 2026-08-18

### Passed

- `npm.cmd test`: 56/56 files and 228/228 tests passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run pack:smoke`: packed, installed, imported, and executed the CLI from a temporary project.
- `node dist/cli.js --help` and `--list`: passed.
- `npm.cmd audit --omit=dev`: zero known production vulnerabilities.
- Current tracked-file secret-pattern scan: no likely GitHub, npm, AWS, Google, or private-key secrets found.
- Latest public CI run for `697a994`: passed.
- Published npm `0.3.2` has provenance and `gitHead` `80d4c6a`, matching tag `v0.3.2`.

### Failed or incomplete

- Full `npm audit`: one high-severity development dependency advisory in `nanoid@3.3.16`; a fix is available.
- Publish run for `v0.3.2`: package job passed, site notification failed, leaving the whole workflow red.
- Publish run for `v0.3.1`: tag/version verification correctly failed because the tagged manifest still declared `0.3.0`; npm has no `0.3.1` package.
- GitHub has no Releases for the existing tags.
- Offline `gamr --help` startup measured about 3117 ms with update checking and 106 ms with `GAMR_DISABLE_UPDATE_CHECK=1`.
- Six games have no renderer test: Blackout Grid, Containment Protocol, Dungeon Courier, Orbital Post, The Quiet Heist, and Tiny Fleet.
- Twelve games have no controller/lifecycle test.
- Four games have only generic playtest smoke coverage: Ghost Shift, Dice Tribunal, Time Capsule, and Night Frequency.
- Two Featured games are progress-only rather than seeded-completion: Dead Letter Department and Packet Panic.
- No committed CLI, signal, raw-mode restoration, developer-command, or destructive-path integration tests were found.
- There is no lint, formatting, coverage threshold, dependency-review, or secret-scan gate in CI.

### Package and change size

- Dry-run package: 1,354,570 bytes compressed and 5,739,907 bytes unpacked across 23 files.
- Source maps account for about 3.70 MB, roughly 64% of the unpacked package.
- Root library import measured about 25-27 ms on this audit machine.
- Since `v0.3.2`, `master` contains 16 commits touching 283 files with approximately 174k insertions and 22k deletions. Releasing that body of work as another tiny patch would hide the real change risk; use the `0.4.0` line.

## 3. Production contract to adopt

Treat production readiness as two related promises:

1. **The platform promise:** installation, launcher, terminal cleanup, updates, security, packaging, and releases are production-grade for every user.
2. **The catalog promise:** Featured games are fully supported, Beta games are supported with disclosed limitations, and Workshop games are clearly experimental but must still launch, resize, quit, and clean up safely.

This tiered contract is more realistic than requiring all 20 games to have equal narrative maturity before shipping. Workshop status may relax game-depth requirements, but it must not relax security, terminal cleanup, accessibility basics, or package integrity.

## 4. Ordered execution plan

### Phase 0 - freeze release truth (0.5-1 focused day)

Owner: release maintainer

- [ ] Freeze npm publishing until the release workflow is green end-to-end or the optional site notification is deliberately decoupled.
- [x] Treat site notification as optional and move it to a separate workflow so a successful package publish is not reported as failed.
- [ ] Replace `SITE_REPO_PAT` with a GitHub App token or a fine-grained token limited to the site repository and dispatch permission; rotate the existing credential.
- [ ] Create a GitHub Release for existing `v0.3.2` using the existing immutable tag and npm provenance. Do not republish `0.3.2`.
- [ ] Keep the `v0.3.1` failed-reservation history explicit. Do not silently move that tag.
- [ ] Decide whether to backfill a verified historical `v0.3.0` tag/release or explicitly record that it will remain npm-only. Never republish `0.3.0`.
- [ ] Verify and record branch rules, required CI checks, force-push/deletion protection, the `release` environment approval policy, private vulnerability reporting, secret scanning, and push protection.

Exit evidence:

- Existing `v0.3.2` tag, npm artifact, provenance, changelog entry, and GitHub Release point to the same source.
- A test dispatch reaches the site without a broad personal token, or site dispatch is explicitly non-blocking.
- A canary pull request cannot merge without the required CI result.

### Phase 1 - close security and supply-chain gaps (2-3 focused days)

Owner: security/release maintainer

- [x] Refresh the lockfile so `nanoid` resolves to `>=3.3.18`, then rerun the full suite and both production/full audits.
- [x] Add a pull-request dependency review and a scheduled full-tree advisory scan. Keep a high-severity production audit in normal CI.
- [x] Pin the repository revision used by the `gamr vibe` clone/setup flow instead of cloning and executing an unspecified default-branch snapshot.
- [x] Remove or pin the unversioned `npx skills add Wyrcan-io/gamr ...` fallback. Show the exact source and ask before downloading or executing it.
- [x] Add an explicit trust-boundary screen before launching write-capable AI tooling, including working directory, files in scope, and whether network/PR actions may occur.
- [x] Add path-containment assertions before recursive game removal, even though current CLI game names are normalized.
- [ ] Add tests for crafted game names, descriptions, malformed registry entries, symlink/pointer handling, cancellation, failed clones, failed installs, and removal containment.
- [ ] Decide the license expression (`AGPL-3.0-only` or `AGPL-3.0-or-later`) and document contribution licensing. Do not change license strategy without an explicit product/legal decision.

Exit evidence:

- Production and full dependency audits have no unaccepted high/critical findings.
- Developer automation never downloads, executes, deletes, or opens a PR without a visible and bounded user decision.
- Security reporting and repository protection settings are tested from a non-admin account where practical.

### Phase 2 - make lifecycle and CLI behavior provable (3-5 focused days)

Owner: runtime/test maintainer

- [x] Typecheck tests using a dedicated test tsconfig or include them in the main typecheck.
- [ ] Add CLI integration coverage for help/list, invalid games/themes, non-TTY input, `SIGINT`, `SIGTERM`, child-process failure, and exit codes.
- [ ] Add a fake or real PTY test proving raw mode, alternate screen, cursor visibility, listeners, and timers are restored after quit, crash, and game switch.
- [x] Cover every controller through the catalog lifecycle soak; retain focused controller tests for higher-risk games.
- [x] Cover every renderer and resize path at 80x24 and 100x30 through the catalog soak and seeded catalog run.
- [x] Add a 100-cycle catalog start -> resize -> stop soak test and assert no leaked timers, terminal/window listeners, or wraps.
- [x] Upgrade Dead Letter Department and Packet Panic from progress-only to seeded-completion because they are Featured.
- [x] Upgrade Ghost Shift, Dice Tribunal, Time Capsule, and Night Frequency from generic smoke to versioned progression profiles.
- [x] Change the current test that expects Featured coverage gaps so it requires zero Featured gaps.
- [ ] Add a lightweight formatting check and a deliberately small lint ruleset focused on correctness, promises, unsafe process/filesystem use, and dead code.
- [ ] Add coverage reporting first; set thresholds only after measuring a stable baseline. Prefer per-critical-module thresholds over chasing one vanity percentage.

Exit evidence:

- Every game has engine, renderer/resize, and controller cleanup coverage appropriate to its tier.
- Featured games have seeded completion and zero required milestone gaps.
- The CLI survives signals and repeated switching without leaving the terminal broken.

### Phase 3 - establish production performance budgets (2-3 focused days)

Owner: runtime maintainer

- [x] Do not run network update checks for `--help`, `--list`, invalid arguments, CI, or non-interactive invocations.
- [x] Make the gameplay update check non-blocking and run it after the first usable frame begins.
- [x] Cache failed/offline checks with a short backoff so offline users do not pay the full timeout on every launch.
- [x] Add startup benchmarks with targets: help/list under 250 ms offline and interactive controls available under 500 ms before any update result.
- [x] Instrument lifecycle writes and remove idle redraws from the four previously generic turn-based profiles; retain explicit capped animation loops where effects require them.
- [ ] Add a render/resize benchmark at 80x24, 100x30, and 160x50 and catch accidental quadratic layout work.
- [x] Retain public source maps for debugging while the package remains within its explicit size budget; revisit only with a deliberate artifact strategy.
- [x] Add package budgets of no more than 1.5 MB compressed and 6 MB unpacked.
- [x] Keep median root import startup under 50 ms and report the coldest sample for filesystem/antivirus diagnostics.

Exit evidence:

- Offline startup cannot block for the registry timeout.
- Idle and animated write rates have repeatable budgets.
- Package-size changes fail CI with a readable diff rather than surprising the release operator.

### Phase 4 - human, terminal, and accessibility sign-off (5-10 focused days)

Owner: product/UX maintainer plus testers who did not build the target game

- [ ] Test Windows Terminal, one macOS terminal, one Linux terminal, and xterm.js.
- [ ] Test 80x24 compact, 100x30 standard, and one wide layout with carbon, paper, and contrast themes.
- [x] Document the current UTF-8 and font requirement without claiming an unimplemented ASCII-only mode.
- [ ] Add global reduced-motion behavior for transitions and animations; honor a CLI flag or environment/config setting.
- [x] Implement and document non-empty `NO_COLOR` handling for the CLI.
- [ ] Verify no mechanic relies on color alone and that focus, warning, success, and failure always have text/shape cues.
- [ ] Run at least three first-time-player sessions for each Featured and Beta game. Record repeated confusion and retest fixes with a new participant.
- [ ] Give each Workshop game at least one independent launch/understand/quit review; keep it Workshop if its deeper loop lacks evidence.
- [ ] Record terminal, dimensions, theme, Node version, commit, seed, outcome, confusion points, and accessibility findings without collecting unnecessary participant data.
- [ ] Update README maturity/support language from the resulting evidence.

Exit evidence:

- Featured and Beta games have independent human evidence.
- Every shipped game is legible, controllable, resizable, and safely quittable on the supported terminal contract.
- Repeated confusion and accessibility blockers are fixed and retested.

### Phase 5 - release candidate, observation, and promotion (1-2 focused days plus observation time)

Owner: release maintainer

- [ ] Freeze features and prepare `0.4.0-beta.1` with changelog and migration/support notes.
- [ ] Run the final command gate from a clean checkout on Node 22 and 24.
- [ ] Publish through the protected OIDC workflow only; verify npm provenance and package contents.
- [ ] Install the beta globally on clean Windows, macOS, and Linux environments and run the terminal matrix smoke.
- [ ] Observe the beta for at least 48 hours or a defined minimum number of independent installs/sessions.
- [ ] Fix blockers in another beta rather than promoting a known-bad artifact.
- [ ] Promote the exact tested commit to `0.4.0`, create the GitHub Release, and verify the site points at the published npm version.
- [ ] Document rollback: move the npm dist-tag or deprecate a bad version; do not depend on unpublishing.

## 5. Final production gate

Gamr may be called production-ready when all of the following are true:

- [ ] Current `master` CI is green and required by branch rules.
- [ ] Production/full dependency findings have no unaccepted high or critical issue.
- [ ] Package publication, provenance, Git tag, changelog, GitHub Release, and site version agree.
- [ ] Optional downstream notification failure cannot disguise the actual npm publication result.
- [ ] Help/list and initial interaction stay within startup budgets while offline.
- [ ] CLI signal, terminal restoration, repeated switch, and controller cleanup tests pass.
- [ ] All Featured games have seeded-completion and human sign-off.
- [ ] Beta and Workshop limitations are visible before launch and match their evidence.
- [ ] Supported terminals, sizes, Unicode/ASCII behavior, motion, and color behavior are documented and tested.
- [ ] A clean packed artifact installs and runs on supported Node versions and operating systems.
- [ ] A release candidate completed the observation window without an unresolved blocker.

## 6. Repeatable command gate

Run from a clean checkout. On Windows PowerShell, use `npm.cmd`.

```powershell
npm.cmd ci
npm.cmd run check:source
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:cli
npm.cmd run pack:smoke
npm.cmd audit --omit=dev --audit-level=high
npm.cmd audit --audit-level=high
node scripts/playtest.mjs --coverage-report
node scripts/playtest.mjs --suite=progression --cols=80 --rows=24
node dist/cli.js --help
node dist/cli.js --list
git diff --check
```

The full audit may use an explicit, reviewed exception for a development-only advisory, but the exception must record dependency path, exploitability, owner, expiry date, and upgrade plan.

## 7. Recommended first five tickets

1. Fix/decouple the failed site notification and record the `v0.3.2` GitHub Release.
2. Update the vulnerable `nanoid` lockfile path and add runtime/full dependency policy to CI.
3. Make update checks non-blocking and skip them for informational/non-interactive CLI commands.
4. Add CLI/PTY lifecycle tests plus controller tests for the four smoke-only games.
5. Upgrade the two Featured playtest profiles to seeded completion and start first-time-player sessions.

These five tickets reduce release, security, performance, and product-evidence risk without starting another broad feature rewrite.
