import type { ComponentType } from "../components/component-library.js";

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphNode {
  capacity: number;
  id: string;
  type: ComponentType;
}

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
}

interface FlowConfig {
  cacheHitRate: number;
  trafficRate: number;
}

type SimulationMode = "DESIGN" | "SIMULATE";

export type {
  FlowConfig,
  GraphEdge,
  GraphNode,
  LevelConfig,
  NodeTrafficState,
  SimulationMode,
  TrafficSnapshot,
};
