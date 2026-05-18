import { useEffect, useEffectEvent, useRef } from "react";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import type { LevelDefinition } from "../levels/types.js";
import { toGraphEdge, toGraphNode } from "../layouts/graph-adapters.js";
import { computeTrafficFlow, getLinearTrafficRate } from "../simulation/engine.js";
import type { LevelConfig, SimulationMode, TrafficSnapshot } from "../simulation/types.js";

const WIN_SUSTAIN_SECONDS = 3;

interface UseSimulationTickParams {
  appendEvent: (text: string) => void;
  applySnapshot: (snapshot: TrafficSnapshot, nodes: ArchitectureNode[]) => void;
  currentLevel: LevelDefinition;
  edges: ArchitectureEdge[];
  effectiveLevelConfig: LevelConfig;
  endSimulation: () => void;
  mode: SimulationMode;
  nodes: ArchitectureNode[];
  onWin: () => void;
  resetKey: number;
  setCoachMessage: (message: string) => void;
  tick: (snapshot: TrafficSnapshot, rate: number) => void;
}

const useSimulationTick = ({
  appendEvent,
  applySnapshot,
  currentLevel,
  edges,
  effectiveLevelConfig,
  endSimulation,
  mode,
  nodes,
  onWin,
  resetKey,
  setCoachMessage,
  tick,
}: UseSimulationTickParams): void => {
  const shownCoachMessageRef = useRef<Set<number>>(new Set());
  const hasSeenOverloadThisLevelRef = useRef(false);
  const hasSnapshotOverloadRef = useRef(false);
  const sustainedNoDropSecondsRef = useRef(0);

  // Reset mutable tick state when the level changes
  useEffect(() => {
    shownCoachMessageRef.current = new Set();
    hasSeenOverloadThisLevelRef.current = false;
    hasSnapshotOverloadRef.current = false;
    sustainedNoDropSecondsRef.current = 0;
  }, [resetKey]);

  const onTick = useEffectEvent((elapsedSeconds: number) => {
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

    const rate = getLinearTrafficRate({
      elapsed: elapsedSeconds,
      timeout: effectiveLevelConfig.timeout,
      trafficPeak: effectiveLevelConfig.trafficPeak,
      trafficStart: effectiveLevelConfig.trafficStart,
    });

    const graphNodes = nodes.map(toGraphNode);
    const graphEdges = edges.map(toGraphEdge);
    const snapshot = computeTrafficFlow(graphNodes, graphEdges, {
      cacheHitRate: effectiveLevelConfig.cacheHitRate,
      trafficRate: rate,
    });

    const hasOverload = Object.values(snapshot).some((s) => s.droppedOps > 0);
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

    const atOrAboveTarget = rate >= effectiveLevelConfig.trafficTarget;

    if (atOrAboveTarget && !hasOverload) {
      sustainedNoDropSecondsRef.current += 1;
    } else {
      sustainedNoDropSecondsRef.current = 0;
    }

    applySnapshot(snapshot, nodes);
    tick(snapshot, rate);

    if (sustainedNoDropSecondsRef.current >= WIN_SUSTAIN_SECONDS) {
      endSimulation();
      onWin();
    }
  });

  useEffect(() => {
    if (mode !== "SIMULATE") {
      return;
    }

    sustainedNoDropSecondsRef.current = 0;
    let elapsedSeconds = 0;

    const interval = setInterval(() => {
      elapsedSeconds++;
      onTick(elapsedSeconds);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [mode, resetKey, effectiveLevelConfig]);
};

export { useSimulationTick };
