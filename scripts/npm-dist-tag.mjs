const release = process.argv[2] ?? '';
const version = release.replace(/^v/u, '');

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
  throw new Error(`Release must be a semantic version (received ${release || 'empty'})`);
}

console.log(version.includes('-') ? 'beta' : 'latest');
