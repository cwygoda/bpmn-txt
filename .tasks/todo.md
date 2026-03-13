# Layout Engine Fixes & Enhancements

Tracked from thorough review on 2026-03-13. Work one-by-one: test first, then implement.

## Bugs

- [x] **1. `||` → `??` in `buildElkGraph` defaults** — `layout.ts:296-298`
  `options.nodeSpacing || 50` swallows explicit `0`. Use `??` for all three spacing options. Also fixed nodeSpacing fallback 50→70 to match generateLayout default.

- [ ] **2. Lane width not updated after pool normalization** — `layout.ts:134-154`
  After normalizing pool X/width to widest, lanes inside aren't cascaded. Leaves visual gap on right edge.

- [ ] **3. Collapsed pool negative Y when first** — `layout.ts:96`
  `yOffset - CONTAINER_PADDING * 2` = -100 when first pool is collapsed. All coords shift negative.

- [ ] **4. Z-shape fallback ignores obstacles** — `routing.ts:748,756`
  Midpoint `(src + tgt) / 2` not checked against obstacles. Flow can route through elements.

- [ ] **5. Dead return value in `mergeWithOffset`** — `layout.ts:232-248`
  Returns `maxY + POOL_GAP` but caller ignores it. Remove return or use it.

- [ ] **6. `waypoints` null safety in message flow routing** — `routing.ts:496`
  `waypointsToSegments(waypoints)` where `waypoints` could theoretically be null.

## Visual / Layout Issues

- [ ] **7. EXIT_STUB doesn't adapt to pool gap** — `routing.ts:8,449`
  Fixed 20px. If gap < 40px, stubs from both sides overlap. Should cap at `gap / 3`.

- [ ] **8. Fan-out only handles top/bottom peers** — `routing.ts:533-541`
  3+ outgoing gateway flows: only extremes get fan-out. Middle flows pick suboptimal edges.

- [ ] **9. Routing ignores layout direction** — `routing.ts`
  Custom routing hardcodes RIGHT/DOWN assumptions. LEFT/UP directions produce wrong edge points.

- [ ] **10. Boundary events not collected for ELK layout** — `utils.ts`
  `collectFromProcess`/`collectFromPool` don't recurse into `element.boundaryEvents`. No auto-positioning.

- [ ] **11. `PARALLEL_TOLERANCE=5` too aggressive** — `constants.ts:24`
  Causes A* failures in dense diagrams, falling back to obstacle-ignoring Z-shapes.

## Performance

- [ ] **12. `coordToIdx` linear search on sorted arrays** — `obstacle-router.ts:182`
  `indexOf` is O(n). Binary search would be O(log n).

- [ ] **13. A* priority queue uses `Array.splice`** — `obstacle-router.ts:244`
  O(n) insertion. Binary heap = O(log n).

- [ ] **14. `collectFromPool` called redundantly** — `layout.ts:91,173`
  Same pool's elements collected twice during layout.

## Enhancements (Future)

- [ ] **15. Subprocess internal layout** — children not laid out inside expanded subprocesses
- [ ] **16. Edge label positioning** — no `BPMNLabel` x/y for condition text
- [ ] **17. Pool label width proportional to text** — hardcoded 30px overflows long names

## Review

*(filled in as items complete)*
