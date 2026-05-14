import { useMemo } from "react";
import { COMPONENT_LIBRARY } from "../components/component-library.js";
import type { ArchitectureCanvasNode } from "../components/game-canvas.js";
import type { InspectorProps } from "../components/inspector.js";
import type { TrafficSnapshot } from "../simulation/types.js";

const useInspectorData = (
  selectedNodeId: string | null,
  nodes: ArchitectureCanvasNode[],
  nodeStates: TrafficSnapshot,
): InspectorProps =>
  useMemo(() => {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);

    if (selectedNode === undefined) {
      return {};
    }

    const { componentType, label: selectedNodeLabel } = selectedNode.data;
    const def = COMPONENT_LIBRARY[componentType];
    const nodeState = nodeStates[selectedNode.id];
    const opsPerSec = nodeState?.incomingOps;
    const { capacity: maxCapacity, latencyMs, monthlyCost: cost } = def;

    const isFiniteCapacity = Number.isFinite(maxCapacity);
    const loadPercent =
      nodeState === undefined || !isFiniteCapacity
        ? undefined
        : (nodeState.incomingOps / maxCapacity) * 100;

    const isOverloaded =
      nodeState === undefined || !isFiniteCapacity
        ? undefined
        : nodeState.incomingOps > maxCapacity;

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
  }, [selectedNodeId, nodes, nodeStates]);

export { useInspectorData };
