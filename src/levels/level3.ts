import type { LevelDefinition } from "./types.js";

const level3: LevelDefinition = {
  availableComponents: ["users", "server", "db"],
  cacheHitRate: 0,
  coachMessages: [
    {
      atSecond: 5,
      text: "Traffic will soon exceed one server's capacity. Try adding a second server.",
    },
    {
      atSecond: 22,
      text: "Your server is already at capacity. A second server would share this load.",
    },
    { atSecond: 46, text: "Traffic is now at 250 ops/s — you need both servers to keep up." },
  ],
  componentUnlocks: [
    {
      components: ["load-balancer"],
      trigger: { count: 2, type: "SERVERS_PLACED" },
    },
  ],
  feedbackText: [
    "Two servers doubled your capacity.",
    "Notice that a Load Balancer just appeared in your palette — you unlocked it by placing two servers.",
  ],
  id: 3,
  lockedNodeIds: ["users-1"],
  objectiveText: "Scale out by adding a second server before traffic overwhelms one machine.",
  revenueTarget: 1500,
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
  title: "Add Another Server",
  trafficSchedule: [
    { opsPerSec: 80, startTime: 0 },
    { opsPerSec: 150, startTime: 20 },
    { opsPerSec: 250, startTime: 45 },
  ],
};

export { level3 };
