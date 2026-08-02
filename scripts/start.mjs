import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const cliPath = join(root, 'dist', 'cli.js');

function newestMtime(directory) {
  if (!existsSync(directory)) return 0;
  let newest = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(path));
    } else if (entry.isFile()) {
      newest = Math.max(newest, statSync(path).mtimeMs);
    }
  }
  return newest;
}

const sourceMtime = newestMtime(join(root, 'src'));
if (!existsSync(cliPath) || sourceMtime > statSync(cliPath).mtimeMs) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const build = spawnSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const child = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(child.status ?? 1);
