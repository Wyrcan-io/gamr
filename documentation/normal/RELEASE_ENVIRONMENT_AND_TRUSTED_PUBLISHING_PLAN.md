# Gamr protected release and npm trusted-publishing implementation plan

**Created:** 2026-08-18  
**Package:** `@wyrcan/gamr`  
**GitHub workflow:** `.github/workflows/publish.yml`  
**GitHub environment:** `release`  
**Outcome:** npm publication is approved, tag-bound, OIDC-authenticated, provenance-producing, and independent of long-lived npm write tokens

## 1. Starting state

The committed publish workflow already:

- runs for semantic `v*.*.*` tag pushes;
- grants `contents: read` and `id-token: write`;
- serializes publication through one concurrency group;
- uses a GitHub-hosted Ubuntu runner and Node 24;
- references `environment: release`;
- verifies that tag and package version agree;
- runs clean install, typecheck, tests, build, and package smoke;
- publishes publicly and notifies the site only after npm publication succeeds.

The repository cannot prove from source whether the GitHub environment exists or whether npm trusts this workflow. Those are account-level controls.

## 2. Fixed trust identity

Configure the npm trusted publisher with these exact values:

| Field | Value |
|---|---|
| Provider | GitHub Actions |
| Organization or user | `Wyrcan-io` |
| Repository | `gamr` |
| Workflow filename | `publish.yml` |
| Environment | `release` |
| Allowed action | `npm publish` |

The workflow filename is only the filename, not `.github/workflows/publish.yml`. Case and environment name must match exactly. The package `repository.url` must continue to resolve to `Wyrcan-io/gamr`.

Current npm requirements must be checked during implementation: trusted publishing requires npm 11.5.1 or newer and Node 22.14.0 or newer. Record the versions used by the release runner.

## 3. Phase 1: configure the GitHub environment

Create or inspect the `release` environment under repository settings.

Required policy:

- environment name exactly `release`;
- at least one required reviewer when a second eligible maintainer exists;
- prevent self-review when that second-reviewer path exists;
- deployment branches/tags restricted to selected tags matching `v*.*.*`;
- no general branch deployment path;
- no npm write token stored as an environment or repository secret;
- environment administrators and bypass behavior recorded.

The site notification token, if retained, is not an npm credential. Prefer moving it to a narrowly scoped environment or replacing it with a GitHub App or fine-grained token. Its repository scope and rotation owner must be documented separately.

### Environment exit gate

- [ ] A tag-triggered publish job pauses for environment approval.
- [ ] Unauthorized branches and non-version tags cannot deploy.
- [ ] Secrets are unavailable before protection rules pass.
- [ ] Self-review cannot be enabled in a way that deadlocks a single-maintainer repository.

## 4. Phase 2: configure npm trusted publishing

1. Sign in to npm with an owner or maintainer authorized for `@wyrcan/gamr`.
2. Open package settings and add a GitHub Actions trusted publisher.
3. Enter the fixed trust identity from section 2.
4. Allow `npm publish`, not staged publishing, unless a separate staged-release decision is approved.
5. Save the configuration and capture a redacted settings record.
6. Inventory existing granular, automation, and legacy npm tokens.
7. Keep the existing path available until one OIDC publication succeeds.
8. After success, revoke unused write-capable automation tokens and enable the strongest practical token restriction.

npm does not fully validate the trust record when it is saved. Exact matching is proven only by an actual publish attempt from the configured workflow.

## 5. Phase 3: harden the workflow contract

Before the first trusted release, verify or add checks for:

- Node version is at least 22.14.0;
- npm version is at least 11.5.1;
- workflow runs on GitHub-hosted runners;
- no `NODE_AUTH_TOKEN` or `NPM_TOKEN` is supplied to `npm publish`;
- tag version equals `package.json` and `package-lock.json` version;
- version does not already exist on npm;
- `master` contains the tagged commit;
- clean package install/import/bin smoke runs from the packed tarball;
- release notes and changelog contain the version;
- historical tags explicitly excluded from publication are handled before `v0.3.0` is pushed.

Keep `id-token: write` at workflow or publish-job scope and `contents: read` everywhere else. The site notification job must not inherit OIDC permission.

## 6. Phase 4: prove OIDC on the next real release

Do not create a throwaway npm version solely to test credentials. Use the next approved patch release:

1. Merge the release commit through protected `master`.
2. Confirm remote CI passes on the release commit.
3. Create and push the matching version tag.
4. Confirm the publish job waits for `release` approval.
5. Review the commit, version, changelog, package contents, and CI run before approval.
6. Approve the environment deployment.
7. Confirm npm publication succeeds without a long-lived npm write token.
8. Confirm package provenance links to the expected repository, workflow, and commit.
9. Confirm the site notification runs only after publication succeeds.
10. Confirm the published tarball passes install, import, CLI help, and CLI list checks.

## 7. Evidence packet

```text
artifacts/production-completion/trusted-publishing/
  github-environment.md
  npm-trusted-publisher.md
  token-inventory-redacted.md
  release-run.json
  npm-package-metadata.json
  provenance-verification.md
  final-decision.md
```

Never commit npm tokens, OIDC tokens, cookies, recovery codes, or full account screenshots containing private data.

## 8. Completion gate

- [ ] GitHub `release` environment exists and protects version-tag deployments.
- [ ] Review policy is enforceable for the actual maintainer set.
- [ ] npm trust identity exactly matches repository, workflow filename, and environment.
- [ ] Workflow and runner meet current Node/npm trusted-publisher minimums.
- [ ] Publish job contains no long-lived npm write token.
- [ ] First real OIDC release succeeds through environment approval.
- [ ] npm shows provenance for the published version.
- [ ] Unused write-capable npm tokens are revoked after successful migration.
- [ ] Site notification remains downstream of successful publication.
- [ ] Failure and recovery procedures are recorded.

## 9. Failure rules

- `ENEEDAUTH`: verify workflow filename, repository owner/name, environment, runner type, npm version, and `id-token: write` before changing credentials.
- Version already exists: stop; never attempt to overwrite or unpublish as a routine fix.
- Environment bypass needed: reject the run and repair policy unless there is a documented security emergency.
- Provenance absent: treat the release as incomplete and investigate repository visibility, OIDC use, and npm metadata before the next release.

Official references:

- https://docs.npmjs.com/trusted-publishers/
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments

