import { convertRate } from "../domain/sim-time-converter";
import type { LevelDefinition } from "./types";

export const convertLevel = (def: LevelDefinition): LevelDefinition => ({
  ...def,
  trafficPeak: convertRate(def.trafficPeak),
  trafficStart: convertRate(def.trafficStart),
  trafficTarget: convertRate(def.trafficTarget),
});
