import type { Process, Pool, MessageFlow, Waypoint } from '../ast/types.js';
import type { LayoutResult } from './layout.js';
import { collectFromPool } from './utils.js';

/**
 * Route message flows with orthogonal Z-shape waypoints.
 * Called after pool layout + container bounds are computed.
 */
export function routeMessageFlows(process: Process, result: LayoutResult): void {
  if (!process.messageFlows || process.messageFlows.length === 0) return;
  if (!process.pools || process.pools.length === 0) return;

  // Build elementId → poolId map
  const elementToPool = new Map<string, string>();
  for (const pool of process.pools) {
    const { elements } = collectFromPool(pool);
    for (const elem of elements) {
      if (elem.id && pool.id) elementToPool.set(elem.id, pool.id);
    }
  }

  // Group flows by pool pair (same gap → same crossing-minimization group)
  const groups = new Map<string, MessageFlow[]>();
  for (const flow of process.messageFlows) {
    const srcPool = elementToPool.get(flow.from);
    const tgtPool = elementToPool.get(flow.to);
    if (!srcPool || !tgtPool || srcPool === tgtPool) continue;

    // Canonical key so A→B and B→A share the same gap
    const key = [srcPool, tgtPool].sort().join(':');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(flow);
  }

  // Route each group
  for (const [, flows] of groups) {
    // Resolve pool layouts from first flow
    const firstSrcPool = elementToPool.get(flows[0].from)!;
    const firstTgtPool = elementToPool.get(flows[0].to)!;
    const poolALayout = result.elements.get(`Participant_${firstSrcPool}`);
    const poolBLayout = result.elements.get(`Participant_${firstTgtPool}`);
    if (!poolALayout || !poolBLayout) continue;

    // Determine which pool is above
    const aBottom = poolALayout.y! + poolALayout.height!;
    const bBottom = poolBLayout.y! + poolBLayout.height!;
    const aAbove = poolALayout.y! < poolBLayout.y!;
    const gapTop = aAbove ? aBottom : bBottom;
    const gapBottom = aAbove ? poolBLayout.y! : poolALayout.y!;
    const gapHeight = Math.max(gapBottom - gapTop, 0);

    // Sort by average X for crossing minimization
    const flowsWithMeta = flows.map(flow => {
      const srcLayout = result.elements.get(flow.from);
      const tgtLayout = result.elements.get(flow.to);
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
      const srcLayout = result.elements.get(flow.from);
      const tgtLayout = result.elements.get(flow.to);
      if (!srcLayout || !tgtLayout) continue;

      const srcPool = elementToPool.get(flow.from)!;
      const srcH = srcLayout.height ?? 80;
      const tgtH = tgtLayout.height ?? 80;
      // Source is in the upper pool if: same pool as first flow's source AND that pool is above,
      // or different pool and that pool is below (reversed flow direction)
      const srcIsInUpperPool = (srcPool === firstSrcPool) === aAbove;

      // Exit bottom / enter top (flip when source is below target)
      const srcY = srcIsInUpperPool ? srcLayout.y! + srcH : srcLayout.y!;
      const tgtY = srcIsInUpperPool ? tgtLayout.y! : tgtLayout.y! + tgtH;

      const waypoints: Waypoint[] = [];
      if (Math.abs(srcCenterX - tgtCenterX) < 1) {
        // Vertically aligned → straight line
        waypoints.push({ x: srcCenterX, y: srcY });
        waypoints.push({ x: tgtCenterX, y: tgtY });
      } else {
        // Z-shape with distributed midY
        const midY = gapTop + (i + 1) * gapHeight / (count + 1);
        waypoints.push({ x: srcCenterX, y: srcY });
        waypoints.push({ x: srcCenterX, y: midY });
        waypoints.push({ x: tgtCenterX, y: midY });
        waypoints.push({ x: tgtCenterX, y: tgtY });
      }

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
