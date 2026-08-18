# Gamr remote CI and branch-protection implementation plan

**Created:** 2026-08-18  
**Repository:** `Wyrcan-io/gamr`  
**Protected target:** `master`  
**Workflow:** `.github/workflows/ci.yml`  
**Outcome:** Every merge and protected-branch update is gated by the repository's full remote verification matrix

## 1. Starting state

The committed CI workflow currently defines:

- push and pull-request triggers for `master`;
- read-only repository permissions;
- concurrency cancellation for superseded runs;
- Ubuntu Node 22, Ubuntu Node 24, and Windows Node 24 jobs;
- clean install, typecheck, tests, build, and packed-artifact smoke checks;
- SHA-pinned checkout and setup-node actions.

Local verification passes, but local files cannot prove that GitHub has run the workflow, that all required check contexts are available, or that branch protection is active.

## 2. Access prerequisites

- Repository administration permission for rulesets or branch protection.
- GitHub CLI authenticated for `Wyrcan-io`, or equivalent browser access.
- At least one successful remote CI run before required status checks are selected.
- A second maintainer if approval or prevent-self-review rules are enabled.

Do not enable a mandatory approving review when only one eligible maintainer exists. That creates an unrecoverable routine merge path rather than useful protection.

## 3. Phase 1: inventory remote CI

Record the following in `artifacts/production-completion/remote-ci/inventory.md`:

```powershell
gh auth status
gh workflow view ci.yml --repo Wyrcan-io/gamr
gh run list --repo Wyrcan-io/gamr --workflow ci.yml --limit 20
gh api repos/Wyrcan-io/gamr/actions/workflows/ci.yml
gh api repos/Wyrcan-io/gamr/rulesets
gh api repos/Wyrcan-io/gamr/branches/master/protection
```

Expected workflow check names are derived from the matrix job name:

- `Verify (ubuntu-latest, Node 22)`
- `Verify (ubuntu-latest, Node 24)`
- `Verify (windows-latest, Node 24)`

Verify names from a real run before configuring them. Do not assume the rendered GitHub check context from YAML alone.

### Inventory exit gate

- [ ] Workflow is active and recognized as `CI`.
- [ ] At least one recent push run and one recent pull-request run are visible.
- [ ] Each matrix job completed successfully.
- [ ] Logs show `npm ci`, typecheck, tests, build, and package smoke.
- [ ] Existing rulesets, branch protection, bypass actors, and required contexts are recorded.

## 4. Phase 2: bootstrap missing check contexts

If no successful pull-request run exists:

1. Create a documentation-only branch.
2. Open a pull request into `master`.
3. Confirm all three matrix jobs start automatically.
4. Resolve any Windows-specific, Node-version, permissions, or cache failures in the workflow.
5. Merge only after all checks pass under the temporary unprotected path.
6. Confirm the merge creates a successful push run on `master`.

This bootstrap happens before required status checks are selected because GitHub can only require contexts it has observed.

## 5. Phase 3: configure the `master` ruleset

Prefer one active repository ruleset targeting the default branch. Avoid layering an undocumented ruleset over legacy branch protection.

Required rules:

- target `master` exactly;
- require a pull request before merge;
- require all three verified CI contexts;
- require branches to be up to date before merge;
- require conversation resolution;
- block force pushes;
- block branch deletion;
- apply to administrators, with a narrowly documented emergency bypass;
- require one approving review only when a second eligible maintainer exists;
- dismiss stale approvals when review approval is required.

Recommended but separately decided:

- linear history, if the team accepts squash or rebase-only merges;
- signed commits, only after every maintainer and release automation path is ready;
- code-owner review, after a maintained `CODEOWNERS` file exists.

Do not require checks from third-party bots that are not consistently available to outside contributors.

## 6. Phase 4: canary the protection

Open a second documentation-only pull request and prove:

1. merge is blocked while checks are pending;
2. a deliberately failing test blocks merge;
3. a new commit invalidates the earlier check state and reruns CI;
4. the fixed commit passes all required contexts;
5. direct push to `master` is rejected for a non-bypass actor;
6. the authorized merge succeeds;
7. the resulting `master` push run is successful.

Revert the deliberate test failure in the same pull request before merge. Do not disable the ruleset during the canary.

## 7. Evidence packet

```text
artifacts/production-completion/remote-ci/
  inventory.md
  workflow-runs.json
  ruleset-before.json
  ruleset-after.json
  canary-pr.md
  final-decision.md
```

Redact user email addresses and authentication details. Repository names, run IDs, commit SHAs, check names, and ruleset IDs may remain.

## 8. Completion gate

- [ ] Push and pull-request triggers have successful remote evidence.
- [ ] All three matrix contexts are required.
- [ ] Required checks use strict/up-to-date branch evaluation.
- [ ] Pull requests and conversation resolution are required.
- [ ] Force push and branch deletion are blocked.
- [ ] Approval requirements cannot deadlock the current maintainer set.
- [ ] Canary PR proves pending, failing, stale, and passing behavior.
- [ ] Emergency bypass actors and procedure are documented.
- [ ] CI badge and contributor guidance are updated only after context names are stable.
- [ ] Final ruleset JSON and run links are recorded against a commit SHA.

## 9. Rollback

If protection blocks all legitimate maintainers, use the smallest temporary ruleset bypass, repair the specific actor or context, and restore enforcement immediately. Record who bypassed, why, the affected commit, and the time enforcement was restored. Never respond by deleting the whole ruleset without preserving its prior configuration.

