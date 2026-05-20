import { useEffect, useState } from "react";
import type { SimulationEngine } from "../simulation/simulation-engine.js";
import type { SimulationSnapshot } from "../simulation/simulation-store.js";

const useSimulationSnapshot = (engine: SimulationEngine): SimulationSnapshot => {
  const [snapshot, setSnapshot] = useState(() => engine.getSnapshot());

  useEffect(() => {
    setSnapshot(engine.getSnapshot());
    return engine.subscribe(() => {
      setSnapshot(engine.getSnapshot());
    });
  }, [engine]);

  return snapshot;
};

export { useSimulationSnapshot };
