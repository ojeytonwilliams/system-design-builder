import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import type { SimulationMode, TrafficSnapshot } from "./simulation/types.js";

const INITIAL_REVENUE = 500;

interface SimulationState {
  mode: SimulationMode;
  nodeStates: TrafficSnapshot;
  revenue: number;
}

interface SimulationContextValue extends SimulationState {
  endSimulation: () => void;
  startSimulation: () => void;
  tick: (snapshot: TrafficSnapshot, earned: number) => void;
}

type Action =
  | { type: "END_SIMULATION" }
  | { earned: number; snapshot: TrafficSnapshot; type: "TICK" }
  | { type: "START_SIMULATION" };

const initialState: SimulationState = {
  mode: "DESIGN",
  nodeStates: {},
  revenue: INITIAL_REVENUE,
};

const reducer = (state: SimulationState, action: Action): SimulationState => {
  switch (action.type) {
    case "START_SIMULATION":
      return { mode: "SIMULATE", nodeStates: {}, revenue: INITIAL_REVENUE };
    case "TICK":
      return {
        ...state,
        nodeStates: action.snapshot,
        revenue: state.revenue + action.earned,
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

  const tick = useCallback((snapshot: TrafficSnapshot, earned: number) => {
    dispatch({ earned, snapshot, type: "TICK" });
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

export { INITIAL_REVENUE, SimulationProvider, useSimulation };
export type { SimulationContextValue, SimulationState };
