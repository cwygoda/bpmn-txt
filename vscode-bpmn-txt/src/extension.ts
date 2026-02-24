import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

// Import bpmn-txt for compilation
import { parse, validate, toBpmnXmlAsync } from 'bpmn-txt';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  // Language Server
  const serverModule = context.asAbsolutePath(path.join('out', 'server.js'));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'bpmn-txt' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.bpmn.{md,txt}'),
    },
  };

  client = new LanguageClient(
    'bpmnTxtLanguageServer',
    'BPMN-TXT Language Server',
    serverOptions,
    clientOptions
  );

  client.start();

  // Preview Panel
  const previewPanels = new Map<string, vscode.WebviewPanel>();

  const showPreview = vscode.commands.registerCommand('bpmn-txt.showPreview', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'bpmn-txt') {
      vscode.window.showErrorMessage('Open a BPMN-TXT file first');
      return;
    }

    const uri = editor.document.uri.toString();
    let panel = previewPanels.get(uri);

    if (panel) {
      panel.reveal(vscode.ViewColumn.Beside);
    } else {
      panel = vscode.window.createWebviewPanel(
        'bpmnTxtPreview',
        `Preview: ${path.basename(editor.document.fileName)}`,
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      previewPanels.set(uri, panel);

      panel.onDidDispose(() => {
        previewPanels.delete(uri);
      });

      updatePreview(panel, editor.document);
    }
  });

  // Update preview on document change
  const onDocChange = vscode.workspace.onDidChangeTextDocument((e) => {
    const uri = e.document.uri.toString();
    const panel = previewPanels.get(uri);
    if (panel && e.document.languageId === 'bpmn-txt') {
      updatePreview(panel, e.document);
    }
  });

  context.subscriptions.push(showPreview, onDocChange);
}

async function updatePreview(panel: vscode.WebviewPanel, document: vscode.TextDocument) {
  const text = document.getText();

  try {
    const parseResult = parse(text);

    if (parseResult.errors.length > 0) {
      panel.webview.html = getErrorHtml(parseResult.errors);
      return;
    }

    if (!parseResult.document) {
      panel.webview.html = getErrorHtml([{ message: 'Failed to parse document' }]);
      return;
    }

    const validation = validate(parseResult.document);
    if (!validation.valid) {
      panel.webview.html = getErrorHtml(validation.errors);
      return;
    }

    const xml = await toBpmnXmlAsync(parseResult.document);
    panel.webview.html = getPreviewHtml(xml);
  } catch (err) {
    panel.webview.html = getErrorHtml([
      { message: err instanceof Error ? err.message : String(err) },
    ]);
  }
}

function getErrorHtml(errors: Array<{ message: string }>): string {
  const errorList = errors.map((e) => `<li>${escapeHtml(e.message)}</li>`).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, sans-serif);
      padding: 20px;
      color: var(--vscode-errorForeground, #f44);
      background: var(--vscode-editor-background, #1e1e1e);
    }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <h2>Compilation Errors</h2>
  <ul>${errorList}</ul>
</body>
</html>`;
}

function getPreviewHtml(xml: string): string {
  const escaped = JSON.stringify(xml);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BPMN Preview</title>
  <script src="https://unpkg.com/bpmn-js@18/dist/bpmn-navigated-viewer.production.min.js"></script>
  <style>
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    #canvas {
      height: 100%;
      background: var(--vscode-editor-background, #1e1e1e);
    }
    .error {
      color: var(--vscode-errorForeground, #f44);
      padding: 20px;
      font-family: var(--vscode-font-family, monospace);
    }
    #controls {
      position: absolute;
      bottom: 16px;
      right: 16px;
      display: flex;
      gap: 4px;
      z-index: 100;
    }
    #controls button {
      width: 32px;
      height: 32px;
      border: 1px solid var(--vscode-button-border, #444);
      background: var(--vscode-button-background, #333);
      color: var(--vscode-button-foreground, #fff);
      cursor: pointer;
      border-radius: 4px;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #controls button:hover {
      background: var(--vscode-button-hoverBackground, #444);
    }
    /* Dark mode diagram colors */
    .djs-shape .djs-visual > rect,
    .djs-shape .djs-visual > circle,
    .djs-shape .djs-visual > polygon {
      fill: var(--vscode-editor-background, #1e1e1e) !important;
      stroke: var(--vscode-foreground, #ccc) !important;
    }
    .djs-shape .djs-visual > path {
      fill: var(--vscode-editor-background, #1e1e1e) !important;
      stroke: var(--vscode-foreground, #ccc) !important;
    }
    .djs-connection .djs-visual > path {
      stroke: var(--vscode-foreground, #ccc) !important;
    }
    .djs-label text,
    text.djs-label {
      fill: var(--vscode-foreground, #ccc) !important;
    }
    marker path {
      fill: var(--vscode-foreground, #ccc) !important;
      stroke: var(--vscode-foreground, #ccc) !important;
    }
  </style>
</head>
<body>
  <div id="canvas"></div>
  <div id="controls">
    <button id="zoom-in" title="Zoom in">+</button>
    <button id="zoom-out" title="Zoom out">−</button>
    <button id="zoom-fit" title="Fit to viewport">⊡</button>
  </div>
  <script>
    (async function() {
      try {
        const xml = ${escaped};
        const viewer = new BpmnJS({ container: '#canvas' });
        await viewer.importXML(xml);
        const canvas = viewer.get('canvas');
        canvas.zoom('fit-viewport');

        // Zoom controls
        document.getElementById('zoom-in').onclick = () => canvas.zoom(canvas.zoom() * 1.2);
        document.getElementById('zoom-out').onclick = () => canvas.zoom(canvas.zoom() / 1.2);
        document.getElementById('zoom-fit').onclick = () => canvas.zoom('fit-viewport');
      } catch (err) {
        document.getElementById('canvas').innerHTML =
          '<div class="error">Error rendering diagram: ' + err.message + '</div>';
      }
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
