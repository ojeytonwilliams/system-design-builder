import type { Mock } from "vitest";
import { convertRate } from "../../domain/sim-time-converter.js";
import { SimulationEngine } from "../simulation-engine.js";
import { TimeoutChecker } from "./timeout-checker.js";
import type { LevelConfig } from "../types.js";

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 100,
  timeout: 60_000,
  trafficPeak: convertRate(0.1),
  trafficStart: convertRate(0.1),
  trafficTarget: convertRate(0.1),
  winSustainMs: 3_000,
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

  const run = (elapsedMs: number): void => {
    checker.run(elapsedMs, { onTimeout });
  };

  it("does not fire onTimeout before elapsed reaches the timeout", () => {
    run(59_000);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("fires onTimeout when elapsed reaches the timeout", () => {
    run(60_000);

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it("fires onTimeout exactly once", () => {
    run(60_000);
    run(61_000);

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  describe("reset", () => {
    it("allows onTimeout to fire again after reset", () => {
      run(60_000);
      checker.reset();
      onTimeout.mockClear();

      run(60_000);

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
