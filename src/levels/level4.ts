import type { LevelDefinition } from "./types.js";

const level4: LevelDefinition = {
  availableComponents: ["server", "server-large", "load-balancer", "db", "db-large", "cache"],
  cacheHitRate: 0.6,
  coachMessages: [
    {
      atMs: 2_000,
      text: "Too many requests reach the database. Add a Cache between the servers and DB to intercept repeated reads.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "The cache intercepted 60% of database reads, dramatically reducing the load on the DB.",
    "Storing frequently accessed data in memory to avoid repeated database queries is called caching.",
  ],
  id: "azDjm5Azo_N_Jq1lvjb4G",
  lockedNodeIds: ["users-1", "lb-1", "server-1", "server-2", "db-1"],
  monthlyBudget: 280,
  objectiveText: "The database is still overloaded. Add a Cache to reduce DB reads.",
  solutions: [
    {
      edges: [
        { id: "edge-u-lb", source: "users-1", target: "lb-1" },
        { id: "edge-lb-s1", source: "lb-1", target: "server-1" },
        { id: "edge-lb-s2", source: "lb-1", target: "server-2" },
        { id: "edge-s1-c", source: "server-1", target: "cache-1" },
        { id: "edge-s2-c", source: "server-2", target: "cache-1" },
        { id: "edge-c-d", source: "cache-1", target: "db-1" },
      ],
      nodes: [
        { componentType: "users", id: "users-1", position: { x: 72, y: 192 } },
        { componentType: "load-balancer", id: "lb-1", position: { x: 264, y: 192 } },
        { componentType: "server-large", id: "server-1", position: { x: 432, y: 72 } },
        { componentType: "server-large", id: "server-2", position: { x: 432, y: 312 } },
        { componentType: "cache", id: "cache-1", position: { x: 564, y: 192 } },
        { componentType: "db-large", id: "db-1", position: { x: 696, y: 192 } },
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
      componentType: "server-large",
      id: "server-1",
      position: { x: 432, y: 72 },
    },
    {
      componentType: "server-large",
      id: "server-2",
      position: { x: 432, y: 312 },
    },
    {
      componentType: "db-large",
      id: "db-1",
      position: { x: 696, y: 192 },
    },
  ],
  timeout: 60_000,
  title: "Read Overload",
  trafficPeak: 0.32,
  trafficStart: 0.32,
  trafficTarget: 0.32,
  winSustainMs: 10_000,
};

export { level4 };
