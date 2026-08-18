import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const textExtensions = new Set(['.ts', '.mjs', '.json', '.yml', '.yaml']);

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) return collectFiles(path);
    return textExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

const trackedFiles = [
  ...collectFiles('src'),
  ...collectFiles('scripts'),
  ...collectFiles('.github'),
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.test.json',
  'tsup.config.ts',
];

const failures = [];
const secretPatterns = [
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /npm_[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AIza[0-9A-Za-z_-]{30,}/,
];

for (const file of trackedFiles) {
  const content = readFileSync(file, 'utf8');
  if (!content.endsWith('\n')) failures.push(`${file}: missing final newline`);
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) failures.push(`${file}:${index + 1}: trailing whitespace`);
  });
  if (secretPatterns.some(pattern => pattern.test(content))) {
    failures.push(`${file}: possible committed secret (value intentionally hidden)`);
  }
  if (file.startsWith('.github/workflows/')) {
    lines.forEach((line, index) => {
      const action = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/)?.[1];
      if (action && !action.startsWith('./') && !/@[0-9a-f]{40}$/.test(action)) {
        failures.push(`${file}:${index + 1}: action is not pinned to a full commit SHA`);
      }
    });
  }
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
if (packageJson.version !== packageLock.version || packageJson.version !== packageLock.packages?.['']?.version) {
  failures.push('package.json and package-lock.json versions do not match');
}
for (const group of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
  if (packageJson[group]?.[packageJson.name]) failures.push(`package.json: package depends on itself through ${group}`);
}

const sourceText = trackedFiles
  .filter(file => file.startsWith('src/') && file.endsWith('.ts'))
  .map(file => readFileSync(file, 'utf8'))
  .join('\n');
if (/\bexecSync\s*\(/.test(sourceText)) failures.push('src/: execSync is forbidden; use argument-based execFile/spawn APIs');
if (/npx\s+skills\s+add/.test(sourceText)) failures.push('src/: unpinned remote skill installation is forbidden');

if (failures.length > 0) {
  console.error(`Source policy failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Source policy passed for ${trackedFiles.length} scanned code/config files.`);
}
