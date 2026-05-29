import { renderHook } from "@testing-library/react";
import { SimulationEngine } from "../../simulation/simulation-engine.js";
import { useSimulationSnapshot } from "./use-simulation-snapshot.js";

describe(useSimulationSnapshot, () => {
  it("returns the initial simulation snapshot", () => {
    const engine = new SimulationEngine();
    const { result } = renderHook(() => useSimulationSnapshot(engine));

    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.nodeMetrics).toStrictEqual(new Map());
  });
});
