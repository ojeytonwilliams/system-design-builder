import { updateOverloadDurations } from "../unlocks.js";
import type { OverloadDurations } from "../unlocks.js";
import type { SimulationEngine } from "../simulation-engine.js";
import type { NodeMetricsSnapshot } from "../metrics.js";

interface OverloadEventCallbacks {
  onOverloadResolved: () => void;
  onOverloadStarted: () => void;
}

class OverloadEventDetector {
  private readonly unsubscribe: () => void;
  private prevHasOverload = false;
  private overloadDurations: OverloadDurations = new Map();

  constructor(engine: SimulationEngine, callbacks: OverloadEventCallbacks) {
    this.unsubscribe = engine.subscribe(() => {
      const { nodeMetrics, tickDeltaMs } = engine.getSnapshot();
      this.run(nodeMetrics, callbacks, tickDeltaMs);
    });
  }

  run(nodeMetrics: NodeMetricsSnapshot, callbacks: OverloadEventCallbacks, deltaMs: number): void {
    const hasOverload = [...nodeMetrics.values()].some((m) => m.isOverloaded);

    if (hasOverload && !this.prevHasOverload) {
      callbacks.onOverloadStarted();
    } else if (!hasOverload && this.prevHasOverload) {
      callbacks.onOverloadResolved();
    }

    this.overloadDurations = updateOverloadDurations(this.overloadDurations, nodeMetrics, deltaMs);
    this.prevHasOverload = hasOverload;
  }

  getOverloadDurations(): OverloadDurations {
    return this.overloadDurations;
  }

  reset(): void {
    this.prevHasOverload = false;
    this.overloadDurations = new Map();
  }

  destroy(): void {
    this.unsubscribe();
  }
}

export { OverloadEventDetector };
