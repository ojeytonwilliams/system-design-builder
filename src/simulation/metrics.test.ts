import {
  addBucket,
  computeDeliveryOpsPerMs,
  computeNodeMetrics,
  evictWindow,
  pushEvent,
  ROLLING_WINDOW_MS,
} from "./metrics.js";
import type { MetricsBucket, MetricsWindow } from "./metrics.js";

const makeBucket = (
  wallClockMs: number,
  events: Record<
    string,
    { arrivalCount?: number; completedCount?: number; deliveryCount?: number }
  > = {},
): MetricsBucket => ({
  nodeEvents: new Map(
    Object.entries(events).map(([id, e]) => [
      id,
      {
        arrivalCount: e.arrivalCount ?? 0,
        completedCount: e.completedCount ?? 0,
        deliveryCount: e.deliveryCount ?? 0,
      },
    ]),
  ),
  wallClockMs,
});

const buildWindow = (...buckets: MetricsBucket[]): MetricsWindow => {
  let window: MetricsWindow = new Map();
  for (const b of buckets) {
    window = addBucket(window, b);
  }
  return window;
};

describe(addBucket, () => {
  it("does not mutate the original window", () => {
    const orig: MetricsWindow = new Map();
    addBucket(orig, makeBucket(1000, { "node-1": { arrivalCount: 1 } }));
    expect(orig.size).toBe(0);
  });

  it("evicts events older than ROLLING_WINDOW_MS", () => {
    const window = buildWindow(
      makeBucket(0, { "node-1": { arrivalCount: 1 } }),
      makeBucket(ROLLING_WINDOW_MS + 1),
    );
    const metrics = computeNodeMetrics(window, new Map());
    expect(metrics.has("node-1")).toBe(false);
  });

  it("retains events exactly at the ROLLING_WINDOW_MS boundary", () => {
    const window = buildWindow(makeBucket(0, { "node-1": { arrivalCount: 1 } }), makeBucket(3000));
    const metrics = computeNodeMetrics(window, new Map());
    expect(metrics.has("node-1")).toBe(true);
  });
});

describe(pushEvent, () => {
  it("appends an arrival entry to the node's arrivals array", () => {
    const window: MetricsWindow = new Map();
    pushEvent(window, "node-1", "arrival", 1000);
    expect(window.get("node-1")?.arrivals).toStrictEqual([{ n: 1, t: 1000 }]);
  });

  it("appends a completion entry to the node's completions array", () => {
    const window: MetricsWindow = new Map();
    pushEvent(window, "node-1", "completion", 2000);
    expect(window.get("node-1")?.completions).toStrictEqual([{ n: 1, t: 2000 }]);
  });

  it("appends a delivery entry to the node's deliveries array", () => {
    const window: MetricsWindow = new Map();
    pushEvent(window, "node-1", "delivery", 3000);
    expect(window.get("node-1")?.deliveries).toStrictEqual([{ n: 1, t: 3000 }]);
  });

  it("creates a new log entry for a node not yet in the window", () => {
    const window: MetricsWindow = new Map();
    pushEvent(window, "node-1", "arrival", 1000);
    expect(window.has("node-1")).toBe(true);
    expect(window.get("node-1")?.completions).toStrictEqual([]);
    expect(window.get("node-1")?.deliveries).toStrictEqual([]);
  });

  it("appends to the existing log for an existing node", () => {
    const window: MetricsWindow = new Map();
    pushEvent(window, "node-1", "arrival", 1000);
    pushEvent(window, "node-1", "arrival", 2000);
    expect(window.get("node-1")?.arrivals).toStrictEqual([
      { n: 1, t: 1000 },
      { n: 1, t: 2000 },
    ]);
  });
});

describe(evictWindow, () => {
  it("removes entries older than ROLLING_WINDOW_MS", () => {
    const window: MetricsWindow = new Map();
    pushEvent(window, "node-1", "arrival", 0);
    pushEvent(window, "node-1", "arrival", ROLLING_WINDOW_MS + 1);
    evictWindow(window, ROLLING_WINDOW_MS + 1);
    expect(window.get("node-1")?.arrivals).toStrictEqual([{ n: 1, t: ROLLING_WINDOW_MS + 1 }]);
  });

  it("retains entries exactly at the boundary", () => {
    const window: MetricsWindow = new Map();
    pushEvent(window, "node-1", "arrival", 0);
    evictWindow(window, ROLLING_WINDOW_MS);
    expect(window.get("node-1")?.arrivals).toStrictEqual([{ n: 1, t: 0 }]);
  });

  it("deletes node entries with all-empty arrays after eviction", () => {
    const window: MetricsWindow = new Map();
    pushEvent(window, "node-1", "arrival", 0);
    evictWindow(window, ROLLING_WINDOW_MS + 1);
    expect(window.has("node-1")).toBe(false);
  });
});

describe(computeNodeMetrics, () => {
  it("returns an empty map for an empty window", () => {
    expect(computeNodeMetrics(new Map(), new Map())).toStrictEqual(new Map());
  });

  it("returns incomingOpsPerMs = 1/ROLLING_WINDOW_MS for a single arrival", () => {
    const window = buildWindow(makeBucket(1000, { "node-1": { arrivalCount: 1 } }));
    const result = computeNodeMetrics(window, new Map());
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(1 / ROLLING_WINDOW_MS);
  });

  it("returns opsPerMs = 1/ROLLING_WINDOW_MS for a single completion", () => {
    const window = buildWindow(makeBucket(1000, { "node-1": { completedCount: 1 } }));
    const result = computeNodeMetrics(window, new Map());
    expect(result.get("node-1")?.opsPerMs).toBe(1 / ROLLING_WINDOW_MS);
  });

  it("uses the second arrival count if there are two arrivals", () => {
    const window = buildWindow(
      makeBucket(1000, { "node-1": { arrivalCount: 1 } }),
      makeBucket(2000, { "node-1": { arrivalCount: 5 } }),
    );
    const result = computeNodeMetrics(window, new Map());
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(5 / 1000);
  });

  it("computes totalCount/span for three arrivals", () => {
    const window = buildWindow(
      makeBucket(500, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1000, { "node-1": { arrivalCount: 7 } }),
      makeBucket(2000, { "node-1": { arrivalCount: 2 } }),
    );
    const result = computeNodeMetrics(window, new Map());
    // totalCount = 9, span = 1500
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(9 / 1500);
  });

  it("uses only the most recent three arrivals when there are more than three", () => {
    const window = buildWindow(
      makeBucket(500, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1000, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1500, { "node-1": { arrivalCount: 1 } }),
      makeBucket(2000, { "node-1": { arrivalCount: 1 } }),
    );
    const result = computeNodeMetrics(window, new Map());
    // Most recent 3: [{t:1000,n:1}, {t:1500,n:1}, {t:2000,n:1}]
    // counts after first = 2, span = 1000
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(2 / 1000);
  });

  it("scales incomingOpsPerMs by arrivalCount for a single bucket", () => {
    const window = buildWindow(makeBucket(1000, { "node-1": { arrivalCount: 3 } }));
    const result = computeNodeMetrics(window, new Map());
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(3 / ROLLING_WINDOW_MS);
  });

  it("sums counts after first entry for multi-count buckets", () => {
    const window = buildWindow(
      makeBucket(1000, { "node-1": { arrivalCount: 1 } }),
      makeBucket(2000, { "node-1": { arrivalCount: 3 } }),
    );
    const result = computeNodeMetrics(window, new Map());
    // counts after first = 3, span = 1000
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(3 / 1000);
  });

  it("computes counts-after-first/span for three arrivals with varying counts", () => {
    const window = buildWindow(
      makeBucket(500, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1000, { "node-1": { arrivalCount: 2 } }),
      makeBucket(2000, { "node-1": { arrivalCount: 4 } }),
    );
    const result = computeNodeMetrics(window, new Map());
    // counts after first = 6, span = 1500
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(6 / 1500);
  });

  it("sets isOverloaded to true when incomingOpsPerMs exceeds node capacity", () => {
    const window = buildWindow(
      makeBucket(1000, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1100, { "node-1": { arrivalCount: 1 } }),
    );
    // rate = 1 / 100 = 0.01
    const capacities = new Map([["node-1", 0.001]]);
    const result = computeNodeMetrics(window, capacities);
    expect(result.get("node-1")?.isOverloaded).toBe(true);
  });

  it("sets isOverloaded to false when incomingOpsPerMs is within node capacity", () => {
    const window = buildWindow(makeBucket(1000, { "node-1": { arrivalCount: 1 } }));
    // rate = 1/3000 ≈ 0.000333
    const capacities = new Map([["node-1", 0.1]]);
    const result = computeNodeMetrics(window, capacities);
    expect(result.get("node-1")?.isOverloaded).toBe(false);
  });

  it("sets isOverloaded to false when capacity is Infinity", () => {
    const window = buildWindow(
      makeBucket(1000, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1001, { "node-1": { arrivalCount: 1 } }),
    );
    const capacities = new Map<string, number>([["node-1", Infinity]]);
    const result = computeNodeMetrics(window, capacities);
    expect(result.get("node-1")?.isOverloaded).toBe(false);
  });

  it("sets isOverloaded to false when node is not in the capacity map", () => {
    const window = buildWindow(makeBucket(1000, { "node-1": { arrivalCount: 1 } }));
    const result = computeNodeMetrics(window, new Map());
    expect(result.get("node-1")?.isOverloaded).toBe(false);
  });
});

describe(computeDeliveryOpsPerMs, () => {
  it("returns 0 for an empty window", () => {
    expect(computeDeliveryOpsPerMs(new Map(), "users-1")).toBe(0);
  });

  it("returns 1/ROLLING_WINDOW_MS for a single delivery", () => {
    const window = buildWindow(makeBucket(1000, { "users-1": { deliveryCount: 1 } }));
    expect(computeDeliveryOpsPerMs(window, "users-1")).toBe(1 / ROLLING_WINDOW_MS);
  });

  it("scales rate by deliveryCount for a single bucket", () => {
    const window = buildWindow(makeBucket(1000, { "users-1": { deliveryCount: 3 } }));
    expect(computeDeliveryOpsPerMs(window, "users-1")).toBe(3 / ROLLING_WINDOW_MS);
  });

  it("ignores delivery counts for other node ids", () => {
    const window = buildWindow(
      makeBucket(1000, {
        "server-1": { deliveryCount: 6 },
        "users-1": { deliveryCount: 1 },
      }),
    );
    expect(computeDeliveryOpsPerMs(window, "users-1")).toBe(1 / ROLLING_WINDOW_MS);
  });
});
