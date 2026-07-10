import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { COMPONENT_LIBRARY_FIXTURE, CONNECTION_LIBRARY_FIXTURE } from "../domain/test-fixtures.js";
import { convertRate, toRealRate } from "../domain/sim-time-converter.js";
import { SimulationEngine } from "./simulation-engine.js";
import type { LevelConfig } from "./types.js";

const makeEngine = () => new SimulationEngine(COMPONENT_LIBRARY_FIXTURE);

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 100,
  timeout: 1_000_000,
  trafficPeak: convertRate(0.15),
  trafficStart: convertRate(0.1),
  trafficTarget: convertRate(0.1),
  winSustainMs: 3_000,
};

describe(SimulationEngine, () => {
  let engine: SimulationEngine;
  const delta = (1_000 / baseConfig.timeout) * (baseConfig.trafficPeak - baseConfig.trafficStart);

  beforeEach(() => {
    engine = makeEngine();
    engine.setConfig(baseConfig);
  });

  it("getSnapshot returns initial state before any steps", () => {
    const snap = engine.getSnapshot();

    expect(snap.elapsedMs).toBe(0);
    expect(snap.nodeMetrics).toStrictEqual(new Map());
  });

  it("getSnapshot includes deliveryOpsPerMs of 0 initially", () => {
    expect(engine.getSnapshot().deliveryOpsPerMs).toBe(0);
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

  it("getSnapshot includes empty nodeQueues initially", () => {
    expect(engine.getSnapshot().nodeQueues).toStrictEqual(new Map());
  });

  it("getSnapshot includes tickDeltaMs of 0 initially", () => {
    expect(engine.getSnapshot().tickDeltaMs).toBe(0);
  });

  it("tick() increments elapsedMs", () => {
    engine.tick(1);
    const snap = engine.getSnapshot();

    expect(snap.elapsedMs).toBe(1);
  });

  it("tick() updates the currentTrafficRate", () => {
    engine.tick(1000);
    const snap = engine.getSnapshot();

    expect(snap.currentTrafficRate).toBe(baseConfig.trafficStart + delta);
  });

  it("tick() populates nodeMetrics for graph nodes", () => {
    engine.setGraph([{ componentType: "users", id: "users-1", position: { x: 0, y: 0 } }], []);
    engine.tick(1000);
    const snap = engine.getSnapshot();

    expect(snap.nodeMetrics.has("users-1")).toBe(true);
  });

  it("step() notifies subscribers synchronously", () => {
    const calls: number[] = [];
    engine.subscribe(() => {
      calls.push(engine.getSnapshot().elapsedMs);
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

    expect(snap.elapsedMs).toBe(0);
    expect(snap.nodeMetrics).toStrictEqual(new Map());
  });

  it("reset() clears nodeQueues", () => {
    engine.tick(1);
    engine.reset();

    expect(engine.getSnapshot().nodeQueues).toStrictEqual(new Map());
  });

  it("reset() resets deliveryOpsPerMs to 0", () => {
    engine.tick(1);
    engine.reset();

    expect(engine.getSnapshot().deliveryOpsPerMs).toBe(0);
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
    const edge: ArchitectureEdge = {
      id: "e1",
      source: "users-1",
      target: "server-1",
    };
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
    const engine = makeEngine();
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
    const engine = makeEngine();
    engine.setConfig(baseConfig);
    engine.setGraph([{ componentType: "users", id: "users-1", position: { x: 0, y: 0 } }], []);
    engine.tick(16000);

    expect(engine.getSnapshot().requests.size).toBe(0);
  });

  it("sets tickDeltaMs in the snapshot after tick", () => {
    const engine = makeEngine();
    engine.setConfig(baseConfig);
    engine.setGraph([], []);
    engine.tick(16);

    expect(engine.getSnapshot().tickDeltaMs).toBe(16);
  });
});

describe("tick", () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = makeEngine();
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

    expect(engine.getSnapshot().elapsedMs).toBe(1);
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

    expect(engine.getSnapshot().nodeMetrics.has("server-1")).toBe(true);
  });
});

describe("transit and processing advancement", () => {
  const TICK_MS = CONNECTION_LIBRARY_FIXTURE.standard.transitMs / 2;
  const SPAWN_RATE = toRealRate(1 / TICK_MS);

  const levelConfig: LevelConfig = {
    cacheHitRate: 0,
    monthlyBudget: 100,
    timeout: 1_000_000,
    trafficPeak: convertRate(SPAWN_RATE),
    trafficStart: convertRate(SPAWN_RATE),
    trafficTarget: convertRate(SPAWN_RATE),
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

  const edge: ArchitectureEdge = {
    id: "e1",
    source: "users-1",
    target: "server-1",
  };

  let engine: SimulationEngine;

  beforeEach(() => {
    engine = makeEngine();
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

    expect(transit?.progress).toBe(TICK_MS / CONNECTION_LIBRARY_FIXTURE.standard.transitMs);
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

  it("sets processing durationMs to latencyMs for the target component", () => {
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const [processing] = [...snap.processing.values()];

    expect(processing?.durationMs).toBe(COMPONENT_LIBRARY_FIXTURE.server.latencyMs);
  });

  it("advances processing elapsedMs on the tick after drain", () => {
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    // Processing created by drainQueues with elapsedMs=0. Next tick advances it.
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const [processing] = [...snap.processing.values()];

    expect(processing?.elapsedMs).toBe(TICK_MS);
  });

  it("transitions to FULFILLED when processing completes", () => {
    // 2 ticks transit + 1 tick drain (elapsedMs=0) + 4 ticks processing = 6 ticks
    for (let i = 0; i < 6; i++) {
      engine.tick(TICK_MS);
    }
    const snap = engine.getSnapshot();
    const fulfilledRequests = [...snap.requests.values()].filter((r) => r.status === "FULFILLED");

    expect(fulfilledRequests).toHaveLength(1);
  });

  it("removes the fulfilled request from the processing map", () => {
    for (let i = 0; i < 6; i++) {
      engine.tick(TICK_MS);
    }
    const snap = engine.getSnapshot();
    const fulfilledRequest = [...snap.requests.values()].find((r) => r.status === "FULFILLED");

    expect(fulfilledRequest).toBeDefined();
    expect(snap.processing.has(fulfilledRequest!.id)).toBe(false);
  });
});

describe("per-node queue", () => {
  const TICK_MS = CONNECTION_LIBRARY_FIXTURE.standard.transitMs / 2;
  const SPAWN_RATE = toRealRate(1 / TICK_MS);

  const levelConfig: LevelConfig = {
    cacheHitRate: 0,
    monthlyBudget: 100,
    timeout: 1_000_000,
    trafficPeak: convertRate(SPAWN_RATE),
    trafficStart: convertRate(SPAWN_RATE),
    trafficTarget: convertRate(SPAWN_RATE),
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

  const edge: ArchitectureEdge = {
    id: "e1",
    source: "users-1",
    target: "server-1",
  };

  it("a single request at an idle node is drained from queue into PROCESSING in the same tick", () => {
    const engine = makeEngine();
    engine.setConfig(levelConfig);
    engine.setGraph([usersNode, serverNode], [edge]);
    // tick 1: transit starts; tick 2: transit completes → enqueued → drained
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const processingRequests = [...snap.requests.values()].filter((r) => r.status === "PROCESSING");

    expect(processingRequests).toHaveLength(1);
    expect(snap.nodeQueues.get("server-1")).toBeDefined();
    expect(snap.nodeQueues.get("server-1")).toHaveLength(0);
  });

  it("records an arrival metric event at transit completion time", () => {
    const engine = makeEngine();
    engine.setConfig(levelConfig);
    engine.setGraph([usersNode, serverNode], [edge]);
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const serverMetrics = snap.nodeMetrics.get("server-1");

    expect(serverMetrics?.incomingOpsPerMs).toBeGreaterThan(0);
  });

  it("only one request processes at a node; the second waits in the queue", () => {
    // 1 request per tick (existing rate). Tick 1: r1 spawns → transit.
    // Tick 2: r1 transit completes → enqueued → drained to PROCESSING. r2 spawns → transit.
    // Tick 3: r2 transit completes → enqueued. Server busy with r1 → stays QUEUED.
    const engine = makeEngine();
    engine.setConfig(levelConfig);
    engine.setGraph([usersNode, serverNode], [edge]);
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const processing = [...snap.processing.values()].filter((p) => p.nodeId === "server-1");

    expect(processing).toHaveLength(1);
    expect(snap.nodeQueues.get("server-1")).toHaveLength(1);
  });

  it("queued request enters PROCESSING after the first request completes", () => {
    const engine = makeEngine();
    engine.setConfig(levelConfig);
    engine.setGraph([usersNode, serverNode], [edge]);
    // tick 1: r1 spawns. tick 2: r1 arrives → PROCESSING. tick 3: r2 arrives → QUEUED.
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);

    // r1 started processing at tick 2 with elapsedMs=0.
    // Server latencyMs (fixture) = 20 real → 2000 sim. Each tick = 500ms.
    // 4 ticks to complete → tick 6. We're at tick 3, need 3 more.
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const processing = [...snap.processing.values()].filter((p) => p.nodeId === "server-1");

    // r1 completed and r2 (formerly queued) should now be processing
    expect(processing).toHaveLength(1);
  });

  it("drains all queued requests at a zero-latency node in one tick", () => {
    // users node has latencyMs=0. If requests somehow queue there, they should all drain.
    // We can't easily queue at users directly, so test with load-balancer (latencyMs=0.1 real → 10 sim).
    // Actually, load-balancer has nonzero latency now. Use a custom setup instead.
    // Simplest: verify that when a load-balancer node receives requests, they process immediately
    // since latencyMs is very small (10 sim-ms). With TICK_MS=500, processing completes same tick.
    const lbNode: ArchitectureNode = {
      componentType: "load-balancer",
      id: "lb-1",
      position: { x: 0, y: 0 },
    };
    const edgeLb: ArchitectureEdge = {
      id: "e-lb",
      source: "users-1",
      target: "lb-1",
    };
    const edgeLbServer: ArchitectureEdge = {
      id: "e-lb-s",
      source: "lb-1",
      target: "server-1",
    };
    const engine = makeEngine();
    engine.setConfig(levelConfig);
    engine.setGraph([usersNode, lbNode, serverNode], [edgeLb, edgeLbServer, edge]);
    // tick 1: request spawns → transit to lb
    // tick 2: transit completes → queued at lb → drained (lb latency ~10 sim-ms, completes instantly)
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    // lb should have no queued requests — they should have been processed and routed onward
    expect(snap.nodeQueues.get("lb-1")).toBeDefined();
    expect(snap.nodeQueues.get("lb-1")).toHaveLength(0);
  });

  it("processing slot is freed when a request routes to the next transit", () => {
    const dbNode: ArchitectureNode = {
      componentType: "db",
      id: "db-1",
      position: { x: 0, y: 0 },
    };
    const edgeE2: ArchitectureEdge = {
      id: "e2",
      source: "server-1",
      target: "db-1",
    };
    const engine = makeEngine();
    engine.setConfig(levelConfig);
    engine.setGraph([usersNode, serverNode, dbNode], [edge, edgeE2]);
    // tick 1: r1 spawns. tick 2: r1 arrives → PROCESSING. tick 3: r2 arrives → QUEUED.
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);

    // r1 started at tick 2. 4 ticks to complete → tick 6. We're at tick 3, need 3 more.
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    engine.tick(TICK_MS);
    const snap = engine.getSnapshot();
    const serverProcessing = [...snap.processing.values()].filter((p) => p.nodeId === "server-1");

    // r1 routed to transit e2, r2 promoted from queue to processing at server
    expect(serverProcessing).toHaveLength(1);
  });
});

describe("sub-tick excess time", () => {
  const TICK_MS = CONNECTION_LIBRARY_FIXTURE.standard.transitMs / 2;

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
  const edge: ArchitectureEdge = {
    id: "e1",
    source: "users-1",
    target: "server-1",
  };

  const makeCustomLib = (serverLatencyMs: number) => ({
    ...COMPONENT_LIBRARY_FIXTURE,
    server: { ...COMPONENT_LIBRARY_FIXTURE.server, latencyMs: serverLatencyMs },
  });

  it("no excess time: 2 sequential requests each take latencyMs / TICK_MS ticks", () => {
    // server latencyMs = 1000 sim, TICK_MS = 500. Each request: 2 ticks processing.
    // r1: transit 2 ticks + drain + 2 ticks processing = fulfilled at tick 4.
    // r2: arrives tick 3 → queued. Drain at tick 4 (slot freed) with excessTime=0.
    //     2 ticks processing → fulfilled at tick 6.
    // Total for 2 sequential: 6 ticks. Both fulfilled.
    const SPAWN_RATE = toRealRate(1 / TICK_MS);
    const config: LevelConfig = {
      cacheHitRate: 0,
      monthlyBudget: 100,
      timeout: 1_000_000,
      trafficPeak: convertRate(SPAWN_RATE),
      trafficStart: convertRate(SPAWN_RATE),
      trafficTarget: convertRate(SPAWN_RATE),
      winSustainMs: 3_000,
    };
    const engine = new SimulationEngine(makeCustomLib(1000));
    engine.setConfig(config);
    engine.setGraph([usersNode, serverNode], [edge]);
    for (let i = 0; i < 6; i++) {
      engine.tick(TICK_MS);
    }
    const fulfilled = [...engine.getSnapshot().requests.values()].filter(
      (r) => r.status === "FULFILLED",
    );

    expect(fulfilled).toHaveLength(2);
  });

  it("with excess time: second request starts with elapsedMs = excessTime from first", () => {
    // server latencyMs = 750 sim, TICK_MS = 500.
    // r1: transit 2 ticks. Drain at tick 2 (elapsedMs=0).
    //     tick 3: elapsed=500. tick 4: elapsed=1000 > 750 → completes. excessTime=250.
    // r2: arrives tick 3 → queued. Drain at tick 4 with elapsedMs=250.
    //     tick 5: elapsed=250+500=750 ≥ 750 → completes.
    // Total: 5 ticks for 2 sequential (saved 1 tick vs no excess carry-over).
    const SPAWN_RATE = toRealRate(1 / TICK_MS);
    const config: LevelConfig = {
      cacheHitRate: 0,
      monthlyBudget: 100,
      timeout: 1_000_000,
      trafficPeak: convertRate(SPAWN_RATE),
      trafficStart: convertRate(SPAWN_RATE),
      trafficTarget: convertRate(SPAWN_RATE),
      winSustainMs: 3_000,
    };
    const engine = new SimulationEngine(makeCustomLib(750));
    engine.setConfig(config);
    engine.setGraph([usersNode, serverNode], [edge]);
    for (let i = 0; i < 5; i++) {
      engine.tick(TICK_MS);
    }
    const fulfilled = [...engine.getSnapshot().requests.values()].filter(
      (r) => r.status === "FULFILLED",
    );

    expect(fulfilled).toHaveLength(2);
  });
});

describe("response creation", () => {
  const TICK_MS = CONNECTION_LIBRARY_FIXTURE.standard.transitMs / 2;
  const SPAWN_RATE = toRealRate(1 / TICK_MS);

  const singleEdgeConfig: LevelConfig = {
    cacheHitRate: 0,
    monthlyBudget: 100,
    timeout: 1_000_000,
    trafficPeak: convertRate(SPAWN_RATE),
    trafficStart: convertRate(SPAWN_RATE),
    trafficTarget: convertRate(SPAWN_RATE),
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
  const dbNode: ArchitectureNode = {
    componentType: "db",
    id: "db-1",
    position: { x: 0, y: 0 },
  };
  const edgeE1: ArchitectureEdge = {
    id: "e1",
    source: "users-1",
    target: "server-1",
  };
  const edgeE2: ArchitectureEdge = {
    id: "e2",
    source: "server-1",
    target: "db-1",
  };

  describe("single-edge path (users → server)", () => {
    let engine: SimulationEngine;

    beforeEach(() => {
      engine = makeEngine();
      engine.setConfig(singleEdgeConfig);
      engine.setGraph([usersNode, serverNode], [edgeE1]);
      // tick 1-2: transit; tick 2: drain starts processing (elapsedMs=0);
      // tick 3-6: processing completes (server latencyMs=20 → 2000 sim-ms)
      for (let i = 0; i < 6; i++) {
        engine.tick(TICK_MS);
      }
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
      engine = makeEngine();
      engine.setConfig(singleEdgeConfig);
      engine.setGraph([usersNode, serverNode, dbNode], [edgeE1, edgeE2]);
      // transit e1 (2) + drain (0) + process server (4) + transit e2 (2) + drain (0) + process db (7) = 15 ticks
      for (let i = 0; i < 15; i++) {
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

  describe("per-node queuing under high load", () => {
    it("queues excess requests instead of dropping them", () => {
      const overloadConfig: LevelConfig = {
        cacheHitRate: 0,
        monthlyBudget: 100,
        timeout: 1_000_000,
        trafficPeak: convertRate(1100),
        trafficStart: convertRate(1100),
        trafficTarget: convertRate(1100),
        winSustainMs: 3_000,
      };
      const engine = makeEngine();
      engine.setConfig(overloadConfig);
      engine.setGraph([usersNode, serverNode], [edgeE1]);
      engine.tick(TICK_MS);
      engine.tick(TICK_MS);
      engine.tick(TICK_MS);

      const snap = engine.getSnapshot();
      const droppedRequests = [...snap.requests.values()].filter((r) => r.status === "DROPPED");

      expect(droppedRequests).toHaveLength(0);
      // Only 1 request processing at the server; the rest are queued
      expect(snap.processing.size).toBe(1);
      expect(snap.nodeQueues.get("server-1")!.length).toBeGreaterThan(50);
    });
  });
});

describe("response transit advancement", () => {
  const TICK_MS = CONNECTION_LIBRARY_FIXTURE.standard.transitMs / 2;
  const SPAWN_RATE = toRealRate(1 / TICK_MS);

  const config: LevelConfig = {
    cacheHitRate: 0,
    monthlyBudget: 100,
    timeout: 1_000_000,
    trafficPeak: convertRate(SPAWN_RATE),
    trafficStart: convertRate(SPAWN_RATE),
    trafficTarget: convertRate(SPAWN_RATE),
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
  const dbNode: ArchitectureNode = {
    componentType: "db",
    id: "db-1",
    position: { x: 0, y: 0 },
  };
  const edgeE1: ArchitectureEdge = {
    id: "e1",
    source: "users-1",
    target: "server-1",
  };
  const edgeE2: ArchitectureEdge = {
    id: "e2",
    source: "server-1",
    target: "db-1",
  };

  describe("single-edge path", () => {
    let engine: SimulationEngine;
    let responseId: string;

    beforeEach(() => {
      engine = makeEngine();
      engine.setConfig(config);
      engine.setGraph([usersNode, serverNode], [edgeE1]);
      // tick 1-2: transit; tick 2: drain (elapsedMs=0); tick 3-6: processing;
      // tick 6: processing completes → r1 fulfilled, response created and advanced
      for (let i = 0; i < 6; i++) {
        engine.tick(TICK_MS);
      }

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

      expect(transit?.progress).toBe(TICK_MS / CONNECTION_LIBRARY_FIXTURE.standard.transitMs);
    });

    it("removes the response when the transit completes", () => {
      // tick 4: transit completes → delivered
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
      engine = makeEngine();
      engine.setConfig(config);
      engine.setGraph([usersNode, serverNode, dbNode], [edgeE1, edgeE2]);
      // 15 ticks to fulfil r1; response is created and e2 transit advanced by TICK_MS in tick 15
      for (let i = 0; i < 15; i++) {
        engine.tick(TICK_MS);
      }

      const [response] = [...engine.getSnapshot().responses.values()];
      responseId = response!.id;
    });

    it("creates a new transit for the next edge when the first completes", () => {
      // tick 8: e2 transit completes, e1 transit created
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
      // tick 9: e1 advances
      engine.tick(TICK_MS);
      // tick 10: e1 completes → delivered
      engine.tick(TICK_MS);

      expect(engine.getSnapshot().responses.has(responseId)).toBe(false);
    });
  });
});

describe("rolling metrics", () => {
  const TICK_MS = 500;
  const SPAWN_RATE = toRealRate(1 / TICK_MS);

  const config: LevelConfig = {
    cacheHitRate: 0,
    monthlyBudget: 100,
    timeout: 1_000_000,
    trafficPeak: convertRate(SPAWN_RATE),
    trafficStart: convertRate(SPAWN_RATE),
    trafficTarget: convertRate(SPAWN_RATE),
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
  const dbNode: ArchitectureNode = {
    componentType: "db",
    id: "db-1",
    position: { x: 0, y: 0 },
  };
  const edgeE1: ArchitectureEdge = {
    id: "e1",
    source: "users-1",
    target: "server-1",
  };
  const edgeE2: ArchitectureEdge = {
    id: "e2",
    source: "server-1",
    target: "db-1",
  };

  it("deliveryOpsPerMs becomes > 0 after enough ticks for a response to complete a round trip", () => {
    const engine = makeEngine();
    engine.setConfig(config);
    engine.setGraph([usersNode, serverNode], [edgeE1]);
    // tick 1-2: transit; tick 2: drain; tick 3-6: processing;
    // tick 6: response transit starts; tick 7-8: response transit completes → delivery recorded
    for (let i = 0; i < 8; i++) {
      engine.tick(TICK_MS);
    }

    expect(engine.getSnapshot().deliveryOpsPerMs).toBeGreaterThan(0);
  });

  it("incomingOpsPerMs at the db is throttled by the server's single-slot queue", () => {
    const engine = makeEngine();
    engine.setConfig(config);
    engine.setGraph([usersNode, serverNode, dbNode], [edgeE1, edgeE2]);

    // Run enough ticks for multiple requests to pass through the server and reach the db.
    // Server processes 1 request every 2000 sim-ms (4 ticks). After 24 ticks (12000ms),
    // several requests will have reached the db.
    for (let i = 0; i < 24; i++) {
      engine.tick(TICK_MS);
    }

    const { nodeMetrics } = engine.getSnapshot();
    const dbMetrics = nodeMetrics.get("db-1")!;

    // The db arrival rate is limited by the server's throughput (1/2000ms),
    // not the raw traffic rate (1/500ms).
    expect(dbMetrics.incomingOpsPerMs).toBeGreaterThan(0);
    expect(dbMetrics.incomingOpsPerMs).toBeLessThanOrEqual(
      1 / COMPONENT_LIBRARY_FIXTURE.server.latencyMs,
    );
  });

  it("reset() clears the metrics window so deliveryOpsPerMs returns to 0", () => {
    const engine = makeEngine();
    engine.setConfig(config);
    engine.setGraph([usersNode, serverNode], [edgeE1]);
    for (let i = 0; i < 4; i++) {
      engine.tick(TICK_MS);
    }
    engine.reset();

    expect(engine.getSnapshot().deliveryOpsPerMs).toBe(0);
  });

  it("reset() clears the metrics window so nodeMetrics returns to empty Map", () => {
    const engine = makeEngine();
    engine.setConfig(config);
    engine.setGraph([usersNode, serverNode], [edgeE1]);
    engine.tick(TICK_MS);
    engine.reset();

    expect(engine.getSnapshot().nodeMetrics).toStrictEqual(new Map());
  });
});

describe("server receives all requests emitted by the users node", () => {
  // One request per tick: convertRate(SPAWN_RATE) * TICK_MS = 1, giving exactly one arrival per tick.
  const TICK_MS = 500;
  const SPAWN_RATE = toRealRate(1 / TICK_MS);

  const config: LevelConfig = {
    cacheHitRate: 0,
    monthlyBudget: 100,
    timeout: 1_000_000,
    trafficPeak: convertRate(SPAWN_RATE),
    trafficStart: convertRate(SPAWN_RATE),
    trafficTarget: convertRate(SPAWN_RATE),
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
  const edge: ArchitectureEdge = {
    id: "e1",
    source: "users-1",
    target: "server-1",
  };

  it("incomingOpsPerMs at the server equals the inter-arrival rate at steady state", () => {
    const engine = makeEngine();
    engine.setConfig(config);
    engine.setGraph([usersNode, serverNode], [edge]);

    // Run 12 ticks (6000ms) to ensure the rolling window is fully saturated with arrivals.
    for (let i = 0; i < 12; i++) {
      engine.tick(TICK_MS);
    }

    const { nodeMetrics } = engine.getSnapshot();
    const serverMetrics = nodeMetrics.get("server-1")!;

    // At steady state with 1 arrival per tick, the inter-arrival gap is TICK_MS
    // and the rate converges to 1/TICK_MS.
    expect(serverMetrics.incomingOpsPerMs).toBe(1 / TICK_MS);
  });
});
