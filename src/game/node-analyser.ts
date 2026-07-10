import { COMPONENT_LIBRARY } from "../domain/component-library.js";
import type { ComponentDefinition, ComponentType } from "../domain/component-library.js";
import {
  toRealDuration as defaultToRealDuration,
  toRealRate as defaultToRealRate,
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
    toRealDuration = defaultToRealDuration,
    toRealRate = defaultToRealRate,
  }: {
    componentLibrary?: Record<ComponentType, ComponentDefinition>;
    toRealDuration?: (simMs: number) => number;
    toRealRate?: (simRate: number) => number;
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
  const latencyMs = toRealDuration(def.latencyMs);
  const maxCapacity = latencyMs === 0 ? Infinity : 1 / latencyMs;

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
