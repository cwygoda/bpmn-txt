import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from '../src/parser/index.js';
import { validate } from '../src/validator/index.js';
import { toBpmnXml, toJson } from '../src/generators/index.js';

const examplesDir = join(import.meta.dirname, '../examples');

describe('Examples', () => {
  const files = readdirSync(examplesDir).filter((f) => f.endsWith('.bpmn.md'));

  for (const file of files) {
    describe(file, () => {
      const content = readFileSync(join(examplesDir, file), 'utf-8');

      it('parses without errors', () => {
        const { document, errors } = parse(content);
        expect(errors).toHaveLength(0);
        expect(document).not.toBeNull();
      });

      it('validates successfully', () => {
        const { document } = parse(content);
        const result = validate(document!);
        expect(result.errors).toHaveLength(0);
      });

      it('exports to JSON', () => {
        const { document } = parse(content);
        const json = toJson(document!);
        expect(json).toBeTruthy();
        expect(() => JSON.parse(json)).not.toThrow();
      });

      it('exports to BPMN XML', () => {
        const { document } = parse(content);
        const xml = toBpmnXml(document!);
        expect(xml).toContain('bpmn:definitions');
        expect(xml).toContain('bpmn:process');
      });
    });
  }
});
