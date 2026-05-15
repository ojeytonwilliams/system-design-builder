import {
  chooseBestHandles,
  createNodeData,
  getHandlePosition,
  getNextNodeId,
  isConnectionValid,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  removeNodeAndConnections,
  snapPositionToGrid,
} from "./canvas-logic.js";

const makeNode = (id: string, x: number, y: number, componentType = "server" as const) =>
  ({
    data: { componentType },
    id,
    position: { x, y },
    type: "architecture" as const,
  }) as const;

describe(snapPositionToGrid, () => {
  it("snaps to the nearest 24px grid cell", () => {
    expect(snapPositionToGrid({ x: 145, y: 117 })).toStrictEqual({ x: 144, y: 120 });
  });

  it("snaps 1px past a dot back to that dot", () => {
    expect(snapPositionToGrid({ x: 25, y: 25 })).toStrictEqual({ x: 24, y: 24 });
  });
});

describe(isConnectionValid, () => {
  it("allows server → server", () => {
    expect(isConnectionValid("server", "server")).toBe(true);
  });

  it("allows users → server", () => {
    expect(isConnectionValid("users", "server")).toBe(true);
  });

  it("blocks any source → users", () => {
    expect(isConnectionValid("server", "users")).toBe(false);
    expect(isConnectionValid("db", "users")).toBe(false);
  });
});

describe(chooseBestHandles, () => {
  it("returns right→left when target is to the right", () => {
    expect(chooseBestHandles(makeNode("a", 0, 0), makeNode("b", 200, 0))).toStrictEqual({
      sourceHandle: "right",
      targetHandle: "left",
    });
  });

  it("returns left→right when target is to the left", () => {
    expect(chooseBestHandles(makeNode("a", 200, 0), makeNode("b", 0, 0))).toStrictEqual({
      sourceHandle: "left",
      targetHandle: "right",
    });
  });

  it("returns bottom→top when target is below", () => {
    expect(chooseBestHandles(makeNode("a", 0, 0), makeNode("b", 0, 200))).toStrictEqual({
      sourceHandle: "bottom",
      targetHandle: "top",
    });
  });

  it("returns top→bottom when target is above", () => {
    expect(chooseBestHandles(makeNode("a", 0, 200), makeNode("b", 0, 0))).toStrictEqual({
      sourceHandle: "top",
      targetHandle: "bottom",
    });
  });

  it("prefers horizontal when dx equals dy", () => {
    expect(chooseBestHandles(makeNode("a", 0, 0), makeNode("b", 100, 100))).toStrictEqual({
      sourceHandle: "right",
      targetHandle: "left",
    });
  });
});

describe(getHandlePosition, () => {
  it("right handle is at the right-centre of the node", () => {
    const node = makeNode("n", 0, 0);
    expect(getHandlePosition(node, "right")).toStrictEqual({
      x: NODE_WIDTH,
      y: NODE_MIN_HEIGHT / 2,
    });
  });

  it("left handle is at the left-centre of the node", () => {
    const node = makeNode("n", 100, 50);
    expect(getHandlePosition(node, "left")).toStrictEqual({
      x: 100,
      y: 50 + NODE_MIN_HEIGHT / 2,
    });
  });

  it("bottom handle is at the bottom-centre of the node", () => {
    const node = makeNode("n", 0, 0);
    expect(getHandlePosition(node, "bottom")).toStrictEqual({
      x: NODE_WIDTH / 2,
      y: NODE_MIN_HEIGHT,
    });
  });

  it("top handle is at the top-centre of the node", () => {
    const node = makeNode("n", 0, 0);
    expect(getHandlePosition(node, "top")).toStrictEqual({ x: NODE_WIDTH / 2, y: 0 });
  });
});

describe(createNodeData, () => {
  it("returns an object with the given componentType", () => {
    expect(createNodeData("server")).toStrictEqual({ componentType: "server" });
  });
});

describe(getNextNodeId, () => {
  it("returns componentType-1 when no nodes exist", () => {
    expect(getNextNodeId("server", [])).toBe("server-1");
  });

  it("increments past existing ids", () => {
    const nodes = [makeNode("server-1", 0, 0), makeNode("server-2", 0, 0)];
    expect(getNextNodeId("server", nodes)).toBe("server-3");
  });

  it("fills gaps in the sequence", () => {
    const nodes = [makeNode("server-1", 0, 0), makeNode("server-3", 0, 0)];
    expect(getNextNodeId("server", nodes)).toBe("server-2");
  });
});

describe(removeNodeAndConnections, () => {
  it("removes the node from the nodes array", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 0, 0)];
    const result = removeNodeAndConnections("a", nodes, []);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe("b");
  });

  it("removes edges where the node is the source", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 0, 0)];
    const edges = [{ id: "e1", source: "a", target: "b" }];
    expect(removeNodeAndConnections("a", nodes, edges).edges).toHaveLength(0);
  });

  it("removes edges where the node is the target", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 0, 0)];
    const edges = [{ id: "e1", source: "b", target: "a" }];
    expect(removeNodeAndConnections("a", nodes, edges).edges).toHaveLength(0);
  });

  it("keeps unrelated edges", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 0, 0), makeNode("c", 0, 0)];
    const edges = [
      { id: "e1", source: "b", target: "c" },
      { id: "e2", source: "a", target: "b" },
    ];
    const result = removeNodeAndConnections("a", nodes, edges);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.id).toBe("e1");
  });
});
