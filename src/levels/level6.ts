import type { LevelDefinition } from "./types.js";

const level6: LevelDefinition = {
  availableComponents: ["server", "server-large", "load-balancer", "db", "db-large", "cache"],
  cacheHitRate: 0.7,
  coachMessages: [
    {
      atMs: 2_000,
      text: "Multiple nodes are overloaded. Upgrade the servers and add a Cache to protect the database.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "You scaled every layer of the stack: compute, caching, and the database.",
    "Designing a system where every layer has enough capacity is called full-stack scaling.",
  ],
  id: "_quYqGvc5gWDbxLiwocDx",
  lockedNodeIds: ["users-1", "lb-1"],
  monthlyBudget: 300,
  objectiveText: "The whole system is struggling under high traffic. Scale it to handle 180 ops/s.",
  solutions: [
    {
      edges: [
        { id: "edge-u-lb", source: "users-1", target: "lb-1" },
        { id: "edge-lb-s1", source: "lb-1", target: "server-1" },
        { id: "edge-lb-s2", source: "lb-1", target: "server-2" },
        { id: "edge-s1-c1", source: "server-1", target: "cache-1" },
        { id: "edge-c1-d", source: "cache-1", target: "db-1" },
        { id: "edge-s2-c1", source: "server-2", target: "cache-1" },
        { id: "edge-c2-d", source: "cache-2", target: "db-1" },
      ],
      nodes: [
        { componentType: "users", id: "users-1", position: { x: 72, y: 192 } },
        { componentType: "load-balancer", id: "lb-1", position: { x: 264, y: 192 } },
        { componentType: "server-large", id: "server-1", position: { x: 432, y: 72 } },
        { componentType: "server-large", id: "server-2", position: { x: 432, y: 312 } },
        { componentType: "cache", id: "cache-1", position: { x: 540, y: 72 } },
        { componentType: "db-large", id: "db-1", position: { x: 648, y: 192 } },
      ],
    },
  ],
  startingEdges: [
    { id: "edge-u-lb", source: "users-1", target: "lb-1" },
    { id: "edge-lb-s1", source: "lb-1", target: "server-1" },
    { id: "edge-lb-s2", source: "lb-1", target: "server-2" },
    { id: "edge-s1-d", source: "server-1", target: "db-1" },
    { id: "edge-s2-d", source: "server-2", target: "db-1" },
  ],
  startingNodes: [
    {
      componentType: "users",
      id: "users-1",
      position: { x: 72, y: 192 },
    },
    {
      componentType: "load-balancer",
      id: "lb-1",
      position: { x: 264, y: 192 },
    },
    {
      componentType: "server",
      id: "server-1",
      position: { x: 432, y: 72 },
    },
    {
      componentType: "server",
      id: "server-2",
      position: { x: 432, y: 312 },
    },
    {
      componentType: "db",
      id: "db-1",
      position: { x: 648, y: 192 },
    },
  ],
  timeout: 1_000_000,
  title: "Full Scale",
  trafficPeak: 0.36,
  trafficStart: 0.36,
  trafficTarget: 0.36,
  winSustainMs: 10_000,
};

export { level6 };
