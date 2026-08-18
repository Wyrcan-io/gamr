import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = resolve('scripts/npm-dist-tag.mjs');

describe('npm release distribution tags', () => {
  it('keeps prereleases away from the latest channel', () => {
    expect(execFileSync(process.execPath, [script, 'v0.4.0-beta.1'], { encoding: 'utf8' }).trim()).toBe('beta');
  });

  it('promotes stable versions to latest', () => {
    expect(execFileSync(process.execPath, [script, 'v0.4.0'], { encoding: 'utf8' }).trim()).toBe('latest');
  });

  it('rejects malformed release identifiers', () => {
    const result = spawnSync(process.execPath, [script, 'not-a-version'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Release must be a semantic version');
  });
});
