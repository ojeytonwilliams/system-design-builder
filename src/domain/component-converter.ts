import type { ComponentDefinition } from "./component-library";
import { convertDuration, convertRate } from "./sim-time-converter";

const convertComponent = (def: ComponentDefinition): ComponentDefinition => ({
  ...def,
  capacity: Number.isFinite(def.capacity) ? convertRate(def.capacity) : def.capacity,
  latencyMs: convertDuration(def.latencyMs),
});

const convertConnection = (def: { transitMs: number }): { transitMs: number } => ({
  transitMs: convertDuration(def.transitMs),
});

export { convertComponent, convertConnection };
