import type { ArchitectureNode } from "../domain/canvas-logic.js";
import { SimulationEngine } from "./simulation-engine.js";
import type { LevelConfig } from "./types.js";

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 100,
  timeout: 60,
  trafficPeak: 150,
  trafficStart: 100,
  trafficTarget: 100,
  winSustainSeconds: 3,
};

describe(SimulationEngine, () => {
  let engine: SimulationEngine;
  const delta = (1 / baseConfig.timeout) * (baseConfig.trafficPeak - baseConfig.trafficStart);

  beforeEach(() => {
    engine = new SimulationEngine();
    engine.setConfig(baseConfig);
  });

  it("getSnapshot returns initial state before any steps", () => {
    const snap = engine.getSnapshot();

    expect(snap.elapsedSeconds).toBe(0);
    expect(snap.nodeStates).toStrictEqual({});
  });

  it("tick() increments elapsedSeconds", () => {
    engine.tick(1);
    const snap = engine.getSnapshot();

    expect(snap.elapsedSeconds).toBe(1);
  });

  it("tick() updates the currentTrafficRate", () => {
    engine.tick(1);
    const snap = engine.getSnapshot();

    expect(snap.currentTrafficRate).toBe(100 + delta);
  });

  it("tick() updates the snapshot", () => {
    engine.setGraph([{ componentType: "users", id: "users-1", position: { x: 0, y: 0 } }], []);
    engine.tick(1);
    const snap = engine.getSnapshot();

    expect(snap.nodeStates).toStrictEqual({
      "users-1": { droppedOps: 0, handledOps: 100 + delta, incomingOps: 100 + delta },
    });
  });

  it("step() notifies subscribers synchronously", () => {
    const calls: number[] = [];
    engine.subscribe(() => {
      calls.push(engine.getSnapshot().elapsedSeconds);
    });

    engine.tick(1);
    engine.tick(1);

    expect(calls).toStrictEqual([1, 2]);
  });

  it("subscribe() returns an unsubscribe function that stops notifications", () => {
    const listener = vi.fn<() => void>();
    const unsubscribe = engine.subscribe(listener);

    unsubscribe();
    engine.tick(1);

    expect(listener).not.toHaveBeenCalled();
  });

  it("reset() restores the initial state", () => {
    engine.tick(1);
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

  it("getSnapshot returns the same snapshot until tick is called", () => {
    const first = engine.getSnapshot();
    const second = engine.getSnapshot();

    expect(first).toBe(second);

    engine.tick(1);
    const third = engine.getSnapshot();

    expect(third).not.toBe(first);
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
    const node: ArchitectureNode = {
      componentType: "server",
      id: "server-1",
      position: { x: 0, y: 0 },
    };
    engine.setConfig(baseConfig);
    engine.setGraph([node], []);
    engine.tick(1);

    expect(engine.getSnapshot().nodeStates).toHaveProperty("server-1");
  });
});
