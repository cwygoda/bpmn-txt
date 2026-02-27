import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/index.js';

describe('Parser', () => {
  it('parses minimal process', () => {
    const input = `process: test
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
    expect(document!.processes).toHaveLength(1);
    expect(document!.processes[0].id).toBe('test');
  });

  it('parses process with name', () => {
    const input = `process: order-process
  name: "Order Processing"
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document!.processes[0].name).toBe('Order Processing');
  });

  it('parses process with pool', () => {
    const input = `process: collab
  pool: customer
    name: Customer
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document!.processes[0].pools).toHaveLength(1);
    expect(document!.processes[0].pools![0].id).toBe('customer');
    expect(document!.processes[0].pools![0].name).toBe('Customer');
  });

  it('parses pool with lane', () => {
    const input = `process: collab
  pool: warehouse
    lane: shipping
      name: "Shipping Department"
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const pool = document!.processes[0].pools![0];
    expect(pool.lanes).toHaveLength(1);
    expect(pool.lanes![0].id).toBe('shipping');
    expect(pool.lanes![0].name).toBe('Shipping Department');
  });

  it('parses start event', () => {
    const input = `process: test
  start: order-placed
    name: "Order Placed"
    trigger: message
    message: OrderReceived
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const elements = document!.processes[0].elements!;
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('startEvent');
    expect(elements[0].id).toBe('order-placed');
    expect(elements[0].name).toBe('Order Placed');
    const start = elements[0] as { trigger: string; message: string };
    expect(start.trigger).toBe('message');
    expect(start.message).toBe('OrderReceived');
  });

  it('parses end event', () => {
    const input = `process: test
  end: completed
    name: "Process Complete"
    trigger: terminate
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const elements = document!.processes[0].elements!;
    expect(elements[0].type).toBe('endEvent');
    expect(elements[0].id).toBe('completed');
    const end = elements[0] as { trigger: string };
    expect(end.trigger).toBe('terminate');
  });

  it('parses task with type', () => {
    const input = `process: test
  task: review-order
    name: "Review Order"
    type: user
    assignee: manager
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![0];
    expect(task.type).toBe('task');
    expect(task.id).toBe('review-order');
    const t = task as { taskType: string; assignee: string };
    expect(t.taskType).toBe('user');
    expect(t.assignee).toBe('manager');
  });

  it('parses service task', () => {
    const input = `process: test
  task: send-email
    name: "Send Email"
    type: service
    class: com.example.EmailService
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![0] as { taskType: string; class: string };
    expect(task.taskType).toBe('service');
    expect(task.class).toBe('com.example.EmailService');
  });

  it('parses gateway', () => {
    const input = `process: test
  gateway: decision
    name: "Approve?"
    type: exclusive
    default: reject-path
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const gw = document!.processes[0].elements![0];
    expect(gw.type).toBe('gateway');
    expect(gw.id).toBe('decision');
    const g = gw as { gatewayType: string; default: string };
    expect(g.gatewayType).toBe('exclusive');
    expect(g.default).toBe('reject-path');
  });

  it('parses subprocess', () => {
    const input = `process: test
  subprocess: handle-error
    name: "Error Handling"
    triggered: true
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const sp = document!.processes[0].elements![0];
    expect(sp.type).toBe('subprocess');
    expect(sp.id).toBe('handle-error');
    const s = sp as { triggered: boolean };
    expect(s.triggered).toBe(true);
  });

  it('parses call activity', () => {
    const input = `process: test
  call: run-subprocess
    name: "Execute Sub Process"
    calledElement: sub-process-id
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const call = document!.processes[0].elements![0];
    expect(call.type).toBe('callActivity');
    const c = call as { calledElement: string };
    expect(c.calledElement).toBe('sub-process-id');
  });

  it('parses explicit sequence flow', () => {
    const input = `process: test
  flow: flow-1
    from: task-a
    to: task-b
    condition: "status == 'approved'"
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const flows = document!.processes[0].sequenceFlows!;
    expect(flows).toHaveLength(1);
    expect(flows[0].id).toBe('flow-1');
    expect(flows[0].from).toBe('task-a');
    expect(flows[0].to).toBe('task-b');
    expect(flows[0].condition).toBe("status == 'approved'");
  });

  it('parses message flow', () => {
    const input = `process: test
  message-flow: msg-1
    from: send-task
    to: receive-task
    message: OrderConfirmation
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const flows = document!.processes[0].messageFlows!;
    expect(flows).toHaveLength(1);
    expect(flows[0].id).toBe('msg-1');
    expect(flows[0].message).toBe('OrderConfirmation');
  });

  it('parses annotation', () => {
    const input = `process: test
  annotation: note-1
    text: "This is a note"
    annotates: task-1
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const annotations = document!.processes[0].annotations!;
    expect(annotations).toHaveLength(1);
    expect(annotations[0].id).toBe('note-1');
    expect(annotations[0].text).toBe('This is a note');
    expect(annotations[0].annotates).toBe('task-1');
  });

  it('parses data object', () => {
    const input = `process: test
  data-object: invoice
    name: "Invoice Document"
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const elements = document!.processes[0].elements!;
    expect(elements[0].type).toBe('dataObject');
    expect(elements[0].id).toBe('invoice');
    expect(elements[0].name).toBe('Invoice Document');
  });

  it('parses intermediate event', () => {
    const input = `process: test
  event: items-arrived
    type: catch
    trigger: message
    message: ItemsArrived
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const event = document!.processes[0].elements![0];
    expect(event.type).toBe('intermediateEvent');
    expect(event.id).toBe('items-arrived');
    const e = event as { eventType: string; trigger: string; message: string };
    expect(e.eventType).toBe('catch');
    expect(e.trigger).toBe('message');
    expect(e.message).toBe('ItemsArrived');
  });

  it('parses boundary event', () => {
    const input = `process: test
  task: long-task
    name: "Long Running Task"
    boundary: timeout
      type: timer
      duration: PT1H
      interrupting: true
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![0] as {
      boundaryEvents?: Array<{
        id: string;
        trigger: string;
        duration: string;
        interrupting: boolean;
      }>;
    };
    expect(task.boundaryEvents).toHaveLength(1);
    expect(task.boundaryEvents![0].id).toBe('timeout');
    expect(task.boundaryEvents![0].trigger).toBe('timer');
    expect(task.boundaryEvents![0].duration).toBe('PT1H');
    expect(task.boundaryEvents![0].interrupting).toBe(true);
  });

  it('parses complete workflow', () => {
    const input = `process: order-fulfillment
  name: "Order Fulfillment"
  executable: true

  pool: warehouse
    name: Warehouse
    lane: picking
      name: "Picking Team"

      start: order-received
        name: "Order Received"

      task: pick-items
        name: "Pick Items"
        type: manual

      gateway: all-picked
        type: parallel
        name: "Items Ready?"

      end: order-complete
        name: "Order Complete"
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document!.processes[0].id).toBe('order-fulfillment');
    expect(document!.processes[0].executable).toBe(true);

    const pool = document!.processes[0].pools![0];
    expect(pool.id).toBe('warehouse');
    expect(pool.lanes).toHaveLength(1);

    const lane = pool.lanes![0];
    expect(lane.id).toBe('picking');
    expect(lane.elements).toHaveLength(4);
  });

  it('reports syntax errors', () => {
    const input = `process: test
  invalid-keyword: foo
`;
    const { document, errors } = parse(input);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects flow declaration nested inside task', () => {
    const input = `process: test
  task: greet
    name: "Say Hello"

    flow: f1
    from: begin
    to: greet
`;
    const { errors } = parse(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].line).toBe(5);
  });

  it('rejects flow declaration nested inside end event', () => {
    const input = `process: test
  end: finish
    name: "End"

    flow: f1
    from: begin
    to: finish
`;
    const { errors } = parse(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].line).toBe(5);
  });

  // Inline flow tests
  it('resolves inline flow to sequence flow', () => {
    const input = `process: test
  start: begin
    -> do-work
  task: do-work
    -> finish
  end: finish
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document!.processes[0].sequenceFlows).toHaveLength(2);
    expect(document!.processes[0].sequenceFlows![0].from).toBe('begin');
    expect(document!.processes[0].sequenceFlows![0].to).toBe('do-work');
    expect(document!.processes[0].sequenceFlows![1].from).toBe('do-work');
    expect(document!.processes[0].sequenceFlows![1].to).toBe('finish');
  });

  it('resolves inline flow with condition', () => {
    const input = `process: test
  gateway: check
    type: exclusive
    -> yes-path {condition: "approved == true"}
    -> no-path {condition: "approved == false"}
  task: yes-path
  task: no-path
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const flows = document!.processes[0].sequenceFlows!;
    expect(flows).toHaveLength(2);
    expect(flows[0].from).toBe('check');
    expect(flows[0].to).toBe('yes-path');
    expect(flows[0].condition).toBe('approved == true');
    expect(flows[1].condition).toBe('approved == false');
  });

  it('resolves inline flow with name', () => {
    const input = `process: test
  gateway: decision
    -> approve {name: "Yes"}
    -> reject {name: "No"}
  task: approve
  task: reject
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const flows = document!.processes[0].sequenceFlows!;
    expect(flows[0].name).toBe('Yes');
    expect(flows[1].name).toBe('No');
  });

  it('combines inline and explicit flows', () => {
    const input = `process: test
  start: begin
    -> task-a
  task: task-a
  task: task-b
  end: finish

  flow: explicit-flow
    from: task-a
    to: task-b
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const flows = document!.processes[0].sequenceFlows!;
    expect(flows).toHaveLength(2);
    // Explicit flow comes first (parsed first), then inline flow added
    expect(flows.some(f => f.id === 'explicit-flow')).toBe(true);
    expect(flows.some(f => f.from === 'begin' && f.to === 'task-a')).toBe(true);
  });

  it('adds inline flows to pool.sequenceFlows when inside a pool', () => {
    const input = `process: collab
  pool: customer
    start: order
      -> review
    task: review
      -> done
    end: done

  pool: warehouse
    start: receive
      -> ship
    task: ship
      -> finished
    end: finished
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);

    const process = document!.processes[0];
    // No process-level inline flows
    const processFlows = process.sequenceFlows ?? [];
    expect(processFlows).toHaveLength(0);

    // Pool-level flows
    const customerPool = process.pools!.find(p => p.id === 'customer')!;
    expect(customerPool.sequenceFlows).toHaveLength(2);
    expect(customerPool.sequenceFlows![0].from).toBe('order');
    expect(customerPool.sequenceFlows![0].to).toBe('review');
    expect(customerPool.sequenceFlows![1].from).toBe('review');
    expect(customerPool.sequenceFlows![1].to).toBe('done');

    const warehousePool = process.pools!.find(p => p.id === 'warehouse')!;
    expect(warehousePool.sequenceFlows).toHaveLength(2);
    expect(warehousePool.sequenceFlows![0].from).toBe('receive');
    expect(warehousePool.sequenceFlows![0].to).toBe('ship');
    expect(warehousePool.sequenceFlows![1].from).toBe('ship');
    expect(warehousePool.sequenceFlows![1].to).toBe('finished');
  });

  // Data association tests
  it('resolves input data association', () => {
    const input = `process: test
  data-object: invoice
  task: process-invoice
    <- invoice
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![1] as { dataInputAssociations?: Array<{ source: string; target: string; direction: string }> };
    expect(task.dataInputAssociations).toHaveLength(1);
    expect(task.dataInputAssociations![0].source).toBe('invoice');
    expect(task.dataInputAssociations![0].target).toBe('process-invoice');
    expect(task.dataInputAssociations![0].direction).toBe('input');
  });

  it('resolves output data association', () => {
    const input = `process: test
  data-object: report
  task: generate-report
    => report
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![1] as { dataOutputAssociations?: Array<{ source: string; target: string; direction: string }> };
    expect(task.dataOutputAssociations).toHaveLength(1);
    expect(task.dataOutputAssociations![0].source).toBe('generate-report');
    expect(task.dataOutputAssociations![0].target).toBe('report');
    expect(task.dataOutputAssociations![0].direction).toBe('output');
  });

  it('resolves multiple data associations on one task', () => {
    const input = `process: test
  data-object: input-data
  data-object: output-data
  task: transform
    <- input-data
    => output-data
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![2] as {
      dataInputAssociations?: Array<{ source: string }>;
      dataOutputAssociations?: Array<{ target: string }>;
    };
    expect(task.dataInputAssociations).toHaveLength(1);
    expect(task.dataInputAssociations![0].source).toBe('input-data');
    expect(task.dataOutputAssociations).toHaveLength(1);
    expect(task.dataOutputAssociations![0].target).toBe('output-data');
  });

  // Multiline string tests
  it('parses multiline documentation', () => {
    const input = `process: test
  documentation: |
    This is line 1.
    This is line 2.
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document!.processes[0].documentation).toBe('This is line 1.\nThis is line 2.');
  });

  it('parses multiline script', () => {
    const input = `process: test
  task: compute
    type: script
    scriptFormat: javascript
    script: |
      const x = 1;
      return x + 2;
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    const task = document!.processes[0].elements![0] as { script?: string };
    expect(task.script).toBe('const x = 1;\nreturn x + 2;');
  });

  it('parses multiline annotation text', () => {
    const input = `process: test
  annotation: note-1
    text: |
      Important note.
      Multiple lines.
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document!.processes[0].annotations![0].text).toBe('Important note.\nMultiple lines.');
  });

  it('handles varying indentation in multiline content', () => {
    const input = `process: test
  documentation: |
    Line at base indent.
      Indented line.
    Back to base.
`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document!.processes[0].documentation).toBe('Line at base indent.\n  Indented line.\nBack to base.');
  });

  it('parses input without trailing newline', () => {
    const input = `process: test`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
    expect(document!.processes).toHaveLength(1);
    expect(document!.processes[0].id).toBe('test');
  });

  it('handles multiline content without trailing newline', () => {
    // Note: no newline at end of string
    const input = `process: test
  documentation: |
    No trailing newline`;
    const { document, errors } = parse(input);
    expect(errors).toHaveLength(0);
    expect(document!.processes[0].documentation).toBe('No trailing newline');
  });
});
