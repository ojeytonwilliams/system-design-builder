import type { LevelDefinition } from "./types.js";

const level6: LevelDefinition = {
  availableComponents: ["server", "server-large", "load-balancer", "db", "db-large", "cache"],
  cacheHitRate: 0.7,
  coachMessages: [
    {
      atSecond: 2,
      text: "Multiple nodes are overloaded. Expand capacity across the whole system — and stay within budget.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "You scaled every layer of the stack: compute, load balancing, caching, and the database.",
    "Designing a system where every layer has enough capacity is called full-stack scaling.",
  ],
  id: 6,
  lockedNodeIds: ["users-1"],
  monthlyBudget: 300,
  objectiveText: "The whole system is struggling under high traffic. Scale it to handle 220 req/s.",
  startingEdges: [
    { id: "edge-u-lb", source: "users-1", target: "lb-1" },
    { id: "edge-lb-s1", source: "lb-1", target: "server-1" },
    { id: "edge-lb-s2", source: "lb-1", target: "server-2" },
    { id: "edge-s1-c", source: "server-1", target: "cache-1" },
    { id: "edge-s2-c", source: "server-2", target: "cache-1" },
    { id: "edge-c-d", source: "cache-1", target: "db-1" },
  ],
  startingNodes: [
    {
      componentType: "users",
      id: "users-1",
      label: "Users",
      position: { x: 80, y: 200 },
    },
    {
      componentType: "load-balancer",
      id: "lb-1",
      label: "Load Balancer",
      position: { x: 260, y: 200 },
    },
    {
      componentType: "server",
      id: "server-1",
      label: "Small Server",
      position: { x: 440, y: 80 },
    },
    {
      componentType: "server",
      id: "server-2",
      label: "Small Server",
      position: { x: 440, y: 320 },
    },
    {
      componentType: "cache",
      id: "cache-1",
      label: "Cache",
      position: { x: 640, y: 200 },
    },
    {
      componentType: "db",
      id: "db-1",
      label: "Small DB",
      position: { x: 820, y: 200 },
    },
  ],
  timeout: 90,
  title: "Full Scale",
  trafficPeak: 220,
  trafficStart: 220,
  trafficTarget: 220,
};

export { level6 };
