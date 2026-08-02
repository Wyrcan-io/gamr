import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const tag = process.env.RELEASE_TAG ?? '';
const expected = tag.replace(/^v/, '');

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expected)) {
  throw new Error(`Release tag must be a semantic version (received ${tag || 'empty'})`);
}
if (packageJson.version !== expected) {
  throw new Error(`Tag ${tag} does not match package version ${packageJson.version}`);
}
if (packageJson.dependencies?.[packageJson.name] || packageJson.optionalDependencies?.[packageJson.name]) {
  throw new Error(`Package ${packageJson.name} must not depend on itself`);
}

console.log(`Release ${tag} matches ${packageJson.name}@${packageJson.version}`);
