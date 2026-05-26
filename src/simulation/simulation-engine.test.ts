import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { isAtCapacity, shouldTimeOut, SimulationEngine } from "./simulation-engine.js";
import { EDGE_TRANSIT_INTERNAL_MS, TIME_SCALE } from "./request-types.js";
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

  it("getSnapshot includes empty prev progress maps initially", () => {
    const snap = engine.getSnapshot();

    expect(snap.prevTransitProgresses.size).toBe(0);
    expect(snap.prevResponseTransitProgresses.size).toBe(0);
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

describe("transit and processing advancement", () => {
  const TICK_MS = 500;
  const SPAWN_RATE = (TIME_SCALE * 1000) / TICK_MS;

  const levelConfig: LevelConfig = {
    cacheHitRate: 0,
    monthlyBudget: 100,
    timeout: 60000,
    trafficPeak: SPAWN_RATE,
    trafficStart: SPAWN_RATE,
    trafficTarget: SPAWN_RATE,
    winSustainMs: 3_000,
  };

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

  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
    engine.setConfig(levelConfig);
    engine.setGraph([usersNode, serverNode], [edge]);
  });

  it("advances transit elapsedMs by deltaMs each tick", () => {
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const [transit] = [...snap.transits.values()];

    expect(transit?.elapsedMs).toBe(TICK_MS);
  });

  it("sets transit progress to elapsedMs / durationMs", () => {
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const [transit] = [...snap.transits.values()];

    expect(transit?.progress).toBe(TICK_MS / 1000);
  });

  it("prevTransitProgresses captures each transit's progress before the tick", () => {
    engine.tick(TICK_MS);
    const transitId = [...engine.getSnapshot().transits.keys()][0]!;
    const progressBeforeSecondTick = engine.getSnapshot().transits.get(transitId)!.progress;

    engine.tick(TICK_MS);

    expect(engine.getSnapshot().prevTransitProgresses.get(transitId)).toBe(
      progressBeforeSecondTick,
    );
  });

  it("transitions request to PROCESSING when transit completes", () => {
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const processingRequests = [...snap.requests.values()].filter((r) => r.status === "PROCESSING");

    expect(processingRequests).toHaveLength(1);
  });

  it("creates a processing entry at the target node on transit completion", () => {
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const [processing] = [...snap.processing.values()];

    expect(processing?.nodeId).toBe("server-1");
  });

  it("sets processing durationMs to latencyMs × TIME_SCALE for the target component", () => {
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const [processing] = [...snap.processing.values()];

    expect(processing?.durationMs).toBe(1000);
  });

  it("advances processing elapsedMs each tick (processing created and immediately advanced in same tick as transit completion)", () => {
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const [processing] = [...snap.processing.values()];

    expect(processing?.elapsedMs).toBe(TICK_MS);
  });

  it("transitions to FULFILLED when processing completes", () => {
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const fulfilledRequests = [...snap.requests.values()].filter((r) => r.status === "FULFILLED");

    expect(fulfilledRequests).toHaveLength(1);
  });

  it("removes the fulfilled request from the processing map", () => {
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const fulfilledRequest = [...snap.requests.values()].find((r) => r.status === "FULFILLED");

    expect(fulfilledRequest).toBeDefined();
    expect(snap.processing.has(fulfilledRequest!.id)).toBe(false);
  });
});

describe("response creation", () => {
  const TICK_MS = 500;
  const SPAWN_RATE = (TIME_SCALE * 1000) / TICK_MS;

  const singleEdgeConfig: LevelConfig = {
    cacheHitRate: 0,
    monthlyBudget: 100,
    timeout: 60000,
    trafficPeak: SPAWN_RATE,
    trafficStart: SPAWN_RATE,
    trafficTarget: SPAWN_RATE,
    winSustainMs: 3_000,
  };

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
  const dbNode: ArchitectureNode = { componentType: "db", id: "db-1", position: { x: 0, y: 0 } };
  const edgeE1: ArchitectureEdge = { id: "e1", source: "users-1", target: "server-1" };
  const edgeE2: ArchitectureEdge = { id: "e2", source: "server-1", target: "db-1" };

  describe("single-edge path (users → server)", () => {
    let engine: SimulationEngine;

    beforeEach(() => {
      engine = new SimulationEngine();
      engine.setConfig(singleEdgeConfig);
      engine.setGraph([usersNode, serverNode], [edgeE1]);
      // tick 1: transit starts; tick 2: transit completes, processing starts;
      // tick 3: processing completes, request fulfilled
      engine.tick(TICK_MS);
      engine.tick(TICK_MS);
      engine.tick(TICK_MS);
    });

    it("creates a response entry when a request is fulfilled", () => {
      expect(engine.getSnapshot().responses.size).toBe(1);
    });

    it("creates a response transit for the traversed edge", () => {
      const [transit] = [...engine.getSnapshot().responseTransits.values()];

      expect(transit?.edgeId).toBe("e1");
    });

    it("response has empty remainingEdgeIds for a single-edge path", () => {
      const [response] = [...engine.getSnapshot().responses.values()];

      expect(response?.remainingEdgeIds).toStrictEqual([]);
    });

    it("response links to the fulfilled request", () => {
      const fulfilledRequest = [...engine.getSnapshot().requests.values()].find(
        (r) => r.status === "FULFILLED",
      );
      const [response] = [...engine.getSnapshot().responses.values()];

      expect(response?.requestId).toBe(fulfilledRequest?.id);
    });
  });

  describe("two-edge path (users → server → db)", () => {
    let engine: SimulationEngine;

    beforeEach(() => {
      engine = new SimulationEngine();
      engine.setConfig(singleEdgeConfig);
      engine.setGraph([usersNode, serverNode, dbNode], [edgeE1, edgeE2]);
      // transit e1 (2 ticks) + process server (2) + transit e2 (2) + process db (3, latency=1500ms) = 7 ticks
      for (let i = 0; i < 7; i++) {
        engine.tick(TICK_MS);
      }
    });

    it("response transit uses the last traversed edge", () => {
      const [response] = [...engine.getSnapshot().responses.values()];
      const transit = [...engine.getSnapshot().responseTransits.values()].find(
        (t) => t.responseId === response?.id,
      );

      expect(transit?.edgeId).toBe("e2");
    });

    it("response remainingEdgeIds contains the earlier edge in reverse order", () => {
      const [response] = [...engine.getSnapshot().responses.values()];

      expect(response?.remainingEdgeIds).toStrictEqual(["e1"]);
    });
  });

  describe("dropped requests", () => {
    it("does not create a response for a dropped request", () => {
      // trafficRate high enough to spawn >50 requests in one tick, overflowing server capacity
      const overloadConfig: LevelConfig = {
        cacheHitRate: 0,
        monthlyBudget: 100,
        timeout: 60000,
        trafficPeak: 11000,
        trafficStart: 11000,
        trafficTarget: 11000,
        winSustainMs: 3_000,
      };
      const engine = new SimulationEngine();
      engine.setConfig(overloadConfig);
      engine.setGraph([usersNode, serverNode], [edgeE1]);
      // tick 1: 55 requests spawn; tick 2: all transits complete, 50 → processing, 5 → dropped
      engine.tick(TICK_MS);
      engine.tick(TICK_MS);

      const snap = engine.getSnapshot();
      const droppedRequests = [...snap.requests.values()].filter((r) => r.status === "DROPPED");

      expect(droppedRequests.length).toBeGreaterThan(0);
      expect(snap.responses.size).toBe(0);
    });
  });
});

describe("response transit advancement", () => {
  const TICK_MS = 500;
  const SPAWN_RATE = (TIME_SCALE * 1000) / TICK_MS;
  const VISUAL_TRANSIT_MS = EDGE_TRANSIT_INTERNAL_MS * TIME_SCALE;

  const config: LevelConfig = {
    cacheHitRate: 0,
    monthlyBudget: 100,
    timeout: 60000,
    trafficPeak: SPAWN_RATE,
    trafficStart: SPAWN_RATE,
    trafficTarget: SPAWN_RATE,
    winSustainMs: 3_000,
  };

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
  const dbNode: ArchitectureNode = { componentType: "db", id: "db-1", position: { x: 0, y: 0 } };
  const edgeE1: ArchitectureEdge = { id: "e1", source: "users-1", target: "server-1" };
  const edgeE2: ArchitectureEdge = { id: "e2", source: "server-1", target: "db-1" };

  describe("single-edge path", () => {
    let engine: SimulationEngine;
    let responseId: string;

    beforeEach(() => {
      engine = new SimulationEngine();
      engine.setConfig(config);
      engine.setGraph([usersNode, serverNode], [edgeE1]);
      // tick 1: transit starts; tick 2: transit completes, processing starts;
      // tick 3: processing completes → r1 fulfilled, response created and advanced
      engine.tick(TICK_MS);
      engine.tick(TICK_MS);
      engine.tick(TICK_MS);

      const [response] = [...engine.getSnapshot().responses.values()];
      responseId = response!.id;
    });

    it("advances the response transit elapsedMs in the same tick it is created", () => {
      const transit = [...engine.getSnapshot().responseTransits.values()].find(
        (t) => t.responseId === responseId,
      );

      expect(transit?.elapsedMs).toBe(TICK_MS);
    });

    it("sets responseTransit.progress to elapsedMs / durationMs", () => {
      const transit = [...engine.getSnapshot().responseTransits.values()].find(
        (t) => t.responseId === responseId,
      );

      expect(transit?.progress).toBe(TICK_MS / VISUAL_TRANSIT_MS);
    });

    it("removes the response when the transit completes", () => {
      // tick 4: transit 500 → 1000, completes → delivered
      engine.tick(TICK_MS);

      expect(engine.getSnapshot().responses.has(responseId)).toBe(false);
    });

    it("removes the response transit when it completes", () => {
      engine.tick(TICK_MS);

      const transit = [...engine.getSnapshot().responseTransits.values()].find(
        (t) => t.responseId === responseId,
      );

      expect(transit).toBeUndefined();
    });
  });

  describe("two-edge path", () => {
    let engine: SimulationEngine;
    let responseId: string;

    beforeEach(() => {
      engine = new SimulationEngine();
      engine.setConfig(config);
      engine.setGraph([usersNode, serverNode, dbNode], [edgeE1, edgeE2]);
      // 7 ticks to fulfil r1; response is created and e2 transit advanced to 500ms in tick 7
      for (let i = 0; i < 7; i++) {
        engine.tick(TICK_MS);
      }

      const [response] = [...engine.getSnapshot().responses.values()];
      responseId = response!.id;
    });

    it("creates a new transit for the next edge when the first completes", () => {
      // tick 8: e2 transit 500 → 1000 completes, e1 transit created
      engine.tick(TICK_MS);

      const transit = [...engine.getSnapshot().responseTransits.values()].find(
        (t) => t.responseId === responseId,
      );

      expect(transit?.edgeId).toBe("e1");
    });

    it("response persists while transits remain", () => {
      // tick 8
      engine.tick(TICK_MS);

      expect(engine.getSnapshot().responses.has(responseId)).toBe(true);
    });

    it("removes the response after all transits complete", () => {
      // tick 8: e2 completes → e1 created (elapsedMs=0)
      engine.tick(TICK_MS);
      // tick 9: e1 0 → 500
      engine.tick(TICK_MS);
      // tick 10: e1 500 → 1000 completes → delivered
      engine.tick(TICK_MS);

      expect(engine.getSnapshot().responses.has(responseId)).toBe(false);
    });
  });
});

describe(isAtCapacity, () => {
  it("returns false when no requests are processing at the node", () => {
    expect(isAtCapacity({ componentType: "db", id: "db-1" }, [])).toBe(false);
  });

  it("returns false when below capacity", () => {
    expect(isAtCapacity({ componentType: "db", id: "db-1" }, [{ nodeId: "db-1" }])).toBe(false);
  });

  it("returns true when at capacity", () => {
    const entries = Array.from({ length: 30 }, () => ({ nodeId: "db-1" }));

    expect(isAtCapacity({ componentType: "db", id: "db-1" }, entries)).toBe(true);
  });

  it("returns false for infinite-capacity nodes", () => {
    const entries = Array.from({ length: 1000 }, () => ({ nodeId: "lb-1" }));

    expect(isAtCapacity({ componentType: "load-balancer", id: "lb-1" }, entries)).toBe(false);
  });

  it("ignores processing entries for other nodes", () => {
    const entries = Array.from({ length: 30 }, () => ({ nodeId: "db-2" }));

    expect(isAtCapacity({ componentType: "db", id: "db-1" }, entries)).toBe(false);
  });
});

describe(shouldTimeOut, () => {
  it("returns true when wallClockMs - spawnedAtSimMs >= timeoutMs", () => {
    expect(shouldTimeOut({ spawnedAtSimMs: 5_000, status: "IN_TRANSIT" }, 15_000, 10_000)).toBe(
      true,
    );
  });

  it("returns false when wallClockMs - spawnedAtSimMs < timeoutMs", () => {
    expect(shouldTimeOut({ spawnedAtSimMs: 5_000, status: "IN_TRANSIT" }, 14_999, 10_000)).toBe(
      false,
    );
  });

  it.each(["FULFILLED", "DROPPED", "TIMED_OUT"] as const)(
    "returns false for terminal status %s",
    (status) => {
      expect(shouldTimeOut({ spawnedAtSimMs: 0, status }, 10_000, 10_000)).toBe(false);
    },
  );
});
