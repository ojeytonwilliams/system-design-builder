import { convertRate } from "../domain/sim-time-converter.js";
import { level1 } from "./level1.js";
import { level2 } from "./level2.js";
import { level3 } from "./level3.js";
import { level4 } from "./level4.js";
import { level5 } from "./level5.js";
import { level6 } from "./level6.js";
import type { LevelDefinition } from "./types.js";

const convertLevel = (def: LevelDefinition): LevelDefinition => ({
  ...def,
  trafficPeak: convertRate(def.trafficPeak),
  trafficStart: convertRate(def.trafficStart),
  trafficTarget: convertRate(def.trafficTarget),
});

const LEVELS: LevelDefinition[] = [level1, level2, level3, level4, level5, level6].map(
  convertLevel,
);

class LevelRegistry {
  readonly levels: LevelDefinition[];

  constructor(levels: LevelDefinition[]) {
    this.levels = levels;
  }

  getLevelById(id: string): LevelDefinition | undefined {
    return this.levels.find((l) => l.id === id);
  }

  getLevelNumber(id: string): number {
    return this.levels.findIndex((l) => l.id === id) + 1;
  }

  isLevelUnlocked(levelId: string, completedLevelIds: string[]): boolean {
    const index = this.levels.findIndex((l) => l.id === levelId);
    return this.levels.slice(0, index).every((l) => completedLevelIds.includes(l.id));
  }

  getFirstIncompleteLevel(completedLevelIds: string[]): string {
    for (const level of this.levels) {
      if (!completedLevelIds.includes(level.id)) {
        return level.id;
      }
    }
    return this.levels.at(-1)?.id ?? "";
  }
}

const levelRegistry = new LevelRegistry(LEVELS);

export { LevelRegistry, levelRegistry };
export type { LevelDefinition };
