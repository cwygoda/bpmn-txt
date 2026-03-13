import type { Waypoint } from '../ast/types.js';
import { OBSTACLE_MARGIN, BEND_PENALTY, PARALLEL_TOLERANCE } from './constants.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type Dir = 'H' | 'V' | null;

/** Inflate rect by margin on all sides. */
function inflate(r: Rect, margin: number): Rect {
  return {
    x: r.x - margin,
    y: r.y - margin,
    width: r.width + 2 * margin,
    height: r.height + 2 * margin,
  };
}

/** Check if point is strictly inside a rect. */
function pointInsideRect(px: number, py: number, r: Rect): boolean {
  return px > r.x && px < r.x + r.width && py > r.y && py < r.y + r.height;
}

/** Check if an edge between two grid nodes crosses through any obstacle. */
function edgeCrossesObstacle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  obstacles: Rect[]
): boolean {
  // Only orthogonal edges — check midpoint and intermediate points
  if (Math.abs(ax - bx) < 0.5) {
    // Vertical edge
    const x = ax;
    const minY = Math.min(ay, by);
    const maxY = Math.max(ay, by);
    for (const r of obstacles) {
      if (x > r.x && x < r.x + r.width && maxY > r.y && minY < r.y + r.height) {
        return true;
      }
    }
  } else {
    // Horizontal edge
    const y = ay;
    const minX = Math.min(ax, bx);
    const maxX = Math.max(ax, bx);
    for (const r of obstacles) {
      if (y > r.y && y < r.y + r.height && maxX > r.x && minX < r.x + r.width) {
        return true;
      }
    }
  }
  return false;
}

/** Classify a segment as H(orizontal), V(ertical), or null (point). */
function segDir(s: Segment): Dir {
  if (Math.abs(s.y1 - s.y2) < 0.5) return 'H';
  if (Math.abs(s.x1 - s.x2) < 0.5) return 'V';
  return null;
}

/** Check if two segments overlap in parallel (same orientation, close, overlapping range). */
function segmentsOverlapParallel(a: Segment, b: Segment, tol: number): boolean {
  const da = segDir(a);
  const db = segDir(b);
  if (!da || !db || da !== db) return false;

  if (da === 'H') {
    if (Math.abs(a.y1 - b.y1) > tol) return false;
    const aMin = Math.min(a.x1, a.x2);
    const aMax = Math.max(a.x1, a.x2);
    const bMin = Math.min(b.x1, b.x2);
    const bMax = Math.max(b.x1, b.x2);
    return aMax > bMin && bMax > aMin;
  } else {
    if (Math.abs(a.x1 - b.x1) > tol) return false;
    const aMin = Math.min(a.y1, a.y2);
    const aMax = Math.max(a.y1, a.y2);
    const bMin = Math.min(b.y1, b.y2);
    const bMax = Math.max(b.y1, b.y2);
    return aMax > bMin && bMax > aMin;
  }
}

/** Check if a candidate edge overlaps any existing segment in parallel. */
function edgeOverlapsExisting(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  existing: Segment[],
  tol: number
): boolean {
  const candidate: Segment = { x1: ax, y1: ay, x2: bx, y2: by };
  for (const seg of existing) {
    if (segmentsOverlapParallel(candidate, seg, tol)) return true;
  }
  return false;
}

// ─── Sparse grid A* ──────────────────────────────────────────────────────

interface GridNode {
  x: number;
  y: number;
  blocked: boolean;
}

interface AStarNode {
  idx: number;
  g: number;
  f: number;
  parent: number;
  dir: Dir;
}

/** Build sparse grid from obstacle edges + source/target coordinates + hints. */
function buildGrid(
  obstacles: Rect[],
  src: Waypoint,
  tgt: Waypoint,
  hints: Waypoint[]
): { nodes: GridNode[]; xs: number[]; ys: number[] } {
  const xSet = new Set<number>();
  const ySet = new Set<number>();

  xSet.add(src.x);
  xSet.add(tgt.x);
  ySet.add(src.y);
  ySet.add(tgt.y);

  for (const h of hints) {
    xSet.add(h.x);
    ySet.add(h.y);
  }

  for (const r of obstacles) {
    xSet.add(r.x);
    xSet.add(r.x + r.width);
    ySet.add(r.y);
    ySet.add(r.y + r.height);
    // Add midpoints for routing options through gaps
    xSet.add(r.x + r.width / 2);
    ySet.add(r.y + r.height / 2);
  }

  const xs = [...xSet].sort((a, b) => a - b);
  const ys = [...ySet].sort((a, b) => a - b);

  const nodes: GridNode[] = [];
  for (const y of ys) {
    for (const x of xs) {
      let blocked = false;
      for (const r of obstacles) {
        if (pointInsideRect(x, y, r)) {
          blocked = true;
          break;
        }
      }
      nodes.push({ x, y, blocked });
    }
  }

  return { nodes, xs, ys };
}

/** Binary search for exact value in sorted array. Returns index or -1. */
function bsearch(arr: number[], val: number): number {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] === val) return mid;
    if (arr[mid] < val) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

/** Find index in grid for coordinate pair. */
function coordToIdx(x: number, y: number, xs: number[], ys: number[]): number {
  const xi = bsearch(xs, x);
  const yi = bsearch(ys, y);
  if (xi < 0 || yi < 0) return -1;
  return yi * xs.length + xi;
}

/**
 * A* pathfinder on sparse orthogonal grid.
 * Returns waypoints or null if no path found.
 */
function astar(
  nodes: GridNode[],
  xs: number[],
  ys: number[],
  startIdx: number,
  endIdx: number,
  obstacles: Rect[],
  existingSegments: Segment[]
): Waypoint[] | null {
  const cols = xs.length;
  const n = nodes.length;

  if (startIdx < 0 || endIdx < 0 || startIdx >= n || endIdx >= n) return null;

  const endX = nodes[endIdx].x;
  const endY = nodes[endIdx].y;

  function heuristic(idx: number): number {
    return Math.abs(nodes[idx].x - endX) + Math.abs(nodes[idx].y - endY);
  }

  // Neighbors: up/down/left/right in the sparse grid
  function* neighbors(idx: number): Generator<number> {
    const xi = idx % cols;
    const yi = Math.floor(idx / cols);
    if (xi > 0) yield idx - 1;         // left
    if (xi < cols - 1) yield idx + 1;   // right
    if (yi > 0) yield idx - cols;       // up
    if (yi + 1 < ys.length) yield idx + cols; // down
  }

  // Binary min-heap priority queue — O(log n) insert/extract vs O(n) splice
  const heap: AStarNode[] = [];
  function heapPush(node: AStarNode) {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].f <= heap[i].f) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  }
  function heapPop(): AStarNode {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let smallest = i;
        const l = 2 * i + 1, r = 2 * i + 2;
        if (l < heap.length && heap[l].f < heap[smallest].f) smallest = l;
        if (r < heap.length && heap[r].f < heap[smallest].f) smallest = r;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  }

  const best = new Float64Array(n).fill(Infinity);

  const startNode: AStarNode = {
    idx: startIdx,
    g: 0,
    f: heuristic(startIdx),
    parent: -1,
    dir: null,
  };
  heapPush(startNode);
  best[startIdx] = 0;

  // Track settled nodes with their parent chain
  const settled = new Map<number, AStarNode>();

  while (heap.length > 0) {
    const current = heapPop();

    if (settled.has(current.idx)) continue;
    settled.set(current.idx, current);

    if (current.idx === endIdx) {
      // Reconstruct path
      const path: Waypoint[] = [];
      let node: AStarNode | undefined = current;
      while (node) {
        path.push({ x: nodes[node.idx].x, y: nodes[node.idx].y });
        node = node.parent >= 0 ? settled.get(node.parent) : undefined;
      }
      path.reverse();
      return path;
    }

    for (const nIdx of neighbors(current.idx)) {
      if (nodes[nIdx].blocked && nIdx !== endIdx) continue;

      const nx = nodes[nIdx].x;
      const ny = nodes[nIdx].y;
      const cx = nodes[current.idx].x;
      const cy = nodes[current.idx].y;

      // Check if edge crosses an obstacle
      if (edgeCrossesObstacle(cx, cy, nx, ny, obstacles)) continue;

      // Check parallel overlap with existing segments
      if (edgeOverlapsExisting(cx, cy, nx, ny, existingSegments, PARALLEL_TOLERANCE)) continue;

      const dist = Math.abs(nx - cx) + Math.abs(ny - cy);
      const moveDir: Dir = Math.abs(ny - cy) < 0.5 ? 'H' : 'V';
      const bend = current.dir !== null && current.dir !== moveDir ? BEND_PENALTY : 0;
      const tentG = current.g + dist + bend;

      if (tentG < best[nIdx]) {
        best[nIdx] = tentG;
        heapPush({
          idx: nIdx,
          g: tentG,
          f: tentG + heuristic(nIdx),
          parent: current.idx,
          dir: moveDir,
        });
      }
    }
  }

  return null; // no path
}

/** Merge collinear consecutive waypoints. */
function simplifyPath(path: Waypoint[]): Waypoint[] {
  if (path.length <= 2) return path;

  const out: Waypoint[] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = out[out.length - 1];
    const curr = path[i];
    const next = path[i + 1];

    const sameX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const sameY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;

    // Skip if collinear
    if (sameX || sameY) continue;
    out.push(curr);
  }
  out.push(path[path.length - 1]);
  return out;
}

/**
 * Find an obstacle-avoiding orthogonal path from src to tgt.
 *
 * @param src        Start waypoint (on element boundary)
 * @param tgt        End waypoint (on element boundary)
 * @param obstacles  Bounding rects to avoid (inflated internally)
 * @param existing   Already-routed flow segments (avoid parallel overlap)
 * @param gridHints  Extra coordinates to include in the sparse grid
 * @returns          Simplified orthogonal waypoints
 */
export function findOrthogonalPath(
  src: Waypoint,
  tgt: Waypoint,
  obstacles: Rect[],
  existing: Segment[],
  gridHints: Waypoint[] = []
): Waypoint[] | null {
  // Inflate obstacles
  const inflated = obstacles.map(r => inflate(r, OBSTACLE_MARGIN));

  const { nodes, xs, ys } = buildGrid(inflated, src, tgt, gridHints);
  const startIdx = coordToIdx(src.x, src.y, xs, ys);
  const endIdx = coordToIdx(tgt.x, tgt.y, xs, ys);

  const path = astar(nodes, xs, ys, startIdx, endIdx, inflated, existing);
  if (!path) return null;

  return simplifyPath(path);
}

/** Extract segments from a list of waypoints. */
export function waypointsToSegments(wps: Waypoint[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 1; i < wps.length; i++) {
    segs.push({ x1: wps[i - 1].x, y1: wps[i - 1].y, x2: wps[i].x, y2: wps[i].y });
  }
  return segs;
}
