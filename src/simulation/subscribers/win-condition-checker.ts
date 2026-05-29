import type { SimulationEngine } from "../simulation-engine.js";
import type { NodeMetricsSnapshot } from "../metrics.js";
import type { LevelConfig } from "../types.js";

interface WinCallbacks {
  onWin: () => void;
}

interface WinSnapshot {
  currentTrafficRate: number;
  nodeMetrics: NodeMetricsSnapshot;
  tickDeltaMs: number;
}

class WinConditionChecker {
  private readonly unsubscribe: () => void;
  private readonly levelConfig: LevelConfig;
  private sustainedNoDropTicks = 0;
  private won = false;

  constructor(engine: SimulationEngine, levelConfig: LevelConfig, callbacks: WinCallbacks) {
    this.levelConfig = levelConfig;
    this.unsubscribe = engine.subscribe(() => {
      this.run(engine.getSnapshot(), callbacks);
    });
  }

  run(snapshot: WinSnapshot, callbacks: WinCallbacks): void {
    if (this.won) {
      return;
    }

    const hasOverload = [...snapshot.nodeMetrics.values()].some((m) => m.isOverloaded);
    const atOrAboveTarget = snapshot.currentTrafficRate >= this.levelConfig.trafficTarget;

    if (atOrAboveTarget && !hasOverload) {
      this.sustainedNoDropTicks += snapshot.tickDeltaMs;
    } else {
      this.sustainedNoDropTicks = 0;
    }

    if (this.sustainedNoDropTicks >= this.levelConfig.winSustainMs) {
      this.won = true;
      callbacks.onWin();
    }
  }

  reset(): void {
    this.sustainedNoDropTicks = 0;
    this.won = false;
  }

  destroy(): void {
    this.unsubscribe();
  }
}

export { WinConditionChecker };
