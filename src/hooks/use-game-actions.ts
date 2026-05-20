import { useCallback } from "react";
import type { Dispatch, RefObject } from "react";
import { COMPONENT_LIBRARY } from "../components/component-library.js";
import type { ComponentType } from "../components/component-library.js";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import type { Phase, PhaseAction } from "../game/phase-machine.js";
import type { GraphAction } from "../game/graph-reducer.js";
import { levelRegistry } from "../levels/index.js";
import type { LevelDefinition } from "../levels/types.js";
import type { LevelConfig } from "../simulation/types.js";

interface UseGameActionsParams {
  currentLevel: LevelDefinition;
  dispatchGraph: Dispatch<GraphAction>;
  dispatchPhase: (action: PhaseAction) => void;
  effectiveLevelConfig: LevelConfig;
  isRunnable: boolean;
  loadLevel: (level: LevelDefinition) => {
    newEdges: ArchitectureEdge[];
    newNodes: ArchitectureNode[];
  };
  markLevelComplete: (levelId: string) => void;
  phase: Phase;
  previousAvailableComponentsRef: RefObject<ComponentType[]>;
  resetEvents: (nodes: ArchitectureNode[], edges: ArchitectureEdge[]) => void;
  setCoachMessage: (msg: string) => void;
  setQueuedComponentType: (type: ComponentType | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  totalMonthlyCost: number;
}

interface UseGameActionsResult {
  handleComponentPlaced: () => void;
  handleContinue: () => void;
  handleLoadLevel: (level: LevelDefinition) => void;
  handlePlaceComponent: (componentType: ComponentType) => void;
  handleReplay: () => void;
  handleSelectLevel: (levelId: string) => void;
  handleSelectedNodeChange: (nodeId: string | null) => void;
  handleToggleTraffic: () => void;
  handleWin: () => void;
}

const useGameActions = ({
  currentLevel,
  dispatchGraph,
  dispatchPhase,
  effectiveLevelConfig,
  isRunnable,
  loadLevel,
  markLevelComplete,
  phase,
  previousAvailableComponentsRef,
  resetEvents,
  setCoachMessage,
  setQueuedComponentType,
  setSelectedNodeId,
  totalMonthlyCost,
}: UseGameActionsParams): UseGameActionsResult => {
  const handleLoadLevel = useCallback(
    (level: LevelDefinition) => {
      const { newEdges, newNodes } = loadLevel(level);

      previousAvailableComponentsRef.current = level.availableComponents;
      setCoachMessage(`Mission: ${level.objectiveText}`);
      setSelectedNodeId(null);
      setQueuedComponentType(null);
      resetEvents(newNodes, newEdges);
      dispatchGraph({ edges: newEdges, nodes: newNodes, type: "LOAD_LEVEL" });
      dispatchPhase({ type: "LOAD_LEVEL" });
    },
    [
      dispatchGraph,
      dispatchPhase,
      loadLevel,
      previousAvailableComponentsRef,
      resetEvents,
      setCoachMessage,
      setQueuedComponentType,
      setSelectedNodeId,
    ],
  );

  const handleWin = useCallback(() => {
    dispatchPhase({ type: "WIN" });
    markLevelComplete(currentLevel.id);
  }, [currentLevel.id, dispatchPhase, markLevelComplete]);

  const handleContinue = useCallback(() => {
    const currentIndex = levelRegistry.levels.findIndex((l) => l.id === currentLevel.id);
    const nextLevel = levelRegistry.levels[currentIndex + 1];

    if (nextLevel === undefined) {
      dispatchPhase({ type: "LOAD_LEVEL" });
      return;
    }

    handleLoadLevel(nextLevel);
  }, [currentLevel.id, dispatchPhase, handleLoadLevel]);

  const handleReplay = useCallback(() => {
    handleLoadLevel(currentLevel);
  }, [currentLevel, handleLoadLevel]);

  const handleSelectLevel = useCallback(
    (levelId: string) => {
      const level = levelRegistry.getLevelById(levelId);

      if (level !== undefined) {
        handleLoadLevel(level);
      }
    },
    [handleLoadLevel],
  );

  const handlePlaceComponent = useCallback(
    (componentType: ComponentType) => {
      const addedCost = COMPONENT_LIBRARY[componentType].monthlyCost;

      if (totalMonthlyCost + addedCost > effectiveLevelConfig.monthlyBudget) {
        setCoachMessage(
          `Over budget — this component costs $${addedCost}/mo but you only have $${effectiveLevelConfig.monthlyBudget - totalMonthlyCost} remaining.`,
        );
        return;
      }

      setQueuedComponentType(componentType);
    },
    [effectiveLevelConfig.monthlyBudget, setCoachMessage, setQueuedComponentType, totalMonthlyCost],
  );

  const handleComponentPlaced = useCallback(() => {
    setQueuedComponentType(null);
  }, [setQueuedComponentType]);

  const handleSelectedNodeChange = useCallback(
    (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
    },
    [setSelectedNodeId],
  );

  const handleToggleTraffic = useCallback(() => {
    if (phase === "SIMULATING") {
      dispatchPhase({ type: "STOP_SIMULATION" });
    } else if (isRunnable) {
      dispatchPhase({ type: "START_SIMULATION" });
    }
  }, [dispatchPhase, isRunnable, phase]);

  return {
    handleComponentPlaced,
    handleContinue,
    handleLoadLevel,
    handlePlaceComponent,
    handleReplay,
    handleSelectLevel,
    handleSelectedNodeChange,
    handleToggleTraffic,
    handleWin,
  };
};

export { useGameActions };
