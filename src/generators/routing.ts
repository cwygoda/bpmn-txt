import type { Process, Pool, MessageFlow, Layout, Waypoint } from '../ast/types.js';
import type { LayoutResult } from './layout.js';
import { collectFromPool } from './utils.js';
import { OBSTACLE_MARGIN, POOL_LABEL_WIDTH } from './constants.js';
import { findOrthogonalPath, waypointsToSegments, type Rect, type Segment } from './obstacle-router.js';

/** Distance of the perpendicular stub from element edge before A* routing. */
const EXIT_STUB = 20;

/**
 * Merge collinear consecutive waypoints (same X or same Y through 3+ points).
 */
function simplifyWaypoints(wps: Waypoint[]): Waypoint[] {
  if (wps.length <= 2) return wps;
  const out: Waypoint[] = [wps[0]];
  for (let i = 1; i < wps.length - 1; i++) {
    const prev = out[out.length - 1];
    const curr = wps[i];
    const next = wps[i + 1];
    const sameX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const sameY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
    if (sameX || sameY) continue;
    out.push(curr);
  }
  out.push(wps[wps.length - 1]);
  return out;
}

/**
 * Check whether two pools are vertically adjacent (no intervening pool between them).
 */
function arePoolsAdjacent(
  poolALayout: Layout,
  poolBLayout: Layout,
  allPoolLayouts: Layout[]
): boolean {
  const aTop = poolALayout.y!;
  const aBottom = aTop + poolALayout.height!;
  const bTop = poolBLayout.y!;
  const bBottom = bTop + poolBLayout.height!;

  const gapTop = Math.min(aBottom, bBottom);
  const gapBottom = Math.max(aTop, bTop);

  // No gap (overlapping or touching) — treat as adjacent
  if (gapBottom <= gapTop) return true;

  for (const layout of allPoolLayouts) {
    if (layout === poolALayout || layout === poolBLayout) continue;
    const cTop = layout.y!;
    const cBottom = cTop + layout.height!;
    // Intervening if pool overlaps the gap
    if (cBottom > gapTop && cTop < gapBottom) return false;
  }
  return true;
}

/**
 * Remove consecutive duplicate waypoints (same x,y).
 */
function dedup(waypoints: Waypoint[]): Waypoint[] {
  const out: Waypoint[] = [];
  for (const wp of waypoints) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.x - wp.x) < 1 && Math.abs(prev.y - wp.y) < 1) continue;
    out.push(wp);
  }
  return out;
}

/**
 * Pick the best cardinal edge (top/right/bottom/left) of a layout rectangle
 * based on aspect-ratio-normalized direction toward a target point.
 */
function computeEdgePoint(
  layout: Layout,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  const w = layout.width ?? 100;
  const h = layout.height ?? 80;
  const cx = layout.x! + w / 2;
  const cy = layout.y! + h / 2;
  const normDx = Math.abs(targetX - cx) / (w / 2);
  const normDy = Math.abs(targetY - cy) / (h / 2);

  if (normDx >= normDy) {
    return { x: targetX > cx ? layout.x! + w : layout.x!, y: cy };
  } else {
    return { x: cx, y: targetY > cy ? layout.y! + h : layout.y! };
  }
}

/**
 * Collect obstacle rectangles from laid-out elements.
 * Excludes containers (pools, lanes) and specific element IDs.
 */
function collectObstacles(
  result: LayoutResult,
  excludeIds: Set<string>,
  containerIds: Set<string>
): Rect[] {
  const obstacles: Rect[] = [];
  for (const [id, layout] of result.elements) {
    if (excludeIds.has(id) || containerIds.has(id)) continue;
    if (layout.x === undefined || layout.y === undefined) continue;
    obstacles.push({
      x: layout.x,
      y: layout.y,
      width: layout.width ?? 100,
      height: layout.height ?? 80,
    });
  }
  return obstacles;
}

/**
 * Collect all segments from already-routed edges.
 */
function collectExistingSegments(result: LayoutResult): Segment[] {
  const segments: Segment[] = [];
  for (const [, edge] of result.edges) {
    segments.push(...waypointsToSegments(edge.waypoints));
  }
  return segments;
}

/**
 * Check if a vertical straight line from src to tgt is clear of inflated obstacles.
 */
function isVerticalLineClear(src: Waypoint, tgt: Waypoint, obstacles: Rect[]): boolean {
  if (Math.abs(src.x - tgt.x) > 1) return false;
  const x = src.x;
  const minY = Math.min(src.y, tgt.y);
  const maxY = Math.max(src.y, tgt.y);
  for (const r of obstacles) {
    const ir = {
      x: r.x - OBSTACLE_MARGIN,
      y: r.y - OBSTACLE_MARGIN,
      w: r.width + 2 * OBSTACLE_MARGIN,
      h: r.height + 2 * OBSTACLE_MARGIN,
    };
    if (x > ir.x && x < ir.x + ir.w && maxY > ir.y && minY < ir.y + ir.h) {
      return false;
    }
  }
  return true;
}

/**
 * Route message flows with obstacle-aware orthogonal waypoints.
 *
 * Strategy:
 * 1. Straight line — if vertically aligned and path clear
 * 2. Sparse-grid A* — obstacle + overlap avoidance
 * 3. Fallback — Z-shape (adjacent) or U-shape (non-adjacent)
 */
export function routeMessageFlows(process: Process, result: LayoutResult): void {
  if (!process.messageFlows || process.messageFlows.length === 0) return;
  if (!process.pools || process.pools.length === 0) return;

  // Build elementId → poolId map
  const elementToPool = new Map<string, string>();
  const poolIds = new Set<string>();
  for (const pool of process.pools) {
    if (pool.id) {
      poolIds.add(pool.id);
      elementToPool.set(pool.id, pool.id);
    }
    const { elements } = collectFromPool(pool);
    for (const elem of elements) {
      if (elem.id && pool.id) elementToPool.set(elem.id, pool.id);
    }
  }

  // Collect all pool layouts
  const allPoolLayouts: Layout[] = [];
  let maxRight = -Infinity;
  for (const pool of process.pools) {
    if (!pool.id) continue;
    const layout = result.elements.get(`Participant_${pool.id}`);
    if (layout) {
      allPoolLayouts.push(layout);
      maxRight = Math.max(maxRight, layout.x! + layout.width!);
    }
  }

  // Pool label zones — 30px vertical band on left edge of each pool
  const poolLabelObstacles: Rect[] = allPoolLayouts.map(layout => ({
    x: layout.x!,
    y: layout.y!,
    width: POOL_LABEL_WIDTH,
    height: layout.height!,
  }));

  // Container IDs to exclude from obstacles (pools + lanes)
  const containerIds = new Set<string>();
  for (const pool of process.pools) {
    if (pool.id) containerIds.add(`Participant_${pool.id}`);
    if (pool.lanes) {
      for (const lane of pool.lanes) {
        if (lane.id) containerIds.add(lane.id);
      }
    }
  }

  // Grid hints — pool boundary coordinates for intermediate routing options
  const gridHints: Waypoint[] = [];
  for (const layout of allPoolLayouts) {
    gridHints.push({ x: layout.x!, y: layout.y! });
    gridHints.push({ x: layout.x! + layout.width!, y: layout.y! + layout.height! });
    // Gap midpoints between consecutive pools
    gridHints.push({ x: layout.x! + layout.width! / 2, y: layout.y! + layout.height! });
  }

  // Track routed segments incrementally for overlap prevention
  const routedSegments = collectExistingSegments(result);

  // Group flows by pool pair
  const groups = new Map<string, MessageFlow[]>();
  for (const flow of process.messageFlows) {
    const srcPool = elementToPool.get(flow.from);
    const tgtPool = elementToPool.get(flow.to);
    if (!srcPool || !tgtPool || srcPool === tgtPool) continue;

    const key = [srcPool, tgtPool].sort().join(':');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(flow);
  }

  // Route each group
  for (const [, flows] of groups) {
    const firstSrcPool = elementToPool.get(flows[0].from)!;
    const firstTgtPool = elementToPool.get(flows[0].to)!;
    const poolALayout = result.elements.get(`Participant_${firstSrcPool}`);
    const poolBLayout = result.elements.get(`Participant_${firstTgtPool}`);
    if (!poolALayout || !poolBLayout) continue;

    const aAbove = poolALayout.y! < poolBLayout.y!;
    const adjacent = arePoolsAdjacent(poolALayout, poolBLayout, allPoolLayouts);

    // Gap metrics (for fallback Z-shape)
    const aBottom = poolALayout.y! + poolALayout.height!;
    const bBottom = poolBLayout.y! + poolBLayout.height!;
    const gapTop = aAbove ? aBottom : bBottom;
    const gapBottom = aAbove ? poolBLayout.y! : poolALayout.y!;
    const gapHeight = Math.max(gapBottom - gapTop, 0);

    // Sort by average X for crossing minimization
    const flowsWithMeta = flows.map(flow => {
      const srcLayout = result.elements.get(flow.from)
        ?? (poolIds.has(flow.from) ? result.elements.get(`Participant_${flow.from}`) : undefined);
      const tgtLayout = result.elements.get(flow.to)
        ?? (poolIds.has(flow.to) ? result.elements.get(`Participant_${flow.to}`) : undefined);
      const srcW = srcLayout?.width ?? 100;
      const tgtW = tgtLayout?.width ?? 100;
      const srcCenterX = (srcLayout?.x ?? 0) + srcW / 2;
      const tgtCenterX = (tgtLayout?.x ?? 0) + tgtW / 2;
      return { flow, srcCenterX, tgtCenterX, avgX: (srcCenterX + tgtCenterX) / 2 };
    });
    flowsWithMeta.sort((a, b) => a.avgX - b.avgX);

    const count = flowsWithMeta.length;
    for (let i = 0; i < count; i++) {
      const { flow, srcCenterX, tgtCenterX } = flowsWithMeta[i];
      const srcLayout = result.elements.get(flow.from)
        ?? (poolIds.has(flow.from) ? result.elements.get(`Participant_${flow.from}`) : undefined);
      const tgtLayout = result.elements.get(flow.to)
        ?? (poolIds.has(flow.to) ? result.elements.get(`Participant_${flow.to}`) : undefined);
      if (!srcLayout || !tgtLayout) continue;

      const srcPool = elementToPool.get(flow.from)!;
      const srcH = srcLayout.height ?? 80;
      const tgtH = tgtLayout.height ?? 80;
      const srcIsInUpperPool = (srcPool === firstSrcPool) === aAbove;

      // Exit bottom / enter top (flip when source is below target)
      const srcY = srcIsInUpperPool ? srcLayout.y! + srcH : srcLayout.y!;
      const tgtY = srcIsInUpperPool ? tgtLayout.y! : tgtLayout.y! + tgtH;

      const src: Waypoint = { x: srcCenterX, y: srcY };
      const tgt: Waypoint = { x: tgtCenterX, y: tgtY };

      // Build exclude set — src/tgt elements + their pools
      const excludeIds = new Set<string>();
      excludeIds.add(flow.from);
      excludeIds.add(flow.to);
      if (poolIds.has(flow.from)) excludeIds.add(`Participant_${flow.from}`);
      if (poolIds.has(flow.to)) excludeIds.add(`Participant_${flow.to}`);

      // Collect element obstacles + pool label zones
      const obstacles = collectObstacles(result, excludeIds, containerIds);
      obstacles.push(...poolLabelObstacles);

      // For non-adjacent: add intervening pool bodies as obstacles
      if (!adjacent) {
        for (const layout of allPoolLayouts) {
          if (layout === poolALayout || layout === poolBLayout) continue;
          const top = layout.y!;
          const bottom = top + layout.height!;
          if (bottom > gapTop && top < gapBottom) {
            obstacles.push({
              x: layout.x!,
              y: layout.y!,
              width: layout.width!,
              height: layout.height!,
            });
          }
        }
      }

      let waypoints: Waypoint[] | null = null;

      // 1. Straight line — vertically aligned, no obstacles
      if (isVerticalLineClear(src, tgt, obstacles)) {
        waypoints = [src, tgt];
      }

      // 2. A* pathfinding — route between perpendicular stubs so lines
      //    always exit/enter orthogonally from element edges
      if (!waypoints) {
        const stubDir = srcIsInUpperPool ? 1 : -1;
        const srcStub: Waypoint = { x: srcCenterX, y: srcY + stubDir * EXIT_STUB };
        const tgtStub: Waypoint = { x: tgtCenterX, y: tgtY - stubDir * EXIT_STUB };
        const astarPath = findOrthogonalPath(srcStub, tgtStub, obstacles, routedSegments, gridHints);
        if (astarPath) {
          waypoints = simplifyWaypoints([src, ...astarPath, tgt]);
        }
      }

      // 3. Fallback — existing hand-crafted shapes
      if (!waypoints) {
        if (adjacent) {
          if (Math.abs(srcCenterX - tgtCenterX) < 1) {
            waypoints = [src, tgt];
          } else {
            const midY = gapTop + (i + 1) * gapHeight / (count + 1);
            waypoints = [src, { x: srcCenterX, y: midY }, { x: tgtCenterX, y: midY }, tgt];
          }
        } else {
          // U-shape around the right side
          const srcPoolLayout = result.elements.get(`Participant_${elementToPool.get(flow.from)}`)!;
          const tgtPoolLayout = result.elements.get(`Participant_${elementToPool.get(flow.to)}`)!;

          const POOL_EDGE_MARGIN = 15;
          const tgtPoolEdgeY = srcIsInUpperPool
            ? tgtPoolLayout.y! - POOL_EDGE_MARGIN
            : tgtPoolLayout.y! + tgtPoolLayout.height! + POOL_EDGE_MARGIN;

          const routeX = maxRight + 40 + i * 20;
          const srcEdge = computeEdgePoint(srcLayout, routeX, tgtPoolEdgeY);
          const isHorizontalExit = Math.abs(srcEdge.y - (srcLayout.y! + srcH / 2)) < 1;

          if (isHorizontalExit) {
            waypoints = dedup([
              srcEdge,
              { x: routeX, y: srcEdge.y },
              { x: routeX, y: tgtPoolEdgeY },
              { x: tgtCenterX, y: tgtPoolEdgeY },
              { x: tgtCenterX, y: tgtY },
            ]);
          } else {
            const srcPoolEdgeY = srcIsInUpperPool
              ? srcPoolLayout.y! + srcPoolLayout.height! + POOL_EDGE_MARGIN
              : srcPoolLayout.y! - POOL_EDGE_MARGIN;
            waypoints = dedup([
              srcEdge,
              { x: srcEdge.x, y: srcPoolEdgeY },
              { x: routeX, y: srcPoolEdgeY },
              { x: routeX, y: tgtPoolEdgeY },
              { x: tgtCenterX, y: tgtPoolEdgeY },
              { x: tgtCenterX, y: tgtY },
            ]);
          }
        }
      }

      // Track routed segments for subsequent flows
      routedSegments.push(...waypointsToSegments(waypoints));

      if (flow.id) {
        result.edges.set(flow.id, { waypoints });
      }
    }
  }
}

/**
 * Re-route pool-level sequence flows using final node positions.
 * Cross-lane inline flows (`->`) are stored on pool.sequenceFlows,
 * whose waypoints are not adjusted during lane stacking.
 */
export function routePoolSequenceFlows(pools: Pool[], result: LayoutResult): void {
  for (const pool of pools) {
    if (!pool.sequenceFlows) continue;

    for (const flow of pool.sequenceFlows) {
      if (!flow.id || !flow.from || !flow.to) continue;

      const srcLayout = result.elements.get(flow.from);
      const tgtLayout = result.elements.get(flow.to);
      if (!srcLayout || !tgtLayout) continue;

      const srcW = srcLayout.width ?? 100;
      const srcH = srcLayout.height ?? 80;
      const tgtH = tgtLayout.height ?? 80;

      // Exit right edge center of source
      const srcX = srcLayout.x! + srcW;
      const srcY = srcLayout.y! + srcH / 2;
      // Enter left edge center of target
      const tgtX = tgtLayout.x!;
      const tgtY = tgtLayout.y! + tgtH / 2;

      const waypoints: Waypoint[] = [];
      if (Math.abs(srcY - tgtY) < 1) {
        // Same Y — straight horizontal line
        waypoints.push({ x: srcX, y: srcY });
        waypoints.push({ x: tgtX, y: tgtY });
      } else {
        // Z-shape: right → down/up → right
        const midX = (srcX + tgtX) / 2;
        waypoints.push({ x: srcX, y: srcY });
        waypoints.push({ x: midX, y: srcY });
        waypoints.push({ x: midX, y: tgtY });
        waypoints.push({ x: tgtX, y: tgtY });
      }

      result.edges.set(flow.id, { waypoints });
    }
  }
}
