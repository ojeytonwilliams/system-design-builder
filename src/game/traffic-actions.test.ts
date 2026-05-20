import type { PhaseAction } from "./phase-machine.js";
import { toggleTraffic, winLevel } from "./traffic-actions.js";

describe(toggleTraffic, () => {
  it("dispatches STOP_SIMULATION when simulating", () => {
    const dispatchPhase = vi.fn<(action: PhaseAction) => void>();
    toggleTraffic("SIMULATING", true, dispatchPhase);
    expect(dispatchPhase).toHaveBeenCalledWith({ type: "STOP_SIMULATION" });
  });

  it("dispatches START_SIMULATION when not simulating and runnable", () => {
    const dispatchPhase = vi.fn<(action: PhaseAction) => void>();
    toggleTraffic("DESIGN", true, dispatchPhase);
    expect(dispatchPhase).toHaveBeenCalledWith({ type: "START_SIMULATION" });
  });

  it("does nothing when not simulating and not runnable", () => {
    const dispatchPhase = vi.fn<(action: PhaseAction) => void>();
    toggleTraffic("DESIGN", false, dispatchPhase);
    expect(dispatchPhase).not.toHaveBeenCalled();
  });
});

describe(winLevel, () => {
  it("dispatches WIN and marks the level complete", () => {
    const dispatchPhase = vi.fn<(action: PhaseAction) => void>();
    const markLevelComplete = vi.fn<(levelId: string) => void>();
    winLevel("level-1", dispatchPhase, markLevelComplete);
    expect(dispatchPhase).toHaveBeenCalledWith({ type: "WIN" });
    expect(markLevelComplete).toHaveBeenCalledWith("level-1");
  });
});
