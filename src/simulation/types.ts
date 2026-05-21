interface NodeTrafficState {
  droppedOps: number;
  handledOps: number;
  incomingOps: number;
}

type TrafficSnapshot = Record<string, NodeTrafficState>;

interface LevelConfig {
  cacheHitRate: number;
  monthlyBudget: number;
  timeout: number;
  trafficPeak: number;
  trafficStart: number;
  trafficTarget: number;
  winSustainMs: number;
}

interface FlowConfig {
  cacheHitRate: number;
  trafficRate: number;
}

export type { FlowConfig, LevelConfig, TrafficSnapshot };
