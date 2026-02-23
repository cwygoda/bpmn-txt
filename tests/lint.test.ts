import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/index.js';
import { toBpmnXml } from '../src/generators/index.js';
import { lint, defaultConfig, createConfig } from '../src/lint/index.js';

describe('bpmnlint integration', () => {
  it('lints BPMN XML and returns results', async () => {
    const input = `process: test
  start: s1
    name: "Start"
    -> t1
  task: t1
    name: "Task"
    -> e1
  end: e1
    name: "End"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);
    const results = await lint(xml);

    // Lint should return results (may be warnings or errors depending on rules)
    expect(Array.isArray(results)).toBe(true);

    // Each result should have the expected structure
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('message');
      expect(results[0]).toHaveProperty('category');
      expect(results[0]).toHaveProperty('rule');
    }
  });

  it('can use custom config for linting', async () => {
    const input = `process: test
  start: s1
    name: "Start"
  task: t1
    name: "Disconnected Task"
  end: e1
    name: "End"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    // Use custom config with minimal rules
    const config = createConfig({
      'label-required': 'warn',
    });

    const results = await lint(xml, config);

    // Should be able to lint with custom config
    expect(Array.isArray(results)).toBe(true);
  });

  it('exports defaultConfig', () => {
    expect(defaultConfig).toBeDefined();
    expect(defaultConfig.rules).toBeDefined();
    expect(defaultConfig.rules['start-event-required']).toBe('error');
  });

  it('can create custom config', () => {
    const config = createConfig({
      'label-required': 'off',
      'no-disconnected': 'warn',
    });

    expect(config.rules['label-required']).toBe('off');
    expect(config.rules['no-disconnected']).toBe('warn');
  });
});
