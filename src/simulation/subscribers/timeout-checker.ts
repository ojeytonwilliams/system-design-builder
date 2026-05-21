import type { SimulationEngine } from "../simulation-engine.js";
import type { LevelConfig } from "../types.js";

interface TimeoutCallbacks {
  onTimeout: () => void;
}

class TimeoutChecker {
  private readonly unsubscribe: () => void;
  private readonly levelConfig: LevelConfig;
  private timedOut = false;

  constructor(engine: SimulationEngine, levelConfig: LevelConfig, callbacks: TimeoutCallbacks) {
    this.levelConfig = levelConfig;
    this.unsubscribe = engine.subscribe(() => {
      this.run(engine.getSnapshot().elapsedSeconds, callbacks);
    });
  }

  run(elapsedSeconds: number, callbacks: TimeoutCallbacks): void {
    if (this.timedOut) {
      return;
    }

    if (elapsedSeconds >= this.levelConfig.timeout) {
      this.timedOut = true;
      callbacks.onTimeout();
    }
  }

  reset(): void {
    this.timedOut = false;
  }

  destroy(): void {
    this.unsubscribe();
  }
}

export { TimeoutChecker };
