import type { SimulationMode } from "../simulation/types.js";

interface TopBarProps {
  currentReqPerSec?: number;
  levelNumber?: number;
  levelTitle?: string;
  mode?: SimulationMode;
  monthlyBudget?: number;
  objectiveText?: string;
  onStartTraffic?: () => void;
  remainingBudget?: number;
  startTrafficDisabled?: boolean;
  totalMonthlyCost?: number;
  trafficTarget?: number;
}

const TopBar = ({
  currentReqPerSec = 0,
  levelNumber,
  levelTitle,
  mode = "DESIGN",
  monthlyBudget,
  objectiveText,
  onStartTraffic,
  remainingBudget: _remainingBudget,
  startTrafficDisabled = false,
  totalMonthlyCost,
  trafficTarget,
}: TopBarProps) => {
  const isSimulating = mode === "SIMULATE";
  let buttonLabel = "Start Traffic";
  let buttonBackground = "#e5634d";

  if (isSimulating) {
    buttonLabel = "Stop Traffic";
    buttonBackground = "#6b7280";
  }

  const isButtonDisabled = startTrafficDisabled && !isSimulating;

  return (
    <header
      style={{
        background: "#1a2744",
        color: "#f5f5f0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          justifyContent: "space-between",
          padding: "0.75rem 1.25rem",
        }}
      >
        <span style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "0.02em" }}>
          {levelNumber !== undefined && levelTitle !== undefined
            ? `Level ${levelNumber}: ${levelTitle}`
            : "System Design Builder"}
        </span>

        <span
          data-testid="current-req-per-sec"
          style={{ fontSize: "1.1rem", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
        >
          {Math.round(currentReqPerSec)} req/s
        </span>

        {trafficTarget !== undefined && (
          <span data-testid="traffic-target" style={{ fontSize: "0.85rem", opacity: 0.75 }}>
            Target: {trafficTarget} req/s
          </span>
        )}

        {monthlyBudget !== undefined && (
          <span
            data-testid="budget-display"
            style={{ fontSize: "0.85rem", fontVariantNumeric: "tabular-nums", opacity: 0.9 }}
          >
            {totalMonthlyCost === undefined ? "?" : `$${totalMonthlyCost}`}/${`$${monthlyBudget}`}
            /mo
          </span>
        )}

        <button
          disabled={isButtonDisabled}
          onClick={onStartTraffic}
          type="button"
          style={{
            background: isButtonDisabled ? "#9ca3af" : buttonBackground,
            border: "none",
            borderRadius: "0.375rem",
            color: "#f5f5f0",
            cursor: isButtonDisabled ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: isButtonDisabled ? 0.6 : 1,
            padding: "0.5rem 1.25rem",
          }}
        >
          {buttonLabel}
        </button>
      </div>
      {objectiveText !== undefined && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: "0.8rem",
            opacity: 0.8,
            padding: "0.4rem 1.25rem",
          }}
        >
          {objectiveText}
        </div>
      )}
    </header>
  );
};

export { TopBar };
export type { TopBarProps };
