import { useCallback } from "react";
import type { RefObject } from "react";
import { COMPONENT_LIBRARY } from "../components/component-library.js";
import type { ComponentType } from "../components/component-library.js";
import type { ArchitectureCanvasNode, Edge } from "../components/game-canvas.js";
import { getLevelById } from "../levels/index.js";
import type { LevelDefinition } from "../levels/types.js";
import type { LevelConfig, SimulationMode } from "../simulation/types.js";

interface GraphSnapshot {
  edges: Edge[];
  nodes: ArchitectureCanvasNode[];
}

interface UseGameActionsParams {
  appendEvent: (text: string) => void;
  currentLevel: LevelDefinition;
  effectiveLevelConfig: LevelConfig;
  endSimulation: () => void;
  graphState: GraphSnapshot;
  isRunnable: boolean;
  loadLevel: (level: LevelDefinition) => { newEdges: Edge[]; newNodes: ArchitectureCanvasNode[] };
  markLevelComplete: (levelId: number) => void;
  mode: SimulationMode;
  previousAvailableComponentsRef: RefObject<ComponentType[]>;
  resetEvents: (nodes: ArchitectureCanvasNode[], edges: Edge[]) => void;
  resetForLevel: (level: LevelDefinition, nodes: ArchitectureCanvasNode[]) => void;
  setCoachMessage: (msg: string) => void;
  setGraphState: (state: GraphSnapshot) => void;
  setQueuedComponentType: (type: ComponentType | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setShowEndScreen: (show: boolean) => void;
  startSimulation: () => void;
  totalMonthlyCost: number;
  updateFromGraph: (nodes: ArchitectureCanvasNode[]) => void;
}

interface UseGameActionsResult {
  handleComponentPlaced: () => void;
  handleContinue: () => void;
  handleGraphChange: (nodes: ArchitectureCanvasNode[], edges: Edge[]) => void;
  handleLoadLevel: (level: LevelDefinition) => void;
  handlePlaceComponent: (componentType: ComponentType) => void;
  handleReplay: () => void;
  handleSelectLevel: (levelId: number) => void;
  handleSelectedNodeChange: (nodeId: string | null) => void;
  handleToggleTraffic: () => void;
  handleWin: () => void;
}

const useGameActions = ({
  appendEvent,
  currentLevel,
  effectiveLevelConfig,
  endSimulation,
  graphState,
  isRunnable,
  loadLevel,
  markLevelComplete,
  mode,
  previousAvailableComponentsRef,
  resetEvents,
  resetForLevel,
  setCoachMessage,
  setGraphState,
  setQueuedComponentType,
  setSelectedNodeId,
  setShowEndScreen,
  startSimulation,
  totalMonthlyCost,
  updateFromGraph,
}: UseGameActionsParams): UseGameActionsResult => {
  const handleLoadLevel = useCallback(
    (level: LevelDefinition) => {
      const { newEdges, newNodes } = loadLevel(level);

      previousAvailableComponentsRef.current = level.availableComponents;
      setCoachMessage(`Mission: ${level.objectiveText}`);
      setSelectedNodeId(null);
      setShowEndScreen(false);
      setQueuedComponentType(null);
      resetEvents(newNodes, newEdges);
      resetForLevel(level, newNodes);
      setGraphState({ edges: newEdges, nodes: newNodes });
      endSimulation();
    },
    [
      endSimulation,
      loadLevel,
      previousAvailableComponentsRef,
      resetEvents,
      resetForLevel,
      setCoachMessage,
      setGraphState,
      setQueuedComponentType,
      setSelectedNodeId,
      setShowEndScreen,
    ],
  );

  const handleWin = useCallback(() => {
    setShowEndScreen(true);
    markLevelComplete(currentLevel.id);
  }, [currentLevel.id, markLevelComplete, setShowEndScreen]);

  const handleContinue = useCallback(() => {
    const nextLevel = getLevelById(currentLevel.id + 1);

    if (nextLevel === undefined) {
      setShowEndScreen(false);
      return;
    }

    handleLoadLevel(nextLevel);
  }, [currentLevel.id, handleLoadLevel, setShowEndScreen]);

  const handleReplay = useCallback(() => {
    handleLoadLevel(currentLevel);
  }, [currentLevel, handleLoadLevel]);

  const handleSelectLevel = useCallback(
    (levelId: number) => {
      const level = getLevelById(levelId);

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

  const handleGraphChange = useCallback(
    (nodes: ArchitectureCanvasNode[], edges: Edge[]) => {
      const previousNodeIds = new Set(graphState.nodes.map((n) => n.id));
      const previousEdgeIds = new Set(graphState.edges.map((e) => e.id));

      nodes.forEach((node) => {
        if (!previousNodeIds.has(node.id)) {
          appendEvent(`Component placed: ${COMPONENT_LIBRARY[node.data.componentType].label}`);
        }
      });

      edges.forEach((edge) => {
        if (!previousEdgeIds.has(edge.id)) {
          appendEvent(`Connection created: ${edge.source} → ${edge.target}`);
        }
      });

      updateFromGraph(nodes);
    },
    [appendEvent, graphState, updateFromGraph],
  );

  const handleSelectedNodeChange = useCallback(
    (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
    },
    [setSelectedNodeId],
  );

  const handleToggleTraffic = useCallback(() => {
    if (mode === "SIMULATE") {
      endSimulation();
    } else if (isRunnable) {
      startSimulation();
    }
  }, [endSimulation, isRunnable, mode, startSimulation]);

  return {
    handleComponentPlaced,
    handleContinue,
    handleGraphChange,
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
export type { UseGameActionsParams, UseGameActionsResult };
