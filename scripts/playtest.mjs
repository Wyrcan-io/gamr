#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { games } from '../dist/index.js';
import { PlaytestRunner, coverageSummary, createPlaytestRegistry, featuredCoverageGaps } from '../dist/playtest.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const seedArgument = args.find(value => value.startsWith('--seed='));
const seed = seedArgument ? Number(seedArgument.slice('--seed='.length)) : undefined;
const suiteArgument = args.find(value => value.startsWith('--suite='));
const suite = suiteArgument?.slice('--suite='.length) ?? 'all';
const artifactArgument = args.find(value => value.startsWith('--artifacts='));
const artifactRoot = artifactArgument?.slice('--artifacts='.length);
const requested = args.filter(value => !value.startsWith('--'));
const registry = createPlaytestRegistry(games);
if (args.includes('--coverage-report')) {
  const summary = coverageSummary(games, registry);
  console.log('GAME COVERAGE');
  for (const item of summary) console.log(`${item.group.padEnd(8)} ${String(item.coverage ?? 'missing').padEnd(22)} v${item.profileVersion}  ${item.gameId}`);
  const counts = summary.reduce((all, item) => {
    const key = item.coverage ?? 'missing';
    all[key] = (all[key] ?? 0) + 1;
    return all;
  }, {});
  console.log(`\nTOTAL ${summary.length}  GENERIC ${counts['generic-smoke'] ?? 0}  PROGRESS ${counts['black-box-progress'] ?? 0}  COMPLETE ${counts['seeded-completion'] ?? 0}`);
  process.exit(featuredCoverageGaps(games, registry).length > 0 ? 1 : 0);
}
const catalog = games;
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
