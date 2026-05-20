import { useEffect, useState } from "react";
import { simulationEngine } from "../simulation/simulation-engine.js";
import type { SimulationSnapshot } from "../simulation/simulation-store.js";

const useSimulationSnapshot = (): SimulationSnapshot => {
  const [snapshot, setSnapshot] = useState(() => simulationEngine.getSnapshot());

  useEffect(() => {
    setSnapshot(simulationEngine.getSnapshot());
    return simulationEngine.subscribe(() => {
      setSnapshot(simulationEngine.getSnapshot());
    });
  }, []);

  return snapshot;
};

export { useSimulationSnapshot };
