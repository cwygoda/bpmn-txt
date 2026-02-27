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
 * Add collected inline flows to the document as SequenceFlow entries.
 * Flows tagged with a poolId are appended to the matching pool's sequenceFlows;
 * flows without a poolId go to process.sequenceFlows.
 */
function addInlineFlowsToDocument(doc: Document, flows: InlineFlowInfo[]): void {
  if (doc.processes.length === 0) return;

  const process = doc.processes[0];

  // Group flows by poolId
  const byPool = new Map<string | undefined, InlineFlowInfo[]>();
  for (const flow of flows) {
    const key = flow.poolId;
    let group = byPool.get(key);
    if (!group) {
      group = [];
      byPool.set(key, group);
    }
    group.push(flow);
  }

  // Build a pool lookup
  const poolMap = new Map<string, Pool>();
  if (process.pools) {
    for (const pool of process.pools) {
      if (pool.id) poolMap.set(pool.id, pool);
    }
  }

  let globalIndex = 0;
  for (const [poolId, group] of byPool) {
    const seqFlows: SequenceFlow[] = group.map((flow) => ({
      id: `flow_${flow.from}_${flow.to}_${globalIndex++}`,
      from: flow.from,
      to: flow.to,
      ...(flow.condition && { condition: flow.condition }),
      ...(flow.name && { name: flow.name }),
    }));

    if (poolId && poolMap.has(poolId)) {
      const pool = poolMap.get(poolId)!;
      pool.sequenceFlows = [...(pool.sequenceFlows ?? []), ...seqFlows];
    } else {
      process.sequenceFlows = [...(process.sequenceFlows ?? []), ...seqFlows];
    }
  }
}
