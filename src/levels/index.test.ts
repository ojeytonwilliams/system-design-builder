import { LEVELS, getLevelById } from "./index.js";

describe("level definitions", () => {
  it("exports exactly 6 levels", () => {
    expect(LEVELS).toHaveLength(6);
  });

  it("each level has a unique string id", () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expectTypeOf(id).toBeString());
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
    const level = getLevelById(LEVELS[0]!.id);

    expect(level?.startingEdges.length).toBeGreaterThan(0);
  });

  it("level 1 has server and db available but not users", () => {
    const level = getLevelById(LEVELS[0]!.id);

    expect(level?.availableComponents).toContain("server");
    expect(level?.availableComponents).toContain("db");
    expect(level?.availableComponents).not.toContain("users");
  });

  it("level 6 has cache available", () => {
    const level = getLevelById(LEVELS[5]!.id);

    expect(level?.availableComponents).toContain("cache");
  });

  it("level 6 has a non-zero cacheHitRate", () => {
    const level = getLevelById(LEVELS[5]!.id);

    expect(level?.cacheHitRate).toBeGreaterThan(0);
  });
});

describe(getLevelById, () => {
  it("returns the level with the given id", () => {
    LEVELS.forEach((level) => {
      expect(getLevelById(level.id)?.id).toBe(level.id);
    });
  });

  it("returns undefined for an id that does not exist", () => {
    expect(getLevelById("")).toBeUndefined();
    expect(getLevelById("nonexistent")).toBeUndefined();
  });
});
