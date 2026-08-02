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

  const moduleCheck = `import('${rootPackage.name}').then((m) => { if (!Array.isArray(m.games) || typeof m.runGame !== 'function') process.exit(1); })`;
  run(process.execPath, ['--input-type=module', '-e', moduleCheck], installDir);

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

  console.log(`Package smoke passed: ${packed.filename}`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
