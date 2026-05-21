import { useSyncExternalStore } from "react";
import type { SimulationEngine, SimulationSnapshot } from "../../simulation/simulation-engine.js";

const useSimulationSnapshot = (engine: SimulationEngine): SimulationSnapshot =>
  useSyncExternalStore(engine.subscribe, engine.getSnapshot);

export { useSimulationSnapshot };
