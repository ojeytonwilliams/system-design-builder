import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import type { SimulationMode, TrafficSnapshot } from "./simulation/types.js";

interface SimulationState {
  currentTrafficRate: number;
  mode: SimulationMode;
  nodeStates: TrafficSnapshot;
}

interface SimulationContextValue extends SimulationState {
  endSimulation: () => void;
  startSimulation: () => void;
  tick: (snapshot: TrafficSnapshot, trafficRate: number) => void;
}

type Action =
  | { type: "END_SIMULATION" }
  | { snapshot: TrafficSnapshot; trafficRate: number; type: "TICK" }
  | { type: "START_SIMULATION" };

const initialState: SimulationState = {
  currentTrafficRate: 0,
  mode: "DESIGN",
  nodeStates: {},
};

const reducer = (state: SimulationState, action: Action): SimulationState => {
  switch (action.type) {
    case "START_SIMULATION":
      return { currentTrafficRate: 0, mode: "SIMULATE", nodeStates: {} };
    case "TICK":
      return {
        ...state,
        currentTrafficRate: action.trafficRate,
        nodeStates: action.snapshot,
      };
    case "END_SIMULATION":
      return { ...state, mode: "DESIGN" };
  }
};

const SimulationContext = createContext<SimulationContextValue | undefined>(undefined);

const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startSimulation = useCallback(() => {
    dispatch({ type: "START_SIMULATION" });
  }, []);

  const endSimulation = useCallback(() => {
    dispatch({ type: "END_SIMULATION" });
  }, []);

  const tick = useCallback((snapshot: TrafficSnapshot, trafficRate: number) => {
    dispatch({ snapshot, trafficRate, type: "TICK" });
  }, []);

  const value = useMemo<SimulationContextValue>(
    () => ({
      ...state,
      endSimulation,
      startSimulation,
      tick,
    }),
    [state, endSimulation, startSimulation, tick],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

const useSimulation = (): SimulationContextValue => {
  const ctx = useContext(SimulationContext);

  if (ctx === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }

  return ctx;
};

export { SimulationProvider, useSimulation };
export type { SimulationContextValue, SimulationState };
