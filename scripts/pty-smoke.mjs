import assert from 'node:assert/strict';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node-pty';

const root = resolve(import.meta.dirname, '..');
const cli = resolve(root, 'dist', 'cli.js');
const baseEnv = {
  ...process.env,
  CI: 'true',
  GAMR_DISABLE_UPDATE_CHECK: '1',
  npm_config_update_notifier: 'false',
  TERM: 'xterm-256color',
};

const delay = (ms) => new Promise(resolveDelay => setTimeout(resolveDelay, ms));

function start(args, env = {}) {
  const terminal = spawn(process.execPath, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: root,
    env: { ...baseEnv, ...env },
  });
  let output = '';
  let exited = false;
  let exit;
  terminal.onData(data => { output += data; });
  const exitPromise = new Promise(resolveExit => {
    terminal.onExit(event => {
      exited = true;
      exit = event;
      resolveExit(event);
    });
  });

  async function waitFor(text, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (!output.includes(text)) {
      if (exited) throw new Error(`PTY exited before ${JSON.stringify(text)}: ${JSON.stringify(exit)}`);
      if (Date.now() >= deadline) throw new Error(`PTY timed out waiting for ${JSON.stringify(text)}`);
      await delay(20);
    }
  }

  async function finish(timeoutMs = 8000) {
    const timeout = delay(timeoutMs).then(() => {
      if (!exited) terminal.kill();
      throw new Error('PTY process did not exit in time');
    });
    return Promise.race([exitPromise, timeout]);
  }

  return { terminal, waitFor, finish, get output() { return output; } };
}

async function writeKey(session, data, settleMs = 80) {
  session.terminal.write(data);
  await delay(settleMs);
}

function assertRestored(output) {
  assert.match(output, /\x1b\[\?1049l/u, 'main screen buffer was not restored');
  assert.match(output, /\x1b\[\?25h/u, 'cursor was not restored');
  assert.match(output, /\x1b\[(?:0)?m/u, 'terminal style was not reset');
}

async function exerciseSwitchAndQuit() {
  const session = start([cli, 'stack-trace', '--reduced-motion']);
  await session.waitFor('STACK TRACE');
  assert.match(session.output, /\x1b\[\?1049h/u, 'alternate screen buffer was not entered');
  assert.match(session.output, /\x1b\[\?25l/u, 'cursor was not hidden for gameplay');

  session.terminal.resize(100, 30);
  await writeKey(session, 'p');
  await writeKey(session, '\x1b');
  for (let index = 0; index < 3; index += 1) await writeKey(session, '\x1b[B');
  await writeKey(session, '\r', 180);
  await session.waitFor('FEATURED');
  await writeKey(session, '\x1b[B');
  await writeKey(session, '\r', 180);
  await session.waitFor('FIVE-MINUTE KINGDOM');

  session.terminal.write('\x03');
  const result = await session.finish();
  assert.equal(result.exitCode, 0, `Ctrl-C PTY exited with ${result.exitCode}`);
  assertRestored(session.output);
}

async function exerciseCrashCleanup() {
  const cliUrl = pathToFileURL(cli).href;
  const source = [
    `process.argv = [process.execPath, ${JSON.stringify(cli)}, 'stack-trace', '--reduced-motion'];`,
    `await import(${JSON.stringify(cliUrl)});`,
    "setTimeout(() => { throw new Error('intentional PTY crash'); }, 250);",
  ].join('\n');
  const session = start(['--input-type=module', '--eval', source]);
  await session.waitFor('STACK TRACE');
  const result = await session.finish();
  assert.equal(result.exitCode, 1, `crash PTY exited with ${result.exitCode}`);
  assert.match(session.output, /Fatal error: Error: intentional PTY crash/u);
  assertRestored(session.output);
}

await exerciseSwitchAndQuit();
await exerciseCrashCleanup();
console.log(`PTY lifecycle smoke passed on ${process.platform}: raw input, resize, switch, Ctrl-C, crash, and terminal restoration.`);
// node-pty can retain a native ConPTY handle after its child exit event on Windows.
process.exit(0);
