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

interface TimestampedCount {
  n: number;
  t: number;
}

interface NodeEventLog {
  arrivals: TimestampedCount[];
  completions: TimestampedCount[];
  deliveries: TimestampedCount[];
}

type MetricsWindow = Map<string, NodeEventLog>;

interface NodeMetrics {
  incomingOpsPerMs: number;
  isOverloaded: boolean;
  opsPerMs: number;
}

type NodeMetricsSnapshot = Map<string, NodeMetrics>;

const MAX_EVENTS = 3;

const computeRate = (entries: TimestampedCount[], windowMs: number): number => {
  const len = entries.length;
  if (len === 0) {
    return 0;
  }

  const recentStart = Math.max(0, len - MAX_EVENTS);
  const recent = entries.slice(recentStart);

  if (recent.length === 1) {
    return recent[0]!.n / windowMs;
  }

  let totalCount = 0;
  for (const entry of recent.slice(1, recent.length)) {
    totalCount += entry.n;
  }

  const span = recent[recent.length - 1]!.t - recent[0]!.t;

  return totalCount / span;
};

const evictOld = (entries: TimestampedCount[], cutoff: number): TimestampedCount[] =>
  entries.filter((e) => e.t >= cutoff);

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
      log.arrivals.push({ n: counts.arrivalCount, t: bucket.wallClockMs });
    }
    if (counts.completedCount > 0) {
      log.completions.push({ n: counts.completedCount, t: bucket.wallClockMs });
    }
    if (counts.deliveryCount > 0) {
      log.deliveries.push({ n: counts.deliveryCount, t: bucket.wallClockMs });
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
