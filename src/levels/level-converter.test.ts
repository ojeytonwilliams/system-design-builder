import { convertLevel } from "./level-converter.js";
import type { LevelDefinition } from "./types.js";

const baseDef: LevelDefinition = {
  availableComponents: ["server"],
  cacheHitRate: 0,
  coachMessages: [],
  componentUnlocks: [],
  feedbackText: [],
  id: "test",
  lockedNodeIds: [],
  monthlyBudget: 100,
  objectiveText: "",
  solutions: [],
  startingEdges: [],
  startingNodes: [],
  timeout: 10_000,
  title: "Test",
  trafficPeak: 0.1,
  trafficStart: 0.05,
  trafficTarget: 0.08,
  winSustainMs: 3_000,
};

describe(convertLevel, () => {
  it("does not convert the timeout field", () => {
    const converted = convertLevel(baseDef);

    expect(converted.timeout).toBe(baseDef.timeout);
  });

  it("converts trafficPeak, trafficStart, and trafficTarget", () => {
    const converted = convertLevel(baseDef);

    expect(converted.trafficPeak).not.toBe(baseDef.trafficPeak);
    expect(converted.trafficStart).not.toBe(baseDef.trafficStart);
    expect(converted.trafficTarget).not.toBe(baseDef.trafficTarget);
  });
});
