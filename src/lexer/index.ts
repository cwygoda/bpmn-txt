import type { IToken } from 'chevrotain';
import { BpmnMdLexer, Newline, Indent } from './tokens.js';

export * from './tokens.js';

export interface LexResult {
  tokens: IToken[];
  errors: LexError[];
}

export interface LexError {
  message: string;
  line: number;
  column: number;
  offset: number;
}

export interface IndentedToken extends IToken {
  indent: number;
}

/**
 * Tokenize input and compute indentation levels.
 * Filters out raw Indent tokens, attaching indent info to following tokens.
 */
export function lex(input: string): LexResult {
  const result = BpmnMdLexer.tokenize(input);

  const errors: LexError[] = result.errors.map((e) => ({
    message: e.message,
    line: e.line ?? 0,
    column: e.column ?? 0,
    offset: e.offset,
  }));

  // Process tokens: track indentation and filter indent tokens
  const tokens: IToken[] = [];
  let currentIndent = 0;
  let lineStart = true;

  for (const token of result.tokens) {
    if (token.tokenType === Newline) {
      tokens.push(token);
      lineStart = true;
      currentIndent = 0;
      continue;
    }

    if (token.tokenType === Indent) {
      if (lineStart) {
        // Count spaces (2 spaces = 1 indent level)
        currentIndent = Math.floor((token.image.length + 1) / 2);
      }
      // Don't push indent tokens
      continue;
    }

    // Real token - attach indent level
    const indentedToken = token as IndentedToken;
    indentedToken.indent = lineStart ? currentIndent : -1;
    tokens.push(indentedToken);
    lineStart = false;
  }

  return { tokens, errors };
}
