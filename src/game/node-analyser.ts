import { COMPONENT_LIBRARY, toRealRate } from "../domain/component-library.js";
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
  const { capacity: maxCapacity, latencyMs, monthlyCost: cost } = def;

  const isFiniteCapacity = Number.isFinite(maxCapacity);

  const opsPerSec = metrics?.opsPerSec === undefined ? undefined : toRealRate(metrics.opsPerSec);

  const incomingOpsPerSec =
    metrics?.incomingOpsPerSec === undefined ? undefined : toRealRate(metrics.incomingOpsPerSec);

  const loadPercent =
    incomingOpsPerSec === undefined || !isFiniteCapacity
      ? undefined
      : (incomingOpsPerSec / maxCapacity) * 100;

  const isOverloaded = metrics?.isOverloaded ?? false;

  return {
    componentType,
    cost,
    isOverloaded,
    latencyMs,
    loadPercent,
    maxCapacity,
    opsPerSec,
    selectedNodeLabel,
  };
};

export { getInspectorData };
