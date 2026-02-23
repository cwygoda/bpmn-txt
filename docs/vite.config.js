import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      // Redirect elkjs to its bundled web version
      'elkjs': path.resolve('../node_modules/elkjs/lib/elk.bundled.js')
    }
  },
  optimizeDeps: {
    include: ['bpmn-txt', 'bpmn-js', 'codemirror', '@codemirror/lang-yaml']
  },
  ssr: {
    noExternal: ['bpmn-txt']
  }
});
