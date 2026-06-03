import type { Mock } from "vitest";
import { convertRate } from "../../domain/sim-time-converter.js";
import { SimulationEngine } from "../simulation-engine.js";
import { WinConditionChecker } from "./win-condition-checker.js";
import type { NodeMetricsSnapshot } from "../metrics.js";
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

const cleanMetrics: NodeMetricsSnapshot = new Map([
  ["server-1", { incomingOpsPerMs: 10, isOverloaded: false, opsPerMs: 10 }],
]);

const overloadMetrics: NodeMetricsSnapshot = new Map([
  ["server-1", { incomingOpsPerMs: 60, isOverloaded: true, opsPerMs: 30 }],
]);

describe(WinConditionChecker, () => {
  let engine: SimulationEngine;
  let onWin: Mock<() => void>;
  let checker: WinConditionChecker;

  beforeEach(() => {
    engine = new SimulationEngine();
    onWin = vi.fn<() => void>();
    checker = new WinConditionChecker(engine, baseConfig, { onWin });
  });

  afterEach(() => {
    checker.destroy();
  });

  const run = (nodeMetrics: NodeMetricsSnapshot, rate: number, tickDeltaMs = 1000): void => {
    checker.run({ currentTrafficRate: rate, nodeMetrics, tickDeltaMs }, { onWin });
  };

  describe("win condition checking", () => {
    it("fires onWin when sustained no-drop ticks reach the threshold", () => {
      run(cleanMetrics, convertRate(0.1));
      run(cleanMetrics, convertRate(0.1));
      run(cleanMetrics, convertRate(0.1));

      expect(onWin).toHaveBeenCalledOnce();
    });

    it("does not fire onWin before the threshold is reached", () => {
      run(cleanMetrics, convertRate(0.1));
      run(cleanMetrics, convertRate(0.1));

      expect(onWin).not.toHaveBeenCalled();
    });

    it("fires onWin exactly once even after continued clean ticks", () => {
      for (let i = 0; i < 5; i++) {
        run(cleanMetrics, convertRate(0.1));
      }

      expect(onWin).toHaveBeenCalledOnce();
    });
  });

  it("resets the counter when overload occurs", () => {
    run(cleanMetrics, convertRate(0.1));
    run(cleanMetrics, convertRate(0.1));
    run(overloadMetrics, convertRate(0.1));
    run(cleanMetrics, convertRate(0.1));
    run(cleanMetrics, convertRate(0.1));

    expect(onWin).not.toHaveBeenCalled();
  });

  it("resets the counter when rate falls below target", () => {
    run(cleanMetrics, convertRate(0.1));
    run(cleanMetrics, convertRate(0.1));
    run(cleanMetrics, convertRate(0.05));
    run(cleanMetrics, convertRate(0.1));
    run(cleanMetrics, convertRate(0.1));

    expect(onWin).not.toHaveBeenCalled();
  });

  describe("reset", () => {
    it("allows onWin to fire again after reset", () => {
      for (let i = 0; i < 3; i++) {
        run(cleanMetrics, convertRate(0.1));
      }
      checker.reset();
      onWin.mockClear();

      for (let i = 0; i < 3; i++) {
        run(cleanMetrics, convertRate(0.1));
      }

      expect(onWin).toHaveBeenCalledOnce();
    });
  });

  describe("destroy", () => {
    it("stops receiving engine updates", () => {
      checker.destroy();
      engine.reset();

      expect(onWin).not.toHaveBeenCalled();
    });
  });
});
