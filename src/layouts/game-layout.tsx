import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { SimulationEngine } from "../simulation/simulation-engine.js";
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
import { useCompactLayout } from "../hooks/use-compact-layout.js";
import { useDesignModeOverloads } from "../hooks/use-design-mode-overloads.js";
import { useEventLog } from "../hooks/use-event-log.js";
import { useGameActions } from "../hooks/use-game-actions.js";
import { useInspectorData } from "../hooks/use-inspector-data.js";
import { useLevel } from "../hooks/use-level.js";
import { usePhase } from "../hooks/use-phase.js";
import { useSimulationSnapshot } from "../hooks/use-simulation-snapshot.js";
import { useSimulationTick } from "../hooks/use-simulation-tick.js";
import { levelRegistry } from "../levels/index.js";
import type { LevelDefinition } from "../levels/types.js";
import { graphReducer } from "../game/graph-reducer.js";
import { toGraphEdge, toGraphNode } from "./graph-adapters.js";
import { hasRunnablePath } from "../simulation/engine.js";
import { computeAvailableComponents } from "../simulation/unlocks.js";
import type { LevelConfig } from "../simulation/types.js";

const MOBILE_LAYOUT_BREAKPOINT = 768;

interface GameSceneProps {
  completedLevels: string[];
  currentLevel: LevelDefinition;
  initialEdges: ArchitectureEdge[];
  initialNodes: ArchitectureNode[];
  levelConfig: LevelConfig;
  loadLevel: (level: LevelDefinition) => {
    newEdges: ArchitectureEdge[];
    newNodes: ArchitectureNode[];
  };
  markLevelComplete: (levelId: string) => void;
}

const GameScene = ({
  completedLevels,
  currentLevel,
  initialEdges,
  initialNodes,
  levelConfig,
  loadLevel,
  markLevelComplete,
}: GameSceneProps) => {
  /* The engine is created once and kept for the lifetime of the scene, which
    allows it to maintain its internal state and listeners across re-renders.*/

  const engineRef = useRef<SimulationEngine | null>(null);
  engineRef.current ??= new SimulationEngine();

  const engine = engineRef.current;
  const simSnapshot = useSimulationSnapshot(engine);
  const { currentTrafficRate, elapsedSeconds, isTimedOut, isWon, nodeStates } = simSnapshot;
  const [phase, dispatchPhase] = usePhase();

  const { appendEvent, eventEntries, resetEvents } = useEventLog();
  const isCompactLayout = useCompactLayout(MOBILE_LAYOUT_BREAKPOINT);

  const [coachMessage, setCoachMessage] = useState(`Mission: ${currentLevel.objectiveText}`);
  const [queuedComponentType, setQueuedComponentType] = useState<ComponentType | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [graphState, dispatchGraph] = useReducer(graphReducer, {
    edges: initialEdges,
    nodes: initialNodes,
  });

  const previousAvailableComponentsRef = useRef<ComponentType[]>(currentLevel.availableComponents);
  const shownCoachMessageRef = useRef<Set<number>>(new Set());
  const hasSeenOverloadThisLevelRef = useRef(false);

  const inspectorData = useInspectorData(selectedNodeId, graphState.nodes, nodeStates);

  const isRunnable = hasRunnablePath(
    graphState.nodes.map(toGraphNode),
    graphState.edges.map(toGraphEdge),
  );
  const totalMonthlyCost = graphState.nodes.reduce(
    (sum, node) => sum + COMPONENT_LIBRARY[node.componentType].monthlyCost,
    0,
  );
  const remainingBudget = levelConfig.monthlyBudget - totalMonthlyCost;

  const availableComponents = computeAvailableComponents(
    currentLevel.availableComponents,
    currentLevel.componentUnlocks,
    {
      graphNodes: graphState.nodes.map(toGraphNode),
      overloadDurations: simSnapshot.overloadDurations,
      snapshot: simSnapshot.nodeStates,
    },
  );

  const isSimulating = phase === "SIMULATING";

  const designModeOverloadedNodeIds = useDesignModeOverloads(isSimulating, graphState, levelConfig);
  const simulationOverloadedNodeIds = Object.entries(nodeStates)
    .filter(([, s]) => s.droppedOps > 0)
    .map(([id]) => id);
  const overloadedNodeIds = isSimulating
    ? simulationOverloadedNodeIds
    : designModeOverloadedNodeIds;

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

  const handleNodePlaced = useCallback(
    (componentType: ComponentType) => {
      appendEvent(`Component placed: ${COMPONENT_LIBRARY[componentType].label}`);
    },
    [appendEvent],
  );

  const handleEdgeCreated = useCallback(
    (sourceId: string, targetId: string) => {
      appendEvent(`Connection created: ${sourceId} → ${targetId}`);
    },
    [appendEvent],
  );

  const {
    handleComponentPlaced,
    handleContinue,
    handlePlaceComponent,
    handleReplay,
    handleSelectLevel,
    handleSelectedNodeChange,
    handleToggleTraffic,
    handleWin,
  } = useGameActions({
    currentLevel,
    dispatchGraph,
    dispatchPhase,
    effectiveLevelConfig: levelConfig,
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
  });

  useEffect(() => {
    engine.setGraph(graphState.nodes.map(toGraphNode), graphState.edges.map(toGraphEdge));
  }, [graphState.nodes, graphState.edges, engine]);

  useEffect(() => {
    engine.setConfig(levelConfig);
  }, [levelConfig, engine]);

  useSimulationTick({ engine, isSimulating });

  // Reset engine and per-level state whenever the level changes
  useEffect(() => {
    engine.reset();
    shownCoachMessageRef.current = new Set();
    hasSeenOverloadThisLevelRef.current = false;
  }, [currentLevel.id, engine]);

  // Direct subscription for overload event logging — runs synchronously per
  // Engine notification so STARTED and RESOLVED on consecutive ticks are both captured
  useEffect(() => {
    const unsub = engine.subscribe(() => {
      const snap = engine.getSnapshot();
      if (snap.overloadEvent === "STARTED") {
        appendEvent("Overload started");
        if (!hasSeenOverloadThisLevelRef.current) {
          setCoachMessage(
            "Overload detected. Add capacity or spread traffic to reduce dropped requests.",
          );
          hasSeenOverloadThisLevelRef.current = true;
        }
      } else if (snap.overloadEvent === "RESOLVED") {
        appendEvent("Overload resolved");
      }
    });
    return () => {
      unsub();
    };
  }, [engine, appendEvent, setCoachMessage]);

  // Show timed coach messages as elapsed time advances
  useEffect(() => {
    currentLevel.coachMessages.forEach((message, index) => {
      if (elapsedSeconds >= message.atSecond && !shownCoachMessageRef.current.has(index)) {
        shownCoachMessageRef.current.add(index);
        setCoachMessage(message.text);
      }
    });
  }, [elapsedSeconds, currentLevel, setCoachMessage]);

  useEffect(() => {
    if (isWon && isSimulating) {
      handleWin();
    }
  }, [isWon, isSimulating, handleWin]);

  useEffect(() => {
    if (isTimedOut && isSimulating) {
      dispatchPhase({ type: "TIMEOUT" });
    }
  }, [isTimedOut, isSimulating, dispatchPhase]);

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
        isSimulating={isSimulating}
        levelNumber={levelRegistry.getLevelNumber(currentLevel.id)}
        levelTitle={currentLevel.title}
        monthlyBudget={levelConfig.monthlyBudget}
        objectiveText={currentLevel.objectiveText}
        onStartTraffic={handleToggleTraffic}
        remainingBudget={remainingBudget}
        startTrafficDisabled={!isRunnable}
        totalMonthlyCost={totalMonthlyCost}
        trafficTarget={levelConfig.trafficTarget}
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
              isDisabled={isSimulating}
              onPlaceComponent={handlePlaceComponent}
            />
          </section>
        )}
        <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <GameCanvas
            componentToPlace={queuedComponentType}
            dispatchGraph={dispatchGraph}
            edges={graphState.edges}
            isLocked={isSimulating}
            isSimulating={isSimulating}
            lockedNodeIds={currentLevel.lockedNodeIds}
            nodes={graphState.nodes}
            onComponentPlaced={handleComponentPlaced}
            onEdgeCreated={handleEdgeCreated}
            onNodePlaced={handleNodePlaced}
            onSelectedNodeChange={handleSelectedNodeChange}
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
              isDisabled={isSimulating}
              onPlaceComponent={handlePlaceComponent}
            />
          </section>
        )}
      </div>
      {phase === "WON" && (
        <EndOfLevelScreen
          feedbackLines={currentLevel.feedbackText}
          monthlyBudget={levelConfig.monthlyBudget}
          onContinue={handleContinue}
          onReplay={handleReplay}
          remainingBudget={remainingBudget}
          title={currentLevel.title}
        />
      )}
    </div>
  );
};

const GameLayout = () => {
  const { completedLevels, currentLevel, loadLevel, markLevelComplete } = useLevel();

  const levelConfig: LevelConfig = {
    cacheHitRate: currentLevel.cacheHitRate,
    monthlyBudget: currentLevel.monthlyBudget,
    timeout: currentLevel.timeout,
    trafficPeak: currentLevel.trafficPeak,
    trafficStart: currentLevel.trafficStart,
    trafficTarget: currentLevel.trafficTarget,
    winSustainSeconds: currentLevel.winSustainSeconds,
  };

  return (
    <GameScene
      completedLevels={completedLevels}
      currentLevel={currentLevel}
      initialEdges={currentLevel.startingEdges}
      initialNodes={currentLevel.startingNodes}
      levelConfig={levelConfig}
      loadLevel={loadLevel}
      markLevelComplete={markLevelComplete}
    />
  );
};

export { GameLayout, GameScene };
