import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  error: vi.fn(),
  execFileSync: vi.fn(),
  select: vi.fn(),
  spinnerStart: vi.fn(),
  spinnerStop: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFileSync: mocks.execFileSync,
  spawn: vi.fn(),
}));

vi.mock('@clack/prompts', () => ({
  cancel: vi.fn(),
  confirm: mocks.confirm,
  intro: vi.fn(),
  isCancel: (value: unknown) => value === Symbol.for('test-cancel'),
  log: {
    error: mocks.error,
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  note: vi.fn(),
  outro: vi.fn(),
  select: mocks.select,
  spinner: () => ({ start: mocks.spinnerStart, stop: mocks.spinnerStop }),
  text: vi.fn(),
}));

import { findOrSetupRepo } from './create';

const originalDirectory = process.cwd();
let testDirectory = '';

describe.sequential('developer repository setup failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testDirectory = mkdtempSync(join(tmpdir(), 'gamr-create-setup-'));
    process.chdir(testDirectory);
  });

  afterEach(() => {
    process.chdir(originalDirectory);
    rmSync(testDirectory, { recursive: true, force: true });
  });

  it('cancels before any clone or install command runs', async () => {
    mocks.select.mockResolvedValue('cancel');

    await expect(findOrSetupRepo()).resolves.toBeNull();
    expect(mocks.execFileSync).not.toHaveBeenCalled();
  });

  it('reports a failed immutable clone and does not continue to install', async () => {
    mocks.select.mockResolvedValue('clone');
    mocks.confirm.mockResolvedValue(true);
    mocks.execFileSync.mockImplementation(() => {
      throw new Error('offline');
    });

    await expect(findOrSetupRepo()).resolves.toBeNull();
    expect(mocks.execFileSync).toHaveBeenCalledTimes(1);
    expect(mocks.error).toHaveBeenCalledWith('Check your internet connection and git setup.');
  });

  it('keeps a successful clone available when locked dependency installation fails', async () => {
    mocks.select.mockResolvedValue('clone');
    mocks.confirm.mockResolvedValue(true);
    mocks.execFileSync
      .mockReturnValueOnce('')
      .mockImplementationOnce(() => {
        throw new Error('install failed');
      });

    await expect(findOrSetupRepo()).resolves.toBe(resolve(testDirectory, 'gamr'));
    expect(mocks.execFileSync).toHaveBeenCalledTimes(2);
    expect(mocks.spinnerStop).toHaveBeenLastCalledWith('npm ci failed.');
  });
});
