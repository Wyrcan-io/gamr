# Documentation

The repository keeps only documentation that is currently actionable or remains useful as durable evidence and design context. Completed implementation plans are removed after their lasting decisions are reflected in source, tests, the README, changelog, or the current roadmap. Git history remains the archive.

## Active

- [`../PRODUCTION_READINESS_NEXT_PLAN.md`](../PRODUCTION_READINESS_NEXT_PLAN.md) - current production-readiness audit, priorities, release gates, and command checklist.
- [`normal/CATALOG_HUMAN_ACCESSIBILITY_SIGNOFF_PLAN.md`](normal/CATALOG_HUMAN_ACCESSIBILITY_SIGNOFF_PLAN.md) - detailed procedure for the human, terminal, accessibility, and visual evidence that is still outstanding.

## Durable records

- [`normal/FINAL_EIGHT_AUTOMATED_EVIDENCE_2026-08-11.md`](normal/FINAL_EIGHT_AUTOMATED_EVIDENCE_2026-08-11.md) - dated automated evidence from the final catalog migration batch. It is a historical record, not current status.
- [`games/GAME_IDEAS_RESEARCH.md`](games/GAME_IDEAS_RESEARCH.md) - original catalog ideation and research retained as design context, not implementation guidance.

## Documentation policy

- Put current user behavior and support promises in the root `README.md`.
- Put release-visible changes in `CHANGELOG.md`.
- Put security reporting and supported-version policy in `SECURITY.md`.
- Use a temporary implementation plan only for work that cannot be represented clearly in issues or pull requests.
- When a plan is complete, move any durable decision into the canonical document or an architecture decision record, then delete the plan.
- Date evidence reports and state the exact commit they describe.
- Do not leave multiple files claiming to be the current roadmap.
