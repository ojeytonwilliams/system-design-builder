import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { computeTrafficFlow, getLinearTrafficRate } from "./engine.js";
import { computeNextSimState, getInitialSnapshot } from "./simulation-store.js";
import type { SimTick, SimulationSnapshot } from "./simulation-store.js";
import type { LevelConfig } from "./types.js";

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

  tick(elapsed: number): void {
    if (this.config === null) {
      return;
    }
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
    this.step({ elapsed, rate, trafficSnapshot });
  }

  step(tick: SimTick): void {
    this.state = computeNextSimState(tick);
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
