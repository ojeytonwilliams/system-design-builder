// oxlint-disable import/max-dependencies
import type { Edge } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coach } from "../components/coach.js";
import type { ComponentType } from "../components/component-library.js";
import { EndOfLevelScreen } from "../components/end-of-level-screen.js";
import { EventLog } from "../components/event-log.js";
import type { EventLogEntry } from "../components/event-log.js";
import { GameCanvas } from "../components/game-canvas.js";
import type { ArchitectureCanvasNode } from "../components/game-canvas.js";
import { Inspector } from "../components/inspector.js";
import { LevelStrip } from "../components/level-strip.js";
import { Palette } from "../components/palette.js";
import { TopBar } from "../components/top-bar.js";
import { LEVELS, getLevelById } from "../levels/index.js";
import { level1 } from "../levels/level1.js";
import type { LevelDefinition, StartingEdge, StartingNode } from "../levels/types.js";
import { getFirstIncompleteLevel, loadProgress, saveProgress } from "../persistence.js";
import {
  computeRevenue,
  computeTrafficFlow,
  getTrafficRate,
  hasRunnablePath,
} from "../simulation/engine.js";
import type { GraphEdge, GraphNode, LevelConfig } from "../simulation/types.js";
import { computeAvailableComponents, updateOverloadDurations } from "../simulation/unlocks.js";
import type { OverloadDurations } from "../simulation/unlocks.js";
import { SimulationProvider, useSimulation } from "../store.js";

const DEFAULT_CAPACITIES: Record<ComponentType, number> = {
  cache: 200,
  db: 100,
  "load-balancer": Infinity,
  server: 100,
  users: Infinity,
};

const LATENCY_MS: Record<ComponentType, number> = {
  cache: 5,
  db: 50,
  "load-balancer": 2,
  server: 10,
  users: 0,
};

const COST_PER_HOUR: Record<ComponentType, number> = {
  cache: 30,
  db: 100,
  "load-balancer": 20,
  server: 50,
  users: 0,
};

interface GameLayoutProps {
  initialEdges?: Edge[];
  initialNodes?: ArchitectureCanvasNode[];
  levelConfig?: LevelConfig;
}

const toGraphNode = (canvasNode: ArchitectureCanvasNode): GraphNode => ({
  capacity: DEFAULT_CAPACITIES[canvasNode.data.componentType] ?? Infinity,
  id: canvasNode.id,
  type: canvasNode.data.componentType,
});

const toGraphEdge = (edge: Edge): GraphEdge => ({
  source: edge.source,
  target: edge.target,
});

const levelNodeToCanvasNode = (node: StartingNode): ArchitectureCanvasNode => ({
  data: { componentType: node.componentType, label: node.label },
  id: node.id,
  position: node.position,
  type: "architecture",
});

const levelEdgeToCanvasEdge = (startingEdge: StartingEdge): Edge => ({
  animated: false,
  id: startingEdge.id,
  source: startingEdge.source,
  target: startingEdge.target,
  type: "architecture-edge",
});

interface GameLayoutContentProps {
  initialEdges: Edge[];
  initialNodes: ArchitectureCanvasNode[];
  levelConfig: LevelConfig | undefined;
}

const EMPTY_OVERLOAD_DURATIONS: OverloadDurations = new Map();
const MOBILE_LAYOUT_BREAKPOINT = 768;

const getComponentName = (componentType: ComponentType): string => {
  if (componentType === "db") {
    return "DB";
  }

  if (componentType === "load-balancer") {
    return "Load Balancer";
  }

  return componentType.charAt(0).toUpperCase() + componentType.slice(1);
};

const GameLayoutContent = ({
  initialEdges,
  initialNodes,
  levelConfig: propLevelConfig,
}: GameLayoutContentProps) => {
  const { endSimulation, mode, nodeStates, revenue, startSimulation, tick } = useSimulation();

  const [currentLevelId, setCurrentLevelId] = useState<number>(() =>
    getFirstIncompleteLevel(loadProgress().completedLevels, LEVELS.length),
  );
  const [completedLevels, setCompletedLevels] = useState<number[]>(
    () => loadProgress().completedLevels,
  );
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [, setOverloadDurations] = useState<OverloadDurations>(EMPTY_OVERLOAD_DURATIONS);
  const [canvasKey, setCanvasKey] = useState(0);

  const currentLevel = getLevelById(currentLevelId) ?? level1;

  const initialCanvasNodes =
    initialNodes.length > 0 ? initialNodes : currentLevel.startingNodes.map(levelNodeToCanvasNode);
  const initialCanvasEdges =
    initialNodes.length > 0 ? initialEdges : currentLevel.startingEdges.map(levelEdgeToCanvasEdge);

  const [levelStartNodes, setLevelStartNodes] = useState<ArchitectureCanvasNode[]>(
    () => initialCanvasNodes,
  );
  const [levelStartEdges, setLevelStartEdges] = useState<Edge[]>(() => initialCanvasEdges);
  const [coachMessage, setCoachMessage] = useState(`Mission: ${currentLevel.objectiveText}`);
  const [eventEntries, setEventEntries] = useState<EventLogEntry[]>([]);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [queuedComponentType, setQueuedComponentType] = useState<ComponentType | null>(null);
  const eventCounterRef = useRef(0);
  const shownCoachMessageRef = useRef<Set<number>>(new Set());
  const hasSeenOverloadThisLevelRef = useRef(false);
  const hasSnapshotOverloadRef = useRef(false);
  const previousAvailableComponentsRef = useRef<ComponentType[]>(currentLevel.availableComponents);

  const effectiveLevelConfig = useMemo<LevelConfig>(
    () =>
      propLevelConfig ?? {
        cacheHitRate: currentLevel.cacheHitRate,
        revenueTarget: currentLevel.revenueTarget,
        timeout: currentLevel.timeout,
        trafficSchedule: currentLevel.trafficSchedule,
      },
    [propLevelConfig, currentLevel],
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [graphState, setGraphState] = useState<{ edges: Edge[]; nodes: ArchitectureCanvasNode[] }>(
    () => ({ edges: initialCanvasEdges, nodes: initialCanvasNodes }),
  );

  const buildUnlockInput = useCallback(
    (
      snapshot: Record<string, { droppedOps: number; handledOps: number; incomingOps: number }>,
      durations: OverloadDurations,
      nodes: ArchitectureCanvasNode[],
    ) => ({
      graphNodes: nodes.map(toGraphNode),
      overloadDurations: durations,
      revenue,
      revenueTarget: effectiveLevelConfig.revenueTarget,
      snapshot,
    }),
    [revenue, effectiveLevelConfig.revenueTarget],
  );

  const [availableComponents, setAvailableComponents] = useState<ComponentType[]>(() =>
    computeAvailableComponents(currentLevel.availableComponents, currentLevel.componentUnlocks, {
      graphNodes: initialCanvasNodes.map(toGraphNode),
      overloadDurations: EMPTY_OVERLOAD_DURATIONS,
      revenue: 0,
      revenueTarget: effectiveLevelConfig.revenueTarget,
      snapshot: {},
    }),
  );

  const graphRef = useRef<{ edges: Edge[]; nodes: ArchitectureCanvasNode[] }>({
    edges: initialCanvasEdges,
    nodes: initialCanvasNodes,
  });

  const appendEvent = useCallback((text: string) => {
    eventCounterRef.current += 1;

    setEventEntries((currentEntries) => [
      ...currentEntries,
      { id: `event-${eventCounterRef.current}`, text },
    ]);
  }, []);

  const buildInitialGraphEvents = useCallback(
    (nodes: ArchitectureCanvasNode[], edges: Edge[]): EventLogEntry[] => {
      const entries: EventLogEntry[] = [];

      nodes.forEach((node) => {
        eventCounterRef.current += 1;
        entries.push({
          id: `event-${eventCounterRef.current}`,
          text: `Component placed: ${getComponentName(node.data.componentType)}`,
        });
      });

      edges.forEach((edge) => {
        eventCounterRef.current += 1;
        entries.push({
          id: `event-${eventCounterRef.current}`,
          text: `Connection created: ${edge.source} → ${edge.target}`,
        });
      });

      return entries;
    },
    [],
  );

  useEffect(() => {
    const syncLayout = () => {
      setIsCompactLayout(window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT);
    };

    syncLayout();
    window.addEventListener("resize", syncLayout);

    return () => {
      window.removeEventListener("resize", syncLayout);
    };
  }, []);

  const handleGraphChange = useCallback(
    (nodes: ArchitectureCanvasNode[], edges: Edge[]) => {
      const previousNodeIds = new Set(graphRef.current.nodes.map((node) => node.id));
      const previousEdgeIds = new Set(graphRef.current.edges.map((edge) => edge.id));

      nodes.forEach((node) => {
        if (!previousNodeIds.has(node.id)) {
          appendEvent(`Component placed: ${getComponentName(node.data.componentType)}`);
        }
      });

      edges.forEach((edge) => {
        if (!previousEdgeIds.has(edge.id)) {
          appendEvent(`Connection created: ${edge.source} → ${edge.target}`);
        }
      });

      setGraphState({ edges, nodes });
      graphRef.current = { edges, nodes };

      // Re-evaluate SERVERS_PLACED unlock even in design mode
      const unlockInput = {
        graphNodes: nodes.map(toGraphNode),
        overloadDurations: EMPTY_OVERLOAD_DURATIONS,
        revenue: 0,
        revenueTarget: effectiveLevelConfig.revenueTarget,
        snapshot: {},
      };

      setAvailableComponents(
        computeAvailableComponents(
          currentLevel.availableComponents,
          currentLevel.componentUnlocks,
          unlockInput,
        ),
      );
    },
    [appendEvent, currentLevel, effectiveLevelConfig.revenueTarget],
  );

  const handleSelectedNodeChange = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const loadLevel = useCallback(
    (level: LevelDefinition) => {
      const newNodes = level.startingNodes.map(levelNodeToCanvasNode);
      const newEdges = level.startingEdges.map(levelEdgeToCanvasEdge);
      const newAvailableComponents = computeAvailableComponents(
        level.availableComponents,
        level.componentUnlocks,
        {
          graphNodes: newNodes.map(toGraphNode),
          overloadDurations: EMPTY_OVERLOAD_DURATIONS,
          revenue: 0,
          revenueTarget: level.revenueTarget,
          snapshot: {},
        },
      );

      setCurrentLevelId(level.id);
      setLevelStartNodes(newNodes);
      setLevelStartEdges(newEdges);
      setCanvasKey((k) => k + 1);
      setGraphState({ edges: newEdges, nodes: newNodes });
      graphRef.current = { edges: newEdges, nodes: newNodes };
      setSelectedNodeId(null);
      setOverloadDurations(new Map());
      setShowEndScreen(false);
      setCoachMessage(`Mission: ${level.objectiveText}`);
      setEventEntries(buildInitialGraphEvents(newNodes, newEdges));
      setQueuedComponentType(null);
      shownCoachMessageRef.current = new Set();
      hasSeenOverloadThisLevelRef.current = false;
      hasSnapshotOverloadRef.current = false;
      endSimulation();
      setAvailableComponents(newAvailableComponents);
      previousAvailableComponentsRef.current = level.availableComponents;
    },
    [buildInitialGraphEvents, endSimulation],
  );

  const isRunnable = hasRunnablePath(
    graphState.nodes.map(toGraphNode),
    graphState.edges.map(toGraphEdge),
  );

  const handleToggleTraffic = useCallback(() => {
    if (mode === "SIMULATE") {
      endSimulation();
    } else if (isRunnable) {
      startSimulation();
    }
  }, [mode, startSimulation, endSimulation, isRunnable]);

  const handleContinue = useCallback(() => {
    const nextLevel = getLevelById(currentLevelId + 1);
    setShowEndScreen(false);
    if (nextLevel !== undefined) {
      loadLevel(nextLevel);
    }
  }, [currentLevelId, loadLevel]);

  const handleReplay = useCallback(() => {
    loadLevel(currentLevel);
  }, [currentLevel, loadLevel]);

  const handleSelectLevel = useCallback(
    (levelId: number) => {
      const level = getLevelById(levelId);
      if (level !== undefined) {
        loadLevel(level);
      }
    },
    [loadLevel],
  );

  const handlePlaceComponent = useCallback((componentType: ComponentType) => {
    setQueuedComponentType(componentType);
  }, []);

  const handleComponentPlaced = useCallback(() => {
    setQueuedComponentType(null);
  }, []);

  useEffect(() => {
    setEventEntries(buildInitialGraphEvents(graphRef.current.nodes, graphRef.current.edges));
  }, [buildInitialGraphEvents]);

  // Simulation tick loop
  useEffect(() => {
    if (mode !== "SIMULATE") {
      return;
    }

    let elapsedSeconds = 0;

    const interval = setInterval(() => {
      elapsedSeconds++;

      currentLevel.coachMessages.forEach((message, index) => {
        if (elapsedSeconds < message.atSecond || shownCoachMessageRef.current.has(index)) {
          return;
        }

        shownCoachMessageRef.current.add(index);
        setCoachMessage(message.text);
      });

      if (elapsedSeconds >= effectiveLevelConfig.timeout) {
        endSimulation();

        return;
      }

      const rate = getTrafficRate(effectiveLevelConfig.trafficSchedule, elapsedSeconds);
      const graphNodes = graphRef.current.nodes.map(toGraphNode);
      const graphEdges = graphRef.current.edges.map(toGraphEdge);
      const snapshot = computeTrafficFlow(graphNodes, graphEdges, {
        cacheHitRate: effectiveLevelConfig.cacheHitRate,
        trafficRate: rate,
      });
      const hasOverload = Object.values(snapshot).some((state) => state.droppedOps > 0);
      const hadOverload = hasSnapshotOverloadRef.current;

      if (!hadOverload && hasOverload) {
        appendEvent("Overload started");

        if (!hasSeenOverloadThisLevelRef.current) {
          setCoachMessage(
            "Overload detected. Add capacity or spread traffic to reduce dropped requests.",
          );
          hasSeenOverloadThisLevelRef.current = true;
        }
      }

      if (hadOverload && !hasOverload) {
        appendEvent("Overload resolved");
      }

      hasSnapshotOverloadRef.current = hasOverload;

      const earned = computeRevenue(snapshot, graphNodes, {
        cacheHitRate: effectiveLevelConfig.cacheHitRate,
        edges: graphEdges,
      });

      // Update overload durations and available components
      setOverloadDurations((prev) => {
        const next = updateOverloadDurations(prev, snapshot);
        const unlockInput = buildUnlockInput(snapshot, next, graphRef.current.nodes);

        setAvailableComponents(
          computeAvailableComponents(
            currentLevel.availableComponents,
            currentLevel.componentUnlocks,
            unlockInput,
          ),
        );

        return next;
      });

      tick(snapshot, earned);

      // Check win condition after tick
      const newRevenue = revenue + earned;

      if (newRevenue >= effectiveLevelConfig.revenueTarget) {
        endSimulation();
        setShowEndScreen(true);

        const updated = [...new Set([...completedLevels, currentLevelId])];

        saveProgress(updated);
        setCompletedLevels(updated);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [
    appendEvent,
    mode,
    endSimulation,
    tick,
    effectiveLevelConfig,
    revenue,
    completedLevels,
    currentLevelId,
    currentLevel,
    buildUnlockInput,
  ]);

  const overloadedNodeIds = Object.entries(nodeStates)
    .filter(([, state]) => state.droppedOps > 0)
    .map(([nodeId]) => nodeId);

  useEffect(() => {
    const unlockedComponents = availableComponents.filter(
      (componentType) => !previousAvailableComponentsRef.current.includes(componentType),
    );

    unlockedComponents.forEach((componentType) => {
      const componentName = getComponentName(componentType);
      appendEvent(`Concept unlocked: ${componentName}`);
      setCoachMessage(`Unlocked: ${componentName}. Try using it to improve your architecture.`);
    });

    previousAvailableComponentsRef.current = availableComponents;
  }, [appendEvent, availableComponents]);

  let selectedNode = graphState.nodes.find((node) => node.id === selectedNodeId);

  if (selectedNodeId === null) {
    selectedNode = undefined;
  }

  let selectedNodeLabel: string | undefined;
  let selectedComponentType: ComponentType | undefined;
  let loadPercent: number | undefined;
  let opsPerSec: number | undefined;
  let maxCapacity: number | undefined;
  let latencyMs: number | undefined;
  let cost: number | undefined;
  let isSelectedNodeOverloaded = false;

  if (selectedNode !== undefined) {
    selectedNodeLabel = selectedNode.data.label;
    selectedComponentType = selectedNode.data.componentType;
    maxCapacity = DEFAULT_CAPACITIES[selectedNode.data.componentType];
    latencyMs = LATENCY_MS[selectedNode.data.componentType];
    cost = COST_PER_HOUR[selectedNode.data.componentType];

    const selectedNodeState = nodeStates[selectedNode.id];
    const selectedNodeCapacity = DEFAULT_CAPACITIES[selectedNode.data.componentType] ?? Infinity;

    if (selectedNodeState !== undefined) {
      opsPerSec = selectedNodeState.incomingOps;

      if (Number.isFinite(selectedNodeCapacity)) {
        loadPercent = (selectedNodeState.incomingOps / selectedNodeCapacity) * 100;
        isSelectedNodeOverloaded = selectedNodeState.incomingOps > selectedNodeCapacity;
      }
    }
  }

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
        levelNumber={currentLevel.id}
        levelTitle={currentLevel.title}
        mode={mode}
        objectiveText={currentLevel.objectiveText}
        onStartTraffic={handleToggleTraffic}
        revenue={revenue}
        revenueTarget={effectiveLevelConfig.revenueTarget}
        startTrafficDisabled={!isRunnable}
      />
      <LevelStrip
        completedLevelIds={completedLevels}
        currentLevelId={currentLevelId}
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
            aria-label="Palette"
            style={{ flexShrink: 0, overflowY: "auto", width: "14rem" }}
          >
            <Palette
              availableComponents={availableComponents}
              isDisabled={isLocked}
              onPlaceComponent={handlePlaceComponent}
            />
          </section>
        )}
        <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <GameCanvas
            componentToPlace={queuedComponentType}
            key={canvasKey}
            initialEdges={levelStartEdges}
            initialNodes={levelStartNodes}
            isLocked={isLocked}
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
              componentType={selectedComponentType}
              cost={cost}
              isOverloaded={isSelectedNodeOverloaded}
              latencyMs={latencyMs}
              loadPercent={loadPercent}
              maxCapacity={maxCapacity}
              opsPerSec={opsPerSec}
              selectedNodeLabel={selectedNodeLabel}
            />
          </section>
          <Coach message={coachMessage} />
          <EventLog entries={eventEntries} />
        </aside>
        {isCompactLayout && (
          <section aria-label="Palette" style={{ flexShrink: 0, width: "100%" }}>
            <Palette
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
          onContinue={handleContinue}
          onReplay={handleReplay}
          revenue={revenue}
          revenueTarget={effectiveLevelConfig.revenueTarget}
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
