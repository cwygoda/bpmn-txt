import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const CLI = 'node dist/cli.js';
const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');
const EXAMPLES_DIR = join(import.meta.dirname, '../examples');

describe('CLI', () => {
  const testInput = join(FIXTURES_DIR, 'cli-test.bpmn.md');
  const testOutput = join(FIXTURES_DIR, 'cli-test.bpmn');
  const testJsonOutput = join(FIXTURES_DIR, 'cli-test.json');

  beforeAll(() => {
    // Create fixtures directory and test file
    execSync(`mkdir -p ${FIXTURES_DIR}`);
    writeFileSync(
      testInput,
      `process: cli-test
  name: "CLI Test"
  start: s1
    name: "Start"
  task: t1
    name: "Task"
    type: user
  end: e1
    name: "End"
  flow: f1
    from: s1
    to: t1
  flow: f2
    from: t1
    to: e1
`
    );
  });

  afterAll(() => {
    // Cleanup
    if (existsSync(testInput)) unlinkSync(testInput);
    if (existsSync(testOutput)) unlinkSync(testOutput);
    if (existsSync(testJsonOutput)) unlinkSync(testJsonOutput);
  });

  describe('compile command', () => {
    it('compiles to BPMN XML by default', () => {
      execSync(`${CLI} compile ${testInput} -o ${testOutput}`);
      expect(existsSync(testOutput)).toBe(true);

      const content = readFileSync(testOutput, 'utf-8');
      expect(content).toContain('bpmn:definitions');
      expect(content).toContain('bpmn:process');
      expect(content).toContain('bpmndi:BPMNDiagram');
      expect(content).toContain('dc:Bounds');
    });

    it('compiles to JSON with -f json', () => {
      execSync(`${CLI} compile ${testInput} -f json -o ${testJsonOutput}`);
      expect(existsSync(testJsonOutput)).toBe(true);

      const content = readFileSync(testJsonOutput, 'utf-8');
      const json = JSON.parse(content);
      expect(json.processes).toHaveLength(1);
      expect(json.processes[0].id).toBe('cli-test');
    });

    it('supports --no-layout flag', () => {
      execSync(`${CLI} compile ${testInput} --no-layout -o ${testOutput}`);
      const content = readFileSync(testOutput, 'utf-8');
      expect(content).toContain('bpmn:definitions');
    });

    it('exits with error for missing file', () => {
      expect(() => {
        execSync(`${CLI} compile nonexistent.bpmn.md`, { stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('validate command', () => {
    it('validates a correct file', () => {
      const output = execSync(`${CLI} validate ${testInput}`, { encoding: 'utf-8' });
      expect(output).toContain('is valid');
    });

    it('exits with error for invalid file', () => {
      const invalidFile = join(FIXTURES_DIR, 'invalid.bpmn.md');
      writeFileSync(
        invalidFile,
        `process: test
  flow: f1
    from: nonexistent
    to: also-nonexistent
`
      );

      expect(() => {
        execSync(`${CLI} validate ${invalidFile}`, { stdio: 'pipe' });
      }).toThrow();

      unlinkSync(invalidFile);
    });
  });

  describe('help and version', () => {
    it('shows help', () => {
      const output = execSync(`${CLI} --help`, { encoding: 'utf-8' });
      expect(output).toContain('compile');
      expect(output).toContain('watch');
      expect(output).toContain('validate');
    });

    it('shows version', () => {
      const output = execSync(`${CLI} --version`, { encoding: 'utf-8' });
      expect(output).toContain('0.1.0');
    });
  });

  describe('compiles all examples', () => {
    const examples = ['simple-process.bpmn.md', 'approval-workflow.bpmn.md'];

    for (const example of examples) {
      it(`compiles ${example}`, () => {
        const input = join(EXAMPLES_DIR, example);
        const output = join(FIXTURES_DIR, example.replace('.bpmn.md', '.bpmn'));

        execSync(`${CLI} compile ${input} -o ${output} -q`);
        expect(existsSync(output)).toBe(true);

        const content = readFileSync(output, 'utf-8');
        expect(content).toContain('bpmn:definitions');

        unlinkSync(output);
      });
    }
  });
});
