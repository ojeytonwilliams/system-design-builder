import { useEffect } from "react";
import type { SimulationEngine } from "../../simulation/simulation-engine.js";
import { SimulationLoop } from "../../simulation/simulation-loop.js";

interface UseSimulationTickParams {
  engine: SimulationEngine;
  isSimulating: boolean;
}

const useSimulationTick = ({ engine, isSimulating }: UseSimulationTickParams): void => {
  useEffect(() => {
    if (!isSimulating) {
      return;
    }

    engine.reset();
    const loop = new SimulationLoop((delta) => engine.tick(delta));
    loop.start();

    return () => {
      loop.stop();
    };
  }, [engine, isSimulating]);
};

export { useSimulationTick };
