<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    source: string;
    padding?: number;
    scale?: number;
    showLogo?: boolean;
    align?: 'left' | 'center' | 'right';
    zoom?: boolean;
    fullscreen?: boolean;
    viewSource?: boolean;
    dark?: boolean;
  }

  let {
    source,
    padding = 20,
    scale = 0.92,
    showLogo = false,
    align = 'center',
    zoom = false,
    fullscreen = false,
    viewSource = false,
    dark,
  }: Props = $props();

  let blockEl: HTMLDivElement;
  let viewerContainer: HTMLDivElement;
  let bpmnViewer: any;
  let canvasRef: any = null;
  let error = $state<string | null>(null);
  let sourceOpen = $state(false);
  let zoomLevel = $state(100);
  let isFullscreen = $state(false);
  let resolvedDark = $state(false);

  const hasControls = $derived(zoom || fullscreen || viewSource);

  function detectDark(): boolean {
    if (dark !== undefined) return dark;
    if (typeof window === 'undefined') return false;
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function fitDiagram() {
    if (!canvasRef || !viewerContainer) return;

    const svg = viewerContainer.querySelector('svg');
    const layer = svg?.querySelector('.viewport > g');
    const bbox = (layer as SVGGraphicsElement | null)?.getBBox();
    if (!bbox || !bbox.width || !bbox.height) {
      canvasRef.zoom('fit-viewport');
      return;
    }

    const containerWidth = viewerContainer.clientWidth;
    const maxScale = containerWidth / bbox.width;
    const effectiveScale = Math.min(scale, maxScale);
    const pad = padding / effectiveScale;

    const paddedWidth = bbox.width + pad * 2;
    const paddedHeight = bbox.height + pad * 2;
    const screenHeight = paddedHeight * effectiveScale;

    const h = `${Math.max(Math.ceil(screenHeight), 100)}px`;
    viewerContainer.style.height = h;
    viewerContainer.style.minHeight = h;
    viewerContainer.style.flex = 'none';

    const viewboxWidthAtScale = containerWidth / effectiveScale;
    let vbX = bbox.x - pad;
    const vbWidth = Math.max(paddedWidth, viewboxWidthAtScale);

    if (vbWidth > paddedWidth) {
      const excess = vbWidth - paddedWidth;
      if (align === 'center') vbX -= excess / 2;
      else if (align === 'right') vbX -= excess;
    }

    canvasRef.viewbox({
      x: vbX,
      y: bbox.y - pad,
      width: vbWidth,
      height: paddedHeight,
    });

    zoomLevel = Math.round(effectiveScale * 100);
  }

  function handleZoom(delta: number) {
    if (!canvasRef) return;
    const current = canvasRef.zoom();
    const next = Math.max(0.1, Math.min(4, current + delta));
    canvasRef.zoom(next);
    zoomLevel = Math.round(next * 100);
  }

  function handleZoomReset() {
    fitDiagram();
  }

  function handleFullscreen() {
    if (!blockEl) return;
    if (!document.fullscreenElement) {
      blockEl.requestFullscreen().then(() => { isFullscreen = true; });
    } else {
      document.exitFullscreen().then(() => { isFullscreen = false; });
    }
  }

  onMount(() => {
    resolvedDark = detectDark();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMqChange = () => { resolvedDark = detectDark(); };
    mq.addEventListener('change', onMqChange);

    const observer = new MutationObserver(() => { resolvedDark = detectDark(); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const onFsChange = () => { isFullscreen = !!document.fullscreenElement; };
    document.addEventListener('fullscreenchange', onFsChange);

    (async () => {
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
        canvasRef = bpmnViewer.get('canvas');
        fitDiagram();
      } catch (e: any) {
        error = e.message || 'Failed to render diagram';
      }
    })();

    return () => {
      bpmnViewer?.destroy();
      mq.removeEventListener('change', onMqChange);
      observer.disconnect();
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  });
</script>

<div class="bpmn-block" class:hide-logo={!showLogo} class:is-fullscreen={isFullscreen} bind:this={blockEl}>
  <div class="bpmn-diagram-panel">
    {#if error}
      <div class="error">{error}</div>
    {/if}
    <div class="viewer" class:dark={resolvedDark} bind:this={viewerContainer}>
      {#if hasControls}
        <div class="controls">
          {#if zoom}
            <button class="ctrl-btn" onclick={() => handleZoom(-0.15)} title="Zoom out" aria-label="Zoom out">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5.5"/><line x1="4.5" y1="7" x2="9.5" y2="7"/><line x1="11" y1="11" x2="14.5" y2="14.5"/></svg>
            </button>
            <span class="zoom-level">{zoomLevel}%</span>
            <button class="ctrl-btn" onclick={() => handleZoom(0.15)} title="Zoom in" aria-label="Zoom in">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5.5"/><line x1="4.5" y1="7" x2="9.5" y2="7"/><line x1="7" y1="4.5" x2="7" y2="9.5"/><line x1="11" y1="11" x2="14.5" y2="14.5"/></svg>
            </button>
            <button class="ctrl-btn" onclick={handleZoomReset} title="Reset zoom" aria-label="Reset zoom">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="1.5" width="13" height="13" rx="1.5"/><rect x="4" y="4" width="8" height="8" rx="1"/></svg>
            </button>
            <span class="ctrl-sep"></span>
          {/if}
          {#if fullscreen}
            <button class="ctrl-btn" onclick={handleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {#if isFullscreen}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="5,1.5 5,5 1.5,5"/><polyline points="11,1.5 11,5 14.5,5"/><polyline points="5,14.5 5,11 1.5,11"/><polyline points="11,14.5 11,11 14.5,11"/></svg>
              {:else}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1.5,5 1.5,1.5 5,1.5"/><polyline points="14.5,5 14.5,1.5 11,1.5"/><polyline points="1.5,11 1.5,14.5 5,14.5"/><polyline points="14.5,11 14.5,14.5 11,14.5"/></svg>
              {/if}
            </button>
          {/if}
          {#if viewSource}
            <button class="ctrl-btn" class:active={sourceOpen} onclick={() => sourceOpen = !sourceOpen} title={sourceOpen ? 'Hide source' : 'View source'} aria-label={sourceOpen ? 'Hide source' : 'View source'}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="5,3 1.5,8 5,13"/><polyline points="11,3 14.5,8 11,13"/></svg>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  {#if sourceOpen}
    <div class="bpmn-source">
      <pre><code>{source.trim()}</code></pre>
    </div>
  {/if}
</div>

<style>
  .bpmn-block {
    border: 1px solid var(--c-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    margin: 1.5rem 0;
  }

  .bpmn-block.is-fullscreen {
    margin: 0;
    border-radius: 0;
    border: none;
    display: flex;
    flex-direction: column;
    background: var(--c-bg, #fff);
  }

  .bpmn-block.is-fullscreen .bpmn-diagram-panel {
    flex: 1;
  }

  .bpmn-block.is-fullscreen .viewer {
    min-height: 0;
    height: 100% !important;
  }

  .bpmn-block.hide-logo :global(.bjs-powered-by) {
    display: none !important;
  }

  .bpmn-diagram-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .viewer {
    position: relative;
    min-height: 350px;
    flex: 1;
    background: white;
  }

  /* Floating controls — top-right over the canvas */
  .controls {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    background: color-mix(in srgb, var(--c-bg-soft, #f6f6f7) 85%, transparent);
    backdrop-filter: blur(6px);
    border: 1px solid var(--c-border, #e5e7eb);
    border-radius: 6px;
  }

  .ctrl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    color: var(--c-text-light, #6b7280);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: color 0.15s, background 0.15s, border-color 0.15s;
  }

  .ctrl-btn:hover {
    color: var(--c-text, #213547);
    background: var(--c-bg, #fff);
    border-color: var(--c-border, #e5e7eb);
  }

  .ctrl-btn.active {
    color: var(--c-brand, #3b82f6);
    background: var(--c-bg, #fff);
    border-color: var(--c-brand, #3b82f6);
  }

  .ctrl-sep {
    width: 1px;
    height: 16px;
    margin: 0 2px;
    background: var(--c-border, #e5e7eb);
  }

  .zoom-level {
    font-size: 0.625rem;
    font-family: var(--font-mono, ui-monospace, monospace);
    color: var(--c-text-light, #6b7280);
    min-width: 3ch;
    text-align: center;
    user-select: none;
  }

  .bpmn-source {
    border-top: 1px solid var(--c-border, #e5e7eb);
  }

  pre {
    margin: 0;
    padding: 1rem;
    overflow: auto;
    max-height: 500px;
    background: var(--c-bg-soft, #f6f6f7);
  }

  code {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--c-text, #213547);
    white-space: pre;
  }

  .viewer.dark {
    background: #1e1e1e;
  }

  .viewer.dark .controls {
    background: color-mix(in srgb, #242424 85%, transparent);
    border-color: #374151;
  }

  .viewer.dark .ctrl-btn:hover {
    background: #2d2d2d;
    border-color: #374151;
  }

  .viewer.dark .ctrl-btn.active {
    background: #2d2d2d;
  }

  .viewer.dark .ctrl-sep {
    background: #374151;
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
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.8125rem;
  }

  @media (max-width: 768px) {
    pre {
      max-height: 300px;
    }
  }
</style>
