import type { LevelDefinition } from "../levels/types.js";
import type { LevelConfig } from "../simulation/types.js";

const resolveEffectiveLevelConfig = (
  propLevelConfig: LevelConfig | undefined,
  currentLevel: LevelDefinition,
): LevelConfig =>
  propLevelConfig ?? {
    cacheHitRate: currentLevel.cacheHitRate,
    monthlyBudget: currentLevel.monthlyBudget,
    timeout: currentLevel.timeout,
    trafficPeak: currentLevel.trafficPeak,
    trafficStart: currentLevel.trafficStart,
    trafficTarget: currentLevel.trafficTarget,
  };

export { resolveEffectiveLevelConfig };
