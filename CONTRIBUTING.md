# Contributing to gamr

Thanks for helping improve gamr. Before opening a pull request:

1. Install Node.js 22 or newer (see `package.json` `engines`).
2. Run `npm ci`.
3. Run `npm run prepublishOnly`. This includes formatting, source policy, type-aware linting, typechecking, unit tests, build, CLI/PTY lifecycle checks, render budgets, and packed-install smoke tests.
4. Keep game code self-contained and update the registry and README when adding a game.
5. Do not commit secrets, generated `dist/` files, or local environment files.

Pull requests should explain the player-facing change and include tests or a short manual verification note where automated coverage is not practical.

For a faster inner loop, run `npm run check:format`, `npm run lint`, `npm run typecheck`, and the focused Vitest file. Before requesting review, run the complete gate above.
