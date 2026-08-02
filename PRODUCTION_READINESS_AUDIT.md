# Gamr production-readiness audit

**Audit date:** 2026-08-02

**Audited commit:** `99e600119dcd97cf223aecc3559bf1012be22123` (`master`)

**Published package:** `@wyrcan/gamr@0.3.0` (`latest`)

**Verdict:** **The live package is suitable for public beta use, but the repository is not ready for a production release process. Do not publish `0.3.1` until these repository fixes are pushed, CI has run, and the remaining release settings are configured.**

There is no evidence that `0.3.0` needs to be unpublished. The package builds, imports, and exposes a working CLI, and the current dependency audit is clean. The largest risks are around the *next* release: the local manifest is already incorrect, GitHub CI has never run, and the npm artifact is not tied to a tag, GitHub release, or provenance attestation.

## Follow-up implementation status

This audit has now been acted on in the working tree:

- removed the self-dependency and refreshed the lockfile;
- raised the declared runtime floor to Node 22 and bounded xterm.js peer support to `<7`;
- repaired CI push/PR triggers, added Node 22/24 coverage, minimal permissions, concurrency, and SHA-pinned actions;
- added `scripts/pack-smoke.mjs`, release tag validation, a provenance-ready publish workflow, and post-publish site notification ordering;
- added an update-check opt-out, stronger SemVer comparison, scoped registry URL encoding, and restrictive cache-file permissions;
- made non-interactive CLI exits return cleanly on Windows Node 24 and made the package smoke test disable network update checks;
- added Node/xterm/legacy-catalog documentation, a changelog, security reporting link, Code of Conduct, issue forms, PR template, and Dependabot configuration.

The remaining blockers are account/repository operations: push these changes, confirm GitHub sees successful runs, configure branch protection and the `release` environment, enable npm trusted publishing/private vulnerability reporting, rotate or replace `SITE_REPO_PAT`, and create the historical `v0.3.0` release/tag only after verifying its source commit.

## Executive findings

| Priority | Finding | Why it matters |
|---|---|---|
| P0 | The package self-dependency was present at the audit baseline | It would have shipped a circular dependency and could make local `npx gamr` resolve the old published copy; fixed in the working tree |
| P0 | CI had been configured incorrectly and GitHub reports zero workflow runs | Tests could pass locally while broken or malicious changes merge without a required check; workflow fixed locally, push/branch settings remain |
| P0 | Publishing is manual and not reproducible | npm `0.3.0` has no matching Git tag, GitHub release, or provenance; the repository already contains different metadata under the same version |
| P1 | Runtime support needed alignment | The working tree now declares Node 22+, uses Node 22 types, and tests Node 22/24; existing published `0.3.0` remains on its original metadata |
| P1 | Tests do not cover the shipped CLI or controller lifecycle | The most failure-prone integration boundaries remain outside the 201 passing tests; packed-artifact coverage is now present |
| P1 | Contributor/release paths still execute mutable or privileged third-party code | Actions are now SHA-pinned, but the site job still receives a PAT and the developer command can run an unpinned `npx skills add` |
| P1 | Package artifact size remains high | xterm compatibility and Node type alignment are fixed in the working tree; source maps are still 65% of the unpacked package |
| P2 | Open-source intake and maintenance conventions need external GitHub setup | Repository templates, Code of Conduct, changelog, and Dependabot are now present; GitHub still needs settings/metadata |

## Verified healthy foundation

- `npm run typecheck` passes with strict TypeScript settings.
- `npm test` passes: **35 files and 201 tests**.
- `npm run build` succeeds.
- Built-library import smoke check succeeds and exposes 20 active games.
- `node dist/cli.js --help` and `--list` both exit successfully.
- `npm pack --dry-run --json` succeeds with a 17-file archive.
- `npm audit` reports **0 known vulnerabilities** across the current 170-package tree.
- The live npm registry confirms `0.3.0` is the `latest` release and its runtime dependencies contain only `@clack/prompts`; the self-dependency has not affected the already-published artifact.
- No obvious GitHub/npm/AWS token or private-key patterns were found in tracked files or Git history. This was a heuristic scan, not a replacement for GitHub secret scanning and push protection.
- The package uses a `files` allowlist, includes a lockfile, has no install/postinstall script, and includes README and license material in the tarball.
- Windows and cross-platform behavior have received some attention; the local start helper is implemented in Node rather than POSIX shell.

## P0 — fix before the next npm publish

### 1. Remove the package's self-dependency — fixed in working tree

`package.json` lines 76–79 and the root lockfile package currently include:

```json
"@wyrcan/gamr": "^0.3.0"
```

This was added after the `0.3.0` release commit. The installed tree now contains both the working copy and `node_modules/@wyrcan/gamr@0.3.0`. That creates several problems:

- the next package would tell npm to install itself as a dependency;
- repository-local `node_modules/.bin/gamr` can point at the old registry copy;
- debugging may silently mix current source with published code;
- installs and audits include a duplicate 8.4 MB unpacked package.

**Required fix:** remove `@wyrcan/gamr` from `dependencies`, regenerate `package-lock.json`, run `npm ci`, and re-run the full verification suite. Add a CI assertion that the root package name cannot occur in its own `dependencies`, `optionalDependencies`, or `peerDependencies`.

The public `0.3.0` package is not affected; npm registry metadata shows only `@clack/prompts` as a runtime dependency.

### 2. Repair CI and require it before merge — fixed in working tree; settings remain

`.github/workflows/ci.yml` currently nests `push` underneath `pull_request`:

```yaml
on:
  pull_request:
    push:
      branches: [main, master]
```

This does not define a push trigger. The public GitHub API reports **zero Actions runs** despite multiple pushes. GitHub recognizes one active workflow named CI, but it has never provided a check result. The former site-notification workflow was not registered; it has now been replaced by a post-publish job in `publish.yml`.

At minimum, use independent events:

```yaml
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
```

Then add:

- top-level `permissions: contents: read`;
- concurrency that cancels superseded runs on the same PR;
- Node 22 and 24 coverage, with Windows represented at least once;
- `npm ci`, typecheck, tests, build, and packed-artifact smoke tests;
- a check that `package.json` version/exports/bin all match the packed artifact;
- full-SHA action pins, maintained by Dependabot;
- a protected `master` branch/ruleset that requires the CI check and blocks force pushes/deletion.

Branch protection could not be inspected through the unauthenticated API, so it must be confirmed in repository settings after the fixed workflow has produced a successful check.

### 3. Make releases traceable, gated, and reproducible — workflow added; external setup remains

Current public state:

- npm `latest` is `0.3.0`;
- the public GitHub API reports **no tags and no GitHub releases**;
- npm distribution metadata contains an integrity hash and registry signature but no provenance attestation;
- `master` still declares version `0.3.0` even though its manifest differs from the published `0.3.0` artifact;
- the working-tree publish workflow now notifies the site only after npm publication; the existing site PAT still needs to be replaced or rotated and configured in GitHub.

This makes it difficult for a user to answer, “Which exact source commit produced this npm tarball?” It also makes accidental double-version work likely.

**Required release model:**

1. Verify that commit `ba95579744daa11c580b109aafd049a1005e4ff5` exactly corresponds to the published source, then create an immutable `v0.3.0` tag/release for historical traceability. Never try to republish npm `0.3.0`; npm versions are immutable.
2. Require every future release commit to have a new version and changelog/release note before publication.
3. Add a dedicated `publish.yml` using npm trusted publishing (OIDC), a protected GitHub environment, `contents: read`, and `id-token: write`. Do not store a long-lived npm publish token.
4. In the publish job, perform a clean `npm ci`, all checks, `npm pack`, clean-directory installation/import/bin smoke checks, tag-to-version validation, then `npm publish`.
5. Notify the site only *after* npm publication succeeds. A GitHub release event should not make the site advertise an artifact that may have failed to publish.
6. Enable GitHub release immutability for future releases.

npm trusted publishing removes long-lived publish credentials and automatically creates provenance for eligible public packages: [npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/). GitHub release immutability prevents tag/asset mutation after release: [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases).

## P1 — fix before calling the product production-ready

### 4. Align Node support, types, and CI — fixed in working tree

At the audit baseline, the package declared `node >=18`, compiled against `@types/node ^25.3.2`, and CI only requested Node 22. The working tree now declares Node 22+, uses Node 22 types, and tests Node 22/24.

As of this audit, Node 18 and 20 are EOL; supported LTS lines are 22 and 24. Production applications should run supported LTS releases: [official Node.js release schedule](https://nodejs.org/en/about/previous-releases).

**Recommended fix:** declare `node >=22`, compile against a Node 22-compatible type package, and test Node 22 plus 24. If compatibility with 18/20 is deliberately retained for users, describe it as best-effort legacy compatibility rather than a supported production runtime and test it separately.

### 5. Test the boundaries users actually install and run — package boundary fixed; lifecycle coverage remains

The 201 tests are valuable, but they are predominantly deterministic engine/render tests. There are no committed tests for:

- CLI argument parsing, exit codes, non-TTY behavior, and signal cleanup;
- menu → game → menu and game → game transitions;
- idempotent controller cleanup of timers, listeners, cursor state, raw mode, and alternate screen buffers;
- repeated switch/quit soak behavior;
- the public root and `./themes` exports from an installed tarball;
- the generated executable shim after clean installation;
- update-check caching, timeout, prerelease-version comparison, and failure behavior;
- developer `vibe/create/remove` flows in a disposable repository.

Seventeen of the nineteen archived game directories have no colocated tests, yet those games are still bundled, individually exported, returned through `allGames`, launchable directly from the CLI, and listed in the README. “Archived” currently means hidden from the main menu, not removed from the supported artifact.

**Required fix:** add a small integration harness with a fake terminal and fake timers, plus an `npm pack` smoke job that installs into a fresh temporary project. Decide whether archived runners are supported; test them or move them behind an explicitly unsupported/experimental entry point.

### 6. Harden workflow and contributor supply-chain boundaries — action pins fixed; credential/remote-tool setup remains

The repository currently uses mutable action tags (`actions/checkout@v4`, `actions/setup-node@v4`, and `peter-evans/repository-dispatch@v3`). The site workflow passes `SITE_REPO_PAT` to a third-party action. GitHub recommends full commit-SHA pins because they execute exactly the reviewed action code: [GitHub Actions hardening guidance](https://docs.github.com/en/code-security/tutorials/secure-your-organization/protect-against-threats).

The developer CLI also executes mutable remote inputs:

- it clones the default branch of `Wyrcan-io/gamr` and immediately runs `npm install`;
- if the local skill template is missing, it runs `npx skills add Wyrcan-io/gamr ... -y` without a package version or source commit pin;
- it can launch Claude Code with write-capable prompts against the repository.

These behaviors are part of the product, but they should be explicit trust boundaries.

**Required fix:**

- pin all Actions to full SHAs and configure Dependabot to propose SHA updates;
- declare minimal permissions in every workflow;
- replace the site PAT with a GitHub App or a fine-grained token limited to only the target repository and required action, then rotate the existing credential;
- prefer the reviewed template already included in the repository;
- if remote skill installation remains, pin an immutable version/commit and ask for confirmation before downloading or executing it;
- show users what clone/install/AI action will happen and where files will be changed.

### 7. Tighten package compatibility and artifact size — compatibility fixed; size remains a product choice

The optional peer range is `@xterm/xterm >=5.0.0`, but only xterm 6 is installed in development. That range silently claims compatibility with every future major. Use a tested bounded range such as `>=5 <7`, and add at least one integration check per supported major.

The dry-run package is **1.81 MB compressed / 8.43 MB unpacked**. The six source maps total **5.46 MB**, about 65% of the unpacked archive. `dist/index.js` and `dist/cli.js` each bundle roughly 1.4 MB of game code. This is not a security failure, but it is unnecessary install/network weight for a terminal package and makes the reusable-library story less attractive.

**Recommended fix:** decide whether public source maps are worth the size, avoid bundling the same anthology twice where practical, and consider per-game subpath exports for library consumers. Document that the package is ESM-only. Do not add `sideEffects: false` until top-level behavior has been audited.

### 8. Make update behavior predictable and privacy-friendly — fixed in working tree

Normal CLI startup contacts the npm registry and writes `~/.gamr/update-check.json`. Failure is handled safely, but the behavior is undocumented and has no opt-out for CI/offline/privacy-sensitive environments. The custom version parser is not SemVer-complete; prerelease strings such as `0.3.0-beta.1` can compare incorrectly.

**Recommended fix:** use a tested SemVer implementation, document the network/cache behavior, honor a variable such as `GAMR_DISABLE_UPDATE_CHECK=1` (and CI), create cache files with conservative permissions, and test corrupt-cache/offline/timeout paths. Keep self-update explicitly opt-in, as it is now.

### 9. Make security reporting actionable — link added; private-reporting setting remains

`SECURITY.md` correctly asks users not to disclose vulnerabilities publicly, but it does not give a concrete contact address or confirm that GitHub private vulnerability reporting is enabled. “Contact the maintainer” is circular for a reporter who cannot identify a private channel.

**Required fix:** enable private vulnerability reporting and link directly to it, or provide a monitored security email. Add supported-version and response-target guidance. In GitHub settings also enable Dependabot alerts/security updates, secret scanning, and push protection where available.

### 10. Stop documentation and product metadata from drifting — baseline docs fixed; generated drift guard remains

The README says the “current lineup” contains 20 games, while its table lists all 39 bundled games. The CLI `--list` shows only 20, but direct CLI launch and library exports expose the 19 archived games. `src/index.ts` still says “18 games.” The distinction between featured, beta, workshop, archived, listed, and supported is not clear enough for users.

The README also says games run in “any” xterm.js terminal without documenting minimum dimensions, Unicode/font requirements, non-TTY behavior, or which terminals are manually tested.

**Required fix:** generate README/CLI catalogs from registry metadata or add a drift test. Publish a support table that distinguishes active and legacy games, maturity, required terminal size, and compatibility status.

## P2 — open-source maintenance and community hygiene

The public GitHub community-profile API currently reports **50% health** (measured before this follow-up). The repository now has a README, AGPL license, contributing guide, security policy, Code of Conduct, changelog, templates, and Dependabot configuration. GitHub still needs:

- `CODE_OF_CONDUCT.md`;
- structured bug-report and feature/game-proposal issue forms;
- a pull-request template with test/manual-play and screenshot/terminal-capture prompts;
- `CHANGELOG.md` or generated release notes;
- `CODEOWNERS` or an explicit maintainer/reviewer policy;
- Dependabot/Renovate configuration;
- support and deprecation policy;
- repository description, homepage, and topics (all are empty publicly);
- CI/status badges.

Recent commit subjects such as `idk`, `vf`, and `some changes` make release archaeology and rollback harder. Adopt a minimal convention: a descriptive imperative subject, one concern per commit, PR squash titles that describe user impact, and a version/tag for releases.

There is no lint or formatting gate, tests are excluded from the TypeScript project typecheck, and there is no coverage report/threshold. Strict compiler checks catch much already, so introduce these deliberately rather than installing a large ruleset blindly. At minimum, typecheck tests and add a lightweight formatting check.

### License decision

AGPL is a valid open-source choice, but it is strong copyleft and materially affects developers who embed the xterm.js library in another product. Confirm this is intentional before promoting Gamr as a reusable SDK.

- Replace the deprecated/ambiguous `AGPL-3.0` identifier with the intended `AGPL-3.0-only` or `AGPL-3.0-or-later` grant.
- Add a project copyright notice and state how contributions are licensed.
- If broad commercial embedding is a goal, obtain legal advice before considering a permissive or dual-license model.

This is product/legal strategy, not a vulnerability, and the current license should not be changed casually.

## Minimum GitHub setup recommended now

1. **CI workflow:** fixed PR/push triggers; read-only permissions; Node 22/24; Ubuntu plus Windows; typecheck, tests, build, dependency/self-reference check, pack/install/import/bin smoke.
2. **Branch ruleset:** PR required; CI required; one approval when collaborators exist; stale approvals dismissed after new commits; force push and deletion blocked; admin bypass limited to emergencies.
3. **Publish workflow:** protected `release` environment with approval; tag/version check; clean build/test/pack; npm OIDC trusted publishing; provenance; site notification only after publish.
4. **Dependency security:** Dependabot for npm and Actions, dependency review on PRs, npm audit as scheduled/reporting signal rather than an auto-fix command.
5. **Repository security:** private vulnerability reporting, secret scanning/push protection, minimal Actions token permissions, pinned action SHAs, immutable releases.
6. **Community intake:** issue forms, PR template, Code of Conduct, changelog/release notes, clear support/maturity labels.

## Recommended order of work

### Today — block accidental bad releases

1. Remove the self-dependency and regenerate the lockfile.
2. Fix `ci.yml`, push it, and confirm successful PR and push runs.
3. Add branch protection/rules after the first real CI check exists.
4. Bump away from `0.3.0` before any further npm publish.

### Before `0.3.1`

1. Verify/tag the historical `0.3.0` release commit.
2. Add packed-artifact smoke tests.
3. Add OIDC trusted publishing with an approval environment and provenance.
4. Align Node/xterm support and pin workflow actions.
5. Make the site update depend on successful npm publication.

### Before using the word “production”

1. Add lifecycle/CLI/signal and switch-soak integration tests.
2. Run a manual terminal matrix on Windows, macOS, Linux, and xterm.js at documented sizes.
3. Resolve what “archived” means for support and document the 20-versus-39 catalog.
4. Enable repository security settings and provide a real private reporting channel.
5. Add the basic community and release-maintenance files.
6. Confirm the AGPL strategy.

## Final recommendation

Keep `0.3.0` public and call it a **public beta**. Do not unpublish it based on this audit. The repository-side P0 fixes are now staged in this working tree; freeze the next publish until they are pushed, CI has run successfully, and the remaining tag/provenance/repository settings are configured.

The repository has a credible technical foundation: strict TypeScript, a meaningful deterministic test suite, a successful build, a working package shape, and no known dependency vulnerabilities. What it lacks is the boring machinery that makes those facts remain true after the next enthusiastic contribution or late-night release. Fixing CI, artifact traceability, and the self-dependency will deliver the largest risk reduction immediately.
