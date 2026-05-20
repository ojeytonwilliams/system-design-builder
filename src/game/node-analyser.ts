import { COMPONENT_LIBRARY } from "../domain/component-library.js";
import type { ArchitectureNode } from "../domain/canvas-logic.js";
import type { InspectorProps } from "../ui/components/inspector.js";
import type { TrafficSnapshot } from "../simulation/types.js";

const getInspectorData = (
  selectedNodeId: string | null,
  nodes: ArchitectureNode[],
  nodeStates: TrafficSnapshot,
): InspectorProps => {
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (selectedNode === undefined) {
    return {};
  }

  const { componentType } = selectedNode;
  const def = COMPONENT_LIBRARY[componentType];
  const selectedNodeLabel = def.label;
  const nodeState = nodeStates[selectedNode.id];
  const opsPerSec = nodeState?.incomingOps;
  const { capacity: maxCapacity, latencyMs, monthlyCost: cost } = def;

  const isFiniteCapacity = Number.isFinite(maxCapacity);
  const loadPercent =
    nodeState === undefined || !isFiniteCapacity
      ? undefined
      : (nodeState.incomingOps / maxCapacity) * 100;

  const isOverloaded =
    nodeState === undefined || !isFiniteCapacity ? undefined : nodeState.incomingOps > maxCapacity;

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
