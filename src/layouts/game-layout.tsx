import type { Edge } from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";
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
  levelConfig: LevelConfig;
}

const GameLayoutContent = ({ levelConfig }: GameLayoutContentProps) => {
  const { endSimulation, mode, revenue, startSimulation, tick } = useSimulation();

  const graphRef = useRef<{ edges: Edge[]; nodes: ArchitectureCanvasNode[] }>({
    edges: [],
    nodes: [],
  });

  const handleGraphChange = useCallback((nodes: ArchitectureCanvasNode[], edges: Edge[]) => {
    graphRef.current = { edges, nodes };
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
          <GameCanvas isLocked={isLocked} onStateChange={handleGraphChange} />
        </main>
        <section
          aria-label="Inspector"
          style={{ flexShrink: 0, overflowY: "auto", width: "16rem" }}
        >
          <Inspector />
        </section>
      </div>
    </div>
  );
};

const GameLayout = ({ levelConfig = DEFAULT_LEVEL_CONFIG }: GameLayoutProps) => (
  <SimulationProvider>
    <GameLayoutContent levelConfig={levelConfig} />
  </SimulationProvider>
);

export { DEFAULT_LEVEL_CONFIG, GameLayout };
export type { GameLayoutProps };
