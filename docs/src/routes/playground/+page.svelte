<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';

  let editorContainer: HTMLDivElement;
  let viewerContainer: HTMLDivElement;
  let editorView: any;
  let bpmnViewer: any;

  let errors = $state<Array<{ line?: number; column?: number; message: string; type: 'error' | 'warning' }>>([]);
  let isCompiling = $state(false);
  let xmlOutput = $state('');

  const defaultCode = `process: hello-world
  name: "Hello World"

  start: begin
    name: "Start"

  task: greet
    name: "Say Hello"
    type: user

  end: finish
    name: "End"

  flow: f1
    from: begin
    to: greet

  flow: f2
    from: greet
    to: finish
`;

  onMount(async () => {
    // Dynamically import browser-only modules
    const [
      { EditorView, basicSetup },
      { EditorState },
      { yaml },
      bpmnTxt,
      BpmnJS
    ] = await Promise.all([
      import('codemirror'),
      import('@codemirror/state'),
      import('@codemirror/lang-yaml'),
      import('bpmn-txt'),
      import('bpmn-js').then(m => m.default)
    ]);

    const { parse, validate, toBpmnXmlAsync } = bpmnTxt;

    // Expose for testing
    (window as any).__bpmnTxt = { parse, validate };

    // Initialize CodeMirror
    const startState = EditorState.create({
      doc: defaultCode,
      extensions: [
        basicSetup,
        yaml(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            compileDebounced();
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'var(--font-mono)', fontSize: '14px' }
        })
      ]
    });

    editorView = new EditorView({
      state: startState,
      parent: editorContainer
    });

    // Initialize bpmn-js viewer
    bpmnViewer = new BpmnJS({
      container: viewerContainer
    });

    // Store compile function for debouncing
    let compileTimeout: number;
    const compileDebounced = () => {
      clearTimeout(compileTimeout);
      compileTimeout = setTimeout(() => compile(parse, validate, toBpmnXmlAsync), 300);
    };

    // Initial compile
    compile(parse, validate, toBpmnXmlAsync);

    return () => {
      editorView?.destroy();
      bpmnViewer?.destroy();
    };
  });

  async function compile(
    parse: typeof import('bpmn-txt').parse,
    validate: typeof import('bpmn-txt').validate,
    toBpmnXmlAsync: typeof import('bpmn-txt').toBpmnXmlAsync
  ) {
    const code = editorView?.state.doc.toString() || '';
    errors = [];
    isCompiling = true;

    try {
      // Parse
      const parseResult = parse(code);

      if (parseResult.errors.length > 0) {
        errors = parseResult.errors.map(e => ({
          line: e.line,
          column: e.column,
          message: e.message,
          type: 'error' as const
        }));
        isCompiling = false;
        return;
      }

      // Validate
      const validationResult = validate(parseResult.document);

      if (validationResult.errors.length > 0) {
        errors = validationResult.errors.map(e => ({
          line: e.line,
          column: e.column,
          message: e.message,
          type: 'error' as const
        }));
        isCompiling = false;
        return;
      }

      // Add warnings
      if (validationResult.warnings.length > 0) {
        errors = validationResult.warnings.map(e => ({
          line: e.line,
          column: e.column,
          message: e.message,
          type: 'warning' as const
        }));
      }

      // Generate BPMN XML
      const xml = await toBpmnXmlAsync(parseResult.document, {
        layoutOptions: { direction: 'RIGHT' }
      });

      xmlOutput = xml;

      // Render in bpmn-js
      await bpmnViewer.importXML(xml);
      bpmnViewer.get('canvas').zoom('fit-viewport');

    } catch (e: any) {
      errors = [{ message: e.message || 'Unknown error', type: 'error' }];
    } finally {
      isCompiling = false;
    }
  }

  function copyXml() {
    navigator.clipboard.writeText(xmlOutput);
  }
</script>

<svelte:head>
  <title>Playground - BPMN-TXT</title>
</svelte:head>

<div class="playground">
  <div class="toolbar">
    <h1>Playground</h1>
    <div class="actions">
      {#if isCompiling}
        <span class="status compiling">Compiling...</span>
      {:else if errors.some(e => e.type === 'error')}
        <span class="status error">Error</span>
      {:else}
        <span class="status success">Ready</span>
      {/if}
      <button onclick={copyXml} disabled={!xmlOutput || errors.some(e => e.type === 'error')}>
        Copy BPMN XML
      </button>
    </div>
  </div>

  <div class="panels">
    <div class="editor-panel">
      <div class="panel-header">BPMN-TXT Source</div>
      <div class="editor" bind:this={editorContainer}></div>
    </div>

    <div class="viewer-panel">
      <div class="panel-header">Diagram Preview</div>
      <div class="viewer" bind:this={viewerContainer}></div>
    </div>
  </div>

  {#if errors.length > 0}
    <div class="errors-panel">
      <div class="panel-header">
        {errors.some(e => e.type === 'error') ? 'Errors' : 'Warnings'}
        ({errors.length})
      </div>
      <ul class="errors-list">
        {#each errors as error}
          <li class="error-item {error.type}">
            {#if error.line}
              <span class="location">Line {error.line}{error.column ? `:${error.column}` : ''}</span>
            {/if}
            <span class="message">{error.message}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .playground {
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--nav-height) - 4rem);
    min-height: 500px;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--c-border);
  }

  .toolbar h1 {
    font-size: 1.25rem;
    margin: 0;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status {
    font-size: 0.875rem;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
  }

  .status.compiling {
    background: var(--c-bg-soft);
    color: var(--c-text-light);
  }

  .status.error {
    background: #fee2e2;
    color: #dc2626;
  }

  .status.success {
    background: #dcfce7;
    color: #16a34a;
  }

  @media (prefers-color-scheme: dark) {
    .status.error {
      background: #450a0a;
      color: #fca5a5;
    }
    .status.success {
      background: #052e16;
      color: #86efac;
    }
  }

  button {
    padding: 0.5rem 1rem;
    background: var(--c-brand);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  button:hover {
    opacity: 0.9;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    flex: 1;
    min-height: 0;
    padding: 1rem 0;
  }

  .editor-panel,
  .viewer-panel {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    overflow: hidden;
    min-height: 0;
  }

  .panel-header {
    padding: 0.5rem 1rem;
    background: var(--c-bg-soft);
    border-bottom: 1px solid var(--c-border);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .editor {
    flex: 1;
    overflow: hidden;
  }

  .editor :global(.cm-editor) {
    height: 100%;
  }

  .viewer {
    flex: 1;
    background: white;
  }

  .errors-panel {
    border: 1px solid var(--c-border);
    border-radius: 8px;
    overflow: hidden;
    max-height: 150px;
    margin-bottom: 1rem;
  }

  .errors-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    max-height: 100px;
  }

  .error-item {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--c-border);
    font-size: 0.875rem;
    font-family: var(--font-mono);
  }

  .error-item:last-child {
    border-bottom: none;
  }

  .error-item.error {
    background: #fef2f2;
    color: #dc2626;
  }

  .error-item.warning {
    background: #fffbeb;
    color: #d97706;
  }

  @media (prefers-color-scheme: dark) {
    .error-item.error {
      background: #450a0a;
      color: #fca5a5;
    }
    .error-item.warning {
      background: #451a03;
      color: #fcd34d;
    }
    .viewer {
      background: #1a1a1a;
    }
  }

  .location {
    font-weight: 600;
    margin-right: 0.5rem;
  }

  @media (max-width: 768px) {
    .panels {
      grid-template-columns: 1fr;
    }

    .editor-panel {
      min-height: 250px;
    }

    .viewer-panel {
      min-height: 300px;
    }
  }
</style>
