import { computeTrafficFlow, getLinearTrafficRate, hasRunnablePath } from "./engine.js";
import type { GraphEdge, GraphNode } from "./types.js";

const CACHE_HIT_RATE_NONE = 0;
const SERVER_CAPACITY = 50;
const DB_CAPACITY = 30;
const CACHE_CAPACITY = 200;
const LARGE_SERVER_CAPACITY = 150;

const usersNode = (id = "users-1"): GraphNode => ({
  capacity: Infinity,
  id,
  type: "users",
});

const serverNode = (id = "server-1", capacity = SERVER_CAPACITY): GraphNode => ({
  capacity,
  id,
  type: "server",
});

const largeServerNode = (id = "server-lg-1", capacity = LARGE_SERVER_CAPACITY): GraphNode => ({
  capacity,
  id,
  type: "server-large",
});

const dbNode = (id = "db-1", capacity = DB_CAPACITY): GraphNode => ({
  capacity,
  id,
  type: "db",
});

const cacheNode = (id = "cache-1", capacity = CACHE_CAPACITY): GraphNode => ({
  capacity,
  id,
  type: "cache",
});

const lbNode = (id = "lb-1"): GraphNode => ({
  capacity: Infinity,
  id,
  type: "load-balancer",
});

const edge = (source: string, target: string): GraphEdge => ({
  source,
  target,
});

const flowConfig = (trafficRate: number, cacheHitRate = CACHE_HIT_RATE_NONE) => ({
  cacheHitRate,
  trafficRate,
});

describe("traffic flow", () => {
  describe("single users node", () => {
    it("users emits at the given traffic rate", () => {
      const nodes = [usersNode()];

      const result = computeTrafficFlow(nodes, [], flowConfig(100));

      expect(result["users-1"]?.handledOps).toBe(100);
    });

    it("users is not limited by capacity", () => {
      const nodes = [usersNode()];

      const result = computeTrafficFlow(nodes, [], flowConfig(9999));

      expect(result["users-1"]?.droppedOps).toBe(0);
    });
  });

  describe("users to server chain", () => {
    it("server receives traffic from users", () => {
      const nodes = [usersNode(), serverNode()];
      const edges = [edge("users-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(30));

      expect(result["server-1"]?.incomingOps).toBe(30);
    });

    it("server handles traffic up to its capacity", () => {
      const nodes = [usersNode(), serverNode("server-1", 40)];
      const edges = [edge("users-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(80));

      expect(result["server-1"]?.handledOps).toBe(40);
    });

    it("server drops traffic that exceeds its capacity", () => {
      const nodes = [usersNode(), serverNode("server-1", 40)];
      const edges = [edge("users-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(80));

      expect(result["server-1"]?.droppedOps).toBe(40);
    });

    it("server has zero dropped ops when traffic is within capacity", () => {
      const nodes = [usersNode(), serverNode()];
      const edges = [edge("users-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(30));

      expect(result["server-1"]?.droppedOps).toBe(0);
    });

    it("large server handles traffic up to its higher capacity", () => {
      const nodes = [usersNode(), largeServerNode()];
      const edges = [edge("users-1", "server-lg-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(120));

      expect(result["server-lg-1"]?.handledOps).toBe(120);
      expect(result["server-lg-1"]?.droppedOps).toBe(0);
    });

    it("large server drops traffic exceeding its capacity", () => {
      const nodes = [usersNode(), largeServerNode()];
      const edges = [edge("users-1", "server-lg-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(200));

      expect(result["server-lg-1"]?.droppedOps).toBe(50);
    });
  });

  describe("users to server to db chain", () => {
    it("the db receives the server's handled ops", () => {
      const nodes = [usersNode(), serverNode(), dbNode()];
      const edges = [edge("users-1", "server-1"), edge("server-1", "db-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(20));

      expect(result["db-1"]?.incomingOps).toBe(20);
    });

    it("the db only receives handled (not dropped) ops from server", () => {
      const nodes = [usersNode(), serverNode("server-1", 40), dbNode()];
      const edges = [edge("users-1", "server-1"), edge("server-1", "db-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(80));

      expect(result["db-1"]?.incomingOps).toBe(40);
    });

    it("disconnected node has zero incoming ops", () => {
      const nodes = [usersNode(), serverNode(), dbNode()];
      const edges = [edge("users-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(30));

      expect(result["db-1"]?.incomingOps).toBe(0);
    });
  });

  describe("load balancer distribution", () => {
    it("distributes incoming traffic evenly across two downstream servers", () => {
      const nodes = [usersNode(), lbNode(), serverNode("server-1"), serverNode("server-2")];
      const edges = [edge("users-1", "lb-1"), edge("lb-1", "server-1"), edge("lb-1", "server-2")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(100));

      expect(result["server-1"]?.incomingOps).toBe(50);
      expect(result["server-2"]?.incomingOps).toBe(50);
    });

    it("distributes evenly across three downstream servers", () => {
      const nodes = [
        usersNode(),
        lbNode(),
        serverNode("server-1"),
        serverNode("server-2"),
        serverNode("server-3"),
      ];
      const edges = [
        edge("users-1", "lb-1"),
        edge("lb-1", "server-1"),
        edge("lb-1", "server-2"),
        edge("lb-1", "server-3"),
      ];

      const result = computeTrafficFlow(nodes, edges, flowConfig(300));

      expect(result["server-1"]?.incomingOps).toBeCloseTo(100);
      expect(result["server-2"]?.incomingOps).toBeCloseTo(100);
      expect(result["server-3"]?.incomingOps).toBeCloseTo(100);
    });

    it("load balancer has no capacity limit and drops nothing", () => {
      const nodes = [usersNode(), lbNode(), serverNode("server-1")];
      const edges = [edge("users-1", "lb-1"), edge("lb-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(9999));

      expect(result["lb-1"]?.droppedOps).toBe(0);
      expect(result["lb-1"]?.handledOps).toBe(9999);
    });
  });

  describe("cache interception", () => {
    it("forwards only cache misses to downstream db", () => {
      const nodes = [usersNode(), serverNode(), cacheNode(), dbNode()];
      const edges = [
        edge("users-1", "server-1"),
        edge("server-1", "cache-1"),
        edge("cache-1", "db-1"),
      ];
      const hitRate = 0.4;

      const result = computeTrafficFlow(nodes, edges, flowConfig(20, hitRate));

      expect(result["db-1"]?.incomingOps).toBeCloseTo(12);
    });

    it("intercepts all traffic when hit rate is 1.0", () => {
      const nodes = [usersNode(), serverNode(), cacheNode(), dbNode()];
      const edges = [
        edge("users-1", "server-1"),
        edge("server-1", "cache-1"),
        edge("cache-1", "db-1"),
      ];

      const result = computeTrafficFlow(nodes, edges, flowConfig(20, 1.0));

      expect(result["db-1"]?.incomingOps).toBe(0);
    });

    it("forwards all traffic when hit rate is 0", () => {
      const nodes = [usersNode(), serverNode(), cacheNode(), dbNode()];
      const edges = [
        edge("users-1", "server-1"),
        edge("server-1", "cache-1"),
        edge("cache-1", "db-1"),
      ];

      const result = computeTrafficFlow(nodes, edges, flowConfig(20, 0));

      expect(result["db-1"]?.incomingOps).toBe(20);
    });

    it("cache can become overloaded when incoming ops exceed its capacity", () => {
      const nodes = [usersNode(), serverNode("server-1", 500), cacheNode("cache-1", 200)];
      const edges = [edge("users-1", "server-1"), edge("server-1", "cache-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(300, 0.5));

      expect(result["cache-1"]?.incomingOps).toBe(300);
      expect(result["cache-1"]?.handledOps).toBe(200);
      expect(result["cache-1"]?.droppedOps).toBe(100);
    });
  });
});

describe("linear traffic rate", () => {
  it("returns the start rate at elapsed time 0", () => {
    expect(
      getLinearTrafficRate({ elapsed: 0, timeout: 60, trafficPeak: 100, trafficStart: 20 }),
    ).toBe(20);
  });

  it("returns the peak rate at elapsed time equal to timeout", () => {
    expect(
      getLinearTrafficRate({ elapsed: 60, timeout: 60, trafficPeak: 100, trafficStart: 20 }),
    ).toBe(100);
  });

  it("returns an interpolated rate at the midpoint", () => {
    expect(
      getLinearTrafficRate({ elapsed: 30, timeout: 60, trafficPeak: 100, trafficStart: 0 }),
    ).toBeCloseTo(50);
  });

  it("returns the peak rate when elapsed time exceeds timeout", () => {
    expect(
      getLinearTrafficRate({ elapsed: 90, timeout: 60, trafficPeak: 100, trafficStart: 20 }),
    ).toBe(100);
  });

  it("returns the start rate when start equals peak (constant traffic)", () => {
    expect(
      getLinearTrafficRate({ elapsed: 30, timeout: 60, trafficPeak: 80, trafficStart: 80 }),
    ).toBe(80);
  });

  it("increases monotonically over time", () => {
    const r1 = getLinearTrafficRate({
      elapsed: 10,
      timeout: 60,
      trafficPeak: 100,
      trafficStart: 0,
    });
    const r2 = getLinearTrafficRate({
      elapsed: 20,
      timeout: 60,
      trafficPeak: 100,
      trafficStart: 0,
    });
    const r3 = getLinearTrafficRate({
      elapsed: 30,
      timeout: 60,
      trafficPeak: 100,
      trafficStart: 0,
    });

    expect(r1).toBeLessThan(r2);
    expect(r2).toBeLessThan(r3);
  });
});

describe(hasRunnablePath, () => {
  it("returns false when there are no nodes", () => {
    expect(hasRunnablePath([], [])).toBe(false);
  });

  it("returns false when a users node has no outgoing edges", () => {
    const nodes = [usersNode()];

    expect(hasRunnablePath(nodes, [])).toBe(false);
  });

  it("returns true when a users node has at least one outgoing edge", () => {
    const nodes = [usersNode(), serverNode()];
    const edges = [edge("users-1", "server-1")];

    expect(hasRunnablePath(nodes, edges)).toBe(true);
  });

  it("returns false when there are edges but none from a users node", () => {
    const nodes = [serverNode(), dbNode()];
    const edges = [edge("server-1", "db-1")];

    expect(hasRunnablePath(nodes, edges)).toBe(false);
  });
});
