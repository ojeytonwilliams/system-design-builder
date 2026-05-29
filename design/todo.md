# TODO

## Phase 1: Pre-scale component-library and update simulation-engine

- [x] CODE: Pre-scale all component latency/transit values in component-library and remove redundant scaling from simulation-engine
  - Feature: Move TIME_SCALE into `component-library.ts` and multiply every latency value and the edge transit constant by it at definition time. Export `EDGE_TRANSIT_MS` (replacing `EDGE_TRANSIT_INTERNAL_MS`). Remove the `* TIME_SCALE` multiplication from `simulation-engine.ts` (now redundant) and switch its import of `EDGE_TRANSIT_INTERNAL_MS` to `EDGE_TRANSIT_MS` from component-library.
  - Files: `src/domain/component-library.ts`, `src/simulation/simulation-engine.ts`
  - Acceptance:
    - `TIME_SCALE` is defined in `component-library.ts` and not imported by `simulation-engine.ts`
    - Every component `latencyMs` value in component-library is `realWorldMs * TIME_SCALE` (e.g. `10 * TIME_SCALE = 1000`)
    - `EDGE_TRANSIT_MS` is exported from component-library with value `10 * TIME_SCALE`
    - `simulation-engine.ts` stores `durationMs: latencyMs` with no further multiplication
    - `simulation-engine.ts` uses `EDGE_TRANSIT_MS` imported from component-library
    - `pnpm test` passes

## Phase 2: Remove TIME_SCALE from request-spawner and update traffic rate configs

- [x] CODE: Remove TIME_SCALE division from request-spawner and update all traffic rate values to direct req/s
  - Feature: Delete `scaledRate = trafficRate / TIME_SCALE` from `request-spawner.ts` and use `trafficRate` directly. Import `EDGE_TRANSIT_MS` from component-library instead of computing `VISUAL_TRANSIT_MS`. Update all traffic rate constants in test fixtures by dividing their current values by TIME_SCALE (e.g. `trafficPeak: 15000` → `150`).
  - Files: `src/simulation/request-spawner.ts`, `src/ui/game-layout.test.tsx`
  - Acceptance:
    - `request-spawner.ts` does not import or reference `TIME_SCALE`
    - `request-spawner.ts` imports `EDGE_TRANSIT_MS` from component-library
    - Traffic rate fixture values in `game-layout.test.tsx` are divided by 100 relative to their previous values
    - `pnpm test` passes

## Phase 3: Apply TIME_SCALE to the UI ops/s display

- [x] CODE: Divide internal throughput by TIME_SCALE before rendering the ops/s gauge
  - Feature: In the UI layer where per-node throughput (ops/s) is read from rolling-window metrics and passed to gauges or labels, divide by `TIME_SCALE` imported from `component-library.ts`. This converts the simulation's internal req/s rate (100× real-world) back to a human-readable value.
  - Files: `src/ui/` (ops/s display component or hook)
  - Acceptance:
    - `TIME_SCALE` is imported from `component-library.ts` in the UI display code
    - Displayed ops/s = internal rolling-window throughput / TIME_SCALE
    - No other simulation file or hook introduces a new TIME_SCALE reference
    - `pnpm test` passes

## Phase 4: Clean up exports and tests

- [x] TASK: Remove TIME_SCALE and EDGE_TRANSIT_INTERNAL_MS from `request-types.ts`
  - Delete both exports; fix any resulting import errors

- [x] TASK: Update simulation test files to remove TIME_SCALE and use EDGE_TRANSIT_MS
  - `simulation-engine.test.ts`: replace `(TIME_SCALE * 1000) / TICK_MS` with `1000 / TICK_MS`; replace `VISUAL_TRANSIT_MS` with `EDGE_TRANSIT_MS` imported from component-library; remove TIME_SCALE import; update traffic rate constants
  - `request-spawner.test.ts`: replace `(TIME_SCALE * 1000) / DELTA_MS` with `1000 / DELTA_MS`; replace `VISUAL_TRANSIT_MS` with `EDGE_TRANSIT_MS` imported from component-library; remove TIME_SCALE import; update traffic rate constants
  - `game-layout.test.tsx`: remove comments that explained the TIME_SCALE division on traffic rates
  - `pnpm test`, `pnpm lint`, and `pnpm fmt:check` all pass

## Traceability Matrix

| Requirement ID | TODO Item | Status |
|---|---|---|
| REQ-1: TIME_SCALE defined in component-library, multiplied into latencies | Phase 1 / CODE: Pre-scale component-library and update simulation-engine | mapped |
| REQ-2: EDGE_TRANSIT_MS replaces EDGE_TRANSIT_INTERNAL_MS | Phase 1 / CODE: Pre-scale component-library and update simulation-engine | mapped |
| REQ-3: TIME_SCALE and EDGE_TRANSIT_INTERNAL_MS removed from request-types.ts | Phase 4 / TASK: Remove TIME_SCALE and EDGE_TRANSIT_INTERNAL_MS from request-types.ts | mapped |
| REQ-4: simulation-engine.ts does not import or use TIME_SCALE | Phase 1 / CODE: Pre-scale component-library and update simulation-engine | mapped |
| REQ-5: request-spawner.ts does not import or use TIME_SCALE | Phase 2 / CODE: Remove TIME_SCALE division from request-spawner | mapped |
| REQ-6: Traffic rate config values updated to direct req/s | Phase 2 / CODE: Remove TIME_SCALE division from request-spawner | mapped |
| REQ-7: UI ops/s display divides throughput by TIME_SCALE | Phase 3 / CODE: Divide internal throughput by TIME_SCALE in UI ops/s display | mapped |
| REQ-8: Tests updated to remove TIME_SCALE imports and use EDGE_TRANSIT_MS | Phase 4 / TASK: Update simulation test files | mapped |
| NFR-1: No simulation file imports TIME_SCALE | Phase 1, 2, 4 (all phases verify this) | mapped |
| NFR-2: Engine tick interface unchanged (real wall-clock ms) | Phase 1 / CODE: Pre-scale component-library and update simulation-engine | mapped |
