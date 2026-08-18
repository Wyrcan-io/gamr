import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const npm = process.platform === 'win32' ? process.execPath : 'npm';
const npmPrefix = process.platform === 'win32'
  ? [process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')]
  : [];
const tempRoot = mkdtempSync(join(tmpdir(), 'gamr-pack-smoke-'));
const packDir = join(tempRoot, 'pack');
const installDir = join(tempRoot, 'install');
const MAX_PACKED_BYTES = 1_500_000;
const MAX_UNPACKED_BYTES = 6_000_000;
const MAX_INFORMATIONAL_STARTUP_MS = 250;
const MAX_ROOT_IMPORT_MS = 50;
mkdirSync(packDir);
mkdirSync(installDir);

function run(command, args, cwd = root) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32' && command.toLowerCase().endsWith('.cmd'),
    env: { ...process.env, npm_config_update_notifier: 'false' },
  });
}

try {
  const rootPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const dependencyGroups = ['dependencies', 'optionalDependencies', 'peerDependencies'];
  for (const group of dependencyGroups) {
    if (rootPackage[group]?.[rootPackage.name]) {
      throw new Error(`The package must not depend on itself (${group})`);
    }
  }

  const packOutput = run(npm, [...npmPrefix, 'pack', '--json', '--pack-destination', packDir]);
  const packed = JSON.parse(packOutput)[0];
  const archive = join(packDir, packed.filename);
  if (packed.size > MAX_PACKED_BYTES) {
    throw new Error(`Packed package is ${packed.size} bytes; budget is ${MAX_PACKED_BYTES}`);
  }
  if (packed.unpackedSize > MAX_UNPACKED_BYTES) {
    throw new Error(`Unpacked package is ${packed.unpackedSize} bytes; budget is ${MAX_UNPACKED_BYTES}`);
  }

  run(npm, [...npmPrefix, 'init', '--yes'], installDir);
  run(npm, [
    ...npmPrefix,
    'install',
    '--no-audit',
    '--no-fund',
    '--ignore-scripts',
    '--package-lock=false',
    archive,
  ], installDir);

  const installedPackage = JSON.parse(readFileSync(
    join(installDir, 'node_modules', rootPackage.name, 'package.json'),
    'utf8',
  ));
  if (installedPackage.name !== rootPackage.name || installedPackage.version !== rootPackage.version) {
    throw new Error('Installed package metadata does not match the packed package');
  }

  const moduleCheck = `const started = performance.now(); import('${rootPackage.name}').then((m) => { const elapsed = performance.now() - started; if (!Array.isArray(m.games) || typeof m.runGame !== 'function') process.exit(1); console.log(elapsed.toFixed(1)); })`;
  // A newly extracted executable can incur one-time antivirus/indexer I/O on
  // Windows. Use the median of three fresh Node processes for a stable runtime
  // budget while still printing the coldest observation for diagnostics.
  const rootImportSamples = Array.from({ length: 3 }, () => (
    Number(run(process.execPath, ['--input-type=module', '-e', moduleCheck], installDir).trim())
  ));
  const rootImportMs = [...rootImportSamples].sort((left, right) => left - right)[1];
  if (!Number.isFinite(rootImportMs) || rootImportMs > MAX_ROOT_IMPORT_MS) {
    throw new Error(`Root package import took ${rootImportMs.toFixed(1)}ms; budget is ${MAX_ROOT_IMPORT_MS}ms`);
  }

  const binName = process.platform === 'win32' ? 'gamr.cmd' : 'gamr';
  const binPath = join(installDir, 'node_modules', '.bin', binName);
  if (!existsSync(binPath)) throw new Error(`npm did not create the ${binName} executable shim`);
  const installedCli = join(installDir, 'node_modules', rootPackage.name, 'dist', 'cli.js');
  const help = execFileSync(process.execPath, [installedCli, '--help'], {
    cwd: installDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      GAMR_DISABLE_UPDATE_CHECK: '1',
      npm_config_update_notifier: 'false',
    },
  });
  if (!help.includes('Terminal games')) throw new Error('Installed CLI did not print help');

  const startupStartedAt = performance.now();
  const list = execFileSync(process.execPath, [installedCli, '--list'], {
    cwd: installDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      GAMR_CACHE_DIR: join(tempRoot, 'empty-update-cache'),
      npm_config_update_notifier: 'false',
    },
  });
  const informationalStartupMs = performance.now() - startupStartedAt;
  if (!list.includes('stack-trace')) throw new Error('Installed CLI did not list active games');
  if (informationalStartupMs > MAX_INFORMATIONAL_STARTUP_MS) {
    throw new Error(`CLI --list took ${informationalStartupMs.toFixed(0)}ms; budget is ${MAX_INFORMATIONAL_STARTUP_MS}ms`);
  }

  console.log(
    `Package smoke passed: ${packed.filename} `
    + `(${packed.size} packed / ${packed.unpackedSize} unpacked bytes, `
    + `${rootImportMs.toFixed(1)}ms median root import / ${Math.max(...rootImportSamples).toFixed(1)}ms coldest, `
    + `${informationalStartupMs.toFixed(0)}ms --list startup)`,
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
