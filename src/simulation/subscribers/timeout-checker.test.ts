import type { Mock } from "vitest";
import { SimulationEngine } from "../simulation-engine.js";
import { TimeoutChecker } from "./timeout-checker.js";
import type { LevelConfig, TrafficSnapshot } from "../types.js";

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 100,
  timeout: 60,
  trafficPeak: 100,
  trafficStart: 100,
  trafficTarget: 100,
  winSustainSeconds: 3,
};

const cleanSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 0, handledOps: 100, incomingOps: 100 },
};

const step = (engine: SimulationEngine, elapsed: number): void => {
  engine.step({ elapsed, rate: 100, trafficSnapshot: cleanSnapshot });
};

describe(TimeoutChecker, () => {
  let engine: SimulationEngine;
  let onTimeout: Mock<() => void>;
  let checker: TimeoutChecker;

  beforeEach(() => {
    engine = new SimulationEngine();
    onTimeout = vi.fn<() => void>();
    checker = new TimeoutChecker(engine, baseConfig, { onTimeout });
  });

  afterEach(() => {
    checker.destroy();
  });

  it("does not fire onTimeout before elapsed reaches the timeout", () => {
    step(engine, 59);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("fires onTimeout when elapsed reaches the timeout", () => {
    step(engine, 60);

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it("fires onTimeout exactly once", () => {
    step(engine, 60);
    step(engine, 61);

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  describe("reset", () => {
    it("allows onTimeout to fire again after reset", () => {
      step(engine, 60);
      checker.reset();
      engine.reset();
      onTimeout.mockClear();

      step(engine, 60);

      expect(onTimeout).toHaveBeenCalledOnce();
    });
  });

  describe("destroy", () => {
    it("stops receiving engine updates", () => {
      checker.destroy();
      step(engine, 60);

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
