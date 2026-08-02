/**
 * Auto-update checker for @wyrcan/gamr
 *
 * Checks the npm registry for newer versions, caches results for 24h,
 * and provides both passive (print notice) and interactive (offer update) modes.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_NAME = '@wyrcan/gamr';
const CACHE_DIR = resolve(homedir(), '.gamr');
const CACHE_FILE = resolve(CACHE_DIR, 'update-check.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 3000; // Don't block startup for slow networks

// ---------------------------------------------------------------------------
// Version helpers
// ---------------------------------------------------------------------------

function parseVersion(v: string): [number, number, number] {
  const parts = v.replace(/^v/, '').split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isNewer(latest: string, current: string): boolean {
  const [lMaj, lMin, lPat] = parseVersion(latest);
  const [cMaj, cMin, cPat] = parseVersion(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

// ---------------------------------------------------------------------------
// Current version — read from package.json at build time via tsup define,
// falling back to reading package.json at runtime
// ---------------------------------------------------------------------------

function getCurrentVersion(): string {
  try {
    // Walk up from this file to find package.json
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 5; i++) {
      const pkgPath = resolve(dir, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === PACKAGE_NAME) return pkg.version;
      }
      dir = resolve(dir, '..');
    }
  } catch { /* ignore */ }
  return '0.0.0';
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheData {
  checkedAt: number;
  latest: string;
}

function readCache(): CacheData | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    if (typeof data.checkedAt === 'number' && typeof data.latest === 'string') {
      return data as CacheData;
    }
  } catch { /* corrupt cache, ignore */ }
  return null;
}

function writeCache(latest: string) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ checkedAt: Date.now(), latest }));
  } catch { /* ignore write errors */ }
}

// ---------------------------------------------------------------------------
// Registry fetch
// ---------------------------------------------------------------------------

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(
      `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json() as { version?: string };
    return data.version ?? null;
  } catch {
    return null; // Offline, timeout, etc.
  }
}

// ---------------------------------------------------------------------------
// Core: get update info
// ---------------------------------------------------------------------------

interface UpdateInfo {
  current: string;
  latest: string;
}

async function getUpdateInfo(): Promise<UpdateInfo | null> {
  const current = getCurrentVersion();

  // Check cache first
  const cache = readCache();
  if (cache && Date.now() - cache.checkedAt < CHECK_INTERVAL_MS) {
    if (isNewer(cache.latest, current)) {
      return { current, latest: cache.latest };
    }
    return null;
  }

  // Fetch from registry
  const latest = await fetchLatestVersion();
  if (!latest) return null;

  writeCache(latest);

  if (isNewer(latest, current)) {
    return { current, latest };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Passive check — returns a formatted notice string, or null if up to date.
 * Used before game launches: just print and move on.
 */
export async function checkForUpdatePassive(): Promise<string | null> {
  try {
    const info = await getUpdateInfo();
    if (!info) return null;
    return `\x1b[33m  Update available: ${info.current} → ${info.latest}\x1b[0m\n\x1b[2m  Run \`npm update -g ${PACKAGE_NAME}\` to update\x1b[0m\n`;
  } catch {
    return null;
  }
}

/**
 * Interactive check — uses @clack/prompts to offer an inline update.
 * Used in the vibe command flow.
 */
export async function checkForUpdateInteractive(): Promise<void> {
  try {
    const info = await getUpdateInfo();
    if (!info) return;

    // Dynamic import so @clack/prompts isn't loaded for game paths
    const p = await import('@clack/prompts');

    const shouldUpdate = await p.confirm({
      message: `Update available: ${info.current} → ${info.latest}. Update now?`,
    });

    if (p.isCancel(shouldUpdate) || !shouldUpdate) {
      p.log.info(`Run \`npm update -g ${PACKAGE_NAME}\` to update later.`);
      return;
    }

    const s = p.spinner();
    s.start('Updating...');
    try {
      execSync(`npm update -g ${PACKAGE_NAME}`, { stdio: 'ignore' });
      s.stop(`Updated to ${info.latest}!`);
    } catch {
      s.stop('Update failed.');
      p.log.warn(`Try manually: npm update -g ${PACKAGE_NAME}`);
    }
  } catch { /* fail silently */ }
}
