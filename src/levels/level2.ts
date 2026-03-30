import type { LevelDefinition } from "./types.js";

const level2: LevelDefinition = {
  availableComponents: ["users", "server", "db"],
  cacheHitRate: 0,
  coachMessages: [
    { atSecond: 5, text: "Traffic is rising. Keep an eye on your server's load." },
    {
      atSecond: 32,
      text: "Your server is overloaded — it can only handle 100 ops/s. Requests are being dropped!",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "You made it, but requests were dropped when traffic peaked.",
    "Next challenge: what if you could split the load across two servers?",
  ],
  id: 2,
  lockedNodeIds: ["users-1"],
  objectiveText: "Build a stable Users → Server → DB path that survives the traffic spike.",
  revenueTarget: 1100,
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
  title: "Over Capacity",
  trafficSchedule: [
    { opsPerSec: 60, startTime: 0 },
    { opsPerSec: 110, startTime: 30 },
  ],
};

export { level2 };
