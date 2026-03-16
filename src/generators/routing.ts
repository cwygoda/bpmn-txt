import type { Process, Pool, MessageFlow, Layout, Waypoint } from '../ast/types.js';
import type { LayoutResult } from './layout.js';
import { collectFromPool } from './utils.js';
import { OBSTACLE_MARGIN, computePoolLabelWidth } from './constants.js';
import { findOrthogonalPath, waypointsToSegments, type Rect, type Segment } from './obstacle-router.js';

/** Distance of the perpendicular stub from element edge before A* routing. */
const EXIT_STUB = 20;

/**
 * Count how many Z-shape segments intersect obstacles for a given midpoint.
 * axis='x' → H→V→H (midX), axis='y' → V→H→V (midY).
 */
function countZShapeHits(
  src: Waypoint, tgt: Waypoint, mid: number,
  axis: 'x' | 'y', obstacles: Rect[]
): number {
  let hits = 0;
  if (axis === 'x') {
    const p1: Waypoint = { x: mid, y: src.y };
    const p2: Waypoint = { x: mid, y: tgt.y };
    if (!isHorizontalLineClear(src, p1, obstacles)) hits++;
    if (!isVerticalLineClear(p1, p2, obstacles)) hits++;
    if (!isHorizontalLineClear(p2, tgt, obstacles)) hits++;
  } else {
    const p1: Waypoint = { x: src.x, y: mid };
    const p2: Waypoint = { x: tgt.x, y: mid };
    if (!isVerticalLineClear(src, p1, obstacles)) hits++;
    if (!isHorizontalLineClear(p1, p2, obstacles)) hits++;
    if (!isVerticalLineClear(p2, tgt, obstacles)) hits++;
  }
  return hits;
}

/**
 * Find a Z-shape midpoint that avoids obstacles when possible.
 * Tries naive midpoint first, then obstacle edges as candidates.
 */
function findBestZMid(
  src: Waypoint, tgt: Waypoint,
  axis: 'x' | 'y', obstacles: Rect[]
): number {
  const naive = axis === 'x' ? (src.x + tgt.x) / 2 : (src.y + tgt.y) / 2;
  const naiveHits = countZShapeHits(src, tgt, naive, axis, obstacles);
  if (naiveHits === 0) return naive;

  // Collect obstacle-edge candidates (just outside each obstacle)
  const margin = OBSTACLE_MARGIN + 5;
  const candidates: number[] = [];
  for (const r of obstacles) {
    if (axis === 'x') {
      candidates.push(r.x - margin, r.x + r.width + margin);
    } else {
      candidates.push(r.y - margin, r.y + r.height + margin);
    }
  }

  // Filter to range between src and tgt
  const lo = axis === 'x' ? Math.min(src.x, tgt.x) : Math.min(src.y, tgt.y);
  const hi = axis === 'x' ? Math.max(src.x, tgt.x) : Math.max(src.y, tgt.y);

  let best = naive;
  let bestHits = naiveHits;
  for (const c of candidates) {
    if (c < lo || c > hi) continue;
    const hits = countZShapeHits(src, tgt, c, axis, obstacles);
    if (hits < bestHits) {
      bestHits = hits;
      best = c;
      if (hits === 0) break;
    }
  }
  return best;
}

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
 * Compute a stub point extending outward from the edge of a layout rectangle.
 * Determines which edge (left/right/top/bottom) the point is on and extends perpendicular.
 */
function computeStub(
  layout: Layout,
  edgePoint: { x: number; y: number },
  stubLength: number
): { x: number; y: number } {
  const w = layout.width ?? 100;
  const h = layout.height ?? 80;

  const onRight = Math.abs(edgePoint.x - (layout.x! + w)) < 1;
  const onLeft = Math.abs(edgePoint.x - layout.x!) < 1;
  const onBottom = Math.abs(edgePoint.y - (layout.y! + h)) < 1;
  const onTop = Math.abs(edgePoint.y - layout.y!) < 1;

  if (onRight) return { x: edgePoint.x + stubLength, y: edgePoint.y };
  if (onLeft) return { x: edgePoint.x - stubLength, y: edgePoint.y };
  if (onBottom) return { x: edgePoint.x, y: edgePoint.y + stubLength };
  if (onTop) return { x: edgePoint.x, y: edgePoint.y - stubLength };

  // Fallback: extend away from center
  const cx = layout.x! + w / 2;
  const cy = layout.y! + h / 2;
  const dx = edgePoint.x - cx;
  const dy = edgePoint.y - cy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: edgePoint.x + Math.sign(dx) * stubLength, y: edgePoint.y };
  }
  return { x: edgePoint.x, y: edgePoint.y + Math.sign(dy) * stubLength };
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
 * Check if a horizontal straight line from src to tgt is clear of inflated obstacles.
 */
function isHorizontalLineClear(src: Waypoint, tgt: Waypoint, obstacles: Rect[]): boolean {
  if (Math.abs(src.y - tgt.y) > 1) return false;
  const y = src.y;
  const minX = Math.min(src.x, tgt.x);
  const maxX = Math.max(src.x, tgt.x);
  for (const r of obstacles) {
    const ir = {
      x: r.x - OBSTACLE_MARGIN,
      y: r.y - OBSTACLE_MARGIN,
      w: r.width + 2 * OBSTACLE_MARGIN,
      h: r.height + 2 * OBSTACLE_MARGIN,
    };
    if (y > ir.y && y < ir.y + ir.h && maxX > ir.x && minX < ir.x + ir.w) {
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

  // Build elementId → poolId map and poolId → Pool lookup
  const elementToPool = new Map<string, string>();
  const poolIds = new Set<string>();
  const poolById = new Map<string, Pool>();
  for (const pool of process.pools) {
    if (pool.id) {
      poolIds.add(pool.id);
      elementToPool.set(pool.id, pool.id);
      poolById.set(pool.id, pool);
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

  // Pool label zones — proportional to pool name length
  const poolLabelObstacles: Rect[] = [];
  for (const pool of process.pools) {
    if (!pool.id) continue;
    const layout = result.elements.get(`Participant_${pool.id}`);
    if (!layout) continue;
    poolLabelObstacles.push({
      x: layout.x!,
      y: layout.y!,
      width: computePoolLabelWidth(pool.name || pool.id || ''),
      height: layout.height!,
    });
  }

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

  // Pre-compute port spread offsets GLOBALLY across all message flows.
  // This ensures elements appearing in multiple pool-pair groups (e.g. an
  // empty pool like crm-user targeted by flows from two different pools)
  // get distinct port positions instead of all landing at center.
  // key = "elementId:top" or "elementId:bottom", value = list of flow IDs
  const portSlots = new Map<string, string[]>();

  // Reserve slots for sequence flow endpoints already on top/bottom edges.
  // This prevents message flow ports from overlapping with sequence flow ports.
  for (const [edgeId, edge] of result.edges) {
    if (!edgeId.startsWith('flow_')) continue; // only sequence flows
    const wp = edge.waypoints;
    if (wp.length < 2) continue;

    // Check first waypoint (source port)
    for (const [elemId, layout] of result.elements) {
      if (elemId.startsWith('Participant_') || elemId.startsWith('Lane_')) continue;
      if (layout.x === undefined || layout.y === undefined) continue;
      const w = layout.width ?? 100;
      const h = layout.height ?? 80;

      for (const pt of [wp[0], wp[wp.length - 1]]) {
        // On top edge?
        if (Math.abs(pt.y - layout.y) < 1 && pt.x >= layout.x && pt.x <= layout.x + w) {
          const key = `${elemId}:top`;
          if (!portSlots.has(key)) portSlots.set(key, []);
          portSlots.get(key)!.push(`__seq_${edgeId}`);
        }
        // On bottom edge?
        if (Math.abs(pt.y - (layout.y + h)) < 1 && pt.x >= layout.x && pt.x <= layout.x + w) {
          const key = `${elemId}:bottom`;
          if (!portSlots.has(key)) portSlots.set(key, []);
          portSlots.get(key)!.push(`__seq_${edgeId}`);
        }
      }
    }
  }

  for (const flow of process.messageFlows) {
    const srcPoolId = elementToPool.get(flow.from);
    const tgtPoolId = elementToPool.get(flow.to);
    if (!srcPoolId || !tgtPoolId || srcPoolId === tgtPoolId) continue;

    const srcPoolLayout = result.elements.get(`Participant_${srcPoolId}`);
    const tgtPoolLayout = result.elements.get(`Participant_${tgtPoolId}`);
    if (!srcPoolLayout || !tgtPoolLayout) continue;

    const srcAbove = srcPoolLayout.y! < tgtPoolLayout.y!;
    const srcSide = srcAbove ? 'bottom' : 'top';
    const tgtSide = srcAbove ? 'top' : 'bottom';

    const srcKey = `${flow.from}:${srcSide}`;
    const tgtKey = `${flow.to}:${tgtSide}`;
    if (!portSlots.has(srcKey)) portSlots.set(srcKey, []);
    portSlots.get(srcKey)!.push(flow.id!);
    if (!portSlots.has(tgtKey)) portSlots.set(tgtKey, []);
    portSlots.get(tgtKey)!.push(flow.id!);
  }

  // Compute X offset from center for a flow's port on an element.
  // Spreads ports across the middle 50% of the element width.
  function portOffsetX(elementId: string, side: string, flowId: string, elementWidth: number): number {
    const key = `${elementId}:${side}`;
    const slots = portSlots.get(key);
    if (!slots || slots.length <= 1) return 0;
    const idx = slots.indexOf(flowId);
    const count = slots.length;
    const spread = elementWidth * 0.5;
    return -spread / 2 + idx * spread / (count - 1);
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
      const { flow } = flowsWithMeta[i];
      const srcLayout = result.elements.get(flow.from)
        ?? (poolIds.has(flow.from) ? result.elements.get(`Participant_${flow.from}`) : undefined);
      const tgtLayout = result.elements.get(flow.to)
        ?? (poolIds.has(flow.to) ? result.elements.get(`Participant_${flow.to}`) : undefined);
      if (!srcLayout || !tgtLayout) continue;

      const srcPool = elementToPool.get(flow.from)!;
      const srcW = srcLayout.width ?? 100;
      const srcH = srcLayout.height ?? 80;
      const tgtW = tgtLayout.width ?? 100;
      const tgtH = tgtLayout.height ?? 80;
      const srcIsInUpperPool = (srcPool === firstSrcPool) === aAbove;

      const srcSide = srcIsInUpperPool ? 'bottom' : 'top';
      const tgtSide = srcIsInUpperPool ? 'top' : 'bottom';
      const srcCenterX = srcLayout.x! + srcW / 2 + portOffsetX(flow.from, srcSide, flow.id!, srcW);
      const tgtCenterX = tgtLayout.x! + tgtW / 2 + portOffsetX(flow.to, tgtSide, flow.id!, tgtW);

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

      // 2. Adjacent pools: exit pool vertically → bend in gap → enter pool vertically
      if (!waypoints && adjacent) {
        const srcPoolId = elementToPool.get(flow.from)!;
        const tgtPoolId = elementToPool.get(flow.to)!;
        const srcPoolObj = poolById.get(srcPoolId);
        const tgtPoolObj = poolById.get(tgtPoolId);

        // Cap stub length to gap/3 so stubs from both pools don't overlap
        const gapStub = Math.min(EXIT_STUB, Math.max(gapHeight / 3, 5));

        // Pool boundary Y at the gap edge
        const srcPoolEdgeY = srcIsInUpperPool ? gapTop : gapBottom;
        const tgtPoolEdgeY = srcIsInUpperPool ? gapBottom : gapTop;

        // Pool-scoped obstacles for vertical escape/entry
        const srcPoolObstacles = srcPoolObj
          ? collectPoolObstacles(srcPoolObj, result, new Set([flow.from]), containerIds)
          : [];
        const tgtPoolObstacles = tgtPoolObj
          ? collectPoolObstacles(tgtPoolObj, result, new Set([flow.to]), containerIds)
          : [];

        // Vertical escape: source element → source pool edge
        const srcBoundary: Waypoint = { x: srcCenterX, y: srcPoolEdgeY };
        let escapeWps: Waypoint[];
        if (isVerticalLineClear(src, srcBoundary, srcPoolObstacles)) {
          escapeWps = [src];
        } else {
          const stubDir = srcIsInUpperPool ? 1 : -1;
          const srcStub: Waypoint = { x: srcCenterX, y: srcY + stubDir * gapStub };
          const edgeStub: Waypoint = { x: srcCenterX, y: srcPoolEdgeY - stubDir * gapStub };
          const path = findOrthogonalPath(srcStub, edgeStub, srcPoolObstacles, routedSegments, []);
          escapeWps = path ? simplifyWaypoints([src, ...path]) : [src];
        }

        // Vertical entry: target pool edge → target element
        let entryWps: Waypoint[];
        const tgtBoundary: Waypoint = { x: tgtCenterX, y: tgtPoolEdgeY };
        if (isVerticalLineClear(tgtBoundary, tgt, tgtPoolObstacles)) {
          entryWps = [tgt];
        } else {
          const stubDir = srcIsInUpperPool ? 1 : -1;
          const edgeStub: Waypoint = { x: tgtCenterX, y: tgtPoolEdgeY + stubDir * gapStub };
          const tgtStub: Waypoint = { x: tgtCenterX, y: tgtY - stubDir * gapStub };
          const path = findOrthogonalPath(edgeStub, tgtStub, tgtPoolObstacles, routedSegments, []);
          entryWps = path ? simplifyWaypoints([...path, tgt]) : [tgt];
        }

        // Gap routing: connect escape end to entry start via Z-shape in the gap
        const escapeEndX = escapeWps[escapeWps.length - 1].x;
        const entryStartX = entryWps[0].x;

        if (Math.abs(escapeEndX - entryStartX) < 1) {
          // Same X: straight vertical through gap
          waypoints = simplifyWaypoints(dedup([
            ...escapeWps,
            { x: escapeEndX, y: srcPoolEdgeY },
            { x: entryStartX, y: tgtPoolEdgeY },
            ...entryWps,
          ]));
        } else {
          // Z-shape in gap with flow spacing
          const gapY = gapTop + (i + 1) * gapHeight / (count + 1);
          waypoints = simplifyWaypoints(dedup([
            ...escapeWps,
            { x: escapeEndX, y: srcPoolEdgeY },
            { x: escapeEndX, y: gapY },
            { x: entryStartX, y: gapY },
            { x: entryStartX, y: tgtPoolEdgeY },
            ...entryWps,
          ]));
        }
      }

      // 3. Non-adjacent: A* full path or U-shape fallback
      if (!waypoints) {
        const stubDir = srcIsInUpperPool ? 1 : -1;
        const srcStub: Waypoint = { x: srcCenterX, y: srcY + stubDir * EXIT_STUB };
        const tgtStub: Waypoint = { x: tgtCenterX, y: tgtY - stubDir * EXIT_STUB };
        const astarPath = findOrthogonalPath(srcStub, tgtStub, obstacles, routedSegments, gridHints);
        if (astarPath) {
          waypoints = simplifyWaypoints([src, ...astarPath, tgt]);
        }

        if (!waypoints) {
          // U-shape around the right side
          const srcPLayout = result.elements.get(`Participant_${elementToPool.get(flow.from)}`)!;
          const tgtPLayout = result.elements.get(`Participant_${elementToPool.get(flow.to)}`)!;

          const POOL_EDGE_MARGIN = 15;
          const tgtEdgeY = srcIsInUpperPool
            ? tgtPLayout.y! - POOL_EDGE_MARGIN
            : tgtPLayout.y! + tgtPLayout.height! + POOL_EDGE_MARGIN;

          const routeX = maxRight + 40 + i * 20;
          const srcEdge = computeEdgePoint(srcLayout, routeX, tgtEdgeY);
          const isHorizontalExit = Math.abs(srcEdge.y - (srcLayout.y! + srcH / 2)) < 1;

          if (isHorizontalExit) {
            waypoints = dedup([
              srcEdge,
              { x: routeX, y: srcEdge.y },
              { x: routeX, y: tgtEdgeY },
              { x: tgtCenterX, y: tgtEdgeY },
              { x: tgtCenterX, y: tgtY },
            ]);
          } else {
            const srcEdgeY = srcIsInUpperPool
              ? srcPLayout.y! + srcPLayout.height! + POOL_EDGE_MARGIN
              : srcPLayout.y! - POOL_EDGE_MARGIN;
            waypoints = dedup([
              srcEdge,
              { x: srcEdge.x, y: srcEdgeY },
              { x: routeX, y: srcEdgeY },
              { x: routeX, y: tgtEdgeY },
              { x: tgtCenterX, y: tgtEdgeY },
              { x: tgtCenterX, y: tgtY },
            ]);
          }
        }
      }

      if (!waypoints) continue;

      // Track routed segments for subsequent flows
      routedSegments.push(...waypointsToSegments(waypoints));

      if (flow.id) {
        result.edges.set(flow.id, { waypoints });
      }
    }
  }
}

/**
 * Compute fan-out edge points for a node with multiple peers (e.g. gateway outputs).
 *
 * For each peer, picks the best exit/entry edge based on direction:
 * - Primarily horizontal peers (dx > dy, aspect-normalized) → left/right edge
 * - Primarily vertical peers (dy > dx, aspect-normalized) → top/bottom edge
 *
 * When multiple peers share the same edge, their ports are spread evenly
 * along that edge to prevent overlap.
 */
function computeFanOut(
  nodeLayout: Layout,
  peers: Array<{ flowId: string; cx: number; cy: number }>
): Map<string, { x: number; y: number }> {
  const overrides = new Map<string, { x: number; y: number }>();
  if (peers.length < 2) return overrides;

  const w = nodeLayout.width ?? 100;
  const h = nodeLayout.height ?? 80;
  const nodeCx = nodeLayout.x! + w / 2;
  const nodeCy = nodeLayout.y! + h / 2;

  // Check Y-span — if peers are clustered at similar Y, skip fan-out
  const ys = peers.map(p => p.cy);
  const ySpan = Math.max(...ys) - Math.min(...ys);
  if (ySpan < h / 2) return overrides;

  // Assign each peer to a cardinal edge based on aspect-normalized direction
  type Edge = 'top' | 'bottom' | 'left' | 'right';
  const edgeGroups = new Map<Edge, typeof peers>();

  for (const peer of peers) {
    const dx = peer.cx - nodeCx;
    const dy = peer.cy - nodeCy;
    // Normalize by half-dimensions so a square node has equal bias
    const normDx = Math.abs(dx) / (w / 2);
    const normDy = Math.abs(dy) / (h / 2);

    let edge: Edge;
    if (normDx >= normDy) {
      edge = dx >= 0 ? 'right' : 'left';
    } else {
      edge = dy >= 0 ? 'bottom' : 'top';
    }

    const group = edgeGroups.get(edge) ?? [];
    group.push(peer);
    edgeGroups.set(edge, group);
  }

  // When all peers land on a single horizontal edge and Y-spread is significant,
  // redistribute extreme peers to top/bottom for BPMN-style gateway fan-out.
  if (edgeGroups.size === 1) {
    const [onlyEdge, group] = [...edgeGroups.entries()][0];
    if (onlyEdge === 'left' || onlyEdge === 'right') {
      const sorted = [...group].sort((a, b) => a.cy - b.cy);
      const topPeer = sorted[0];
      const botPeer = sorted[sorted.length - 1];

      if (topPeer.cy < nodeCy && sorted.length > 1) {
        group.splice(group.indexOf(topPeer), 1);
        const topGroup = edgeGroups.get('top') ?? [];
        topGroup.push(topPeer);
        edgeGroups.set('top', topGroup);
      }
      if (botPeer.cy > nodeCy && group.length > 0) {
        group.splice(group.indexOf(botPeer), 1);
        const botGroup = edgeGroups.get('bottom') ?? [];
        botGroup.push(botPeer);
        edgeGroups.set('bottom', botGroup);
      }
      // Clean up empty group
      if (group.length === 0) edgeGroups.delete(onlyEdge);
    }
  }

  // For each edge, spread ports evenly along the edge dimension
  for (const [edge, group] of edgeGroups) {
    if (edge === 'top' || edge === 'bottom') {
      // Sort by X for left→right spread
      group.sort((a, b) => a.cx - b.cx);
      const edgeY = edge === 'top' ? nodeLayout.y! : nodeLayout.y! + h;
      for (let i = 0; i < group.length; i++) {
        const t = group.length > 1 ? (i + 1) / (group.length + 1) : 0.5;
        overrides.set(group[i].flowId, { x: nodeLayout.x! + t * w, y: edgeY });
      }
    } else {
      // Sort by Y for top→bottom spread
      group.sort((a, b) => a.cy - b.cy);
      const edgeX = edge === 'right' ? nodeLayout.x! + w : nodeLayout.x!;
      for (let i = 0; i < group.length; i++) {
        const t = group.length > 1 ? (i + 1) / (group.length + 1) : 0.5;
        overrides.set(group[i].flowId, { x: edgeX, y: nodeLayout.y! + t * h });
      }
    }
  }

  return overrides;
}

/**
 * Collect obstacle rectangles from elements within a specific pool.
 * Excludes containers (lanes) and specific element IDs.
 * Also collects boundary events attached to tasks/subprocesses.
 */
function collectPoolObstacles(
  pool: Pool,
  result: LayoutResult,
  excludeIds: Set<string>,
  containerIds: Set<string>
): Rect[] {
  const obstacles: Rect[] = [];
  const { elements } = collectFromPool(pool);

  for (const elem of elements) {
    if (!elem.id || excludeIds.has(elem.id) || containerIds.has(elem.id)) continue;
    const layout = result.elements.get(elem.id);
    if (!layout || layout.x === undefined || layout.y === undefined) continue;
    obstacles.push({
      x: layout.x,
      y: layout.y,
      width: layout.width ?? 100,
      height: layout.height ?? 80,
    });

    // Boundary events attached to this element
    if ('boundaryEvents' in elem && elem.boundaryEvents) {
      for (const be of elem.boundaryEvents) {
        if (!be.id || excludeIds.has(be.id)) continue;
        const beLayout = result.elements.get(be.id);
        if (!beLayout || beLayout.x === undefined || beLayout.y === undefined) continue;
        obstacles.push({
          x: beLayout.x,
          y: beLayout.y,
          width: beLayout.width ?? 36,
          height: beLayout.height ?? 36,
        });
      }
    }
  }

  return obstacles;
}

/**
 * Re-route pool-level sequence flows using final node positions.
 * Cross-lane inline flows (`->`) are stored on pool.sequenceFlows,
 * whose waypoints are not adjusted during lane stacking.
 *
 * Strategy:
 * 1. Straight line — if src/tgt share Y and path is clear
 * 2. A* pathfinding — obstacle + overlap avoidance
 * 3. Fallback — Z-shape
 */
export function routePoolSequenceFlows(pools: Pool[], result: LayoutResult): void {
  for (const pool of pools) {
    if (!pool.sequenceFlows) continue;

    // Container IDs from lanes (pool Participant_ doesn't exist yet)
    const containerIds = new Set<string>();
    if (pool.lanes) {
      for (const lane of pool.lanes) {
        if (lane.id) containerIds.add(lane.id);
      }
    }

    // Grid hints from lane boundary Y coordinates
    const gridHints: Waypoint[] = [];
    if (pool.lanes) {
      for (const lane of pool.lanes) {
        if (!lane.id) continue;
        const laneLayout = result.elements.get(lane.id);
        if (!laneLayout || laneLayout.y === undefined) continue;
        gridHints.push({ x: laneLayout.x!, y: laneLayout.y });
        gridHints.push({
          x: laneLayout.x! + (laneLayout.width ?? 0),
          y: laneLayout.y + (laneLayout.height ?? 0),
        });
      }
    }

    // Sort flows by source X for deterministic routing order
    const sortedFlows = pool.sequenceFlows
      .filter(flow => flow.id && flow.from && flow.to)
      .sort((a, b) => {
        const aLayout = result.elements.get(a.from!);
        const bLayout = result.elements.get(b.from!);
        return (aLayout?.x ?? 0) - (bLayout?.x ?? 0);
      });

    // Remove stale ELK-generated edges for this pool's flows before collecting
    // existing segments — these are about to be re-routed and would otherwise
    // block the A* router with phantom obstacles.
    const poolFlowIds = new Set(sortedFlows.map(f => f.id!));
    for (const fid of poolFlowIds) {
      result.edges.delete(fid);
    }

    // Track routed segments incrementally for overlap prevention
    const routedSegments = collectExistingSegments(result);

    // Pre-compute fan-out overrides for nodes with multiple outgoing/incoming flows
    const srcExitOverrides = new Map<string, { x: number; y: number }>();
    const tgtEntryOverrides = new Map<string, { x: number; y: number }>();

    // Group by source → compute exit fan-out
    const bySource = new Map<string, Array<{ flowId: string; cx: number; cy: number }>>();
    for (const flow of sortedFlows) {
      const tgtLayout = result.elements.get(flow.to!);
      if (!tgtLayout) continue;
      const tgtW = tgtLayout.width ?? 100;
      const tgtH = tgtLayout.height ?? 80;
      const peers = bySource.get(flow.from!) ?? [];
      peers.push({ flowId: flow.id!, cx: tgtLayout.x! + tgtW / 2, cy: tgtLayout.y! + tgtH / 2 });
      bySource.set(flow.from!, peers);
    }
    for (const [srcId, peers] of bySource) {
      const srcLayout = result.elements.get(srcId);
      if (!srcLayout) continue;
      for (const [flowId, pt] of computeFanOut(srcLayout, peers)) {
        srcExitOverrides.set(flowId, pt);
      }
    }

    // Group by target → compute entry fan-out
    const byTarget = new Map<string, Array<{ flowId: string; cx: number; cy: number }>>();
    for (const flow of sortedFlows) {
      const srcLayout = result.elements.get(flow.from!);
      if (!srcLayout) continue;
      const srcW = srcLayout.width ?? 100;
      const srcH = srcLayout.height ?? 80;
      const peers = byTarget.get(flow.to!) ?? [];
      peers.push({ flowId: flow.id!, cx: srcLayout.x! + srcW / 2, cy: srcLayout.y! + srcH / 2 });
      byTarget.set(flow.to!, peers);
    }
    for (const [tgtId, peers] of byTarget) {
      const tgtLayout = result.elements.get(tgtId);
      if (!tgtLayout) continue;
      for (const [flowId, pt] of computeFanOut(tgtLayout, peers)) {
        tgtEntryOverrides.set(flowId, pt);
      }
    }

    for (const flow of sortedFlows) {
      const srcLayout = result.elements.get(flow.from!);
      const tgtLayout = result.elements.get(flow.to!);
      if (!srcLayout || !tgtLayout) continue;

      const srcW = srcLayout.width ?? 100;
      const srcH = srcLayout.height ?? 80;
      const tgtW = tgtLayout.width ?? 100;
      const tgtH = tgtLayout.height ?? 80;

      // Smart edge selection: use fan-out override or pick best cardinal edge
      const srcCx = srcLayout.x! + srcW / 2;
      const srcCy = srcLayout.y! + srcH / 2;
      const tgtCx = tgtLayout.x! + tgtW / 2;
      const tgtCy = tgtLayout.y! + tgtH / 2;

      const srcEdge = srcExitOverrides.get(flow.id!) ?? computeEdgePoint(srcLayout, tgtCx, tgtCy);
      const tgtEdge = tgtEntryOverrides.get(flow.id!) ?? computeEdgePoint(tgtLayout, srcCx, srcCy);

      const src: Waypoint = { x: srcEdge.x, y: srcEdge.y };
      const tgt: Waypoint = { x: tgtEdge.x, y: tgtEdge.y };

      // Collect obstacles scoped to this pool
      const excludeIds = new Set<string>([flow.from!, flow.to!]);
      const obstacles = collectPoolObstacles(pool, result, excludeIds, containerIds);

      let waypoints: Waypoint[] | null = null;

      // 1. Straight line — same X (vertical) or same Y (horizontal), path clear
      if (isVerticalLineClear(src, tgt, obstacles)) {
        waypoints = [src, tgt];
      } else if (isHorizontalLineClear(src, tgt, obstacles)) {
        waypoints = [src, tgt];
      }

      // 2. A* pathfinding with directional stubs
      if (!waypoints) {
        const dist = Math.sqrt((tgt.x - src.x) ** 2 + (tgt.y - src.y) ** 2);
        const stubLen = dist < 2 * EXIT_STUB ? Math.max(dist / 4, 5) : EXIT_STUB;

        const srcStub = computeStub(srcLayout, src, stubLen);
        const tgtStub = computeStub(tgtLayout, tgt, stubLen);

        // Add src/tgt elements as obstacles for A* — the stub points clear
        // the inflated boundaries, but without this A* can route back through
        // the source/target nodes (causing inward bends at gateway exits).
        const astarObstacles = [
          ...obstacles,
          { x: srcLayout.x!, y: srcLayout.y!, width: srcW, height: srcH },
          { x: tgtLayout.x!, y: tgtLayout.y!, width: tgtW, height: tgtH },
        ];

        const astarPath = findOrthogonalPath(
          { x: srcStub.x, y: srcStub.y },
          { x: tgtStub.x, y: tgtStub.y },
          astarObstacles,
          routedSegments,
          gridHints
        );
        if (astarPath) {
          waypoints = simplifyWaypoints([src, ...astarPath, tgt]);
        }
      }

      // 3. Directional Z-shape fallback
      if (!waypoints) {
        const srcIsHExit = Math.abs(src.y - srcCy) < 1;
        const tgtIsHEntry = Math.abs(tgt.y - tgtCy) < 1;

        if (srcIsHExit && tgtIsHEntry) {
          // Both horizontal: H→V→H Z-shape
          if (Math.abs(src.y - tgt.y) < 1) {
            waypoints = [src, tgt];
          } else {
            const midX = findBestZMid(src, tgt, 'x', obstacles);
            waypoints = [src, { x: midX, y: src.y }, { x: midX, y: tgt.y }, tgt];
          }
        } else if (!srcIsHExit && !tgtIsHEntry) {
          // Both vertical: V→H→V Z-shape
          if (Math.abs(src.x - tgt.x) < 1) {
            waypoints = [src, tgt];
          } else {
            const midY = findBestZMid(src, tgt, 'y', obstacles);
            waypoints = [src, { x: src.x, y: midY }, { x: tgt.x, y: midY }, tgt];
          }
        } else if (srcIsHExit) {
          // H exit → V entry: L-shape
          waypoints = [src, { x: tgt.x, y: src.y }, tgt];
        } else {
          // V exit → H entry: L-shape
          waypoints = [src, { x: src.x, y: tgt.y }, tgt];
        }
      }

      // Track routed segments for subsequent flows
      routedSegments.push(...waypointsToSegments(waypoints));

      result.edges.set(flow.id!, { waypoints });
    }
  }
}
