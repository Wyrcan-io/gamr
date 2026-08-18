# Gamr production-completion program plan

**Created:** 2026-08-18  
**Scope:** Remote CI, protected publishing, historical release traceability, compact terminal support, and catalog-wide human sign-off  
**Starting state:** 20 active games, 20/20 seeded regression passing, 56 test files and 223 tests passing, package version 0.3.2  
**Program outcome:** Close the remaining repository, release, layout, accessibility, and human-validation gates without conflating automated success with production readiness

**Implementation update (2026-08-18):** Compact gameplay is now automated and green for all 20 games at `80x24`; the suite has 56 passing files and 228 passing tests. The publish workflow excludes the historical `v0.3.0` tag. Remote GitHub settings, the GitHub release, the local annotated tag, and human sign-off remain external gates because this workspace has no authenticated GitHub CLI or writable Git metadata.

## 1. Decision

The remaining work is one coordinated production-completion program with five independently auditable workstreams:

1. confirm remote CI and protect `master`;
2. configure the protected `release` environment and npm trusted publishing;
3. verify and publish the historical `v0.3.0` source tag and GitHub release;
4. make `80x24` the supported compact gameplay floor for all 20 games;
5. complete first-time-player, accessibility, and visual sign-off across the active catalog.

No workstream may claim completion from configuration screenshots alone. Each one must produce machine-readable or reviewable evidence, identify the exact repository state it evaluated, and leave a repeatable verification path.

## 2. Source-verified baseline

| Surface | Current repository state | Open gate |
|---|---|---|
| Catalog | Exactly 20 active games | Human and accessibility sign-off is not recorded for the full catalog |
| Automated verification | Typecheck, 56 test files, 223 tests, production build, and 20/20 seeded regression pass | Remote GitHub checks must be confirmed and required |
| CI | `ci.yml` runs Ubuntu Node 22/24 and Windows Node 24 | Successful remote contexts and branch rules are not evidenced locally |
| Publishing | `publish.yml` uses `id-token: write`, Node 24, `environment: release`, tag/version verification, and package smoke tests | GitHub environment and npm trusted publisher are external configuration |
| Release history | Local tags contain `v0.3.1` and `v0.3.2`; commit `ba955797...` declares 0.3.0 | `v0.3.0` tag and GitHub release are absent locally |
| Launcher layout | Launcher supports `60x20` and has a compact single-column path | Gameplay support is inconsistent |
| Game layout | Stack Trace and The 13th Lift accept `80x24`; the other 18 games currently require `80x28` | Establish and verify one catalog-wide `80x24` contract |
| Human evidence | Automated artifacts exist; no catalog-wide human-session packets are tracked under `artifacts/` | Audit prior evidence, run missing sessions, fix repeated confusion, and sign off |

## 3. Dependency order

```text
Remote CI confirmation and branch protection
        |
        +--> Protected release environment and npm trust
        |
        +--> Safe historical v0.3.0 reconstruction
        |
        +--> Compact 80x24 implementation
                  |
                  +--> Human, accessibility, and visual sign-off
                                |
                                +--> Production-readiness decision
```

Remote CI is first because every later repository change needs a trusted merge gate. Release configuration and compact implementation may proceed in parallel after that gate exists. Human sessions begin only after the compact layout contract is stable so participant evidence is not collected against a moving interface.

## 4. Workstream plans

| Workstream | Plan | Completion evidence |
|---|---|---|
| Remote CI and branch rules | `REMOTE_CI_AND_BRANCH_PROTECTION_PLAN.md` | Workflow-run inventory, required-check proof, protected-branch canary PR |
| Release environment and npm OIDC | `RELEASE_ENVIRONMENT_AND_TRUSTED_PUBLISHING_PLAN.md` | Environment policy record, trusted-publisher record, first OIDC publication evidence |
| Historical 0.3.0 traceability | `V0_3_0_HISTORICAL_RELEASE_PLAN.md` | Artifact comparison, annotated tag, non-latest GitHub release, no republish attempt |
| Compact terminal layout | `COMPACT_TERMINAL_LAYOUT_PLAN.md` | 20/20 `80x24` matrix, resize/lifecycle tests, terminal captures |
| Human catalog sign-off | `CATALOG_HUMAN_ACCESSIBILITY_SIGNOFF_PLAN.md` | Per-game session packets, accessibility matrix, visual review, signed ledger |

## 5. Shared evidence rules

Every workstream records:

- date, commit SHA, package version, operator, and relevant tool versions;
- commands or UI paths used, with secrets and personal participant data removed;
- expected and actual result;
- unresolved findings with owner and blocking severity;
- a final decision of `pass`, `conditional`, or `blocked`.

Store repository-operation evidence under `artifacts/production-completion/<workstream>/`. Store participant evidence under `artifacts/human-validation/<run-date>/<game-id>/`. Large transient downloads, credentials, npm tokens, and unredacted participant records must not be committed.

## 6. Change-control rules

- Use pull requests for every code or workflow change after branch protection is active.
- Do not weaken a required check to merge a failing change; fix the failure or document a time-bounded ruleset bypass.
- Do not create or push `v0.3.0` until the publish workflow cannot react to that historical tag.
- Do not add `NPM_TOKEN` to the publish job after trusted publishing is configured.
- Do not lower the compact target below `80x24` in this program.
- Do not count coached developer play as a first-time-player session.
- Do not promote readiness labels solely because automated or layout gates pass.

## 7. Program completion gate

- [ ] Remote CI has successful push and pull-request runs on all three matrix jobs.
- [ ] `master` rejects direct unverified changes, force pushes, and deletion.
- [ ] The `release` environment has reviewed deployment protection and tag restrictions.
- [ ] npm trusts exactly `Wyrcan-io/gamr`, `publish.yml`, environment `release`, for publish access.
- [ ] A real OIDC release publishes without a long-lived npm write token and shows provenance.
- [ ] Historical `v0.3.0` points to verified source and has a non-latest GitHub release.
- [ ] Pushing `v0.3.0` did not run the package publish or site-notification jobs.
- [ ] All 20 games preserve required information and controls at `80x24`.
- [ ] All 20 pass the compact, standard, wide, theme, ASCII, and lifecycle matrices.
- [ ] Human evidence is valid for all 20 games, with missing sessions completed.
- [ ] Every blocking or repeated human finding is fixed and retested with a fresh participant.
- [ ] Accessibility and visual reviewers sign the final catalog ledger.
- [ ] Typecheck, tests, build, full playtest regression, CLI checks, and package smoke pass from the final commit.
- [ ] README, changelog, support floor, and release documentation match the shipped behavior.
- [ ] A separate production-readiness decision is recorded; completion is not represented as an automatic 1.0 release.
