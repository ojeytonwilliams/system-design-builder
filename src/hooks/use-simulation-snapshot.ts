import { useSyncExternalStore } from "react";
import type { SimulationEngine } from "../simulation/simulation-engine.js";
import type { SimulationSnapshot } from "../simulation/simulation-store.js";

const useSimulationSnapshot = (engine: SimulationEngine): SimulationSnapshot =>
  useSyncExternalStore(engine.subscribe, engine.getSnapshot);

export { useSimulationSnapshot };
