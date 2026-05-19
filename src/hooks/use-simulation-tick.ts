import { useEffect, useEffectEvent, useRef } from "react";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import type { PhaseAction } from "../game/phase-machine.js";
import type { LevelDefinition } from "../levels/types.js";
import { toGraphEdge, toGraphNode } from "../layouts/graph-adapters.js";
import { computeTrafficFlow, getLinearTrafficRate } from "../simulation/engine.js";
import { simulationStore } from "../simulation/simulation-store.js";
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
  const hasSnapshotOverloadRef = useRef(false);

  const simSnapshot = useSimulationSnapshot();

  // Reset per-level state (and the store) whenever the level changes
  useEffect(() => {
    simulationStore.reset();
    shownCoachMessageRef.current = new Set();
    hasSeenOverloadThisLevelRef.current = false;
    hasSnapshotOverloadRef.current = false;
  }, [resetKey]);

  const onTick = useEffectEvent((elapsedSeconds: number) => {
    currentLevel.coachMessages.forEach((message, index) => {
      if (elapsedSeconds < message.atSecond || shownCoachMessageRef.current.has(index)) {
        return;
      }
      shownCoachMessageRef.current.add(index);
      setCoachMessage(message.text);
    });

    const rate = getLinearTrafficRate({
      elapsed: elapsedSeconds,
      timeout: effectiveLevelConfig.timeout,
      trafficPeak: effectiveLevelConfig.trafficPeak,
      trafficStart: effectiveLevelConfig.trafficStart,
    });

    const graphNodes = nodes.map(toGraphNode);
    const graphEdges = edges.map(toGraphEdge);
    const trafficSnapshot = computeTrafficFlow(graphNodes, graphEdges, {
      cacheHitRate: effectiveLevelConfig.cacheHitRate,
      trafficRate: rate,
    });

    simulationStore.applyTick({
      elapsed: elapsedSeconds,
      levelConfig: effectiveLevelConfig,
      rate,
      trafficSnapshot,
    });
    applySnapshot(trafficSnapshot, nodes);

    // Overload transition detection runs synchronously per tick to avoid
    // React batching multiple transitions into a single render cycle.
    const hasOverload = Object.values(trafficSnapshot).some((s) => s.droppedOps > 0);
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
  });

  useEffect(() => {
    if (!isSimulating) {
      return;
    }

    simulationStore.reset();
    let elapsedSeconds = 0;

    const interval = setInterval(() => {
      elapsedSeconds++;
      onTick(elapsedSeconds);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isSimulating, resetKey]);

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
