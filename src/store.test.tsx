import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { INITIAL_REVENUE, SimulationProvider, useSimulation } from "./store.js";
import type { TrafficSnapshot } from "./simulation/types.js";

const wrapper = ({ children }: { children: ReactNode }) => (
  <SimulationProvider>{children}</SimulationProvider>
);

const emptySnapshot: TrafficSnapshot = {};

describe("simulation store", () => {
  describe("initial state", () => {
    it("starts in DESIGN mode", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(result.current.mode).toBe("DESIGN");
    });

    it("starts with the initial revenue balance", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(result.current.revenue).toBe(INITIAL_REVENUE);
    });

    it("starts with empty node states", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(Object.keys(result.current.nodeStates)).toHaveLength(0);
    });
  });

  describe("startSimulation", () => {
    it("transitions to SIMULATE mode", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.startSimulation();
      });

      expect(result.current.mode).toBe("SIMULATE");
    });

    it("resets revenue to the initial balance", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(emptySnapshot, 100);
        result.current.startSimulation();
      });

      expect(result.current.revenue).toBe(INITIAL_REVENUE);
    });
  });

  describe("tick", () => {
    it("adds earned revenue to the balance", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(emptySnapshot, 10);
      });

      expect(result.current.revenue).toBe(INITIAL_REVENUE + 10);
    });

    it("accumulates revenue across multiple ticks", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(emptySnapshot, 10);
        result.current.tick(emptySnapshot, 10);
        result.current.tick(emptySnapshot, 10);
      });

      expect(result.current.revenue).toBe(INITIAL_REVENUE + 30);
    });

    it("updates node states with the provided snapshot", () => {
      const snapshot: TrafficSnapshot = {
        "server-1": { droppedOps: 0, handledOps: 50, incomingOps: 50 },
      };
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(snapshot, 5);
      });

      expect(result.current.nodeStates["server-1"]?.handledOps).toBe(50);
    });
  });

  describe("endSimulation", () => {
    it("returns to DESIGN mode", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.startSimulation();
        result.current.endSimulation();
      });

      expect(result.current.mode).toBe("DESIGN");
    });

    it("preserves the final revenue balance", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.startSimulation();
        result.current.tick(emptySnapshot, 25);
        result.current.endSimulation();
      });

      expect(result.current.revenue).toBe(INITIAL_REVENUE + 25);
    });
  });

  describe("useSimulation outside provider", () => {
    it("throws when used outside SimulationProvider", () => {
      // Suppress console.error from React's error boundary during test
      vi.spyOn(console, "error").mockReturnValue(undefined);

      expect(() => renderHook(() => useSimulation())).toThrow(
        "useSimulation must be used within a SimulationProvider",
      );
    });
  });
});
