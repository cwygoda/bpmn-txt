<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '$lib/theme.svelte';

  interface Props {
    source: string;
  }

  let { source }: Props = $props();

  let viewerContainer: HTMLDivElement;
  let bpmnViewer: any;
  let error = $state<string | null>(null);
  let showSource = $state(false);

  onMount(async () => {
    const [bpmnTxt, BpmnJS] = await Promise.all([
      import('bpmn-txt'),
      import('bpmn-js').then(m => m.default)
    ]);

    bpmnViewer = new BpmnJS({ container: viewerContainer });

    try {
      const parseResult = bpmnTxt.parse(source);
      if (parseResult.errors.length > 0) {
        error = parseResult.errors.map(e => e.message).join('; ');
        return;
      }

      const xml = await bpmnTxt.toBpmnXmlAsync(parseResult.document, {
        layoutOptions: { direction: 'RIGHT' }
      });

      await bpmnViewer.importXML(xml);
      bpmnViewer.get('canvas').zoom('fit-viewport');
    } catch (e: any) {
      error = e.message || 'Failed to render diagram';
    }

    return () => bpmnViewer?.destroy();
  });
</script>

<div class="bpmn-block">
  <div class="bpmn-toolbar">
    <button class="toggle" class:active={showSource} onclick={() => showSource = !showSource}>
      {showSource ? 'Hide Source' : 'View Source'}
    </button>
  </div>

  <div class="bpmn-diagram-panel">
    {#if error}
      <div class="error">{error}</div>
    {/if}
    <div class="viewer" class:dark={theme.isDark} bind:this={viewerContainer}></div>
  </div>

  {#if showSource}
    <div class="bpmn-source">
      <pre><code>{source.trim()}</code></pre>
    </div>
  {/if}
</div>

<style>
  .bpmn-block {
    border: 1px solid var(--c-border);
    border-radius: 8px;
    overflow: hidden;
    margin: 1.5rem 0;
  }

  .bpmn-toolbar {
    display: flex;
    justify-content: flex-end;
    padding: 0.375rem 0.5rem;
    background: var(--c-bg-soft);
    border-bottom: 1px solid var(--c-border);
  }

  .toggle {
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: var(--c-text-light);
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 4px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .toggle:hover {
    color: var(--c-text);
    border-color: var(--c-text-light);
  }

  .toggle.active {
    color: var(--c-brand);
    border-color: var(--c-brand);
  }

  .bpmn-diagram-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .viewer {
    min-height: 350px;
    flex: 1;
    background: white;
  }

  .bpmn-source {
    border-top: 1px solid var(--c-border);
  }

  pre {
    margin: 0;
    padding: 1rem;
    overflow: auto;
    max-height: 500px;
    background: var(--c-bg-soft);
  }

  code {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--c-text);
    white-space: pre;
  }

  .viewer.dark {
    background: #1e1e1e;
  }

  .viewer.dark :global(.djs-shape .djs-visual > rect),
  .viewer.dark :global(.djs-shape .djs-visual > circle),
  .viewer.dark :global(.djs-shape .djs-visual > polygon),
  .viewer.dark :global(.djs-shape .djs-visual > path) {
    fill: #2d2d2d !important;
    stroke: #888 !important;
  }

  .viewer.dark :global(.djs-connection .djs-visual > path) {
    stroke: #888 !important;
  }

  .viewer.dark :global(.djs-connection .djs-visual > polyline) {
    stroke: #888 !important;
    fill: #888 !important;
  }

  .viewer.dark :global(.djs-label),
  .viewer.dark :global(text),
  .viewer.dark :global(.djs-shape text) {
    fill: #e0e0e0 !important;
  }

  .viewer.dark :global(.djs-shape[data-element-id^="start"] .djs-visual > circle),
  .viewer.dark :global(.djs-shape[data-element-id^="end"] .djs-visual > circle) {
    fill: #1e1e1e !important;
  }

  .viewer.dark :global(.djs-shape .djs-visual > polygon) {
    fill: #1e1e1e !important;
  }

  .error {
    padding: 1rem;
    color: #dc2626;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
  }

  @media (max-width: 768px) {
    pre {
      max-height: 300px;
    }
  }
</style>
