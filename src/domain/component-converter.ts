import type { ComponentDefinition } from "./component-library";
import { convertDuration } from "./sim-time-converter";

const convertComponent = (def: ComponentDefinition): ComponentDefinition => ({
  ...def,
  latencyMs: convertDuration(def.latencyMs),
});

const convertConnection = (def: { transitMs: number }): { transitMs: number } => ({
  transitMs: convertDuration(def.transitMs),
});

export { convertComponent, convertConnection };
