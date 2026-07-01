import type { ArchitectureNode } from "../domain/canvas-logic.js";
import { COMPONENT_LIBRARY_FIXTURE } from "../domain/test-fixtures.js";
import { convertRate } from "../domain/sim-time-converter.js";
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
      ["server-1", { incomingOpsPerMs: 0.2, isOverloaded: false, opsPerMs: convertRate(15) }],
    ]);

    const result = getInspectorData("server-1", [serverNode], nodeMetrics);

    expect(result.opsPerMs).toBe(15);
  });

  it("opsPerMs is undefined when node has no metrics entry", () => {
    const result = getInspectorData("server-1", [serverNode], new Map());

    expect(result.opsPerMs).toBeUndefined();
  });

  it("incomingOpsPerMs converts simulation incoming ops/ms to real-world ops/ms", () => {
    const nodeMetrics: NodeMetricsSnapshot = new Map([
      ["server-1", { incomingOpsPerMs: convertRate(20), isOverloaded: false, opsPerMs: 0.1 }],
    ]);

    const result = getInspectorData("server-1", [serverNode], nodeMetrics);

    expect(result.incomingOpsPerMs).toBe(20);
  });

  it("incomingOpsPerMs is undefined when node has no metrics entry", () => {
    const result = getInspectorData("server-1", [serverNode], new Map());

    expect(result.incomingOpsPerMs).toBeUndefined();
  });

  it("loadPercent converts simulation incomingOpsPerMs to real-world percentage of capacity", () => {
    const serverCapacity = COMPONENT_LIBRARY_FIXTURE.server.capacity;
    const nodeMetrics: NodeMetricsSnapshot = new Map([
      [
        "server-1",
        { incomingOpsPerMs: serverCapacity / 2, isOverloaded: false, opsPerMs: serverCapacity / 2 },
      ],
    ]);

    const result = getInspectorData("server-1", [serverNode], nodeMetrics, {
      componentLibrary: COMPONENT_LIBRARY_FIXTURE,
    });

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
