import ELKConstructor from 'elkjs';
import type { ElkNode, ElkExtendedEdge, ELK } from 'elkjs';
import type {
  Document,
  Process,
  FlowNode,
  Lane,
  SequenceFlow,
  Layout,
  Waypoint,
} from '../ast/types.js';
import { ELEMENT_SIZES } from './constants.js';
import { collectFromProcess, collectFromPool, collectPoolsAndLanes } from './utils.js';
import { routeMessageFlows, routePoolSequenceFlows } from './routing.js';

// elkjs ESM default export requires type coercion
const elk: ELK = new (ELKConstructor as unknown as { new (): ELK })();

export interface LayoutResult {
  elements: Map<string, Layout>;
  edges: Map<string, { waypoints: Waypoint[] }>;
}

export interface LayoutOptions {
  /** Direction: RIGHT, LEFT, DOWN, UP */
  direction?: 'RIGHT' | 'LEFT' | 'DOWN' | 'UP';
  /** Spacing between nodes */
  nodeSpacing?: number;
  /** Spacing between layers */
  layerSpacing?: number;
  /** Spacing between edges */
  edgeSpacing?: number;
}

/**
 * Generate automatic layout for a document
 */
export async function generateLayout(
  doc: Document,
  options: LayoutOptions = {}
): Promise<LayoutResult> {
  const { direction = 'RIGHT', nodeSpacing = 70, layerSpacing = 100, edgeSpacing = 20 } = options;

  const result: LayoutResult = {
    elements: new Map(),
    edges: new Map(),
  };

  for (const process of doc.processes) {
    const processLayout = await layoutProcess(process, {
      direction,
      nodeSpacing,
      layerSpacing,
      edgeSpacing,
    });

    // Merge into result
    for (const [id, layout] of processLayout.elements) {
      result.elements.set(id, layout);
    }
    for (const [id, edge] of processLayout.edges) {
      result.edges.set(id, edge);
    }
  }

  return result;
}

const POOL_GAP = 80;
const CONTAINER_PADDING = 50;
const MIN_FLOW_SPACING = 20;

async function layoutProcess(
  process: Process,
  options: LayoutOptions
): Promise<LayoutResult> {
  const hasPools = process.pools && process.pools.length > 0;

  if (!hasPools) {
    return layoutFlat(process, options);
  }

  // Per-pool layout with vertical stacking
  const result: LayoutResult = { elements: new Map(), edges: new Map() };
  let yOffset = 0;
  const poolGaps = computePoolGaps(process);

  for (let i = 0; i < process.pools!.length; i++) {
    const pool = process.pools![i];
    const gap = poolGaps[i];
    const poolElements = collectFromPool(pool);
    if (poolElements.elements.length === 0) {
      // Collapsed (black box) pool — thin horizontal bar
      // Offset Y by -CONTAINER_PADDING*2 to align with expanded pool Participant boxes
      // (expanded pools extend CONTAINER_PADDING*2 above their content)
      const collapsedY = Math.max(0, yOffset - CONTAINER_PADDING * 2);
      result.elements.set(`Participant_${pool.id}`, {
        x: 0, y: collapsedY,
        width: ELEMENT_SIZES.collapsedPool.width,
        height: ELEMENT_SIZES.collapsedPool.height,
      });
      yOffset = collapsedY + ELEMENT_SIZES.collapsedPool.height + gap + CONTAINER_PADDING * 2;
      continue;
    }

    const poolResult = await layoutElements(
      poolElements.elements,
      poolElements.flows,
      options
    );
    mergeWithOffset(poolResult, result, yOffset);

    // Participant bounds extend 2*PADDING above and below elements.
    // Offset must clear both this pool's bottom padding and the next pool's top padding.
    const bounds = computeBoundsForElements(poolElements.elements, result);
    if (bounds) {
      yOffset = bounds.maxY + CONTAINER_PADDING * 4 + gap;
    }
  }

  // Direct (non-pool) elements
  if (process.elements && process.elements.length > 0) {
    const directResult = await layoutElements(
      process.elements,
      process.sequenceFlows ?? [],
      options
    );
    mergeWithOffset(directResult, result, yOffset);
  }

  computeContainerBounds(process, result);

  // Normalize all pool X positions and widths to the widest
  if (process.pools!.length > 1) {
    let minX = Infinity;
    let maxRight = -Infinity;
    for (const pool of process.pools!) {
      if (!pool.id) continue;
      const layout = result.elements.get(`Participant_${pool.id}`);
      if (layout && layout.x !== undefined && layout.width) {
        minX = Math.min(minX, layout.x);
        maxRight = Math.max(maxRight, layout.x + layout.width);
      }
    }
    const normalizedWidth = maxRight - minX;
    for (const pool of process.pools!) {
      if (!pool.id) continue;
      const layout = result.elements.get(`Participant_${pool.id}`);
      if (!layout) continue;

      const prevX = layout.x ?? 0;
      const prevWidth = layout.width ?? 0;
      layout.x = minX;
      layout.width = normalizedWidth;

      // Cascade to lanes: lanes sit inside pool with PADDING offset from pool edge
      if (pool.lanes) {
        const laneX = minX + CONTAINER_PADDING;
        const laneWidth = normalizedWidth - 2 * CONTAINER_PADDING;
        for (const lane of pool.lanes) {
          if (!lane.id) continue;
          const laneLayout = result.elements.get(lane.id);
          if (!laneLayout) continue;
          laneLayout.x = laneX;
          laneLayout.width = laneWidth;
        }
      }
    }
  }

  routeMessageFlows(process, result);
  return result;
}

/**
 * Compute per-gap spacing between consecutive pools.
 * Scales up from POOL_GAP when many message flows cross between a pair.
 */
function computePoolGaps(process: Process): number[] {
  const pools = process.pools ?? [];
  const gaps = new Array(pools.length).fill(POOL_GAP);
  if (!process.messageFlows || pools.length < 2) return gaps;

  const elemToPoolIdx = new Map<string, number>();
  pools.forEach((pool, idx) => {
    if (!pool.id) return;
    elemToPoolIdx.set(pool.id, idx);
    const { elements } = collectFromPool(pool);
    for (const elem of elements) {
      if (elem.id) elemToPoolIdx.set(elem.id, idx);
    }
  });

  // Count flows between each consecutive pool pair
  const pairCounts = new Array(pools.length).fill(0);
  for (const flow of process.messageFlows) {
    const srcIdx = elemToPoolIdx.get(flow.from);
    const tgtIdx = elemToPoolIdx.get(flow.to);
    if (srcIdx === undefined || tgtIdx === undefined || srcIdx === tgtIdx) continue;
    if (Math.abs(srcIdx - tgtIdx) === 1) {
      pairCounts[Math.min(srcIdx, tgtIdx)]++;
    }
  }

  for (let i = 0; i < pools.length - 1; i++) {
    gaps[i] = Math.max(POOL_GAP, (pairCounts[i] + 1) * MIN_FLOW_SPACING);
  }
  return gaps;
}

async function layoutFlat(
  process: Process,
  options: LayoutOptions
): Promise<LayoutResult> {
  const { elements, flows } = collectFromProcess(process);

  if (elements.length === 0) {
    return { elements: new Map(), edges: new Map() };
  }

  const graph = buildElkGraph(elements, flows, options);
  const layoutedGraph = await elk.layout(graph);
  const result = extractLayout(layoutedGraph);

  computeContainerBounds(process, result);
  return result;
}

async function layoutElements(
  elements: FlowNode[],
  flows: SequenceFlow[],
  options: LayoutOptions
): Promise<LayoutResult> {
  const graph = buildElkGraph(elements, flows, options);
  const layoutedGraph = await elk.layout(graph);
  return extractLayout(layoutedGraph);
}

/**
 * Merge a pool's layout into the combined result, offsetting by yOffset.
 */
function mergeWithOffset(
  source: LayoutResult,
  target: LayoutResult,
  yOffset: number
): void {
  for (const [id, layout] of source.elements) {
    layout.y = (layout.y ?? 0) + yOffset;
    target.elements.set(id, layout);
  }

  for (const [id, edge] of source.edges) {
    for (const wp of edge.waypoints) {
      wp.y += yOffset;
    }
    target.edges.set(id, edge);
  }
}

function buildElkGraph(
  elements: FlowNode[],
  flows: SequenceFlow[],
  options: LayoutOptions
): ElkNode {
  const children: ElkNode[] = [];
  const edges: ElkExtendedEdge[] = [];

  // Add nodes
  for (const elem of elements) {
    if (!elem.id) continue;

    const size = ELEMENT_SIZES[elem.type] || { width: 100, height: 80 };

    // Use explicit layout if provided
    const node: ElkNode = {
      id: elem.id,
      width: elem.layout?.width ?? size.width,
      height: elem.layout?.height ?? size.height,
    };

    // If explicit position, set it as a constraint
    if (elem.layout?.x !== undefined && elem.layout?.y !== undefined) {
      node.x = elem.layout.x;
      node.y = elem.layout.y;
    }

    children.push(node);
  }

  // Add edges
  for (const flow of flows) {
    if (!flow.from || !flow.to) continue;

    edges.push({
      id: flow.id || `edge_${flow.from}_${flow.to}`,
      sources: [flow.from],
      targets: [flow.to],
    });
  }

  // ELK layout options
  const layoutOptions: Record<string, string> = {
    'elk.algorithm': 'layered',
    'elk.direction': options.direction ?? 'RIGHT',
    'elk.spacing.nodeNode': String(options.nodeSpacing ?? 70),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(options.layerSpacing ?? 100),
    'elk.spacing.edgeEdge': String(options.edgeSpacing ?? 20),
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.edgeRouting': 'ORTHOGONAL',
  };

  return {
    id: 'root',
    layoutOptions,
    children,
    edges,
  };
}

function extractLayout(graph: ElkNode): LayoutResult {
  const elements = new Map<string, Layout>();
  const edges = new Map<string, { waypoints: Waypoint[] }>();

  // Extract node positions
  if (graph.children) {
    for (const child of graph.children) {
      if (child.x !== undefined && child.y !== undefined) {
        elements.set(child.id, {
          x: child.x,
          y: child.y,
          width: child.width,
          height: child.height,
        });
      }
    }
  }

  // Extract edge waypoints
  if (graph.edges) {
    for (const edge of graph.edges) {
      const waypoints: Waypoint[] = [];

      if (edge.sections) {
        for (const section of edge.sections) {
          if (section.startPoint) {
            waypoints.push({ x: section.startPoint.x, y: section.startPoint.y });
          }
          if (section.bendPoints) {
            for (const bp of section.bendPoints) {
              waypoints.push({ x: bp.x, y: bp.y });
            }
          }
          if (section.endPoint) {
            waypoints.push({ x: section.endPoint.x, y: section.endPoint.y });
          }
        }
      }

      if (waypoints.length > 0) {
        edges.set(edge.id, { waypoints });
      }
    }
  }

  return { elements, edges };
}

/**
 * Compute bounding boxes for pools and lanes based on contained elements
 */
function computeContainerBounds(process: Process, result: LayoutResult): void {
  const { pools, lanes } = collectPoolsAndLanes(process);
  const PADDING = CONTAINER_PADDING;

  // Compute lane bounds
  for (const lane of lanes) {
    if (!lane.id || !lane.elements || lane.elements.length === 0) continue;

    const bounds = computeBoundsForElements(lane.elements, result);
    if (bounds) {
      result.elements.set(lane.id, {
        x: bounds.minX - PADDING,
        y: bounds.minY - PADDING,
        width: bounds.maxX - bounds.minX + 2 * PADDING,
        height: bounds.maxY - bounds.minY + 2 * PADDING,
      });
    }
  }

  // Stack lanes vertically within each pool (declaration order = top→bottom)
  for (const pool of pools) {
    if (!pool.id || !pool.lanes || pool.lanes.length < 2) continue;

    // Collect lanes that have computed bounds
    const laneLayouts: { lane: Lane; layout: Layout }[] = [];
    for (const lane of pool.lanes) {
      if (!lane.id) continue;
      const layout = result.elements.get(lane.id);
      if (layout && layout.x !== undefined && layout.y !== undefined) {
        laneLayouts.push({ lane, layout });
      }
    }
    if (laneLayouts.length < 2) continue;

    // Uniform X and width across all lanes
    const minX = Math.min(...laneLayouts.map(l => l.layout.x!));
    const maxRight = Math.max(...laneLayouts.map(l => l.layout.x! + (l.layout.width ?? 0)));
    const fullWidth = maxRight - minX;

    // Stack in declaration order, anchored at topmost lane
    let nextY = Math.min(...laneLayouts.map(l => l.layout.y!));
    for (const { lane, layout: laneLayout } of laneLayouts) {
      const deltaY = nextY - laneLayout.y!;
      laneLayout.x = minX;
      laneLayout.y = nextY;
      laneLayout.width = fullWidth;

      // Shift contained elements and edge waypoints
      if (lane.elements) {
        for (const elem of lane.elements) {
          if (!elem.id) continue;
          const elemLayout = result.elements.get(elem.id);
          if (elemLayout && elemLayout.y !== undefined) {
            elemLayout.y += deltaY;
          }
        }
      }
      if (lane.sequenceFlows) {
        for (const flow of lane.sequenceFlows) {
          if (!flow.id) continue;
          const edge = result.edges.get(flow.id);
          if (edge) {
            for (const wp of edge.waypoints) {
              wp.y += deltaY;
            }
          }
        }
      }

      nextY += laneLayout.height ?? 0;
    }
  }

  // Re-route pool-level sequence flows (cross-lane inline flows)
  routePoolSequenceFlows(pools, result);

  // Compute pool bounds (encompassing all lanes and direct elements)
  for (const pool of pools) {
    if (!pool.id) continue;

    const allPoolElements: FlowNode[] = [];
    if (pool.elements) allPoolElements.push(...pool.elements);
    if (pool.lanes) {
      for (const lane of pool.lanes) {
        if (lane.elements) allPoolElements.push(...lane.elements);
      }
    }

    if (allPoolElements.length === 0) continue;

    const bounds = computeBoundsForElements(allPoolElements, result);
    if (bounds) {
      result.elements.set(`Participant_${pool.id}`, {
        x: bounds.minX - PADDING * 2,
        y: bounds.minY - PADDING * 2,
        width: bounds.maxX - bounds.minX + 4 * PADDING,
        height: bounds.maxY - bounds.minY + 4 * PADDING,
      });
    }
  }
}

function computeBoundsForElements(
  elements: FlowNode[],
  result: LayoutResult
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  for (const elem of elements) {
    if (!elem.id) continue;
    const layout = result.elements.get(elem.id);
    if (!layout || layout.x === undefined || layout.y === undefined) continue;

    found = true;
    const w = layout.width ?? ELEMENT_SIZES[elem.type]?.width ?? 100;
    const h = layout.height ?? ELEMENT_SIZES[elem.type]?.height ?? 80;

    minX = Math.min(minX, layout.x);
    minY = Math.min(minY, layout.y);
    maxX = Math.max(maxX, layout.x + w);
    maxY = Math.max(maxY, layout.y + h);
  }

  return found ? { minX, minY, maxX, maxY } : null;
}

/**
 * Apply layout to document (mutates in place)
 */
export function applyLayout(doc: Document, layout: LayoutResult): void {
  for (const process of doc.processes) {
    applyLayoutToProcess(process, layout);
  }
}

function applyLayoutToProcess(process: Process, layout: LayoutResult): void {
  const { elements, flows } = collectFromProcess(process);

  // Apply to all elements
  for (const elem of elements) {
    if (elem.id && layout.elements.has(elem.id)) {
      elem.layout = layout.elements.get(elem.id);
    }
  }

  // Apply to all sequence flows (including those in pools/lanes)
  for (const flow of flows) {
    if (flow.id && layout.edges.has(flow.id)) {
      flow.layout = layout.edges.get(flow.id);
    }
  }

  // Apply to message flows
  if (process.messageFlows) {
    for (const flow of process.messageFlows) {
      if (flow.id && layout.edges.has(flow.id)) {
        flow.layout = layout.edges.get(flow.id);
      }
    }
  }
}
