import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { getRoutingOptions, requestRouter } from "./request-router.js";

const makeNode = (
  id: string,
  componentType: ArchitectureNode["componentType"],
): ArchitectureNode => ({
  componentType,
  id,
  position: { x: 0, y: 0 },
});

const makeEdge = (id: string, source: string, target: string): ArchitectureEdge => ({
  id,
  source,
  target,
});

describe(getRoutingOptions, () => {
  it("db returns a single FULFILLED option with weight 1", () => {
    expect(getRoutingOptions("db", [], 0)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });

  it("db-large returns a single FULFILLED option with weight 1", () => {
    expect(getRoutingOptions("db-large", [], 0)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });

  it("server with one outgoing edge returns IN_TRANSIT with weight 1", () => {
    const e = makeEdge("e1", "server-1", "db-1");
    expect(getRoutingOptions("server", [e], 0)).toStrictEqual([
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 1 },
    ]);
  });

  it("server with no outgoing edges returns FULFILLED with weight 1", () => {
    expect(getRoutingOptions("server", [], 0)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });

  it("server-large with one outgoing edge returns IN_TRANSIT with weight 1", () => {
    const e = makeEdge("e1", "s", "d");
    expect(getRoutingOptions("server-large", [e], 0)).toStrictEqual([
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 1 },
    ]);
  });

  it("users with one outgoing edge returns IN_TRANSIT with weight 1", () => {
    const e = makeEdge("e1", "u", "s");
    expect(getRoutingOptions("users", [e], 0)).toStrictEqual([
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 1 },
    ]);
  });

  it("load-balancer with 2 outgoing edges returns each IN_TRANSIT with weight 0.5", () => {
    const edges = [makeEdge("e1", "lb", "s1"), makeEdge("e2", "lb", "s2")];
    expect(getRoutingOptions("load-balancer", edges, 0)).toStrictEqual([
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 0.5 },
      { option: { edgeId: "e2", status: "IN_TRANSIT" }, weight: 0.5 },
    ]);
  });

  it("load-balancer with no outgoing edges returns FULFILLED with weight 1", () => {
    expect(getRoutingOptions("load-balancer", [], 0)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });

  it("cache returns FULFILLED at cacheHitRate weight and IN_TRANSIT at (1 - cacheHitRate) weight", () => {
    const e = makeEdge("e1", "cache-1", "db-1");
    expect(getRoutingOptions("cache", [e], 0.4)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 0.4 },
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 0.6 },
    ]);
  });

  it("cache with no outgoing edges returns FULFILLED with weight 1", () => {
    expect(getRoutingOptions("cache", [], 0.5)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });
});

describe(requestRouter, () => {
  describe("server", () => {
    it("returns FULFILLED when no outgoing edges", () => {
      expect(
        requestRouter("server-1", {
          cacheHitRate: 0,
          edges: [],
          nodes: [makeNode("server-1", "server")],
        }),
      ).toStrictEqual({ status: "FULFILLED" });
    });

    it("returns IN_TRANSIT with the first outgoing edge id when has outgoing edge", () => {
      expect(
        requestRouter("server-1", {
          cacheHitRate: 0,
          edges: [makeEdge("e1", "server-1", "db-1")],
          nodes: [makeNode("server-1", "server"), makeNode("db-1", "db")],
        }),
      ).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });
  });

  describe("server-large", () => {
    it("returns FULFILLED when no outgoing edges", () => {
      expect(
        requestRouter("server-large-1", {
          cacheHitRate: 0,
          edges: [],
          nodes: [makeNode("server-large-1", "server-large")],
        }),
      ).toStrictEqual({ status: "FULFILLED" });
    });

    it("returns IN_TRANSIT with the first outgoing edge id when has outgoing edge", () => {
      expect(
        requestRouter("server-large-1", {
          cacheHitRate: 0,
          edges: [makeEdge("e1", "server-large-1", "db-1")],
          nodes: [makeNode("server-large-1", "server-large"), makeNode("db-1", "db")],
        }),
      ).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });
  });

  describe("cache", () => {
    it("returns FULFILLED on cache hit (random < cacheHitRate)", () => {
      expect(
        requestRouter(
          "cache-1",
          {
            cacheHitRate: 0.5,
            edges: [makeEdge("e1", "cache-1", "db-1")],
            nodes: [makeNode("cache-1", "cache"), makeNode("db-1", "db")],
          },
          () => 0.3,
        ),
      ).toStrictEqual({ status: "FULFILLED" });
    });

    it("returns IN_TRANSIT with outgoing edge id on cache miss (random >= cacheHitRate)", () => {
      expect(
        requestRouter(
          "cache-1",
          {
            cacheHitRate: 0.5,
            edges: [makeEdge("e1", "cache-1", "db-1")],
            nodes: [makeNode("cache-1", "cache"), makeNode("db-1", "db")],
          },
          () => 0.7,
        ),
      ).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });
  });

  describe("load-balancer", () => {
    it("returns IN_TRANSIT (not FULFILLED) with a child edge", () => {
      expect(
        requestRouter("load-balancer-1", {
          cacheHitRate: 0,
          edges: [makeEdge("e1", "load-balancer-1", "server-1")],
          nodes: [makeNode("load-balancer-1", "load-balancer"), makeNode("server-1", "server")],
        }),
      ).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });

    it("picks the first edge when random returns 0 (2 outgoing edges)", () => {
      expect(
        requestRouter(
          "load-balancer-1",
          {
            cacheHitRate: 0,
            edges: [
              makeEdge("e1", "load-balancer-1", "server-1"),
              makeEdge("e2", "load-balancer-1", "server-2"),
            ],
            nodes: [
              makeNode("load-balancer-1", "load-balancer"),
              makeNode("server-1", "server"),
              makeNode("server-2", "server"),
            ],
          },
          () => 0,
        ),
      ).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });

    it("picks the second edge when random returns 0.9 (2 outgoing edges)", () => {
      expect(
        requestRouter(
          "load-balancer-1",
          {
            cacheHitRate: 0,
            edges: [
              makeEdge("e1", "load-balancer-1", "server-1"),
              makeEdge("e2", "load-balancer-1", "server-2"),
            ],
            nodes: [
              makeNode("load-balancer-1", "load-balancer"),
              makeNode("server-1", "server"),
              makeNode("server-2", "server"),
            ],
          },
          () => 0.9,
        ),
      ).toStrictEqual({ edgeId: "e2", status: "IN_TRANSIT" });
    });
  });

  describe("users", () => {
    it("returns IN_TRANSIT with the first outgoing edge id", () => {
      expect(
        requestRouter("users-1", {
          cacheHitRate: 0,
          edges: [makeEdge("e1", "users-1", "server-1")],
          nodes: [makeNode("users-1", "users"), makeNode("server-1", "server")],
        }),
      ).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });
  });

  describe("unknown node id", () => {
    it("returns FULFILLED", () => {
      expect(
        requestRouter("nonexistent-1", { cacheHitRate: 0, edges: [], nodes: [] }),
      ).toStrictEqual({ status: "FULFILLED" });
    });
  });
});
