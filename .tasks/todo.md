# Layout Engine Fixes & Enhancements

Tracked from thorough review on 2026-03-13. Work one-by-one: test first, then implement.

## Bugs

- [x] **1. `||` → `??` in `buildElkGraph` defaults** — `layout.ts:296-298`
  `options.nodeSpacing || 50` swallows explicit `0`. Use `??` for all three spacing options. Also fixed nodeSpacing fallback 50→70 to match generateLayout default.

- [x] **2. Lane width not updated after pool normalization** — `layout.ts:134-154`
  After normalizing pool X/width to widest, lanes inside aren't cascaded. Leaves visual gap on right edge.

- [x] **3. Collapsed pool negative Y when first** — `layout.ts:96`
  `yOffset - CONTAINER_PADDING * 2` = -100 when first pool is collapsed. Clamped with `Math.max(0, ...)`. Regression test added.

- [x] **4. Z-shape fallback ignores obstacles** — `routing.ts:748,756`
  Added `findBestZMid()` that tries obstacle-edge candidates when naive midpoint hits elements. Regression test added.

- [x] **5. Dead return value in `mergeWithOffset`** — `layout.ts:232-248`
  Removed dead return; changed to `void`. Both callers use `computeBoundsForElements` instead.

- [x] **6. `waypoints` null safety in message flow routing** — `routing.ts:496`
  Added `if (!waypoints) continue` guard before `waypointsToSegments` call.

## Visual / Layout Issues

- [x] **7. EXIT_STUB doesn't adapt to pool gap** — `routing.ts:8,449`
  Capped with `Math.min(EXIT_STUB, gapHeight / 3)` (floor 5px) for adjacent pool routing.

- [x] **8. Fan-out only handles top/bottom peers** — `routing.ts:533-541`
  Middle peers now interpolate Y along left/right edge based on peer direction.

- [ ] **9. Routing ignores layout direction** — `routing.ts`
  Custom routing hardcodes RIGHT/DOWN assumptions. LEFT/UP directions produce wrong edge points.
  *Skipped: architectural change requiring direction param threaded through all routing functions. Low priority — LEFT/UP layouts rare in BPMN.*

- [x] **10. Boundary events not collected for ELK layout** — `utils.ts`
  Both `collectFromProcess` and `collectFromPool` now recurse into task/subprocess `boundaryEvents`.

- [x] **11. `PARALLEL_TOLERANCE=5` too aggressive** — `constants.ts:24`
  Reduced from 5px to 2px. Still prevents visual overlap, fewer A* failures in dense diagrams.

## Performance

- [x] **12. `coordToIdx` linear search on sorted arrays** — `obstacle-router.ts:182`
  Replaced `indexOf` with `bsearch()` — O(log n) on sorted xs/ys arrays.

- [x] **13. A* priority queue uses `Array.splice`** — `obstacle-router.ts:244`
  Replaced sorted-array with binary min-heap. O(log n) insert/extract.

- [x] **14. `collectFromPool` called redundantly** — `layout.ts:91,173`
  Pre-computed `poolElementsCache` Map eliminates duplicate calls.

## Enhancements (Future)

- [ ] **15. Subprocess internal layout** — children not laid out inside expanded subprocesses
- [ ] **16. Edge label positioning** — no `BPMNLabel` x/y for condition text
- [ ] **17. Pool label width proportional to text** — hardcoded 30px overflows long names

## Review

*(filled in as items complete)*
