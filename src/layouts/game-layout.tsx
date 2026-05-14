import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COMPONENT_LIBRARY } from "../components/component-library.js";
import type { ComponentType } from "../components/component-library.js";
import { Coach } from "../components/coach.js";
import { EndOfLevelScreen } from "../components/end-of-level-screen.js";
import { EventLog } from "../components/event-log.js";
import type { ArchitectureCanvasNode, Edge } from "../components/game-canvas.js";
import { GameCanvas } from "../components/game-canvas.js";
import { Inspector } from "../components/inspector.js";
import { LevelStrip } from "../components/level-strip.js";
import { Resources } from "../components/palette.js";
import { TopBar } from "../components/top-bar.js";
import { LEVELS, getLevelById } from "../levels/index.js";
import type { LevelDefinition } from "../levels/types.js";
import { useCompactLayout } from "../hooks/use-compact-layout.js";
import { useComponentUnlocks } from "../hooks/use-component-unlocks.js";
import { useEventLog } from "../hooks/use-event-log.js";
import { useInspectorData } from "../hooks/use-inspector-data.js";
import { useLevel } from "../hooks/use-level.js";
import { useSimulationTick } from "../hooks/use-simulation-tick.js";
import { toGraphEdge, toGraphNode } from "./graph-adapters.js";
import type { LevelConfig } from "../simulation/types.js";
import { computeTrafficFlow, hasRunnablePath } from "../simulation/engine.js";
import { SimulationProvider, useSimulation } from "../store.js";

const MOBILE_LAYOUT_BREAKPOINT = 768;

interface GameLayoutProps {
  initialEdges?: Edge[];
  initialNodes?: ArchitectureCanvasNode[];
  levelConfig?: LevelConfig;
}

interface GameLayoutContentProps {
  initialEdges: Edge[];
  initialNodes: ArchitectureCanvasNode[];
  levelConfig: LevelConfig | undefined;
}

const GameLayoutContent = ({
  initialEdges,
  initialNodes,
  levelConfig: propLevelConfig,
}: GameLayoutContentProps) => {
  const { currentTrafficRate, endSimulation, mode, nodeStates, startSimulation, tick } =
    useSimulation();

  const {
    canvasKey,
    completedLevels,
    currentLevel,
    levelStartEdges,
    levelStartNodes,
    loadLevel,
    markLevelComplete,
  } = useLevel(initialNodes, initialEdges);

  const { appendEvent, eventEntries, resetEvents } = useEventLog();
  const isCompactLayout = useCompactLayout(MOBILE_LAYOUT_BREAKPOINT);
  const { applySnapshot, availableComponents, resetForLevel, updateFromGraph } =
    useComponentUnlocks(currentLevel, levelStartNodes);

  const [coachMessage, setCoachMessage] = useState(`Mission: ${currentLevel.objectiveText}`);
  const [queuedComponentType, setQueuedComponentType] = useState<ComponentType | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showEndScreen, setShowEndScreen] = useState(false);

  const [graphState, setGraphState] = useState(() => ({
    edges: levelStartEdges,
    nodes: levelStartNodes,
  }));
  const graphRef = useRef({ edges: levelStartEdges, nodes: levelStartNodes });

  const inspectorData = useInspectorData(selectedNodeId, graphState.nodes, nodeStates);

  const effectiveLevelConfig = useMemo<LevelConfig>(
    () =>
      propLevelConfig ?? {
        cacheHitRate: currentLevel.cacheHitRate,
        monthlyBudget: currentLevel.monthlyBudget,
        timeout: currentLevel.timeout,
        trafficPeak: currentLevel.trafficPeak,
        trafficStart: currentLevel.trafficStart,
        trafficTarget: currentLevel.trafficTarget,
      },
    [propLevelConfig, currentLevel],
  );

  const previousAvailableComponentsRef = useRef<ComponentType[]>(currentLevel.availableComponents);

  useEffect(() => {
    resetEvents(graphRef.current.nodes, graphRef.current.edges);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const newlyUnlocked = availableComponents.filter(
      (c) => !previousAvailableComponentsRef.current.includes(c),
    );

    newlyUnlocked.forEach((c) => {
      appendEvent(`Concept unlocked: ${COMPONENT_LIBRARY[c].label}`);
      setCoachMessage(
        `Unlocked: ${COMPONENT_LIBRARY[c].label}. Try using it to improve your architecture.`,
      );
    });

    previousAvailableComponentsRef.current = availableComponents;
  }, [appendEvent, availableComponents]);

  const isRunnable = hasRunnablePath(
    graphState.nodes.map(toGraphNode),
    graphState.edges.map(toGraphEdge),
  );
  const totalMonthlyCost = graphState.nodes.reduce(
    (sum, node) => sum + COMPONENT_LIBRARY[node.data.componentType].monthlyCost,
    0,
  );
  const remainingBudget = effectiveLevelConfig.monthlyBudget - totalMonthlyCost;

  const designModeOverloadedNodeIds = useMemo(() => {
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

  const simulationOverloadedNodeIds = Object.entries(nodeStates)
    .filter(([, s]) => s.droppedOps > 0)
    .map(([id]) => id);
  const overloadedNodeIds =
    mode === "SIMULATE" ? simulationOverloadedNodeIds : designModeOverloadedNodeIds;

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
      graphRef.current = { edges: newEdges, nodes: newNodes };
      endSimulation();
    },
    [endSimulation, loadLevel, resetEvents, resetForLevel],
  );

  const handleWin = useCallback(() => {
    setShowEndScreen(true);
    markLevelComplete(currentLevel.id);
  }, [currentLevel.id, markLevelComplete]);

  useSimulationTick({
    appendEvent,
    applySnapshot,
    currentLevel,
    effectiveLevelConfig,
    endSimulation,
    graphRef,
    mode,
    onWin: handleWin,
    resetKey: canvasKey,
    setCoachMessage,
    tick,
  });

  const handleToggleTraffic = useCallback(() => {
    if (mode === "SIMULATE") {
      endSimulation();
    } else if (isRunnable) {
      startSimulation();
    }
  }, [endSimulation, isRunnable, mode, startSimulation]);

  const handleContinue = useCallback(() => {
    const nextLevel = getLevelById(currentLevel.id + 1);

    if (nextLevel === undefined) {
      setShowEndScreen(false);

      return;
    }

    handleLoadLevel(nextLevel);
  }, [currentLevel.id, handleLoadLevel]);

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
    [effectiveLevelConfig.monthlyBudget, totalMonthlyCost],
  );

  const handleComponentPlaced = useCallback(() => {
    setQueuedComponentType(null);
  }, []);

  const handleGraphChange = useCallback(
    (nodes: ArchitectureCanvasNode[], edges: Edge[]) => {
      const previousNodeIds = new Set(graphRef.current.nodes.map((n) => n.id));
      const previousEdgeIds = new Set(graphRef.current.edges.map((e) => e.id));

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

      setGraphState({ edges, nodes });
      graphRef.current = { edges, nodes };
      updateFromGraph(nodes);
    },
    [appendEvent, updateFromGraph],
  );

  const handleSelectedNodeChange = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const isLocked = mode === "SIMULATE";

  return (
    <div
      data-testid="game-layout-shell"
      style={{
        background: "#f5f5f0",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        height: "100dvh",
        overflowX: "hidden",
      }}
    >
      <TopBar
        currentReqPerSec={currentTrafficRate}
        levelNumber={currentLevel.id}
        levelTitle={currentLevel.title}
        mode={mode}
        monthlyBudget={effectiveLevelConfig.monthlyBudget}
        objectiveText={currentLevel.objectiveText}
        onStartTraffic={handleToggleTraffic}
        remainingBudget={remainingBudget}
        startTrafficDisabled={!isRunnable}
        totalMonthlyCost={totalMonthlyCost}
        trafficTarget={effectiveLevelConfig.trafficTarget}
      />
      <LevelStrip
        completedLevelIds={completedLevels}
        currentLevelId={currentLevel.id}
        levels={LEVELS}
        onSelectLevel={handleSelectLevel}
      />
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: isCompactLayout ? "column" : "row",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {!isCompactLayout && (
          <section
            aria-label="Resources"
            style={{ flexShrink: 0, overflowY: "auto", width: "16rem" }}
          >
            <Resources
              availableComponents={availableComponents}
              isDisabled={isLocked}
              onPlaceComponent={handlePlaceComponent}
            />
          </section>
        )}
        <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <GameCanvas
            componentToPlace={queuedComponentType}
            initialEdges={levelStartEdges}
            initialNodes={levelStartNodes}
            isLocked={isLocked}
            isSimulating={mode === "SIMULATE"}
            key={canvasKey}
            lockedNodeIds={currentLevel.lockedNodeIds}
            onComponentPlaced={handleComponentPlaced}
            onSelectedNodeChange={handleSelectedNodeChange}
            onStateChange={handleGraphChange}
            overloadedNodeIds={overloadedNodeIds}
          />
        </main>
        <aside
          style={{
            borderLeft: isCompactLayout ? "none" : "1px solid #d0cfc8",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflowY: "auto",
            width: isCompactLayout ? "100%" : "16rem",
          }}
        >
          <section aria-label="Inspector" style={{ flexShrink: 0 }}>
            <Inspector
              componentType={inspectorData.componentType}
              cost={inspectorData.cost}
              isOverloaded={inspectorData.isOverloaded}
              latencyMs={inspectorData.latencyMs}
              loadPercent={inspectorData.loadPercent}
              maxCapacity={inspectorData.maxCapacity}
              opsPerSec={inspectorData.opsPerSec}
              selectedNodeLabel={inspectorData.selectedNodeLabel}
            />
          </section>
          <Coach message={coachMessage} />
          <EventLog entries={eventEntries} />
        </aside>
        {isCompactLayout && (
          <section aria-label="Resources" style={{ flexShrink: 0, width: "100%" }}>
            <Resources
              availableComponents={availableComponents}
              isCompact
              isDisabled={isLocked}
              onPlaceComponent={handlePlaceComponent}
            />
          </section>
        )}
      </div>
      {showEndScreen && (
        <EndOfLevelScreen
          feedbackLines={currentLevel.feedbackText}
          monthlyBudget={effectiveLevelConfig.monthlyBudget}
          onContinue={handleContinue}
          onReplay={handleReplay}
          remainingBudget={remainingBudget}
          title={currentLevel.title}
        />
      )}
    </div>
  );
};

const GameLayout = ({ initialEdges = [], initialNodes = [], levelConfig }: GameLayoutProps) => (
  <SimulationProvider>
    <GameLayoutContent
      initialEdges={initialEdges}
      initialNodes={initialNodes}
      levelConfig={levelConfig}
    />
  </SimulationProvider>
);

export { GameLayout };
export type { GameLayoutProps };
