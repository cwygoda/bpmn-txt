import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      // Redirect elkjs to its bundled web version
      'elkjs': path.resolve('../node_modules/elkjs/lib/elk.bundled.js'),
      // Resolve to TypeScript source for live reload during dev
      'bpmn-txt': path.resolve('../src/index.ts')
    }
  },
  optimizeDeps: {
    include: ['bpmn-js', 'codemirror', '@codemirror/lang-yaml'],
    exclude: ['bpmn-txt']  // Don't pre-bundle - use linked source directly
  },
  ssr: {
    noExternal: ['bpmn-txt']
  }
});
