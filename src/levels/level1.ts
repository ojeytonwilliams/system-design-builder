import type { LevelDefinition } from "./types.js";

const level1: LevelDefinition = {
  availableComponents: ["users", "server", "db"],
  cacheHitRate: 0,
  coachMessages: [
    { atSecond: 3, text: "Drag a Server and a DB onto the canvas, then connect them to Users." },
    { atSecond: 20, text: "Traffic is flowing! Watch the revenue counter climb." },
  ],
  componentUnlocks: [],
  feedbackText: [
    "Nice work! You routed user traffic through a server to a database.",
    "A single server handles this load just fine — for now.",
  ],
  id: 1,
  lockedNodeIds: ["users-1"],
  objectiveText: "Place a Server and DB, then connect Users → Server → DB.",
  revenueTarget: 800,
  startingEdges: [],
  startingNodes: [
    {
      componentType: "users",
      id: "users-1",
      label: "Users",
      position: { x: 96, y: 160 },
    },
  ],
  timeout: 90,
  title: "First Request",
  trafficSchedule: [
    { opsPerSec: 30, startTime: 0 },
    { opsPerSec: 60, startTime: 45 },
  ],
};

export { level1 };
