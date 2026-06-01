import type { LevelDefinition } from "../levels/types.js";
import { convertLevel } from "./level-converter.js";

const stubLevel: LevelDefinition = {
  availableComponents: [],
  cacheHitRate: 0.5,
  coachMessages: [],
  componentUnlocks: [],
  feedbackText: [],
  id: "test",
  lockedNodeIds: [],
  monthlyBudget: 500,
  objectiveText: "Test level",
  startingEdges: [],
  startingNodes: [],
  timeout: 60_000,
  title: "Test",
  trafficPeak: 0.07,
  trafficStart: 0.05,
  trafficTarget: 0.07,
  winSustainMs: 10_000,
};

describe(convertLevel, () => {
  it("applies convertRate to trafficPeak", () => {
    const config = convertLevel(stubLevel);
    expect(config.trafficPeak).toBeCloseTo(0.0007);
  });

  it("applies convertRate to trafficStart", () => {
    const config = convertLevel(stubLevel);
    expect(config.trafficStart).toBeCloseTo(0.0005);
  });

  it("applies convertRate to trafficTarget", () => {
    const config = convertLevel(stubLevel);
    expect(config.trafficTarget).toBeCloseTo(0.0007);
  });

  it("passes cacheHitRate through unchanged", () => {
    const config = convertLevel(stubLevel);
    expect(config.cacheHitRate).toBe(0.5);
  });

  it("passes monthlyBudget through unchanged", () => {
    const config = convertLevel(stubLevel);
    expect(config.monthlyBudget).toBe(500);
  });

  it("passes timeout through unchanged", () => {
    const config = convertLevel(stubLevel);
    expect(config.timeout).toBe(60_000);
  });

  it("passes winSustainMs through unchanged", () => {
    const config = convertLevel(stubLevel);
    expect(config.winSustainMs).toBe(10_000);
  });
});
