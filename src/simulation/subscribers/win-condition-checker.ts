import type { SimulationEngine } from "../simulation-engine.js";
import type { LevelConfig } from "../types.js";

interface WinCallbacks {
  onWin: () => void;
}

class WinConditionChecker {
  private readonly unsubscribe: () => void;
  private sustainedNoDropTicks = 0;
  private won = false;

  constructor(engine: SimulationEngine, levelConfig: LevelConfig, callbacks: WinCallbacks) {
    this.unsubscribe = engine.subscribe(() => {
      if (this.won) {
        return;
      }

      const { currentTrafficRate, nodeStates } = engine.getSnapshot();
      const hasOverload = Object.values(nodeStates).some((s) => s.droppedOps > 0);
      const atOrAboveTarget = currentTrafficRate >= levelConfig.trafficTarget;

      if (atOrAboveTarget && !hasOverload) {
        this.sustainedNoDropTicks++;
      } else {
        this.sustainedNoDropTicks = 0;
      }

      if (this.sustainedNoDropTicks >= levelConfig.winSustainSeconds) {
        this.won = true;
        callbacks.onWin();
      }
    });
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
