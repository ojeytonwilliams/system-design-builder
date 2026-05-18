import { useEffect, useRef, useState } from "react";
import { COMPONENT_LIBRARY } from "../components/component-library.js";
import type { ComponentType } from "../components/component-library.js";
import { Coach } from "../components/coach.js";
import { EndOfLevelScreen } from "../components/end-of-level-screen.js";
import { EventLog } from "../components/event-log.js";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import { GameCanvas } from "../components/game-canvas.js";
import { Inspector } from "../components/inspector.js";
import { LevelStrip } from "../components/level-strip.js";
import { Resources } from "../components/palette.js";
import { TopBar } from "../components/top-bar.js";
import { levelRegistry } from "../levels/index.js";
import { useCompactLayout } from "../hooks/use-compact-layout.js";
import { useComponentUnlocks } from "../hooks/use-component-unlocks.js";
import { useDesignModeOverloads } from "../hooks/use-design-mode-overloads.js";
import { useEventLog } from "../hooks/use-event-log.js";
import { useGameActions } from "../hooks/use-game-actions.js";
import { useInspectorData } from "../hooks/use-inspector-data.js";
import { useLevel } from "../hooks/use-level.js";
import { useSimulationTick } from "../hooks/use-simulation-tick.js";
import { toGraphEdge, toGraphNode } from "./graph-adapters.js";
import { resolveEffectiveLevelConfig } from "./resolve-effective-level-config.js";
import { hasRunnablePath } from "../simulation/engine.js";
import type { LevelConfig } from "../simulation/types.js";
import { SimulationProvider, useSimulation } from "../store.js";

const MOBILE_LAYOUT_BREAKPOINT = 768;

interface GameLayoutProps {
  initialEdges?: ArchitectureEdge[];
  initialNodes?: ArchitectureNode[];
  levelConfig?: LevelConfig;
}

interface GameLayoutContentProps {
  initialEdges: ArchitectureEdge[];
  initialNodes: ArchitectureNode[];
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

  const previousAvailableComponentsRef = useRef<ComponentType[]>(currentLevel.availableComponents);

  const effectiveLevelConfig = resolveEffectiveLevelConfig(propLevelConfig, currentLevel);

  const inspectorData = useInspectorData(selectedNodeId, graphState.nodes, nodeStates);

  const isRunnable = hasRunnablePath(
    graphState.nodes.map(toGraphNode),
    graphState.edges.map(toGraphEdge),
  );
  const totalMonthlyCost = graphState.nodes.reduce(
    (sum, node) => sum + COMPONENT_LIBRARY[node.componentType].monthlyCost,
    0,
  );
  const remainingBudget = effectiveLevelConfig.monthlyBudget - totalMonthlyCost;

  const designModeOverloadedNodeIds = useDesignModeOverloads(
    mode,
    graphState,
    effectiveLevelConfig,
  );
  const simulationOverloadedNodeIds = Object.entries(nodeStates)
    .filter(([, s]) => s.droppedOps > 0)
    .map(([id]) => id);
  const overloadedNodeIds =
    mode === "SIMULATE" ? simulationOverloadedNodeIds : designModeOverloadedNodeIds;

  useEffect(() => {
    resetEvents(graphState.nodes, graphState.edges);
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

  const {
    handleComponentPlaced,
    handleContinue,
    handleGraphChange,
    handlePlaceComponent,
    handleReplay,
    handleSelectLevel,
    handleSelectedNodeChange,
    handleToggleTraffic,
    handleWin,
  } = useGameActions({
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
  });

  useSimulationTick({
    appendEvent,
    applySnapshot,
    currentLevel,
    edges: graphState.edges,
    effectiveLevelConfig,
    endSimulation,
    mode,
    nodes: graphState.nodes,
    onWin: handleWin,
    resetKey: canvasKey,
    setCoachMessage,
    tick,
  });

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
        levelNumber={levelRegistry.getLevelNumber(currentLevel.id)}
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
            edges={graphState.edges}
            isLocked={isLocked}
            isSimulating={mode === "SIMULATE"}
            key={canvasKey}
            lockedNodeIds={currentLevel.lockedNodeIds}
            nodes={graphState.nodes}
            onComponentPlaced={handleComponentPlaced}
            onSelectedNodeChange={handleSelectedNodeChange}
            onStateChange={handleGraphChange}
            overloadedNodeIds={overloadedNodeIds}
            selectedNodeId={selectedNodeId}
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
