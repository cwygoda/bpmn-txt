import type { Process, Pool, Lane, FlowNode, SequenceFlow } from '../ast/types.js';

export interface CollectedElements {
  elements: FlowNode[];
  flows: SequenceFlow[];
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
      }
      if (pool.sequenceFlows) {
        flows.push(...pool.sequenceFlows);
      }
      if (pool.lanes) {
        for (const lane of pool.lanes) {
          if (lane.elements) {
            elements.push(...lane.elements);
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
  if (pool.elements) elements.push(...pool.elements);
  if (pool.sequenceFlows) flows.push(...pool.sequenceFlows);
  if (pool.lanes) {
    for (const lane of pool.lanes) {
      if (lane.elements) elements.push(...lane.elements);
      if (lane.sequenceFlows) flows.push(...lane.sequenceFlows);
    }
  }
  return { elements, flows };
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
