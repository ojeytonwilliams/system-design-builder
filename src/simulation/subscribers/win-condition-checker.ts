import type { SimulationEngine } from "../simulation-engine.js";
import type { NodeMetricsSnapshot } from "../metrics.js";

interface WinCallbacks {
  onWin: () => void;
}

interface WinSnapshot {
  currentTrafficRate: number;
  nodeMetrics: NodeMetricsSnapshot;
  tickDeltaMs: number;
}

interface WinConditionCheckerConfig {
  trafficTarget: number;
  winSustainMs: number;
}

class WinConditionChecker {
  private readonly unsubscribe: () => void;
  private readonly config: WinConditionCheckerConfig;
  private sustainedNoDropTicks = 0;
  private won = false;

  constructor(
    engine: SimulationEngine,
    levelConfig: WinConditionCheckerConfig,
    callbacks: WinCallbacks,
  ) {
    this.config = levelConfig;
    this.unsubscribe = engine.subscribe(() => {
      this.run(engine.getSnapshot(), callbacks);
    });
  }

  run(snapshot: WinSnapshot, callbacks: WinCallbacks): void {
    if (this.won) {
      return;
    }

    const hasOverload = [...snapshot.nodeMetrics.values()].some((m) => m.isOverloaded);
    const atOrAboveTarget = snapshot.currentTrafficRate >= this.config.trafficTarget;

    if (atOrAboveTarget && !hasOverload) {
      this.sustainedNoDropTicks += snapshot.tickDeltaMs;
    } else {
      this.sustainedNoDropTicks = 0;
    }

    if (this.sustainedNoDropTicks >= this.config.winSustainMs) {
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
