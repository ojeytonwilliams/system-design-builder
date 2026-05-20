import type { Phase, PhaseAction } from "./phase-machine.js";

const toggleTraffic = (
  phase: Phase,
  isRunnable: boolean,
  dispatchPhase: (action: PhaseAction) => void,
): void => {
  if (phase === "SIMULATING") {
    dispatchPhase({ type: "STOP_SIMULATION" });
  } else if (isRunnable) {
    dispatchPhase({ type: "START_SIMULATION" });
  }
};

const winLevel = (
  currentLevelId: string,
  dispatchPhase: (action: PhaseAction) => void,
  markLevelComplete: (levelId: string) => void,
): void => {
  dispatchPhase({ type: "WIN" });
  markLevelComplete(currentLevelId);
};

export { toggleTraffic, winLevel };
