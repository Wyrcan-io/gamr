/**
 * Privacy-friendly update checking for @wyrcan/gamr.
 *
 * Normal game startup reads only the local cache and refreshes it in the
 * background. Interactive developer flows may await the refresh before
 * offering an update. Offline failures are cached briefly so repeated starts
 * do not repeatedly pay the network timeout.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_NAME = '@wyrcan/gamr';
const CACHE_DIR = process.env.GAMR_CACHE_DIR
  ? resolve(process.env.GAMR_CACHE_DIR)
  : resolve(homedir(), '.gamr');
const CACHE_FILE = resolve(CACHE_DIR, 'update-check.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FAILURE_RETRY_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

function parseVersion(value: string): ParsedVersion {
  const match = value.trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!match) return { major: 0, minor: 0, patch: 0, prerelease: [] };
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split('.') ?? [],
  };
}

export function isNewerVersion(latest: string, current: string): boolean {
  const leftVersion = parseVersion(latest);
  const rightVersion = parseVersion(current);
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (leftVersion[key] !== rightVersion[key]) return leftVersion[key] > rightVersion[key];
  }
  if (leftVersion.prerelease.length === 0 || rightVersion.prerelease.length === 0) {
    return leftVersion.prerelease.length === 0 && rightVersion.prerelease.length > 0;
  }
  for (let index = 0; index < Math.max(leftVersion.prerelease.length, rightVersion.prerelease.length); index += 1) {
    const left = leftVersion.prerelease[index];
    const right = rightVersion.prerelease[index];
    if (left === undefined) return false;
    if (right === undefined) return true;
    if (left === right) continue;
    const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
    const rightNumber = /^\d+$/.test(right) ? Number(right) : null;
    if (leftNumber !== null && rightNumber !== null) return leftNumber > rightNumber;
    if (leftNumber !== null) return false;
    if (rightNumber !== null) return true;
    return left > right;
  }
  return false;
}

function updateChecksDisabled(): boolean {
  return process.env.GAMR_DISABLE_UPDATE_CHECK === '1' || process.env.CI === 'true';
}

export function getCurrentVersion(): string {
  try {
    let directory = dirname(fileURLToPath(import.meta.url));
    for (let index = 0; index < 5; index += 1) {
      const packagePath = resolve(directory, 'package.json');
      if (existsSync(packagePath)) {
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { name?: string; version?: string };
        if (packageJson.name === PACKAGE_NAME && packageJson.version) return packageJson.version;
      }
      directory = resolve(directory, '..');
    }
  } catch { /* Invalid or inaccessible package metadata is non-fatal. */ }
  return '0.0.0';
}

export interface UpdateCacheData {
  checkedAt: number;
  latest: string | null;
  failed?: boolean;
}

function readCache(): UpdateCacheData | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as Record<string, unknown>;
    if (
      typeof data.checkedAt === 'number'
      && (typeof data.latest === 'string' || data.latest === null)
      && (data.failed === undefined || typeof data.failed === 'boolean')
    ) {
      return data as unknown as UpdateCacheData;
    }
  } catch { /* Corrupt or inaccessible caches are ignored. */ }
  return null;
}

function writeCache(cache: UpdateCacheData): void {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(CACHE_FILE, JSON.stringify(cache), { mode: 0o600 });
  } catch { /* Cache writes must never stop the CLI. */ }
}

export function shouldRefreshUpdateCache(cache: UpdateCacheData | null, now = Date.now()): boolean {
  if (!cache) return true;
  const interval = cache.failed ? FAILURE_RETRY_MS : CHECK_INTERVAL_MS;
  return now - cache.checkedAt >= interval;
}

async function fetchLatestVersion(): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/latest`,
      { signal: controller.signal },
    );
    if (!response.ok) return null;
    const data = await response.json() as { version?: unknown };
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface UpdateInfo {
  current: string;
  latest: string;
}

function infoFromCache(cache: UpdateCacheData | null, current: string): UpdateInfo | null {
  if (!cache?.latest || !isNewerVersion(cache.latest, current)) return null;
  return { current, latest: cache.latest };
}

async function getUpdateInfo(): Promise<UpdateInfo | null> {
  if (updateChecksDisabled()) return null;
  const current = getCurrentVersion();
  const cache = readCache();
  if (!shouldRefreshUpdateCache(cache)) return infoFromCache(cache, current);

  const latest = await fetchLatestVersion();
  if (!latest) {
    writeCache({ checkedAt: Date.now(), latest: cache?.latest ?? null, failed: true });
    return infoFromCache(cache, current);
  }

  writeCache({ checkedAt: Date.now(), latest, failed: false });
  return isNewerVersion(latest, current) ? { current, latest } : null;
}

export function formatUpdateNotice(current: string, latest: string): string {
  if (process.env.NO_COLOR) {
    return `  Update available: ${current} → ${latest}\n  Run \`npm update -g ${PACKAGE_NAME}\` to update\n`;
  }
  return `\x1b[33m  Update available: ${current} → ${latest}\x1b[0m\n\x1b[2m  Run \`npm update -g ${PACKAGE_NAME}\` to update\x1b[0m\n`;
}

function formatNotice(info: UpdateInfo | null): string | null {
  if (!info) return null;
  return formatUpdateNotice(info.current, info.latest);
}

/** Read the local cache only. This function never performs network I/O. */
export function getCachedUpdateNotice(): string | null {
  if (updateChecksDisabled()) return null;
  return formatNotice(infoFromCache(readCache(), getCurrentVersion()));
}

/** Refresh the cache in the background with an offline retry backoff. */
export async function refreshUpdateCache(): Promise<void> {
  if (updateChecksDisabled()) return;
  const cache = readCache();
  if (!shouldRefreshUpdateCache(cache)) return;
  const latest = await fetchLatestVersion();
  writeCache({
    checkedAt: Date.now(),
    latest: latest ?? cache?.latest ?? null,
    failed: !latest,
  });
}

/** Awaited update check retained for API callers and the developer flow. */
export async function checkForUpdatePassive(): Promise<string | null> {
  try {
    return formatNotice(await getUpdateInfo());
  } catch {
    return null;
  }
}

export async function checkForUpdateInteractive(): Promise<void> {
  try {
    const info = await getUpdateInfo();
    if (!info) return;

    const prompts = await import('@clack/prompts');
    const shouldUpdate = await prompts.confirm({
      message: `Update available: ${info.current} → ${info.latest}. Update now?`,
    });
    if (prompts.isCancel(shouldUpdate) || !shouldUpdate) {
      prompts.log.info(`Run \`npm update -g ${PACKAGE_NAME}\` to update later.`);
      return;
    }

    const spinner = prompts.spinner();
    spinner.start('Updating...');
    try {
      const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      execFileSync(command, ['update', '-g', PACKAGE_NAME], {
        stdio: 'ignore',
        shell: process.platform === 'win32',
      });
      spinner.stop(`Updated to ${info.latest}!`);
    } catch {
      spinner.stop('Update failed.');
      prompts.log.warn(`Try manually: npm update -g ${PACKAGE_NAME}`);
    }
  } catch { /* Update checks are never fatal. */ }
}
