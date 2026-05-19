type Phase = "DESIGN" | "FAILED" | "SIMULATING" | "WON";

type PhaseAction =
  | { type: "LOAD_LEVEL" }
  | { type: "START_SIMULATION" }
  | { type: "STOP_SIMULATION" }
  | { type: "TIMEOUT" }
  | { type: "WIN" };

const phaseReducer = (phase: Phase, action: PhaseAction): Phase => {
  if (action.type === "LOAD_LEVEL") {
    return "DESIGN";
  }

  switch (phase) {
    case "DESIGN":
      return action.type === "START_SIMULATION" ? "SIMULATING" : phase;
    case "SIMULATING":
      if (action.type === "STOP_SIMULATION") {
        return "DESIGN";
      }
      if (action.type === "WIN") {
        return "WON";
      }
      if (action.type === "TIMEOUT") {
        return "FAILED";
      }
      return phase;
    case "WON":
    case "FAILED":
      return phase;
  }
};

export type { Phase, PhaseAction };
export { phaseReducer };
