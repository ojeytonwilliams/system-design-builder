import type { Mock } from "vitest";
import { SimulationEngine } from "../simulation-engine.js";
import { WinConditionChecker } from "./win-condition-checker.js";
import type { LevelConfig, TrafficSnapshot } from "../types.js";

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 100,
  timeout: 60,
  trafficPeak: 100,
  trafficStart: 100,
  trafficTarget: 100,
  winSustainMs: 3_000,
};

const cleanSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 0, handledOps: 100, incomingOps: 100 },
};

const overloadSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 50, handledOps: 50, incomingOps: 100 },
};

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

  const run = (snapshot: TrafficSnapshot, rate: number, tickDeltaMs = 1000): void => {
    checker.run({ currentTrafficRate: rate, nodeStates: snapshot, tickDeltaMs }, { onWin });
  };

  it("fires onWin when sustained no-drop ticks reach the threshold", () => {
    run(cleanSnapshot, 100);
    run(cleanSnapshot, 100);
    run(cleanSnapshot, 100);

    expect(onWin).toHaveBeenCalledOnce();
  });

  it("does not fire onWin before the threshold is reached", () => {
    run(cleanSnapshot, 100);
    run(cleanSnapshot, 100);

    expect(onWin).not.toHaveBeenCalled();
  });

  it("fires onWin exactly once even after continued clean ticks", () => {
    for (let i = 0; i < 5; i++) {
      run(cleanSnapshot, 100);
    }

    expect(onWin).toHaveBeenCalledOnce();
  });

  it("resets the counter when overload occurs", () => {
    run(cleanSnapshot, 100);
    run(cleanSnapshot, 100);
    run(overloadSnapshot, 100);
    run(cleanSnapshot, 100);
    run(cleanSnapshot, 100);

    expect(onWin).not.toHaveBeenCalled();
  });

  it("resets the counter when rate falls below target", () => {
    run(cleanSnapshot, 100);
    run(cleanSnapshot, 100);
    run(cleanSnapshot, 50);
    run(cleanSnapshot, 100);
    run(cleanSnapshot, 100);

    expect(onWin).not.toHaveBeenCalled();
  });

  describe("reset", () => {
    it("allows onWin to fire again after reset", () => {
      for (let i = 0; i < 3; i++) {
        run(cleanSnapshot, 100);
      }
      checker.reset();
      onWin.mockClear();

      for (let i = 0; i < 3; i++) {
        run(cleanSnapshot, 100);
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
