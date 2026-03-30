import type { LevelDefinition } from "./types.js";

const level5: LevelDefinition = {
  availableComponents: ["users", "server", "load-balancer", "db"],
  cacheHitRate: 0,
  coachMessages: [
    {
      atSecond: 5,
      text: "Your servers can handle this traffic — but watch the database when volume picks up.",
    },
    {
      atSecond: 27,
      text: "The database is now the bottleneck. It can only handle 100 ops/s regardless of how many servers you add.",
    },
    {
      atSecond: 52,
      text: "At 320 ops/s, over two thirds of DB requests are being dropped. A cache could absorb many of these reads.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "The database was the weakest link. Servers scaled, but the DB maxed out at 100 ops/s.",
    "You've unlocked a Cache — next level you'll use it to offload database reads.",
  ],
  id: 5,
  revenueTarget: 1700,
  timeout: 90,
  title: "Database Bottleneck",
  trafficSchedule: [
    { opsPerSec: 80, startTime: 0 },
    { opsPerSec: 200, startTime: 25 },
    { opsPerSec: 320, startTime: 50 },
  ],
};

export { level5 };
