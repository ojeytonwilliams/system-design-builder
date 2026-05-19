import { renderHook } from "@testing-library/react";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import type { LevelConfig } from "../simulation/types.js";
import { useDesignModeOverloads } from "./use-design-mode-overloads.js";

const nodes: ArchitectureNode[] = [
  {
    componentType: "users",
    id: "users-1",
    position: { x: 0, y: 0 },
  },
  {
    componentType: "server",
    id: "server-1",
    position: { x: 96, y: 0 },
  },
];

const edges: ArchitectureEdge[] = [{ id: "edge-1", source: "users-1", target: "server-1" }];

const baseConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 999,
  timeout: 60,
  trafficPeak: 150,
  trafficStart: 150,
  trafficTarget: 150,
};

describe("design-mode overload detection", () => {
  it("returns an empty array when simulating even if traffic exceeds capacity", () => {
    const graphState = { edges, nodes };
    const { result } = renderHook(() => useDesignModeOverloads(true, graphState, baseConfig));

    expect(result.current).toStrictEqual([]);
  });

  it("returns an empty array when traffic start is below server capacity in design mode", () => {
    const lowTrafficConfig: LevelConfig = { ...baseConfig, trafficStart: 10 };
    const graphState = { edges, nodes };
    const { result } = renderHook(() =>
      useDesignModeOverloads(false, graphState, lowTrafficConfig),
    );

    expect(result.current).toStrictEqual([]);
  });

  it("returns overloaded node ids in design mode when trafficStart exceeds node capacity", () => {
    // server capacity = 50, trafficStart = 150 → overloaded
    const graphState = { edges, nodes };
    const { result } = renderHook(() => useDesignModeOverloads(false, graphState, baseConfig));

    expect(result.current).toContain("server-1");
    expect(result.current).not.toContain("users-1");
  });
});
