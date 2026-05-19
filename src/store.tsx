import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import type { TrafficSnapshot } from "./simulation/types.js";

interface SimulationState {
  currentTrafficRate: number;
  nodeStates: TrafficSnapshot;
}

interface SimulationContextValue extends SimulationState {
  resetSimulation: () => void;
  tick: (snapshot: TrafficSnapshot, trafficRate: number) => void;
}

type Action = { type: "RESET" } | { snapshot: TrafficSnapshot; trafficRate: number; type: "TICK" };

const initialState: SimulationState = {
  currentTrafficRate: 0,
  nodeStates: {},
};

const reducer = (state: SimulationState, action: Action): SimulationState => {
  switch (action.type) {
    case "RESET":
      return { currentTrafficRate: 0, nodeStates: {} };
    case "TICK":
      return {
        ...state,
        currentTrafficRate: action.trafficRate,
        nodeStates: action.snapshot,
      };
  }
};

const SimulationContext = createContext<SimulationContextValue | undefined>(undefined);

const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const resetSimulation = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const tick = useCallback((snapshot: TrafficSnapshot, trafficRate: number) => {
    dispatch({ snapshot, trafficRate, type: "TICK" });
  }, []);

  const value = useMemo<SimulationContextValue>(
    () => ({
      ...state,
      resetSimulation,
      tick,
    }),
    [state, resetSimulation, tick],
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
