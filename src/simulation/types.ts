import type { NodeMetrics, NodeMetricsSnapshot } from "./metrics.js";

interface LevelConfig {
  cacheHitRate: number;
  monthlyBudget: number;
  timeout: number;
  trafficPeak: number;
  trafficStart: number;
  trafficTarget: number;
  winSustainMs: number;
}

export type { LevelConfig, NodeMetrics, NodeMetricsSnapshot };
