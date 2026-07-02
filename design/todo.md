# TODO

## Phase 1: New metrics ingestion API

- [x] CODE: `pushEvent` function
  - Feature: Add a `pushEvent(window, nodeId, eventType, timestamp)` function to `metrics.ts` that appends `{n: 1, t: timestamp}` to the appropriate array (`arrivals`, `completions`, or `deliveries`) for the given node, creating the node's log if absent. Mutates in place.
  - Files: `src/simulation/metrics.ts`, `src/simulation/metrics.test.ts`
  - Acceptance:
    - `pushEvent` with event type `"arrival"` appends to the node's `arrivals` array
    - `pushEvent` with event type `"completion"` appends to the node's `completions` array
    - `pushEvent` with event type `"delivery"` appends to the node's `deliveries` array
    - Calling `pushEvent` for a node not yet in the window creates a new log entry
    - Calling `pushEvent` for an existing node appends to the existing log

- [x] CODE: `evictWindow` function
  - Feature: Add an `evictWindow(window, currentTimeMs)` function to `metrics.ts` that removes entries older than `currentTimeMs - ROLLING_WINDOW_MS` from every node log and deletes empty node entries. Mutates in place.
  - Files: `src/simulation/metrics.ts`, `src/simulation/metrics.test.ts`
  - Acceptance:
    - Entries with `t < currentTimeMs - ROLLING_WINDOW_MS` are removed
    - Entries exactly at the boundary (`t === currentTimeMs - ROLLING_WINDOW_MS`) are retained
    - Node entries with all-empty arrays after eviction are deleted from the window

## Phase 2: Switch simulation engine to exact-timing events

- [x] CODE: Use `pushEvent` with exact timestamps in `advanceTransits`
  - Feature: Replace `tickEvents` arrivalCount accumulation in `advanceTransits` with a `pushEvent` call using the exact arrival time `this.wallClockElapsedMs - excessTime`.
  - Files: `src/simulation/simulation-engine.ts`
  - Acceptance:
    - When a transit completes, an arrival event is pushed with timestamp `wallClockElapsedMs - excessTime`
    - `advanceTransits` no longer takes a `tickEvents` parameter

- [x] CODE: Use `pushEvent` with exact timestamps in `advanceProcessing`
  - Feature: Replace `tickEvents` completedCount accumulation in `advanceProcessing` with a `pushEvent` call using the exact completion time `this.wallClockElapsedMs - excessTime`.
  - Files: `src/simulation/simulation-engine.ts`
  - Acceptance:
    - When processing completes, a completion event is pushed with timestamp `wallClockElapsedMs - excessTime`
    - `advanceProcessing` no longer takes a `tickEvents` parameter

- [x] CODE: Use `pushEvent` with exact timestamps in `advanceResponseTransits`
  - Feature: Replace `recordDelivery` / `tickEvents` deliveryCount accumulation in `advanceResponseTransits` with a `pushEvent` call using the exact delivery time `this.wallClockElapsedMs - excessTime`. Remove the `recordDelivery` method.
  - Files: `src/simulation/simulation-engine.ts`
  - Acceptance:
    - When the final response transit completes, a delivery event is pushed with timestamp `wallClockElapsedMs - excessTime`
    - `advanceResponseTransits` no longer takes `tickEvents` or `usersNodeId` parameters
    - The `recordDelivery` method is removed

- [x] CODE: Call `evictWindow` and remove `addBucket` from `tick()`
  - Feature: Replace the `addBucket` call in `tick()` with a single `evictWindow` call after incrementing `wallClockElapsedMs`. Remove the `tickEvents` map creation.
  - Files: `src/simulation/simulation-engine.ts`
  - Acceptance:
    - `tick()` no longer creates a `tickEvents` map
    - `tick()` no longer calls `addBucket`
    - `tick()` calls `evictWindow(this.metricsWindow, this.wallClockElapsedMs)` once per tick
    - All existing simulation-engine tests pass

## Phase 3: Remove dead code and update metrics tests

- [x] TASK: Remove `addBucket`, `MetricsBucket`, and `NodeEventCounts` from `metrics.ts`
  - Files: `src/simulation/metrics.ts`

- [x] TASK: Export `NodeEventLog` type from `metrics.ts`
  - Files: `src/simulation/metrics.ts`

- [x] CODE: Rewrite metrics tests to use `pushEvent`/`evictWindow` and direct window construction
  - Feature: Replace the `makeBucket`/`buildWindow` test helpers and `describe(addBucket, ...)` suite with tests for `pushEvent` and `evictWindow`. Update `computeNodeMetrics` and `computeDeliveryOpsPerMs` tests to construct `MetricsWindow` directly.
  - Files: `src/simulation/metrics.test.ts`
  - Acceptance:
    - No test imports `addBucket`, `MetricsBucket`, or `NodeEventCounts`
    - Tests for `pushEvent` cover all three event types and node creation
    - Tests for `evictWindow` cover eviction, boundary retention, and empty-node cleanup
    - All `computeNodeMetrics` and `computeDeliveryOpsPerMs` assertions and expected values remain the same
    - All tests pass

## Traceability Matrix

| Requirement ID | TODO Item | Status |
|---|---|---|
| New `pushEvent` function | Phase 1 / CODE: `pushEvent` function | mapped |
| New `evictWindow` function | Phase 1 / CODE: `evictWindow` function | mapped |
| Remove `addBucket` function | Phase 3 / TASK: Remove `addBucket`, `MetricsBucket`, and `NodeEventCounts` | mapped |
| Remove `MetricsBucket` type | Phase 3 / TASK: Remove `addBucket`, `MetricsBucket`, and `NodeEventCounts` | mapped |
| Remove `NodeEventCounts` type | Phase 3 / TASK: Remove `addBucket`, `MetricsBucket`, and `NodeEventCounts` | mapped |
| Export `NodeEventLog` type | Phase 3 / TASK: Export `NodeEventLog` type | mapped |
| Exact timestamps in `advanceTransits` | Phase 2 / CODE: Use `pushEvent` with exact timestamps in `advanceTransits` | mapped |
| Exact timestamps in `advanceProcessing` | Phase 2 / CODE: Use `pushEvent` with exact timestamps in `advanceProcessing` | mapped |
| Exact timestamps in `advanceResponseTransits` | Phase 2 / CODE: Use `pushEvent` with exact timestamps in `advanceResponseTransits` | mapped |
| Remove `addBucket` from `tick()` | Phase 2 / CODE: Call `evictWindow` and remove `addBucket` from `tick()` | mapped |
| Update metrics tests | Phase 3 / CODE: Rewrite metrics tests | mapped |
| No changes to `level-validator.ts` | N/A (no action required) | mapped |
| No changes to `computeRate` | N/A (no action required) | mapped |
