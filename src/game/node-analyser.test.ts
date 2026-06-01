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

  it("opsPerSec converts simulation ops/s to real-world ops/s", () => {
    const nodeMetrics: NodeMetricsSnapshot = new Map([
      ["server-1", { incomingOpsPerSec: 0.2, isOverloaded: false, opsPerSec: 0.15 }],
    ]);

    const result = getInspectorData("server-1", [serverNode], nodeMetrics);

    expect(result.opsPerSec).toBe(0.15 * TIME_SCALE);
  });

  it("opsPerSec is undefined when node has no metrics entry", () => {
    const result = getInspectorData("server-1", [serverNode], new Map());

    expect(result.opsPerSec).toBeUndefined();
  });

  it("loadPercent converts simulation incomingOpsPerSec to real-world percentage of capacity", () => {
    const nodeMetrics: NodeMetricsSnapshot = new Map([
      // 0.25 sim ops/s = 25 real ops/s; server capacity = 50 real ops/s → 50%
      ["server-1", { incomingOpsPerSec: 0.25, isOverloaded: false, opsPerSec: 0.25 }],
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
      ["lb-1", { incomingOpsPerSec: 100, isOverloaded: false, opsPerSec: 100 }],
    ]);

    const result = getInspectorData("lb-1", [lbNode], nodeMetrics);

    expect(result.loadPercent).toBeUndefined();
  });

  it("isOverloaded equals nodeMetrics.get(nodeId)?.isOverloaded", () => {
    const nodeMetrics: NodeMetricsSnapshot = new Map([
      ["server-1", { incomingOpsPerSec: 60, isOverloaded: true, opsPerSec: 30 }],
    ]);

    const result = getInspectorData("server-1", [serverNode], nodeMetrics);

    expect(result.isOverloaded).toBe(true);
  });

  it("isOverloaded defaults to false when node has no metrics entry", () => {
    const result = getInspectorData("server-1", [serverNode], new Map());

    expect(result.isOverloaded).toBe(false);
  });
});
