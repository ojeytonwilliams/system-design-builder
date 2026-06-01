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
  incomingOpsPerMs: number;
  isOverloaded: boolean;
  opsPerMs: number;
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
  for (const [nodeId, { arrivals, completions }] of totals) {
    snapshot.set(nodeId, {
      incomingOpsPerMs: arrivals / ROLLING_WINDOW_MS,
      isOverloaded: false,
      opsPerMs: completions / ROLLING_WINDOW_MS,
    });
  }
  return snapshot;
};

const computeDeliveryOpsPerMs = (window: MetricsWindow, usersNodeId: string): number => {
  let total = 0;
  for (const bucket of window) {
    const counts = bucket.nodeEvents.get(usersNodeId);
    if (counts !== undefined) {
      total += counts.deliveryCount;
    }
  }
  return total / ROLLING_WINDOW_MS;
};

export { addBucket, computeDeliveryOpsPerMs, computeNodeMetrics, ROLLING_WINDOW_MS };
export type { MetricsBucket, MetricsWindow, NodeEventCounts, NodeMetrics, NodeMetricsSnapshot };
