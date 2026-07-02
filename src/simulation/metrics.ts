const ROLLING_WINDOW_MS = 6000;

interface NodeEventCounts {
  arrivalCount: number;
  completedCount: number;
  deliveryCount: number;
}

interface MetricsBucket {
  nodeEvents: Map<string, NodeEventCounts>;
  wallClockMs: number;
}

interface NodeEventLog {
  arrivals: number[];
  completions: number[];
  deliveries: number[];
}

type MetricsWindow = Map<string, NodeEventLog>;

interface NodeMetrics {
  incomingOpsPerMs: number;
  isOverloaded: boolean;
  opsPerMs: number;
}

type NodeMetricsSnapshot = Map<string, NodeMetrics>;

const MAX_EVENTS = 3;

const computeRate = (timestamps: number[], windowMs: number): number => {
  const n = timestamps.length;
  if (n === 0) {
    return 0;
  }

  const recentStart = Math.max(0, n - MAX_EVENTS);
  const recent = timestamps.slice(recentStart);

  if (recent.length === 1) {
    return 1 / windowMs;
  }

  let sum = 0;

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const gap = recent[i]! - prev!;
    sum += 1 / gap;
  }

  return sum / (recent.length - 1);
};

const evictOld = (timestamps: number[], cutoff: number): number[] =>
  timestamps.filter((t) => t >= cutoff);

const emptyLog = (): NodeEventLog => ({
  arrivals: [],
  completions: [],
  deliveries: [],
});

// Evicts old timestamps and adds new events from the bucket
const addBucket = (window: MetricsWindow, bucket: MetricsBucket): MetricsWindow => {
  const cutoff = bucket.wallClockMs - ROLLING_WINDOW_MS;
  const result: MetricsWindow = new Map();

  for (const [nodeId, log] of window) {
    result.set(nodeId, {
      arrivals: evictOld(log.arrivals, cutoff),
      completions: evictOld(log.completions, cutoff),
      deliveries: evictOld(log.deliveries, cutoff),
    });
  }

  for (const [nodeId, counts] of bucket.nodeEvents) {
    const log = result.get(nodeId) ?? emptyLog();
    if (counts.arrivalCount > 0) {
      log.arrivals.push(bucket.wallClockMs);
    }
    if (counts.completedCount > 0) {
      log.completions.push(bucket.wallClockMs);
    }
    if (counts.deliveryCount > 0) {
      log.deliveries.push(bucket.wallClockMs);
    }
    result.set(nodeId, log);
  }

  return result;
};

const computeNodeMetrics = (
  window: MetricsWindow,
  nodeCapacities: Map<string, number>,
): NodeMetricsSnapshot => {
  const snapshot: NodeMetricsSnapshot = new Map();

  for (const [nodeId, log] of window) {
    if (log.arrivals.length > 0 || log.completions.length > 0) {
      const incomingOpsPerMs = computeRate(log.arrivals, ROLLING_WINDOW_MS);
      const capacity = nodeCapacities.get(nodeId) ?? Infinity;
      snapshot.set(nodeId, {
        incomingOpsPerMs,
        isOverloaded: isFinite(capacity) && incomingOpsPerMs > capacity,
        opsPerMs: computeRate(log.completions, ROLLING_WINDOW_MS),
      });
    }
  }

  return snapshot;
};

const computeDeliveryOpsPerMs = (window: MetricsWindow, usersNodeId: string): number => {
  const log = window.get(usersNodeId);
  if (log === undefined) {
    return 0;
  }
  return computeRate(log.deliveries, ROLLING_WINDOW_MS);
};

export {
  addBucket,
  computeDeliveryOpsPerMs,
  computeNodeMetrics,
  computeRate,
  MAX_EVENTS,
  ROLLING_WINDOW_MS,
};
export type { MetricsBucket, MetricsWindow, NodeEventCounts, NodeMetrics, NodeMetricsSnapshot };
