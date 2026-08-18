import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const cli = resolve(root, 'dist', 'cli.js');
const baseEnv = {
  ...process.env,
  CI: 'true',
  GAMR_DISABLE_UPDATE_CHECK: '1',
  npm_config_update_notifier: 'false',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(args, expectedStatus, expectedText, stream = 'stdout') {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: baseEnv,
  });
  if (result.error) throw result.error;
  assert(result.status === expectedStatus, `${args.join(' ')} exited ${result.status}; expected ${expectedStatus}`);
  assert(result[stream].includes(expectedText), `${args.join(' ')} did not print ${JSON.stringify(expectedText)} to ${stream}`);
}

async function runInteractive(stop) {
  return new Promise((resolveSession, reject) => {
    const startedAt = performance.now();
    const child = spawn(process.execPath, [cli, 'stack-trace', '--reduced-motion'], {
      cwd: root,
      env: { ...baseEnv, NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let triggered = false;
    let firstFrameMs = 0;
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`interactive ${stop} smoke timed out`));
    }, 8000);

    const trigger = () => {
      if (triggered || !stdout.includes('STACK TRACE')) return;
      triggered = true;
      firstFrameMs = performance.now() - startedAt;
      if (stop === 'stdin-ctrl-c') child.stdin.write('\x03');
      else child.kill(stop);
    };

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      trigger();
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      try {
        assert(triggered, `interactive ${stop} smoke never reached the first frame`);
        assert(firstFrameMs <= 500, `interactive ${stop} first frame took ${firstFrameMs.toFixed(0)}ms; budget is 500ms`);
        assert(code === 0, `interactive ${stop} exited ${code} via ${signal ?? 'no signal'}: ${stderr}`);
        assert(stdout.includes('\x1b[?1049l'), `interactive ${stop} did not restore the main screen`);
        assert(stdout.includes('\x1b[?25h'), `interactive ${stop} did not restore the cursor`);
        assert(!/\x1b\[[0-9;]*m/u.test(stdout), 'NO_COLOR output still contained SGR color/style sequences');
        resolveSession();
      } catch (error) {
        reject(error);
      }
    });
  });
}

run(['--help'], 0, 'Terminal games');
run(['--list'], 0, 'stack-trace');
run(['not-a-game'], 1, 'Unknown game', 'stderr');
run(['--theme', 'not-a-theme'], 1, 'Unknown theme', 'stderr');
await runInteractive('stdin-ctrl-c');
if (process.platform !== 'win32') {
  await runInteractive('SIGINT');
  await runInteractive('SIGTERM');
}

console.log('CLI smoke passed: informational exits, validation, non-TTY cleanup, signals, and NO_COLOR');
