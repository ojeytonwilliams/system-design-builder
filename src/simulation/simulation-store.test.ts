import { computeNextSimState } from "./simulation-store.js";
import type { SimTick } from "./simulation-store.js";
import type { TrafficSnapshot } from "./types.js";

const noDropSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 0, handledOps: 100, incomingOps: 100 },
};

const overloadSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 50, handledOps: 50, incomingOps: 100 },
};

const baseTick: SimTick = {
  elapsed: 1,
  rate: 100,
  trafficSnapshot: noDropSnapshot,
};

describe(computeNextSimState, () => {
  it("updates currentTrafficRate, elapsedSeconds and nodeStates from the tick", () => {
    const result = computeNextSimState(baseTick);

    expect(result.currentTrafficRate).toBe(100);
    expect(result.elapsedSeconds).toBe(1);
    expect(result.nodeStates).toBe(noDropSnapshot);
  });

  it("sets hasOverload to true when any node has dropped ops", () => {
    const result = computeNextSimState({ ...baseTick, trafficSnapshot: overloadSnapshot });

    expect(result.hasOverload).toBe(true);
  });

  it("sets hasOverload to false when no nodes have dropped ops", () => {
    const result = computeNextSimState(baseTick);

    expect(result.hasOverload).toBe(false);
  });
});
