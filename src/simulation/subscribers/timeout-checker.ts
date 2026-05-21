import type { SimulationEngine } from "../simulation-engine.js";
import type { LevelConfig } from "../types.js";

interface TimeoutCallbacks {
  onTimeout: () => void;
}

class TimeoutChecker {
  private readonly unsubscribe: () => void;
  private timedOut = false;

  constructor(engine: SimulationEngine, levelConfig: LevelConfig, callbacks: TimeoutCallbacks) {
    this.unsubscribe = engine.subscribe(() => {
      if (this.timedOut) {
        return;
      }

      const { elapsedSeconds } = engine.getSnapshot();

      if (elapsedSeconds >= levelConfig.timeout) {
        this.timedOut = true;
        callbacks.onTimeout();
      }
    });
  }

  reset(): void {
    this.timedOut = false;
  }

  destroy(): void {
    this.unsubscribe();
  }
}

export { TimeoutChecker };
