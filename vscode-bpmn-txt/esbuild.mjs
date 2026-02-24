import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');

// Build extension
await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !production,
  minify: production,
});

// Build server
await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  outfile: 'out/server.js',
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !production,
  minify: production,
});

console.log('Build complete');
