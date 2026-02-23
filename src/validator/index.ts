import type {
  Document,
  Process,
  Pool,
  Lane,
  FlowNode,
  SequenceFlow,
  MessageFlow,
  SourceSpan,
} from '../ast/types.js';

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  loc?: SourceSpan;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface ElementInfo {
  id: string;
  type: string;
  loc?: SourceSpan;
}

/**
 * Validate a BPMN-TXT document
 */
export function validate(doc: Document): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const allIds = new Map<string, ElementInfo>();
  const referencedIds = new Set<string>();

  for (const process of doc.processes) {
    validateProcess(process, allIds, referencedIds, errors, warnings);
  }

  // Check for unresolved references
  for (const refId of referencedIds) {
    if (!allIds.has(refId)) {
      errors.push({
        code: 'UNRESOLVED_REFERENCE',
        message: `Reference to undefined element: ${refId}`,
        severity: 'error',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateProcess(
  process: Process,
  allIds: Map<string, ElementInfo>,
  referencedIds: Set<string>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Process ID is required
  if (!process.id) {
    errors.push({
      code: 'MISSING_PROCESS_ID',
      message: 'Process must have an ID',
      severity: 'error',
      loc: process.loc,
    });
  } else {
    registerElement(process.id, 'process', process.loc, allIds, errors);
  }

  // Validate pools
  if (process.pools) {
    for (const pool of process.pools) {
      validatePool(pool, allIds, referencedIds, errors, warnings);
    }
  }

  // Validate direct elements
  if (process.elements) {
    for (const element of process.elements) {
      validateFlowNode(element, allIds, referencedIds, errors, warnings);
    }
  }

  // Validate sequence flows
  if (process.sequenceFlows) {
    for (const flow of process.sequenceFlows) {
      validateSequenceFlow(flow, allIds, referencedIds, errors);
    }
  }

  // Validate message flows
  if (process.messageFlows) {
    for (const flow of process.messageFlows) {
      validateMessageFlow(flow, allIds, referencedIds, errors);
    }
  }

  // Validate annotations
  if (process.annotations) {
    for (const annotation of process.annotations) {
      if (annotation.id) {
        registerElement(annotation.id, 'annotation', annotation.loc, allIds, errors);
      }
      if (annotation.annotates) {
        referencedIds.add(annotation.annotates);
      }
    }
  }

  // Validate groups
  if (process.groups) {
    for (const group of process.groups) {
      if (group.id) {
        registerElement(group.id, 'group', group.loc, allIds, errors);
      }
      if (group.elements) {
        for (const elemId of group.elements) {
          referencedIds.add(elemId);
        }
      }
    }
  }
}

function validatePool(
  pool: Pool,
  allIds: Map<string, ElementInfo>,
  referencedIds: Set<string>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (pool.id) {
    registerElement(pool.id, 'pool', pool.loc, allIds, errors);
  }

  if (pool.lanes) {
    for (const lane of pool.lanes) {
      validateLane(lane, allIds, referencedIds, errors, warnings);
    }
  }

  if (pool.elements) {
    for (const element of pool.elements) {
      validateFlowNode(element, allIds, referencedIds, errors, warnings);
    }
  }

  if (pool.sequenceFlows) {
    for (const flow of pool.sequenceFlows) {
      validateSequenceFlow(flow, allIds, referencedIds, errors);
    }
  }
}

function validateLane(
  lane: Lane,
  allIds: Map<string, ElementInfo>,
  referencedIds: Set<string>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (lane.id) {
    registerElement(lane.id, 'lane', lane.loc, allIds, errors);
  }

  if (lane.elements) {
    for (const element of lane.elements) {
      validateFlowNode(element, allIds, referencedIds, errors, warnings);
    }
  }

  if (lane.sequenceFlows) {
    for (const flow of lane.sequenceFlows) {
      validateSequenceFlow(flow, allIds, referencedIds, errors);
    }
  }
}

function validateFlowNode(
  node: FlowNode,
  allIds: Map<string, ElementInfo>,
  referencedIds: Set<string>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (node.id) {
    registerElement(node.id, node.type, node.loc, allIds, errors);
  }

  // Type-specific validation
  switch (node.type) {
    case 'startEvent':
      // Start events with triggers need corresponding attributes
      if (node.trigger === 'message' && !node.message) {
        warnings.push({
          code: 'MISSING_MESSAGE_REF',
          message: `Start event '${node.id}' has message trigger but no message reference`,
          severity: 'warning',
          loc: node.loc,
        });
      }
      if (node.trigger === 'timer' && !node.timer) {
        warnings.push({
          code: 'MISSING_TIMER_DEF',
          message: `Start event '${node.id}' has timer trigger but no timer definition`,
          severity: 'warning',
          loc: node.loc,
        });
      }
      break;

    case 'endEvent':
      if (node.trigger === 'error' && !node.error) {
        warnings.push({
          code: 'MISSING_ERROR_REF',
          message: `End event '${node.id}' has error trigger but no error reference`,
          severity: 'warning',
          loc: node.loc,
        });
      }
      break;

    case 'task':
      // Validate task type specific attributes
      if (node.taskType === 'script' && !node.script) {
        warnings.push({
          code: 'MISSING_SCRIPT',
          message: `Script task '${node.id}' has no script defined`,
          severity: 'warning',
          loc: node.loc,
        });
      }
      if (node.taskType === 'service' && !node.implementation && !node.class) {
        warnings.push({
          code: 'MISSING_IMPLEMENTATION',
          message: `Service task '${node.id}' has no implementation or class defined`,
          severity: 'warning',
          loc: node.loc,
        });
      }
      // Validate boundary events
      if (node.boundaryEvents) {
        for (const boundary of node.boundaryEvents) {
          validateFlowNode(boundary, allIds, referencedIds, errors, warnings);
        }
      }
      break;

    case 'gateway':
      // Gateway should have a type
      if (!node.gatewayType) {
        warnings.push({
          code: 'MISSING_GATEWAY_TYPE',
          message: `Gateway '${node.id}' has no type specified (defaulting to exclusive)`,
          severity: 'warning',
          loc: node.loc,
        });
      }
      // Default flow reference
      if (node.default) {
        referencedIds.add(node.default);
      }
      break;

    case 'callActivity':
      if (!node.calledElement) {
        errors.push({
          code: 'MISSING_CALLED_ELEMENT',
          message: `Call activity '${node.id}' must specify calledElement`,
          severity: 'error',
          loc: node.loc,
        });
      }
      break;

    case 'subprocess':
      if (node.elements) {
        for (const element of node.elements) {
          validateFlowNode(element, allIds, referencedIds, errors, warnings);
        }
      }
      if (node.boundaryEvents) {
        for (const boundary of node.boundaryEvents) {
          validateFlowNode(boundary, allIds, referencedIds, errors, warnings);
        }
      }
      break;

    case 'boundaryEvent':
      // Boundary event trigger validation
      if (node.trigger === 'timer' && !node.timer && !node.duration) {
        warnings.push({
          code: 'MISSING_TIMER_DEF',
          message: `Boundary event '${node.id}' has timer trigger but no timer/duration defined`,
          severity: 'warning',
          loc: node.loc,
        });
      }
      break;
  }
}

function validateSequenceFlow(
  flow: SequenceFlow,
  allIds: Map<string, ElementInfo>,
  referencedIds: Set<string>,
  errors: ValidationError[]
): void {
  if (flow.id) {
    registerElement(flow.id, 'sequenceFlow', flow.loc, allIds, errors);
  }

  if (!flow.from) {
    errors.push({
      code: 'MISSING_FLOW_SOURCE',
      message: `Sequence flow '${flow.id || '(unnamed)'}' has no source`,
      severity: 'error',
      loc: flow.loc,
    });
  } else {
    referencedIds.add(flow.from);
  }

  if (!flow.to) {
    errors.push({
      code: 'MISSING_FLOW_TARGET',
      message: `Sequence flow '${flow.id || '(unnamed)'}' has no target`,
      severity: 'error',
      loc: flow.loc,
    });
  } else {
    referencedIds.add(flow.to);
  }
}

function validateMessageFlow(
  flow: MessageFlow,
  allIds: Map<string, ElementInfo>,
  referencedIds: Set<string>,
  errors: ValidationError[]
): void {
  if (flow.id) {
    registerElement(flow.id, 'messageFlow', flow.loc, allIds, errors);
  }

  if (!flow.from) {
    errors.push({
      code: 'MISSING_FLOW_SOURCE',
      message: `Message flow '${flow.id || '(unnamed)'}' has no source`,
      severity: 'error',
      loc: flow.loc,
    });
  } else {
    referencedIds.add(flow.from);
  }

  if (!flow.to) {
    errors.push({
      code: 'MISSING_FLOW_TARGET',
      message: `Message flow '${flow.id || '(unnamed)'}' has no target`,
      severity: 'error',
      loc: flow.loc,
    });
  } else {
    referencedIds.add(flow.to);
  }
}

function registerElement(
  id: string,
  type: string,
  loc: SourceSpan | undefined,
  allIds: Map<string, ElementInfo>,
  errors: ValidationError[]
): void {
  if (allIds.has(id)) {
    const existing = allIds.get(id)!;
    errors.push({
      code: 'DUPLICATE_ID',
      message: `Duplicate ID '${id}' (already used by ${existing.type})`,
      severity: 'error',
      loc,
    });
  } else {
    allIds.set(id, { id, type, loc });
  }
}
