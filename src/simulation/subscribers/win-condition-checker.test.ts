import type { Mock } from "vitest";
import { SimulationEngine } from "../simulation-engine.js";
import { WinConditionChecker } from "./win-condition-checker.js";
import type { NodeMetricsSnapshot } from "../metrics.js";
import type { LevelConfig } from "../types.js";

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 100,
  timeout: 60,
  trafficPeak: 100,
  trafficStart: 100,
  trafficTarget: 100,
  winSustainMs: 3_000,
};

const cleanMetrics: NodeMetricsSnapshot = new Map([
  ["server-1", { incomingOpsPerSec: 10, isOverloaded: false, opsPerSec: 10 }],
]);

const overloadMetrics: NodeMetricsSnapshot = new Map([
  ["server-1", { incomingOpsPerSec: 60, isOverloaded: true, opsPerSec: 30 }],
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

  it("fires onWin when sustained no-drop ticks reach the threshold", () => {
    run(cleanMetrics, 100);
    run(cleanMetrics, 100);
    run(cleanMetrics, 100);

    expect(onWin).toHaveBeenCalledOnce();
  });

  it("does not fire onWin before the threshold is reached", () => {
    run(cleanMetrics, 100);
    run(cleanMetrics, 100);

    expect(onWin).not.toHaveBeenCalled();
  });

  it("fires onWin exactly once even after continued clean ticks", () => {
    for (let i = 0; i < 5; i++) {
      run(cleanMetrics, 100);
    }

    expect(onWin).toHaveBeenCalledOnce();
  });

  it("resets the counter when overload occurs", () => {
    run(cleanMetrics, 100);
    run(cleanMetrics, 100);
    run(overloadMetrics, 100);
    run(cleanMetrics, 100);
    run(cleanMetrics, 100);

    expect(onWin).not.toHaveBeenCalled();
  });

  it("resets the counter when rate falls below target", () => {
    run(cleanMetrics, 100);
    run(cleanMetrics, 100);
    run(cleanMetrics, 50);
    run(cleanMetrics, 100);
    run(cleanMetrics, 100);

    expect(onWin).not.toHaveBeenCalled();
  });

  describe("reset", () => {
    it("allows onWin to fire again after reset", () => {
      for (let i = 0; i < 3; i++) {
        run(cleanMetrics, 100);
      }
      checker.reset();
      onWin.mockClear();

      for (let i = 0; i < 3; i++) {
        run(cleanMetrics, 100);
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
