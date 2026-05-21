import type { Mock } from "vitest";
import { SimulationEngine } from "../simulation-engine.js";
import { TimeoutChecker } from "./timeout-checker.js";
import type { LevelConfig } from "../types.js";

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 100,
  timeout: 60,
  trafficPeak: 100,
  trafficStart: 100,
  trafficTarget: 100,
  winSustainSeconds: 3,
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

  const run = (elapsedSeconds: number): void => {
    checker.run(elapsedSeconds, { onTimeout });
  };

  it("does not fire onTimeout before elapsed reaches the timeout", () => {
    run(59);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("fires onTimeout when elapsed reaches the timeout", () => {
    run(60);

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it("fires onTimeout exactly once", () => {
    run(60);
    run(61);

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  describe("reset", () => {
    it("allows onTimeout to fire again after reset", () => {
      run(60);
      checker.reset();
      onTimeout.mockClear();

      run(60);

      expect(onTimeout).toHaveBeenCalledOnce();
    });
  });

  describe("destroy", () => {
    it("stops receiving engine updates", () => {
      checker.destroy();
      engine.reset();

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
