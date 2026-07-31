# Gamr Ten-Game Milestone — Production Readiness Review

## Executive verdict

The milestone is worth celebrating: the active Gamr lineup now contains ten original terminal games with unusually strong names, themes, and mechanical identities. The project is not suffering from a lack of ideas. It is suffering from the normal next-stage problem of an anthology: the code says “ten playable games,” while the product presentation suggests “ten equally finished games.” Those are not yet the same thing.

**The lineup is not production-ready as one uniform release today.** The underlying repository is healthy enough to continue toward production: strict TypeScript passes, the production build passes, and all 121 tests pass. The main blockers are product and experience issues rather than compiler failures:

- several advertised modes, upgrades, perks, or tutorial systems are incomplete or inert;
- at least seven games render content beyond their claimed 80-column minimum;
- several campaigns are too long to have no save/suspend system;
- the README describes a three-game active lineup while the registry contains ten;
- first-session difficulty is too high in much of the lineup;
- only 39 tests directly cover these ten games, with almost no renderer, lifecycle, or full-campaign coverage;
- there is no CI workflow that runs typecheck, tests, and build on pull requests.

The games can attract users, especially developers who like strange, thoughtful systems in the terminal. The strongest hooks are memorable: supernatural mail sorting, radio triangulation, a collapsing railway, program repair, and a readable stealth heist. The problem is not marketability of the ideas. The problem is whether the first five minutes consistently deliver the fantasy promised by the menu description.

The recommended release shape is:

- **Featured after a focused release pass:** Stack Trace, Dead Letter Department, Packet Panic, Five-Minute Kingdom.
- **Public beta:** Signal//Noise, Last Train Home.
- **Workshop / not featured yet:** Rogue Ledger, Containment Protocol, Ghost Shift, The Quiet Heist.

This does not mean deleting six games. It means being honest about maturity, concentrating player feedback, and avoiding the impression that unfinished systems are the final quality bar.

## What “production-ready” means here

For Gamr, production-ready should not mean “contains many features.” A small game is ready when it keeps a clear promise reliably.

A production-ready Gamr game should satisfy these gates:

1. **First win is learnable.** A new player can understand the core verb and achieve a small success within three minutes without reading source code or an external document.
2. **Every displayed feature works.** A mode, perk, tool, upgrade, control hint, or symbol is either implemented and tested or removed from the release build.
3. **The game fits its supported terminal.** Every normal, warning, pause, help, result, and ending screen is legible at 80×28 and in a light theme.
4. **Failure is causal.** The player can identify the action or visible rule that caused the loss and can retry the relevant unit without repeating excessive content.
5. **The default session respects its setting.** A game presented as a quick terminal break should usually finish in 5–15 minutes, or it needs save/suspend and clear session-length labeling.
6. **Controls are economical.** The starting interaction should expose no more than five meaningful gameplay controls. Advanced controls can appear when their rule is introduced.
7. **The full content path is verified.** Every authored case, scenario, shift, or puzzle has at least one completion transcript or equivalent validation.
8. **Terminal lifecycle is safe.** Stop, quit, restart, game switch, list-games, resize, and errors restore the cursor and alternate buffer and dispose listeners/intervals.
9. **Public documentation matches the executable.** Game count, active lineup, controls, descriptions, minimum terminal size, and maturity labels are current.

Under that standard, passing typecheck and tests is necessary but not enough.

## Audit scope and evidence

This review examined the ten entries in the active `games` registry:

1. Packet Panic
2. Dead Letter Department
3. Signal//Noise
4. Last Train Home
5. Rogue Ledger
6. Containment Protocol
7. Five-Minute Kingdom
8. Ghost Shift
9. Stack Trace
10. The Quiet Heist

The review covered registry metadata, README and menu presentation, controller lifecycle, input handling, minimum-size behavior, render layouts, engines, authored content, and tests. Current automated verification:

- `npm run typecheck`: pass
- `npm test`: 14 files, 121 tests passed
- `npm run build`: pass
- Direct tests for the ten active games: 39 total

This is a code and product-structure audit, not a substitute for observing new players. Claims about likely attraction and difficulty are reasoned predictions. Five to ten short playtests will be more valuable than another round of feature development.

## Lineup-level product assessment

### The collection has a strong identity

The best shared identity is not “terminal arcade games.” It is:

> **Small, stylish terminal games where every system is visible and every failure can be understood.**

That identity fits Dead Letter Department, Signal//Noise, Last Train Home, Stack Trace, Ghost Shift, and The Quiet Heist particularly well. It is distinct from collections of ASCII clones and more memorable than a generic “games for developers” pitch.

The current README still says the active TUI lineup is Packet Panic, Dead Letter Department, and Signal//Noise, while the executable registry has ten active games. It also describes the product as “quick arcade-style breaks,” even though nine of the ten active games are deliberate strategy, deduction, classification, or programming puzzles. This mismatch will attract the wrong expectation and make good games feel slow rather than intentionally thoughtful.

### Ten games is fine; ten featured games is not

Ten games is a healthy library size. It creates discovery, replay value, and contribution surface. The bloat risk comes from treating all ten as equal front-page choices without difficulty, duration, or maturity information.

The menu currently provides only a name and one description. A new player cannot tell whether they are choosing a three-minute placement game, a 74-letter campaign, a real-time network builder, or a programming puzzle.

Add lightweight metadata rather than more game mechanics:

```ts
interface GameInfo {
  id: string;
  name: string;
  description: string;
  maturity: 'featured' | 'beta' | 'workshop';
  pace: 'real-time' | 'turn-based';
  difficulty: 1 | 2 | 3;
  session: '5 min' | '10–15 min' | 'campaign';
}
```

The menu should default to a four-game Featured section, with “More games / Beta laboratory” below it. This is curation, not concealment.

### The collection leans too hard toward high cognitive load

The active lineup contains excellent variety in theme, but less variety in mental effort. Nine games ask the player to read a dense panel, learn custom rules, and make deliberate decisions. Packet Panic is the only strongly kinetic game. Five-Minute Kingdom is the closest relaxed game, but even it introduces terrain, citizens, laws, seasons, favour, and adjacency scoring.

This does not require adding more games. It requires making the easiest existing paths genuinely easy:

- make Five-Minute Kingdom the calm entry game;
- make Dead Letter Department the readable narrative entry game;
- make Packet Panic the energetic entry game;
- make Stack Trace the developer-focused entry game;
- place the denser simulation games behind a “Complex” label.

### Long campaigns conflict with “play while your code ships”

Dead Letter Department contains approximately 74 letter decisions across six shifts. Rogue Ledger contains 48 transactions across six quarters. Containment Protocol contains six increasingly long shifts. None provides persistent save/suspend.

For an open-source terminal break collection, the default playable unit should be one shift, one case, one scenario, or one puzzle. A campaign may link those units, but quitting should not erase a large session. The smaller solution is not necessarily a save system: offer **Quick Shift / Continue Campaign** and keep each unit satisfying on its own.

### Visual personality is strong, but layout verification is weak

The games use a consistent semantic language of boxes, pips, glyphs, warnings, logs, and restrained glitch titles. This is one of Gamr’s strongest assets.

However, the claimed 80×28 contract is not currently reliable:

- Rogue Ledger’s right panel reaches roughly column 96.
- Five-Minute Kingdom’s right panel reaches roughly column 96.
- Ghost Shift draws an 89-column box starting at column 3.
- Containment Protocol’s chamber panel reaches past column 80, and upgrade offers can render below row 28.
- Last Train Home’s map plus dispatch panel crosses column 80.
- Signal//Noise and Dead Letter Department have control/help lines longer than 80 columns.
- The games menu does not truncate long descriptions to its box width.

This is visible polish, not a theoretical edge case. A user who satisfies the displayed minimum can still receive clipped controls or broken borders.

### The open-source engineering base needs a release gate

The code is modular in the stronger games, and pure engines make contribution and testing easier. The inconsistent parts will become expensive as contributors arrive:

- some reducers clone state while others mutate it;
- several controllers duplicate lifecycle and pause code;
- some compact files place many unrelated statements on one line, raising contribution friction;
- only Stack Trace splits machine logic and engine logic comprehensively;
- no pull-request CI runs typecheck, tests, and build;
- `prepublishOnly` runs build but not tests or typecheck;
- renderer/layout and controller lifecycle have no automated tests.

Before inviting broad contributions, add one canonical game shell, a content-validation pattern, and a pull-request workflow. This prevents every new contributor from copying existing lifecycle bugs.

## Game-by-game scorecard

Scores are out of 5. “Entry clarity” measures how easily a new player can begin, not how shallow the game is.

| Game | Hook / appeal | Entry clarity | Current depth | Production confidence | Recommendation |
|---|---:|---:|---:|---:|---|
| Stack Trace | 4 | 4 | 4 | 4 | Closest to Featured |
| Dead Letter Department | 5 | 4 | 4 | 3 | Featured after trimming/fixes |
| Packet Panic | 5 | 3 | 4 | 3 | Featured after onboarding/lifecycle pass |
| Five-Minute Kingdom | 4 | 4 | 3 | 3 | Featured after small core fixes |
| Signal//Noise | 5 | 2 | 4 | 3 | Public beta |
| Last Train Home | 5 | 2 | 3 | 2 | Public beta after reachability/tutorial fixes |
| The Quiet Heist | 5 | 3 | 2 | 2 | Workshop vertical slice |
| Rogue Ledger | 4 | 2 | 2 | 2 | Workshop; rebalance core choice |
| Ghost Shift | 5 | 2 | 2 | 1 | Workshop; deduction model needs rebuilding |
| Containment Protocol | 4 | 1 | 3 | 1 | Workshop; simplify and remove inert systems |

No game should receive a permanent stigma from this table. “Workshop” is a useful public-development label for an open-source project and can itself attract contributors.

## Individual findings

### 1. Stack Trace — closest to production-ready

**Why users may like it:** The fantasy is immediate for Gamr’s developer audience: repair a small program, run visible tests, read a trace, and iterate. Ten authored puzzles, undo/redo, tiered hints, a deterministic virtual machine, and a daily selection create a complete-feeling loop without excessive systems.

**Difficulty:** Moderate for developers, potentially opaque for non-programmers. The puzzle curve is sensible: identity, addition, mutation, stack order, duplication, absolute value, and combined expressions. First-puzzle simplicity effectively teaches the tape even though the tutorial mode is light.

**Why it is strong from a maker perspective:** The VM is separated from the state reducer, reference programs exist, machine faults are tested, and authored puzzles use a compact data format. Features reinforce the central verb rather than creating side systems.

**Remaining release work:**

- make the first insertion/movement interaction explicitly guided;
- verify every puzzle’s reference program in one content-wide test, not only selected puzzles;
- explain the daily mode as a rotating authored puzzle rather than implying unique generated content;
- perform 80×28/light-theme/manual lifecycle checks;
- add a simple completion rank based on blocks, runs, and hints, without adding progression currency.

**Recommendation:** Make this the first Featured game and use its architecture as the reference for future puzzle games.

### 2. Dead Letter Department — strongest narrative system, too long and partly inert

**Why users may like it:** The title, premise, writing, four-destination decision, visible regulations, immediate audit, and supernatural case threads form one of the most marketable games in the collection. A player can understand “inspect letter, apply rule, choose desk” quickly. Wrong decisions explain themselves.

**Difficulty:** The early shift is approachable. Later rule precedence is satisfying rather than arbitrary because decisive evidence is visible. The larger problem is endurance: six shifts total roughly 74 letters, which is too long for a campaign with no suspend.

**Production blockers:**

- Tutorial mode is effectively Shift 1 with different copy, not a short guided induction.
- Five of eight perks have no meaningful implementation in the engine. `carbon-copy`, `priority-tray`, `wax-reference`, `audit-memory`, and `postmasters-key` are displayed promises without corresponding behavior. A player choosing them loses trust in the game.
- Several lines exceed 80 columns.
- Only three tests cover a large generator/rule/campaign surface.

**Simplest good version:** Remove the perk draft for Version 1 or keep only the three working perks. Reduce each default shift to 6–8 letters. Offer “Play one shift” and “Campaign” separately. Preserve regulations, verification, trust, audits, and case threads; those are the actual game.

**Recommendation:** Feature after cutting inert perks, shortening the default session, and adding full-shift seed validation tests.

### 3. Packet Panic — highest immediate energy, weak first minute

**Why users may like it:** It is the most animated and arcade-like member of the active lineup. Routing, topology, queue pressure, trace, malware, upgrades, particles, popups, and screen feedback support one coherent network-management fantasy. The upgrade effects are actually connected to engine values.

**Difficulty:** High immediately. The player faces four router types, rotation, salvage, purge, focus, protocol colors, queues, quota, trace, and a 250 ms simulation. The first placement immediately changes the tutorial phase to normal play. `tutorialStep` is never meaningfully advanced, so the visible tutorial is a prompt rather than a lesson.

**Production blockers:**

- the controller clears intervals/listeners but does not explicitly restore the cursor or alternate buffer on stop;
- tutorial selection and standard shift are not meaningfully differentiated;
- four topology tests do not cover upgrades, malware, sector transitions, game over, or controller cleanup;
- protocol is partly communicated through color, so monochrome/light-theme verification matters.

**Simplest good version:** Sector 1 should begin paused. Teach Link, Bend, destination matching, and Trace one at a time. Introduce Split in Sector 2, Firewall/malware later, and Purge only when malware first appears. Do not add more router types.

**Recommendation:** Feature after a real 60–90 second tutorial and terminal lifecycle fix.

### 4. Five-Minute Kingdom — best casual candidate, needs the smallest honest rule set

**Why users may like it:** Nine turns, a 5×5 board, three offers, preview-before-confirm, seasonal score reports, and a final chronicle form a calm and readable session. The board visibly becomes the player’s own creation. This should be the easiest strategy game in the collection.

**Difficulty:** Low to moderate. Placement and adjacency are understandable; citizens, terrain compatibility, laws, favour, seasonal scoring, and connectivity make the explanation denser than the board first suggests.

**Production blockers:**

- citizen generation derives `homeTerrain` from an empty tile, so it effectively defaults to `field`; much of the ten-citizen content is unreachable or rarely reachable;
- the footer advertises `I: INSPECT`, but the controller does not handle `I`;
- there is no tutorial mode or explicit first-turn guidance;
- the 80-column renderer reaches approximately column 96;
- the ending gives a number but no useful “small/strong/legendary” interpretation.

**Simplest good version:** Keep terrain, citizens, and at most three laws. Fix citizen offers based on existing compatible homes. Either implement a small inspect card or remove the `I` hint. Add three score ranks and no additional currencies or progression.

**Recommendation:** Feature after these contained fixes. It can become Gamr’s welcoming, low-pressure entry point.

### 5. Signal//Noise — excellent fantasy, intimidating instrument panel

**Why users may like it:** Tuning a spectrum, comparing stations, capturing bearings, seeing a regional fix, decoding a packet, and choosing a response is a distinctive and coherent fantasy. Six authored cases introduce echoes, interference, moving signals, mimicry, filters, and phase locks. The material is strong enough for a complete campaign.

**Difficulty:** High on first contact. The footer exposes tuning, bandwidth, modulation, gain, station switching, sweep, capture, notch, phase lock, and four responses at once. The tutorial uses the first campaign case and a different notice, but does not lock or stage controls.

**Production blockers:**

- only two engine tests cover six cases and do not prove a legal solution for each case;
- no content-wide transcript verifies the operation limits;
- long footer and broadcast lines clip at 80 columns;
- failed locks explain their reason, but the player receives little guidance about which one of several tuner dimensions to change first.

**Simplest good version:** In the tutorial, expose only Tune, Station, and Capture. Fix bandwidth/modulation/gain initially, then introduce one adjustment per later case. Keep Notch and Phase Lock as case-specific tools rather than always-visible controls.

**Recommendation:** Public beta. It has enough content, but needs onboarding and all-case solution tests before being Featured.

### 6. Last Train Home — compelling board, only one reachable campaign scenario

**Why users may like it:** The evacuation theme gives every routing decision emotional weight. Two actions, visible hazard forecasts, one-segment movement, repairs before hazards, and a clear people/supplies goal are a strong deterministic tactics foundation.

**Difficulty:** High. Selection alternates between tiles and trains; four numeric actions, routing, switching, holding, repair, clearing, and commit all compete for attention. The player must also infer track glyphs and movement order.

**Production blockers:**

- two scenarios exist in content, but campaign flow never advances `scenarioIndex`; after success, `N` launches the next game. The second scenario is unreachable in normal play.
- `tutorialStep` is initialized but not used, so Tutorial is the campaign scenario with a flag.
- the `R` route command always requests East; switch control is the actual way to choose other junction exits, making route control confusing/redundant;
- map plus dispatch panel exceeds 80 columns;
- only the first scenario’s basic mechanics are tested.

**Simplest good version:** Ship one polished scenario and one genuine three-turn tutorial first. Remove the redundant route command if switching the junction already expresses the decision. Add the second scenario only when campaign advancement and a solution transcript exist.

**Recommendation:** Public beta after fixing unreachable content. Do not add more hazards or train types yet.

### 7. The Quiet Heist — attractive vertical slice, not the planned full game

**Why users may like it:** Exact guard arrows, current versus forecast sight, two-action planning, decoys, alarm escalation, and an objective that switches escape routes are highly marketable. This may ultimately have the broadest appeal in the lineup.

**Difficulty:** Moderate conceptually, but the visual notation needs a guided first turn. Movement and commit are familiar; forecast reasoning is learnable if the renderer reliably distinguishes “seen now” from “seen on commit.”

**Production blockers:**

- only two jobs exist and share essentially the same floor;
- Tutorial and Campaign currently start the same job without a staged tutorial;
- the map displays a hiding spot, but there is no hide command or hide state;
- camera jamming is global rather than spatially constrained;
- only three tests exist and no complete clean/alert escape transcript proves either job;
- several mechanics in the full implementation plan are not present, so this is correctly a vertical slice rather than a release candidate.

**Simplest good version:** Remove the decorative hiding spot until hiding exists. Keep two jobs, but give them visibly different layouts and objectives. Add one full tutorial transcript, one clean solution, and one alert-recovery solution. A polished two-job game is better than advertising a six-job campaign that does not exist.

**Recommendation:** Workshop. Its core is promising enough to prioritize after the first four Featured games are stable.

### 8. Rogue Ledger — good comedy, dominant strategy undermines the game

**Why users may like it:** Improbable finance, visible entry projections, delayed liabilities, policy drafting, and an audit track create a funny and distinctive management fantasy. The presentation makes arithmetic visible before commitment.

**Difficulty:** High for a first session because it begins with five accounting treatments, tags, rules, categories, cash, profit, floor, audit, standing, liabilities, six quarters, and no tutorial/help overlay.

**Core design blocker:** Declining an expense has no meaningful cost. The obvious strategy is to decline expenses and book income. Reserve often behaves like Book. This makes much of the treatment system look deep without creating hard choices. More transactions or policies will not solve that.

**Other blockers:**

- 48 transactions are too long without suspend;
- the right-hand layout requires about 96 columns despite an 80-column minimum;
- terminal stop does not explicitly restore cursor/alternate buffer;
- four tests verify arithmetic mechanics but not quarter solvability, dominant strategies, or a full run;
- no guided first quarter exists.

**Simplest good version:** Reduce to three treatments with real trade-offs: Book, Defer, Decline. Give Decline a standing/reputation cost; make Defer a visible later liability; make Book affect cash/audit predictably. Use three quarters of five transactions for the initial release.

**Recommendation:** Workshop until the central choice is meaningful. Do not add more rules, categories, or transaction tags.

### 9. Ghost Shift — strong premise, deduction is currently mostly cosmetic

**Why users may like it:** Security cameras, door logs, badge checks, batteries, route manipulation, and evidence-based detention form an excellent deduction fantasy. Seven authored case briefs imply a strong campaign arc.

**Difficulty:** High because the player must understand rooms, cameras, doors, candidates, proof-source families, battery, deadline, and several operations. That complexity would be acceptable if the evidence model consistently supported genuine deductions.

**Core design blocker:** Camera evidence currently supports the intruder’s cover identity and contradicts every other candidate directly. The candidate filter does not actually reconcile schedules, route timing, tier permissions, and silhouettes as the design promises. A common solution becomes “wake a useful camera, query the newest badge event, detain the one remaining possible candidate.” The printed deduction depth is larger than the implemented deduction depth.

**Other blockers:**

- employee schedules exist in content but are not meaningfully used by candidate assessment;
- After-Hours mode loads the same authored opening case rather than a separate replay system;
- renderer calls for room selection/help affordances that are limited or not fully implemented;
- an 89-column box at column 3 does not fit 80 columns;
- five tests validate operations, not the proof validity of all seven cases.

**Simplest good version:** Remove After-Hours mode. Ship three cases only after candidate assessment derives contradictions from silhouette, badge tier, and route timing. Each detention should print two exact evidence links. Keep batteries, cameras, badge query, and door lock; defer probes if they do not create distinct deductions.

**Recommendation:** Workshop. Rebuild the evidence core before adding content or polish.

### 10. Containment Protocol — the clearest case of feature overreach

**Why users may like it:** Four rooms with unknown anomaly reactions, free configuration before a committed cycle, visible pressure, power shedding, doors, technician position, and incident logs create a good systems puzzle. The authored anomaly rules are flavorful and deterministic.

**Difficulty:** Very high. A player immediately sees room selection, three lamp modes, four sound modes, doors, technician movement, probes, power capacity, battery, integrity, pressure, faults, rules, help, and logs.

**Production blockers:**

- five of six upgrades are stored and displayed but have no engine effect; only Reserve changes battery;
- `H` is consumed by the Hush audio command before the Help branch, making Help unreachable during play;
- briefing advertises `R` for rules, but briefing input does not handle it;
- Night Watch is a hard-coded campaign shift rather than a developed mode;
- panel width exceeds 80 columns, and three upgrade choices can render below row 28;
- only three tests cover a six-shift campaign and no full-shift solution;
- moving the technician and using a probe immediately resolve a cycle, adding an important exception to the “configure freely, Enter commits” promise.

**Simplest good version:** Remove upgrades, Night Watch, Help/Rules/Log commands that are not separate screens, and either technician movement or probes for Version 1. Keep lamp, audio, pressure, power, and four rooms. Use three shifts, each introducing one anomaly axis. Once that is enjoyable, restore one additional system at a time.

**Recommendation:** Workshop and simplify aggressively. This game currently has the most features and the least reliable first-session clarity.

## Are the games too hard?

Some are. More precisely, **too many games are hard in the same way**: they expose the complete control surface before the player has learned the core relationship.

Difficulty itself is not a problem for the target audience. Unstaged complexity is the problem. A fair complex game lets the player form this chain:

```text
I changed one thing
        ↓
the display predicted one consequence
        ↓
I committed
        ↓
the consequence happened
        ↓
I now understand one rule
```

Several games instead begin with eight controls and three resource meters, which forces the player to memorize a manual before gaining intuition.

Recommended first-session targets:

| Difficulty label | First session promise | Suitable games |
|---|---|---|
| Easy | 3–5 controls, no irreversible first-turn failure, 5–8 minutes | Five-Minute Kingdom, Dead Letter Department |
| Medium | One preview/forecast system, forgiving first mistake, 8–12 minutes | Stack Trace, The Quiet Heist, Packet Panic after tutorial |
| Complex | Multiple panels/resources, tutorial required, 12–20 minutes | Signal//Noise, Last Train Home, Rogue Ledger, Ghost Shift, Containment Protocol |

The menu should display these labels. Complex games are attractive when the player opts into them.

## Will the games attract users?

They can attract a specific and valuable audience: developers, terminal enthusiasts, systems-puzzle players, and people who enjoy compact narrative interfaces. The original themes are a much stronger acquisition asset than the number “ten.”

Most likely discovery hooks:

1. **Dead Letter Department** — strongest name/premise for screenshots and social sharing.
2. **The Quiet Heist** — most broadly understandable game fantasy once complete.
3. **Packet Panic** — best moving visual and immediate clip/GIF potential.
4. **Signal//Noise** — most distinctive instrument-panel aesthetic.
5. **Stack Trace** — strongest direct fit for the current “developers in a terminal” audience.

What will reduce adoption today:

- stale README and incomplete game catalog;
- no screenshots or short terminal recordings for the new lineup;
- no session-length/difficulty labels;
- clipped 80-column layouts;
- modes and perks that do not do what their text promises;
- long campaigns with no suspend;
- AGPL-3.0 may be appropriate for a community copyleft project, but it will reduce adoption by teams seeking a permissively embeddable library. If “free to use” means maximum third-party integration, review the licensing strategy separately; this is a product consideration, not legal advice.

Do not measure attraction only by stars or installs. For these games, the useful early signals are:

- percentage of players who start a game and complete its tutorial;
- first successful decision/turn time;
- completion rate for the first playable unit;
- number of restarts before quitting;
- which game is selected first and second;
- whether players can explain why they failed;
- issue/discussion comments that mention clarity, delight, or confusion.

## Anti-bloat design rules

Use a small “complexity budget” for every active game.

### The one-page rule

Each game should be describable on one help page containing:

- one core verb;
- one primary objective;
- one loss pressure;
- no more than five starting controls;
- no more than three persistent resources;
- one sentence explaining turn/tick order.

If the help page needs a second page, the extra system should be introduced later or cut.

### A feature earns its place only if it passes four tests

1. The player can see its effect.
2. It creates a decision not already created by another feature.
3. The game introduces it through play.
4. A test proves its behavior.

If it fails one of these, remove it from Version 1. This rule would currently remove several DLD perks, most Containment upgrades, Ghost Shift’s After-Hours label, Last Train Home’s unused tutorial flag, and decorative hiding in The Quiet Heist.

### Prefer content depth over system count

One strong mechanic can support multiple cases when content changes the situation:

- Stack Trace changes programs and tests without changing the editor.
- Signal//Noise changes transmitters and interference without needing another tuner control.
- Dead Letter Department changes rule combinations without needing eight perks.
- The Quiet Heist can change floor layout and patrol intent without adding combat or an inventory tree.

This is the right direction for a small open-source collection.

## Recommended release plan

### Phase 0 — Stop adding games and establish the release bar

Do not add game 11 yet. Freeze new mechanics for the ten active games until these global tasks are complete:

1. Add pull-request CI for typecheck, all tests, and build on Ubuntu and Windows.
2. Make `prepublishOnly` run typecheck and tests before build.
3. Create a shared controller shell for alternate-buffer entry/exit, cursor restoration, intervals, listeners, pause actions, and resize.
4. Add a renderer smoke harness that inspects every phase at 80×28 and 100×32 in dark and light themes.
5. Update README game count, active lineup, descriptions, controls, and maturity labels.
6. Truncate/wrap game-menu descriptions and show difficulty/session metadata.
7. Add one manual release checklist covering start, help, pause, restart, game list, next game, quit, game over, victory, and resize.

### Phase 1 — Prepare four Featured games

Polish in this order:

1. **Stack Trace:** content-wide reference tests and first-action guidance.
2. **Five-Minute Kingdom:** citizen-offer fix, remove/implement Inspect, 80-column layout, simple ranks.
3. **Dead Letter Department:** remove inert perks, shorten/segment shifts, layout fix, seed-batch validation.
4. **Packet Panic:** real tutorial, staged controls, cleanup, sector transition tests.

The target is four games that feel finished, not ten games that feel nearly finished.

### Phase 2 — Run small player tests

Recruit 5–10 people who have not read the plans. Give each person two games:

- one Easy/Medium Featured game;
- one Complex beta game.

Do not explain controls verbally. Observe the first ten minutes and record:

- first key pressed;
- time to first meaningful success;
- where they consult Help;
- any control they believe should work but does not;
- any outcome they cannot explain;
- the moment they smile, become curious, or disengage.

Fix repeated confusion before adding content. One observation repeated by three players is more important than an untested feature idea.

### Phase 3 — Promote betas selectively

- Promote Signal//Noise after staged onboarding, 80-column repair, and six solution transcripts.
- Promote Last Train Home after one real tutorial, reachable scenario progression, simplified routing, and two solution transcripts.
- Choose either The Quiet Heist or Ghost Shift as the next major development focus; both occupy adjacent readable-stealth/deduction territory. Do not expand both simultaneously.

### Phase 4 — Rework or archive workshop games

- Rebalance Rogue Ledger around three meaningful treatments.
- Simplify Containment Protocol to its lamp/audio/pressure core.
- Rebuild Ghost Shift’s evidence assessment before producing more cases.
- Complete The Quiet Heist as a polished two-job release before considering a six-job campaign.

Archiving a workshop build is not failure. Open-source projects earn trust by distinguishing experiments from supported experiences.

## Final recommendation

Gamr should present itself as a curated anthology, not a feature race. The project already has enough ideas to attract users. What it needs now is trust:

- the menu promise matches the actual game;
- the controls shown are the controls that work;
- a perk changes something real;
- the screen fits when it says it fits;
- a tutorial is meaningfully easier than campaign play;
- a failure can be explained;
- a five-minute game respects five minutes.

The right milestone message is not “we have ten production-ready games.” It is:

> **We have ten original playable games, four approaching a strong first release, two ready for public testing, and four promising experiments open for contributors.**

That is an honest, attractive open-source story. The next major gain will come from subtraction, onboarding, layout discipline, and playtesting—not from game 11 or another layer of upgrades.
