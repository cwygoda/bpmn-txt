import type {
  Document,
  Process,
  Pool,
  Lane,
  FlowNode,
  SequenceFlow,
  MessageFlow,
  Annotation,
  Group,
  BoundaryEvent,
} from '../ast/types.js';

/**
 * Generate IDs for elements that don't have them.
 * Mutates the document in place.
 */
export function generateIds(doc: Document): Document {
  const counters = new Map<string, number>();

  function nextId(prefix: string): string {
    const count = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, count);
    return `${prefix}_${count}`;
  }

  function processFlowNode(node: FlowNode): void {
    if (!node.id) {
      switch (node.type) {
        case 'startEvent':
          node.id = nextId('start');
          break;
        case 'endEvent':
          node.id = nextId('end');
          break;
        case 'intermediateEvent':
          node.id = nextId('event');
          break;
        case 'boundaryEvent':
          node.id = nextId('boundary');
          break;
        case 'task':
          node.id = nextId('task');
          break;
        case 'subprocess':
          node.id = nextId('subprocess');
          break;
        case 'callActivity':
          node.id = nextId('call');
          break;
        case 'gateway':
          node.id = nextId('gateway');
          break;
        case 'dataObject':
          node.id = nextId('dataObject');
          break;
        case 'dataStore':
          node.id = nextId('dataStore');
          break;
      }
    }

    // Handle nested elements
    if (node.type === 'task' && node.boundaryEvents) {
      for (const boundary of node.boundaryEvents) {
        processFlowNode(boundary);
      }
    }
    if (node.type === 'subprocess') {
      if (node.elements) {
        for (const elem of node.elements) {
          processFlowNode(elem);
        }
      }
      if (node.boundaryEvents) {
        for (const boundary of node.boundaryEvents) {
          processFlowNode(boundary);
        }
      }
    }
  }

  function processSequenceFlow(flow: SequenceFlow): void {
    if (!flow.id) {
      flow.id = nextId('flow');
    }
  }

  function processMessageFlow(flow: MessageFlow): void {
    if (!flow.id) {
      flow.id = nextId('messageFlow');
    }
  }

  function processLane(lane: Lane): void {
    if (!lane.id) {
      lane.id = nextId('lane');
    }
    if (lane.elements) {
      for (const elem of lane.elements) {
        processFlowNode(elem);
      }
    }
    if (lane.sequenceFlows) {
      for (const flow of lane.sequenceFlows) {
        processSequenceFlow(flow);
      }
    }
  }

  function processPool(pool: Pool): void {
    if (!pool.id) {
      pool.id = nextId('pool');
    }
    if (pool.lanes) {
      for (const lane of pool.lanes) {
        processLane(lane);
      }
    }
    if (pool.elements) {
      for (const elem of pool.elements) {
        processFlowNode(elem);
      }
    }
    if (pool.sequenceFlows) {
      for (const flow of pool.sequenceFlows) {
        processSequenceFlow(flow);
      }
    }
  }

  function processProcess(proc: Process): void {
    // Process ID is required, but ensure it exists
    if (!proc.id) {
      proc.id = nextId('process');
    }

    if (proc.pools) {
      for (const pool of proc.pools) {
        processPool(pool);
      }
    }
    if (proc.elements) {
      for (const elem of proc.elements) {
        processFlowNode(elem);
      }
    }
    if (proc.sequenceFlows) {
      for (const flow of proc.sequenceFlows) {
        processSequenceFlow(flow);
      }
    }
    if (proc.messageFlows) {
      for (const flow of proc.messageFlows) {
        processMessageFlow(flow);
      }
    }
    if (proc.annotations) {
      for (const annotation of proc.annotations) {
        if (!annotation.id) {
          annotation.id = nextId('annotation');
        }
      }
    }
    if (proc.groups) {
      for (const group of proc.groups) {
        if (!group.id) {
          group.id = nextId('group');
        }
      }
    }
  }

  for (const proc of doc.processes) {
    processProcess(proc);
  }

  return doc;
}
