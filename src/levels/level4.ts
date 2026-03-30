import type { LevelDefinition } from "./types.js";

const level4: LevelDefinition = {
  availableComponents: ["users", "server", "load-balancer", "db"],
  cacheHitRate: 0,
  coachMessages: [
    {
      atSecond: 4,
      text: "Place a Load Balancer between Users and your servers so traffic is shared evenly.",
    },
    {
      atSecond: 27,
      text: "Traffic doubled! Make sure both servers are receiving roughly equal load.",
    },
    {
      atSecond: 51,
      text: "300 ops/s! Your load balancer is splitting this perfectly across two servers.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "The Load Balancer distributed traffic evenly, keeping both servers in the green.",
    "But notice: all those requests still hit the database. What happens when it can't keep up?",
  ],
  id: 4,
  lockedNodeIds: ["users-1"],
  objectiveText: "Place a Load Balancer and route traffic evenly across your servers.",
  revenueTarget: 1800,
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
  title: "Balance the Load",
  trafficSchedule: [
    { opsPerSec: 100, startTime: 0 },
    { opsPerSec: 200, startTime: 25 },
    { opsPerSec: 300, startTime: 50 },
  ],
};

export { level4 };
