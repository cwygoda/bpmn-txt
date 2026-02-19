import { XMLBuilder } from 'fast-xml-parser';
import type {
  Document,
  Process,
  Pool,
  Lane,
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
  Group,
} from '../ast/types.js';
import { generateIds } from './id-generator.js';

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMNDI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
const DC_NS = 'http://www.omg.org/spec/DD/20100524/DC';
const DI_NS = 'http://www.omg.org/spec/DD/20100524/DI';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';

export interface BpmnExportOptions {
  /** Include BPMNDI diagram info (placeholder bounds) */
  includeDiagram?: boolean;
}

/**
 * Export document to BPMN 2.0 XML string
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
  });

  const definitions = buildDefinitions(doc, includeDiagram);
  const xml = builder.build({ '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' }, ...definitions });

  return xml;
}

function buildDefinitions(doc: Document, includeDiagram: boolean): Record<string, unknown> {
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
      '@_exporter': 'bpmn-md',
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
  for (const proc of doc.processes) {
    const bpmnProcess = buildProcess(proc);
    if (!content['bpmn:process']) {
      content['bpmn:process'] = [];
    }
    (content['bpmn:process'] as unknown[]).push(bpmnProcess);
  }

  // Build diagram if requested
  if (includeDiagram) {
    content['bpmndi:BPMNDiagram'] = buildDiagram(doc);
  }

  return definitions;
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
          '@_processRef': proc.id,
        });
      }
    }

    if (proc.messageFlows) {
      for (const flow of proc.messageFlows) {
        messageFlows.push(buildMessageFlow(flow));
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
    '@_isExecutable': proc.executable ?? true,
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

  // Add flow elements to process
  for (const elem of allElements) {
    addFlowElement(process, elem);
  }

  // Add sequence flows
  for (const flow of allFlows) {
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

function addFlowElement(process: Record<string, unknown>, elem: FlowNode): void {
  const { tag, element } = buildFlowElement(elem);
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
    '@_cancelActivity': event.interrupting ?? true,
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

function buildSubprocess(subprocess: Subprocess): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': subprocess.id,
    '@_triggeredByEvent': subprocess.triggered ?? false,
  };
  if (subprocess.name) result['@_name'] = subprocess.name;

  // Add nested elements
  if (subprocess.elements) {
    for (const elem of subprocess.elements) {
      const { tag, element } = buildFlowElement(elem);
      if (!result[tag]) {
        result[tag] = [];
      }
      (result[tag] as unknown[]).push(element);
    }
  }

  return result;
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

  const tag = tagMap[gateway.gatewayType];
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

function buildMessageFlow(flow: MessageFlow): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@_id': flow.id,
    '@_sourceRef': flow.from,
    '@_targetRef': flow.to,
  };
  if (flow.name) result['@_name'] = flow.name;
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

function buildDiagram(doc: Document): Record<string, unknown> {
  const diagram: Record<string, unknown> = {
    '@_id': 'BPMNDiagram_1',
    'bpmndi:BPMNPlane': {
      '@_id': 'BPMNPlane_1',
      '@_bpmnElement': doc.processes[0]?.id || 'Process_1',
      // Shapes and edges would be added here with actual layout
      // For now, just create a placeholder
    },
  };

  return diagram;
}
