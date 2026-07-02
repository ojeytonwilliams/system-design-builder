const ROLLING_WINDOW_MS = 6000;

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

type EventType = "arrival" | "completion" | "delivery";

const EVENT_TYPE_TO_KEY: Record<EventType, keyof NodeEventLog> = {
  arrival: "arrivals",
  completion: "completions",
  delivery: "deliveries",
};

const emptyLog = (): NodeEventLog => ({
  arrivals: [],
  completions: [],
  deliveries: [],
});

const evictWindow = (window: MetricsWindow, currentTimeMs: number): void => {
  const cutoff = currentTimeMs - ROLLING_WINDOW_MS;
  for (const [nodeId, log] of window) {
    log.arrivals = evictOld(log.arrivals, cutoff);
    log.completions = evictOld(log.completions, cutoff);
    log.deliveries = evictOld(log.deliveries, cutoff);
    if (log.arrivals.length === 0 && log.completions.length === 0 && log.deliveries.length === 0) {
      window.delete(nodeId);
    }
  }
};

const pushEvent = (
  window: MetricsWindow,
  nodeId: string,
  eventType: EventType,
  timestamp: number,
): void => {
  let log = window.get(nodeId);
  if (log === undefined) {
    log = emptyLog();
    window.set(nodeId, log);
  }
  log[EVENT_TYPE_TO_KEY[eventType]].push({ n: 1, t: timestamp });
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
  computeDeliveryOpsPerMs,
  computeNodeMetrics,
  computeRate,
  evictWindow,
  MAX_EVENTS,
  pushEvent,
  ROLLING_WINDOW_MS,
};
export type { MetricsWindow, NodeEventLog, NodeMetrics, NodeMetricsSnapshot };
