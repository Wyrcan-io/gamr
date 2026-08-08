# Graph Report - .  (2026-08-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2483 nodes · 6556 edges · 78 communities (77 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `11f0527d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- botany-lab/engine.ts
- tiny-fleet/engine.ts
- dice-tribunal/render.ts
- night-frequency/engine.ts
- dispatchGameQuit
- orbital-post/engine.ts
- playtest/index.ts
- signal-noise/engine.ts
- stack-trace/engine.ts
- last-train-home/engine.ts
- dead-letter-department/engine.ts
- containment-protocol/engine.ts
- games/index.ts
- ghost-shift/engine.ts
- the-quiet-heist/engine.ts
- packet-panic/engine.ts
- time-capsule/content.ts
- time-capsule/engine.ts
- themes/index.ts
- archived.ts
- create.ts
- blackout-grid/engine.ts
- five-minute-kingdom/engine.ts
- rogue-ledger/engine.ts
- dungeon-courier/engine.ts
- hyper-fighter/index.ts
- crack/index.ts
- getCurrentThemeColor
- hyper-fighter/engine.ts
- market-of-mirrors/engine.ts
- blackout-grid/types.ts
- dungeon-courier/render.ts
- solver.ts
- compilerOptions
- the-13th-lift/types.ts
- applyCommand
- hyper-fighter/ai.ts
- ui/terminal.ts
- blackout-grid/render.ts
- five-minute-kingdom/render.ts
- the-13th-lift/engine.ts
- package.json
- chopper/index.ts
- gameTransitions.ts
- market-of-mirrors/index.ts
- packet-panic/render.ts
- the-13th-lift/generator.ts
- time-capsule/render.ts
- dead-letter-department/render.ts
- characters.ts
- scenario.ts
- breakout/index.ts
- topology.ts
- the-13th-lift/render.ts
- evaluateAction
- devDependencies
- scripts
- playtest.mjs
- makeFloor
- keywords
- blackout-grid/engine.test.ts
- minesweeper/index.ts
- dungeon-courier/engine.test.ts
- applyCommand
- rogue-ledger/index.ts
- exports
- isValidPosition
- pack-smoke.mjs
- start.mjs
- slideLogic.ts
- resolveBell
- verify-release.mjs
- dependencies
- peerDependenciesMeta
- repository
- engines

## God Nodes (most connected - your core abstractions)
1. `getCurrentThemeColor()` - 83 edges
2. `dispatchGameQuit()` - 77 edges
3. `navigateMenu()` - 67 edges
4. `dispatchGameSwitch()` - 66 edges
5. `dispatchGamesMenu()` - 66 edges
6. `renderSimpleMenu()` - 48 edges
7. `PAUSE_MENU_ITEMS` - 42 edges
8. `applyCommand()` - 21 edges
9. `applyCommand()` - 20 edges
10. `applyCommand()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `runBlackoutGridGame()` --indirect_call--> `render()`  [INFERRED]
  src/games/blackout-grid/index.ts → .agents/skills/game-dev/templates/game-scaffold.ts
- `runPacketPanicGame()` --indirect_call--> `render()`  [INFERRED]
  src/games/packet-panic/index.ts → .agents/skills/game-dev/templates/game-scaffold.ts
- `runRogueLedgerGame()` --indirect_call--> `render()`  [INFERRED]
  src/games/rogue-ledger/index.ts → .agents/skills/game-dev/templates/game-scaffold.ts
- `applyStress()` --indirect_call--> `event()`  [INFERRED]
  src/games/dungeon-courier/engine.ts → src/games/blackout-grid/engine.ts
- `resolveTurn()` --indirect_call--> `event()`  [INFERRED]
  src/games/last-train-home/engine.ts → src/games/blackout-grid/engine.ts

## Import Cycles
- None detected.

## Communities (78 total, 1 thin omitted)

### Community 0 - "botany-lab/engine.ts"
Cohesion: 0.05
Nodes (105): CHAMBER_NEIGHBOURS, CHAMBER_ORDER, CONTRACT_BY_ID, CONTRACT_TEMPLATES, EXPRESSION_BY_ID, EXPRESSIONS, LAMP_COST, LAMP_MODES (+97 more)

### Community 1 - "tiny-fleet/engine.ts"
Cohesion: 0.05
Nodes (94): chooseEnemyOrders(), desiredDirection(), helmOrder(), rangeByClass, cloneScenario(), p(), SCENARIOS, ship() (+86 more)

### Community 2 - "dice-tribunal/render.ts"
Cohesion: 0.06
Nodes (95): advocateById(), ADVOCATES, balancedDice(), caseById(), CASES, die(), EVIDENCE, evidenceById() (+87 more)

### Community 3 - "night-frequency/engine.ts"
Cohesion: 0.05
Nodes (89): BRIEF, CALLERS, CANDIDATES, candidatesFor(), EVIDENCE, FACTION_COPY, ROUND_OFFERS, TRACK_OFFERS (+81 more)

### Community 4 - "dispatchGameQuit"
Cohesion: 0.05
Nodes (85): Game2048Controller, Particle, run2048Game(), ScorePopup, TILE_BG_COLORS, TILE_COLORS, TILE_NAMES, UndoState (+77 more)

### Community 5 - "orbital-post/engine.ts"
Cohesion: 0.06
Nodes (81): cloneTemplate(), FAULTS, JOB_TEMPLATES, JobTemplate, SHIFTS, UPGRADES, WEATHER, activeFaults() (+73 more)

### Community 6 - "playtest/index.ts"
Cohesion: 0.05
Nodes (46): allGames, DeterminismRestore, installDeterminism(), initialMilestones(), observation(), PlaytestRunner, PlaytestRunnerOptions, replayFor() (+38 more)

### Community 7 - "signal-noise/engine.ts"
Cohesion: 0.06
Nodes (67): CASES, activeCase(), applyCommand(), applyEvents(), capture(), cloneDefinition(), CommandResult, createState() (+59 more)

### Community 8 - "stack-trace/engine.ts"
Cohesion: 0.07
Nodes (58): campaignPuzzles(), puzzleById(), PUZZLES, TUTORIAL_IDS, dailyDate(), dailyPuzzleId(), activePuzzle(), applyCommand() (+50 more)

### Community 9 - "last-train-home/engine.ts"
Cohesion: 0.07
Nodes (61): addEvent(), applyCommand(), canEnter(), clearObstruction(), cloneScenario(), createState(), DELTAS, freshScenario() (+53 more)

### Community 10 - "dead-letter-department/engine.ts"
Cohesion: 0.07
Nodes (56): BODY_TEMPLATES, CASE_THREADS, POSTMARKS, RECIPIENTS, SEALS, Sender, SENDERS, advanceToNextShift() (+48 more)

### Community 11 - "containment-protocol/engine.ts"
Cohesion: 0.08
Nodes (51): ANOMALIES, AnomalyDef, ROOM_NAMES, ROOMS, ShiftDef, SHIFTS, UPGRADES, anomalyGlyph() (+43 more)

### Community 12 - "games/index.ts"
Cohesion: 0.07
Nodes (65): DiceTribunalController, runDiceTribunalGame(), HackController, RebootController, GamesMenuController, GamesMenuOptions, dispatchLaunchGame(), GAME_EVENTS (+57 more)

### Community 13 - "ghost-shift/engine.ts"
Cohesion: 0.07
Nodes (51): cams, CASES, doors, people, activeDef(), addEvidence(), addLog(), applyCommand() (+43 more)

### Community 14 - "the-quiet-heist/engine.ts"
Cohesion: 0.09
Nodes (49): addIncident(), applyCommand(), briefing(), clone(), commit(), createState(), currentVision(), dirFor() (+41 more)

### Community 15 - "packet-panic/engine.ts"
Cohesion: 0.07
Nodes (47): addTrace(), advance(), BLOCKS, Board, BOARD_HEIGHT, BOARD_WIDTH, chooseUpgrade(), clonePosition() (+39 more)

### Community 16 - "time-capsule/content.ts"
Cohesion: 0.06
Nodes (38): actions, actors, anchors, endings, EPISODES, items, leads, room() (+30 more)

### Community 17 - "time-capsule/engine.ts"
Cohesion: 0.12
Nodes (41): effect(), actionAvailable(), actionsForCurrentRoom(), actionVisible(), advanceTick(), anchorFor(), anchorSummary(), applyActorSchedules() (+33 more)

### Community 18 - "themes/index.ts"
Cohesion: 0.07
Nodes (36): cliArgs, createDomEvent(), createNodeTerminal(), Disposable, EventHandler, eventListeners, heldKeys, KEY_CODES (+28 more)

### Community 19 - "archived.ts"
Cohesion: 0.06
Nodes (30): archivedGames, makeThemeDescription(), MenuEntry, Section, GameInfo, Building, Coin, Obstacle (+22 more)

### Community 20 - "create.ts"
Cohesion: 0.10
Nodes (38): addToIndex(), doCreate(), findOrSetupRepo(), findRepoRoot(), getGames(), getUserGames(), isCliGamesRepo(), launchClaude() (+30 more)

### Community 21 - "blackout-grid/engine.ts"
Cohesion: 0.14
Nodes (37): activeDistricts(), activeNode(), addLog(), advance(), advanceStage(), applyUpgrade(), canRepair(), clamp() (+29 more)

### Community 22 - "five-minute-kingdom/engine.ts"
Cohesion: 0.09
Nodes (34): adjacent(), allPositions(), applyCommand(), Cell, Citizen, citizenHomes, citizenNames, CITIZENS (+26 more)

### Community 23 - "rogue-ledger/engine.ts"
Cohesion: 0.09
Nodes (35): applyCommand(), CATEGORIES, Category, CategoryId, closeQuarter(), Command, createState(), currentTransaction() (+27 more)

### Community 24 - "dungeon-courier/engine.ts"
Cohesion: 0.09
Nodes (32): ParcelDefinition, SEAL_LABELS, UPGRADES, acceptState(), clone(), DELTAS, directionFromDelta(), directionFromKeys() (+24 more)

### Community 25 - "hyper-fighter/index.ts"
Cohesion: 0.10
Nodes (32): COMBO_MESSAGES, FlashState, FloatingText, GEM_ANSI, Particle, PARTICLE_CHARS, Projectile, renderEnergyBar() (+24 more)

### Community 26 - "crack/index.ts"
Cohesion: 0.20
Nodes (9): CRACK_PAUSE_MENU_ITEMS, CrackController, FAKE_IPS, LOG_MESSAGES, Particle, PASSWORDS, runCrackGame(), ScorePopup (+1 more)

### Community 27 - "getCurrentThemeColor"
Cohesion: 0.14
Nodes (26): runHackEffect(), getActiveMatrixController(), handleMatrixKeypress(), isMatrixWaitingForKey(), MatrixController, runMatrixEffect(), startMatrixRain(), runRebootEffect() (+18 more)

### Community 28 - "hyper-fighter/engine.ts"
Cohesion: 0.12
Nodes (27): applyAttackModifiers(), BOARD_COLS, calculateStepAttack(), checkGameOver(), COLORS, CounterAttackResult, createBoard(), createPlayerState() (+19 more)

### Community 29 - "market-of-mirrors/engine.ts"
Cohesion: 0.08
Nodes (27): Action, ActionResolution, Artifact, BellResolution, cloneMarket(), cloneState(), Commission, createFactions() (+19 more)

### Community 30 - "blackout-grid/types.ts"
Cohesion: 0.08
Nodes (25): DISTRICT_CONTENT, DistrictContent, TUTORIAL_COPY, UPGRADES, BlackoutGridController, HELP_LINES, BreakerState, Command (+17 more)

### Community 31 - "dungeon-courier/render.ts"
Cohesion: 0.18
Nodes (26): ITEMS, PARCELS, offerLabel(), parcelMeterLabel(), previewText(), samePoint(), tileGlyph(), visibleThreatAt() (+18 more)

### Community 32 - "solver.ts"
Cohesion: 0.13
Nodes (25): landingMap(), canonicalMap(), cloneLandings(), enumerateCandidateWorlds(), enumerateRoutes(), evaluateRoute(), filterWorlds(), findConstraintViolation() (+17 more)

### Community 33 - "compilerOptions"
Cohesion: 0.08
Nodes (25): DOM, DOM.Iterable, ES2022, src/**/*, src/**/*.test.ts, compilerOptions, declaration, declarationMap (+17 more)

### Community 34 - "the-13th-lift/types.ts"
Cohesion: 0.10
Nodes (24): CONTRACTS, LANDING_BLUEPRINTS, LandingBlueprint, landingsForWindow(), PASSENGER_ARCHETYPES, START_STORY, AnomalyKind, ButtonId (+16 more)

### Community 35 - "applyCommand"
Cohesion: 0.20
Nodes (24): addEvent(), advanceTicks(), applyCommand(), applyStress(), beginContract(), clamp(), consumeItem(), doBrace() (+16 more)

### Community 36 - "hyper-fighter/ai.ts"
Cohesion: 0.13
Nodes (23): AIState, aiTick(), cloneBoard(), createAIState(), DIFFICULTIES, DifficultyConfig, evaluateBoard(), evaluatePlacement() (+15 more)

### Community 37 - "ui/terminal.ts"
Cohesion: 0.18
Nodes (16): palette, textFrame(), renderWidth(), frame(), palette, upgradeChoices(), model(), palette (+8 more)

### Community 38 - "blackout-grid/render.ts"
Cohesion: 0.20
Nodes (21): districtContent(), center(), clamp(), edgeAt(), lineForCell(), meter(), nodeAt(), nodeColor() (+13 more)

### Community 39 - "five-minute-kingdom/render.ts"
Cohesion: 0.26
Nodes (21): cellName(), displayName(), iconFor(), labelFor(), briefingFrame(), center(), endingFrame(), eventLines() (+13 more)

### Community 40 - "the-13th-lift/engine.ts"
Cohesion: 0.20
Nodes (19): contractForShift(), storyBeat(), applyCommand(), applyStoryOutcome(), applyTransitResolution(), clone(), createState(), currentBeat() (+11 more)

### Community 41 - "package.json"
Cohesion: 0.10
Nodes (20): author, bin, gamr, bugs, url, description, files, homepage (+12 more)

### Community 42 - "chopper/index.ts"
Cohesion: 0.18
Nodes (18): addPopup(), DELIVERY_MESSAGES, getRandomDeliveryMessage(), MAX_PARTICLES, Particle, Popup, spawnFirework(), spawnParticles() (+10 more)

### Community 43 - "gameTransitions.ts"
Cohesion: 0.12
Nodes (18): DeadLetterDepartmentController, runDeadLetterDepartmentGame(), FakeTerminal, FiveMinuteKingdomController, runFiveMinuteKingdomGame(), FakeTerminal, BOOT_MESSAGES, EXIT_MESSAGES (+10 more)

### Community 44 - "market-of-mirrors/index.ts"
Cohesion: 0.11
Nodes (17): currentBids(), displayGood(), FactionId, FACTIONS, GameState, GOOD_BY_ID, GoodId, GOODS (+9 more)

### Community 45 - "packet-panic/render.ts"
Cohesion: 0.21
Nodes (20): getPorts(), bar(), center(), endFrame(), header(), helpFrame(), inventory(), line() (+12 more)

### Community 46 - "the-13th-lift/generator.ts"
Cohesion: 0.20
Nodes (18): PassengerArchetype, renderCluePredicate(), allTruePredicates(), buildPassengers(), chooseLandings(), clone(), clueFor(), createRide() (+10 more)

### Community 47 - "time-capsule/render.ts"
Cohesion: 0.29
Nodes (20): episode(), formatClock(), anchorText(), boxBottom(), boxSides(), boxTop(), clockMeter(), draftText() (+12 more)

### Community 48 - "dead-letter-department/render.ts"
Cohesion: 0.32
Nodes (19): availablePerks(), rulesText(), auditFrame(), briefingFrame(), center(), destinationLines(), documentLines(), header() (+11 more)

### Community 49 - "characters.ts"
Cohesion: 0.12
Nodes (19): akuma, CHAR_GRID, Character, CHARACTERS, chunLi, dan, devilotte, donovan (+11 more)

### Community 50 - "scenario.ts"
Cohesion: 0.22
Nodes (16): stableSeedForPreview(), buildStages(), createBlueprint(), district(), edge(), microgrid(), p(), ScenarioBlueprint (+8 more)

### Community 51 - "breakout/index.ts"
Cohesion: 0.22
Nodes (8): Ball, BreakoutController, Brick, Laser, Particle, PowerUp, runBreakoutGame(), ScorePopup

### Community 52 - "topology.ts"
Cohesion: 0.20
Nodes (16): activeEdge(), selectedAsset(), selectedSource(), toggleBreaker(), adjacency(), Adjacent, buildAssignments(), canCloseEdge() (+8 more)

### Community 53 - "the-13th-lift/render.ts"
Cohesion: 0.26
Nodes (15): box(), center(), color(), fit(), landingName(), passengerLine(), renderAudit(), renderGame() (+7 more)

### Community 54 - "evaluateAction"
Cohesion: 0.17
Nodes (16): artifactBids(), bidFor(), commitAction(), createRumor(), displayFaction(), evaluateAction(), factionName(), frameDirection() (+8 more)

### Community 55 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, tsup, @types/node, typescript, vitest, @xterm/xterm, peerDependencies, @xterm/xterm (+5 more)

### Community 56 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, pack:smoke, playtest, prepublishOnly, start, start:build (+3 more)

### Community 57 - "playtest.mjs"
Cohesion: 0.18
Nodes (10): args, artifactArgument, artifactRoot, json, registry, reports, requested, runner (+2 more)

### Community 58 - "makeFloor"
Cohesion: 0.25
Nodes (8): blankTile(), carve(), getUpgradeChoices(), makeFloor(), makeOffers(), upgradeChoices(), createRng(), mixSeed()

### Community 59 - "keywords"
Cohesion: 0.20
Nodes (10): keywords, 2048, asteroids, cli, games, pong, snake, terminal (+2 more)

### Community 60 - "blackout-grid/engine.test.ts"
Cohesion: 0.31
Nodes (8): applyCommand(), createState(), cycleSelection(), selectableIds(), running(), upgradeChoices(), runBlackoutGridGame(), validateBlueprint()

### Community 61 - "minesweeper/index.ts"
Cohesion: 0.22
Nodes (8): Cell, DIFFICULTIES, Difficulty, MinesweeperController, NUMBER_COLORS, Particle, runMinesweeperGame(), ScorePopup

### Community 62 - "dungeon-courier/engine.test.ts"
Cohesion: 0.25
Nodes (8): createState(), initialItems(), initialState(), startRun(), startStandard(), walk(), Direction, GameState

### Community 63 - "applyCommand"
Cohesion: 0.31
Nodes (8): applyCommand(), commissionFor(), createState(), makeMarket(), quote(), RECIPES, startDay(), runMarketOfMirrorsGame()

### Community 64 - "rogue-ledger/index.ts"
Cohesion: 0.29
Nodes (5): render(), at(), box(), RogueLedgerController, runRogueLedgerGame()

### Community 65 - "exports"
Cohesion: 0.29
Nodes (7): exports, ./playtest, ./themes, import, types, import, types

### Community 66 - "isValidPosition"
Cohesion: 0.33
Nodes (7): dropPair(), getGhostPosition(), getSecondaryPos(), hardDrop(), isValidPosition(), movePair(), rotatePair()

### Community 67 - "pack-smoke.mjs"
Cohesion: 0.33
Nodes (4): installDir, packDir, root, tempRoot

### Community 68 - "start.mjs"
Cohesion: 0.33
Nodes (4): child, cliPath, root, sourceMtime

### Community 69 - "slideLogic.ts"
Cohesion: 0.53
Nodes (4): canMakeMove(), hasReachedTarget(), slide(), SlideResult

### Community 71 - "resolveBell"
Cohesion: 0.33
Nodes (6): beliefFor(), factionOrders(), formatMoney(), frameName(), resolveBell(), RumorFrame

### Community 73 - "verify-release.mjs"
Cohesion: 0.50
Nodes (3): expected, packageJson, root

### Community 74 - "dependencies"
Cohesion: 0.67
Nodes (3): @clack/prompts, dependencies, @clack/prompts

### Community 75 - "peerDependenciesMeta"
Cohesion: 0.67
Nodes (3): peerDependenciesMeta, @xterm/xterm, optional

### Community 76 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **505 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+500 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getCurrentThemeColor()` connect `getCurrentThemeColor` to `botany-lab/engine.ts`, `rogue-ledger/index.ts`, `tiny-fleet/engine.ts`, `dispatchGameQuit`, `chopper/index.ts`, `containment-protocol/engine.ts`, `games/index.ts`, `gameTransitions.ts`, `market-of-mirrors/index.ts`, `time-capsule/engine.ts`, `breakout/index.ts`, `archived.ts`, `hyper-fighter/index.ts`, `crack/index.ts`, `minesweeper/index.ts`, `blackout-grid/types.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `dispatchGameQuit()` connect `dispatchGameQuit` to `botany-lab/engine.ts`, `tiny-fleet/engine.ts`, `stack-trace/engine.ts`, `containment-protocol/engine.ts`, `games/index.ts`, `time-capsule/engine.ts`, `archived.ts`, `hyper-fighter/index.ts`, `crack/index.ts`, `getCurrentThemeColor`, `blackout-grid/types.ts`, `chopper/index.ts`, `gameTransitions.ts`, `market-of-mirrors/index.ts`, `breakout/index.ts`, `blackout-grid/engine.test.ts`, `minesweeper/index.ts`, `applyCommand`, `rogue-ledger/index.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `navigateMenu()` connect `dispatchGameQuit` to `botany-lab/engine.ts`, `rogue-ledger/index.ts`, `tiny-fleet/engine.ts`, `stack-trace/engine.ts`, `chopper/index.ts`, `containment-protocol/engine.ts`, `gameTransitions.ts`, `games/index.ts`, `market-of-mirrors/index.ts`, `time-capsule/engine.ts`, `breakout/index.ts`, `archived.ts`, `hyper-fighter/index.ts`, `crack/index.ts`, `getCurrentThemeColor`, `minesweeper/index.ts`, `blackout-grid/types.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _505 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `botany-lab/engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05051480051480051 - nodes in this community are weakly interconnected._
- **Should `tiny-fleet/engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051138294257560314 - nodes in this community are weakly interconnected._
- **Should `dice-tribunal/render.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056633663366336635 - nodes in this community are weakly interconnected._