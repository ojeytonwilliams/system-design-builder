const MS_PER_SECOND = 1000;
const ROLLING_WINDOW_MS = 3000;

interface NodeEventCounts {
  arrivalCount: number;
  completedCount: number;
  deliveryCount: number;
}

interface MetricsBucket {
  nodeEvents: Map<string, NodeEventCounts>;
  wallClockMs: number;
}

type MetricsWindow = MetricsBucket[];

interface NodeMetrics {
  incomingOpsPerSec: number;
  opsPerSec: number;
}

type NodeMetricsSnapshot = Map<string, NodeMetrics>;

const addBucket = (window: MetricsWindow, bucket: MetricsBucket): MetricsWindow => {
  const cutoff = bucket.wallClockMs - ROLLING_WINDOW_MS;
  return [...window.filter((b) => b.wallClockMs >= cutoff), bucket];
};

const computeNodeMetrics = (window: MetricsWindow): NodeMetricsSnapshot => {
  const totals = new Map<string, { arrivals: number; completions: number }>();

  for (const bucket of window) {
    for (const [nodeId, counts] of bucket.nodeEvents) {
      const existing = totals.get(nodeId) ?? { arrivals: 0, completions: 0 };
      totals.set(nodeId, {
        arrivals: existing.arrivals + counts.arrivalCount,
        completions: existing.completions + counts.completedCount,
      });
    }
  }

  const snapshot: NodeMetricsSnapshot = new Map();
  const windowSeconds = ROLLING_WINDOW_MS / MS_PER_SECOND;
  for (const [nodeId, { arrivals, completions }] of totals) {
    snapshot.set(nodeId, {
      incomingOpsPerSec: arrivals / windowSeconds,
      opsPerSec: completions / windowSeconds,
    });
  }
  return snapshot;
};

const computeDeliveryOpsPerSec = (window: MetricsWindow, usersNodeId: string): number => {
  let total = 0;
  for (const bucket of window) {
    const counts = bucket.nodeEvents.get(usersNodeId);
    if (counts !== undefined) {
      total += counts.deliveryCount;
    }
  }
  return total / (ROLLING_WINDOW_MS / MS_PER_SECOND);
};

export { addBucket, computeDeliveryOpsPerSec, computeNodeMetrics, ROLLING_WINDOW_MS };
export type { MetricsBucket, MetricsWindow, NodeEventCounts, NodeMetrics, NodeMetricsSnapshot };
