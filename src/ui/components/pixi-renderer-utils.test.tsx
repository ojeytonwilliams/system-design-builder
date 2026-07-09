import { NODE_MIN_HEIGHT, NODE_WIDTH } from "../../domain/canvas-logic.js";
import type { ArchitectureEdge, ArchitectureNode } from "../../domain/canvas-logic.js";
import type { NodeMetricsSnapshot } from "../../simulation/metrics.js";
import { computeNodeLoadRatio, getTransitDotPosition } from "./pixi-renderer-utils.js";

const makeMetrics = (nodeId: string, incomingOpsPerMs: number): NodeMetricsSnapshot =>
  new Map([[nodeId, { incomingOpsPerMs, isOverloaded: false, opsPerMs: 0 }]]);

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
    // n-1 at (0,0), n-2 at (200,0): dx>dy → sourceHandle="right"
    expect(getTransitDotPosition({ edgeId: "e-1", progress: 0 }, edges, nodes)).toStrictEqual({
      x: NODE_WIDTH,
      y: NODE_MIN_HEIGHT / 2,
    });
  });

  it("at progress=1 returns the target handle position", () => {
    // targetHandle="left"
    expect(getTransitDotPosition({ edgeId: "e-1", progress: 1 }, edges, nodes)).toStrictEqual({
      x: 200,
      y: NODE_MIN_HEIGHT / 2,
    });
  });

  it("returns an interpolated position for intermediate progress", () => {
    const pos = getTransitDotPosition({ edgeId: "e-1", progress: 0.5 }, edges, nodes);
    expect(pos).not.toBeNull();
    expect(pos!.y).toBeCloseTo(NODE_MIN_HEIGHT / 2);
    expect(pos!.x).toBeGreaterThan(NODE_WIDTH);
    expect(pos!.x).toBeLessThan(200);
  });

  it("shifts returned position by positive laneOffset on a horizontal curve", () => {
    // horizontal curve → offset is vertical: y += laneOffset
    const pos = getTransitDotPosition({ edgeId: "e-1", progress: 0 }, edges, nodes, 4);
    expect(pos).toStrictEqual({ x: NODE_WIDTH, y: NODE_MIN_HEIGHT / 2 + 4 });
  });

  it("shifts returned position by negative laneOffset on a horizontal curve", () => {
    const pos = getTransitDotPosition({ edgeId: "e-1", progress: 0 }, edges, nodes, -4);
    expect(pos).toStrictEqual({ x: NODE_WIDTH, y: NODE_MIN_HEIGHT / 2 - 4 });
  });
});

describe(computeNodeLoadRatio, () => {
  it("returns 0 when the node has no metrics", () => {
    expect(computeNodeLoadRatio("n-1", 0.18, new Map())).toBe(0);
  });

  it("returns 0 for Infinity capacity", () => {
    expect(computeNodeLoadRatio("n-1", Infinity, makeMetrics("n-1", 0.12))).toBe(0);
  });

  it("returns incoming rate / capacity when under capacity", () => {
    expect(computeNodeLoadRatio("n-1", 0.18, makeMetrics("n-1", 0.12))).toBeCloseTo(0.12 / 0.18);
  });

  it("clamps to 1 when incoming rate exceeds capacity", () => {
    expect(computeNodeLoadRatio("n-1", 0.18, makeMetrics("n-1", 0.36))).toBe(1);
  });

  it("ignores metrics for other nodes", () => {
    expect(computeNodeLoadRatio("n-1", 0.18, makeMetrics("n-2", 0.12))).toBe(0);
  });
});
