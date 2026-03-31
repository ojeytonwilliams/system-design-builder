import { LEVELS, getLevelById } from "./index.js";

describe("level definitions", () => {
  it("exports exactly 6 levels", () => {
    expect(LEVELS).toHaveLength(6);
  });

  it("levels have sequential ids from 1 to 6", () => {
    LEVELS.forEach((level, index) => {
      expect(level.id).toBe(index + 1);
    });
  });

  it("each level has a positive trafficTarget", () => {
    LEVELS.forEach((level) => {
      expect(level.trafficTarget).toBeGreaterThan(0);
    });
  });

  it("each level has a non-empty title", () => {
    LEVELS.forEach((level) => {
      expect(level.title.length).toBeGreaterThan(0);
    });
  });

  it("each level has a positive monthlyBudget", () => {
    LEVELS.forEach((level) => {
      expect(level.monthlyBudget).toBeGreaterThan(0);
    });
  });

  it("each level has at least one available component", () => {
    LEVELS.forEach((level) => {
      expect(level.availableComponents.length).toBeGreaterThan(0);
    });
  });

  it("each level has feedbackText", () => {
    LEVELS.forEach((level) => {
      expect(level.feedbackText.length).toBeGreaterThan(0);
    });
  });

  it("each level has objective text", () => {
    LEVELS.forEach((level) => {
      expect(level.objectiveText.length).toBeGreaterThan(0);
    });
  });

  it("each level has a users node in the starting layout", () => {
    LEVELS.forEach((level) => {
      expect(level.startingNodes.some((node) => node.componentType === "users")).toBe(true);
    });
  });

  it("level 1 has authored edges in the starting layout", () => {
    const level = getLevelById(1);

    expect(level?.startingEdges.length).toBeGreaterThan(0);
  });

  it("level 1 has server and db available but not users", () => {
    const level = getLevelById(1);

    expect(level?.availableComponents).toContain("server");
    expect(level?.availableComponents).toContain("db");
    expect(level?.availableComponents).not.toContain("users");
  });

  it("level 6 has cache available", () => {
    const level = getLevelById(6);

    expect(level?.availableComponents).toContain("cache");
  });

  it("level 6 has a non-zero cacheHitRate", () => {
    const level = getLevelById(6);

    expect(level?.cacheHitRate).toBeGreaterThan(0);
  });
});

describe(getLevelById, () => {
  it("returns the level with the given id", () => {
    expect(getLevelById(1)?.id).toBe(1);
    expect(getLevelById(3)?.id).toBe(3);
    expect(getLevelById(6)?.id).toBe(6);
  });

  it("returns undefined for an id that does not exist", () => {
    expect(getLevelById(0)).toBeUndefined();
    expect(getLevelById(7)).toBeUndefined();
    expect(getLevelById(99)).toBeUndefined();
  });
});
