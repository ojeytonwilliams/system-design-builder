import type { ArchitectureEdge, ArchitectureNode } from "../components/canvas-logic.js";
import { graphReducer } from "./graph-reducer.js";
import type { GraphState } from "./graph-reducer.js";

const nodeA: ArchitectureNode = { componentType: "users", id: "users-1", position: { x: 0, y: 0 } };
const nodeB: ArchitectureNode = {
  componentType: "server",
  id: "server-1",
  position: { x: 96, y: 0 },
};
const edgeAB: ArchitectureEdge = { id: "edge-1", source: "users-1", target: "server-1" };
const emptyState: GraphState = { edges: [], nodes: [] };

describe(graphReducer, () => {
  describe("PLACE_NODE", () => {
    it("adds a node with the correct component type", () => {
      const next = graphReducer(emptyState, {
        componentType: "server",
        position: { x: 0, y: 0 },
        type: "PLACE_NODE",
      });
      expect(next.nodes).toHaveLength(1);
      expect(next.nodes[0]?.componentType).toBe("server");
    });

    it("generates id server-1 when no server nodes exist", () => {
      const next = graphReducer(emptyState, {
        componentType: "server",
        position: { x: 0, y: 0 },
        type: "PLACE_NODE",
      });
      expect(next.nodes[0]?.id).toBe("server-1");
    });

    it("generates server-2 when server-1 already exists", () => {
      const state: GraphState = { edges: [], nodes: [nodeB] };
      const next = graphReducer(state, {
        componentType: "server",
        position: { x: 0, y: 0 },
        type: "PLACE_NODE",
      });
      expect(next.nodes[1]?.id).toBe("server-2");
    });

    it("stores the given position on the node", () => {
      const next = graphReducer(emptyState, {
        componentType: "server",
        position: { x: 48, y: 96 },
        type: "PLACE_NODE",
      });
      expect(next.nodes[0]?.position).toStrictEqual({ x: 48, y: 96 });
    });

    it("does not modify existing edges", () => {
      const state: GraphState = { edges: [edgeAB], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, {
        componentType: "server",
        position: { x: 0, y: 0 },
        type: "PLACE_NODE",
      });
      expect(next.edges).toHaveLength(1);
    });
  });

  describe("ADD_EDGE", () => {
    it("adds an edge between compatible nodes", () => {
      const state: GraphState = { edges: [], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, {
        sourceId: "users-1",
        targetId: "server-1",
        type: "ADD_EDGE",
      });
      expect(next.edges).toHaveLength(1);
      expect(next.edges[0]?.source).toBe("users-1");
      expect(next.edges[0]?.target).toBe("server-1");
    });

    it("no-ops when the connection is invalid", () => {
      const state: GraphState = { edges: [], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, {
        sourceId: "server-1",
        targetId: "users-1",
        type: "ADD_EDGE",
      });
      expect(next.edges).toHaveLength(0);
    });

    it("no-ops when the source node does not exist", () => {
      const state: GraphState = { edges: [], nodes: [nodeB] };
      const next = graphReducer(state, {
        sourceId: "users-1",
        targetId: "server-1",
        type: "ADD_EDGE",
      });
      expect(next.edges).toHaveLength(0);
    });

    it("no-ops when the target node does not exist", () => {
      const state: GraphState = { edges: [], nodes: [nodeA] };
      const next = graphReducer(state, {
        sourceId: "users-1",
        targetId: "server-1",
        type: "ADD_EDGE",
      });
      expect(next.edges).toHaveLength(0);
    });
  });

  describe("MOVE_NODE", () => {
    it("updates the position of the target node", () => {
      const state: GraphState = { edges: [], nodes: [nodeB] };
      const next = graphReducer(state, {
        nodeId: "server-1",
        position: { x: 200, y: 300 },
        type: "MOVE_NODE",
      });
      expect(next.nodes[0]?.position).toStrictEqual({ x: 200, y: 300 });
    });

    it("leaves other nodes unchanged", () => {
      const state: GraphState = { edges: [], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, {
        nodeId: "server-1",
        position: { x: 200, y: 300 },
        type: "MOVE_NODE",
      });
      expect(next.nodes[0]?.position).toStrictEqual(nodeA.position);
    });

    it("no-ops when the nodeId does not exist", () => {
      const state: GraphState = { edges: [], nodes: [nodeB] };
      const next = graphReducer(state, {
        nodeId: "unknown-1",
        position: { x: 200, y: 300 },
        type: "MOVE_NODE",
      });
      expect(next.nodes[0]?.position).toStrictEqual(nodeB.position);
    });
  });

  describe("REMOVE_NODE", () => {
    it("removes the node by id", () => {
      const state: GraphState = { edges: [], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, { nodeId: "server-1", type: "REMOVE_NODE" });
      expect(next.nodes).toHaveLength(1);
      expect(next.nodes[0]?.id).toBe("users-1");
    });

    it("also removes all edges connected to the node", () => {
      const state: GraphState = { edges: [edgeAB], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, { nodeId: "server-1", type: "REMOVE_NODE" });
      expect(next.edges).toHaveLength(0);
    });

    it("no-ops when the nodeId does not exist", () => {
      const state: GraphState = { edges: [edgeAB], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, { nodeId: "unknown-1", type: "REMOVE_NODE" });
      expect(next.nodes).toHaveLength(2);
      expect(next.edges).toHaveLength(1);
    });
  });

  describe("REMOVE_EDGE", () => {
    it("removes the edge by id", () => {
      const state: GraphState = { edges: [edgeAB], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, { edgeId: "edge-1", type: "REMOVE_EDGE" });
      expect(next.edges).toHaveLength(0);
    });

    it("leaves other edges intact", () => {
      const edgeBA: ArchitectureEdge = { id: "edge-2", source: "server-1", target: "users-1" };
      const state: GraphState = { edges: [edgeAB, edgeBA], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, { edgeId: "edge-1", type: "REMOVE_EDGE" });
      expect(next.edges).toHaveLength(1);
      expect(next.edges[0]?.id).toBe("edge-2");
    });

    it("no-ops when the edgeId does not exist", () => {
      const state: GraphState = { edges: [edgeAB], nodes: [nodeA, nodeB] };
      const next = graphReducer(state, { edgeId: "unknown", type: "REMOVE_EDGE" });
      expect(next.edges).toHaveLength(1);
    });
  });

  describe("LOAD_LEVEL", () => {
    it("sets nodes and edges from the level", () => {
      const next = graphReducer(emptyState, {
        edges: [edgeAB],
        nodes: [nodeA, nodeB],
        type: "LOAD_LEVEL",
      });
      expect(next.nodes).toHaveLength(2);
      expect(next.edges).toHaveLength(1);
    });

    it("discards all prior user edits", () => {
      const populated: GraphState = { edges: [edgeAB], nodes: [nodeA, nodeB] };
      const next = graphReducer(populated, {
        edges: [],
        nodes: [nodeA],
        type: "LOAD_LEVEL",
      });
      expect(next.nodes).toHaveLength(1);
      expect(next.edges).toHaveLength(0);
    });
  });
});
