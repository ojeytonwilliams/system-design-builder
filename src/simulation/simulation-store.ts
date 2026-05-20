import { updateOverloadDurations } from "./unlocks.js";
import type { OverloadDurations } from "./unlocks.js";
import type { LevelConfig, TrafficSnapshot } from "./types.js";

interface SimulationSnapshot {
  currentTrafficRate: number;
  elapsedSeconds: number;
  hasOverload: boolean;
  isTimedOut: boolean;
  isWon: boolean;
  nodeStates: TrafficSnapshot;
  overloadDurations: OverloadDurations;
  overloadEvent: "RESOLVED" | "STARTED" | null;
  sustainedNoDropSeconds: number;
}

interface SimTick {
  elapsed: number;
  levelConfig: LevelConfig;
  rate: number;
  trafficSnapshot: TrafficSnapshot;
}

const getInitialSnapshot = (): SimulationSnapshot => ({
  currentTrafficRate: 0,
  elapsedSeconds: 0,
  hasOverload: false,
  isTimedOut: false,
  isWon: false,
  nodeStates: {},
  overloadDurations: new Map(),
  overloadEvent: null,
  sustainedNoDropSeconds: 0,
});

const computeNextSimState = (
  prev: SimulationSnapshot,
  { elapsed, levelConfig, rate, trafficSnapshot }: SimTick,
): SimulationSnapshot => {
  if (elapsed >= levelConfig.timeout) {
    return { ...prev, elapsedSeconds: elapsed, isTimedOut: true, overloadEvent: null };
  }

  const hasOverload = Object.values(trafficSnapshot).some((s) => s.droppedOps > 0);
  const hadOverload = prev.hasOverload;

  let overloadEvent: "RESOLVED" | "STARTED" | null = null;
  if (!hadOverload && hasOverload) {
    overloadEvent = "STARTED";
  } else if (hadOverload && !hasOverload) {
    overloadEvent = "RESOLVED";
  }

  const overloadDurations = updateOverloadDurations(prev.overloadDurations, trafficSnapshot);

  const atOrAboveTarget = rate >= levelConfig.trafficTarget;
  const sustainedNoDropSeconds =
    atOrAboveTarget && !hasOverload ? prev.sustainedNoDropSeconds + 1 : 0;

  const isWon = prev.isWon || sustainedNoDropSeconds >= levelConfig.winSustainSeconds;

  return {
    currentTrafficRate: rate,
    elapsedSeconds: elapsed,
    hasOverload,
    isTimedOut: false,
    isWon,
    nodeStates: trafficSnapshot,
    overloadDurations,
    overloadEvent,
    sustainedNoDropSeconds,
  };
};

export type { SimTick, SimulationSnapshot };
export { computeNextSimState, getInitialSnapshot };
