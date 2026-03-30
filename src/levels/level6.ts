import type { LevelDefinition } from "./types.js";

const level6: LevelDefinition = {
  availableComponents: ["users", "server", "load-balancer", "db", "cache"],
  cacheHitRate: 0.7,
  coachMessages: [
    {
      atSecond: 4,
      text: "Place a Cache between your servers and the database. 70% of reads are cache hits.",
    },
    {
      atSecond: 27,
      text: "With the cache in place, only 30% of reads reach the database — well within its 100 ops/s limit.",
    },
    {
      atSecond: 52,
      text: "400 ops/s! The cache is absorbing 280 ops/s so the database only sees 120.",
    },
  ],
  componentUnlocks: [],
  feedbackText: [
    "Excellent! The cache absorbed 70% of reads, letting your database breathe.",
    "This pattern — read offloading — is one of the most common optimisations in real systems.",
  ],
  id: 6,
  revenueTarget: 1900,
  timeout: 90,
  title: "Read Offloading",
  trafficSchedule: [
    { opsPerSec: 100, startTime: 0 },
    { opsPerSec: 250, startTime: 25 },
    { opsPerSec: 400, startTime: 50 },
  ],
};

export { level6 };
