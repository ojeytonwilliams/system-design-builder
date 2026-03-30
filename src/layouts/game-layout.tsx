import type { Edge } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType } from "../components/component-library.js";
import { PHASE_TWO_AVAILABLE_COMPONENTS } from "../components/component-library.js";
import type { ArchitectureCanvasNode } from "../components/game-canvas.js";
import { GameCanvas } from "../components/game-canvas.js";
import { Inspector } from "../components/inspector.js";
import { Palette } from "../components/palette.js";
import { TopBar } from "../components/top-bar.js";
import { computeRevenue, computeTrafficFlow, getTrafficRate } from "../simulation/engine.js";
import type { GraphEdge, GraphNode, LevelConfig } from "../simulation/types.js";
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

const DEFAULT_LEVEL_CONFIG: LevelConfig = {
  cacheHitRate: 0,
  revenueTarget: 5000,
  timeout: 60,
  trafficSchedule: [
    { opsPerSec: 50, startTime: 0 },
    { opsPerSec: 100, startTime: 15 },
    { opsPerSec: 200, startTime: 30 },
    { opsPerSec: 350, startTime: 45 },
  ],
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

interface GameLayoutContentProps {
  initialEdges: Edge[];
  initialNodes: ArchitectureCanvasNode[];
  levelConfig: LevelConfig;
}

const GameLayoutContent = ({ initialEdges, initialNodes, levelConfig }: GameLayoutContentProps) => {
  const { endSimulation, mode, nodeStates, revenue, startSimulation, tick } = useSimulation();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [graphState, setGraphState] = useState<{ edges: Edge[]; nodes: ArchitectureCanvasNode[] }>({
    edges: initialEdges,
    nodes: initialNodes,
  });

  const graphRef = useRef<{ edges: Edge[]; nodes: ArchitectureCanvasNode[] }>({
    edges: initialEdges,
    nodes: initialNodes,
  });

  const handleGraphChange = useCallback((nodes: ArchitectureCanvasNode[], edges: Edge[]) => {
    setGraphState({ edges, nodes });
    graphRef.current = { edges, nodes };
  }, []);

  const handleSelectedNodeChange = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleToggleTraffic = useCallback(() => {
    if (mode === "SIMULATE") {
      endSimulation();
    } else {
      startSimulation();
    }
  }, [mode, startSimulation, endSimulation]);

  // Simulation tick loop
  useEffect(() => {
    if (mode !== "SIMULATE") {
      return;
    }

    let elapsedSeconds = 0;

    const interval = setInterval(() => {
      elapsedSeconds++;

      if (elapsedSeconds >= levelConfig.timeout) {
        endSimulation();

        return;
      }

      const rate = getTrafficRate(levelConfig.trafficSchedule, elapsedSeconds);
      const graphNodes = graphRef.current.nodes.map(toGraphNode);
      const graphEdges = graphRef.current.edges.map(toGraphEdge);
      const snapshot = computeTrafficFlow(graphNodes, graphEdges, {
        cacheHitRate: levelConfig.cacheHitRate,
        trafficRate: rate,
      });
      const earned = computeRevenue(snapshot, graphNodes, {
        cacheHitRate: levelConfig.cacheHitRate,
        edges: graphEdges,
      });

      tick(snapshot, earned);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [mode, endSimulation, tick, levelConfig]);

  // Auto-end when revenue target is reached
  useEffect(() => {
    if (mode === "SIMULATE" && revenue >= levelConfig.revenueTarget) {
      endSimulation();
    }
  }, [revenue, mode, endSimulation, levelConfig.revenueTarget]);

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
      <TopBar mode={mode} onStartTraffic={handleToggleTraffic} revenue={revenue} />
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <section aria-label="Palette" style={{ flexShrink: 0, overflowY: "auto", width: "14rem" }}>
          <Palette availableComponents={PHASE_TWO_AVAILABLE_COMPONENTS} isDisabled={isLocked} />
        </section>
        <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <GameCanvas
            initialEdges={initialEdges}
            initialNodes={initialNodes}
            isLocked={isLocked}
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
    </div>
  );
};

const GameLayout = ({
  initialEdges = [],
  initialNodes = [],
  levelConfig = DEFAULT_LEVEL_CONFIG,
}: GameLayoutProps) => (
  <SimulationProvider>
    <GameLayoutContent
      initialEdges={initialEdges}
      initialNodes={initialNodes}
      levelConfig={levelConfig}
    />
  </SimulationProvider>
);

export { DEFAULT_LEVEL_CONFIG, GameLayout };
export type { GameLayoutProps };
