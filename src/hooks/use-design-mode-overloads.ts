import { useMemo } from "react";
import type { ArchitectureCanvasNode, Edge } from "../components/game-canvas.js";
import { toGraphEdge, toGraphNode } from "../layouts/graph-adapters.js";
import { computeTrafficFlow } from "../simulation/engine.js";
import type { LevelConfig, SimulationMode } from "../simulation/types.js";

interface GraphState {
  edges: Edge[];
  nodes: ArchitectureCanvasNode[];
}

const useDesignModeOverloads = (
  mode: SimulationMode,
  graphState: GraphState,
  effectiveLevelConfig: LevelConfig,
): string[] =>
  useMemo(() => {
    if (mode === "SIMULATE") {
      return [];
    }

    const snapshot = computeTrafficFlow(
      graphState.nodes.map(toGraphNode),
      graphState.edges.map(toGraphEdge),
      {
        cacheHitRate: effectiveLevelConfig.cacheHitRate,
        trafficRate: effectiveLevelConfig.trafficStart,
      },
    );

    return Object.entries(snapshot)
      .filter(([, s]) => s.droppedOps > 0)
      .map(([id]) => id);
  }, [mode, graphState, effectiveLevelConfig]);

export { useDesignModeOverloads };
export type { GraphState };
