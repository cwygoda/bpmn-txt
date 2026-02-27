import type { IToken } from 'chevrotain';
import { lex } from '../lexer/index.js';
import { parser } from './parser.js';
import { visitor, type InlineFlowInfo } from './visitor.js';
import type { Document, SequenceFlow, FlowNode, Pool, Lane, Process } from '../ast/types.js';

export { parser, visitor };

export interface ParseError {
  message: string;
  line: number;
  column: number;
}

export interface ParseResult {
  document: Document | null;
  errors: ParseError[];
}

/**
 * Parse BPMN-TXT source into AST Document
 */
export function parse(input: string): ParseResult {
  const errors: ParseError[] = [];

  // Ensure trailing newline so the parser doesn't require it in source files
  const normalized = input.endsWith('\n') ? input : input + '\n';

  // Lexing
  const lexResult = lex(normalized);
  if (lexResult.errors.length > 0) {
    for (const err of lexResult.errors) {
      errors.push({
        message: err.message,
        line: err.line,
        column: err.column,
      });
    }
    return { document: null, errors };
  }

  // Parsing
  parser.input = lexResult.tokens;
  const cst = parser.document();

  if (parser.errors.length > 0) {
    for (const err of parser.errors) {
      errors.push({
        message: err.message,
        line: err.token.startLine ?? 0,
        column: err.token.startColumn ?? 0,
      });
    }
    return { document: null, errors };
  }

  // Visit CST to build AST
  const document = visitor.visit(cst) as Document;

  // Get collected inline flows from visitor
  const collectedFlows = visitor.getCollectedFlows();

  // Post-process: add inline flows to document
  if (collectedFlows.length > 0) {
    addInlineFlowsToDocument(document, collectedFlows);
  }

  return { document, errors };
}

/**
 * Add collected inline flows to the document as SequenceFlow entries
 */
function addInlineFlowsToDocument(doc: Document, flows: InlineFlowInfo[]): void {
  // Convert InlineFlowInfo to SequenceFlow
  const sequenceFlows: SequenceFlow[] = flows.map((flow, index) => ({
    id: `flow_${flow.from}_${flow.to}_${index}`,
    from: flow.from,
    to: flow.to,
    ...(flow.condition && { condition: flow.condition }),
    ...(flow.name && { name: flow.name }),
  }));

  // Add flows to the first process (most common case)
  // TODO: For multi-process documents, could infer correct process from element location
  if (doc.processes.length > 0) {
    const process = doc.processes[0];
    process.sequenceFlows = [...(process.sequenceFlows ?? []), ...sequenceFlows];
  }
}
