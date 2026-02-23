import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki';

const highlighter = await createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['yaml', 'bash', 'typescript', 'javascript', 'xml', 'json', 'makefile']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],
  preprocess: [
    mdsvex({
      extensions: ['.md'],
      highlight: {
        highlighter: (code, lang) => {
          const html = highlighter.codeToHtml(code, {
            lang: lang || 'text',
            themes: { light: 'github-light', dark: 'github-dark' }
          });
          return `{@html \`${html.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`}`;
        }
      }
    })
  ],
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: false
    }),
    paths: {
      base: '/bpmn-txt'
    },
    prerender: {
      entries: ['*']
    }
  }
};

export default config;
