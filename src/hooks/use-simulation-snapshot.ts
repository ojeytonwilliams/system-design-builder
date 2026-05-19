import { useSyncExternalStore } from "react";
import { simulationStore } from "../simulation/simulation-store.js";
import type { SimulationSnapshot } from "../simulation/simulation-store.js";

const useSimulationSnapshot = (): SimulationSnapshot =>
  useSyncExternalStore(simulationStore.subscribe, simulationStore.getSnapshot);

export { useSimulationSnapshot };
