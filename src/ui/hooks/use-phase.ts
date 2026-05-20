import { useReducer } from "react";
import { phaseReducer } from "../../game/phase-machine.js";
import type { Phase, PhaseAction } from "../../game/phase-machine.js";

const usePhase = (): [Phase, (action: PhaseAction) => void] => useReducer(phaseReducer, "DESIGN");

export { usePhase };
