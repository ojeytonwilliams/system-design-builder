import type { LevelDefinition } from "./types.js";

const level4: LevelDefinition = {
  availableComponents: ["server", "server-large", "load-balancer", "db", "db-large", "cache"],
  cacheHitRate: 0.6,
  coachMessages: [
    {
      atSecond: 2,
      text: "Too many requests reach the database. Add a Cache between the servers and DB to intercept repeated reads.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "The cache intercepted 60% of database reads, dramatically reducing the load on the DB.",
    "Storing frequently accessed data in memory to avoid repeated database queries is called caching.",
  ],
  id: 4,
  lockedNodeIds: ["users-1"],
  monthlyBudget: 200,
  objectiveText: "The database is still overloaded. Add a Cache to reduce DB reads.",
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
      componentType: "db-large",
      id: "db-1",
      label: "Large DB",
      position: { x: 700, y: 200 },
    },
  ],
  timeout: 60,
  title: "Read Overload",
  trafficPeak: 160,
  trafficStart: 160,
  trafficTarget: 160,
};

export { level4 };
