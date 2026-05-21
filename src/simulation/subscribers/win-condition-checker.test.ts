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
  winSustainSeconds: 3,
};

const cleanSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 0, handledOps: 100, incomingOps: 100 },
};

const overloadSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 50, handledOps: 50, incomingOps: 100 },
};

const step = (
  engine: SimulationEngine,
  snapshot: TrafficSnapshot,
  rate: number,
  elapsed = 1,
): void => {
  engine.step({ elapsed, rate, trafficSnapshot: snapshot });
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

  it("fires onWin when sustained no-drop ticks reach the threshold", () => {
    step(engine, cleanSnapshot, 100, 1);
    step(engine, cleanSnapshot, 100, 2);
    step(engine, cleanSnapshot, 100, 3);

    expect(onWin).toHaveBeenCalledOnce();
  });

  it("does not fire onWin before the threshold is reached", () => {
    step(engine, cleanSnapshot, 100, 1);
    step(engine, cleanSnapshot, 100, 2);

    expect(onWin).not.toHaveBeenCalled();
  });

  it("fires onWin exactly once even after continued clean ticks", () => {
    for (let i = 1; i <= 5; i++) {
      step(engine, cleanSnapshot, 100, i);
    }

    expect(onWin).toHaveBeenCalledOnce();
  });

  it("resets the counter when overload occurs", () => {
    step(engine, cleanSnapshot, 100, 1);
    step(engine, cleanSnapshot, 100, 2);
    step(engine, overloadSnapshot, 100, 3);
    step(engine, cleanSnapshot, 100, 4);
    step(engine, cleanSnapshot, 100, 5);

    expect(onWin).not.toHaveBeenCalled();
  });

  it("resets the counter when rate falls below target", () => {
    step(engine, cleanSnapshot, 100, 1);
    step(engine, cleanSnapshot, 100, 2);
    step(engine, cleanSnapshot, 50, 3);
    step(engine, cleanSnapshot, 100, 4);
    step(engine, cleanSnapshot, 100, 5);

    expect(onWin).not.toHaveBeenCalled();
  });

  describe("reset", () => {
    it("allows onWin to fire again after reset", () => {
      for (let i = 1; i <= 3; i++) {
        step(engine, cleanSnapshot, 100, i);
      }
      checker.reset();
      onWin.mockClear();

      for (let i = 4; i <= 6; i++) {
        step(engine, cleanSnapshot, 100, i);
      }

      expect(onWin).toHaveBeenCalledOnce();
    });
  });

  describe("destroy", () => {
    it("stops receiving engine updates", () => {
      checker.destroy();

      for (let i = 1; i <= 3; i++) {
        step(engine, cleanSnapshot, 100, i);
      }

      expect(onWin).not.toHaveBeenCalled();
    });
  });
});
