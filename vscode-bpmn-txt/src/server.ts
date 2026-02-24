import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  Definition,
  Location,
  Range,
  Position,
  Diagnostic,
  DiagnosticSeverity,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Import bpmn-txt parser
import { parse, validate, type Document, type SourceSpan } from 'bpmn-txt';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Cache parsed documents
const parsedDocs = new Map<string, { document: Document | null; text: string }>();

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [':', ' '],
      },
      definitionProvider: true,
    },
  };
});

// Validate on open and change
documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

function validateDocument(textDocument: TextDocument): void {
  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = [];

  try {
    const result = parse(text);

    // Parse errors
    for (const error of result.errors) {
      const line = (error.line ?? 1) - 1;
      const col = (error.column ?? 1) - 1;

      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line, character: col },
          end: { line, character: col + 10 },
        },
        message: error.message,
        source: 'bpmn-txt',
      });
    }

    // If parsed successfully, run validation
    if (result.document) {
      parsedDocs.set(textDocument.uri, { document: result.document, text });

      const validation = validate(result.document);

      // Errors
      for (const error of validation.errors) {
        const loc = error.loc;
        const line = loc ? loc.start.line - 1 : 0;
        const col = loc ? loc.start.column - 1 : 0;
        const endLine = loc ? loc.end.line - 1 : line;
        const endCol = loc ? loc.end.column : col + 10;

        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line, character: col },
            end: { line: endLine, character: endCol },
          },
          message: error.message,
          source: 'bpmn-txt',
        });
      }

      // Warnings
      for (const warning of validation.warnings) {
        const loc = warning.loc;
        const line = loc ? loc.start.line - 1 : 0;
        const col = loc ? loc.start.column - 1 : 0;
        const endLine = loc ? loc.end.line - 1 : line;
        const endCol = loc ? loc.end.column : col + 10;

        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line, character: col },
            end: { line: endLine, character: endCol },
          },
          message: warning.message,
          source: 'bpmn-txt',
        });
      }
    } else {
      parsedDocs.set(textDocument.uri, { document: null, text });
    }
  } catch (err) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 },
      },
      message: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
      source: 'bpmn-txt',
    });
    parsedDocs.set(textDocument.uri, { document: null, text });
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// Element keywords with their attributes
const elementKeywords: Record<string, { kind: CompletionItemKind; attrs: string[] }> = {
  process: { kind: CompletionItemKind.Module, attrs: ['name', 'executable', 'documentation'] },
  pool: { kind: CompletionItemKind.Class, attrs: ['name'] },
  lane: { kind: CompletionItemKind.Class, attrs: ['name'] },
  task: { kind: CompletionItemKind.Function, attrs: ['name', 'type', 'implementation', 'class', 'script', 'scriptFormat', 'assignee', 'candidateGroups'] },
  gateway: { kind: CompletionItemKind.Event, attrs: ['name', 'type', 'default'] },
  start: { kind: CompletionItemKind.Event, attrs: ['name', 'trigger', 'message', 'timer', 'signal', 'condition'] },
  end: { kind: CompletionItemKind.Event, attrs: ['name', 'trigger', 'message', 'signal', 'error'] },
  event: { kind: CompletionItemKind.Event, attrs: ['name', 'type', 'trigger', 'message', 'timer', 'signal'] },
  boundary: { kind: CompletionItemKind.Event, attrs: ['type', 'interrupting', 'message', 'timer', 'signal', 'error'] },
  subprocess: { kind: CompletionItemKind.Module, attrs: ['name', 'triggered'] },
  call: { kind: CompletionItemKind.Reference, attrs: ['name', 'calledElement'] },
  flow: { kind: CompletionItemKind.Interface, attrs: ['from', 'to', 'name', 'condition'] },
  'message-flow': { kind: CompletionItemKind.Interface, attrs: ['from', 'to', 'message'] },
  'data-object': { kind: CompletionItemKind.Variable, attrs: ['name'] },
  'data-store': { kind: CompletionItemKind.Variable, attrs: ['name'] },
  annotation: { kind: CompletionItemKind.Text, attrs: ['text', 'annotates'] },
  group: { kind: CompletionItemKind.Struct, attrs: ['name', 'elements'] },
};

const typeValues: Record<string, string[]> = {
  'task.type': ['task', 'user', 'service', 'script', 'send', 'receive', 'manual', 'businessRule'],
  'gateway.type': ['exclusive', 'parallel', 'inclusive', 'eventBased', 'complex'],
  'event.trigger': ['none', 'message', 'timer', 'signal', 'conditional', 'error', 'terminate', 'compensation', 'escalation', 'link'],
  'event.type': ['catch', 'throw'],
  'boundary.type': ['message', 'timer', 'signal', 'error', 'escalation', 'compensation'],
};

connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const text = doc.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';
  const linePrefix = line.substring(0, params.position.character);

  const items: CompletionItem[] = [];

  // At start of line (with optional indent) - suggest element keywords
  if (/^\s*$/.test(linePrefix) || /^\s*\w*$/.test(linePrefix)) {
    for (const [keyword, info] of Object.entries(elementKeywords)) {
      items.push({
        label: keyword + ':',
        kind: info.kind,
        insertText: keyword + ': ',
        detail: `BPMN ${keyword}`,
      });
    }
    return items;
  }

  // After an element keyword - find which element we're in and suggest attributes
  const attrMatch = linePrefix.match(/^\s+(\w*)$/);
  if (attrMatch) {
    // Find parent element by looking at previous lines
    const parentElement = findParentElement(lines, params.position.line);
    if (parentElement && elementKeywords[parentElement]) {
      for (const attr of elementKeywords[parentElement].attrs) {
        items.push({
          label: attr + ':',
          kind: CompletionItemKind.Property,
          insertText: attr + ': ',
        });
      }
    }
    return items;
  }

  // After 'type:', 'trigger:', etc - suggest values
  const typeMatch = linePrefix.match(/^\s+(type|trigger):\s*(\w*)$/);
  if (typeMatch) {
    const parentElement = findParentElement(lines, params.position.line);
    const key = `${parentElement}.${typeMatch[1]}`;
    const values = typeValues[key] || [];
    for (const value of values) {
      items.push({
        label: value,
        kind: CompletionItemKind.EnumMember,
      });
    }
    return items;
  }

  // After 'from:' or 'to:' - suggest element IDs
  const refMatch = linePrefix.match(/^\s+(from|to):\s*(\S*)$/);
  if (refMatch) {
    const cached = parsedDocs.get(params.textDocument.uri);
    if (cached?.document) {
      const ids = collectElementIds(cached.document);
      for (const id of ids) {
        items.push({
          label: id,
          kind: CompletionItemKind.Reference,
        });
      }
    }
    return items;
  }

  return items;
});

function findParentElement(lines: string[], currentLine: number): string | null {
  const currentIndent = lines[currentLine]?.match(/^(\s*)/)?.[1].length ?? 0;

  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i];
    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;

    if (indent < currentIndent) {
      const match = line.match(/^\s*(\w+(?:-\w+)?):/);
      if (match && elementKeywords[match[1]]) {
        return match[1];
      }
    }
  }

  return null;
}

function collectElementIds(doc: Document): string[] {
  const ids: string[] = [];

  for (const proc of doc.processes) {
    ids.push(proc.id);

    if (proc.elements) {
      for (const el of proc.elements) {
        if ('id' in el && el.id) {
          ids.push(el.id);
        }
      }
    }
  }

  return ids;
}

connection.onDefinition((params: TextDocumentPositionParams): Definition | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const cached = parsedDocs.get(params.textDocument.uri);
  if (!cached?.document) return null;

  const text = doc.getText();
  const lines = text.split('\n');
  const line = lines[params.position.line] || '';

  // Check if cursor is on a reference (from: x, to: x)
  const refMatch = line.match(/^\s+(from|to):\s*(\S+)/);
  if (!refMatch) return null;

  const refId = refMatch[2];
  const refStart = line.indexOf(refId);
  const refEnd = refStart + refId.length;

  // Check if cursor is within the reference
  if (params.position.character < refStart || params.position.character > refEnd) {
    return null;
  }

  // Find the definition
  const location = findDefinition(cached.document, refId);
  if (!location) return null;

  return Location.create(params.textDocument.uri, location);
});

function findDefinition(doc: Document, id: string): Range | null {
  for (const proc of doc.processes) {
    if (proc.id === id && proc.loc) {
      return locToRange(proc.loc);
    }

    if (proc.elements) {
      for (const el of proc.elements) {
        if ('id' in el && el.id === id && 'loc' in el && el.loc) {
          return locToRange(el.loc as SourceSpan);
        }
      }
    }
  }

  return null;
}

function locToRange(loc: SourceSpan): Range {
  return {
    start: Position.create(loc.start.line - 1, loc.start.column - 1),
    end: Position.create(loc.end.line - 1, loc.end.column),
  };
}

documents.listen(connection);
connection.listen();
