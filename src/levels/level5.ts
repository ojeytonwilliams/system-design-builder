import type { LevelDefinition } from "./types.js";

const level5: LevelDefinition = {
  availableComponents: ["server", "server-large", "load-balancer", "db", "db-large", "cache"],
  cacheHitRate: 0.6,
  coachMessages: [
    {
      atSecond: 2,
      text: "You're over budget. Replace the Large Servers with Small Servers — the Load Balancer will share the load.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "Using smaller servers with a load balancer matched the performance of larger servers at lower cost.",
    "Choosing the right-sized components for your budget is called right-sizing your infrastructure.",
  ],
  id: 5,
  lockedNodeIds: ["users-1", "lb-1", "cache-1", "db-1"],
  monthlyBudget: 220,
  objectiveText: "Redesign within the $220/mo budget to handle 120 req/s.",
  startingEdges: [
    { id: "edge-u-lb", source: "users-1", target: "lb-1" },
    { id: "edge-lb-s1", source: "lb-1", target: "server-1" },
    { id: "edge-lb-s2", source: "lb-1", target: "server-2" },
    { id: "edge-lb-s3", source: "lb-1", target: "server-3" },
    { id: "edge-s1-c", source: "server-1", target: "cache-1" },
    { id: "edge-s2-c", source: "server-2", target: "cache-1" },
    { id: "edge-s3-c", source: "server-3", target: "cache-1" },
    { id: "edge-c-d", source: "cache-1", target: "db-1" },
  ],
  startingNodes: [
    {
      componentType: "users",
      id: "users-1",
      label: "Users",
      position: { x: 80, y: 260 },
    },
    {
      componentType: "load-balancer",
      id: "lb-1",
      label: "Load Balancer",
      position: { x: 260, y: 260 },
    },
    {
      componentType: "server-large",
      id: "server-1",
      label: "Large Server",
      position: { x: 440, y: 80 },
    },
    {
      componentType: "server-large",
      id: "server-2",
      label: "Large Server",
      position: { x: 440, y: 260 },
    },
    {
      componentType: "server-large",
      id: "server-3",
      label: "Large Server",
      position: { x: 440, y: 440 },
    },
    {
      componentType: "cache",
      id: "cache-1",
      label: "Cache",
      position: { x: 640, y: 260 },
    },
    {
      componentType: "db-large",
      id: "db-1",
      label: "Large DB",
      position: { x: 820, y: 260 },
    },
  ],
  timeout: 60,
  title: "Right-Sizing",
  trafficPeak: 120,
  trafficStart: 120,
  trafficTarget: 120,
};

export { level5 };
