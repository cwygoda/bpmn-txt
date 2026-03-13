import { XMLBuilder } from 'fast-xml-parser';
import type {
  Document,
  Process,
  Pool,
  FlowNode,
  SequenceFlow,
  MessageFlow,
  StartEvent,
  EndEvent,
  IntermediateEvent,
  BoundaryEvent,
  Task,
  Subprocess,
  CallActivity,
  Gateway,
  DataObject,
  DataStore,
  Annotation,
} from '../ast/types.js';
import { generateIds } from './id-generator.js';
import { generateLayout, applyLayout, type LayoutResult, type LayoutOptions } from './layout.js';
import { ELEMENT_SIZES } from './constants.js';
import { collectFromProcess, collectAllElements, collectFromPool, collectPoolsAndLanes } from './utils.js';

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMNDI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
const DC_NS = 'http://www.omg.org/spec/DD/20100524/DC';
const DI_NS = 'http://www.omg.org/spec/DD/20100524/DI';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';

export interface BpmnExportOptions {
  /** Include BPMNDI diagram info */
  includeDiagram?: boolean;
  /** Layout options for auto-layout */
  layoutOptions?: LayoutOptions;
}

/**
 * Export document to BPMN 2.0 XML string (sync, no auto-layout)
 */
export function toBpmnXml(doc: Document, options: BpmnExportOptions = {}): string {
  const { includeDiagram = true } = options;

  // Generate IDs for elements without them
  generateIds(doc);

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
  });

  // Collect existing layout from document
  const layout = collectExistingLayout(doc);
  const definitions = buildDefinitions(doc, includeDiagram, layout);
  const xml = builder.build({ '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' }, ...definitions });

  return xml;
}

/**
 * Export document to BPMN 2.0 XML string with auto-layout (async)
 */
export async function toBpmnXmlAsync(doc: Document, options: BpmnExportOptions = {}): Promise<string> {
  const { includeDiagram = true, layoutOptions = {} } = options;

  // Generate IDs for elements without them
  generateIds(doc);

  // Generate layout
  const layout = await generateLayout(doc, layoutOptions);

  // Apply layout to document (for downstream consumers)
  applyLayout(doc, layout);

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
  });

  const definitions = buildDefinitions(doc, includeDiagram, layout);
  const xml = builder.build({ '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' }, ...definitions });

  return xml;
}

/**
 * Collect layout information already present in document
 */
function collectExistingLayout(doc: Document): LayoutResult {
  const elements = new Map<string, { x: number; y: number; width?: number; height?: number }>();
  const edges = new Map<string, { waypoints: { x: number; y: number }[] }>();

  for (const proc of doc.processes) {
    const { elements: procElements, flows } = collectAllElements(proc);

    // Extract element layouts
    for (const elem of procElements) {
      if (elem.id && elem.layout?.x !== undefined && elem.layout?.y !== undefined) {
        elements.set(elem.id, {
          x: elem.layout.x,
          y: elem.layout.y,
          width: elem.layout.width,
          height: elem.layout.height,
        });
      }
    }

    // Extract flow layouts
    for (const flow of flows) {
      if (flow.id && flow.layout?.waypoints && flow.layout.waypoints.length > 0) {
        edges.set(flow.id, { waypoints: flow.layout.waypoints });
      }
    }
  }

  return { elements, edges };
}

function buildDefinitions(doc: Document, includeDiagram: boolean, layout: LayoutResult): Record<string, unknown> {
  const hasCollaboration = doc.processes.some((p) => p.pools && p.pools.length > 0);

  const definitions: Record<string, unknown> = {
    'bpmn:definitions': {
      '@_xmlns:bpmn': BPMN_NS,
      '@_xmlns:bpmndi': BPMNDI_NS,
      '@_xmlns:dc': DC_NS,
      '@_xmlns:di': DI_NS,
      '@_xmlns:xsi': XSI_NS,
      '@_id': 'Definitions_1',
      '@_targetNamespace': 'http://bpmn.io/schema/bpmn',
      '@_exporter': 'bpmn-txt',
      '@_exporterVersion': '0.1.0',
    },
  };

  const content = definitions['bpmn:definitions'] as Record<string, unknown>;

  // Build collaboration if we have pools
  if (hasCollaboration) {
    const collaboration = buildCollaboration(doc);
    content['bpmn:collaboration'] = collaboration;
  }

  // Build processes
  if (hasCollaboration) {
    // Each pool becomes its own <bpmn:process>
    content['bpmn:process'] = [];
    for (const proc of doc.processes) {
      if (proc.pools) {
        for (const pool of proc.pools) {
          (content['bpmn:process'] as unknown[]).push(buildPoolProcess(proc, pool));
        }
      }
    }
  } else {
    for (const proc of doc.processes) {
      if (!content['bpmn:process']) {
        content['bpmn:process'] = [];
      }
      (content['bpmn:process'] as unknown[]).push(buildProcess(proc));
    }
  }

  // Collect and emit bpmn:message elements referenced by message flows
  const messages = collectMessages(doc);
  if (messages.length > 0) {
    content['bpmn:message'] = messages;
  }

  // Build diagram if requested
  if (includeDiagram) {
    content['bpmndi:BPMNDiagram'] = buildDiagram(doc, layout);
  }

  return definitions;
}

function collectMessages(doc: Document): Record<string, unknown>[] {
  const seen = new Set<string>();
  const messages: Record<string, unknown>[] = [];
  for (const proc of doc.processes) {
    if (!proc.messageFlows) continue;
    for (const flow of proc.messageFlows) {
      if (flow.message && !seen.has(flow.message)) {
        seen.add(flow.message);
        messages.push({
          '@_id': `Message_${flow.message}`,
          '@_name': flow.message,
        });
      }
    }
  }
  return messages;
}

function buildCollaboration(doc: Document): Record<string, unknown> {
  const collaboration: Record<string, unknown> = {
    '@_id': 'Collaboration_1',
  };

  const participants: unknown[] = [];
  const messageFlows: unknown[] = [];

  for (const proc of doc.processes) {
    if (proc.pools) {
      for (const pool of proc.pools) {
        participants.push({
          '@_id': `Participant_${pool.id}`,
          '@_name': pool.name || pool.id,
          '@_processRef': `${proc.id}_${pool.id}`,
        });
      }
    }

    if (proc.messageFlows) {
      const poolIdSet = new Set((proc.pools ?? []).map(p => p.id).filter(Boolean) as string[]);
      for (const flow of proc.messageFlows) {
        messageFlows.push(buildMessageFlow(flow, poolIdSet));
      }
    }
  }

  if (participants.length > 0) {
    collaboration['bpmn:participant'] = participants;
  }
  if (messageFlows.length > 0) {
    collaboration['bpmn:messageFlow'] = messageFlows;
  }

  return collaboration;
}

function buildProcess(proc: Process): Record<string, unknown> {
  const process: Record<string, unknown> = {
    '@_id': proc.id,
    '@_isExecutable': String(proc.executable ?? true),
  };

  if (proc.name) {
    process['@_name'] = proc.name;
  }

  // Collect all elements
  const allElements: FlowNode[] = [];
  const allFlows: SequenceFlow[] = [];

  // From pools and lanes
  if (proc.pools) {
    for (const pool of proc.pools) {
      // Build lane set
      if (pool.lanes && pool.lanes.length > 0) {
        process['bpmn:laneSet'] = buildLaneSet(pool);
      }

      if (pool.elements) {
        allElements.push(...pool.elements);
      }
      if (pool.sequenceFlows) {
        allFlows.push(...pool.sequenceFlows);
      }

      if (pool.lanes) {
        for (const lane of pool.lanes) {
          if (lane.elements) {
            allElements.push(...lane.elements);
          }
          if (lane.sequenceFlows) {
            allFlows.push(...lane.sequenceFlows);
          }
        }
      }
    }
  }

  // Direct elements
  if (proc.elements) {
    allElements.push(...proc.elements);
  }
  if (proc.sequenceFlows) {
    allFlows.push(...proc.sequenceFlows);
  }

  // Pre-compute subprocess internal flows
  const subFlowMap = computeSubprocessFlowMap(allElements, allFlows);
  const consumedFlowIds = new Set<string>();
  for (const flows of subFlowMap.values()) {
    for (const f of flows) {
      if (f.id) consumedFlowIds.add(f.id);
    }
  }

  // Add flow elements to process
  for (const elem of allElements) {
    addFlowElement(process, elem, subFlowMap);
  }

  // Add sequence flows (excluding subprocess-internal ones)
  for (const flow of allFlows) {
    if (flow.id && consumedFlowIds.has(flow.id)) continue;
    if (!process['bpmn:sequenceFlow']) {
      process['bpmn:sequenceFlow'] = [];
    }
    (process['bpmn:sequenceFlow'] as unknown[]).push(buildSequenceFlow(flow));
  }

  // Add data objects
  if (proc.dataAssociations) {
    // Data associations are added to tasks, not process level
  }

  // Add text annotations
  if (proc.annotations) {
    for (const annotation of proc.annotations) {
      if (!process['bpmn:textAnnotation']) {
        process['bpmn:textAnnotation'] = [];
      }
      (process['bpmn:textAnnotation'] as unknown[]).push(buildAnnotation(annotation));

      if (annotation.annotates) {
        if (!process['bpmn:association']) {
          process['bpmn:association'] = [];
        }
        (process['bpmn:association'] as unknown[]).push({
          '@_id': `Association_${annotation.id}`,
          '@_sourceRef': annotation.id,
          '@_targetRef': annotation.annotates,
        });
      }
    }
  }

  // Add groups
  if (proc.groups) {
    for (const group of proc.groups) {
      if (!process['bpmn:group']) {
        process['bpmn:group'] = [];
      }
      (process['bpmn:group'] as unknown[]).push({
        '@_id': group.id,
        '@_categoryValueRef': `CategoryValue_${group.id}`,
      });
    }
  }

  addFlowReferences(process);
  return process;
}

function buildPoolProcess(proc: Process, pool: Pool): Record<string, unknown> {
  const process: Record<string, unknown> = {
    '@_id': `${proc.id}_${pool.id}`,
    '@_isExecutable': String(proc.executable ?? true),
  };

  if (pool.name) {
    process['@_name'] = pool.name;
  }

  if (pool.lanes && pool.lanes.length > 0) {
    process['bpmn:laneSet'] = buildLaneSet(pool);
  }

  const { elements, flows } = collectFromPool(pool);

  // Pre-compute subprocess internal flows
  const subFlowMap = computeSubprocessFlowMap(elements, flows);
  const consumedFlowIds = new Set<string>();
  for (const subFlows of subFlowMap.values()) {
    for (const f of subFlows) {
      if (f.id) consumedFlowIds.add(f.id);
    }
  }

  for (const elem of elements) {
    addFlowElement(process, elem, subFlowMap);
  }

  for (const flow of flows) {
    if (flow.id && consumedFlowIds.has(flow.id)) continue;
    if (!process['bpmn:sequenceFlow']) {
      process['bpmn:sequenceFlow'] = [];
    }
    (process['bpmn:sequenceFlow'] as unknown[]).push(buildSequenceFlow(flow));
  }

  addFlowReferences(process);
  return process;
}

function buildLaneSet(pool: Pool): Record<string, unknown> {
  const laneSet: Record<string, unknown> = {
    '@_id': `LaneSet_${pool.id}`,
  };

  const lanes: unknown[] = [];
  for (const lane of pool.lanes!) {
    const bpmnLane: Record<string, unknown> = {
      '@_id': lane.id,
    };
    if (lane.name) {
      bpmnLane['@_name'] = lane.name;
    }

    // Add flowNodeRef for elements in this lane
    if (lane.elements && lane.elements.length > 0) {
      bpmnLane['bpmn:flowNodeRef'] = lane.elements.map((e) => e.id);
    }

    lanes.push(bpmnLane);
  }

  laneSet['bpmn:lane'] = lanes;
  return laneSet;
}

function addFlowElement(
  process: Record<string, unknown>,
  elem: FlowNode,
  subFlowMap?: Map<string, SequenceFlow[]>
): void {
  let tag: string;
  let element: Record<string, unknown>;

  // For expanded subprocesses, pass internal flows
  if (elem.type === 'subprocess' && (elem as Subprocess).elements?.length && subFlowMap) {
    tag = 'bpmn:subProcess';
    element = buildSubprocess(elem as Subprocess, subFlowMap.get(elem.id!) ?? []);
  } else {
    ({ tag, element } = buildFlowElement(elem));
  }

  if (!process[tag]) {
    process[tag] = [];
  }
  (process[tag] as unknown[]).push(element);

  // Handle boundary events attached to this element
  if (elem.type === 'task' && elem.boundaryEvents) {
    for (const boundary of elem.boundaryEvents) {
      const boundaryResult = buildBoundaryEvent(boundary, elem.id!);
      if (!process['bpmn:boundaryEvent']) {
        process['bpmn:boundaryEvent'] = [];
      }
      (process['bpmn:boundaryEvent'] as unknown[]).push(boundaryResult);
    }
  }
  if (elem.type === 'subprocess' && elem.boundaryEvents) {
    for (const boundary of elem.boundaryEvents) {
      const boundaryResult = buildBoundaryEvent(boundary, elem.id!);
      if (!process['bpmn:boundaryEvent']) {
        process['bpmn:boundaryEvent'] = [];
      }
      (process['bpmn:boundaryEvent'] as unknown[]).push(boundaryResult);
    }
  }
}

function buildFlowElement(elem: FlowNode): { tag: string; element: Record<string, unknown> } {
  switch (elem.type) {
    case 'startEvent':
      return { tag: 'bpmn:startEvent', element: buildStartEvent(elem) };
    case 'endEvent':
      return { tag: 'bpmn:endEvent', element: buildEndEvent(elem) };
    case 'intermediateEvent':
      return buildIntermediateEvent(elem);
    case 'task':
      return buildTask(elem);
    case 'subprocess':
      return { tag: 'bpmn:subProcess', element: buildSubprocess(elem) };
    case 'callActivity':
      return { tag: 'bpmn:callActivity', element: buildCallActivity(elem) };
    case 'gateway':
      return buildGateway(elem);
    case 'dataObject':
      return { tag: 'bpmn:dataObjectReference', element: buildDataObject(elem) };
    case 'dataStore':
      return { tag: 'bpmn:dataStoreReference', element: buildDataStore(elem) };
    case 'boundaryEvent':
      // Handled separately
      return { tag: 'bpmn:boundaryEvent', element: {} };
  }
}

function buildStartEvent(event: StartEvent): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': event.id,
  };
  if (event.name) result['@_name'] = event.name;

  // Add event definition based on trigger
  switch (event.trigger) {
    case 'message':
      result['bpmn:messageEventDefinition'] = { '@_id': `MessageEventDefinition_${event.id}` };
      break;
    case 'timer':
      result['bpmn:timerEventDefinition'] = {
        '@_id': `TimerEventDefinition_${event.id}`,
        ...(event.timer ? { 'bpmn:timeDuration': event.timer } : {}),
      };
      break;
    case 'signal':
      result['bpmn:signalEventDefinition'] = { '@_id': `SignalEventDefinition_${event.id}` };
      break;
    case 'conditional':
      result['bpmn:conditionalEventDefinition'] = {
        '@_id': `ConditionalEventDefinition_${event.id}`,
        ...(event.condition ? { 'bpmn:condition': { '@_xsi:type': 'bpmn:tFormalExpression', '#text': event.condition } } : {}),
      };
      break;
    case 'error':
      result['bpmn:errorEventDefinition'] = { '@_id': `ErrorEventDefinition_${event.id}` };
      break;
  }

  return result;
}

function buildEndEvent(event: EndEvent): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': event.id,
  };
  if (event.name) result['@_name'] = event.name;

  switch (event.trigger) {
    case 'message':
      result['bpmn:messageEventDefinition'] = { '@_id': `MessageEventDefinition_${event.id}` };
      break;
    case 'signal':
      result['bpmn:signalEventDefinition'] = { '@_id': `SignalEventDefinition_${event.id}` };
      break;
    case 'error':
      result['bpmn:errorEventDefinition'] = { '@_id': `ErrorEventDefinition_${event.id}` };
      break;
    case 'terminate':
      result['bpmn:terminateEventDefinition'] = { '@_id': `TerminateEventDefinition_${event.id}` };
      break;
    case 'compensation':
      result['bpmn:compensateEventDefinition'] = { '@_id': `CompensateEventDefinition_${event.id}` };
      break;
    case 'escalation':
      result['bpmn:escalationEventDefinition'] = { '@_id': `EscalationEventDefinition_${event.id}` };
      break;
  }

  return result;
}

function buildIntermediateEvent(event: IntermediateEvent): { tag: string; element: Record<string, unknown> } {
  const isCatch = event.eventType === 'catch';
  const tag = isCatch ? 'bpmn:intermediateCatchEvent' : 'bpmn:intermediateThrowEvent';

  const result: Record<string, unknown> = {
    '@_id': event.id,
  };
  if (event.name) result['@_name'] = event.name;

  switch (event.trigger) {
    case 'message':
      result['bpmn:messageEventDefinition'] = { '@_id': `MessageEventDefinition_${event.id}` };
      break;
    case 'timer':
      result['bpmn:timerEventDefinition'] = {
        '@_id': `TimerEventDefinition_${event.id}`,
        ...(event.timer ? { 'bpmn:timeDuration': event.timer } : {}),
      };
      break;
    case 'signal':
      result['bpmn:signalEventDefinition'] = { '@_id': `SignalEventDefinition_${event.id}` };
      break;
    case 'link':
      result['bpmn:linkEventDefinition'] = {
        '@_id': `LinkEventDefinition_${event.id}`,
        '@_name': event.link || event.id,
      };
      break;
    case 'compensation':
      result['bpmn:compensateEventDefinition'] = { '@_id': `CompensateEventDefinition_${event.id}` };
      break;
    case 'error':
      result['bpmn:errorEventDefinition'] = { '@_id': `ErrorEventDefinition_${event.id}` };
      break;
    case 'escalation':
      result['bpmn:escalationEventDefinition'] = { '@_id': `EscalationEventDefinition_${event.id}` };
      break;
    case 'conditional':
      result['bpmn:conditionalEventDefinition'] = {
        '@_id': `ConditionalEventDefinition_${event.id}`,
        ...(event.condition ? { 'bpmn:condition': { '@_xsi:type': 'bpmn:tFormalExpression', '#text': event.condition } } : {}),
      };
      break;
  }

  return { tag, element: result };
}

function buildBoundaryEvent(event: BoundaryEvent, attachedToRef: string): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': event.id,
    '@_attachedToRef': attachedToRef,
    '@_cancelActivity': String(event.interrupting ?? true),
  };
  if (event.name) result['@_name'] = event.name;

  switch (event.trigger) {
    case 'message':
      result['bpmn:messageEventDefinition'] = { '@_id': `MessageEventDefinition_${event.id}` };
      break;
    case 'timer':
      result['bpmn:timerEventDefinition'] = {
        '@_id': `TimerEventDefinition_${event.id}`,
        ...(event.duration ? { 'bpmn:timeDuration': event.duration } : {}),
        ...(event.timer ? { 'bpmn:timeDuration': event.timer } : {}),
      };
      break;
    case 'signal':
      result['bpmn:signalEventDefinition'] = { '@_id': `SignalEventDefinition_${event.id}` };
      break;
    case 'error':
      result['bpmn:errorEventDefinition'] = { '@_id': `ErrorEventDefinition_${event.id}` };
      break;
    case 'escalation':
      result['bpmn:escalationEventDefinition'] = { '@_id': `EscalationEventDefinition_${event.id}` };
      break;
    case 'compensation':
      result['bpmn:compensateEventDefinition'] = { '@_id': `CompensateEventDefinition_${event.id}` };
      break;
    case 'conditional':
      result['bpmn:conditionalEventDefinition'] = {
        '@_id': `ConditionalEventDefinition_${event.id}`,
        ...(event.condition ? { 'bpmn:condition': { '@_xsi:type': 'bpmn:tFormalExpression', '#text': event.condition } } : {}),
      };
      break;
  }

  return result;
}

function buildTask(task: Task): { tag: string; element: Record<string, unknown> } {
  const tagMap: Record<string, string> = {
    task: 'bpmn:task',
    user: 'bpmn:userTask',
    service: 'bpmn:serviceTask',
    script: 'bpmn:scriptTask',
    send: 'bpmn:sendTask',
    receive: 'bpmn:receiveTask',
    manual: 'bpmn:manualTask',
    businessRule: 'bpmn:businessRuleTask',
  };

  const tag = tagMap[task.taskType ?? 'task'];
  const result: Record<string, unknown> = {
    '@_id': task.id,
  };
  if (task.name) result['@_name'] = task.name;

  // Task-specific attributes
  if (task.taskType === 'script' && task.script) {
    result['bpmn:script'] = task.script;
    if (task.scriptFormat) {
      result['@_scriptFormat'] = task.scriptFormat;
    }
  }

  // Camunda-specific extensions for user tasks would go here
  // For now, we just include assignee as documentation
  if (task.taskType === 'user' && task.assignee) {
    result['bpmn:documentation'] = `Assignee: ${task.assignee}`;
  }

  return { tag, element: result };
}

function buildSubprocess(subprocess: Subprocess, internalFlows?: SequenceFlow[]): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': subprocess.id,
    '@_triggeredByEvent': String(subprocess.triggered ?? false),
  };
  if (subprocess.name) result['@_name'] = subprocess.name;

  // Add nested elements
  if (subprocess.elements) {
    // Pre-compute internal flows for nested subprocesses
    const nestedFlowMap = computeSubprocessFlowMap(subprocess.elements, internalFlows ?? []);

    for (const elem of subprocess.elements) {
      if (elem.type === 'subprocess' && (elem as Subprocess).elements?.length) {
        const { tag, element } = {
          tag: 'bpmn:subProcess',
          element: buildSubprocess(elem as Subprocess, nestedFlowMap.get(elem.id!) ?? []),
        };
        if (!result[tag]) result[tag] = [];
        (result[tag] as unknown[]).push(element);
      } else {
        const { tag, element } = buildFlowElement(elem);
        if (!result[tag]) result[tag] = [];
        (result[tag] as unknown[]).push(element);
      }

      // Boundary events
      if ((elem.type === 'task' || elem.type === 'subprocess') && elem.boundaryEvents) {
        for (const boundary of elem.boundaryEvents) {
          const boundaryResult = buildBoundaryEvent(boundary, elem.id!);
          if (!result['bpmn:boundaryEvent']) result['bpmn:boundaryEvent'] = [];
          (result['bpmn:boundaryEvent'] as unknown[]).push(boundaryResult);
        }
      }
    }
  }

  // Add internal sequence flows
  if (internalFlows && internalFlows.length > 0) {
    // Exclude flows consumed by deeper subprocesses
    const deepConsumed = new Set<string>();
    if (subprocess.elements) {
      for (const elem of subprocess.elements) {
        if (elem.type === 'subprocess' && (elem as Subprocess).elements?.length) {
          const childIds = new Set((elem as Subprocess).elements!.map(e => e.id).filter(Boolean) as string[]);
          for (const flow of internalFlows) {
            if (childIds.has(flow.from) && childIds.has(flow.to) && flow.id) {
              deepConsumed.add(flow.id);
            }
          }
        }
      }
    }

    const ownFlows = internalFlows.filter(f => !f.id || !deepConsumed.has(f.id));
    if (ownFlows.length > 0) {
      result['bpmn:sequenceFlow'] = ownFlows.map(flow => buildSequenceFlow(flow));
    }
  }

  addFlowReferences(result);
  return result;
}

/**
 * Pre-compute which flows are internal to each expanded subprocess.
 */
function computeSubprocessFlowMap(
  elements: FlowNode[],
  flows: SequenceFlow[]
): Map<string, SequenceFlow[]> {
  const map = new Map<string, SequenceFlow[]>();
  for (const elem of elements) {
    if (elem.type !== 'subprocess' || !(elem as Subprocess).elements?.length) continue;
    const childIds = new Set(
      (elem as Subprocess).elements!.map(e => e.id).filter(Boolean) as string[]
    );
    const internal = flows.filter(f => childIds.has(f.from) && childIds.has(f.to));
    if (internal.length > 0) map.set(elem.id!, internal);
  }
  return map;
}

function buildCallActivity(call: CallActivity): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': call.id,
    '@_calledElement': call.calledElement,
  };
  if (call.name) result['@_name'] = call.name;
  return result;
}

function buildGateway(gateway: Gateway): { tag: string; element: Record<string, unknown> } {
  const tagMap: Record<string, string> = {
    exclusive: 'bpmn:exclusiveGateway',
    parallel: 'bpmn:parallelGateway',
    inclusive: 'bpmn:inclusiveGateway',
    eventBased: 'bpmn:eventBasedGateway',
    complex: 'bpmn:complexGateway',
  };

  const tag = tagMap[gateway.gatewayType] ?? 'bpmn:exclusiveGateway';
  const result: Record<string, unknown> = {
    '@_id': gateway.id,
  };
  if (gateway.name) result['@_name'] = gateway.name;
  if (gateway.default) result['@_default'] = gateway.default;

  return { tag, element: result };
}

function buildDataObject(data: DataObject): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': data.id,
  };
  if (data.name) result['@_name'] = data.name;
  return result;
}

function buildDataStore(data: DataStore): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': data.id,
  };
  if (data.name) result['@_name'] = data.name;
  return result;
}

/**
 * All BPMN flow-node XML tags that may carry incoming/outgoing refs.
 */
const FLOW_NODE_TAGS = [
  'bpmn:startEvent', 'bpmn:endEvent', 'bpmn:task', 'bpmn:userTask',
  'bpmn:serviceTask', 'bpmn:scriptTask', 'bpmn:sendTask', 'bpmn:receiveTask',
  'bpmn:manualTask', 'bpmn:businessRuleTask', 'bpmn:subProcess',
  'bpmn:callActivity', 'bpmn:exclusiveGateway', 'bpmn:parallelGateway',
  'bpmn:inclusiveGateway', 'bpmn:eventBasedGateway', 'bpmn:complexGateway',
  'bpmn:intermediateCatchEvent', 'bpmn:intermediateThrowEvent',
  'bpmn:boundaryEvent',
];

/**
 * Post-process a built process record to inject bpmn:incoming / bpmn:outgoing
 * child elements on every flow node. bpmn-moddle does NOT auto-populate these
 * from sequenceFlow sourceRef/targetRef, so bpmnlint needs them explicitly.
 */
function addFlowReferences(process: Record<string, unknown>): void {
  const flows = (process['bpmn:sequenceFlow'] ?? []) as Record<string, unknown>[];
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  for (const flow of flows) {
    const src = flow['@_sourceRef'] as string;
    const tgt = flow['@_targetRef'] as string;
    const fid = flow['@_id'] as string;
    if (!outgoing.has(src)) outgoing.set(src, []);
    outgoing.get(src)!.push(fid);
    if (!incoming.has(tgt)) incoming.set(tgt, []);
    incoming.get(tgt)!.push(fid);
  }

  for (const tag of FLOW_NODE_TAGS) {
    const elements = process[tag];
    if (!elements) continue;
    for (const elem of (Array.isArray(elements) ? elements : [elements]) as Record<string, unknown>[]) {
      const id = elem['@_id'] as string;
      if (incoming.has(id)) elem['bpmn:incoming'] = incoming.get(id)!;
      if (outgoing.has(id)) elem['bpmn:outgoing'] = outgoing.get(id)!;
    }
  }
}

function buildSequenceFlow(flow: SequenceFlow): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': flow.id,
    '@_sourceRef': flow.from,
    '@_targetRef': flow.to,
  };
  if (flow.name) result['@_name'] = flow.name;
  if (flow.condition) {
    result['bpmn:conditionExpression'] = {
      '@_xsi:type': 'bpmn:tFormalExpression',
      '#text': flow.condition,
    };
  }
  return result;
}

function buildMessageFlow(flow: MessageFlow, poolIds: Set<string>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': flow.id,
    '@_sourceRef': poolIds.has(flow.from) ? `Participant_${flow.from}` : flow.from,
    '@_targetRef': poolIds.has(flow.to) ? `Participant_${flow.to}` : flow.to,
  };
  if (flow.name) result['@_name'] = flow.name;
  if (flow.message) result['@_messageRef'] = `Message_${flow.message}`;
  return result;
}

function buildAnnotation(annotation: Annotation): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': annotation.id,
  };
  if (annotation.text) {
    result['bpmn:text'] = annotation.text;
  }
  return result;
}

function buildDiagram(doc: Document, layout: LayoutResult): Record<string, unknown> {
  const hasCollaboration = doc.processes.some((p) => p.pools && p.pools.length > 0);
  const bpmnElement = hasCollaboration ? 'Collaboration_1' : doc.processes[0]?.id || 'Process_1';

  const plane: Record<string, unknown> = {
    '@_id': 'BPMNPlane_1',
    '@_bpmnElement': bpmnElement,
  };

  const shapes: unknown[] = [];
  const edges: unknown[] = [];

  // Collect all elements and flows from all processes
  for (const proc of doc.processes) {
    // Add participant shapes for pools and lane shapes
    const { pools, lanes } = collectPoolsAndLanes(proc);
    for (const pool of pools) {
      const participantId = `Participant_${pool.id}`;
      const poolLayout = layout.elements.get(participantId);
      const { elements: poolElems } = collectFromPool(pool);
      const shapeType = poolElems.length === 0 ? 'collapsedPool' : 'pool';
      shapes.push(buildShape(participantId, poolLayout ?? pool.layout, shapeType));
    }
    for (const lane of lanes) {
      if (!lane.id) continue;
      const laneLayout = layout.elements.get(lane.id);
      shapes.push(buildShape(lane.id, laneLayout ?? lane.layout, 'lane'));
    }

    // Add shapes for all flow elements (including subprocess children)
    const { elements: allElements, flows: allFlows } = collectAllElements(proc);
    for (const elem of allElements) {
      if (!elem.id) continue;

      const elemLayout = layout.elements.get(elem.id);
      const expanded = elem.type === 'subprocess'
        && (elem as Subprocess).elements
        && (elem as Subprocess).elements!.length > 0;
      if (elemLayout) {
        shapes.push(buildShape(elem.id, elemLayout, elem.type, expanded));
      } else {
        // Use default sizes if no layout
        shapes.push(buildShape(elem.id, elem.layout, elem.type, expanded));
      }

      // Handle boundary events
      if ((elem.type === 'task' || elem.type === 'subprocess') && elem.boundaryEvents) {
        for (const boundary of elem.boundaryEvents) {
          if (!boundary.id) continue;
          const boundaryLayout = layout.elements.get(boundary.id);
          shapes.push(buildShape(boundary.id, boundaryLayout, 'boundaryEvent'));
        }
      }
    }

    // Add edges for sequence flows
    for (const flow of allFlows) {
      if (!flow.id) continue;

      const flowLayout = layout.edges.get(flow.id);
      if (flowLayout) {
        edges.push(buildEdge(flow.id, flowLayout.waypoints));
      } else if (flow.layout?.waypoints) {
        edges.push(buildEdge(flow.id, flow.layout.waypoints));
      } else {
        // Edge without waypoints - minimal placeholder
        edges.push({
          '@_id': `${flow.id}_di`,
          '@_bpmnElement': flow.id,
        });
      }
    }

    // Add edges for message flows
    if (proc.messageFlows) {
      for (const flow of proc.messageFlows) {
        if (!flow.id) continue;
        const flowLayout = layout.edges.get(flow.id);
        if (flowLayout) {
          edges.push(buildEdge(flow.id, flowLayout.waypoints));
        } else {
          edges.push({
            '@_id': `${flow.id}_di`,
            '@_bpmnElement': flow.id,
          });
        }
      }
    }
  }

  if (shapes.length > 0) {
    plane['bpmndi:BPMNShape'] = shapes;
  }
  if (edges.length > 0) {
    plane['bpmndi:BPMNEdge'] = edges;
  }

  return {
    '@_id': 'BPMNDiagram_1',
    'bpmndi:BPMNPlane': plane,
  };
}

function buildShape(
  elementId: string,
  layout: { x?: number; y?: number; width?: number; height?: number } | undefined,
  elementType: string,
  isExpanded?: boolean
): Record<string, unknown> {
  const defaultSize = ELEMENT_SIZES[elementType] || { width: 100, height: 80 };

  const shape: Record<string, unknown> = {
    '@_id': `${elementId}_di`,
    '@_bpmnElement': elementId,
  };

  // Add bounds
  shape['dc:Bounds'] = {
    '@_x': layout?.x ?? 0,
    '@_y': layout?.y ?? 0,
    '@_width': layout?.width ?? defaultSize.width,
    '@_height': layout?.height ?? defaultSize.height,
  };

  if (elementType === 'pool' || elementType === 'collapsedPool') {
    shape['@_isHorizontal'] = 'true';
    shape['@_isExpanded'] = elementType === 'pool' ? 'true' : 'false';
  }

  if (elementType === 'subprocess' && isExpanded) {
    shape['@_isExpanded'] = 'true';
  }

  return shape;
}

function buildEdge(
  flowId: string,
  waypoints: { x: number; y: number }[]
): Record<string, unknown> {
  const edge: Record<string, unknown> = {
    '@_id': `${flowId}_di`,
    '@_bpmnElement': flowId,
  };

  if (waypoints.length > 0) {
    edge['di:waypoint'] = waypoints.map((wp) => ({
      '@_x': wp.x,
      '@_y': wp.y,
    }));
  }

  return edge;
}

