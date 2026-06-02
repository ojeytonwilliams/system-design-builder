import type { ComponentType } from "../domain/component-library.js";
import type { LevelSolution } from "./types.js";
import { validateLevelSolution } from "./level-validator.js";

// Mirrors the real COMPONENT_LIBRARY post-conversion values (÷100 for rates).
const testCapacities = {
  cache: { capacity: 0.002 },
  db: { capacity: 0.0003 },
  "db-large": { capacity: 0.0009 },
  "load-balancer": { capacity: Infinity },
  server: { capacity: 0.0005 },
  "server-large": { capacity: 0.0015 },
  users: { capacity: Infinity },
};

const node = (id: string, componentType: ComponentType) => ({
  componentType,
  id,
  position: { x: 0, y: 0 },
});

const edge = (id: string, source: string, target: string) => ({
  id,
  source,
  target,
});

describe(validateLevelSolution, () => {
  it("returns valid when max measured rate is below capacity", () => {
    // rate = 0.0007, server-large capacity = 0.0015
    // maxMeasured = (floor(3000 * 0.0007) + 1) / 3000 = 3 / 3000 = 0.001 < 0.0015
    const solution: LevelSolution = {
      edges: [edge("e1", "u", "s")],
      nodes: [node("u", "users"), node("s", "server-large")],
    };
    const result = validateLevelSolution(
      { cacheHitRate: 0, trafficTarget: 0.0007 },
      solution,
      testCapacities,
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("returns invalid when max measured rate meets or exceeds capacity", () => {
    // rate = 0.0007, db-large capacity = 0.0009
    // maxMeasured = 3 / 3000 = 0.001 >= 0.0009 → violation
    const solution: LevelSolution = {
      edges: [edge("e1", "u", "d")],
      nodes: [node("u", "users"), node("d", "db-large")],
    };
    const result = validateLevelSolution(
      { cacheHitRate: 0, trafficTarget: 0.0007 },
      solution,
      testCapacities,
    );
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.nodeId).toBe("d");
  });

  it("never flags nodes with infinite capacity", () => {
    // users and load-balancer both have Infinity capacity — should never appear in violations
    const solution: LevelSolution = {
      edges: [edge("e1", "u", "lb")],
      nodes: [node("u", "users"), node("lb", "load-balancer")],
    };
    const result = validateLevelSolution(
      { cacheHitRate: 0, trafficTarget: 100 },
      solution,
      testCapacities,
    );
    expect(result.valid).toBe(true);
  });

  it("splits traffic equally across load-balancer outgoing edges", () => {
    // trafficTarget = 0.0014; lb splits to 0.0007 per server-large
    // maxMeasured per server = 3 / 3000 = 0.001 < 0.0015 → valid
    const solution: LevelSolution = {
      edges: [edge("e1", "u", "lb"), edge("e2", "lb", "s1"), edge("e3", "lb", "s2")],
      nodes: [
        node("u", "users"),
        node("lb", "load-balancer"),
        node("s1", "server-large"),
        node("s2", "server-large"),
      ],
    };
    const result = validateLevelSolution(
      { cacheHitRate: 0, trafficTarget: 0.0014 },
      solution,
      testCapacities,
    );
    expect(result.valid).toBe(true);
  });

  it("non-load-balancer nodes do not split traffic", () => {
    // users → server-large → db-large at rate 0.0007
    // db-large receives the full 0.0007 (not split)
    const solution: LevelSolution = {
      edges: [edge("e1", "u", "s"), edge("e2", "s", "d")],
      nodes: [node("u", "users"), node("s", "server-large"), node("d", "db-large")],
    };
    const result = validateLevelSolution(
      { cacheHitRate: 0, trafficTarget: 0.0007 },
      solution,
      testCapacities,
    );
    const dbViolation = result.violations.find((v) => v.nodeId === "d");
    expect(dbViolation).toBeDefined();
    expect(dbViolation?.incomingRatePerMs).toBe(0.0007);
  });

  it("accumulates traffic from multiple upstream paths into a shared downstream node", () => {
    // users → lb → s1 → db, s2 → db at rate 0.0014
    // lb splits to 0.0007 per server; db receives 0.0007 + 0.0007 = 0.0014
    const solution: LevelSolution = {
      edges: [
        edge("e1", "u", "lb"),
        edge("e2", "lb", "s1"),
        edge("e3", "lb", "s2"),
        edge("e4", "s1", "d"),
        edge("e5", "s2", "d"),
      ],
      nodes: [
        node("u", "users"),
        node("lb", "load-balancer"),
        node("s1", "server-large"),
        node("s2", "server-large"),
        node("d", "db-large"),
      ],
    };
    const result = validateLevelSolution(
      { cacheHitRate: 0, trafficTarget: 0.0014 },
      solution,
      testCapacities,
    );
    const dbMetrics = result.violations.find((v) => v.nodeId === "d");
    expect(dbMetrics?.incomingRatePerMs).toBe(0.0014);
  });

  it("sums per-edge WRR bounds when independent routing nodes both feed the same downstream", () => {
    // Topology: users → lb → s1 → cache1 → db
    //                       s2 → cache2 → db
    // cacheHitRate = 0.7 (miss rate = 0.3)
    //
    // At trafficTarget = 0.0022 (M_lb = 7, split 4+3 by WRR):
    //   cache1 max to db = ceil(4 * 0.3) = 2
    //   cache2 max to db = ceil(3 * 0.3) = 1
    //   db total = 3 → 3/3000 = 0.001 >= 0.0009 → invalid
    //
    // At trafficTarget = 0.0018 (M_lb = 6, split 3+3 by WRR):
    //   each cache max to db = ceil(3 * 0.3) = 1
    //   db total = 2 → 2/3000 ≈ 0.000667 < 0.0009 → valid
    const solution: LevelSolution = {
      edges: [
        edge("e-u-lb", "u", "lb"),
        edge("e-lb-s1", "lb", "s1"),
        edge("e-lb-s2", "lb", "s2"),
        edge("e-s1-c1", "s1", "c1"),
        edge("e-s2-c2", "s2", "c2"),
        edge("e-c1-db", "c1", "db"),
        edge("e-c2-db", "c2", "db"),
      ],
      nodes: [
        node("u", "users"),
        node("lb", "load-balancer"),
        node("s1", "server-large"),
        node("s2", "server-large"),
        node("c1", "cache"),
        node("c2", "cache"),
        node("db", "db-large"),
      ],
    };
    expect(
      validateLevelSolution({ cacheHitRate: 0.7, trafficTarget: 0.0022 }, solution, testCapacities)
        .valid,
    ).toBe(false);
    expect(
      validateLevelSolution({ cacheHitRate: 0.7, trafficTarget: 0.0018 }, solution, testCapacities)
        .valid,
    ).toBe(true);
  });

  it("reduces the rate reaching db when cache hit rate is non-zero", () => {
    // users → server-large → cache → db-large, rate = 0.0007
    // cacheHitRate 0 → db receives full 0.0007 → maxMeasured 3/3000 = 0.001 >= 0.0009 → invalid
    // cacheHitRate 0.5 → db receives 0.00035 → maxMeasured 2/3000 ≈ 0.000667 < 0.0009 → valid
    const solution: LevelSolution = {
      edges: [edge("e1", "u", "s"), edge("e2", "s", "c"), edge("e3", "c", "d")],
      nodes: [
        node("u", "users"),
        node("s", "server-large"),
        node("c", "cache"),
        node("d", "db-large"),
      ],
    };
    expect(
      validateLevelSolution({ cacheHitRate: 0, trafficTarget: 0.0007 }, solution, testCapacities)
        .valid,
    ).toBe(false);
    expect(
      validateLevelSolution({ cacheHitRate: 0.5, trafficTarget: 0.0007 }, solution, testCapacities)
        .valid,
    ).toBe(true);
  });
});
