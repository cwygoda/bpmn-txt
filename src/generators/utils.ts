import type { Process, Pool, Lane, FlowNode, SequenceFlow, Task, Subprocess } from '../ast/types.js';

export interface CollectedElements {
  elements: FlowNode[];
  flows: SequenceFlow[];
}

/**
 * Collect boundary events from an array of flow elements.
 * Tasks and subprocesses may have nested boundaryEvents arrays.
 */
function collectBoundaryEvents(elements: FlowNode[]): FlowNode[] {
  const boundary: FlowNode[] = [];
  for (const el of elements) {
    if ((el.type === 'task' || el.type === 'subprocess') && (el as Task | Subprocess).boundaryEvents) {
      boundary.push(...(el as Task | Subprocess).boundaryEvents!);
    }
  }
  return boundary;
}

/**
 * Collect all flow elements and sequence flows from a process,
 * including those nested in pools and lanes.
 */
export function collectFromProcess(process: Process): CollectedElements {
  const elements: FlowNode[] = [];
  const flows: SequenceFlow[] = [];

  // From pools and lanes
  if (process.pools) {
    for (const pool of process.pools) {
      if (pool.elements) {
        elements.push(...pool.elements);
        elements.push(...collectBoundaryEvents(pool.elements));
      }
      if (pool.sequenceFlows) {
        flows.push(...pool.sequenceFlows);
      }
      if (pool.lanes) {
        for (const lane of pool.lanes) {
          if (lane.elements) {
            elements.push(...lane.elements);
            elements.push(...collectBoundaryEvents(lane.elements));
          }
          if (lane.sequenceFlows) {
            flows.push(...lane.sequenceFlows);
          }
        }
      }
    }
  }

  // Direct elements
  if (process.elements) {
    elements.push(...process.elements);
    elements.push(...collectBoundaryEvents(process.elements));
  }
  if (process.sequenceFlows) {
    flows.push(...process.sequenceFlows);
  }

  return { elements, flows };
}

/**
 * Collect flow elements and sequence flows from a single pool.
 */
export function collectFromPool(pool: Pool): CollectedElements {
  const elements: FlowNode[] = [];
  const flows: SequenceFlow[] = [];
  if (pool.elements) {
    elements.push(...pool.elements);
    elements.push(...collectBoundaryEvents(pool.elements));
  }
  if (pool.sequenceFlows) flows.push(...pool.sequenceFlows);
  if (pool.lanes) {
    for (const lane of pool.lanes) {
      if (lane.elements) {
        elements.push(...lane.elements);
        elements.push(...collectBoundaryEvents(lane.elements));
      }
      if (lane.sequenceFlows) flows.push(...lane.sequenceFlows);
    }
  }
  return { elements, flows };
}

/**
 * Collect all flow elements and sequence flows from a process,
 * including those nested in pools, lanes, AND subprocess children (recursively).
 */
export function collectAllElements(process: Process): CollectedElements {
  const base = collectFromProcess(process);
  const elements: FlowNode[] = [];
  const flows = [...base.flows];

  for (const elem of base.elements) {
    elements.push(elem);
    if (elem.type === 'subprocess' && (elem as Subprocess).elements) {
      collectSubprocessChildren(elem as Subprocess, elements);
    }
  }

  return { elements, flows };
}

/**
 * Recursively collect subprocess children into a flat list.
 */
function collectSubprocessChildren(subprocess: Subprocess, out: FlowNode[]): void {
  if (!subprocess.elements) return;
  for (const child of subprocess.elements) {
    out.push(child);
    out.push(...collectBoundaryEvents([child]));
    if (child.type === 'subprocess' && (child as Subprocess).elements) {
      collectSubprocessChildren(child as Subprocess, out);
    }
  }
}

/**
 * Collect pools and lanes from a process.
 */
export function collectPoolsAndLanes(process: Process): { pools: Pool[]; lanes: Lane[] } {
  const pools: Pool[] = [];
  const lanes: Lane[] = [];

  if (process.pools) {
    for (const pool of process.pools) {
      pools.push(pool);
      if (pool.lanes) {
        lanes.push(...pool.lanes);
      }
    }
  }

  return { pools, lanes };
}
