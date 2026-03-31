import type { LevelDefinition } from "./types.js";

const level1: LevelDefinition = {
  availableComponents: ["server", "server-large", "db"],
  cacheHitRate: 0,
  coachMessages: [
    {
      atSecond: 2,
      text: "Your server is overloaded — 70 req/s is more than its 50 req/s limit. Swap it for a Large Server.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "Swapping to a larger server gave you more capacity to handle the traffic.",
    "Choosing bigger hardware to handle more load is called vertical scaling.",
  ],
  id: 1,
  lockedNodeIds: ["users-1", "db-1"],
  monthlyBudget: 150,
  objectiveText: "Your server is overloaded. Fix the architecture to handle 70 req/s.",
  startingEdges: [
    { id: "edge-u-s", source: "users-1", target: "server-1" },
    { id: "edge-s-d", source: "server-1", target: "db-1" },
  ],
  startingNodes: [
    {
      componentType: "users",
      id: "users-1",
      label: "Users",
      position: { x: 80, y: 160 },
    },
    {
      componentType: "server",
      id: "server-1",
      label: "Small Server",
      position: { x: 280, y: 160 },
    },
    {
      componentType: "db-large",
      id: "db-1",
      label: "Large DB",
      position: { x: 480, y: 160 },
    },
  ],
  timeout: 60,
  title: "First Request",
  trafficPeak: 70,
  trafficStart: 70,
  trafficTarget: 70,
};

export { level1 };
