import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../src/parser/index.js';
import { toBpmnXml } from '../src/generators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '../schemas/BPMN20.xsd');

// Skip XSD tests if xmllint is not available
const hasXmllint = (() => {
  try {
    execSync('which xmllint', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasXmllint)('XSD Validation', () => {
  it('generates valid BPMN 2.0 XML for simple process', () => {
    const input = `process: test
  start: s1
    name: "Start"
  task: t1
    name: "Task"
  end: e1
    name: "End"
  flow: f1
    from: s1
    to: t1
  flow: f2
    from: t1
    to: e1
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!, { includeDiagram: false });

    const tmpFile = '/tmp/test-bpmn-xsd-validation.xml';
    writeFileSync(tmpFile, xml);

    try {
      // xmllint returns exit code 0 on success, non-zero on failure
      // Output goes to stderr with "validates" message on success
      const result = execSync(
        `xmllint --noout --schema "${schemaPath}" "${tmpFile}"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      // If we get here, validation passed (exit code 0)
      expect(true).toBe(true);
    } catch (error: unknown) {
      const execError = error as { stderr?: string; stdout?: string };
      // On success, xmllint outputs to stderr: "<file> validates"
      // On failure, it outputs validation errors
      const output = execError.stderr || execError.stdout || '';
      if (output.includes('validates')) {
        expect(true).toBe(true);
      } else {
        throw new Error(`XSD validation failed: ${output}`);
      }
    } finally {
      if (existsSync(tmpFile)) {
        unlinkSync(tmpFile);
      }
    }
  });

  it('generates valid BPMN 2.0 XML with gateways', () => {
    const input = `process: test
  start: s1
  gateway: g1
    type: exclusive
    name: "Decision"
  task: t1
    name: "Task A"
  task: t2
    name: "Task B"
  gateway: g2
    type: exclusive
    name: "Merge"
  end: e1
  flow: f1
    from: s1
    to: g1
  flow: f2
    from: g1
    to: t1
  flow: f3
    from: g1
    to: t2
  flow: f4
    from: t1
    to: g2
  flow: f5
    from: t2
    to: g2
  flow: f6
    from: g2
    to: e1
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!, { includeDiagram: false });

    const tmpFile = '/tmp/test-bpmn-xsd-gateway.xml';
    writeFileSync(tmpFile, xml);

    try {
      // xmllint returns exit code 0 on success, non-zero on failure
      execSync(`xmllint --noout --schema "${schemaPath}" "${tmpFile}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      // If we get here, validation passed (exit code 0)
      expect(true).toBe(true);
    } catch (error: unknown) {
      const execError = error as { stderr?: string; stdout?: string };
      const output = execError.stderr || execError.stdout || '';
      if (output.includes('validates')) {
        expect(true).toBe(true);
      } else {
        throw new Error(`XSD validation failed: ${output}`);
      }
    } finally {
      if (existsSync(tmpFile)) {
        unlinkSync(tmpFile);
      }
    }
  });
});
