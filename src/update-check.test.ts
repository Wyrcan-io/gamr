import { afterEach, describe, expect, it } from 'vitest';
import { checkForUpdatePassive, isNewerVersion } from './update-check';

describe('update checks', () => {
  afterEach(() => {
    delete process.env.GAMR_DISABLE_UPDATE_CHECK;
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
});
