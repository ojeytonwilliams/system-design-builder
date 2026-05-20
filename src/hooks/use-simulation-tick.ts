import { useEffect, useRef } from "react";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import type { PhaseAction } from "../game/phase-machine.js";
import type { LevelDefinition } from "../levels/types.js";
import { toGraphEdge, toGraphNode } from "../layouts/graph-adapters.js";
import { computeTrafficFlow, getLinearTrafficRate } from "../simulation/engine.js";
import { simulationEngine } from "../simulation/simulation-engine.js";
import { SimulationLoop } from "../simulation/simulation-loop.js";
import type { LevelConfig, TrafficSnapshot } from "../simulation/types.js";
import { useSimulationSnapshot } from "./use-simulation-snapshot.js";

interface UseSimulationTickParams {
  appendEvent: (text: string) => void;
  applySnapshot: (snapshot: TrafficSnapshot, nodes: ArchitectureNode[]) => void;
  currentLevel: LevelDefinition;
  dispatchPhase: (action: PhaseAction) => void;
  edges: ArchitectureEdge[];
  effectiveLevelConfig: LevelConfig;
  isSimulating: boolean;
  nodes: ArchitectureNode[];
  onWin: () => void;
  resetKey: number;
  setCoachMessage: (message: string) => void;
}

const useSimulationTick = ({
  appendEvent,
  applySnapshot,
  currentLevel,
  dispatchPhase,
  edges,
  effectiveLevelConfig,
  isSimulating,
  nodes,
  onWin,
  resetKey,
  setCoachMessage,
}: UseSimulationTickParams): void => {
  const shownCoachMessageRef = useRef<Set<number>>(new Set());
  const hasSeenOverloadThisLevelRef = useRef(false);

  // Always-latest refs for callbacks used in the engine subscription
  const appendEventRef = useRef(appendEvent);
  appendEventRef.current = appendEvent;
  const setCoachMessageRef = useRef(setCoachMessage);
  setCoachMessageRef.current = setCoachMessage;

  // Always-latest refs for graph state and config read inside the loop callback
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const levelConfigRef = useRef(effectiveLevelConfig);
  levelConfigRef.current = effectiveLevelConfig;

  const simSnapshot = useSimulationSnapshot();

  // Reset per-level state (and the engine) whenever the level changes
  useEffect(() => {
    simulationEngine.reset();
    shownCoachMessageRef.current = new Set();
    hasSeenOverloadThisLevelRef.current = false;
  }, [resetKey]);

  // Direct subscription for overload event logging.
  // Runs synchronously per engine notification, independent of React rendering.
  // STARTED and RESOLVED events on consecutive ticks are both captured.
  useEffect(
    () =>
      simulationEngine.subscribe(() => {
        const snap = simulationEngine.getSnapshot();
        if (snap.overloadEvent === "STARTED") {
          appendEventRef.current("Overload started");
          if (!hasSeenOverloadThisLevelRef.current) {
            setCoachMessageRef.current(
              "Overload detected. Add capacity or spread traffic to reduce dropped requests.",
            );
            hasSeenOverloadThisLevelRef.current = true;
          }
        } else if (snap.overloadEvent === "RESOLVED") {
          appendEventRef.current("Overload resolved");
        }
      }),
    [],
  );

  // Start/stop the simulation loop based on simulation state
  useEffect(() => {
    if (!isSimulating) {
      return;
    }

    simulationEngine.reset();
    const loop = new SimulationLoop((elapsed) => {
      const config = levelConfigRef.current;
      const graphNodes = nodesRef.current.map(toGraphNode);
      const graphEdges = edgesRef.current.map(toGraphEdge);
      const rate = getLinearTrafficRate({
        elapsed,
        timeout: config.timeout,
        trafficPeak: config.trafficPeak,
        trafficStart: config.trafficStart,
      });
      const trafficSnapshot = computeTrafficFlow(graphNodes, graphEdges, {
        cacheHitRate: config.cacheHitRate,
        trafficRate: rate,
      });
      simulationEngine.step({ elapsed, levelConfig: config, rate, trafficSnapshot });
    });
    loop.start();

    return () => {
      loop.stop();
    };
  }, [isSimulating, resetKey, effectiveLevelConfig]);

  // Show timed coach messages as elapsed time advances
  useEffect(() => {
    currentLevel.coachMessages.forEach((message, index) => {
      if (
        simSnapshot.elapsedSeconds >= message.atSecond &&
        !shownCoachMessageRef.current.has(index)
      ) {
        shownCoachMessageRef.current.add(index);
        setCoachMessage(message.text);
      }
    });
  }, [simSnapshot.elapsedSeconds, currentLevel, setCoachMessage]);

  // Apply traffic snapshot for component unlock tracking
  useEffect(() => {
    applySnapshot(simSnapshot.nodeStates, nodes);
  }, [simSnapshot.nodeStates, applySnapshot, nodes]);

  useEffect(() => {
    if (simSnapshot.isWon && isSimulating) {
      onWin();
    }
  }, [simSnapshot.isWon, isSimulating, onWin]);

  useEffect(() => {
    if (simSnapshot.isTimedOut && isSimulating) {
      dispatchPhase({ type: "TIMEOUT" });
    }
  }, [simSnapshot.isTimedOut, isSimulating, dispatchPhase]);
};

export { useSimulationTick };
