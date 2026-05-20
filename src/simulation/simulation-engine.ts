import { computeNextSimState, getInitialSnapshot } from "./simulation-store.js";
import type { SimTick, SimulationSnapshot } from "./simulation-store.js";

class SimulationEngine {
  private state: SimulationSnapshot = getInitialSnapshot();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): SimulationSnapshot => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

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

const simulationEngine = new SimulationEngine();

export { simulationEngine, SimulationEngine };
