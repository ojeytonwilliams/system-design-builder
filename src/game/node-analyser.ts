import { COMPONENT_LIBRARY } from "../domain/component-library.js";
import type { ArchitectureNode } from "../domain/canvas-logic.js";
import type { InspectorProps } from "../ui/components/inspector.js";
import type { TrafficSnapshot } from "../simulation/types.js";

const MS_PER_SECOND = 1000;

const getInspectorData = (
  selectedNodeId: string | null,
  nodes: ArchitectureNode[],
  nodeStates: TrafficSnapshot,
  tickDeltaMs: number,
): InspectorProps => {
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (selectedNode === undefined) {
    return {};
  }

  const { componentType } = selectedNode;
  const def = COMPONENT_LIBRARY[componentType];
  const selectedNodeLabel = def.label;
  const nodeState = nodeStates[selectedNode.id];
  const { capacity: maxCapacity, latencyMs, monthlyCost: cost } = def;

  const isFiniteCapacity = Number.isFinite(maxCapacity);

  const opsPerSec =
    nodeState !== undefined && tickDeltaMs > 0
      ? nodeState.incomingOps / (tickDeltaMs / MS_PER_SECOND)
      : undefined;

  const loadPercent =
    opsPerSec === undefined || !isFiniteCapacity ? undefined : (opsPerSec / maxCapacity) * 100;

  const isOverloaded =
    opsPerSec === undefined || !isFiniteCapacity ? undefined : opsPerSec > maxCapacity;

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
