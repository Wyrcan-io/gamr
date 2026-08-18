import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { createGamrPlaytestrAdapter, createGamrPlaytestrTarget } from './playtestr-adapter';

describe('Playtestr adapter', () => {
  it('creates a dependency-free external target contract', () => {
    const target = createGamrPlaytestrTarget('blackout-grid', { cliPath: 'dist/cli.js', cwd: process.cwd() });
    expect(target.manifest).toMatchObject({ schemaVersion: 1, id: 'gamr:blackout-grid', command: process.execPath, env: { NO_COLOR: '1' } });
    expect(target.manifest.args).toEqual([resolve('dist/cli.js'), 'blackout-grid', '--reduced-motion']);
    expect(target.adapter.bootstrapActions[0]?.key).toBe('t');
    expect(target.adapter.objectives.some(objective => objective.kind === 'completion')).toBe(true);
  });

  it('resolves a relative CLI path from the target working directory', () => {
    const cwd = resolve('nested-gamr-checkout');
    const target = createGamrPlaytestrTarget('blackout-grid', { cliPath: 'dist/cli.js', cwd });
    expect(target.manifest.cwd).toBe(cwd);
    expect(target.manifest.args[0]).toBe(resolve(cwd, 'dist/cli.js'));
  });

  it('maps existing Gamr milestone detectors into adapter evidence', () => {
    const adapter = createGamrPlaytestrAdapter('blackout-grid');
    const text = 'TRAINING RESTORATION COMPLETE\nCITY STABLE';
    const evidence = adapter.analyze({
      observation: { at: 10, cols: 100, rows: 32, text, lines: text.split('\n'), changed: true, alternateBuffer: true },
      observationIndex: 4,
      actions: [],
    });
    expect(evidence.milestones).toContain('training-complete');
    expect(evidence.completion).toBe(true);
  });
});
