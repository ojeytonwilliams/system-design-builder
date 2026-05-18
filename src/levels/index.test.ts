import { LevelRegistry, levelRegistry } from "./index.js";
import { testLevels } from "./test-fixtures.js";

describe("level definitions", () => {
  it("each level has a unique string id", () => {
    const ids = levelRegistry.levels.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expectTypeOf(id).toBeString());
  });

  it("each level has a positive trafficTarget", () => {
    levelRegistry.levels.forEach((level) => {
      expect(level.trafficTarget).toBeGreaterThan(0);
    });
  });

  it("each level has a non-empty title", () => {
    levelRegistry.levels.forEach((level) => {
      expect(level.title.length).toBeGreaterThan(0);
    });
  });

  it("each level has a positive monthlyBudget", () => {
    levelRegistry.levels.forEach((level) => {
      expect(level.monthlyBudget).toBeGreaterThan(0);
    });
  });

  it("each level has at least one available component", () => {
    levelRegistry.levels.forEach((level) => {
      expect(level.availableComponents.length).toBeGreaterThan(0);
    });
  });

  it("each level has feedbackText", () => {
    levelRegistry.levels.forEach((level) => {
      expect(level.feedbackText.length).toBeGreaterThan(0);
    });
  });

  it("each level has objective text", () => {
    levelRegistry.levels.forEach((level) => {
      expect(level.objectiveText.length).toBeGreaterThan(0);
    });
  });

  it("each level has a users node in the starting layout", () => {
    levelRegistry.levels.forEach((level) => {
      expect(level.startingNodes.some((node) => node.componentType === "users")).toBe(true);
    });
  });
});

describe(LevelRegistry, () => {
  const registry = new LevelRegistry(testLevels);

  describe("getLevelById", () => {
    it("returns the level with the given id", () => {
      testLevels.forEach((level) => {
        expect(registry.getLevelById(level.id)?.id).toBe(level.id);
      });
    });

    it("returns undefined for an id that does not exist", () => {
      expect(registry.getLevelById("")).toBeUndefined();
      expect(registry.getLevelById("nonexistent")).toBeUndefined();
    });
  });

  describe("getLevelNumber", () => {
    it("returns the correct 1-based position for each level", () => {
      testLevels.forEach((level, index) => {
        expect(registry.getLevelNumber(level.id)).toBe(index + 1);
      });
    });

    it("returns 0 for an unknown id", () => {
      expect(registry.getLevelNumber("nonexistent")).toBe(0);
    });
  });

  describe("getFirstIncompleteLevel", () => {
    it("returns the first level when nothing is completed", () => {
      expect(registry.getFirstIncompleteLevel([])).toBe(testLevels[0]!.id);
    });

    it("returns the second level when only the first is completed", () => {
      expect(registry.getFirstIncompleteLevel([testLevels[0]!.id])).toBe(testLevels[1]!.id);
    });

    it("returns the last level when all but the last are completed", () => {
      const allButLast = testLevels.slice(0, -1).map((l) => l.id);
      expect(registry.getFirstIncompleteLevel(allButLast)).toBe(testLevels.at(-1)!.id);
    });

    it("returns the last level when all levels are completed", () => {
      const allIds = testLevels.map((l) => l.id);
      expect(registry.getFirstIncompleteLevel(allIds)).toBe(testLevels.at(-1)!.id);
    });
  });

  describe("isLevelUnlocked", () => {
    it("first level is always unlocked", () => {
      expect(registry.isLevelUnlocked(testLevels[0]!.id, [])).toBe(true);
    });

    it("second level is unlocked when first is completed", () => {
      expect(registry.isLevelUnlocked(testLevels[1]!.id, [testLevels[0]!.id])).toBe(true);
    });

    it("second level is locked when first is not completed", () => {
      expect(registry.isLevelUnlocked(testLevels[1]!.id, [])).toBe(false);
    });

    it("a level is unlocked when all prior levels are completed", () => {
      const firstTwoIds = testLevels.slice(0, 2).map((l) => l.id);
      expect(registry.isLevelUnlocked(testLevels[2]!.id, firstTwoIds)).toBe(true);
    });

    it("a level is locked when any prior level is not completed", () => {
      expect(registry.isLevelUnlocked(testLevels[2]!.id, [testLevels[0]!.id])).toBe(false);
    });
  });
});
