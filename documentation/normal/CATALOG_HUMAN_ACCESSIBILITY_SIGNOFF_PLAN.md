# Gamr catalog human, accessibility, and visual sign-off plan

**Created:** 2026-08-18  
**Catalog:** 20 active games  
**Prerequisite:** Compact `80x24` layout program complete  
**Outcome:** Every active game has current, reviewable evidence that a first-time player can understand and complete its taught unit, and that required state remains accessible across supported terminal modes

## 1. Decision

Automated playtests prove deterministic reachability, not comprehension. Human sign-off remains a separate release gate.

The existing final-eight plan requires 24 first-time-player sessions, three for each unsigned game. This catalog plan preserves valid prior evidence but does not assume that untracked sessions occurred. Begin with an evidence audit:

- if a prior per-game packet includes participant protocol, build SHA, dimensions, observations, explanation answers, findings, and retest outcome, import its redacted result into the catalog ledger;
- if any required element is absent, stale after material UI changes, or unavailable for review, run new sessions;
- if no valid evidence exists, the maximum baseline is 60 game-sessions: three independent first-time-player sessions for each of 20 games.

No game inherits sign-off from its cohort, readiness label, automated profile, or visual similarity to another game.

## 2. Privacy and participant rules

- Record a participant code, not a real name, email, employer, or account identifier.
- Obtain consent for notes and terminal capture before play.
- Do not record audio or video unless separately approved and securely stored.
- Keep compensation and contact records outside the repository.
- A participant must not have read the game's implementation plan or source.
- A participant may test more than one game only when order is counterbalanced and the ledger marks prior Gamr exposure.
- A developer who implemented the game cannot count as a first-time participant.
- Facilitators may resolve launch failures but may not coach controls, strategy, or interpretation.

## 3. Evidence audit

Create one 20-row ledger before recruitment:

| Field | Required value |
|---|---|
| Game and readiness | Current registry metadata |
| Last material UI commit | Commit affecting renderer, controller, help, content, or layout |
| Existing sessions | Count and evidence paths |
| Evidence validity | Valid, stale, incomplete, or absent |
| Missing modes | Compact, wide, ASCII, Contrast, keyboard, assistive review |
| Required new sessions | Integer with reason |
| Open findings | Severity and owner |
| Final decision | Pending, pass, conditional, or blocked |

An evidence packet becomes stale when later changes alter controls, first-run teaching, required information hierarchy, compact composition, action previews, or completion reporting.

## 4. Participant matrix

Each game requires at least three valid first-time sessions. Across those sessions, cover:

| Dimension | Minimum coverage per game |
|---|---|
| Terminal size | One `80x24`, one `80x28`, one `100x30` |
| Theme | Carbon, Paper, and Contrast represented |
| Glyph mode | At least one ASCII and one Unicode session |
| Input | Keyboard-only in every session |
| Platform | At least two terminal environments across the three sessions where practical |
| Outcome | Taught unit completed or a documented product blocker found |

Catalog-wide accessibility specialists additionally review:

- ANSI-stripped state equivalence and text-only captures;
- color-independent status and legality markers;
- high-contrast theme readability;
- ASCII/Unicode mechanical equivalence;
- focus, overlay, Escape, pause, quit, and restart consistency;
- flashing, rapid redraw, motion, and real-time timing burden;
- screen-reader feasibility and known alternate-buffer limitations;
- error, success, and progress messages without relying on spatial position alone.

Do not claim screen-reader support unless the tested terminal and output model actually provide it. Record limitations and a supported fallback such as stable text reports where full interactive support is not yet possible.

## 5. Session protocol

Use the same structure for every game:

1. Record build SHA, package version, game ID, seed, terminal, dimensions, theme, and glyph mode.
2. Give only the launch instruction and the neutral goal printed by the game.
3. Ask the participant to think aloud without the facilitator interpreting the interface.
4. Record time to first legal action.
5. Record time to first deliberate preview, forecast, inspection, or equivalent understanding action.
6. Ask the game-specific explanation task before commit where the design provides a preview.
7. Continue until the taught unit completes, the player chooses to stop, or a blocker is proven.
8. Ask the participant to explain the result, the most important cause, and what they would do next.
9. Ask which controls or labels they guessed, which state was uncertain, and whether color or symbols carried meaning they could not recover from text.
10. Record facilitator interventions exactly.

Use the explanation tasks already defined in cohort and final-eight plans. For any game without a current task, add one that checks causal understanding rather than recall of help text.

## 6. Metrics

Record, but do not turn arbitrary averages into pass criteria:

- time to first legal action;
- time to first meaningful consequence;
- time to taught-unit completion;
- incorrect control guesses repeated twice;
- help opens and exits;
- pause or quit attempts caused by overlay confusion;
- current/selected/projected/committed state confusion;
- hidden-information leakage assumptions;
- clipped or missed required facts;
- explanation-task correctness in the participant's own words;
- completion, abandonment, crash, or stuck outcome.

The important signal is repeated causal confusion, not speed alone.

## 7. Finding severity and response

| Severity | Definition | Required response |
|---|---|---|
| Blocker | Crash, stuck state, unreadable required state, inaccessible required control, or taught unit cannot complete | Stop the game cohort; fix and run a fresh three-session set for the affected path |
| Repeated | Same control, label, rule, or state confusion appears in two valid sessions | Fix, add automated coverage where possible, and retest with a fresh participant |
| Local | One participant has recoverable confusion without a repeated pattern | Record; fix when low risk; verify in final review |
| Cosmetic | Preference without effect on task, state, or access | Record separately; does not block alone |

Do not solve repeated confusion by adding more prose unless the missing information is genuinely explanatory. Prefer clearer state, control placement, causal preview, or report structure.

## 8. Execution order

Run sessions in cohorts after their compact evidence is complete:

1. Featured: Stack Trace, Five-Minute Kingdom, Dead Letter Department, Packet Panic.
2. Preview: Signal//Noise, Last Train Home.
3. Documents and evidence: Market of Mirrors, Rogue Ledger, Ghost Shift, Dice Tribunal, Time Capsule, Night Frequency.
4. Systems: Blackout Grid, Containment Protocol, Orbital Post, Botany Lab.
5. Maps and routes: The Quiet Heist, Tiny Fleet, Dungeon Courier, The 13th Lift.
6. Final catalog review: cross-game controls, terminology, accessibility, and visual consistency.

After each cohort, fix shared findings before testing the next cohort. Do not save all remediation for the end.

## 9. Visual sign-off

For every game, a reviewer inspects native-cell captures of:

- start or briefing;
- primary gameplay at a dense state;
- preview, forecast, review, or equivalent decision surface;
- help and pause;
- success and failure/report states;
- `80x24` Carbon, Paper, Contrast, and ASCII;
- `100x30` Carbon;
- below-minimum resize guidance.

The reviewer verifies no clipping, incoherent overlap, color-only meaning, broken wide glyphs, misleading controls, missing continuation cues, or loss of the game's distinct composition.

## 10. Evidence packet

```text
artifacts/human-validation/<run-date>/<game-id>/
  summary.md
  build-and-environment.md
  session-1.md
  session-2.md
  session-3.md
  retest-1.md
  accessibility-review.md
  visual-review.md
  findings.md
  signoff.md
```

The catalog root also contains:

```text
catalog-ledger.md
participant-assignment-redacted.md
cross-game-findings.md
accessibility-limitations.md
final-decision.md
```

## 11. Per-game sign-off gate

- [ ] Three valid first-time sessions or equivalent current evidence are reviewable.
- [ ] At least one participant completes the taught unit without coaching.
- [ ] The remaining sessions either complete it or produce resolved, retested findings.
- [ ] Explanation tasks show causal understanding rather than button recall.
- [ ] No blocking or repeated finding remains open.
- [ ] `80x24`, `80x28`, and `100x30` are represented.
- [ ] Carbon, Paper, Contrast, ASCII, and Unicode evidence is represented.
- [ ] Keyboard-only and color-independent operation pass.
- [ ] Assistive-technology limitations are explicit and not overstated.
- [ ] Visual reviewer signs all required phases.
- [ ] Automated regression covers every fixed blocker where feasible.

## 12. Catalog completion gate

- [ ] The ledger contains exactly 20 active games and no retired archive entries.
- [ ] Every row links current human, accessibility, and visual evidence.
- [ ] All missing sessions identified by the audit are complete.
- [ ] All blocking and repeated findings are fixed and freshly retested.
- [ ] Shared control and state vocabulary is consistent or intentionally game-specific.
- [ ] Compact-layout support remains green after all human-driven fixes.
- [ ] Full 20-game seeded regression passes from the sign-off commit.
- [ ] Typecheck, tests, build, CLI checks, and package smoke pass.
- [ ] Accessibility limitations and supported terminal assumptions are published honestly.
- [ ] Readiness decisions are recorded per game rather than inherited by cohort.
- [ ] The final decision names the exact commit and evidence date.

