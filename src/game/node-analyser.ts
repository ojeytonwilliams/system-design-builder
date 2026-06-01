import { COMPONENT_LIBRARY } from "../domain/component-library.js";
import { toRealDuration, toRealRate } from "../domain/sim-time-converter.js";
import type { ArchitectureNode } from "../domain/canvas-logic.js";
import type { InspectorProps } from "../ui/components/inspector.js";
import type { NodeMetricsSnapshot } from "../simulation/metrics.js";

const getInspectorData = (
  selectedNodeId: string | null,
  nodes: ArchitectureNode[],
  nodeMetrics: NodeMetricsSnapshot,
): InspectorProps => {
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (selectedNode === undefined) {
    return {};
  }

  const { componentType } = selectedNode;
  const def = COMPONENT_LIBRARY[componentType];
  const selectedNodeLabel = def.label;
  const metrics = nodeMetrics.get(selectedNode.id);
  const { monthlyCost: cost } = def;
  const maxCapacity = toRealRate(def.capacity);
  const latencyMs = toRealDuration(def.latencyMs);

  const isFiniteCapacity = Number.isFinite(maxCapacity);

  const opsPerMs = metrics?.opsPerMs === undefined ? undefined : toRealRate(metrics.opsPerMs);

  const incomingOpsPerMs =
    metrics?.incomingOpsPerMs === undefined ? undefined : toRealRate(metrics.incomingOpsPerMs);

  const loadPercent =
    incomingOpsPerMs === undefined || !isFiniteCapacity
      ? undefined
      : (incomingOpsPerMs / maxCapacity) * 100;

  const isOverloaded = metrics?.isOverloaded ?? false;

  return {
    componentType,
    cost,
    isOverloaded,
    latencyMs,
    loadPercent,
    maxCapacity,
    opsPerMs,
    selectedNodeLabel,
  };
};

export { getInspectorData };
