#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { allGames } from '../dist/index.js';
import { archiveGames, games } from '../dist/index.js';
import { PlaytestRunner, createPlaytestRegistry } from '../dist/playtest.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const seedArgument = args.find(value => value.startsWith('--seed='));
const seed = seedArgument ? Number(seedArgument.slice('--seed='.length)) : undefined;
const suiteArgument = args.find(value => value.startsWith('--suite='));
const suite = suiteArgument?.slice('--suite='.length) ?? 'all';
const artifactArgument = args.find(value => value.startsWith('--artifacts='));
const artifactRoot = artifactArgument?.slice('--artifacts='.length);
const requested = args.filter(value => !value.startsWith('--'));
const registry = createPlaytestRegistry(allGames);
const catalog = args.includes('--active') ? games : args.includes('--archive') ? archiveGames : allGames;
const selectedCatalog = suite === 'smoke'
  ? catalog
  : catalog.filter(game => suite === 'progression'
    ? registry.get(game.id)?.coverage !== 'generic-smoke'
    : suite === 'completion'
      ? registry.get(game.id)?.coverage === 'seeded-completion'
      : true);
const gameIds = requested.length > 0 ? requested : selectedCatalog.map(game => game.id);

const runner = new PlaytestRunner({ registry });
const reports = [];
for (const gameId of gameIds) {
  const report = await runner.run(gameId, { seed });
  reports.push(report);
  if (artifactRoot) {
    const runRoot = `${artifactRoot}/${gameId}`;
    await mkdir(runRoot, { recursive: true });
    await writeFile(`${runRoot}/report.json`, JSON.stringify(report, null, 2));
    await writeFile(`${runRoot}/replay.json`, report.replay);
    await writeFile(`${runRoot}/last-screen.txt`, report.terminalText);
  }
  if (!json) {
    const mark = report.status === 'passed' ? 'PASS' : 'FAIL';
    console.log(`${mark} ${report.gameId} [${report.coverage ?? 'unknown'}] (${report.actionCount} actions, ${report.elapsedMs}ms)`);
    for (const failure of report.failures) console.log(`  - ${failure.kind}: ${failure.message}`);
  }
}

if (json) console.log(JSON.stringify(reports, null, 2));
if (reports.some(report => !['passed'].includes(report.status))) process.exitCode = 1;
