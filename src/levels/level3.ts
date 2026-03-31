import type { LevelDefinition } from "./types.js";

const level3: LevelDefinition = {
  availableComponents: ["server", "server-large", "load-balancer", "db", "db-large"],
  cacheHitRate: 0,
  coachMessages: [
    {
      atSecond: 2,
      text: "Your database is the bottleneck — it can only handle 30 req/s but receives 85. Upgrade to a Large DB.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "Upgrading to a larger database gave it enough capacity to keep up with traffic.",
    "Scaling up a database to handle more queries is called vertical database scaling.",
  ],
  id: 3,
  lockedNodeIds: ["users-1", "lb-1", "server-1", "server-2"],
  monthlyBudget: 180,
  objectiveText: "The database is overloaded. Upgrade it to handle 85 req/s.",
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
      componentType: "db",
      id: "db-1",
      label: "Small DB",
      position: { x: 640, y: 200 },
    },
  ],
  timeout: 60,
  title: "DB Bottleneck",
  trafficPeak: 85,
  trafficStart: 85,
  trafficTarget: 85,
};

export { level3 };
