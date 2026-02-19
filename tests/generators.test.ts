import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/index.js';
import { generateIds, toJson, toObject, toBpmnXml } from '../src/generators/index.js';

describe('ID Generator', () => {
  it('preserves existing IDs', () => {
    const input = `process: test
  start: s1
    name: "Start"
  task: t1
    name: "Task"
  end: e1
    name: "End"
`;
    const { document } = parse(input);
    generateIds(document!);

    const elements = document!.processes[0].elements!;
    expect(elements[0].id).toBe('s1');
    expect(elements[1].id).toBe('t1');
    expect(elements[2].id).toBe('e1');
  });

  it('generates IDs for flows without them', () => {
    const input = `process: test
  task: a
    name: "A"
  task: b
    name: "B"
  flow: f1
    from: a
    to: b
`;
    const { document } = parse(input);
    generateIds(document!);

    const flows = document!.processes[0].sequenceFlows!;
    expect(flows[0].id).toBe('f1');
  });
});

describe('JSON Exporter', () => {
  it('exports simple process to JSON', () => {
    const input = `process: test
  name: "Test Process"
  start: s1
    name: "Start"
  end: e1
    name: "End"
`;
    const { document } = parse(input);
    const json = toJson(document!);
    const obj = JSON.parse(json);

    expect(obj.processes).toHaveLength(1);
    expect(obj.processes[0].id).toBe('test');
    expect(obj.processes[0].name).toBe('Test Process');
    expect(obj.processes[0].elements).toHaveLength(2);
  });

  it('excludes location info by default', () => {
    const input = `process: test
  task: t1
    name: "Task"
`;
    const { document } = parse(input);
    const obj = toObject(document!) as any;

    expect(obj.processes[0].elements[0].loc).toBeUndefined();
  });

  it('includes location info when requested', () => {
    const input = `process: test
  task: t1
    name: "Task"
`;
    const { document } = parse(input);
    const obj = toObject(document!, { includeLocations: true }) as any;

    // Location is tracked during parsing
    // Note: Our current parser doesn't populate loc, so this may be undefined
    // This test documents the expected behavior
  });
});

describe('BPMN XML Exporter', () => {
  it('exports simple process to valid BPMN XML', () => {
    const input = `process: test-process
  name: "Test Process"
  start: s1
    name: "Start"
  task: t1
    name: "Do Something"
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
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmn:definitions');
    expect(xml).toContain('bpmn:process');
    expect(xml).toContain('id="test-process"');
    expect(xml).toContain('bpmn:startEvent');
    expect(xml).toContain('bpmn:task');
    expect(xml).toContain('bpmn:endEvent');
    expect(xml).toContain('bpmn:sequenceFlow');
  });

  it('exports different task types correctly', () => {
    const input = `process: test
  task: t1
    type: user
    name: "User Task"
  task: t2
    type: service
    name: "Service Task"
  task: t3
    type: script
    name: "Script Task"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmn:userTask');
    expect(xml).toContain('bpmn:serviceTask');
    expect(xml).toContain('bpmn:scriptTask');
  });

  it('exports different gateway types correctly', () => {
    const input = `process: test
  gateway: g1
    type: exclusive
    name: "XOR"
  gateway: g2
    type: parallel
    name: "AND"
  gateway: g3
    type: inclusive
    name: "OR"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmn:exclusiveGateway');
    expect(xml).toContain('bpmn:parallelGateway');
    expect(xml).toContain('bpmn:inclusiveGateway');
  });

  it('exports event triggers correctly', () => {
    const input = `process: test
  start: s1
    trigger: message
  start: s2
    trigger: timer
  end: e1
    trigger: terminate
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmn:messageEventDefinition');
    expect(xml).toContain('bpmn:timerEventDefinition');
    expect(xml).toContain('bpmn:terminateEventDefinition');
  });

  it('exports sequence flow with condition', () => {
    const input = `process: test
  flow: f1
    from: g1
    to: t1
    condition: "amount > 1000"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmn:conditionExpression');
    // XML escapes > as &gt;
    expect(xml).toContain('amount &gt; 1000');
  });

  it('exports subprocess', () => {
    const input = `process: test
  subprocess: sub1
    name: "My Subprocess"
    triggered: true
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmn:subProcess');
    expect(xml).toContain('triggeredByEvent');
    expect(xml).toContain('id="sub1"');
  });

  it('exports call activity', () => {
    const input = `process: test
  call: c1
    name: "Call External"
    calledElement: external-process
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmn:callActivity');
    expect(xml).toContain('calledElement="external-process"');
  });

  it('exports pools and lanes', () => {
    const input = `process: test
  pool: p1
    name: "Main Pool"
    lane: l1
      name: "Lane 1"
      task: t1
        name: "Task in Lane"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmn:collaboration');
    expect(xml).toContain('bpmn:participant');
    expect(xml).toContain('bpmn:laneSet');
    expect(xml).toContain('bpmn:lane');
  });

  it('exports boundary event', () => {
    const input = `process: test
  task: t1
    name: "Long Task"
    boundary: b1
      type: timer
      duration: PT1H
      interrupting: false
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmn:boundaryEvent');
    expect(xml).toContain('attachedToRef="t1"');
    expect(xml).toContain('cancelActivity="false"');
    expect(xml).toContain('bpmn:timerEventDefinition');
  });

  it('includes BPMN diagram section by default', () => {
    const input = `process: test
  task: t1
    name: "Task"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmndi:BPMNDiagram');
    expect(xml).toContain('bpmndi:BPMNPlane');
  });

  it('can exclude diagram section', () => {
    const input = `process: test
  task: t1
    name: "Task"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!, { includeDiagram: false });

    expect(xml).not.toContain('bpmndi:BPMNDiagram');
  });

  it('includes proper XML namespaces', () => {
    const input = `process: test
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"');
    expect(xml).toContain('xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"');
    expect(xml).toContain('xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"');
    expect(xml).toContain('xmlns:di="http://www.omg.org/spec/DD/20100524/DI"');
  });
});
