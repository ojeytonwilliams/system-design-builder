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
  it("returns valid when predicted rate is below capacity", () => {
    // rate = 0.0007, server-large capacity = 0.0015
    // predicted rate = 0.0007 < 0.0015 → valid
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

  it("returns invalid when predicted rate exceeds capacity", () => {
    // rate = 0.001, db-large capacity = 0.0009
    // predicted rate = 0.001 > 0.0009 → violation
    const solution: LevelSolution = {
      edges: [edge("e1", "u", "d")],
      nodes: [node("u", "users"), node("d", "db-large")],
    };
    const result = validateLevelSolution(
      { cacheHitRate: 0, trafficTarget: 0.001 },
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
    // predicted rate per server = 0.0007 < 0.0015 → valid
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
    // users → server-large → db-large at rate 0.001
    // db-large receives the full 0.001 (not split), 0.001 > 0.0009 → violation
    const solution: LevelSolution = {
      edges: [edge("e1", "u", "s"), edge("e2", "s", "d")],
      nodes: [node("u", "users"), node("s", "server-large"), node("d", "db-large")],
    };
    const result = validateLevelSolution(
      { cacheHitRate: 0, trafficTarget: 0.001 },
      solution,
      testCapacities,
    );
    const dbViolation = result.violations.find((v) => v.nodeId === "d");
    expect(dbViolation).toBeDefined();
    expect(dbViolation?.incomingRatePerMs).toBe(0.001);
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

  it("detects overload through convergent paths with cache", () => {
    // Topology: users → lb → s1 → cache1 → db
    //                       s2 → cache2 → db
    // cacheHitRate = 0.7 (miss rate = 0.3)
    //
    // At trafficTarget = 0.0032:
    //   lb splits evenly → 0.0016 per server
    //   each cache miss to db = 0.0016 * 0.3 = 0.00048
    //   db total = 0.00096 > 0.0009 → invalid
    //
    // At trafficTarget = 0.0028:
    //   lb splits evenly → 0.0014 per server
    //   each cache miss to db = 0.0014 * 0.3 = 0.00042
    //   db total = 0.00084 < 0.0009 → valid
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
      validateLevelSolution({ cacheHitRate: 0.7, trafficTarget: 0.0032 }, solution, testCapacities)
        .valid,
    ).toBe(false);
    expect(
      validateLevelSolution({ cacheHitRate: 0.7, trafficTarget: 0.0028 }, solution, testCapacities)
        .valid,
    ).toBe(true);
  });

  it("reduces the rate reaching db when cache hit rate is non-zero", () => {
    // users → server-large → cache → db-large, rate = 0.001
    // cacheHitRate 0 → db receives full 0.001 > 0.0009 → invalid
    // cacheHitRate 0.5 → db receives 0.0005 < 0.0009 → valid
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
      validateLevelSolution({ cacheHitRate: 0, trafficTarget: 0.001 }, solution, testCapacities)
        .valid,
    ).toBe(false);
    expect(
      validateLevelSolution({ cacheHitRate: 0.5, trafficTarget: 0.001 }, solution, testCapacities)
        .valid,
    ).toBe(true);
  });
});
