/**
 * `gamr vibe` — developer hub for gamr
 *
 * Interactive TUI for creating, vibe coding, playing, removing games,
 * and submitting PRs — all powered by clack prompts and Claude Code.
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import * as p from '@clack/prompts';
import { assertSafeExistingGameDirectory, isPathWithin, isValidGameId, resolveGameDirectory } from './create-safety';
import { getCurrentVersion } from './update-check';

const REPOSITORY_URL = 'https://github.com/Wyrcan-io/gamr.git';

// ---------------------------------------------------------------------------
// Name utilities
// ---------------------------------------------------------------------------

function toKebab(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function toPascal(kebab: string): string {
  return kebab.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function toTitle(kebab: string): string {
  return kebab.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export function sanitizeTemplateDescription(description: string): string {
  return description.replace(/\*\//g, '* /');
}

// ---------------------------------------------------------------------------
// Repo detection
// ---------------------------------------------------------------------------

function isCliGamesRepo(dir: string): boolean {
  return existsSync(resolve(dir, '.git')) &&
    existsSync(resolve(dir, 'src/games')) &&
    existsSync(resolve(dir, 'src/games/index.ts'));
}

/** Resolve the skill whether it is a real directory or a checked-in pointer file. */
function resolveSkillDirectory(repoRoot: string): string | null {
  const candidates = [
    resolve(repoRoot, '.claude/skills/game-dev'),
    resolve(repoRoot, '.agents/skills/game-dev'),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      if (statSync(candidate).isDirectory()) return candidate;
      const pointer = readFileSync(candidate, 'utf-8').trim();
      if (pointer) {
        const target = resolve(dirname(candidate), pointer);
        if (isPathWithin(repoRoot, target) && existsSync(target) && statSync(target).isDirectory()) return target;
      }
    } catch {
      // Try the next candidate if a skill path is malformed or inaccessible.
    }
  }
  return null;
}

function findRepoRoot(from: string): string | null {
  let dir = resolve(from);
  const root = resolve('/');
  while (dir !== root) {
    if (isCliGamesRepo(dir)) return dir;
    dir = resolve(dir, '..');
  }
  return null;
}

// ---------------------------------------------------------------------------
// Game registry parsing
// ---------------------------------------------------------------------------

export interface RegisteredGame {
  id: string;
  name: string;
  description: string;
}

export function parseRegisteredGames(indexContent: string): RegisteredGame[] {
  const games: RegisteredGame[] = [];
  const regex = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*description:\s*(?:"((?:\\.|[^"\\])*)"|'([^']+)')/g;
  let match;
  while ((match = regex.exec(indexContent)) !== null) {
    try {
      const description = match[3] !== undefined ? JSON.parse(`"${match[3]}"`) : match[4];
      if (isValidGameId(match[1]) && match[2].trim() && typeof description === 'string') {
        games.push({ id: match[1], name: match[2], description });
      }
    } catch {
      // Ignore malformed generated or hand-edited entries instead of crashing the developer menu.
    }
  }
  return games;
}

function getGames(repoRoot: string): RegisteredGame[] {
  const indexPath = resolve(repoRoot, 'src/games/index.ts');
  return parseRegisteredGames(readFileSync(indexPath, 'utf-8'));
}

function getUserGames(repoRoot: string): RegisteredGame[] {
  const allGames = getGames(repoRoot);

  // Games tracked in git are built-in; untracked ones are the user's
  let trackedFiles: string;
  try {
    trackedFiles = execFileSync('git', ['ls-files', 'src/games/'], { cwd: repoRoot, encoding: 'utf8' });
  } catch {
    return allGames;
  }

  const trackedDirs = new Set<string>();
  for (const line of trackedFiles.split('\n')) {
    const match = line.match(/^src\/games\/([^/]+)\//);
    if (match) trackedDirs.add(match[1]);
  }

  return allGames.filter(g => !trackedDirs.has(g.id));
}

// ---------------------------------------------------------------------------
// Interactive repo setup
// ---------------------------------------------------------------------------

export async function findOrSetupRepo(): Promise<string | null> {
  const cwd = process.cwd();
  const found = findRepoRoot(cwd);
  if (found) return found;

  const setup = await p.select({
    message: 'You\'re not inside the gamr repository. How would you like to set up?',
    options: [
      { value: 'clone', label: 'Clone gamr here', hint: `→ ${cwd}/gamr` },
      { value: 'path', label: 'I already have it cloned', hint: 'enter path' },
      { value: 'cancel', label: 'Cancel' },
    ],
  });

  if (p.isCancel(setup) || setup === 'cancel') return null;

  if (setup === 'path') {
    const inputPath = await p.text({
      message: 'Path to your gamr clone:',
      validate: (value) => {
        if (!value) return 'Path is required';
        if (!isCliGamesRepo(resolve(value))) {
          return 'Not a gamr repo (missing src/games/index.ts or .git)';
        }
      },
    });
    if (p.isCancel(inputPath)) return null;
    return resolve(inputPath);
  }

  const targetDir = resolve(cwd, 'gamr');
  if (existsSync(targetDir)) {
    if (isCliGamesRepo(targetDir)) {
      p.log.info('gamr/ already exists here, using it.');
      return targetDir;
    }
    p.log.error(`${targetDir} exists but doesn't look like gamr.`);
    return null;
  }

  const releaseRef = `v${getCurrentVersion()}`;
  p.note(
    `Source: ${REPOSITORY_URL}\nRevision: ${releaseRef}\nTarget: ${targetDir}\nNext command: npm ci`,
    'Repository setup trust boundary',
  );
  const approved = await p.confirm({
    message: 'Clone this immutable release and install its locked dependencies?',
  });
  if (p.isCancel(approved) || !approved) return null;

  const s = p.spinner();
  s.start(`Cloning Wyrcan-io/gamr at ${releaseRef}...`);
  try {
    execFileSync('git', ['clone', '--branch', releaseRef, '--depth', '1', REPOSITORY_URL, targetDir], {
      cwd,
      stdio: 'ignore',
    });
    s.stop('Cloned gamr.');
  } catch {
    s.stop('Clone failed.');
    p.log.error('Check your internet connection and git setup.');
    return null;
  }

  s.start('Installing dependencies...');
  try {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execFileSync(npmCommand, ['ci'], {
      cwd: targetDir,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    s.stop('Dependencies installed.');
  } catch {
    s.stop('npm ci failed.');
    p.log.warn('Review the lockfile and dependency scripts before retrying manually.');
  }

  return targetDir;
}

// ---------------------------------------------------------------------------
// Index manipulation
// ---------------------------------------------------------------------------

function addToIndex(indexPath: string, kebab: string, title: string, description: string, runFn: string) {
  let index = readFileSync(indexPath, 'utf-8');

  const importRegex = /^import \{ run\w+ \} from '.\/[^']+';$/gm;
  let lastImport: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(index)) !== null) lastImport = m;

  if (lastImport) {
    const pos = lastImport.index + lastImport[0].length;
    index = index.slice(0, pos) + `\nimport { ${runFn} } from './${kebab}';` + index.slice(pos);
  }

  const entryRegex = /run: run\w+ \},?\s*$/gm;
  let lastEntry: RegExpExecArray | null = null;
  while ((m = entryRegex.exec(index)) !== null) lastEntry = m;

  if (lastEntry) {
    const lineEnd = index.indexOf('\n', lastEntry.index);
    const entry = `\n  { id: '${kebab}', name: '${title}', description: ${JSON.stringify(description)}, run: ${runFn} },`;
    index = index.slice(0, lineEnd) + entry + index.slice(lineEnd);
  }

  const exportRegex = /^\s+run\w+(?:Game|Test),?$/gm;
  let lastExport: RegExpExecArray | null = null;
  while ((m = exportRegex.exec(index)) !== null) lastExport = m;

  if (lastExport) {
    const lineEnd = index.indexOf('\n', lastExport.index);
    index = index.slice(0, lineEnd) + `\n  ${runFn},` + index.slice(lineEnd);
  }

  writeFileSync(indexPath, index);
}

function removeFromIndex(indexPath: string, kebab: string) {
  let index = readFileSync(indexPath, 'utf-8');

  index = index.replace(new RegExp(`^import \\{ run\\w+ \\} from '\\.\\/${kebab}';\\n`, 'gm'), '');
  index = index.replace(new RegExp(`^\\s*\\{[^}]*id:\\s*'${kebab}'[^}]*\\},?\\n`, 'gm'), '');

  const pascal = toPascal(kebab);
  const runFn = `run${pascal}Game`;
  index = index.replace(new RegExp(`^\\s+${runFn},?\\n`, 'gm'), '');

  writeFileSync(indexPath, index);
}

// ---------------------------------------------------------------------------
// Launch Claude Code
// ---------------------------------------------------------------------------

async function launchClaude(repoRoot: string, prompt: string, scope: string): Promise<boolean> {
  p.note(
    `Working directory: ${repoRoot}\nScope: ${scope}\nClaude Code may modify files and use network or Git credentials according to its own configuration.`,
    'External AI trust boundary',
  );
  const approved = await p.confirm({
    message: 'Launch Claude Code with this access?',
  });
  if (p.isCancel(approved) || !approved) return false;

  p.log.info('Launching Claude Code...');

  const child = spawn('claude', [prompt], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  return new Promise((res) => {
    child.on('close', (code) => {
      if (code !== 0) p.log.error(`Claude Code exited with status ${code ?? 'unknown'}.`);
      res(code === 0);
    });
    child.on('error', () => {
      p.log.error('Could not launch Claude Code. Is it installed? Run: npm install -g @anthropic-ai/claude-code');
      res(false);
    });
  });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function doCreate(repoRoot: string, initialName?: string) {
  let kebab: string;
  if (initialName) {
    kebab = toKebab(initialName);
  } else {
    const nameInput = await p.text({
      message: 'What\'s your game called?',
      placeholder: 'space-dodge',
      validate: (value) => {
        if (!value) return 'Name is required';
        const k = toKebab(value);
        if (!/^[a-z][a-z0-9-]*$/.test(k) || k.length < 2) {
          return 'Use lowercase letters, numbers, and hyphens (e.g. space-dodge)';
        }
        if (existsSync(resolve(repoRoot, 'src/games', k))) {
          return `Game "${k}" already exists`;
        }
      },
    });
    if (p.isCancel(nameInput)) return;
    kebab = toKebab(nameInput);
  }

  if (!isValidGameId(kebab)) {
    p.log.error(`Invalid game name: "${kebab}"`);
    return;
  }

  const gamesDir = resolve(repoRoot, 'src/games');
  const gameDir = resolveGameDirectory(gamesDir, kebab);

  if (existsSync(gameDir)) {
    p.log.error(`Game "${kebab}" already exists at src/games/${kebab}/`);
    return;
  }

  const descInput = await p.text({
    message: 'Describe your game in a few words:',
    placeholder: 'A terminal game',
    defaultValue: 'A terminal game',
  });
  if (p.isCancel(descInput)) return;
  const description = descInput || 'A terminal game';

  const pascal = toPascal(kebab);
  const title = toTitle(kebab);
  const runFn = `run${pascal}Game`;

  const skillPath = resolveSkillDirectory(repoRoot);
  if (!skillPath) {
    p.cancel('The checked-in game-dev skill is missing. Restore it from the reviewed repository revision.');
    return;
  }

  // Read and fill template
  const templatePath = skillPath ? resolve(skillPath, 'templates/game-scaffold.ts') : null;
  if (!templatePath || !existsSync(templatePath)) {
    p.cancel('Template not found. Install the game-dev skill or restore the checked-in template.');
    return;
  }

  let template = readFileSync(templatePath, 'utf-8');
  // The description is placed in a block comment in the scaffold. Prevent a
  // crafted `*/` from ending that comment and becoming generated source.
  const templateDescription = sanitizeTemplateDescription(description);
  template = template.replace(/\{GameName\}/g, pascal);
  template = template.replace(/\{GAME_NAME\}/g, title);
  template = template.replace(/\{GAME_DESCRIPTION\}/g, templateDescription);
  template = template.replace(/\{TITLE_LINE_1\}/g, title.toUpperCase());
  template = template.replace(/\{TITLE_LINE_2\}/g, '═'.repeat(title.length));
  template = template.replace(/\{CONTROLS_HINT\}/g, 'Arrow keys to move, Space to act');

  mkdirSync(gameDir, { recursive: true });
  writeFileSync(resolve(gameDir, 'index.ts'), template);
  p.log.success(`Created src/games/${kebab}/index.ts`);

  addToIndex(resolve(gamesDir, 'index.ts'), kebab, title, description, runFn);
  p.log.success('Registered in src/games/index.ts');

  // Offer to launch Claude Code
  const launched = await launchClaude(
    repoRoot,
    `Build out the ${kebab} game. It should be: ${description}. Use the game-dev skill — check src/games/${kebab}/index.ts for the scaffold.`,
    `Edit src/games/${kebab}/ and its registry entry; do not publish or open a PR without another explicit request.`,
  );
  if (!launched) {
    const needsCd = resolve(repoRoot) !== resolve(process.cwd());
    const rel = relative(process.cwd(), repoRoot);
    const cdPath = rel.startsWith('..') ? resolve(repoRoot) : rel;

    const steps = [
      ...(needsCd ? [`cd ${cdPath}`] : []),
      'Open Claude Code in this directory',
      `Tell Claude: "Build out the ${kebab} game — make it a [your idea]"`,
      `Test with: npx gamr ${kebab}`,
      'Submit a PR when ready!',
    ];

    p.note(steps.map((s, i) => `${i + 1}. ${s}`).join('\n'), 'Next steps');
  }
}

// ---------------------------------------------------------------------------
// Game actions — second-level menu after picking a game
// ---------------------------------------------------------------------------

async function playGame(repoRoot: string, gameId: string) {
  const s = p.spinner();
  s.start('Building...');
  try {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execFileSync(npmCommand, ['run', 'build'], {
      cwd: repoRoot,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    s.stop('Build complete.');
  } catch {
    s.stop('Build failed.');
    p.log.error('Fix build errors and try again.');
    return;
  }

  p.log.info(`Launching ${gameId}... (press Q to quit back here)`);

  const cliPath = resolve(repoRoot, 'dist/cli.js');
  const child = spawn(process.execPath, [cliPath, gameId], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  await new Promise<void>((res) => {
    child.on('close', () => res());
  });
}

async function vibeCodeGame(repoRoot: string, gameId: string) {
  const idea = await p.text({
    message: 'What do you want Claude to do?',
    placeholder: `Make ${gameId} a fast-paced bullet-hell dodger`,
  });
  if (p.isCancel(idea) || !idea) return;

  await launchClaude(
    repoRoot,
    `${idea}. Work on src/games/${gameId}/index.ts. Use the game-dev skill for patterns and conventions.`,
    `Edit src/games/${gameId}/ only; do not publish or open a PR.`,
  );
}

async function removeGame(repoRoot: string, gameId: string) {
  const gamesDir = resolve(repoRoot, 'src/games');
  const game = getGames(repoRoot).find(g => g.id === gameId)!;
  const gameDir = resolveGameDirectory(gamesDir, gameId);

  const confirmed = await p.confirm({
    message: `Remove ${game.name}? This deletes src/games/${gameId}/ and unregisters it.`,
  });
  if (p.isCancel(confirmed) || !confirmed) return;

  if (existsSync(gameDir)) {
    assertSafeExistingGameDirectory(gamesDir, gameDir);
    rmSync(gameDir, { recursive: true });
    p.log.success(`Deleted src/games/${gameId}/`);
  }

  removeFromIndex(resolve(gamesDir, 'index.ts'), gameId);
  p.log.success('Unregistered from src/games/index.ts');
}

async function submitPR(repoRoot: string, gameId: string) {
  const game = getGames(repoRoot).find(g => g.id === gameId)!;
  await launchClaude(
    repoRoot,
    `Help me submit a PR for the ${game.name} game. Check git status, create a branch if needed, commit the changes in src/games/${gameId}/ and src/games/index.ts, and open a PR.`,
    `Review and commit src/games/${gameId}/ plus src/games/index.ts, then use network credentials to open a PR.`,
  );
}

async function showGameActions(repoRoot: string, gameId: string) {
  const game = getGames(repoRoot).find(g => g.id === gameId)!;

  const action = await p.select({
    message: `${game.name} — ${game.description}`,
    options: [
      { value: 'play', label: 'Play', hint: 'build & launch' },
      { value: 'vibe', label: 'Vibe code', hint: 'launch Claude Code' },
      { value: 'pr', label: 'Submit a PR', hint: 'launch Claude Code' },
      { value: 'remove', label: 'Remove', hint: 'delete + unregister' },
      { value: 'back', label: 'Back' },
    ],
  });

  if (p.isCancel(action) || action === 'back') return;

  if (action === 'play') await playGame(repoRoot, gameId);
  if (action === 'vibe') await vibeCodeGame(repoRoot, gameId);
  if (action === 'pr') await submitPR(repoRoot, gameId);
  if (action === 'remove') await removeGame(repoRoot, gameId);
}

// ---------------------------------------------------------------------------
// Dev menu — top level
// ---------------------------------------------------------------------------

async function showDevMenu(repoRoot: string) {
  const userGames = getUserGames(repoRoot);

  type MenuOption = { value: string; label: string; hint?: string };
  const options: MenuOption[] = [
    { value: 'create', label: 'Create a new game' },
  ];

  if (userGames.length > 0) {
    options.push({ value: 'games', label: 'Your games', hint: `${userGames.length} game${userGames.length === 1 ? '' : 's'}` });
  }

  options.push({ value: 'exit', label: 'Exit' });

  const action = await p.select({ message: 'What would you like to do?', options });

  if (p.isCancel(action) || action === 'exit') return;

  if (action === 'create') {
    await doCreate(repoRoot);
    return;
  }

  if (action === 'games') {
    const selected = await p.select({
      message: 'Pick a game:',
      options: userGames.map(g => ({
        value: g.id,
        label: g.name,
        hint: g.description,
      })),
    });
    if (p.isCancel(selected)) return;

    await showGameActions(repoRoot, selected);
  }
}

// ---------------------------------------------------------------------------
// Entry points — called from cli.ts
// ---------------------------------------------------------------------------

export async function vibeCommand(args: string[]) {
  const name = args.filter(a => !a.startsWith('--'))[0];

  p.intro('gamr');

  // Interactive update check — offer to update if outdated
  const { checkForUpdateInteractive } = await import('./update-check');
  await checkForUpdateInteractive();

  const repoRoot = await findOrSetupRepo();
  if (!repoRoot) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  if (name) {
    // gamr vibe <name> — if game exists, show actions; if not, create it
    const kebab = toKebab(name);
    const games = getGames(repoRoot);
    const existing = games.find(g => g.id === kebab);
    if (existing) {
      await showGameActions(repoRoot, kebab);
    } else {
      await doCreate(repoRoot, name);
    }
  } else {
    await showDevMenu(repoRoot);
  }

  p.outro('Happy building!');
}

export async function removeCommand(args: string[]) {
  const name = args.filter(a => !a.startsWith('--'))[0];

  p.intro('gamr');

  const repoRoot = await findOrSetupRepo();
  if (!repoRoot) {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  if (name) {
    const kebab = toKebab(name);
    const games = getGames(repoRoot);
    if (!games.find(g => g.id === kebab)) {
      p.log.error(`Game "${kebab}" not found.`);
    } else {
      await removeGame(repoRoot, kebab);
    }
  } else {
    // No name — show game picker
    const games = getGames(repoRoot);
    if (games.length === 0) {
      p.log.warn('No games found.');
    } else {
      const selected = await p.select({
        message: 'Which game do you want to remove?',
        options: games.map(g => ({
          value: g.id,
          label: g.name,
          hint: g.description,
        })),
      });
      if (!p.isCancel(selected)) {
        await removeGame(repoRoot, selected);
      }
    }
  }

  p.outro('Done.');
}
