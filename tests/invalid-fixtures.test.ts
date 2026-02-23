import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../src/parser/index.js';
import { validate } from '../src/validator/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INVALID_DIR = join(__dirname, '../fixtures/invalid');

describe('Invalid fixtures', () => {
  const files = readdirSync(INVALID_DIR).filter((f) => f.endsWith('.bpmn.txt'));

  for (const file of files) {
    it(`rejects ${file}`, () => {
      const content = readFileSync(join(INVALID_DIR, file), 'utf-8');
      const { document, errors: parseErrors } = parse(content);

      if (parseErrors.length > 0) {
        expect(parseErrors.length).toBeGreaterThan(0);
        return;
      }

      const { errors: validationErrors } = validate(document!);
      expect(validationErrors.length).toBeGreaterThan(0);
    });
  }
});
