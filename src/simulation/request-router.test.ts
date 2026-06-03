import type { ArchitectureEdge } from "../domain/canvas-logic.js";
import { getRoutingOptions } from "./request-router.js";

const makeEdge = (id: string, source: string, target: string): ArchitectureEdge => ({
  id,
  source,
  target,
});

describe(getRoutingOptions, () => {
  it("db returns a single FULFILLED option with weight 1", () => {
    expect(getRoutingOptions("db", [], 0)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });

  it("db-large returns a single FULFILLED option with weight 1", () => {
    expect(getRoutingOptions("db-large", [], 0)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });

  it("server with one outgoing edge returns IN_TRANSIT with weight 1", () => {
    const e = makeEdge("e1", "server-1", "db-1");
    expect(getRoutingOptions("server", [e], 0)).toStrictEqual([
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 1 },
    ]);
  });

  it("server with no outgoing edges returns FULFILLED with weight 1", () => {
    expect(getRoutingOptions("server", [], 0)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });

  it("server-large with one outgoing edge returns IN_TRANSIT with weight 1", () => {
    const e = makeEdge("e1", "s", "d");
    expect(getRoutingOptions("server-large", [e], 0)).toStrictEqual([
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 1 },
    ]);
  });

  it("users with one outgoing edge returns IN_TRANSIT with weight 1", () => {
    const e = makeEdge("e1", "u", "s");
    expect(getRoutingOptions("users", [e], 0)).toStrictEqual([
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 1 },
    ]);
  });

  it("load-balancer with 2 outgoing edges returns each IN_TRANSIT with weight 0.5", () => {
    const edges = [makeEdge("e1", "lb", "s1"), makeEdge("e2", "lb", "s2")];
    expect(getRoutingOptions("load-balancer", edges, 0)).toStrictEqual([
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 0.5 },
      { option: { edgeId: "e2", status: "IN_TRANSIT" }, weight: 0.5 },
    ]);
  });

  it("load-balancer with no outgoing edges returns FULFILLED with weight 1", () => {
    expect(getRoutingOptions("load-balancer", [], 0)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });

  it("cache returns FULFILLED at cacheHitRate weight and IN_TRANSIT at (1 - cacheHitRate) weight", () => {
    const e = makeEdge("e1", "cache-1", "db-1");
    expect(getRoutingOptions("cache", [e], 0.4)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 0.4 },
      { option: { edgeId: "e1", status: "IN_TRANSIT" }, weight: 0.6 },
    ]);
  });

  it("cache with no outgoing edges returns FULFILLED with weight 1", () => {
    expect(getRoutingOptions("cache", [], 0.5)).toStrictEqual([
      { option: { status: "FULFILLED" }, weight: 1 },
    ]);
  });
});
