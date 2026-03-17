// Default sizes for BPMN elements (BPMN 2.0 standard sizes)
export const ELEMENT_SIZES: Record<string, { width: number; height: number }> = {
  startEvent: { width: 36, height: 36 },
  endEvent: { width: 36, height: 36 },
  intermediateEvent: { width: 36, height: 36 },
  boundaryEvent: { width: 36, height: 36 },
  task: { width: 100, height: 80 },
  subprocess: { width: 200, height: 150 },
  callActivity: { width: 100, height: 80 },
  gateway: { width: 50, height: 50 },
  dataObject: { width: 36, height: 50 },
  dataStore: { width: 50, height: 50 },
  pool: { width: 600, height: 200 },
  collapsedPool: { width: 600, height: 60 },
  lane: { width: 600, height: 150 },
};

// Fallback element dimensions (task-sized) when type lookup misses
export const DEFAULT_ELEMENT_WIDTH = 100;
export const DEFAULT_ELEMENT_HEIGHT = 80;

// ─── Pool & Container ────────────────────────────────────────────────────

/** Pool label zone (vertical band on left edge of horizontal pools) */
export const POOL_LABEL_WIDTH = 30;

/** Vertical gap between consecutive pools */
export const POOL_GAP = 80;

/** Padding around pool/lane contents */
export const CONTAINER_PADDING = 50;

/** Minimum spacing for message flows between pools */
export const MIN_FLOW_SPACING = 20;

/**
 * Compute pool label width proportional to name length.
 * Returns at least POOL_LABEL_WIDTH, capped at 50px.
 */
const POOL_LABEL_MIN_WIDTH = 20;
const POOL_LABEL_CHAR_WIDTH = 0.8;
const POOL_LABEL_MAX_WIDTH = 50;

export function computePoolLabelWidth(name: string): number {
  return Math.max(
    POOL_LABEL_WIDTH,
    Math.min(POOL_LABEL_MAX_WIDTH, POOL_LABEL_MIN_WIDTH + name.length * POOL_LABEL_CHAR_WIDTH),
  );
}

// ─── ELK Layout ──────────────────────────────────────────────────────────

/** Edge-to-node spacing in ELK layout */
export const ELK_EDGE_NODE_SPACING = 20;

/** Subprocess internal padding [top, left, bottom, right] */
export const ELK_SUBPROCESS_PADDING = '[top=40,left=15,bottom=15,right=15]';

// ─── Routing ─────────────────────────────────────────────────────────────

/** Obstacle-aware routing: buffer around obstacles */
export const OBSTACLE_MARGIN = 15;

/** A* cost penalty for each direction change */
export const BEND_PENALTY = 50;

/** Tolerance for detecting overlapping parallel segments */
export const PARALLEL_TOLERANCE = 2;

/** Distance of perpendicular stub from element edge before A* routing */
export const EXIT_STUB = 20;

/** Extra margin beyond OBSTACLE_MARGIN for Z-shape obstacle-edge candidates */
export const ZSHAPE_EXTRA_MARGIN = 5;

/** Fraction of element width used for port spreading (centered) */
export const PORT_SPREAD_RATIO = 0.5;

/** Margin from pool edge for U-shape fallback routing */
export const POOL_EDGE_MARGIN = 30;

/** Base horizontal offset for U-shape routing (beyond rightmost pool edge) */
export const USHAPE_BASE_OFFSET = 40;

/** Per-flow horizontal increment for U-shape routing */
export const USHAPE_FLOW_INCREMENT = 20;

/** Floating-point tolerance for collinearity / edge detection */
export const SNAP_TOLERANCE = 0.5;

/** Floating-point tolerance for deduplicating nearby waypoints */
export const DEDUP_TOLERANCE = 1;

/** Perpendicular offset for edge labels from midpoint */
export const LABEL_OFFSET = 10;

/** Minimum gap stub (px) when adjacent pool gap is very small */
export const MIN_GAP_STUB = 5;

/** Divisor for capping stub length relative to gap height */
export const GAP_STUB_DIVISOR = 3;
