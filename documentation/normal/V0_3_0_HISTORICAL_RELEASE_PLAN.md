# Gamr historical v0.3.0 verification and release plan

**Created:** 2026-08-18  
**Published package:** `@wyrcan/gamr@0.3.0`  
**Candidate source commit:** `ba95579744daa11c580b109aafd049a1005e4ff5`  
**Candidate commit subject:** `Release @wyrcan/gamr 0.3.0`  
**Outcome:** Establish a truthful source tag and non-latest GitHub release for the already-published npm artifact without republishing or modifying that artifact

## 1. Starting state and hazard

The candidate commit exists and its `package.json` declares version `0.3.0`. Local tags currently include `v0.3.1` and `v0.3.2`, but not `v0.3.0`.

The current publish workflow reacts to every tag matching `v*.*.*`. Pushing `v0.3.0` without first changing that workflow would start a job that attempts to publish npm version 0.3.0 again. npm versions are immutable, and the downstream site job could also receive a misleading event if skip behavior is implemented incorrectly.

Therefore the historical tag is blocked until the publish workflow explicitly excludes `v0.3.0` from both publication and site notification.

## 2. Non-negotiable rules

- Never run `npm publish` for version 0.3.0 again.
- Never attach a newly rebuilt tarball and represent it as the original npm artifact.
- Never move `v0.3.0` after it is pushed.
- Do not mark the historical GitHub release as latest.
- Do not claim byte-for-byte reproducibility unless hashes prove it.
- Preserve discrepancies in the evidence record rather than explaining them away.

## 3. Phase 1: capture npm evidence

Record registry metadata before changing git:

```powershell
npm.cmd view @wyrcan/gamr@0.3.0 version time gitHead dist.integrity dist.shasum dist.tarball --json
npm.cmd pack @wyrcan/gamr@0.3.0 --json
```

Store the downloaded registry tarball outside tracked source or under an ignored temporary evidence directory. Record its SHA-256, npm integrity, file list, package metadata, exports, bin entry, dependency list, and unpacked size.

If npm metadata contains `gitHead`, it must equal the candidate source commit. If it is absent or differs, pause tag creation and investigate the actual publish source.

## 4. Phase 2: verify the candidate commit

Use a temporary detached worktree at the candidate commit. Do not switch or reset the main worktree.

Verify:

- commit date and subject align with npm publication timing;
- package name and version are exactly `@wyrcan/gamr` and `0.3.0`;
- repository URL and license match the published package metadata;
- lockfile and dependency set are consistent with the tarball;
- `npm ci`, tests, typecheck where defined, build, and package creation succeed using the historical toolchain constraints;
- packed file names and public exports agree with the registry tarball;
- CLI help/list and library import behavior agree at the supported boundary.

Classify comparisons separately:

| Result | Meaning | Decision |
|---|---|---|
| Exact tarball hash match | Rebuild is byte-for-byte reproducible | Record both hashes and proceed |
| File/content match with metadata-only differences | Source correspondence is strong but build is not reproducible | Document normalized differences and proceed after review |
| Material code or public-surface difference | Candidate is not proven as published source | Stop and locate the correct commit |
| Missing registry evidence | Source cannot yet be verified | Keep the gate blocked |

Source correspondence, not a forced rebuild hash, is the minimum requirement for a truthful historical source tag.

## 5. Phase 3: make historical tag creation inert

Before creating the tag, merge a protected change to `.github/workflows/publish.yml` that prevents `v0.3.0` from running either publish or site-notification behavior.

Preferred trigger contract:

```yaml
on:
  push:
    tags:
      - 'v*.*.*'
      - '!v0.3.0'
```

Also retain a version-exists preflight in the publish job for defense in depth. A successful "already exists" no-op must not satisfy the site notification dependency.

Verify the workflow syntax, merge through protected `master`, and confirm remote CI passes before the tag is pushed.

## 6. Phase 4: create and push the tag

After source verification and publish exclusion pass:

1. Create an annotated tag `v0.3.0` at the full candidate SHA.
2. Include a message stating that it is a historical source tag for the npm release published on 2026-08-02.
3. Sign the tag if the project's tag-signing policy is established; do not improvise a one-off identity.
4. Have a second reviewer verify the tag object and target when available.
5. Push only `refs/tags/v0.3.0`.
6. Confirm no Publish workflow run starts for the historical tag.
7. Confirm `v0.3.1` and `v0.3.2` remain unchanged.

## 7. Phase 5: create the GitHub release

Create a release from the existing `v0.3.0` tag with:

- title `@wyrcan/gamr 0.3.0`;
- publication date context of 2026-08-02;
- a clear note that this GitHub release was reconstructed later for source traceability;
- summary based on the historical commit and published package, not current `master`;
- a link to the npm version page;
- no newly rebuilt package tarball attached as an original asset;
- `latest` explicitly false;
- prerelease false, unless historical npm metadata proves otherwise.

Verify the release target resolves to `ba95579744daa11c580b109aafd049a1005e4ff5` and that repository visitors still see the intended current release as latest.

## 8. Evidence packet

```text
artifacts/production-completion/v0.3.0-history/
  npm-metadata.json
  registry-tarball.sha256
  registry-file-list.txt
  candidate-build.txt
  normalized-comparison.md
  tag-object.txt
  github-release.json
  workflow-run-check.md
  final-decision.md
```

## 9. Completion gate

- [ ] npm metadata and tarball are captured without modification.
- [ ] Candidate commit is proven to correspond to the published source.
- [ ] Any non-reproducible differences are documented precisely.
- [ ] Publish workflow excludes `v0.3.0` before tag creation.
- [ ] Historical tag is annotated and targets the full candidate SHA.
- [ ] Tag push starts no npm publish or site-notification job.
- [ ] GitHub release uses the existing tag and is not marked latest.
- [ ] No rebuilt tarball is represented as the original npm artifact.
- [ ] Current tags and releases remain unchanged.
- [ ] Final traceability record links npm version, commit, tag, and GitHub release.

## 10. Stop conditions

Stop and do not create the tag if npm `gitHead` points elsewhere, the package contents materially differ from the candidate, the publish exclusion is not active on the default branch, or the release target cannot be reviewed. Historical completeness is valuable only when it is truthful.

