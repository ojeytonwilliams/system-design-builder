import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SimulationProvider, useSimulation } from "./store.js";
import type { TrafficSnapshot } from "./simulation/types.js";

const wrapper = ({ children }: { children: ReactNode }) => (
  <SimulationProvider>{children}</SimulationProvider>
);

const emptySnapshot: TrafficSnapshot = {};

describe("simulation store", () => {
  describe("initial state", () => {
    it("starts with zero current traffic rate", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(result.current.currentTrafficRate).toBe(0);
    });

    it("starts with empty node states", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(Object.keys(result.current.nodeStates)).toHaveLength(0);
    });
  });

  describe("resetSimulation", () => {
    it("clears current traffic rate to zero", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(emptySnapshot, 50);
        result.current.resetSimulation();
      });

      expect(result.current.currentTrafficRate).toBe(0);
    });

    it("clears node states", () => {
      const snapshot: TrafficSnapshot = {
        "server-1": { droppedOps: 0, handledOps: 50, incomingOps: 50 },
      };
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(snapshot, 50);
        result.current.resetSimulation();
      });

      expect(Object.keys(result.current.nodeStates)).toHaveLength(0);
    });
  });

  describe("tick", () => {
    it("updates the current traffic rate", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(emptySnapshot, 80);
      });

      expect(result.current.currentTrafficRate).toBe(80);
    });

    it("replaces the previous traffic rate on each tick", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(emptySnapshot, 40);
        result.current.tick(emptySnapshot, 70);
      });

      expect(result.current.currentTrafficRate).toBe(70);
    });

    it("updates node states with the provided snapshot", () => {
      const snapshot: TrafficSnapshot = {
        "server-1": { droppedOps: 0, handledOps: 50, incomingOps: 50 },
      };
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(snapshot, 50);
      });

      expect(result.current.nodeStates["server-1"]?.handledOps).toBe(50);
    });

    it("preserves the final traffic rate until reset", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.tick(emptySnapshot, 90);
      });

      expect(result.current.currentTrafficRate).toBe(90);
    });
  });

  describe("useSimulation outside provider", () => {
    it("throws when used outside SimulationProvider", () => {
      vi.spyOn(console, "error").mockReturnValue(undefined);

      expect(() => renderHook(() => useSimulation())).toThrow(
        "useSimulation must be used within a SimulationProvider",
      );
    });
  });
});
