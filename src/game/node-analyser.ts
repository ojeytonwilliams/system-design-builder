import { COMPONENT_LIBRARY } from "../domain/component-library.js";
import type { ComponentDefinition, ComponentType } from "../domain/component-library.js";
import {
  toDisplayDuration as defaultToDisplayDuration,
  toDisplayRate as defaultToDisplayRate,
} from "../domain/sim-time-converter.js";
import type { ArchitectureNode } from "../domain/canvas-logic.js";
import type { InspectorProps } from "../ui/components/inspector.js";
import type { NodeMetricsSnapshot } from "../simulation/metrics.js";

const getInspectorData = (
  selectedNodeId: string | null,
  nodes: ArchitectureNode[],
  nodeMetrics: NodeMetricsSnapshot,
  {
    componentLibrary = COMPONENT_LIBRARY,
    toDisplayDuration = defaultToDisplayDuration,
    toDisplayRate = defaultToDisplayRate,
  }: {
    componentLibrary?: Record<ComponentType, ComponentDefinition>;
    toDisplayDuration?: (simMs: number) => number;
    toDisplayRate?: (simRate: number) => number;
  } = {},
): InspectorProps => {
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (selectedNode === undefined) {
    return {};
  }

  const { componentType } = selectedNode;
  const def = componentLibrary[componentType];
  const selectedNodeLabel = def.label;
  const metrics = nodeMetrics.get(selectedNode.id);
  const { monthlyCost: cost } = def;
  const latencyMs = toDisplayDuration(def.latencyMs);
  const maxCapacity = latencyMs === 0 ? Infinity : 1 / latencyMs;

  const isFiniteCapacity = Number.isFinite(maxCapacity);

  const opsPerMs = metrics?.opsPerMs === undefined ? undefined : toDisplayRate(metrics.opsPerMs);

  const incomingOpsPerMs =
    metrics?.incomingOpsPerMs === undefined ? undefined : toDisplayRate(metrics.incomingOpsPerMs);

  const loadPercent =
    incomingOpsPerMs === undefined || !isFiniteCapacity
      ? undefined
      : (incomingOpsPerMs / maxCapacity) * 100;

  const isOverloaded = metrics?.isOverloaded ?? false;

  return {
    componentType,
    cost,
    incomingOpsPerMs,
    isOverloaded,
    latencyMs,
    loadPercent,
    maxCapacity,
    opsPerMs,
    selectedNodeLabel,
  };
};

export { getInspectorData };
