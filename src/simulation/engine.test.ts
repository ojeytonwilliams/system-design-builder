import { computeRevenue, computeTrafficFlow, getTrafficRate } from "./engine.js";
import type { GraphEdge, GraphNode, TrafficScheduleEntry } from "./types.js";

const CACHE_HIT_RATE_NONE = 0;
const SERVER_CAPACITY = 100;
const DB_CAPACITY = 100;
const CACHE_CAPACITY = 200;

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

const revenueConfig = (edges: GraphEdge[], cacheHitRate = CACHE_HIT_RATE_NONE) => ({
  cacheHitRate,
  edges,
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

      const result = computeTrafficFlow(nodes, edges, flowConfig(50));

      expect(result["server-1"]?.incomingOps).toBe(50);
    });

    it("server handles traffic up to its capacity", () => {
      const nodes = [usersNode(), serverNode("server-1", 80)];
      const edges = [edge("users-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(150));

      expect(result["server-1"]?.handledOps).toBe(80);
    });

    it("server drops traffic that exceeds its capacity", () => {
      const nodes = [usersNode(), serverNode("server-1", 80)];
      const edges = [edge("users-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(150));

      expect(result["server-1"]?.droppedOps).toBe(70);
    });

    it("server has zero dropped ops when traffic is within capacity", () => {
      const nodes = [usersNode(), serverNode()];
      const edges = [edge("users-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(50));

      expect(result["server-1"]?.droppedOps).toBe(0);
    });
  });

  describe("users to server to db chain", () => {
    it("the db receives the server's handled ops", () => {
      const nodes = [usersNode(), serverNode(), dbNode()];
      const edges = [edge("users-1", "server-1"), edge("server-1", "db-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(50));

      expect(result["db-1"]?.incomingOps).toBe(50);
    });

    it("the db only receives handled (not dropped) ops from server", () => {
      const nodes = [usersNode(), serverNode("server-1", 80), dbNode()];
      const edges = [edge("users-1", "server-1"), edge("server-1", "db-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(150));

      expect(result["db-1"]?.incomingOps).toBe(80);
    });

    it("disconnected node has zero incoming ops", () => {
      const nodes = [usersNode(), serverNode(), dbNode()];
      const edges = [edge("users-1", "server-1")];

      const result = computeTrafficFlow(nodes, edges, flowConfig(100));

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

      const result = computeTrafficFlow(nodes, edges, flowConfig(100, hitRate));

      expect(result["db-1"]?.incomingOps).toBeCloseTo(60);
    });

    it("intercepts all traffic when hit rate is 1.0", () => {
      const nodes = [usersNode(), serverNode(), cacheNode(), dbNode()];
      const edges = [
        edge("users-1", "server-1"),
        edge("server-1", "cache-1"),
        edge("cache-1", "db-1"),
      ];

      const result = computeTrafficFlow(nodes, edges, flowConfig(100, 1.0));

      expect(result["db-1"]?.incomingOps).toBe(0);
    });

    it("forwards all traffic when hit rate is 0", () => {
      const nodes = [usersNode(), serverNode(), cacheNode(), dbNode()];
      const edges = [
        edge("users-1", "server-1"),
        edge("server-1", "cache-1"),
        edge("cache-1", "db-1"),
      ];

      const result = computeTrafficFlow(nodes, edges, flowConfig(100, 0));

      expect(result["db-1"]?.incomingOps).toBe(100);
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

describe("revenue", () => {
  it("earns $0.10 per handled op at the sink node", () => {
    const nodes = [usersNode(), serverNode()];
    const edges = [edge("users-1", "server-1")];
    const snapshot = computeTrafficFlow(nodes, edges, flowConfig(100));

    const revenue = computeRevenue(snapshot, nodes, revenueConfig(edges));

    expect(revenue).toBeCloseTo(10);
  });

  it("earns zero revenue with no connections", () => {
    const nodes = [usersNode()];
    const snapshot = computeTrafficFlow(nodes, [], flowConfig(100));

    const revenue = computeRevenue(snapshot, nodes, revenueConfig([]));

    expect(revenue).toBe(0);
  });

  it("dropped ops at the sink earn no revenue", () => {
    const nodes = [usersNode(), serverNode("server-1", 50)];
    const edges = [edge("users-1", "server-1")];
    const snapshot = computeTrafficFlow(nodes, edges, flowConfig(100));

    const revenue = computeRevenue(snapshot, nodes, revenueConfig(edges));

    expect(revenue).toBeCloseTo(5);
  });

  it("counts revenue from both cache hits and db handled ops", () => {
    const nodes = [usersNode(), serverNode(), cacheNode(), dbNode()];
    const edges = [
      edge("users-1", "server-1"),
      edge("server-1", "cache-1"),
      edge("cache-1", "db-1"),
    ];
    const hitRate = 0.5;
    const snapshot = computeTrafficFlow(nodes, edges, flowConfig(100, hitRate));

    const revenue = computeRevenue(snapshot, nodes, revenueConfig(edges, hitRate));

    // Cache handles 100 ops: 50 hits (complete at cache) + 50 misses → db handles 50
    // Total completed = 50 + 50 = 100 ops → $10
    expect(revenue).toBeCloseTo(10);
  });

  it("load balancer nodes do not contribute to revenue", () => {
    const nodes = [usersNode(), lbNode(), serverNode()];
    const edges = [edge("users-1", "lb-1"), edge("lb-1", "server-1")];
    const snapshot = computeTrafficFlow(nodes, edges, flowConfig(100));

    const revenue = computeRevenue(snapshot, nodes, revenueConfig(edges));

    // Only server-1 (the sink) earns revenue
    expect(revenue).toBeCloseTo(10);
  });
});

describe("traffic rate schedule", () => {
  const schedule: TrafficScheduleEntry[] = [
    { opsPerSec: 50, startTime: 0 },
    { opsPerSec: 100, startTime: 10 },
    { opsPerSec: 200, startTime: 20 },
  ];

  it("returns the rate from the first schedule entry at time 0", () => {
    expect(getTrafficRate(schedule, 0)).toBe(50);
  });

  it("returns updated rate when elapsed time reaches a new schedule entry", () => {
    expect(getTrafficRate(schedule, 10)).toBe(100);
  });

  it("returns the latest applicable rate between schedule entries", () => {
    expect(getTrafficRate(schedule, 15)).toBe(100);
  });

  it("returns the highest rate at the final schedule entry", () => {
    expect(getTrafficRate(schedule, 30)).toBe(200);
  });

  it("returns 0 when elapsed time is before the first entry", () => {
    const lateSchedule: TrafficScheduleEntry[] = [{ opsPerSec: 50, startTime: 5 }];

    expect(getTrafficRate(lateSchedule, 3)).toBe(0);
  });
});
