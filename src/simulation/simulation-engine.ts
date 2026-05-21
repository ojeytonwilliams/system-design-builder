import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { computeTrafficFlow, getLinearTrafficRate } from "./engine.js";
import type { LevelConfig, TrafficSnapshot } from "./types.js";

interface SimulationSnapshot {
  currentTrafficRate: number;
  elapsedMs: number;
  nodeStates: TrafficSnapshot;
}

const getInitialSnapshot = (): SimulationSnapshot => ({
  currentTrafficRate: 0,
  elapsedMs: 0,
  nodeStates: {},
});

class SimulationEngine {
  private state: SimulationSnapshot = getInitialSnapshot();
  private readonly listeners = new Set<() => void>();
  private graphNodes: ArchitectureNode[] = [];
  private graphEdges: ArchitectureEdge[] = [];
  private config: LevelConfig | null = null;

  getSnapshot = (): SimulationSnapshot => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setGraph(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): void {
    this.graphNodes = nodes;
    this.graphEdges = edges;
  }

  setConfig(config: LevelConfig): void {
    this.config = config;
  }

  tick(deltaMs: number): void {
    if (this.config === null) {
      return;
    }
    const elapsed = this.state.elapsedMs + deltaMs / 1000;
    const rate = getLinearTrafficRate({
      elapsed,
      timeout: this.config.timeout,
      trafficPeak: this.config.trafficPeak,
      trafficStart: this.config.trafficStart,
    });
    const trafficSnapshot = computeTrafficFlow(this.graphNodes, this.graphEdges, {
      cacheHitRate: this.config.cacheHitRate,
      trafficRate: rate,
    });
    this.state = {
      currentTrafficRate: rate,
      elapsedMs: elapsed,
      nodeStates: trafficSnapshot,
    };
    this.notify();
  }

  reset(): void {
    this.state = getInitialSnapshot();
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export { SimulationEngine };
export type { SimulationSnapshot };
