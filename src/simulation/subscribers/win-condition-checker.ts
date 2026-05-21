import type { SimulationEngine } from "../simulation-engine.js";
import { TICK_INTERVAL_MS } from "../simulation-loop.js";
import type { LevelConfig, TrafficSnapshot } from "../types.js";

interface WinCallbacks {
  onWin: () => void;
}

interface WinSnapshot {
  currentTrafficRate: number;
  nodeStates: TrafficSnapshot;
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

    const hasOverload = Object.values(snapshot.nodeStates).some((s) => s.droppedOps > 0);
    const atOrAboveTarget = snapshot.currentTrafficRate >= this.levelConfig.trafficTarget;

    if (atOrAboveTarget && !hasOverload) {
      this.sustainedNoDropTicks += TICK_INTERVAL_MS;
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
