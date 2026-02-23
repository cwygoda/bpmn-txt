import { describe, it, expect } from 'vitest';
import { lex, IndentedToken } from '../src/lexer/index.js';

describe('Lexer', () => {
  it('tokenizes process declaration', () => {
    const { tokens, errors } = lex('process: order-fulfillment');
    expect(errors).toHaveLength(0);
    expect(tokens).toHaveLength(2);
    expect(tokens[0].tokenType.name).toBe('Process');
    expect(tokens[1].tokenType.name).toBe('Identifier');
    expect(tokens[1].image).toBe('order-fulfillment');
  });

  it('tracks indentation levels', () => {
    const input = `process: test
  pool: customer
    lane: ordering
      task: submit`;

    const { tokens, errors } = lex(input);
    expect(errors).toHaveLength(0);

    const indentedTokens = tokens.filter(
      (t) => t.tokenType.name !== 'Newline'
    ) as IndentedToken[];

    // process: test (indent 0)
    expect(indentedTokens[0].indent).toBe(0);
    // pool: customer (indent 1)
    expect(indentedTokens[2].indent).toBe(1);
    // lane: ordering (indent 2)
    expect(indentedTokens[4].indent).toBe(2);
    // task: submit (indent 3)
    expect(indentedTokens[6].indent).toBe(3);
  });

  it('tokenizes arrows', () => {
    const { tokens, errors } = lex('-> validate-order');
    expect(errors).toHaveLength(0);
    expect(tokens[0].tokenType.name).toBe('Arrow');
    expect(tokens[1].tokenType.name).toBe('Identifier');
  });

  it('tokenizes inline attributes', () => {
    const { tokens, errors } = lex('-> ship-order {condition: "inStock == true"}');
    expect(errors).toHaveLength(0);
    const names = tokens.map((t) => t.tokenType.name);
    expect(names).toContain('Arrow');
    expect(names).toContain('LBrace');
    expect(names).toContain('Condition');
    expect(names).toContain('QuotedString');
    expect(names).toContain('RBrace');
  });

  it('skips comments', () => {
    const { tokens, errors } = lex(`# This is a comment
process: test`);
    expect(errors).toHaveLength(0);
    expect(tokens.filter((t) => t.tokenType.name === 'Comment')).toHaveLength(0);
    expect(tokens.filter((t) => t.tokenType.name === 'Process')).toHaveLength(1);
  });

  it('tokenizes type attribute', () => {
    const input = `gateway: check
  type: exclusive`;
    const { tokens, errors } = lex(input);
    expect(errors).toHaveLength(0);
    const names = tokens.map((t) => t.tokenType.name);
    expect(names).toContain('Gateway');
    expect(names).toContain('Type');
    expect(names).toContain('Identifier');
  });

  it('tokenizes boolean values', () => {
    const { tokens, errors } = lex('executable: true');
    expect(errors).toHaveLength(0);
    expect(tokens[0].tokenType.name).toBe('Executable');
    expect(tokens[1].tokenType.name).toBe('True');
  });

  it('tokenizes numbers', () => {
    const { tokens, errors } = lex('x: 300');
    expect(errors).toHaveLength(0);
    expect(tokens[0].tokenType.name).toBe('X');
    expect(tokens[1].tokenType.name).toBe('Number');
    expect(tokens[1].image).toBe('300');
  });

  it('tokenizes data associations', () => {
    const input = `<- input-data
=> output-data`;
    const { tokens, errors } = lex(input);
    expect(errors).toHaveLength(0);
    expect(tokens[0].tokenType.name).toBe('InputAssoc');
    expect(tokens[3].tokenType.name).toBe('OutputAssoc');
  });

  it('tokenizes multiline strings', () => {
    const input = `documentation: |
    This is multiline
    documentation text
`;
    const { tokens, errors } = lex(input);
    expect(errors).toHaveLength(0);
    expect(tokens[0].tokenType.name).toBe('Documentation');
    expect(tokens[1].tokenType.name).toBe('MultilineContent');
    // Verify the content is captured
    expect(tokens[1].image).toContain('This is multiline');
    expect(tokens[1].image).toContain('documentation text');
  });

  it('tokenizes layout block', () => {
    const { tokens, errors } = lex('@layout:');
    expect(errors).toHaveLength(0);
    expect(tokens[0].tokenType.name).toBe('LayoutBlock');
  });
});
