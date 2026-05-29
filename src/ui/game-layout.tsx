import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { SimulationEngine } from "../simulation/simulation-engine.js";
import { computeTotalCost } from "../domain/budget.js";
import { COMPONENT_LIBRARY } from "../domain/component-library.js";
import type { ComponentType } from "../domain/component-library.js";
import { CircularGauge } from "./components/circular-gauge.js";
import { Coach } from "./components/coach.js";
import { EndOfLevelScreen } from "./components/end-of-level-screen.js";
import { EventLog } from "./components/event-log.js";
import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { GameCanvas } from "./components/game-canvas.js";
import { Inspector } from "./components/inspector.js";
import { NavBar } from "./components/nav-bar.js";
import { ProgressCard } from "./components/progress-card.js";
import { Resources } from "./components/palette.js";
import { TopBar } from "./components/top-bar.js";
import { useCompactLayout } from "./hooks/use-compact-layout.js";
import { useEventLog } from "./hooks/use-event-log.js";
import { useLevel } from "./hooks/use-level.js";
import {
  continueLevel,
  loadLevel as executeLoadLevel,
  replayLevel,
  selectLevel,
} from "../game/level-actions.js";
import { getInspectorData } from "../game/node-analyser.js";
import { placeComponent } from "../game/placement-actions.js";
import { toggleTraffic, winLevel } from "../game/traffic-actions.js";
import { usePhase } from "./hooks/use-phase.js";
import { useSimulationSnapshot } from "./hooks/use-simulation-snapshot.js";
import { levelRegistry } from "../levels/index.js";
import type { LevelDefinition } from "../levels/types.js";
import { graphReducer } from "../game/graph-reducer.js";
import { hasRunnablePath } from "../simulation/engine.js";
import { OverloadEventDetector } from "../simulation/subscribers/overload-event-detector.js";
import { TimeoutChecker } from "../simulation/subscribers/timeout-checker.js";
import { WinConditionChecker } from "../simulation/subscribers/win-condition-checker.js";
import type { LevelConfig } from "../simulation/types.js";
import { computeAvailableComponents } from "../simulation/unlocks.js";

const MOBILE_LAYOUT_BREAKPOINT = 768;

interface GameSceneProps {
  completedLevels: string[];
  currentLevel: LevelDefinition;
  engine?: SimulationEngine | undefined;
  initialEdges: ArchitectureEdge[];
  initialNodes: ArchitectureNode[];
  levelConfig: LevelConfig;
  initLevel: (level: LevelDefinition) => {
    newEdges: ArchitectureEdge[];
    newNodes: ArchitectureNode[];
  };
  markLevelComplete: (levelId: string) => void;
}

const GameScene = ({
  completedLevels,
  currentLevel,
  engine: engineProp,
  initialEdges,
  initialNodes,
  levelConfig,
  initLevel,
  markLevelComplete,
}: GameSceneProps) => {
  /* The engine is created once and kept for the lifetime of the scene, which
    allows it to maintain its internal state and listeners across re-renders.
    An external engine can be injected via the engine prop (used in tests). */

  const engineRef = useRef<SimulationEngine | null>(engineProp ?? null);
  engineRef.current ??= new SimulationEngine();

  const engine = engineRef.current;

  const overloadDetectorRef = useRef<OverloadEventDetector | null>(null);
  const winCheckerRef = useRef<WinConditionChecker | null>(null);
  const timeoutCheckerRef = useRef<TimeoutChecker | null>(null);

  const simSnapshot = useSimulationSnapshot(engine);
  const { deliveryOpsPerSec, elapsedMs, nodeMetrics } = simSnapshot;
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

  const [prevAvailableComponents, setPrevAvailableComponents] = useState<ComponentType[]>(
    currentLevel.availableComponents,
  );
  const shownCoachMessageRef = useRef<Set<number>>(new Set());
  const hasSeenOverloadThisLevelRef = useRef(false);

  const inspectorData = getInspectorData(selectedNodeId, graphState.nodes, nodeMetrics);

  const isRunnable = hasRunnablePath(graphState.nodes, graphState.edges);
  const totalMonthlyCost = computeTotalCost(graphState.nodes);
  const remainingBudget = levelConfig.monthlyBudget - totalMonthlyCost;

  const availableComponents = computeAvailableComponents(
    currentLevel.availableComponents,
    currentLevel.componentUnlocks,
    {
      graphNodes: graphState.nodes,
      nodeMetrics,
      overloadDurations: overloadDetectorRef.current?.getOverloadDurations() ?? new Map(),
    },
  );

  const isSimulating = phase === "SIMULATING";

  const simulationOverloadedNodeIds = [...nodeMetrics.entries()]
    .filter(([, m]) => m.isOverloaded)
    .map(([id]) => id);
  const overloadedNodeIds = isSimulating ? simulationOverloadedNodeIds : [];
  const hasBottleneck = overloadedNodeIds.length > 0;

  const bottleneckOpsPerSec =
    overloadedNodeIds.length > 0
      ? Math.min(
          ...overloadedNodeIds.map((id) => {
            const node = graphState.nodes.find((n) => n.id === id);
            return node === undefined
              ? Infinity
              : (COMPONENT_LIBRARY[node.componentType].capacity ?? Infinity);
          }),
        )
      : undefined;

  useEffect(() => {
    resetEvents(graphState.nodes, graphState.edges);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const newlyUnlocked = availableComponents.filter((c) => !prevAvailableComponents.includes(c));

    if (newlyUnlocked.length === 0) {
      return;
    }

    newlyUnlocked.forEach((c) => {
      appendEvent(`Concept unlocked: ${COMPONENT_LIBRARY[c].label}`);
      setCoachMessage(
        `Unlocked: ${COMPONENT_LIBRARY[c].label}. Try using it to improve your architecture.`,
      );
    });

    setPrevAvailableComponents(availableComponents);
  }, [appendEvent, availableComponents]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleLoadLevel = (level: LevelDefinition) =>
    executeLoadLevel(level, {
      dispatchGraph,
      dispatchPhase,
      initialiseLevel: initLevel,
      resetEvents,
      setCoachMessage,
      setPrevAvailableComponents,
      setQueuedComponentType,
      setSelectedNodeId,
    });

  const handleContinue = () =>
    continueLevel(currentLevel.id, levelRegistry.levels, dispatchPhase, handleLoadLevel);

  const handleReplay = () => replayLevel(currentLevel, handleLoadLevel);

  const handleSelectLevel = (levelId: string) =>
    selectLevel(levelId, (id) => levelRegistry.getLevelById(id), handleLoadLevel);

  const handlePlaceComponent = (componentType: ComponentType) => {
    const addedCost = COMPONENT_LIBRARY[componentType].monthlyCost;
    const result = placeComponent(
      componentType,
      addedCost,
      totalMonthlyCost,
      levelConfig.monthlyBudget,
    );
    if (result.type === "OVER_BUDGET") {
      setCoachMessage(result.message);
    } else {
      setQueuedComponentType(result.componentType);
    }
  };

  const handleToggleTraffic = () => toggleTraffic(phase, isRunnable, dispatchPhase);

  useEffect(() => {
    engine.setGraph(graphState.nodes, graphState.edges);
  }, [graphState.nodes, graphState.edges, engine]);

  useEffect(() => {
    engine.setConfig(levelConfig);
  }, [levelConfig, engine]);

  useEffect(() => {
    if (isSimulating) {
      engine.reset();
    }
  }, [engine, isSimulating]);

  useEffect(() => {
    overloadDetectorRef.current?.destroy();
    winCheckerRef.current?.destroy();
    timeoutCheckerRef.current?.destroy();

    overloadDetectorRef.current = new OverloadEventDetector(engine, {
      onOverloadResolved: () => appendEvent("Overload resolved"),
      onOverloadStarted: () => {
        appendEvent("Overload started");
        if (!hasSeenOverloadThisLevelRef.current) {
          setCoachMessage(
            "Overload detected. Add capacity or spread traffic to reduce dropped requests.",
          );
          hasSeenOverloadThisLevelRef.current = true;
        }
      },
    });

    winCheckerRef.current = new WinConditionChecker(engine, levelConfig, {
      onWin: () => winLevel(currentLevel.id, dispatchPhase, markLevelComplete),
    });

    timeoutCheckerRef.current = new TimeoutChecker(engine, levelConfig, {
      onTimeout: () => dispatchPhase({ type: "TIMEOUT" }),
    });

    engine.reset();
    shownCoachMessageRef.current = new Set();
    hasSeenOverloadThisLevelRef.current = false;
  }, [currentLevel.id, engine]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    currentLevel.coachMessages.forEach((message, index) => {
      if (elapsedMs >= message.atSecond && !shownCoachMessageRef.current.has(index)) {
        shownCoachMessageRef.current.add(index);
        setCoachMessage(message.text);
      }
    });
  }, [elapsedMs, currentLevel, setCoachMessage]);

  const rightSidebar = (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        gap: "12px",
        overflowY: "auto",
        width: isCompactLayout ? "100%" : "300px",
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
      <Coach hasBottleneck={hasBottleneck} message={coachMessage} />
      <EventLog entries={eventEntries} />
    </aside>
  );

  return (
    <div
      data-testid="game-layout-shell"
      style={{
        background: "#0a0a23",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Lato', system-ui, sans-serif",
        height: "100dvh",
        overflowX: "hidden",
      }}
    >
      <header style={{ flexShrink: 0 }}>
        <NavBar />
        {isCompactLayout ? (
          <div style={{ padding: "12px" }}>
            <TopBar
              completedLevelIds={completedLevels}
              currentLevelId={currentLevel.id}
              isSimulating={isSimulating}
              objectiveText={currentLevel.objectiveText}
              onSelectLevel={handleSelectLevel}
              onStartTraffic={handleToggleTraffic}
              startTrafficDisabled={!isRunnable}
            />
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "1fr 616px",
              padding: "16px 24px 0",
            }}
          >
            <TopBar
              completedLevelIds={completedLevels}
              currentLevelId={currentLevel.id}
              isSimulating={isSimulating}
              objectiveText={currentLevel.objectiveText}
              onSelectLevel={handleSelectLevel}
              onStartTraffic={handleToggleTraffic}
              startTrafficDisabled={!isRunnable}
            />
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr" }}>
              <CircularGauge
                bottleneckOpsPerSec={bottleneckOpsPerSec}
                currentReqPerSec={isSimulating ? deliveryOpsPerSec : 0}
                trafficTarget={levelConfig.trafficTarget}
              />
              <ProgressCard
                monthlyBudget={levelConfig.monthlyBudget}
                totalMonthlyCost={totalMonthlyCost}
              />
            </div>
          </div>
        )}
      </header>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: isCompactLayout ? "column" : "row",
          gap: "16px",
          minHeight: 0,
          overflow: "hidden",
          padding: isCompactLayout ? "12px" : "16px 24px 24px",
        }}
      >
        {!isCompactLayout && (
          <section
            aria-label="Resources"
            style={{ flexShrink: 0, overflowY: "auto", width: "260px" }}
          >
            <Resources
              availableComponents={availableComponents}
              isDisabled={isSimulating}
              onPlaceComponent={handlePlaceComponent}
            />
          </section>
        )}

        <main
          style={{
            background: "rgba(27, 27, 50, 0.6)",
            border: "1px solid rgba(59, 59, 79, 0.4)",
            borderRadius: "16px",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <GameCanvas
            componentToPlace={queuedComponentType}
            dispatchGraph={dispatchGraph}
            edges={graphState.edges}
            engine={engine}
            isLocked={isSimulating}
            isSimulating={isSimulating}
            lockedNodeIds={currentLevel.lockedNodeIds}
            nodes={graphState.nodes}
            onComponentPlaced={() => setQueuedComponentType(null)}
            onEdgeCreated={handleEdgeCreated}
            onNodePlaced={handleNodePlaced}
            onSelectedNodeChange={setSelectedNodeId}
            overloadedNodeIds={overloadedNodeIds}
            selectedNodeId={selectedNodeId}
          />
        </main>

        {isCompactLayout ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <section aria-label="Resources" style={{ flexShrink: 0 }}>
              <Resources
                availableComponents={availableComponents}
                isCompact
                isDisabled={isSimulating}
                onPlaceComponent={handlePlaceComponent}
              />
            </section>
            {rightSidebar}
          </div>
        ) : (
          rightSidebar
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
    winSustainMs: currentLevel.winSustainMs,
  };

  return (
    <GameScene
      completedLevels={completedLevels}
      currentLevel={currentLevel}
      initialEdges={currentLevel.startingEdges}
      initialNodes={currentLevel.startingNodes}
      levelConfig={levelConfig}
      initLevel={loadLevel}
      markLevelComplete={markLevelComplete}
    />
  );
};

export { GameLayout, GameScene };
