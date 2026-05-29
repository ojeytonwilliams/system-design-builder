import { addBucket, computeDeliveryOpsPerSec, computeNodeMetrics } from "./metrics.js";
import type { MetricsBucket } from "./metrics.js";

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

describe(addBucket, () => {
  it("appends a bucket to an empty window", () => {
    const b = makeBucket(1000);
    const result = addBucket([], b);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(b);
  });

  it("does not mutate the original window", () => {
    const orig: MetricsBucket[] = [];
    addBucket(orig, makeBucket(1000));
    expect(orig).toHaveLength(0);
  });

  it("evicts buckets older than 3000ms", () => {
    const old = makeBucket(0);
    const current = makeBucket(3001);
    const result = addBucket([old], current);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(current);
  });

  it("retains buckets exactly at the 3000ms boundary", () => {
    const boundary = makeBucket(0);
    const current = makeBucket(3000);
    const result = addBucket([boundary], current);
    expect(result).toHaveLength(2);
  });
});

describe(computeNodeMetrics, () => {
  it("returns an empty map for an empty window", () => {
    expect(computeNodeMetrics([])).toStrictEqual(new Map());
  });

  it("returns opsPerSec = completedCount / 3 for a single bucket", () => {
    const result = computeNodeMetrics([makeBucket(1000, { "node-1": { completedCount: 30 } })]);
    expect(result.get("node-1")?.opsPerSec).toBe(10);
  });

  it("returns incomingOpsPerSec = arrivalCount / 3 for a single bucket", () => {
    const result = computeNodeMetrics([makeBucket(1000, { "node-1": { arrivalCount: 60 } })]);
    expect(result.get("node-1")?.incomingOpsPerSec).toBe(20);
  });

  it("sums counts across multiple buckets", () => {
    const buckets = [
      makeBucket(1000, { "node-1": { arrivalCount: 18, completedCount: 15 } }),
      makeBucket(2000, { "node-1": { arrivalCount: 12, completedCount: 15 } }),
    ];
    const result = computeNodeMetrics(buckets);
    expect(result.get("node-1")?.opsPerSec).toBe(10);
    expect(result.get("node-1")?.incomingOpsPerSec).toBe(10);
  });
});

describe(computeDeliveryOpsPerSec, () => {
  it("returns 0 for an empty window", () => {
    expect(computeDeliveryOpsPerSec([], "users-1")).toBe(0);
  });

  it("returns deliveryCount / 3 for the given users node id", () => {
    const result = computeDeliveryOpsPerSec(
      [makeBucket(1000, { "users-1": { deliveryCount: 9 } })],
      "users-1",
    );
    expect(result).toBe(3);
  });

  it("ignores delivery counts for other node ids", () => {
    const result = computeDeliveryOpsPerSec(
      [makeBucket(1000, { "server-1": { deliveryCount: 6 }, "users-1": { deliveryCount: 9 } })],
      "users-1",
    );
    expect(result).toBe(3);
  });
});
