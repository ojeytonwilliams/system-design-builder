import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { getLinearTrafficRate, hasRunnablePath } from "./engine.js";

const pos = { x: 0, y: 0 };

const usersNode = (id = "users-1"): ArchitectureNode => ({
  componentType: "users",
  id,
  position: pos,
});

const serverNode = (id = "server-1"): ArchitectureNode => ({
  componentType: "server",
  id,
  position: pos,
});

const dbNode = (id = "db-1"): ArchitectureNode => ({
  componentType: "db",
  id,
  position: pos,
});

const edge = (source: string, target: string): ArchitectureEdge => ({
  id: `${source}-${target}`,
  source,
  target,
});

describe("linear traffic rate", () => {
  it("returns the start rate at elapsed time 0", () => {
    expect(
      getLinearTrafficRate({ elapsed: 0, timeout: 60, trafficPeak: 100, trafficStart: 20 }),
    ).toBe(20);
  });

  it("returns the peak rate at elapsed time equal to timeout", () => {
    expect(
      getLinearTrafficRate({ elapsed: 60, timeout: 60, trafficPeak: 100, trafficStart: 20 }),
    ).toBe(100);
  });

  it("returns an interpolated rate at the midpoint", () => {
    expect(
      getLinearTrafficRate({ elapsed: 30, timeout: 60, trafficPeak: 100, trafficStart: 0 }),
    ).toBeCloseTo(50);
  });

  it("returns the peak rate when elapsed time exceeds timeout", () => {
    expect(
      getLinearTrafficRate({ elapsed: 90, timeout: 60, trafficPeak: 100, trafficStart: 20 }),
    ).toBe(100);
  });

  it("returns the start rate when start equals peak (constant traffic)", () => {
    expect(
      getLinearTrafficRate({ elapsed: 30, timeout: 60, trafficPeak: 80, trafficStart: 80 }),
    ).toBe(80);
  });

  it("increases monotonically over time", () => {
    const r1 = getLinearTrafficRate({
      elapsed: 10,
      timeout: 60,
      trafficPeak: 100,
      trafficStart: 0,
    });
    const r2 = getLinearTrafficRate({
      elapsed: 20,
      timeout: 60,
      trafficPeak: 100,
      trafficStart: 0,
    });
    const r3 = getLinearTrafficRate({
      elapsed: 30,
      timeout: 60,
      trafficPeak: 100,
      trafficStart: 0,
    });

    expect(r1).toBeLessThan(r2);
    expect(r2).toBeLessThan(r3);
  });
});

describe(hasRunnablePath, () => {
  it("returns false when there are no nodes", () => {
    expect(hasRunnablePath([], [])).toBe(false);
  });

  it("returns false when a users node has no outgoing edges", () => {
    const nodes = [usersNode()];

    expect(hasRunnablePath(nodes, [])).toBe(false);
  });

  it("returns true when a users node has at least one outgoing edge", () => {
    const nodes = [usersNode(), serverNode()];
    const edges = [edge("users-1", "server-1")];

    expect(hasRunnablePath(nodes, edges)).toBe(true);
  });

  it("returns false when there are edges but none from a users node", () => {
    const nodes = [serverNode(), dbNode()];
    const edges = [edge("server-1", "db-1")];

    expect(hasRunnablePath(nodes, edges)).toBe(false);
  });
});
