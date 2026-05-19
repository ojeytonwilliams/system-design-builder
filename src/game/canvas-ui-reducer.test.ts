import { canvasUIReducer } from "./canvas-ui-reducer.js";
import type { CanvasUIState } from "./canvas-ui-reducer.js";

const emptyState: CanvasUIState = { contextMenu: null, selectedEdgeId: null };

describe(canvasUIReducer, () => {
  describe("sELECT_NODE", () => {
    it("clears contextMenu", () => {
      const state: CanvasUIState = {
        contextMenu: { kind: "node", nodeId: "server-1", x: 0, y: 0 },
        selectedEdgeId: null,
      };
      expect(canvasUIReducer(state, { type: "SELECT_NODE" }).contextMenu).toBeNull();
    });

    it("clears selectedEdgeId", () => {
      const state: CanvasUIState = { contextMenu: null, selectedEdgeId: "edge-1" };
      expect(canvasUIReducer(state, { type: "SELECT_NODE" }).selectedEdgeId).toBeNull();
    });
  });

  describe("sELECT_EDGE", () => {
    it("sets selectedEdgeId", () => {
      const next = canvasUIReducer(emptyState, { edgeId: "edge-1", type: "SELECT_EDGE" });
      expect(next.selectedEdgeId).toBe("edge-1");
    });

    it("clears contextMenu", () => {
      const state: CanvasUIState = {
        contextMenu: { kind: "node", nodeId: "server-1", x: 0, y: 0 },
        selectedEdgeId: null,
      };
      expect(
        canvasUIReducer(state, { edgeId: "edge-1", type: "SELECT_EDGE" }).contextMenu,
      ).toBeNull();
    });
  });

  describe("dESELECT_ALL", () => {
    it("clears selectedEdgeId", () => {
      const state: CanvasUIState = { contextMenu: null, selectedEdgeId: "edge-1" };
      expect(canvasUIReducer(state, { type: "DESELECT_ALL" }).selectedEdgeId).toBeNull();
    });

    it("clears contextMenu", () => {
      const state: CanvasUIState = {
        contextMenu: { kind: "node", nodeId: "server-1", x: 0, y: 0 },
        selectedEdgeId: null,
      };
      expect(canvasUIReducer(state, { type: "DESELECT_ALL" }).contextMenu).toBeNull();
    });
  });

  describe("oPEN_NODE_CONTEXT_MENU", () => {
    it("sets a node context menu at the given position", () => {
      const next = canvasUIReducer(emptyState, {
        nodeId: "server-1",
        type: "OPEN_NODE_CONTEXT_MENU",
        x: 100,
        y: 200,
      });
      expect(next.contextMenu).toStrictEqual({ kind: "node", nodeId: "server-1", x: 100, y: 200 });
    });

    it("clears selectedEdgeId", () => {
      const state: CanvasUIState = { contextMenu: null, selectedEdgeId: "edge-1" };
      const next = canvasUIReducer(state, {
        nodeId: "server-1",
        type: "OPEN_NODE_CONTEXT_MENU",
        x: 0,
        y: 0,
      });
      expect(next.selectedEdgeId).toBeNull();
    });
  });

  describe("oPEN_EDGE_CONTEXT_MENU", () => {
    it("sets an edge context menu at the given position", () => {
      const next = canvasUIReducer(emptyState, {
        edgeId: "edge-1",
        type: "OPEN_EDGE_CONTEXT_MENU",
        x: 50,
        y: 75,
      });
      expect(next.contextMenu).toStrictEqual({ edgeId: "edge-1", kind: "edge", x: 50, y: 75 });
    });

    it("clears selectedEdgeId", () => {
      const state: CanvasUIState = { contextMenu: null, selectedEdgeId: "edge-1" };
      const next = canvasUIReducer(state, {
        edgeId: "edge-2",
        type: "OPEN_EDGE_CONTEXT_MENU",
        x: 0,
        y: 0,
      });
      expect(next.selectedEdgeId).toBeNull();
    });
  });

  describe("cLOSE_CONTEXT_MENU", () => {
    it("clears contextMenu", () => {
      const state: CanvasUIState = {
        contextMenu: { kind: "node", nodeId: "server-1", x: 0, y: 0 },
        selectedEdgeId: null,
      };
      expect(canvasUIReducer(state, { type: "CLOSE_CONTEXT_MENU" }).contextMenu).toBeNull();
    });

    it("does not change selectedEdgeId", () => {
      const state: CanvasUIState = { contextMenu: null, selectedEdgeId: "edge-1" };
      expect(canvasUIReducer(state, { type: "CLOSE_CONTEXT_MENU" }).selectedEdgeId).toBe("edge-1");
    });
  });
});
