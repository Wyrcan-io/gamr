import { execFileSync } from 'node:child_process';
import { extname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const checkedExtensions = new Set(['.js', '.json', '.md', '.mjs', '.ts', '.yaml', '.yml']);
const root = resolve('.').replaceAll('\\', '/');
const files = execFileSync(
  'git',
  ['-c', `safe.directory=${root}`, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(file => file
    && checkedExtensions.has(extname(file))
    && !file.startsWith('artifacts/')
    && !file.endsWith('-playtest-report.json'));
const failures = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  if (!content.endsWith('\n')) failures.push(`${file}: missing final newline`);

  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    if (/\t+$/u.test(line)) failures.push(`${file}:${index + 1}: trailing tab`);
    if (extname(file) === '.md') {
      const trailingSpaces = line.match(/ +$/u)?.[0].length ?? 0;
      if (trailingSpaces !== 0 && trailingSpaces !== 2) {
        failures.push(`${file}:${index + 1}: Markdown trailing spaces must be an intentional two-space hard break`);
      }
    } else if (/ +$/u.test(line)) {
      failures.push(`${file}:${index + 1}: trailing whitespace`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Formatting check failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Formatting check passed for ${files.length} repository text files.`);
}
