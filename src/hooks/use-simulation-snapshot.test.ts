import { renderHook } from "@testing-library/react";
import { simulationEngine } from "../simulation/simulation-engine.js";
import { useSimulationSnapshot } from "./use-simulation-snapshot.js";

describe(useSimulationSnapshot, () => {
  beforeEach(() => {
    simulationEngine.reset();
  });

  it("returns the initial simulation snapshot", () => {
    const { result } = renderHook(() => useSimulationSnapshot());

    expect(result.current.isWon).toBe(false);
    expect(result.current.isTimedOut).toBe(false);
    expect(result.current.nodeStates).toStrictEqual({});
    expect(result.current.sustainedNoDropSeconds).toBe(0);
  });
});
