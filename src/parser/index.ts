import type { IToken } from 'chevrotain';
import { lex } from '../lexer/index.js';
import { parser } from './parser.js';
import { visitor } from './visitor.js';
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

  // Lexing
  const lexResult = lex(input);
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

  // Post-process: resolve inline flows
  resolveInlineFlows(document, input);

  return { document, errors };
}

/**
 * Collect inline flows (-> target) and convert to explicit SequenceFlow entries
 */
function resolveInlineFlows(doc: Document, source: string): void {
  for (const process of doc.processes) {
    const flows: SequenceFlow[] = process.sequenceFlows ?? [];

    // Process pools
    if (process.pools) {
      for (const pool of process.pools) {
        collectFlowsFromContainer(pool, flows, source);
        if (pool.lanes) {
          for (const lane of pool.lanes) {
            collectFlowsFromContainer(lane, flows, source);
          }
        }
      }
    }

    // Process direct elements
    if (process.elements) {
      collectFlowsFromElements(process.elements, flows, source);
    }

    if (flows.length > 0) {
      process.sequenceFlows = flows;
    }
  }
}

function collectFlowsFromContainer(
  container: Pool | Lane,
  flows: SequenceFlow[],
  source: string
): void {
  if (container.elements) {
    collectFlowsFromElements(container.elements, flows, source);
  }
  if (container.sequenceFlows) {
    flows.push(...container.sequenceFlows);
  }
}

function collectFlowsFromElements(
  elements: FlowNode[],
  flows: SequenceFlow[],
  _source: string
): void {
  // This requires re-parsing to extract inline flows
  // For now, inline flows would need to be tracked during CST visiting
  // TODO: Enhanced visitor to track inline flows per element
}
