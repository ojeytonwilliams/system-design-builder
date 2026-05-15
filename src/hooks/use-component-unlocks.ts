import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType } from "../components/component-library.js";
import type { ArchitectureNode } from "../components/game-canvas.js";
import type { LevelDefinition } from "../levels/types.js";
import { toGraphNode } from "../layouts/graph-adapters.js";
import { computeAvailableComponents, updateOverloadDurations } from "../simulation/unlocks.js";
import type { OverloadDurations } from "../simulation/unlocks.js";
import type { TrafficSnapshot } from "../simulation/types.js";

interface UseComponentUnlocksResult {
  applySnapshot: (snapshot: TrafficSnapshot, nodes: ArchitectureNode[]) => void;
  availableComponents: ComponentType[];
  resetForLevel: (level: LevelDefinition, nodes: ArchitectureNode[]) => void;
  updateFromGraph: (nodes: ArchitectureNode[]) => void;
}

const EMPTY_SNAPSHOT: TrafficSnapshot = {};
const EMPTY_DURATIONS: OverloadDurations = new Map();

const useComponentUnlocks = (
  currentLevel: LevelDefinition,
  initialNodes: ArchitectureNode[],
): UseComponentUnlocksResult => {
  const overloadDurationsRef = useRef<OverloadDurations>(EMPTY_DURATIONS);
  const currentLevelRef = useRef(currentLevel);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  const [availableComponents, setAvailableComponents] = useState<ComponentType[]>(() =>
    computeAvailableComponents(currentLevel.availableComponents, currentLevel.componentUnlocks, {
      graphNodes: initialNodes.map(toGraphNode),
      overloadDurations: EMPTY_DURATIONS,
      snapshot: EMPTY_SNAPSHOT,
    }),
  );

  const applySnapshot = useCallback((snapshot: TrafficSnapshot, nodes: ArchitectureNode[]) => {
    const next = updateOverloadDurations(overloadDurationsRef.current, snapshot);

    overloadDurationsRef.current = next;

    const level = currentLevelRef.current;

    setAvailableComponents(
      computeAvailableComponents(level.availableComponents, level.componentUnlocks, {
        graphNodes: nodes.map(toGraphNode),
        overloadDurations: next,
        snapshot,
      }),
    );
  }, []);

  const updateFromGraph = useCallback((nodes: ArchitectureNode[]) => {
    const level = currentLevelRef.current;

    setAvailableComponents(
      computeAvailableComponents(level.availableComponents, level.componentUnlocks, {
        graphNodes: nodes.map(toGraphNode),
        overloadDurations: EMPTY_DURATIONS,
        snapshot: EMPTY_SNAPSHOT,
      }),
    );
  }, []);

  const resetForLevel = useCallback((level: LevelDefinition, nodes: ArchitectureNode[]) => {
    overloadDurationsRef.current = new Map();
    setAvailableComponents(
      computeAvailableComponents(level.availableComponents, level.componentUnlocks, {
        graphNodes: nodes.map(toGraphNode),
        overloadDurations: EMPTY_DURATIONS,
        snapshot: EMPTY_SNAPSHOT,
      }),
    );
  }, []);

  return { applySnapshot, availableComponents, resetForLevel, updateFromGraph };
};

export { useComponentUnlocks };
