import type { ComponentType } from "../components/component-library.js";
import type { TrafficScheduleEntry } from "../simulation/types.js";

interface CapacityReachedTrigger {
  type: "CAPACITY_REACHED";
}

interface LevelCompleteTrigger {
  type: "LEVEL_COMPLETE";
}

interface OverloadSustainedTrigger {
  durationSeconds: number;
  type: "OVERLOAD_SUSTAINED";
}

interface ServersPlacedTrigger {
  count: number;
  type: "SERVERS_PLACED";
}

type UnlockTrigger =
  | CapacityReachedTrigger
  | LevelCompleteTrigger
  | OverloadSustainedTrigger
  | ServersPlacedTrigger;

interface CoachMessage {
  atSecond: number;
  text: string;
}

interface ComponentUnlock {
  components: ComponentType[];
  trigger: UnlockTrigger;
}

interface LevelDefinition {
  availableComponents: ComponentType[];
  cacheHitRate: number;
  coachMessages: CoachMessage[];
  componentUnlocks: ComponentUnlock[];
  feedbackText: string[];
  id: number;
  revenueTarget: number;
  timeout: number;
  title: string;
  trafficSchedule: TrafficScheduleEntry[];
}

export type {
  CapacityReachedTrigger,
  CoachMessage,
  ComponentUnlock,
  LevelCompleteTrigger,
  LevelDefinition,
  OverloadSustainedTrigger,
  ServersPlacedTrigger,
  UnlockTrigger,
};
