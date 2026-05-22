import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { SimulationEngine } from "./simulation-engine.js";
import type { LevelConfig } from "./types.js";

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 100,
  timeout: 60000,
  trafficPeak: 150,
  trafficStart: 100,
  trafficTarget: 100,
  winSustainMs: 3_000,
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

    expect(snap.elapsedMs).toBe(0);
    expect(snap.nodeStates).toStrictEqual({});
  });

  it("getSnapshot includes empty request maps initially", () => {
    const snap = engine.getSnapshot();

    expect(snap.requests.size).toBe(0);
    expect(snap.transits.size).toBe(0);
    expect(snap.processing.size).toBe(0);
  });

  it("getSnapshot includes tickDeltaMs of 0 initially", () => {
    expect(engine.getSnapshot().tickDeltaMs).toBe(0);
  });

  it("tick() increments elapsedMs", () => {
    engine.tick(1);
    const snap = engine.getSnapshot();

    expect(snap.elapsedMs).toBe(0.001);
  });

  it("tick() updates the currentTrafficRate", () => {
    engine.tick(1000);
    const snap = engine.getSnapshot();

    expect(snap.currentTrafficRate).toBe(100 + delta);
  });

  it("tick() updates the snapshot", () => {
    engine.setGraph([{ componentType: "users", id: "users-1", position: { x: 0, y: 0 } }], []);
    engine.tick(1000);
    const snap = engine.getSnapshot();

    expect(snap.nodeStates).toStrictEqual({
      "users-1": { droppedOps: 0, handledOps: 100 + delta, incomingOps: 100 + delta },
    });
  });

  it("step() notifies subscribers synchronously", () => {
    const calls: number[] = [];
    engine.subscribe(() => {
      calls.push(engine.getSnapshot().elapsedMs);
    });

    engine.tick(1);
    engine.tick(1);

    expect(calls).toStrictEqual([0.001, 0.002]);
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

    expect(snap.elapsedMs).toBe(0);
    expect(snap.nodeStates).toStrictEqual({});
  });

  it("reset() clears request maps", () => {
    const usersNode: ArchitectureNode = {
      componentType: "users",
      id: "users-1",
      position: { x: 0, y: 0 },
    };
    const serverNode: ArchitectureNode = {
      componentType: "server",
      id: "server-1",
      position: { x: 0, y: 0 },
    };
    const edge: ArchitectureEdge = { id: "e1", source: "users-1", target: "server-1" };
    engine.setGraph([usersNode, serverNode], [edge]);
    engine.tick(16000);
    engine.reset();
    const snap = engine.getSnapshot();

    expect(snap.requests.size).toBe(0);
    expect(snap.transits.size).toBe(0);
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

describe("request spawning", () => {
  it("populates the requests map when users node has an outgoing edge", () => {
    const engine = new SimulationEngine();
    engine.setConfig(baseConfig);
    engine.setGraph(
      [
        { componentType: "users", id: "users-1", position: { x: 0, y: 0 } },
        { componentType: "server", id: "server-1", position: { x: 0, y: 0 } },
      ],
      [{ id: "e1", source: "users-1", target: "server-1" }],
    );
    engine.tick(16000);

    expect(engine.getSnapshot().requests.size).toBeGreaterThan(0);
  });

  it("does not spawn requests when users node has no outgoing edge", () => {
    const engine = new SimulationEngine();
    engine.setConfig(baseConfig);
    engine.setGraph([{ componentType: "users", id: "users-1", position: { x: 0, y: 0 } }], []);
    engine.tick(16000);

    expect(engine.getSnapshot().requests.size).toBe(0);
  });

  it("sets tickDeltaMs in the snapshot after tick", () => {
    const engine = new SimulationEngine();
    engine.setConfig(baseConfig);
    engine.setGraph([], []);
    engine.tick(16);

    expect(engine.getSnapshot().tickDeltaMs).toBe(16);
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

    expect(engine.getSnapshot().elapsedMs).toBe(0);
  });

  it("updates elapsed when config and graph are set", () => {
    engine.setConfig(baseConfig);
    engine.setGraph([], []);
    engine.tick(1);

    expect(engine.getSnapshot().elapsedMs).toBe(1 / 1000);
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
