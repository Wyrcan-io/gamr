# Gamr Production-Readiness Audit

**Audit date:** August 2, 2026  
**Repository version:** `0.2.4`  
**Verdict:** **No-go for a production launch. Suitable for a public beta after the launch blockers are fixed.**

Gamr has a strong game-engine foundation, but the repository is not yet ready to be presented as twenty production-ready games. The current registry classifies the active lineup as four featured games, two beta games, and fourteen workshop games. That distinction is honest and should remain visible to users.

## What Is Already Healthy

- Strict TypeScript type-checking passes.
- All 196 tests across 32 test files pass.
- The production build succeeds.
- Built library and CLI imports pass smoke checks.
- `npm pack` produces a valid archive of approximately 1.81 MB compressed and 8.42 MB unpacked.
- Runtime dependencies have zero currently known npm advisories.
- No obvious committed secrets, credentials, or private keys were found.
- `package-lock.json` is committed, and CI installs with `npm ci`.
- CI includes Windows and Ubuntu.
- The working tree remained clean during the audit.

## P0: Launch Blockers

### 1. Public installation is unavailable

An unauthenticated npm registry request for `@abhirup/gamr` returns `404 Not Found`. As a result, the installation and `npx` commands currently shown in the README will fail for public users.

The canonical GitHub repository is `Wyrcan-io/gamr`. At audit time, the package metadata and developer CLI still pointed at `abhirup/gamr`; those repository-side references have now been corrected.

**Remaining action:** Make `Wyrcan-io/gamr` publicly accessible and publish a prerelease package before advertising the installation commands.

### 2. Game switching leaks timers and input listeners (addressed; needs regression tests)

Seventeen of the twenty active games have transition paths that set `running = false` and dispatch a Games Menu or Next Game event without invoking their controller cleanup routine.

Several cleanup routines then begin with:

```ts
if (!running) return;
```

Once a transition has set `running` to false, these cleanup routines can no longer clear their intervals or dispose their input listeners. Repeated game switching therefore accumulates dormant 20-FPS intervals and key listeners.

The CLI now retains the active controller and stops it before opening the menu, switching games, launching another game, or handling process signals.

Packet Panic, Botany Lab, and The 13th Lift use safer transition paths. The other active games need lifecycle review.

The repository-side transition calls now invoke `controller.stop()` before dispatching menu/switch events. Add the integration tests below to prevent regressions.

**Remaining action:**

1. Make every transition call one idempotent cleanup function.
2. Never use `running` as the guard that prevents resource cleanup.
3. Have the CLI own the current controller and stop it before launching a menu or another game.
4. Add integration tests that verify timers, listeners, cursor state, and alternate-buffer state after quit, menu, restart, and next-game transitions.

### 3. CI targets the wrong push branch (addressed; branch protection is manual)

The checked-out repository uses `master`, while `.github/workflows/ci.yml` only runs on pushes to `main`.

Pull requests still trigger CI, but direct pushes and post-merge verification on `master` are not covered.

The workflow now covers pushes to both `main` and `master`. Standardize on one branch name and configure protection/required checks in GitHub.

### 4. The developer hub cannot create a game (addressed locally; external clone URL remains manual)

`src/create.ts` expects `.claude/skills/game-dev` to be a directory containing `templates/game-scaffold.ts`. In the repository, `.claude/skills/game-dev` is a regular text file containing a relative path to `.agents/skills/game-dev` rather than a working directory or symlink.

The resulting template lookup failed. Outside the repository, the command now uses the canonical `Wyrcan-io/gamr` clone URL.

The generator now resolves the checked-in pointer file and safely serializes descriptions. Its fallback clone URL now matches the canonical repository.

## P1: Security and Supply-Chain Findings

### Development dependency vulnerabilities (resolved)

The initial audit found five development-tool vulnerabilities. After refreshing the lockfile and applying an `esbuild` override, the current npm audit reports zero vulnerabilities for both runtime and development trees.

- One critical vulnerability
- Three high-severity vulnerabilities
- One low-severity vulnerability

Keep the lockfile under review as tooling releases change.

### Unpinned remote execution in the developer CLI

The game generator executes:

```text
npx skills add abhirup/gamr -a claude-code -s game-dev -y
```

The package and skill revision are not pinned. Future registry or upstream changes could therefore determine code executed on a contributor's machine.

**Required action:** Pin the executable package version and the skill source revision. Prefer a reviewed template already shipped in the repository.

### Unsafe source generation (addressed)

User-entered game descriptions are inserted directly into a single-quoted TypeScript string. An ordinary apostrophe can break the generated file, while crafted input can inject source code.

Generated descriptions now use `JSON.stringify()` and the registry parser accepts the resulting representation.

### Mutable GitHub Action references

GitHub Actions are referenced by mutable version tags. The release notification workflow also passes a repository PAT to a third-party action.

**Required action:**

- Pin actions to full commit SHAs.
- Declare minimal workflow `permissions`.
- Use a fine-grained token or GitHub App with access only to the target repository.
- Avoid making the site release authoritative before npm publication has succeeded.

### Incomplete `.gitignore` (addressed)

The repository only ignores `node_modules/` and `dist/`.

The ignore file now covers environment files, coverage, logs, archives, editor metadata, and OS files.

## P1: Packaging, Testing, and Compatibility

### `npm start` fails on Windows (addressed)

The start script depends on `sh`, `find`, and `read`. It failed during the Windows audit even though the Windows CI job passes type-checking, tests, and build.

`npm start` now uses `scripts/start.mjs`; the Windows `npm start -- --list` smoke test passes.

### Missing Node.js compatibility declaration (addressed)

The package does not declare `engines.node`, despite using APIs such as `structuredClone`, native `fetch`, and `AbortController`.

`package.json` now declares Node `>=18`. Add an explicit oldest-supported Node matrix entry when the supported version policy is finalized.

### Incomplete public library exports (addressed)

`src/games/index.ts` exports all individual runners, but the package root in `src/index.ts` only re-exports the older runners. The new game runners are therefore absent from the built root API and declaration file.

All current runners are now re-exported from the package root. Add a package smoke test to make this API promise permanent.

### Tests do not cover the shipped lifecycle

The existing tests provide good deterministic engine coverage, but there are no meaningful tests for:

- CLI argument parsing and exit behavior
- Controller cleanup and idempotency
- Menu-to-game and game-to-game transitions
- Packed installation and executable behavior
- Public package exports
- Update checking
- Developer CLI creation and removal flows
- Long-running switch/quit resource leaks

**Required action:** Add integration and package-level tests rather than relying exclusively on pure engine tests.

### Package smoke testing is missing

The release gate type-checks, tests, and builds, but it does not install the generated npm archive into a clean temporary project.

**Required action:** In CI, run `npm pack`, install the archive into a clean directory, import both public entry points, and execute `gamr --list` and `gamr --help`.

## P1: Documentation and Product Accuracy

The README is materially out of date:

- It says the active lineup contains ten games, while the registry contains twenty.
- It says there are four workshop games, while there are fourteen.
- Nine active games are absent from the game table.
- The source header still claims eighteen games.
- The README says games run in any terminal, although most active games require at least `80x28` and therefore do not fit a conventional `80x24` terminal.
- CLI help advertises the broken developer hub, while the README does not explain it.

**Required action:** Generate or validate game listings from registry metadata so documentation drift becomes a test failure.

## P2: Open-Source Project Hygiene

The repository has a license and README but lacks several files public contributors will expect:

- `CONTRIBUTING.md`
- `SECURITY.md` with private vulnerability-reporting instructions
- `CODE_OF_CONDUCT.md`
- Pull-request template
- Bug and game-proposal issue templates
- `CHANGELOG.md` or generated release notes
- `CODEOWNERS`
- Maintainer and release documentation
- Dependabot or Renovate configuration

Recommended repository settings include:

- Protected default branch
- Required CI checks
- Required review before merge
- Automatic deletion of merged branches
- Dependabot alerts and security updates
- Secret scanning and push protection where available
- Private vulnerability reporting

## License Decision

The repository includes the GNU Affero General Public License version 3, and `package.json` uses the identifier `AGPL-3.0`.

Before launch:

1. Confirm that strong AGPL copyleft is intentional for a reusable xterm.js library.
2. Use the precise SPDX identifier `AGPL-3.0-only` or `AGPL-3.0-or-later` according to the intended grant.
3. Add an appropriate project copyright notice.
4. Explain the license implications to contributors and library consumers.

AGPL is a legitimate open-source choice, but its obligations may discourage developers from embedding the library in applications. This is a product and legal-strategy decision, not merely metadata cleanup.

## Terminal UX and Accessibility Checklist

Before declaring a game featured, test it manually on:

- Windows Terminal and legacy Windows console behavior
- macOS Terminal or iTerm2
- At least one Linux terminal
- The supported xterm.js integration
- `80x24`, `80x28`, `100x32`, and a larger terminal
- Light, dark, and high-contrast themes
- Resize while playing, paused, and on report screens
- Quit, restart, games menu, next game, Ctrl+C, and process termination
- Repeated game switching for at least 30–50 transitions

Also consider:

- `NO_COLOR` support
- A reduced-motion or reduced-glitch option
- Avoiding color as the sole indicator of game state
- Documenting Unicode/font expectations
- Clear behavior when stdin or stdout is not a TTY

## Recommended Launch Sequence

### Phase 1: Stabilize the runtime

- Centralize controller lifecycle ownership.
- Fix every cleanup path.
- Add lifecycle and switch-soak integration tests.
- Fix the Windows start command.

### Phase 2: Establish public distribution

- Select the canonical GitHub organization and package namespace.
- Make the repository public.
- Correct repository links throughout the project.
- Add open-source community and security files.
- Publish `0.3.0-beta.1` and verify installation on clean machines.

### Phase 3: Secure the contributor and release workflow

- Upgrade vulnerable development dependencies.
- Pin GitHub Actions and remote tooling.
- Fix the game generator and serialize generated source safely.
- Protect the default branch and add package smoke testing.
- Introduce trusted npm publishing with provenance if available.

### Phase 4: Validate the product

- Update and automatically validate documentation.
- Run the terminal compatibility matrix.
- Conduct real-player onboarding and playtesting.
- Promote games individually when they meet the featured quality gate.

## Repository-side fixes applied

This audit pass addressed the fixes that are safe to make in the repository:

- game transitions now stop controllers before leaving a game, including archived games;
- `npm start` uses a cross-platform Node launcher instead of POSIX shell utilities;
- CI runs on both `main` and `master` pushes;
- the developer hub resolves the checked-in skill pointer and serializes generated descriptions safely;
- all current game runners are exported from the package root;
- Node version metadata, public scoped-package access metadata, secret/log/editor ignores, README lineup counts, `SECURITY.md`, and `CONTRIBUTING.md` were added or updated.

The remaining items below require access to external services or a maintainer decision.

## Manual P0: make public installation real

The package and README currently advertise `npx @abhirup/gamr`, but the npm registry and GitHub API did not expose a public package/repository during this audit. Complete these steps from an account that owns the intended namespace:

1. Keep `Wyrcan-io/gamr` as the canonical GitHub repository. Decide whether the npm package should remain under `@abhirup/gamr` or move to a scope controlled by the release owner.
2. Make `Wyrcan-io/gamr` **Public**, push this branch, and set the intended default branch (`main` or `master`).
3. Create the npm account/organization for the chosen scope. Enable 2FA for publishing, sign in with `npm login`, and verify that the package name is available with `npm view <package-name>`.
4. Review package contents with `npm pack --dry-run`. From the release commit, bump to a deliberate version (for example `0.3.0-beta.1`) and publish with `npm publish --access public`. The repository now sets `publishConfig.access` to public, but publication still requires your credentials and ownership.
5. From a clean directory and a second machine/Node environment, verify `npx <package-name> --list`, `npx <package-name> --help`, and `npm install <package-name>`. Confirm the packed library imports and the CLI starts.
6. Configure npm trusted publishing/provenance if your release setup supports it. Otherwise keep the publish token out of the repository and CI logs.
7. Configure GitHub branch protection, required CI checks, Dependabot/security alerts, secret scanning/push protection, and private vulnerability reporting. Rotate or replace `SITE_REPO_PAT` with a fine-grained token limited to the target site repository.

Do not claim “installable from npm” until step 5 succeeds from a clean environment. The npm package name, GitHub owner, default branch, license choice, and release version are intentionally left for the maintainer to decide.

## Final Recommendation

Do not market the current repository as twenty production-ready games.

A credible first public release would say:

> Gamr is a public beta anthology containing four featured games, two games in beta, and fourteen workshop experiments open for testing and contribution.

The underlying deterministic engines and test suite are a strong foundation. The remaining work is concentrated in lifecycle discipline, public distribution, contributor safety, release engineering, documentation accuracy, and real-terminal playtesting—the areas that fast-moving implementation work most often overlooks.
