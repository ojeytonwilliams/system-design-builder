import {
  addBucket,
  computeDeliveryOpsPerMs,
  computeNodeMetrics,
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

  it("uses 1/gap for two arrivals", () => {
    const window = buildWindow(
      makeBucket(1000, { "node-1": { arrivalCount: 1 } }),
      makeBucket(2000, { "node-1": { arrivalCount: 1 } }),
    );
    const result = computeNodeMetrics(window, new Map());
    const expected = 1 / 1000;
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(expected);
  });

  it("averages two rates for three arrivals", () => {
    const window = buildWindow(
      makeBucket(500, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1000, { "node-1": { arrivalCount: 1 } }),
      makeBucket(2000, { "node-1": { arrivalCount: 1 } }),
    );
    const result = computeNodeMetrics(window, new Map());
    // rate1 = 1/500 (1 -> 2)
    // rate2 = 1/1000 (2 -> 3)
    const expected = (1 / 500 + 1 / 1000) / 2;
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(expected);
  });

  it("uses only the most recent three arrivals when there are more than three", () => {
    const window = buildWindow(
      makeBucket(500, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1000, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1500, { "node-1": { arrivalCount: 1 } }),
      makeBucket(2000, { "node-1": { arrivalCount: 1 } }),
    );
    const result = computeNodeMetrics(window, new Map());
    // Most recent 3: T=1000, T=1500, T=2000
    // Predecessor of T=1000: T=500
    // rate for T=1000: 1/(1000-500) = 1/500
    // rate for T=1500: 1/(1500-1000) = 1/500
    // rate for T=2000: 1/(2000-1500) = 1/500
    // avg = 1/500
    expect(result.get("node-1")?.incomingOpsPerMs).toBe(1 / 500);
  });

  it("sets isOverloaded to true when incomingOpsPerMs exceeds node capacity", () => {
    const window = buildWindow(
      makeBucket(1000, { "node-1": { arrivalCount: 1 } }),
      makeBucket(1100, { "node-1": { arrivalCount: 1 } }),
    );
    // rate = avg(1/3000, 1/100) ≈ 0.00517
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
