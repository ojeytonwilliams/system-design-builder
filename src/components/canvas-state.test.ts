import {
  addEdge,
  buildInitialGraph,
  closeContextMenu,
  deselectAll,
  moveNode,
  openEdgeContextMenu,
  openNodeContextMenu,
  placeNode,
  removeFromMenu,
  removeSelectedEdge,
  removeSelectedNode,
  selectEdge,
  selectNode,
  setEdgesAnimated,
} from "./canvas-state.js";
import type { CanvasGraph } from "./canvas-state.js";
import type { ComponentType } from "./component-library.js";

const makeGraph = (overrides: Partial<CanvasGraph> = {}): CanvasGraph => ({
  contextMenu: null,
  edges: [],
  nodes: [],
  selectedNodeId: null,
  ...overrides,
});

const makeNode = (id: string, componentType: ComponentType = "server") => ({
  data: { componentType },
  id,
  position: { x: 0, y: 0 },
  type: "architecture" as const,
});

const makeEdge = (id: string, source: string, target: string, selected = false) => ({
  animated: false,
  id,
  selected,
  source,
  target,
});

describe(buildInitialGraph, () => {
  it("starts with no selection or context menu", () => {
    const graph = buildInitialGraph([], []);
    expect(graph.selectedNodeId).toBeNull();
    expect(graph.contextMenu).toBeNull();
  });

  it("applies animated: false to initial edges without the field", () => {
    const graph = buildInitialGraph([], [{ id: "e1", source: "a", target: "b" }]);
    expect(graph.edges[0]?.animated).toBe(false);
  });

  it("preserves provided nodes", () => {
    const graph = buildInitialGraph([makeNode("server-1")], []);
    expect(graph.nodes).toHaveLength(1);
  });
});

describe(placeNode, () => {
  it("adds a node with the given component type", () => {
    const result = placeNode(makeGraph(), "server", { x: 48, y: 48 });
    expect(result.nodes[0]?.data.componentType).toBe("server");
  });

  it("uses the provided position unchanged", () => {
    const result = placeNode(makeGraph(), "server", { x: 48, y: 72 });
    expect(result.nodes[0]?.position).toStrictEqual({ x: 48, y: 72 });
  });

  it("assigns id server-1 when no server nodes exist", () => {
    const result = placeNode(makeGraph(), "server", { x: 0, y: 0 });
    expect(result.nodes[0]?.id).toBe("server-1");
  });

  it("assigns server-2 when server-1 already exists", () => {
    const graph = makeGraph({ nodes: [makeNode("server-1")] });
    const result = placeNode(graph, "server", { x: 0, y: 0 });
    expect(result.nodes[1]?.id).toBe("server-2");
  });

  it("clears selectedNodeId", () => {
    const graph = makeGraph({ selectedNodeId: "server-1" });
    expect(placeNode(graph, "server", { x: 0, y: 0 }).selectedNodeId).toBeNull();
  });

  it("clears contextMenu", () => {
    const graph = makeGraph({ contextMenu: { kind: "node", nodeId: "n1", x: 0, y: 0 } });
    expect(placeNode(graph, "server", { x: 0, y: 0 }).contextMenu).toBeNull();
  });
});

describe(selectNode, () => {
  it("sets selectedNodeId", () => {
    expect(selectNode(makeGraph(), "server-1").selectedNodeId).toBe("server-1");
  });

  it("deselects all edges", () => {
    const graph = makeGraph({ edges: [makeEdge("e1", "a", "b", true)] });
    expect(selectNode(graph, "server-1").edges[0]?.selected).toBe(false);
  });

  it("clears contextMenu", () => {
    const graph = makeGraph({ contextMenu: { kind: "node", nodeId: "n1", x: 0, y: 0 } });
    expect(selectNode(graph, "server-1").contextMenu).toBeNull();
  });
});

describe(selectEdge, () => {
  it("marks the given edge as selected", () => {
    const graph = makeGraph({ edges: [makeEdge("e1", "a", "b")] });
    expect(selectEdge(graph, "e1").edges[0]?.selected).toBe(true);
  });

  it("deselects other edges", () => {
    const graph = makeGraph({
      edges: [makeEdge("e1", "a", "b", true), makeEdge("e2", "b", "c")],
    });
    const result = selectEdge(graph, "e2");
    expect(result.edges[0]?.selected).toBe(false);
    expect(result.edges[1]?.selected).toBe(true);
  });

  it("clears selectedNodeId", () => {
    const graph = makeGraph({ selectedNodeId: "server-1" });
    expect(selectEdge(graph, "e1").selectedNodeId).toBeNull();
  });

  it("clears contextMenu", () => {
    const graph = makeGraph({ contextMenu: { kind: "node", nodeId: "n1", x: 0, y: 0 } });
    expect(selectEdge(graph, "e1").contextMenu).toBeNull();
  });
});

describe(deselectAll, () => {
  it("clears selectedNodeId", () => {
    const graph = makeGraph({ selectedNodeId: "server-1" });
    expect(deselectAll(graph).selectedNodeId).toBeNull();
  });

  it("clears contextMenu", () => {
    const graph = makeGraph({ contextMenu: { kind: "node", nodeId: "n1", x: 0, y: 0 } });
    expect(deselectAll(graph).contextMenu).toBeNull();
  });
});

describe(moveNode, () => {
  it("updates the position of the given node", () => {
    const graph = makeGraph({ nodes: [makeNode("server-1")] });
    expect(moveNode(graph, "server-1", { x: 96, y: 48 }).nodes[0]?.position).toStrictEqual({
      x: 96,
      y: 48,
    });
  });

  it("leaves other nodes unchanged", () => {
    const graph = makeGraph({
      nodes: [makeNode("server-1"), { ...makeNode("server-2"), position: { x: 200, y: 200 } }],
    });
    expect(moveNode(graph, "server-1", { x: 96, y: 48 }).nodes[1]?.position).toStrictEqual({
      x: 200,
      y: 200,
    });
  });
});

describe(removeSelectedNode, () => {
  it("returns graph unchanged when selectedNodeId is null", () => {
    const graph = makeGraph({ nodes: [makeNode("server-1")] });
    expect(removeSelectedNode(graph, []).nodes).toHaveLength(1);
  });

  it("returns graph unchanged when selected node is locked", () => {
    const graph = makeGraph({
      nodes: [makeNode("users-1", "users")],
      selectedNodeId: "users-1",
    });
    expect(removeSelectedNode(graph, ["users-1"]).nodes).toHaveLength(1);
  });

  it("removes the selected node", () => {
    const graph = makeGraph({
      nodes: [makeNode("server-1"), makeNode("server-2")],
      selectedNodeId: "server-1",
    });
    const result = removeSelectedNode(graph, []);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe("server-2");
  });

  it("removes edges connected to the deleted node", () => {
    const graph = makeGraph({
      edges: [makeEdge("e1", "server-1", "server-2")],
      nodes: [makeNode("server-1"), makeNode("server-2")],
      selectedNodeId: "server-1",
    });
    expect(removeSelectedNode(graph, []).edges).toHaveLength(0);
  });

  it("clears selectedNodeId and contextMenu", () => {
    const graph = makeGraph({
      contextMenu: { kind: "node", nodeId: "server-1", x: 0, y: 0 },
      nodes: [makeNode("server-1")],
      selectedNodeId: "server-1",
    });
    const result = removeSelectedNode(graph, []);
    expect(result.selectedNodeId).toBeNull();
    expect(result.contextMenu).toBeNull();
  });
});

describe(removeSelectedEdge, () => {
  it("returns graph unchanged when no edge is selected", () => {
    const graph = makeGraph({ edges: [makeEdge("e1", "a", "b")] });
    expect(removeSelectedEdge(graph).edges).toHaveLength(1);
  });

  it("removes the selected edge", () => {
    const graph = makeGraph({
      edges: [makeEdge("e1", "a", "b", true), makeEdge("e2", "b", "c")],
    });
    const result = removeSelectedEdge(graph);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.id).toBe("e2");
  });

  it("clears contextMenu", () => {
    const graph = makeGraph({
      contextMenu: { edgeId: "e1", kind: "edge", x: 0, y: 0 },
      edges: [makeEdge("e1", "a", "b", true)],
    });
    expect(removeSelectedEdge(graph).contextMenu).toBeNull();
  });
});

describe(addEdge, () => {
  it("returns graph unchanged when source node not found", () => {
    const graph = makeGraph({ nodes: [makeNode("server-2")] });
    expect(addEdge(graph, "server-1", "server-2").edges).toHaveLength(0);
  });

  it("returns graph unchanged when target node not found", () => {
    const graph = makeGraph({ nodes: [makeNode("server-1")] });
    expect(addEdge(graph, "server-1", "server-2").edges).toHaveLength(0);
  });

  it("returns graph unchanged when connection is invalid", () => {
    const graph = makeGraph({ nodes: [makeNode("server-1"), makeNode("users-1", "users")] });
    expect(addEdge(graph, "server-1", "users-1").edges).toHaveLength(0);
  });

  it("adds an edge between valid nodes", () => {
    const graph = makeGraph({ nodes: [makeNode("users-1", "users"), makeNode("server-1")] });
    const result = addEdge(graph, "users-1", "server-1");
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.source).toBe("users-1");
    expect(result.edges[0]?.target).toBe("server-1");
  });

  it("sets animated: false on the new edge", () => {
    const graph = makeGraph({ nodes: [makeNode("server-1"), makeNode("server-2")] });
    expect(addEdge(graph, "server-1", "server-2").edges[0]?.animated).toBe(false);
  });
});

describe(openNodeContextMenu, () => {
  it("returns graph unchanged when node is locked", () => {
    const graph = makeGraph();
    expect(
      openNodeContextMenu(graph, "users-1", { x: 100, y: 100 }, ["users-1"]).contextMenu,
    ).toBeNull();
  });

  it("opens a node context menu at the given position", () => {
    const result = openNodeContextMenu(makeGraph(), "server-1", { x: 100, y: 200 }, []);
    expect(result.contextMenu).toStrictEqual({ kind: "node", nodeId: "server-1", x: 100, y: 200 });
  });

  it("sets selectedNodeId to the node", () => {
    expect(openNodeContextMenu(makeGraph(), "server-1", { x: 0, y: 0 }, []).selectedNodeId).toBe(
      "server-1",
    );
  });
});

describe(openEdgeContextMenu, () => {
  it("opens an edge context menu at the given position", () => {
    const result = openEdgeContextMenu(makeGraph(), "e1", { x: 50, y: 75 });
    expect(result.contextMenu).toStrictEqual({ edgeId: "e1", kind: "edge", x: 50, y: 75 });
  });

  it("clears selectedNodeId", () => {
    const graph = makeGraph({ selectedNodeId: "server-1" });
    expect(openEdgeContextMenu(graph, "e1", { x: 0, y: 0 }).selectedNodeId).toBeNull();
  });
});

describe(closeContextMenu, () => {
  it("sets contextMenu to null", () => {
    const graph = makeGraph({ contextMenu: { kind: "node", nodeId: "n1", x: 0, y: 0 } });
    expect(closeContextMenu(graph).contextMenu).toBeNull();
  });
});

describe(removeFromMenu, () => {
  it("returns graph unchanged when contextMenu is null", () => {
    const graph = makeGraph({ nodes: [makeNode("server-1")] });
    expect(removeFromMenu(graph).nodes).toHaveLength(1);
  });

  it("removes the node referenced in a node context menu", () => {
    const graph = makeGraph({
      contextMenu: { kind: "node", nodeId: "server-1", x: 0, y: 0 },
      nodes: [makeNode("server-1"), makeNode("server-2")],
    });
    const result = removeFromMenu(graph);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe("server-2");
  });

  it("removes edges connected to the node", () => {
    const graph = makeGraph({
      contextMenu: { kind: "node", nodeId: "server-1", x: 0, y: 0 },
      edges: [makeEdge("e1", "server-1", "server-2")],
      nodes: [makeNode("server-1"), makeNode("server-2")],
    });
    expect(removeFromMenu(graph).edges).toHaveLength(0);
  });

  it("removes the edge referenced in an edge context menu", () => {
    const graph = makeGraph({
      contextMenu: { edgeId: "e1", kind: "edge", x: 0, y: 0 },
      edges: [makeEdge("e1", "a", "b"), makeEdge("e2", "b", "c")],
    });
    const result = removeFromMenu(graph);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.id).toBe("e2");
  });

  it("closes the context menu after removing", () => {
    const graph = makeGraph({
      contextMenu: { kind: "node", nodeId: "server-1", x: 0, y: 0 },
      nodes: [makeNode("server-1")],
    });
    expect(removeFromMenu(graph).contextMenu).toBeNull();
  });
});

describe(setEdgesAnimated, () => {
  it("sets animated: true on all edges", () => {
    const graph = makeGraph({
      edges: [makeEdge("e1", "a", "b"), makeEdge("e2", "b", "c")],
    });
    const result = setEdgesAnimated(graph, true);
    expect(result.edges[0]?.animated).toBe(true);
    expect(result.edges[1]?.animated).toBe(true);
  });

  it("sets animated: false on all edges", () => {
    const graph = makeGraph({ edges: [{ ...makeEdge("e1", "a", "b"), animated: true }] });
    expect(setEdgesAnimated(graph, false).edges[0]?.animated).toBe(false);
  });
});
