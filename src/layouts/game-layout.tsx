// oxlint-disable import/max-dependencies
import type { Edge } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "../components/component-library.js";
import { EndOfLevelScreen } from "../components/end-of-level-screen.js";
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
  animated: true,
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
      graphNodes: initialNodes.map(toGraphNode),
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

  const handleGraphChange = useCallback(
    (nodes: ArchitectureCanvasNode[], edges: Edge[]) => {
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
    [currentLevel, effectiveLevelConfig.revenueTarget],
  );

  const handleSelectedNodeChange = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const loadLevel = useCallback(
    (level: LevelDefinition) => {
      const newNodes = level.startingNodes.map(levelNodeToCanvasNode);
      const newEdges = level.startingEdges.map(levelEdgeToCanvasEdge);
      setCurrentLevelId(level.id);
      setLevelStartNodes(newNodes);
      setLevelStartEdges(newEdges);
      setCanvasKey((k) => k + 1);
      setGraphState({ edges: newEdges, nodes: newNodes });
      graphRef.current = { edges: newEdges, nodes: newNodes };
      setSelectedNodeId(null);
      setOverloadDurations(new Map());
      setShowEndScreen(false);
      endSimulation();
      setAvailableComponents(
        computeAvailableComponents(level.availableComponents, level.componentUnlocks, {
          graphNodes: newNodes.map(toGraphNode),
          overloadDurations: EMPTY_OVERLOAD_DURATIONS,
          revenue: 0,
          revenueTarget: level.revenueTarget,
          snapshot: {},
        }),
      );
    },
    [endSimulation],
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

  // Simulation tick loop
  useEffect(() => {
    if (mode !== "SIMULATE") {
      return;
    }

    let elapsedSeconds = 0;

    const interval = setInterval(() => {
      elapsedSeconds++;

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
      style={{
        background: "#f5f5f0",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        height: "100dvh",
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
          overflow: "hidden",
        }}
      >
        <section aria-label="Palette" style={{ flexShrink: 0, overflowY: "auto", width: "14rem" }}>
          <Palette availableComponents={availableComponents} isDisabled={isLocked} />
        </section>
        <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <GameCanvas
            key={canvasKey}
            initialEdges={levelStartEdges}
            initialNodes={levelStartNodes}
            isLocked={isLocked}
            lockedNodeIds={currentLevel.lockedNodeIds}
            onSelectedNodeChange={handleSelectedNodeChange}
            onStateChange={handleGraphChange}
            overloadedNodeIds={overloadedNodeIds}
          />
        </main>
        <section
          aria-label="Inspector"
          style={{ flexShrink: 0, overflowY: "auto", width: "16rem" }}
        >
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
