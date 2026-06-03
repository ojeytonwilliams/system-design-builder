import type { ArchitectureEdge, ArchitectureNode } from "../../domain/canvas-logic.js";
import type { Processing } from "../../simulation/request-types.js";
import { computeNodeFillRatio, getTransitDotPosition } from "./pixi-renderer-utils.js";

const makeProcessing = (nodeId: string): Processing => ({
  durationMs: 100,
  elapsedMs: 0,
  nodeId,
  progress: 0,
  requestId: "req-1",
});

describe(getTransitDotPosition, () => {
  const nodes: ArchitectureNode[] = [
    { componentType: "users", id: "n-1", position: { x: 0, y: 0 } },
    { componentType: "server", id: "n-2", position: { x: 200, y: 0 } },
  ];
  const edges: ArchitectureEdge[] = [{ id: "e-1", source: "n-1", target: "n-2" }];

  it("returns null when edge is not found", () => {
    expect(getTransitDotPosition({ edgeId: "missing", progress: 0 }, edges, nodes)).toBeNull();
  });

  it("returns null when source node is not found", () => {
    const badEdges: ArchitectureEdge[] = [{ id: "e-1", source: "missing", target: "n-2" }];
    expect(getTransitDotPosition({ edgeId: "e-1", progress: 0 }, badEdges, nodes)).toBeNull();
  });

  it("returns null when target node is not found", () => {
    const badEdges: ArchitectureEdge[] = [{ id: "e-1", source: "n-1", target: "missing" }];
    expect(getTransitDotPosition({ edgeId: "e-1", progress: 0 }, badEdges, nodes)).toBeNull();
  });

  it("at progress=0 returns the source handle position", () => {
    // n-1 at (0,0), n-2 at (200,0): dx>dy → sourceHandle="right" → {x:88, y:48}
    expect(getTransitDotPosition({ edgeId: "e-1", progress: 0 }, edges, nodes)).toStrictEqual({
      x: 88,
      y: 48,
    });
  });

  it("at progress=1 returns the target handle position", () => {
    // targetHandle="left" → {x:200, y:48}
    expect(getTransitDotPosition({ edgeId: "e-1", progress: 1 }, edges, nodes)).toStrictEqual({
      x: 200,
      y: 48,
    });
  });

  it("returns an interpolated position for intermediate progress", () => {
    const pos = getTransitDotPosition({ edgeId: "e-1", progress: 0.5 }, edges, nodes);
    expect(pos).not.toBeNull();
    expect(pos!.y).toBeCloseTo(48);
    expect(pos!.x).toBeGreaterThan(88);
    expect(pos!.x).toBeLessThan(200);
  });

  it("shifts returned position by positive laneOffset on a horizontal curve", () => {
    // horizontal curve → offset is vertical: y += laneOffset
    const pos = getTransitDotPosition({ edgeId: "e-1", progress: 0 }, edges, nodes, 4);
    expect(pos).toStrictEqual({ x: 88, y: 52 });
  });

  it("shifts returned position by negative laneOffset on a horizontal curve", () => {
    const pos = getTransitDotPosition({ edgeId: "e-1", progress: 0 }, edges, nodes, -4);
    expect(pos).toStrictEqual({ x: 88, y: 44 });
  });
});

describe(computeNodeFillRatio, () => {
  it("returns 0 for Infinity capacity", () => {
    const processing = new Map([["req-1", makeProcessing("n-1")]]);
    expect(computeNodeFillRatio("n-1", Infinity, processing)).toBe(0);
  });

  it("returns 0 when no processing entries for the node", () => {
    expect(computeNodeFillRatio("n-1", 50, new Map())).toBe(0);
  });

  it("returns count / capacity when partially filled", () => {
    const processing = new Map([
      ["req-1", makeProcessing("n-1")],
      ["req-2", { ...makeProcessing("n-1"), requestId: "req-2" }],
    ]);
    expect(computeNodeFillRatio("n-1", 50, processing)).toBe(2 / 50);
  });

  it("clamps to 1 when at capacity", () => {
    const entries = Array.from({ length: 50 }, (_, i) => [
      `req-${i}`,
      { ...makeProcessing("n-1"), requestId: `req-${i}` },
    ]) as [string, Processing][];
    expect(computeNodeFillRatio("n-1", 50, new Map(entries))).toBe(1);
  });

  it("ignores processing entries for other nodes", () => {
    const processing = new Map([["req-1", makeProcessing("n-2")]]);
    expect(computeNodeFillRatio("n-1", 50, processing)).toBe(0);
  });
});
