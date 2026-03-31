import type { LevelDefinition } from "./types.js";

const level2: LevelDefinition = {
  availableComponents: ["server", "server-large", "load-balancer", "db"],
  cacheHitRate: 0,
  coachMessages: [
    {
      atSecond: 2,
      text: "Both servers are receiving the full 80 req/s — way over their 50 req/s limit. Add a Load Balancer to split the traffic evenly.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "Adding a Load Balancer split the traffic evenly across your two servers.",
    "Distributing requests across multiple machines is called load balancing.",
  ],
  id: 2,
  lockedNodeIds: ["users-1", "server-1", "server-2", "db-1"],
  monthlyBudget: 150,
  objectiveText: "Both servers are overloaded. Add a Load Balancer to split the traffic.",
  startingEdges: [
    { id: "edge-u-s1", source: "users-1", target: "server-1" },
    { id: "edge-u-s2", source: "users-1", target: "server-2" },
    { id: "edge-s1-d", source: "server-1", target: "db-1" },
    { id: "edge-s2-d", source: "server-2", target: "db-1" },
  ],
  startingNodes: [
    {
      componentType: "users",
      id: "users-1",
      label: "Users",
      position: { x: 80, y: 200 },
    },
    {
      componentType: "server",
      id: "server-1",
      label: "Small Server",
      position: { x: 320, y: 80 },
    },
    {
      componentType: "server",
      id: "server-2",
      label: "Small Server",
      position: { x: 320, y: 320 },
    },
    {
      componentType: "db-large",
      id: "db-1",
      label: "Large DB",
      position: { x: 560, y: 200 },
    },
  ],
  timeout: 60,
  title: "Over Capacity",
  trafficPeak: 80,
  trafficStart: 80,
  trafficTarget: 80,
};

export { level2 };
