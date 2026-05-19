import { useMemo } from "react";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import { toGraphEdge, toGraphNode } from "../layouts/graph-adapters.js";
import { computeTrafficFlow } from "../simulation/engine.js";
import type { LevelConfig } from "../simulation/types.js";

interface GraphState {
  edges: ArchitectureEdge[];
  nodes: ArchitectureNode[];
}

const useDesignModeOverloads = (
  isSimulating: boolean,
  graphState: GraphState,
  effectiveLevelConfig: LevelConfig,
): string[] =>
  useMemo(() => {
    if (isSimulating) {
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
  }, [isSimulating, graphState, effectiveLevelConfig]);

export { useDesignModeOverloads };
