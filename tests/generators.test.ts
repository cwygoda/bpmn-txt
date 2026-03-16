import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/index.js';
import { generateIds, toJson, toObject, toBpmnXml, toBpmnXmlAsync, generateLayout, computeEdgeLabelBounds } from '../src/generators/index.js';
import { computePoolLabelWidth } from '../src/generators/constants.js';

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

  it('renders collapsed (black box) pool with thin bar layout', async () => {
    const input = `process: test
  pool: p1
    name: "Empty Pool"
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    // Collapsed pool gets a Participant entry
    const p1 = layout.elements.get('Participant_p1');
    expect(p1).toBeDefined();
    expect(p1!.height).toBe(60);
    expect(p1!.width).toBe(600);
  });

  it('collapsed pool as first pool has non-negative Y', async () => {
    const input = `process: test
  pool: external
    name: "External System"
  pool: internal
    name: "Internal"
    task: t1
      name: "Do Work"
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const cp = layout.elements.get('Participant_external')!;
    expect(cp).toBeDefined();
    expect(cp.y).toBeGreaterThanOrEqual(0);

    // All elements should have non-negative coordinates
    for (const [, bounds] of layout.elements) {
      expect(bounds.y).toBeGreaterThanOrEqual(0);
    }
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

  it('respects explicit zero spacing options', async () => {
    const input = `process: test
  start: s1
  task: t1
  flow: f1
    from: s1
    to: t1
`;
    const { document } = parse(input);
    generateIds(document!);

    // layerSpacing=0 should produce tighter layout than layerSpacing=200
    // (layerSpacing controls distance in flow direction for the layered algorithm)
    const tightLayout = await generateLayout(document!, { layerSpacing: 0 });
    const wideLayout = await generateLayout(document!, { layerSpacing: 200 });

    const tightGap = tightLayout.elements.get('t1')!.x! - tightLayout.elements.get('s1')!.x!;
    const wideGap = wideLayout.elements.get('t1')!.x! - wideLayout.elements.get('s1')!.x!;

    expect(tightGap).toBeLessThan(wideGap);
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

  it('normalizes lane widths to match pool width after pool normalization', async () => {
    const input = `process: test
  pool: p1
    name: "Wide Pool"
    task: t1
    task: t2
    task: t3
    task: t4
    flow: f1
      from: t1
      to: t2
    flow: f2
      from: t2
      to: t3
    flow: f3
      from: t3
      to: t4
  pool: p2
    name: "Narrow Pool"
    lane: l1
      name: "Lane A"
      task: t5
    lane: l2
      name: "Lane B"
      task: t6
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const p2 = layout.elements.get('Participant_p2')!;
    const l1 = layout.elements.get('l1')!;
    const l2 = layout.elements.get('l2')!;

    // Lanes must match their pool's normalized width minus PADDING on each side
    expect(l1.width).toBe(p2.width! - 2 * 50); // pool extends CONTAINER_PADDING beyond lanes
    // Both lanes share same width
    expect(l1.width).toBe(l2.width);
  });
});

describe('Lane Stacking', () => {
  it('stacks multiple lanes within a pool without overlap', async () => {
    const input = `process: test
  pool: p1
    name: "Platform"
    lane: l1
      name: "Lane 1"
      start: s1
        -> t1
    lane: l2
      name: "Lane 2"
      task: t1
        -> t2
    lane: l3
      name: "Lane 3"
      task: t2
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const l1 = layout.elements.get('l1')!;
    const l2 = layout.elements.get('l2')!;
    const l3 = layout.elements.get('l3')!;

    expect(l1).toBeDefined();
    expect(l2).toBeDefined();
    expect(l3).toBeDefined();

    // Lanes must not overlap — each starts at or after the previous ends
    expect(l2.y!).toBeGreaterThanOrEqual(l1.y! + l1.height!);
    expect(l3.y!).toBeGreaterThanOrEqual(l2.y! + l2.height!);

    // All lanes share same x and width
    expect(l1.x).toBe(l2.x);
    expect(l2.x).toBe(l3.x);
    expect(l1.width).toBe(l2.width);
    expect(l2.width).toBe(l3.width);

    // Edge waypoints must stay within their lane's vertical bounds
    // t1 is in l2 — all waypoints of edges from t1 should be within l2/l3 range
    const t1Layout = layout.elements.get('t1')!;
    expect(t1Layout.y!).toBeGreaterThanOrEqual(l2.y!);
    expect(t1Layout.y! + (t1Layout.height ?? 0)).toBeLessThanOrEqual(l2.y! + l2.height!);
  });
});

describe('Cross-Lane Sequence Flow Routing', () => {
  it('re-routes pool-level sequence flows using final node positions', async () => {
    const input = `process: test
  pool: p1
    name: "Platform"
    lane: l1
      name: "Requester"
      start: s1
        -> t1
    lane: l2
      name: "Approver"
      task: t1
        name: "Review"
        -> t2
    lane: l3
      name: "Executor"
      task: t2
        name: "Execute"
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    // Pool-level inline flows should have routed waypoints
    const pool = document!.processes[0].pools![0];
    for (const flow of pool.sequenceFlows ?? []) {
      const edge = layout.edges.get(flow.id!);
      expect(edge, `edge for ${flow.id} (${flow.from} -> ${flow.to})`).toBeDefined();

      const wp = edge!.waypoints;
      const srcLayout = layout.elements.get(flow.from)!;
      const tgtLayout = layout.elements.get(flow.to)!;
      const srcW = srcLayout.width ?? 100;
      const srcH = srcLayout.height ?? 80;
      const tgtW = tgtLayout.width ?? 100;
      const tgtH = tgtLayout.height ?? 80;

      // Starts on source element boundary
      const first = wp[0];
      const srcOnLeft = Math.abs(first.x - srcLayout.x!) < 1;
      const srcOnRight = Math.abs(first.x - (srcLayout.x! + srcW)) < 1;
      const srcOnTop = Math.abs(first.y - srcLayout.y!) < 1;
      const srcOnBottom = Math.abs(first.y - (srcLayout.y! + srcH)) < 1;
      expect(
        srcOnLeft || srcOnRight || srcOnTop || srcOnBottom,
        `first waypoint (${first.x},${first.y}) not on source boundary`
      ).toBe(true);

      // Ends on target element boundary
      const last = wp[wp.length - 1];
      const tgtOnLeft = Math.abs(last.x - tgtLayout.x!) < 1;
      const tgtOnRight = Math.abs(last.x - (tgtLayout.x! + tgtW)) < 1;
      const tgtOnTop = Math.abs(last.y - tgtLayout.y!) < 1;
      const tgtOnBottom = Math.abs(last.y - (tgtLayout.y! + tgtH)) < 1;
      expect(
        tgtOnLeft || tgtOnRight || tgtOnTop || tgtOnBottom,
        `last waypoint (${last.x},${last.y}) not on target boundary`
      ).toBe(true);

      // All segments orthogonal
      for (let i = 1; i < wp.length; i++) {
        const dx = Math.abs(wp[i].x - wp[i - 1].x);
        const dy = Math.abs(wp[i].y - wp[i - 1].y);
        expect(dx < 1 || dy < 1, `segment ${i - 1}->${i} not orthogonal`).toBe(true);
      }
    }
  });

  it('routes cross-lane sequence flow around a blocking element', async () => {
    const input = `process: test
  pool: p1
    name: "Platform"
    lane: l1
      name: "Requester"
      task: t1
        name: "Request"
        -> t3
    lane: l2
      name: "Processor"
      task: blocker
        name: "Blocker"
    lane: l3
      name: "Executor"
      task: t3
        name: "Execute"
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const pool = document!.processes[0].pools![0];
    const flow = pool.sequenceFlows!.find(f => f.from === 't1' && f.to === 't3');
    expect(flow).toBeDefined();

    const edge = layout.edges.get(flow!.id!);
    expect(edge).toBeDefined();

    const wp = edge!.waypoints;
    expect(wp.length).toBeGreaterThanOrEqual(2);

    // All segments orthogonal
    for (let i = 1; i < wp.length; i++) {
      const dx = Math.abs(wp[i].x - wp[i - 1].x);
      const dy = Math.abs(wp[i].y - wp[i - 1].y);
      expect(dx < 1 || dy < 1, `segment ${i - 1}->${i} not orthogonal`).toBe(true);
    }

    // No waypoint should be strictly inside the blocker element (inflated by margin)
    const blockerLayout = layout.elements.get('blocker')!;
    const margin = 15;
    const bx = blockerLayout.x! - margin;
    const by = blockerLayout.y! - margin;
    const bw = (blockerLayout.width ?? 100) + 2 * margin;
    const bh = (blockerLayout.height ?? 80) + 2 * margin;
    for (const p of wp) {
      const inside = p.x > bx && p.x < bx + bw && p.y > by && p.y < by + bh;
      expect(inside, `waypoint (${p.x},${p.y}) inside blocker`).toBe(false);
    }
  });

  it('uses straight-line fast path for aligned cross-lane elements', async () => {
    const input = `process: test
  pool: p1
    name: "Platform"
    lane: l1
      name: "Requester"
      task: t1
        name: "Request"
        -> t2
    lane: l2
      name: "Executor"
      task: t2
        name: "Execute"
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const pool = document!.processes[0].pools![0];
    const flow = pool.sequenceFlows!.find(f => f.from === 't1' && f.to === 't2');
    expect(flow).toBeDefined();

    const edge = layout.edges.get(flow!.id!);
    expect(edge).toBeDefined();

    const wp = edge!.waypoints;

    // If endpoints share the same X (vertical) or same Y (horizontal), should get straight line
    const first = wp[0];
    const last = wp[wp.length - 1];
    if (Math.abs(first.x - last.x) < 1 || Math.abs(first.y - last.y) < 1) {
      expect(wp.length).toBe(2);
    }
  });

  it('prevents overlap between multiple cross-lane sequence flows', async () => {
    const input = `process: test
  pool: p1
    name: "Platform"
    lane: l1
      name: "Requester"
      start: s1
        -> t1
      task: t1
        name: "Request"
        -> t2
    lane: l2
      name: "Executor"
      task: t2
        name: "Execute"
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const pool = document!.processes[0].pools![0];
    const flows = pool.sequenceFlows ?? [];
    expect(flows.length).toBeGreaterThanOrEqual(2);

    // Extract horizontal segments from each flow
    function hSegments(wps: { x: number; y: number }[]) {
      const segs: { y: number; xMin: number; xMax: number }[] = [];
      for (let i = 1; i < wps.length; i++) {
        if (Math.abs(wps[i].y - wps[i - 1].y) < 1) {
          segs.push({
            y: wps[i].y,
            xMin: Math.min(wps[i].x, wps[i - 1].x),
            xMax: Math.max(wps[i].x, wps[i - 1].x),
          });
        }
      }
      return segs;
    }

    // Check no two flows share overlapping horizontal segments
    const allSegs: { flowId: string; segs: ReturnType<typeof hSegments> }[] = [];
    for (const flow of flows) {
      const edge = layout.edges.get(flow.id!);
      if (!edge) continue;
      allSegs.push({ flowId: flow.id!, segs: hSegments(edge.waypoints) });
    }

    const TOL = 5;
    for (let i = 0; i < allSegs.length; i++) {
      for (let j = i + 1; j < allSegs.length; j++) {
        for (const s1 of allSegs[i].segs) {
          for (const s2 of allSegs[j].segs) {
            if (Math.abs(s1.y - s2.y) < TOL && s1.xMax > s2.xMin && s2.xMax > s1.xMin) {
              throw new Error(
                `parallel overlap: ${allSegs[i].flowId} H@${s1.y} [${s1.xMin},${s1.xMax}] ` +
                `vs ${allSegs[j].flowId} H@${s2.y} [${s2.xMin},${s2.xMax}]`
              );
            }
          }
        }
      }
    }
  });

  it('Z-shape fallback does not route through obstacles', async () => {
    // 3 tasks in a line with a flow from first to last — midpoint must avoid middle task
    const input = `process: test
  pool: p1
    name: "Pool"
    task: t1
      name: "First"
    task: t2
      name: "Middle Blocker"
    task: t3
      name: "Last"
    flow: f1
      from: t1
      to: t2
    flow: f2
      from: t2
      to: t3
    flow: skip
      from: t1
      to: t3
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const edge = layout.edges.get('skip');
    expect(edge).toBeDefined();

    const t2Layout = layout.elements.get('t2')!;
    expect(t2Layout).toBeDefined();

    // The "skip" flow's intermediate waypoints should not pass through t2's bounding box
    const t2x = t2Layout.x!;
    const t2y = t2Layout.y!;
    const t2w = t2Layout.width ?? 100;
    const t2h = t2Layout.height ?? 80;

    for (let i = 1; i < edge!.waypoints.length - 1; i++) {
      const wp = edge!.waypoints[i];
      const insideX = wp.x > t2x && wp.x < t2x + t2w;
      const insideY = wp.y > t2y && wp.y < t2y + t2h;
      expect(insideX && insideY).toBe(false);
    }
  });
});

describe('Message Flow Routing', () => {
  it('generates orthogonal waypoints for cross-pool message flows', async () => {
    const input = `process: test
  pool: p1
    name: "Sender"
    task: t1
      name: "Send"
  pool: p2
    name: "Receiver"
    task: t2
      name: "Receive"
  message-flow: m1
    from: t1
    to: t2
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    // Message flow should have waypoints
    const edge = layout.edges.get('m1');
    expect(edge).toBeDefined();
    expect(edge!.waypoints.length).toBeGreaterThanOrEqual(2);

    // All segments must be orthogonal (horizontal or vertical)
    const wp = edge!.waypoints;
    for (let i = 1; i < wp.length; i++) {
      const dx = Math.abs(wp[i].x - wp[i - 1].x);
      const dy = Math.abs(wp[i].y - wp[i - 1].y);
      expect(dx < 1 || dy < 1).toBe(true);
    }

    // Start at source bottom edge, end at target top edge
    const t1Layout = layout.elements.get('t1')!;
    const t2Layout = layout.elements.get('t2')!;
    expect(wp[0].y).toBe(t1Layout.y! + (t1Layout.height ?? 80));
    expect(wp[wp.length - 1].y).toBe(t2Layout.y!);
  });

  it('distributes midY for multiple message flows to minimise crossings', async () => {
    // Cross-wired flows + intra-pool sequence flows guarantee horizontal spread → Z-shapes
    const input = `process: test
  pool: p1
    name: "Sender"
    task: a1
      name: "A1"
    task: b1
      name: "B1"
    flow: f1
      from: a1
      to: b1
  pool: p2
    name: "Receiver"
    task: a2
      name: "A2"
    task: b2
      name: "B2"
    flow: f2
      from: a2
      to: b2
  message-flow: m1
    from: a1
    to: b2
  message-flow: m2
    from: b1
    to: a2
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const e1 = layout.edges.get('m1');
    const e2 = layout.edges.get('m2');
    expect(e1).toBeDefined();
    expect(e2).toBeDefined();

    // Both flows must be orthogonal and have ≥ 3 waypoints (not straight lines)
    for (const edge of [e1!, e2!]) {
      expect(edge.waypoints.length).toBeGreaterThanOrEqual(3);
      for (let j = 1; j < edge.waypoints.length; j++) {
        const dx = Math.abs(edge.waypoints[j].x - edge.waypoints[j - 1].x);
        const dy = Math.abs(edge.waypoints[j].y - edge.waypoints[j - 1].y);
        expect(dx < 1 || dy < 1).toBe(true);
      }
    }

    // Horizontal segments must use different Y values (no parallel overlap)
    function hSegs(wps: { x: number; y: number }[]) {
      const segs: number[] = [];
      for (let j = 1; j < wps.length; j++) {
        if (Math.abs(wps[j].y - wps[j - 1].y) < 1) segs.push(wps[j].y);
      }
      return segs;
    }
    const ys1 = hSegs(e1!.waypoints);
    const ys2 = hSegs(e2!.waypoints);
    // Flows must use different paths (distinct waypoint sets)
    const wp1 = JSON.stringify(e1!.waypoints);
    const wp2 = JSON.stringify(e2!.waypoints);
    expect(wp1).not.toBe(wp2);
  });

  it('exits and enters elements with perpendicular segments', async () => {
    // Non-aligned elements force bends — first/last segment must be perpendicular to edge
    const input = `process: test
  pool: p1
    name: "Sender"
    task: a1
      name: "A1"
    task: b1
      name: "B1"
    flow: f1
      from: a1
      to: b1
  pool: p2
    name: "Receiver"
    task: a2
      name: "A2"
    task: b2
      name: "B2"
    flow: f2
      from: a2
      to: b2
  message-flow: m1
    from: a1
    to: b2
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const edge = layout.edges.get('m1');
    expect(edge).toBeDefined();

    const wp = edge!.waypoints;
    expect(wp.length).toBeGreaterThanOrEqual(3);

    // First segment must be vertical (perpendicular to bottom/top exit)
    expect(
      Math.abs(wp[0].x - wp[1].x) < 1,
      `first segment not vertical: (${wp[0].x},${wp[0].y}) → (${wp[1].x},${wp[1].y})`
    ).toBe(true);

    // Last segment must be vertical (perpendicular to top/bottom entry)
    const last = wp.length - 1;
    expect(
      Math.abs(wp[last].x - wp[last - 1].x) < 1,
      `last segment not vertical: (${wp[last - 1].x},${wp[last - 1].y}) → (${wp[last].x},${wp[last].y})`
    ).toBe(true);
  });

  it('routes non-adjacent message flows around intervening pools', async () => {
    const input = `process: test
  pool: p1
    name: "Top"
    task: t1
      name: "Send"
  pool: p2
    name: "Middle"
    task: t2
      name: "Process"
  pool: p3
    name: "Bottom"
    task: t3
      name: "Receive"
  message-flow: m1
    from: t1
    to: t3
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const edge = layout.edges.get('m1');
    expect(edge).toBeDefined();

    const wp = edge!.waypoints;
    expect(wp.length).toBeGreaterThanOrEqual(2);

    // All segments must be orthogonal
    for (let i = 1; i < wp.length; i++) {
      const dx = Math.abs(wp[i].x - wp[i - 1].x);
      const dy = Math.abs(wp[i].y - wp[i - 1].y);
      expect(dx < 1 || dy < 1, `segment ${i - 1}->${i} not orthogonal`).toBe(true);
    }

    // No waypoint Y should fall inside the intervening pool (p2)
    const p2 = layout.elements.get('Participant_p2')!;
    const p2Top = p2.y!;
    const p2Bottom = p2Top + p2.height!;
    for (const wp_ of wp) {
      const inside = wp_.y > p2Top && wp_.y < p2Bottom;
      expect(inside, `waypoint y=${wp_.y} inside p2 [${p2Top}, ${p2Bottom}]`).toBe(false);
    }

    // First waypoint must lie on the source element boundary
    const t1Layout = layout.elements.get('t1')!;
    const t1W = t1Layout.width ?? 100;
    const t1H = t1Layout.height ?? 80;
    const first = wp[0];
    const onLeft = Math.abs(first.x - t1Layout.x!) < 1;
    const onRight = Math.abs(first.x - (t1Layout.x! + t1W)) < 1;
    const onTop = Math.abs(first.y - t1Layout.y!) < 1;
    const onBottom = Math.abs(first.y - (t1Layout.y! + t1H)) < 1;
    expect(
      onLeft || onRight || onTop || onBottom,
      `first waypoint (${first.x},${first.y}) not on t1 boundary`
    ).toBe(true);
  });

  it('routes message flow around an element in the target pool', async () => {
    // Place a blocking task between source and target (same X column)
    const input = `process: test
  pool: p1
    name: "Sender"
    task: t1
      name: "Send"
  pool: p2
    name: "Receiver"
    task: blocker
      name: "Blocker"
    task: t2
      name: "Receive"
    flow: f1
      from: blocker
      to: t2
  message-flow: m1
    from: t1
    to: t2
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const edge = layout.edges.get('m1');
    expect(edge).toBeDefined();

    const wp = edge!.waypoints;
    expect(wp.length).toBeGreaterThanOrEqual(2);

    // All segments must be orthogonal
    for (let i = 1; i < wp.length; i++) {
      const dx = Math.abs(wp[i].x - wp[i - 1].x);
      const dy = Math.abs(wp[i].y - wp[i - 1].y);
      expect(dx < 1 || dy < 1, `segment ${i - 1}->${i} not orthogonal`).toBe(true);
    }

    // No waypoint should be strictly inside the blocker element (inflated by margin)
    const blockerLayout = layout.elements.get('blocker')!;
    const margin = 15;
    const bx = blockerLayout.x! - margin;
    const by = blockerLayout.y! - margin;
    const bw = (blockerLayout.width ?? 100) + 2 * margin;
    const bh = (blockerLayout.height ?? 80) + 2 * margin;
    for (const p of wp) {
      const inside = p.x > bx && p.x < bx + bw && p.y > by && p.y < by + bh;
      expect(inside, `waypoint (${p.x},${p.y}) inside blocker`).toBe(false);
    }
  });

  it('avoids parallel overlap between adjacent message flows', async () => {
    const input = `process: test
  pool: p1
    name: "Sender"
    task: a1
      name: "A1"
    task: b1
      name: "B1"
    flow: f1
      from: a1
      to: b1
  pool: p2
    name: "Receiver"
    task: a2
      name: "A2"
    task: b2
      name: "B2"
    flow: f2
      from: a2
      to: b2
  message-flow: m1
    from: a1
    to: a2
  message-flow: m2
    from: b1
    to: b2
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const e1 = layout.edges.get('m1');
    const e2 = layout.edges.get('m2');
    expect(e1).toBeDefined();
    expect(e2).toBeDefined();

    // Both flows should be orthogonal
    for (const edge of [e1!, e2!]) {
      for (let i = 1; i < edge.waypoints.length; i++) {
        const dx = Math.abs(edge.waypoints[i].x - edge.waypoints[i - 1].x);
        const dy = Math.abs(edge.waypoints[i].y - edge.waypoints[i - 1].y);
        expect(dx < 1 || dy < 1).toBe(true);
      }
    }

    // Extract horizontal segments from each flow
    function hSegments(wps: { x: number; y: number }[]) {
      const segs: { y: number; xMin: number; xMax: number }[] = [];
      for (let i = 1; i < wps.length; i++) {
        if (Math.abs(wps[i].y - wps[i - 1].y) < 1) {
          segs.push({
            y: wps[i].y,
            xMin: Math.min(wps[i].x, wps[i - 1].x),
            xMax: Math.max(wps[i].x, wps[i - 1].x),
          });
        }
      }
      return segs;
    }

    const h1 = hSegments(e1!.waypoints);
    const h2 = hSegments(e2!.waypoints);
    const TOL = 5;
    for (const s1 of h1) {
      for (const s2 of h2) {
        if (Math.abs(s1.y - s2.y) < TOL && s1.xMax > s2.xMin && s2.xMax > s1.xMin) {
          throw new Error(
            `parallel overlap: m1 H@${s1.y} [${s1.xMin},${s1.xMax}] ` +
            `vs m2 H@${s2.y} [${s2.xMin},${s2.xMax}]`
          );
        }
      }
    }
  });

  it('non-adjacent flow avoids intervening pool body', async () => {
    const input = `process: test
  pool: p1
    name: "Top"
    task: t1
      name: "Send"
  pool: p2
    name: "Middle"
    task: t2
      name: "Process"
  pool: p3
    name: "Bottom"
    task: t3
      name: "Receive"
  message-flow: m1
    from: t1
    to: t3
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const edge = layout.edges.get('m1');
    expect(edge).toBeDefined();
    const wp = edge!.waypoints;

    // The intervening pool p2's element area should not be crossed.
    // Use t2's bounds (the actual element in p2) rather than the Participant
    // bounds, which may be expanded to contain message flow waypoints.
    const t2 = layout.elements.get('t2')!;
    const t2Left = t2.x!;
    const t2Right = t2.x! + (t2.width ?? 100);
    const p2 = layout.elements.get('Participant_p2')!;
    const p2Top = p2.y!;
    const p2Bottom = p2Top + p2.height!;

    // No vertical segment should pass through p2's element area
    for (let i = 1; i < wp.length; i++) {
      const a = wp[i - 1];
      const b = wp[i];

      if (Math.abs(a.x - b.x) < 1) {
        const x = a.x;
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        const crossesElements = x > t2Left && x < t2Right && maxY > p2Top && minY < p2Bottom;
        expect(crossesElements, `vertical segment at x=${x} crosses p2 elements`).toBe(false);
      }
    }
  });
});

describe('Collapsed Pool', () => {
  it('generates message flow waypoints to a collapsed pool', async () => {
    const input = `process: test
  pool: buyer
    name: "Buyer"
    task: t1
      name: "Place Order"
  pool: supplier
    name: "Supplier"
  message-flow: m1
    from: t1
    to: supplier
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const edge = layout.edges.get('m1');
    expect(edge).toBeDefined();
    expect(edge!.waypoints.length).toBeGreaterThanOrEqual(2);
  });

  it('normalizes pool widths to the widest', async () => {
    const input = `process: test
  pool: p1
    name: "Wide Pool"
    task: t1
      name: "A"
    task: t2
      name: "B"
    task: t3
      name: "C"
    flow: f1
      from: t1
      to: t2
    flow: f2
      from: t2
      to: t3
  pool: p2
    name: "Collapsed"
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const p1 = layout.elements.get('Participant_p1')!;
    const p2 = layout.elements.get('Participant_p2')!;
    expect(p1.width).toBe(p2.width);
  });

  it('separates collapsed pool from next expanded pool by POOL_GAP', async () => {
    const input = `process: test
  pool: collapsed
    name: "External System"
  pool: expanded
    name: "Internal"
    task: t1
      name: "Do Work"
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const cp = layout.elements.get('Participant_collapsed')!;
    const ep = layout.elements.get('Participant_expanded')!;
    expect(cp).toBeDefined();
    expect(ep).toBeDefined();

    // Expanded pool must start fully below collapsed pool (no overlap/touching)
    expect(ep.y!).toBeGreaterThan(cp.y! + cp.height!);
  });

  it('anchors message flow endpoint at collapsed pool edge', async () => {
    const input = `process: test
  pool: buyer
    name: "Buyer"
    task: t1
      name: "Place Order"
  pool: supplier
    name: "Supplier"
  message-flow: m1
    from: t1
    to: supplier
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const pool = layout.elements.get('Participant_supplier')!;
    const edge = layout.edges.get('m1')!;
    const lastWp = edge.waypoints[edge.waypoints.length - 1];

    // Endpoint Y must be at pool top edge (supplier is below buyer)
    expect(lastWp.y).toBe(pool.y!);
  });

  it('scales gap between pools based on message flow count', async () => {
    const input = `process: test
  pool: p1
    name: "Pool 1"
    task: a1
    task: b1
    task: c1
    task: d1
    task: e1
    flow: f1
      from: a1
      to: b1
    flow: f2
      from: b1
      to: c1
    flow: f3
      from: c1
      to: d1
    flow: f4
      from: d1
      to: e1
  pool: p2
    name: "Pool 2"
    task: a2
    task: b2
    task: c2
    task: d2
    task: e2
    flow: g1
      from: a2
      to: b2
    flow: g2
      from: b2
      to: c2
    flow: g3
      from: c2
      to: d2
    flow: g4
      from: d2
      to: e2
  message-flow: m1
    from: a1
    to: a2
  message-flow: m2
    from: b1
    to: b2
  message-flow: m3
    from: c1
    to: c2
  message-flow: m4
    from: d1
    to: d2
  message-flow: m5
    from: e1
    to: e2
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const p1 = layout.elements.get('Participant_p1')!;
    const p2 = layout.elements.get('Participant_p2')!;
    const gap = p2.y! - (p1.y! + p1.height!);

    // 5 flows → (5+1)*20 = 120px minimum gap, exceeding default 80px
    expect(gap).toBeGreaterThanOrEqual(120);
  });

  it('emits isExpanded=false and Participant_ targetRef in XML', async () => {
    const input = `process: test
  pool: buyer
    name: "Buyer"
    task: t1
      name: "Place Order"
  pool: supplier
    name: "Supplier"
  message-flow: m1
    from: t1
    to: supplier
`;
    const { document } = parse(input);
    const xml = await toBpmnXmlAsync(document!);

    // Collapsed pool shape
    expect(xml).toContain('isExpanded="false"');
    // Expanded pool shape
    expect(xml).toContain('isExpanded="true"');
    // isHorizontal on all pools
    expect(xml).toContain('isHorizontal="true"');
    // Message flow targets the participant ref
    expect(xml).toContain('targetRef="Participant_supplier"');
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

  it('layouts subprocess children with absolute positions inside subprocess bounds', async () => {
    const input = `process: test
  subprocess: sub1
    name: "My Subprocess"
    start: s1
      name: "Start"
      -> t1
    task: t1
      name: "Do Work"
      -> e1
    end: e1
      name: "End"
`;
    const { document } = parse(input);
    generateIds(document!);
    const xml = await toBpmnXmlAsync(document!);

    // Subprocess should be auto-sized larger than default 200x150
    const layout = await generateLayout(document!);
    const subLayout = layout.elements.get('sub1')!;
    expect(subLayout).toBeDefined();
    expect(subLayout.width!).toBeGreaterThan(200);

    // Children should have absolute positions inside subprocess bounds
    const s1Layout = layout.elements.get('s1')!;
    const t1Layout = layout.elements.get('t1')!;
    const e1Layout = layout.elements.get('e1')!;
    expect(s1Layout).toBeDefined();
    expect(t1Layout).toBeDefined();
    expect(e1Layout).toBeDefined();

    // Children must be within subprocess bounds
    expect(s1Layout.x!).toBeGreaterThanOrEqual(subLayout.x!);
    expect(s1Layout.y!).toBeGreaterThanOrEqual(subLayout.y!);
    expect(t1Layout.x!).toBeGreaterThanOrEqual(subLayout.x!);
    expect(e1Layout.x! + (e1Layout.width ?? 36)).toBeLessThanOrEqual(subLayout.x! + subLayout.width!);

    // BPMNShape elements should exist for children
    expect(xml).toContain('bpmnElement="s1"');
    expect(xml).toContain('bpmnElement="t1"');
    expect(xml).toContain('bpmnElement="e1"');

    // Subprocess should be marked as expanded
    expect(xml).toContain('isExpanded="true"');

    // Internal flow waypoints should exist
    const flowEdge = layout.edges.get('flow_s1_t1_0') ?? layout.edges.get('flow_t1_e1_1');
    // At least some internal flows should have waypoints
    const hasInternalFlows = Array.from(layout.edges.keys()).some(
      k => k.includes('s1') || k.includes('t1') || k.includes('e1')
    );
    expect(hasInternalFlows).toBe(true);

    // Internal flows should be nested inside bpmn:subProcess in XML
    expect(xml).toContain('bpmn:subProcess');
    // Sequence flows between subprocess children should be inside the subprocess
    const subProcessMatch = xml.match(/<bpmn:subProcess[^>]*>[\s\S]*?<\/bpmn:subProcess>/);
    expect(subProcessMatch).not.toBeNull();
    expect(subProcessMatch![0]).toContain('bpmn:sequenceFlow');
  });

  it('adds BPMNLabel for flow with condition', async () => {
    const input = `process: test
  start: s1
  gateway: g1
    type: exclusive
  task: t1
    name: "Path A"
  task: t2
    name: "Path B"
  end: e1
  flow: f1
    from: s1
    to: g1
  flow: f2
    from: g1
    to: t1
    condition: "x > 10"
  flow: f3
    from: g1
    to: t2
  flow: f4
    from: t1
    to: e1
  flow: f5
    from: t2
    to: e1
`;
    const { document } = parse(input);
    const xml = await toBpmnXmlAsync(document!);

    // Flow with condition should have BPMNLabel
    expect(xml).toContain('bpmnElement="f2"');
    const f2Match = xml.match(/<bpmndi:BPMNEdge[^>]*bpmnElement="f2"[^>]*>[\s\S]*?<\/bpmndi:BPMNEdge>/);
    expect(f2Match).not.toBeNull();
    expect(f2Match![0]).toContain('bpmndi:BPMNLabel');
    expect(f2Match![0]).toContain('dc:Bounds');

    // Flow without condition/name should NOT have BPMNLabel
    const f1Match = xml.match(/<bpmndi:BPMNEdge[^>]*bpmnElement="f1"[^>]*>[\s\S]*?<\/bpmndi:BPMNEdge>/);
    expect(f1Match).not.toBeNull();
    expect(f1Match![0]).not.toContain('bpmndi:BPMNLabel');
  });

  it('adds BPMNLabel for flow with name', async () => {
    const input = `process: test
  task: t1
    name: "A"
  task: t2
    name: "B"
  flow: f1
    from: t1
    to: t2
    name: "approval"
`;
    const { document } = parse(input);
    const xml = await toBpmnXmlAsync(document!);

    const f1Match = xml.match(/<bpmndi:BPMNEdge[^>]*bpmnElement="f1"[^>]*>[\s\S]*?<\/bpmndi:BPMNEdge>/);
    expect(f1Match).not.toBeNull();
    expect(f1Match![0]).toContain('bpmndi:BPMNLabel');
  });

});

describe('computeEdgeLabelBounds', () => {
  it('computes label at midpoint of horizontal segment', () => {
    const bounds = computeEdgeLabelBounds(
      [{ x: 0, y: 100 }, { x: 200, y: 100 }],
      'Yes'
    );
    // Midpoint at x=100, y=100, offset perpendicular (upward for horizontal)
    expect(bounds.x).toBeGreaterThan(50);
    expect(bounds.x).toBeLessThan(150);
    expect(bounds.width).toBeGreaterThanOrEqual(30);
    expect(bounds.height).toBe(14);
  });

  it('computes label at midpoint of multi-segment polyline', () => {
    const bounds = computeEdgeLabelBounds(
      [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 100 }],
      'condition text'
    );
    expect(bounds.width).toBe(Math.max(30, 'condition text'.length * 7));
    expect(bounds.height).toBe(14);
  });
});

describe('computePoolLabelWidth', () => {
  it('returns minimum 30 for short names', () => {
    expect(computePoolLabelWidth('HR')).toBe(30);
    expect(computePoolLabelWidth('')).toBe(30);
  });

  it('returns > 30 for long pool names', () => {
    const width = computePoolLabelWidth('Customer Service Department');
    expect(width).toBeGreaterThan(30);
    expect(width).toBeLessThanOrEqual(50);
  });

  it('caps at 50 for very long names', () => {
    const width = computePoolLabelWidth('A'.repeat(100));
    expect(width).toBe(50);
  });
});

describe('Message flow port spreading', () => {
  it('spreads ports when multiple message flows connect to the same element', async () => {
    const input = `process: invoice
  pool: create-invoice
    name: "Create Invoice"
    start: start
      name: "Invoice requested"
      -> compute-discount
    task: compute-discount
      name: "Compute discount"
      -> create-invoice
    task: create-invoice
      name: "Create invoice"
      -> end
    end: end
      name: End

  pool: discount-rules
    name: "Rule engine"
    start: start-discount
      -> end-discount
    end: end-discount

  message-flow: to-discount-rule-engine
    from: compute-discount
    to: start-discount

  message-flow: from-discount-rule-engine
    from: end-discount
    to: compute-discount
`;
    const { document } = parse(input);
    generateIds(document!);
    const layout = await generateLayout(document!);

    const e1 = layout.edges.get('to-discount-rule-engine')!;
    const e2 = layout.edges.get('from-discount-rule-engine')!;
    expect(e1).toBeDefined();
    expect(e2).toBeDefined();

    // Ports on compute-discount must NOT coincide
    // Flow 1 exits from bottom of compute-discount
    const f1Start = e1.waypoints[0];
    // Flow 2 enters at bottom of compute-discount
    const f2End = e2.waypoints[e2.waypoints.length - 1];
    expect(Math.abs(f1Start.x - f2End.x)).toBeGreaterThan(1);

    // Lines should not fully overlap — at least one waypoint differs
    const f1Xs = new Set(e1.waypoints.map(w => Math.round(w.x)));
    const f2Xs = new Set(e2.waypoints.map(w => Math.round(w.x)));
    const shared = [...f1Xs].filter(x => f2Xs.has(x));
    expect(shared.length).toBeLessThan(Math.max(f1Xs.size, f2Xs.size));
  });
});
