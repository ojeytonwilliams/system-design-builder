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

interface TrafficScheduleEntry {
  opsPerSec: number;
  startTime: number;
}

interface LevelConfig {
  cacheHitRate: number;
  revenueTarget: number;
  timeout: number;
  trafficSchedule: TrafficScheduleEntry[];
}

interface FlowConfig {
  cacheHitRate: number;
  trafficRate: number;
}

interface RevenueConfig {
  cacheHitRate: number;
  edges: GraphEdge[];
}

type SimulationMode = "DESIGN" | "SIMULATE";

export type {
  FlowConfig,
  GraphEdge,
  GraphNode,
  LevelConfig,
  NodeTrafficState,
  RevenueConfig,
  SimulationMode,
  TrafficScheduleEntry,
  TrafficSnapshot,
};
