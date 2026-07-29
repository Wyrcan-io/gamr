import { defineConfig } from 'tsup';

export default defineConfig([
  // Library entry — tree-shakeable ESM with .d.ts
  {
    entry: {
      index: 'src/index.ts',
      themes: 'src/themes/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['@xterm/xterm'],
  },
  // CLI entry — self-contained bundle
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
    external: ['@xterm/xterm'],
  },
]);
