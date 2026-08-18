import { afterEach, describe, expect, it } from 'vitest';
import {
  checkForUpdatePassive,
  formatUpdateNotice,
  isNewerVersion,
  shouldRefreshUpdateCache,
} from './update-check';

describe('update checks', () => {
  afterEach(() => {
    delete process.env.GAMR_DISABLE_UPDATE_CHECK;
    delete process.env.NO_COLOR;
  });

  it('can be disabled for offline and automated environments', async () => {
    process.env.GAMR_DISABLE_UPDATE_CHECK = '1';
    await expect(checkForUpdatePassive()).resolves.toBeNull();
  });

  it('compares stable and prerelease versions correctly', () => {
    expect(isNewerVersion('0.3.0', '0.3.0-beta.2')).toBe(true);
    expect(isNewerVersion('0.3.0-beta.3', '0.3.0-beta.2')).toBe(true);
    expect(isNewerVersion('0.3.0-beta.2', '0.3.0')).toBe(false);
  });

  it('backs off briefly after a failed registry check', () => {
    const now = 10_000_000;
    expect(shouldRefreshUpdateCache(null, now)).toBe(true);
    expect(shouldRefreshUpdateCache({ checkedAt: now - 30_000, latest: null, failed: true }, now)).toBe(false);
    expect(shouldRefreshUpdateCache({ checkedAt: now - 3_600_000, latest: null, failed: true }, now)).toBe(true);
  });

  it('keeps successful checks cached for a day', () => {
    const now = 100_000_000;
    expect(shouldRefreshUpdateCache({ checkedAt: now - 3_600_000, latest: '1.0.0' }, now)).toBe(false);
    expect(shouldRefreshUpdateCache({ checkedAt: now - 86_400_000, latest: '1.0.0' }, now)).toBe(true);
  });

  it('formats cached notices without SGR sequences when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';
    const notice = formatUpdateNotice('1.0.0', '1.1.0');
    expect(notice).toContain('1.0.0 → 1.1.0');
    expect(notice).not.toMatch(/\x1b\[[0-9;]*m/u);
  });
});
