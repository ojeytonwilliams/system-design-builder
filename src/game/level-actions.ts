import type { Dispatch } from "react";
import type { ComponentType } from "../components/component-library.js";
import type { ArchitectureEdge, ArchitectureNode } from "../components/canvas-logic.js";
import type { LevelDefinition } from "../levels/types.js";
import type { GraphAction } from "./graph-reducer.js";
import type { PhaseAction } from "./phase-machine.js";

interface LoadLevelParams {
  dispatchGraph: Dispatch<GraphAction>;
  dispatchPhase: (action: PhaseAction) => void;
  initialiseLevel: (level: LevelDefinition) => {
    newEdges: ArchitectureEdge[];
    newNodes: ArchitectureNode[];
  };
  setPrevAvailableComponents: (components: ComponentType[]) => void;
  resetEvents: (nodes: ArchitectureNode[], edges: ArchitectureEdge[]) => void;
  setCoachMessage: (msg: string) => void;
  setQueuedComponentType: (type: ComponentType | null) => void;
  setSelectedNodeId: (id: string | null) => void;
}

const loadLevel = (level: LevelDefinition, params: LoadLevelParams): void => {
  const { newEdges, newNodes } = params.initialiseLevel(level);
  params.setPrevAvailableComponents(level.availableComponents);
  params.setCoachMessage(`Mission: ${level.objectiveText}`);
  params.setSelectedNodeId(null);
  params.setQueuedComponentType(null);
  params.resetEvents(newNodes, newEdges);
  params.dispatchGraph({ edges: newEdges, nodes: newNodes, type: "LOAD_LEVEL" });
  params.dispatchPhase({ type: "LOAD_LEVEL" });
};

const continueLevel = (
  currentLevelId: string,
  allLevels: LevelDefinition[],
  dispatchPhase: (action: PhaseAction) => void,
  onLoadLevel: (level: LevelDefinition) => void,
): void => {
  const currentIndex = allLevels.findIndex((l) => l.id === currentLevelId);
  const nextLevel = allLevels[currentIndex + 1];

  if (nextLevel === undefined) {
    dispatchPhase({ type: "LOAD_LEVEL" });
    return;
  }

  onLoadLevel(nextLevel);
};

const replayLevel = (
  currentLevel: LevelDefinition,
  onLoadLevel: (level: LevelDefinition) => void,
): void => {
  onLoadLevel(currentLevel);
};

const selectLevel = (
  levelId: string,
  getLevelById: (id: string) => LevelDefinition | undefined,
  onLoadLevel: (level: LevelDefinition) => void,
): void => {
  const level = getLevelById(levelId);

  if (level !== undefined) {
    onLoadLevel(level);
  }
};

export type { LoadLevelParams };
export { continueLevel, loadLevel, replayLevel, selectLevel };
