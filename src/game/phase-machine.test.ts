import { phaseReducer } from "./phase-machine.js";
import type { Phase } from "./phase-machine.js";

describe(phaseReducer, () => {
  describe("from DESIGN", () => {
    it("transitions to SIMULATING on START_SIMULATION", () => {
      expect(phaseReducer("DESIGN", { type: "START_SIMULATION" })).toBe("SIMULATING");
    });

    it("ignores STOP_SIMULATION", () => {
      expect(phaseReducer("DESIGN", { type: "STOP_SIMULATION" })).toBe("DESIGN");
    });

    it("ignores WIN", () => {
      expect(phaseReducer("DESIGN", { type: "WIN" })).toBe("DESIGN");
    });

    it("ignores TIMEOUT", () => {
      expect(phaseReducer("DESIGN", { type: "TIMEOUT" })).toBe("DESIGN");
    });
  });

  describe("from SIMULATING", () => {
    it("transitions to DESIGN on STOP_SIMULATION", () => {
      expect(phaseReducer("SIMULATING", { type: "STOP_SIMULATION" })).toBe("DESIGN");
    });

    it("transitions to WON on WIN", () => {
      expect(phaseReducer("SIMULATING", { type: "WIN" })).toBe("WON");
    });

    it("transitions to FAILED on TIMEOUT", () => {
      expect(phaseReducer("SIMULATING", { type: "TIMEOUT" })).toBe("FAILED");
    });

    it("ignores START_SIMULATION", () => {
      expect(phaseReducer("SIMULATING", { type: "START_SIMULATION" })).toBe("SIMULATING");
    });
  });

  describe("from WON", () => {
    it("transitions to DESIGN on LOAD_LEVEL", () => {
      expect(phaseReducer("WON", { type: "LOAD_LEVEL" })).toBe("DESIGN");
    });

    it("ignores WIN", () => {
      expect(phaseReducer("WON", { type: "WIN" })).toBe("WON");
    });

    it("ignores START_SIMULATION", () => {
      expect(phaseReducer("WON", { type: "START_SIMULATION" })).toBe("WON");
    });
  });

  describe("from FAILED", () => {
    it("transitions to DESIGN on LOAD_LEVEL", () => {
      expect(phaseReducer("FAILED", { type: "LOAD_LEVEL" })).toBe("DESIGN");
    });

    it("ignores TIMEOUT", () => {
      expect(phaseReducer("FAILED", { type: "TIMEOUT" })).toBe("FAILED");
    });

    it("ignores START_SIMULATION", () => {
      expect(phaseReducer("FAILED", { type: "START_SIMULATION" })).toBe("FAILED");
    });
  });

  describe("load_level action", () => {
    it("transitions to DESIGN from any phase", () => {
      const phases: Phase[] = ["DESIGN", "SIMULATING", "WON", "FAILED"];

      for (const phase of phases) {
        expect(phaseReducer(phase, { type: "LOAD_LEVEL" })).toBe("DESIGN");
      }
    });
  });
});
