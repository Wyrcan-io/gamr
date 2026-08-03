#!/usr/bin/env node

import { allGames } from '../dist/index.js';
import { PlaytestRunner, createPlaytestRegistry } from '../dist/playtest.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const seedArgument = args.find(value => value.startsWith('--seed='));
const seed = seedArgument ? Number(seedArgument.slice('--seed='.length)) : undefined;
const requested = args.filter(value => !value.startsWith('--'));
const gameIds = requested.includes('--all') || requested.length === 0
  ? allGames.map(game => game.id)
  : requested;

const runner = new PlaytestRunner({ registry: createPlaytestRegistry(allGames) });
const reports = [];
for (const gameId of gameIds) {
  const report = await runner.run(gameId, { seed });
  reports.push(report);
  if (!json) {
    const mark = report.status === 'passed' ? 'PASS' : 'FAIL';
    console.log(`${mark} ${report.gameId} (${report.actionCount} actions, ${report.elapsedMs}ms)`);
    for (const failure of report.failures) console.log(`  - ${failure.kind}: ${failure.message}`);
  }
}

if (json) console.log(JSON.stringify(reports, null, 2));
if (reports.some(report => !['passed'].includes(report.status))) process.exitCode = 1;
