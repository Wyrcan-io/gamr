import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { allGames, setReducedMotion, setTheme } from '../dist/index.js';
import { resetPlaytestWindowListeners, VirtualTerminal } from '../dist/playtest.js';

const sizes = [
  { cols: 80, rows: 24 },
  { cols: 100, rows: 30 },
  { cols: 160, rows: 50 },
];
const themes = ['carbon', 'paper', 'contrast'];
const MAX_STARTUP_MS = 250;
const MAX_RESIZE_MS = 25;
const MAX_WIDE_TO_COMPACT_BYTES = 6;
const delay = (ms) => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
const percentile = (values, fraction) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
};

setReducedMotion(true);
const startupSamples = [];
const resizeSamples = [];
const bytesByGameTheme = new Map();

for (const theme of themes) {
  setTheme(theme);
  for (const game of allGames) {
    const emitted = [];
    for (const size of sizes) {
      resetPlaytestWindowListeners();
      const terminal = new VirtualTerminal(size);
      const startedAt = performance.now();
      const controller = game.run(terminal);
      await delay(75);
      const startupMs = performance.now() - startedAt;
      startupSamples.push(startupMs);
      assert.ok(startupMs <= MAX_STARTUP_MS, `${game.id} ${theme} ${size.cols}x${size.rows} startup took ${startupMs.toFixed(1)}ms`);
      assert.equal(terminal.screen.snapshot().wrappedLines, 0, `${game.id} ${theme} ${size.cols}x${size.rows} wrapped output`);

      const beforeWrites = terminal.writes.length;
      const resizedAt = performance.now();
      terminal.resize(size.cols, size.rows);
      const resizeMs = performance.now() - resizedAt;
      if (terminal.writes.length > beforeWrites) resizeSamples.push(resizeMs);
      assert.ok(resizeMs <= MAX_RESIZE_MS, `${game.id} ${theme} ${size.cols}x${size.rows} resize took ${resizeMs.toFixed(1)}ms`);
      emitted.push(terminal.writes.reduce((total, write) => total + Buffer.byteLength(write), 0));

      controller.stop();
      assert.equal(controller.isRunning, false, `${game.id} remained active after benchmark stop`);
      assert.deepEqual(terminal.listenerCounts, { key: 0, data: 0, resize: 0 }, `${game.id} leaked terminal listeners`);
      terminal.dispose();
      resetPlaytestWindowListeners();
    }
    bytesByGameTheme.set(`${game.id}:${theme}`, emitted);
  }
}

for (const [label, emitted] of bytesByGameTheme) {
  const compact = Math.max(1, emitted[0]);
  const wideRatio = emitted[2] / compact;
  assert.ok(wideRatio <= MAX_WIDE_TO_COMPACT_BYTES, `${label} wide output grew ${wideRatio.toFixed(2)}x over compact output`);
}

console.log(
  `Render benchmark passed for ${allGames.length} games x ${themes.length} themes x ${sizes.length} sizes: `
  + `startup p95 ${percentile(startupSamples, 0.95).toFixed(1)}ms, `
  + `resize p95 ${percentile(resizeSamples, 0.95).toFixed(1)}ms.`,
);
