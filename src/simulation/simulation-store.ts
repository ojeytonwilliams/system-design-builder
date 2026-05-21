import type { TrafficSnapshot } from "./types.js";

interface SimulationSnapshot {
  currentTrafficRate: number;
  elapsedSeconds: number;
  hasOverload: boolean;
  nodeStates: TrafficSnapshot;
}

interface SimTick {
  elapsed: number;
  rate: number;
  trafficSnapshot: TrafficSnapshot;
}

const getInitialSnapshot = (): SimulationSnapshot => ({
  currentTrafficRate: 0,
  elapsedSeconds: 0,
  hasOverload: false,
  nodeStates: {},
});

const computeNextSimState = ({ elapsed, rate, trafficSnapshot }: SimTick): SimulationSnapshot => {
  const hasOverload = Object.values(trafficSnapshot).some((s) => s.droppedOps > 0);

  return {
    currentTrafficRate: rate,
    elapsedSeconds: elapsed,
    hasOverload,
    nodeStates: trafficSnapshot,
  };
};

export type { SimTick, SimulationSnapshot };
export { computeNextSimState, getInitialSnapshot };
