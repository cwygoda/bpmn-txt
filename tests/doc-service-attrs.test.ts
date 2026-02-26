import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/index.js';
import { extractDocLinks, extractServiceRefs } from '../src/ast/extractors.js';
import type { Task, StartEvent, Gateway, CallActivity } from '../src/ast/types.js';

describe('doc and service attributes', () => {
  it('parses doc and service on task', () => {
    const input = `process: test
  task: browse
    name: "Browse Products"
    type: user
    service: catalog-ui
    doc: browsing
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![0] as Task;
    expect(task.doc).toBe('browsing');
    expect(task.service).toBe('catalog-ui');
  });

  it('parses doc on start event', () => {
    const input = `process: test
  start: begin
    name: "Start"
    doc: start-section
    service: entry-service
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const event = document!.processes[0].elements![0] as StartEvent;
    expect(event.doc).toBe('start-section');
    expect(event.service).toBe('entry-service');
  });

  it('parses doc on gateway', () => {
    const input = `process: test
  gateway: decision
    type: exclusive
    doc: decision-point
    service: routing-service
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const gw = document!.processes[0].elements![0] as Gateway;
    expect(gw.doc).toBe('decision-point');
    expect(gw.service).toBe('routing-service');
  });

  it('parses doc on call activity', () => {
    const input = `process: test
  call: sub-process
    calledElement: external
    doc: sub-process-docs
    service: external-service
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const call = document!.processes[0].elements![0] as CallActivity;
    expect(call.doc).toBe('sub-process-docs');
    expect(call.service).toBe('external-service');
  });

  it('parses quoted doc values', () => {
    const input = `process: test
  task: t1
    doc: "my-anchor"
    service: "my-service"
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![0] as Task;
    expect(task.doc).toBe('my-anchor');
    expect(task.service).toBe('my-service');
  });

  it('elements without doc/service remain undefined', () => {
    const input = `process: test
  task: plain
    name: "Plain Task"
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![0] as Task;
    expect(task.doc).toBeUndefined();
    expect(task.service).toBeUndefined();
  });
});

describe('extractDocLinks', () => {
  it('extracts doc links from tasks', () => {
    const input = `process: test
  task: browse
    doc: browsing
  task: validate
    doc: validation
  task: plain
    name: "No doc"
`;
    const { document } = parse(input);
    const links = extractDocLinks(document!);
    expect(links).toEqual([
      { elementId: 'browse', anchor: 'browsing' },
      { elementId: 'validate', anchor: 'validation' },
    ]);
  });

  it('returns empty array when no doc attrs', () => {
    const input = `process: test
  task: t1
    name: "No doc"
`;
    const { document } = parse(input);
    expect(extractDocLinks(document!)).toEqual([]);
  });
});

describe('extractServiceRefs', () => {
  it('extracts service refs from tasks', () => {
    const input = `process: test
  task: browse
    service: catalog-ui
  task: validate
    service: order-service
`;
    const { document } = parse(input);
    const refs = extractServiceRefs(document!);
    expect(refs).toEqual([
      { elementId: 'browse', serviceId: 'catalog-ui' },
      { elementId: 'validate', serviceId: 'order-service' },
    ]);
  });

  it('extracts mixed doc and service refs', () => {
    const input = `process: test
  task: browse
    doc: browsing
    service: catalog-ui
  gateway: check
    type: exclusive
    doc: inventory-check
`;
    const { document } = parse(input);
    const links = extractDocLinks(document!);
    const refs = extractServiceRefs(document!);
    expect(links).toHaveLength(2);
    expect(refs).toHaveLength(1);
    expect(refs[0].serviceId).toBe('catalog-ui');
  });
});
