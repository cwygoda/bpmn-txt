import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/index.js';
import { validate } from '../src/validator/index.js';

describe('Validator', () => {
  it('validates minimal valid process', () => {
    const input = `process: test
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects duplicate IDs', () => {
    const input = `process: test
  task: my-task
    name: "Task 1"
  task: my-task
    name: "Task 2"
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_ID')).toBe(true);
  });

  it('detects unresolved flow references', () => {
    const input = `process: test
  flow: f1
    from: task-a
    to: task-b
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(false);
    expect(result.errors.filter((e) => e.code === 'UNRESOLVED_REFERENCE').length).toBe(2);
  });

  it('validates flow with valid references', () => {
    const input = `process: test
  task: task-a
    name: "Task A"
  task: task-b
    name: "Task B"
  flow: f1
    from: task-a
    to: task-b
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(true);
  });

  it('detects missing flow source', () => {
    const input = `process: test
  flow: f1
    to: task-a
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_FLOW_SOURCE')).toBe(true);
  });

  it('detects missing flow target', () => {
    const input = `process: test
  flow: f1
    from: task-a
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_FLOW_TARGET')).toBe(true);
  });

  it('warns about message start event without message', () => {
    const input = `process: test
  start: s1
    trigger: message
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.warnings.some((w) => w.code === 'MISSING_MESSAGE_REF')).toBe(true);
  });

  it('warns about script task without script', () => {
    const input = `process: test
  task: t1
    type: script
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.warnings.some((w) => w.code === 'MISSING_SCRIPT')).toBe(true);
  });

  it('warns about service task without implementation', () => {
    const input = `process: test
  task: t1
    type: service
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.warnings.some((w) => w.code === 'MISSING_IMPLEMENTATION')).toBe(true);
  });

  it('validates service task with class', () => {
    const input = `process: test
  task: t1
    type: service
    class: com.example.Service
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.warnings.filter((w) => w.code === 'MISSING_IMPLEMENTATION')).toHaveLength(0);
  });

  it('errors on call activity without calledElement', () => {
    const input = `process: test
  call: c1
    name: "My Call"
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_CALLED_ELEMENT')).toBe(true);
  });

  it('validates gateway default flow reference', () => {
    const input = `process: test
  gateway: g1
    type: exclusive
    default: unknown-flow
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNRESOLVED_REFERENCE')).toBe(true);
  });

  it('validates annotation annotates reference', () => {
    const input = `process: test
  annotation: a1
    text: "Note"
    annotates: unknown-element
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNRESOLVED_REFERENCE')).toBe(true);
  });

  it('validates group elements references', () => {
    const input = `process: test
  group: g1
    name: "My Group"
    elements: [elem1, elem2]
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(false);
    expect(result.errors.filter((e) => e.code === 'UNRESOLVED_REFERENCE').length).toBe(2);
  });

  it('validates complex workflow', () => {
    const input = `process: order
  pool: p1
    name: "Main Pool"
    lane: l1
      name: "Lane 1"

      start: s1
        name: "Start"

      task: t1
        name: "Task 1"

      gateway: g1
        type: exclusive
        name: "Decision"

      task: t2
        name: "Task 2"

      end: e1
        name: "End"

  flow: f1
    from: s1
    to: t1
  flow: f2
    from: t1
    to: g1
  flow: f3
    from: g1
    to: t2
  flow: f4
    from: t2
    to: e1
`;
    const { document } = parse(input);
    const result = validate(document!);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
