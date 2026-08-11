# Final Eight Automated Playtest Evidence

Run date: 2026-08-11  
Seed: `20260811`  
Terminal: `80x28` virtual terminal  
Build: production `dist` bundle from the verified working tree

## Result

All eight pending profiles passed their seeded-completion milestones:

| Game | Status | Actions | Elapsed |
| --- | --- | ---: | ---: |
| blackout-grid | PASS | 19 | 18.109s |
| containment-protocol | PASS | 13 | 1.120s |
| orbital-post | PASS | 25 | 2.069s |
| botany-lab | PASS | 40 | 3.266s |
| the-quiet-heist | PASS | 86 | 6.963s |
| tiny-fleet | PASS | 54 | 4.395s |
| dungeon-courier | PASS | 107 | 8.662s |
| the-13th-lift | PASS | 13 | 1.129s |

Machine-readable reports and terminal captures are in `artifacts/final-eight-20260811-clean/<game-id>/`.

## Verification commands

```text
npm.cmd run typecheck
npm.cmd run build
node scripts/playtest.mjs --seed=20260811 --artifacts=artifacts/final-eight-20260811-clean --json blackout-grid containment-protocol orbital-post botany-lab the-quiet-heist tiny-fleet dungeon-courier the-13th-lift
```

The playtest runner now uses a 30-second elapsed-time ceiling and 240 stalled-frame tolerance when invoked by the evidence script, which is necessary for real-time profiles such as Blackout Grid and for long traversal profiles such as Dungeon Courier.

Graphify refresh was attempted with `graphify update .`, but the executable is unavailable in this environment; no current graph state is claimed.

## Implementation notes

- Blackout Grid now has a verified restoration trace that closes both feeders, reaches both district loads, and holds the stability window.
- Tiny Fleet’s signal-drill training scenario now places the practice hulks within the taught targeting lesson, allowing the seeded battle to reach its mission report.
- Quiet Heist’s first tutorial job now provides a second jammer and one patrol guard, matching the documented tutorial escape lesson and making the seeded street-exit path completable.

## Human validation boundary

These are automated seeded-completion and evidence captures. No human participant sessions were run in this environment, so the 24 first-time-player sessions, accessibility observations, and human sign-off remain open gates in the migration plan. This report intentionally does not mark those sessions complete or claim a 20/20 formal sign-off.
