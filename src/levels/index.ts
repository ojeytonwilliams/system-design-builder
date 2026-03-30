import { level1 } from "./level1.js";
import { level2 } from "./level2.js";
import { level3 } from "./level3.js";
import { level4 } from "./level4.js";
import { level5 } from "./level5.js";
import { level6 } from "./level6.js";
import type { LevelDefinition } from "./types.js";

const LEVELS: LevelDefinition[] = [level1, level2, level3, level4, level5, level6];

const getLevelById = (id: number): LevelDefinition | undefined => LEVELS.find((l) => l.id === id);

export { LEVELS, getLevelById };
export type { LevelDefinition };
