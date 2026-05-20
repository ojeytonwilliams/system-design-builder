import { computeTrafficFlow, getLinearTrafficRate } from "./engine.js";
import { computeNextSimState, getInitialSnapshot } from "./simulation-store.js";
import type { SimTick, SimulationSnapshot } from "./simulation-store.js";
import type { GraphEdge, GraphNode, LevelConfig } from "./types.js";

class SimulationEngine {
  private state: SimulationSnapshot = getInitialSnapshot();
  private readonly listeners = new Set<() => void>();
  private graphNodes: GraphNode[] = [];
  private graphEdges: GraphEdge[] = [];
  private config: LevelConfig | null = null;

  getSnapshot = (): SimulationSnapshot => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
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
    this.step({ elapsed, levelConfig: this.config, rate, trafficSnapshot });
  }

  step(tick: SimTick): void {
    this.state = computeNextSimState(this.state, tick);
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
