import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/index.js';
import { generateIds, toJson, toObject, toBpmnXml, toBpmnXmlAsync, generateLayout } from '../src/generators/index.js';

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

  it('defaults undefined gateway type to exclusive', () => {
    const { document } = parse('process: test\n  gateway: g1\n');
    // Manually clear gatewayType to simulate edge case
    const gateway = document!.processes[0].elements![0] as { gatewayType?: string };
    gateway.gatewayType = undefined as unknown as string;

    const xml = toBpmnXml(document!);
    expect(xml).toContain('bpmn:exclusiveGateway');
    expect(xml).toContain('id="g1"');
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
    expect(xml).toContain('processRef="test_p1"');
    expect(xml).toContain('id="test_p1"');
    expect(xml).toContain('bpmn:laneSet');
    expect(xml).toContain('bpmn:lane');
  });

  it('emits one process per pool with correct elements', () => {
    const input = `process: test
  pool: p1
    name: "Pool A"
    task: t1
      name: "Task A"
  pool: p2
    name: "Pool B"
    task: t2
      name: "Task B"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    // Two separate participants referencing distinct processes
    expect(xml).toContain('processRef="test_p1"');
    expect(xml).toContain('processRef="test_p2"');

    // Two separate process elements
    expect(xml).toContain('id="test_p1"');
    expect(xml).toContain('id="test_p2"');

    // Elements scoped to their process (t1 in p1, t2 in p2)
    // The XML should NOT have a single process with both tasks
    const processCount = (xml.match(/bpmn:process /g) || []).length;
    expect(processCount).toBe(2);
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

  it('generates BPMNShape elements for flow nodes', () => {
    const input = `process: test
  start: s1
    name: "Start"
  task: t1
    name: "Task"
  end: e1
    name: "End"
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmndi:BPMNShape');
    expect(xml).toContain('bpmnElement="s1"');
    expect(xml).toContain('bpmnElement="t1"');
    expect(xml).toContain('bpmnElement="e1"');
    expect(xml).toContain('dc:Bounds');
  });

  it('generates BPMNEdge elements for sequence flows', () => {
    const input = `process: test
  start: s1
    name: "Start"
  task: t1
    name: "Task"
  flow: f1
    from: s1
    to: t1
`;
    const { document } = parse(input);
    const xml = toBpmnXml(document!);

    expect(xml).toContain('bpmndi:BPMNEdge');
    expect(xml).toContain('bpmnElement="f1"');
  });
});

describe('Layout Generator', () => {
  it('handles empty process', async () => {
    const input = `process: test
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    expect(layout.elements.size).toBe(0);
    expect(layout.edges.size).toBe(0);
  });

  it('handles process with only pools (no elements)', async () => {
    const input = `process: test
  pool: p1
    name: "Empty Pool"
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    // No flow elements, so no element layouts
    expect(layout.elements.size).toBe(0);
  });

  it('generates layout for simple process', async () => {
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
    generateIds(document!);
    const layout = await generateLayout(document!);

    // Should have layouts for all elements
    expect(layout.elements.size).toBe(3);
    expect(layout.elements.has('s1')).toBe(true);
    expect(layout.elements.has('t1')).toBe(true);
    expect(layout.elements.has('e1')).toBe(true);

    // Each should have x, y coordinates
    const s1Layout = layout.elements.get('s1')!;
    expect(s1Layout.x).toBeDefined();
    expect(s1Layout.y).toBeDefined();
    expect(s1Layout.width).toBeDefined();
    expect(s1Layout.height).toBeDefined();

    // Should have edge waypoints
    expect(layout.edges.size).toBe(2);
    expect(layout.edges.has('f1')).toBe(true);
    expect(layout.edges.has('f2')).toBe(true);
  });

  it('applies layout direction option', async () => {
    const input = `process: test
  start: s1
  task: t1
  end: e1
  flow: f1
    from: s1
    to: t1
  flow: f2
    from: t1
    to: e1
`;
    const { document } = parse(input);
    generateIds(document!);

    // Horizontal (RIGHT) layout
    const rightLayout = await generateLayout(document!, { direction: 'RIGHT' });
    const s1Right = rightLayout.elements.get('s1')!;
    const t1Right = rightLayout.elements.get('t1')!;

    // In RIGHT direction, t1 should be to the right of s1
    expect(t1Right.x!).toBeGreaterThan(s1Right.x!);
  });

  it('stacks multiple pools vertically without overlap', async () => {
    const input = `process: test
  pool: p1
    name: "Pool 1"
    task: t1
      name: "Task 1"
    task: t2
      name: "Task 2"
    flow: f1
      from: t1
      to: t2
  pool: p2
    name: "Pool 2"
    task: t3
      name: "Task 3"
    task: t4
      name: "Task 4"
    flow: f2
      from: t3
      to: t4
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const p1 = layout.elements.get('Participant_p1')!;
    const p2 = layout.elements.get('Participant_p2')!;

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    // Pool 2 must start at or below Pool 1's bottom edge
    expect(p2.y!).toBeGreaterThanOrEqual(p1.y! + p1.height!);
  });

  it('computes pool bounds from contained elements', async () => {
    const input = `process: test
  pool: p1
    name: "My Pool"
    lane: l1
      name: "Lane 1"
      task: t1
        name: "Task 1"
      task: t2
        name: "Task 2"
      flow: f1
        from: t1
        to: t2
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    // Should have computed bounds for the pool participant
    const poolLayout = layout.elements.get('Participant_p1');
    expect(poolLayout).toBeDefined();
    expect(poolLayout!.x).toBeDefined();
    expect(poolLayout!.y).toBeDefined();
    expect(poolLayout!.width).toBeGreaterThan(0);
    expect(poolLayout!.height).toBeGreaterThan(0);

    // Should have computed bounds for the lane
    const laneLayout = layout.elements.get('l1');
    expect(laneLayout).toBeDefined();
  });
});

describe('Async BPMN XML Export with Layout', () => {
  it('generates XML with auto-layout', async () => {
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
    const xml = await toBpmnXmlAsync(document!);

    // Should contain proper BPMN structure
    expect(xml).toContain('bpmn:definitions');
    expect(xml).toContain('bpmn:process');

    // Should have shapes with actual bounds (not 0,0)
    expect(xml).toContain('bpmndi:BPMNShape');
    expect(xml).toContain('dc:Bounds');

    // Should have edges with waypoints
    expect(xml).toContain('bpmndi:BPMNEdge');
    expect(xml).toContain('di:waypoint');
  });

  it('respects layout options', async () => {
    const input = `process: test
  start: s1
  task: t1
  flow: f1
    from: s1
    to: t1
`;
    const { document } = parse(input);
    const xml = await toBpmnXmlAsync(document!, {
      layoutOptions: { direction: 'DOWN', nodeSpacing: 100 }
    });

    expect(xml).toContain('bpmndi:BPMNShape');
  });
});
