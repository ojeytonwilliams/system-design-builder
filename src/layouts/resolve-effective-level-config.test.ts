import { level1 } from "../levels/level1.js";
import type { LevelConfig } from "../simulation/types.js";
import { resolveEffectiveLevelConfig } from "./resolve-effective-level-config.js";

const propConfig: LevelConfig = {
  cacheHitRate: 0.5,
  monthlyBudget: 999,
  timeout: 30,
  trafficPeak: 200,
  trafficStart: 100,
  trafficTarget: 150,
};

describe("effective level config resolution", () => {
  it("returns propLevelConfig unchanged when provided", () => {
    expect(resolveEffectiveLevelConfig(propConfig, level1)).toBe(propConfig);
  });

  it("derives config from currentLevel when propLevelConfig is undefined", () => {
    const result = resolveEffectiveLevelConfig(undefined, level1);

    expect(result).toStrictEqual({
      cacheHitRate: level1.cacheHitRate,
      monthlyBudget: level1.monthlyBudget,
      timeout: level1.timeout,
      trafficPeak: level1.trafficPeak,
      trafficStart: level1.trafficStart,
      trafficTarget: level1.trafficTarget,
    });
  });
});
