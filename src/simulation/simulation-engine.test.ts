import { SimulationEngine } from "./simulation-engine.js";
import type { SimTick } from "./simulation-store.js";
import type { GraphNode, LevelConfig, TrafficSnapshot } from "./types.js";

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

const baseTick: SimTick = {
  elapsed: 1,
  levelConfig: baseConfig,
  rate: 100,
  trafficSnapshot: noDropSnapshot,
};

describe(SimulationEngine, () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
  });

  it("getSnapshot returns initial state before any steps", () => {
    const snap = engine.getSnapshot();

    expect(snap.elapsedSeconds).toBe(0);
    expect(snap.isWon).toBe(false);
    expect(snap.isTimedOut).toBe(false);
    expect(snap.nodeStates).toStrictEqual({});
    expect(snap.sustainedNoDropSeconds).toBe(0);
  });

  it("step() updates the snapshot", () => {
    engine.step(baseTick);
    const snap = engine.getSnapshot();

    expect(snap.elapsedSeconds).toBe(1);
    expect(snap.currentTrafficRate).toBe(100);
    expect(snap.nodeStates).toBe(noDropSnapshot);
  });

  it("step() notifies subscribers synchronously", () => {
    const calls: number[] = [];
    engine.subscribe(() => {
      calls.push(engine.getSnapshot().elapsedSeconds);
    });

    engine.step(baseTick);
    engine.step({ ...baseTick, elapsed: 2 });

    expect(calls).toStrictEqual([1, 2]);
  });

  it("subscribe() returns an unsubscribe function that stops notifications", () => {
    const listener = vi.fn<() => void>();
    const unsubscribe = engine.subscribe(listener);

    unsubscribe();
    engine.step(baseTick);

    expect(listener).not.toHaveBeenCalled();
  });

  it("reset() restores the initial state", () => {
    engine.step(baseTick);
    engine.reset();
    const snap = engine.getSnapshot();

    expect(snap.elapsedSeconds).toBe(0);
    expect(snap.nodeStates).toStrictEqual({});
  });

  it("reset() notifies subscribers", () => {
    const listener = vi.fn<() => void>();
    engine.subscribe(listener);

    engine.reset();

    expect(listener).toHaveBeenCalledOnce();
  });

  it("getSnapshot returns a new reference after step()", () => {
    const before = engine.getSnapshot();
    engine.step(baseTick);
    const after = engine.getSnapshot();

    expect(before).not.toBe(after);
  });

  it("getSnapshot returns the same reference between steps", () => {
    engine.step(baseTick);
    const first = engine.getSnapshot();
    const second = engine.getSnapshot();

    expect(first).toBe(second);
  });
});

describe("tick", () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
  });

  it("is a no-op when config has not been set", () => {
    engine.setGraph([], []);
    engine.tick(1);

    expect(engine.getSnapshot().elapsedSeconds).toBe(0);
  });

  it("updates elapsed when config and graph are set", () => {
    engine.setConfig(baseConfig);
    engine.setGraph([], []);
    engine.tick(1);

    expect(engine.getSnapshot().elapsedSeconds).toBe(1);
  });

  it("notifies subscribers", () => {
    engine.setConfig(baseConfig);
    engine.setGraph([], []);
    const listener = vi.fn<() => void>();
    engine.subscribe(listener);
    engine.tick(1);

    expect(listener).toHaveBeenCalledOnce();
  });

  it("uses the graph nodes provided via setGraph", () => {
    const node: GraphNode = {
      capacity: 10,
      id: "server-1",
      type: "server",
    };
    engine.setConfig(baseConfig);
    engine.setGraph([node], []);
    engine.tick(1);

    expect(engine.getSnapshot().nodeStates).toHaveProperty("server-1");
  });
});
