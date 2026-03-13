import { visit } from 'unist-util-visit';

const IMPORT_STMT = `import BpmnCodeBlock from '$lib/components/BpmnCodeBlock.svelte';`;

/**
 * Remark plugin for mdsvex: transforms ```bpmn fenced code blocks
 * into <BpmnCodeBlock> Svelte component invocations.
 */
export function remarkBpmn() {
  return (tree) => {
    let hasBpmn = false;

    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'bpmn') return;
      hasBpmn = true;

      const escaped = node.value
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');

      parent.children[index] = {
        type: 'html',
        value: `<BpmnCodeBlock source={\`${escaped}\`} viewSource />`
      };
    });

    if (!hasBpmn) return;

    // Inject import — check if a script block already exists
    let injected = false;
    visit(tree, 'html', (node) => {
      if (injected) return;
      const match = node.value.match(/^<script(\s[^>]*)?>/)
      if (match) {
        // Append import inside existing script tag
        node.value = node.value.replace(
          match[0],
          `${match[0]}\n  ${IMPORT_STMT}`
        );
        injected = true;
      }
    });

    if (!injected) {
      tree.children.unshift({
        type: 'html',
        value: `<script>\n  ${IMPORT_STMT}\n</script>`
      });
    }
  };
}
