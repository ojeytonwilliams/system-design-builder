import type { ArchitectureNode } from "../domain/canvas-logic.js";
import { TIME_SCALE } from "../domain/component-library.js";
import { getInspectorData } from "./node-analyser.js";
import type { NodeMetricsSnapshot } from "../simulation/metrics.js";

const serverNode: ArchitectureNode = {
  componentType: "server",
  id: "server-1",
  position: { x: 0, y: 0 },
};

const lbNode: ArchitectureNode = {
  componentType: "load-balancer",
  id: "lb-1",
  position: { x: 0, y: 0 },
};

describe(getInspectorData, () => {
  it("returns empty object when no node is selected", () => {
    expect(getInspectorData(null, [], new Map())).toStrictEqual({});
  });

  it("returns empty object when selectedNodeId does not match any node", () => {
    expect(getInspectorData("missing-id", [serverNode], new Map())).toStrictEqual({});
  });

  it("opsPerMs converts simulation ops/ms to real-world ops/ms", () => {
    const nodeMetrics: NodeMetricsSnapshot = new Map([
      ["server-1", { incomingOpsPerMs: 0.2, isOverloaded: false, opsPerMs: 0.15 }],
    ]);

    const result = getInspectorData("server-1", [serverNode], nodeMetrics);

    expect(result.opsPerMs).toBe(0.15 * TIME_SCALE);
  });

  it("opsPerMs is undefined when node has no metrics entry", () => {
    const result = getInspectorData("server-1", [serverNode], new Map());

    expect(result.opsPerMs).toBeUndefined();
  });

  it("loadPercent converts simulation incomingOpsPerMs to real-world percentage of capacity", () => {
    const nodeMetrics: NodeMetricsSnapshot = new Map([
      // 0.00025 sim ops/ms = 0.025 real ops/ms = 25 real ops/s; server capacity = 0.05 ops/ms = 50 ops/s → 50%
      ["server-1", { incomingOpsPerMs: 0.00025, isOverloaded: false, opsPerMs: 0.00025 }],
    ]);

    const result = getInspectorData("server-1", [serverNode], nodeMetrics);

    expect(result.loadPercent).toBe(50);
  });

  it("loadPercent is undefined when node has no metrics entry", () => {
    const result = getInspectorData("server-1", [serverNode], new Map());

    expect(result.loadPercent).toBeUndefined();
  });

  it("loadPercent is undefined for infinite-capacity nodes", () => {
    const nodeMetrics: NodeMetricsSnapshot = new Map([
      ["lb-1", { incomingOpsPerMs: 100, isOverloaded: false, opsPerMs: 100 }],
    ]);

    const result = getInspectorData("lb-1", [lbNode], nodeMetrics);

    expect(result.loadPercent).toBeUndefined();
  });

  it("isOverloaded equals nodeMetrics.get(nodeId)?.isOverloaded", () => {
    const nodeMetrics: NodeMetricsSnapshot = new Map([
      ["server-1", { incomingOpsPerMs: 60, isOverloaded: true, opsPerMs: 30 }],
    ]);

    const result = getInspectorData("server-1", [serverNode], nodeMetrics);

    expect(result.isOverloaded).toBe(true);
  });

  it("isOverloaded defaults to false when node has no metrics entry", () => {
    const result = getInspectorData("server-1", [serverNode], new Map());

    expect(result.isOverloaded).toBe(false);
  });
});
