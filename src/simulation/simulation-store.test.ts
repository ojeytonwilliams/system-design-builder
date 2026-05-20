import { computeNextSimState } from "./simulation-store.js";
import type { SimulationSnapshot } from "./simulation-store.js";
import type { LevelConfig, TrafficSnapshot } from "./types.js";

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 100,
  timeout: 60,
  trafficPeak: 100,
  trafficStart: 100,
  trafficTarget: 100,
  winSustainSeconds: 3,
};

const noDropSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 0, handledOps: 100, incomingOps: 100 },
};

const overloadSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 50, handledOps: 50, incomingOps: 100 },
};

const initial: SimulationSnapshot = {
  currentTrafficRate: 0,
  elapsedSeconds: 0,
  hasOverload: false,
  isTimedOut: false,
  isWon: false,
  nodeStates: {},
  overloadDurations: new Map(),
  overloadEvent: null,
  sustainedNoDropSeconds: 0,
};

describe(computeNextSimState, () => {
  it("updates currentTrafficRate and nodeStates from the tick params", () => {
    const result = computeNextSimState(initial, {
      elapsed: 1,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: noDropSnapshot,
    });

    expect(result.currentTrafficRate).toBe(100);
    expect(result.nodeStates).toBe(noDropSnapshot);
  });

  it("increments sustainedNoDropSeconds when at target with no overload", () => {
    const result = computeNextSimState(initial, {
      elapsed: 1,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: noDropSnapshot,
    });

    expect(result.sustainedNoDropSeconds).toBe(1);
  });

  it("resets sustainedNoDropSeconds to 0 when there is overload", () => {
    const prev = { ...initial, sustainedNoDropSeconds: 2 };
    const result = computeNextSimState(prev, {
      elapsed: 1,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: overloadSnapshot,
    });

    expect(result.sustainedNoDropSeconds).toBe(0);
  });

  it("resets sustainedNoDropSeconds to 0 when rate is below target", () => {
    const prev = { ...initial, sustainedNoDropSeconds: 2 };
    const result = computeNextSimState(prev, {
      elapsed: 1,
      levelConfig: baseConfig,
      rate: 50,
      trafficSnapshot: noDropSnapshot,
    });

    expect(result.sustainedNoDropSeconds).toBe(0);
  });

  it("sets isWon when sustainedNoDropSeconds reaches winSustainSeconds", () => {
    const prev = { ...initial, sustainedNoDropSeconds: 2 };
    const result = computeNextSimState(prev, {
      elapsed: 1,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: noDropSnapshot,
    });

    expect(result.sustainedNoDropSeconds).toBe(3);
    expect(result.isWon).toBe(true);
  });

  it("does not set isWon before the threshold is reached", () => {
    const prev = { ...initial, sustainedNoDropSeconds: 1 };
    const result = computeNextSimState(prev, {
      elapsed: 1,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: noDropSnapshot,
    });

    expect(result.sustainedNoDropSeconds).toBe(2);
    expect(result.isWon).toBe(false);
  });

  it("sets isTimedOut and preserves other state when elapsed reaches timeout", () => {
    const prev = { ...initial, sustainedNoDropSeconds: 2 };
    const result = computeNextSimState(prev, {
      elapsed: 60,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: noDropSnapshot,
    });

    expect(result.isTimedOut).toBe(true);
    expect(result.sustainedNoDropSeconds).toBe(2);
    expect(result.isWon).toBe(false);
  });

  it("sets overloadEvent to STARTED on the first tick with dropped ops", () => {
    const result = computeNextSimState(initial, {
      elapsed: 1,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: overloadSnapshot,
    });

    expect(result.overloadEvent).toBe("STARTED");
    expect(result.hasOverload).toBe(true);
  });

  it("sets overloadEvent to null on subsequent ticks with overload", () => {
    const prev = { ...initial, hasOverload: true };
    const result = computeNextSimState(prev, {
      elapsed: 2,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: overloadSnapshot,
    });

    expect(result.overloadEvent).toBeNull();
  });

  it("sets overloadEvent to RESOLVED when overload clears", () => {
    const prev = { ...initial, hasOverload: true };
    const result = computeNextSimState(prev, {
      elapsed: 2,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: noDropSnapshot,
    });

    expect(result.overloadEvent).toBe("RESOLVED");
    expect(result.hasOverload).toBe(false);
  });

  it("accumulates overloadDurations for nodes that drop ops", () => {
    const result = computeNextSimState(initial, {
      elapsed: 1,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: overloadSnapshot,
    });

    expect(result.overloadDurations.get("server-1")).toBe(1);
  });

  it("increments overloadDurations on sustained overload", () => {
    const prev = {
      ...initial,
      hasOverload: true,
      overloadDurations: new Map([["server-1", 1]]),
    };
    const result = computeNextSimState(prev, {
      elapsed: 2,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: overloadSnapshot,
    });

    expect(result.overloadDurations.get("server-1")).toBe(2);
  });

  it("removes an entry from overloadDurations when the node recovers", () => {
    const prev = {
      ...initial,
      hasOverload: true,
      overloadDurations: new Map([["server-1", 3]]),
    };
    const result = computeNextSimState(prev, {
      elapsed: 2,
      levelConfig: baseConfig,
      rate: 100,
      trafficSnapshot: noDropSnapshot,
    });

    expect(result.overloadDurations.has("server-1")).toBe(false);
  });
});
