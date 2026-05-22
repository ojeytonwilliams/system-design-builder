import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { requestRouter } from "./request-router.js";

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

describe(requestRouter, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("db", () => {
    it("returns FULFILLED", () => {
      const node = makeNode("db-1", "db");
      const result = requestRouter("db-1", {
        cacheHitRate: 0,
        edges: [],
        nodes: [node],
      });

      expect(result).toStrictEqual({ status: "FULFILLED" });
    });
  });

  describe("db-large", () => {
    it("returns FULFILLED", () => {
      const node = makeNode("db-large-1", "db-large");
      const result = requestRouter("db-large-1", {
        cacheHitRate: 0,
        edges: [],
        nodes: [node],
      });

      expect(result).toStrictEqual({ status: "FULFILLED" });
    });
  });

  describe("server", () => {
    it("returns FULFILLED when no outgoing edges", () => {
      const node = makeNode("server-1", "server");
      const result = requestRouter("server-1", {
        cacheHitRate: 0,
        edges: [],
        nodes: [node],
      });

      expect(result).toStrictEqual({ status: "FULFILLED" });
    });

    it("returns IN_TRANSIT with the first outgoing edge id when has outgoing edge", () => {
      const node = makeNode("server-1", "server");
      const dbNode = makeNode("db-1", "db");
      const edge = makeEdge("e1", "server-1", "db-1");
      const result = requestRouter("server-1", {
        cacheHitRate: 0,
        edges: [edge],
        nodes: [node, dbNode],
      });

      expect(result).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });
  });

  describe("server-large", () => {
    it("returns FULFILLED when no outgoing edges", () => {
      const node = makeNode("server-large-1", "server-large");
      const result = requestRouter("server-large-1", {
        cacheHitRate: 0,
        edges: [],
        nodes: [node],
      });

      expect(result).toStrictEqual({ status: "FULFILLED" });
    });

    it("returns IN_TRANSIT with the first outgoing edge id when has outgoing edge", () => {
      const node = makeNode("server-large-1", "server-large");
      const dbNode = makeNode("db-1", "db");
      const edge = makeEdge("e1", "server-large-1", "db-1");
      const result = requestRouter("server-large-1", {
        cacheHitRate: 0,
        edges: [edge],
        nodes: [node, dbNode],
      });

      expect(result).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });
  });

  describe("cache", () => {
    it("returns FULFILLED on cache hit (random < cacheHitRate)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.3);
      const node = makeNode("cache-1", "cache");
      const dbNode = makeNode("db-1", "db");
      const edge = makeEdge("e1", "cache-1", "db-1");
      const result = requestRouter("cache-1", {
        cacheHitRate: 0.5,
        edges: [edge],
        nodes: [node, dbNode],
      });

      expect(result).toStrictEqual({ status: "FULFILLED" });
    });

    it("returns IN_TRANSIT with outgoing edge id on cache miss (random >= cacheHitRate)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.7);
      const node = makeNode("cache-1", "cache");
      const dbNode = makeNode("db-1", "db");
      const edge = makeEdge("e1", "cache-1", "db-1");
      const result = requestRouter("cache-1", {
        cacheHitRate: 0.5,
        edges: [edge],
        nodes: [node, dbNode],
      });

      expect(result).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });
  });

  describe("load-balancer", () => {
    it("returns IN_TRANSIT (not FULFILLED) with a child edge", () => {
      const node = makeNode("load-balancer-1", "load-balancer");
      const serverNode = makeNode("server-1", "server");
      const edge = makeEdge("e1", "load-balancer-1", "server-1");
      const result = requestRouter("load-balancer-1", {
        cacheHitRate: 0,
        edges: [edge],
        nodes: [node, serverNode],
      });

      expect(result).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });

    it("picks the first edge when Math.random returns 0 (2 outgoing edges)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const node = makeNode("load-balancer-1", "load-balancer");
      const server1 = makeNode("server-1", "server");
      const server2 = makeNode("server-2", "server");
      const edge1 = makeEdge("e1", "load-balancer-1", "server-1");
      const edge2 = makeEdge("e2", "load-balancer-1", "server-2");
      const result = requestRouter("load-balancer-1", {
        cacheHitRate: 0,
        edges: [edge1, edge2],
        nodes: [node, server1, server2],
      });

      expect(result).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });

    it("picks the second edge when Math.random returns 0.9 (2 outgoing edges)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.9);
      const node = makeNode("load-balancer-1", "load-balancer");
      const server1 = makeNode("server-1", "server");
      const server2 = makeNode("server-2", "server");
      const edge1 = makeEdge("e1", "load-balancer-1", "server-1");
      const edge2 = makeEdge("e2", "load-balancer-1", "server-2");
      const result = requestRouter("load-balancer-1", {
        cacheHitRate: 0,
        edges: [edge1, edge2],
        nodes: [node, server1, server2],
      });

      expect(result).toStrictEqual({ edgeId: "e2", status: "IN_TRANSIT" });
    });
  });

  describe("users", () => {
    it("returns IN_TRANSIT with the first outgoing edge id", () => {
      const node = makeNode("users-1", "users");
      const serverNode = makeNode("server-1", "server");
      const edge = makeEdge("e1", "users-1", "server-1");
      const result = requestRouter("users-1", {
        cacheHitRate: 0,
        edges: [edge],
        nodes: [node, serverNode],
      });

      expect(result).toStrictEqual({ edgeId: "e1", status: "IN_TRANSIT" });
    });
  });

  describe("unknown node id", () => {
    it("returns FULFILLED", () => {
      const result = requestRouter("nonexistent-1", {
        cacheHitRate: 0,
        edges: [],
        nodes: [],
      });

      expect(result).toStrictEqual({ status: "FULFILLED" });
    });
  });
});
