import type { SimulationMode } from "../simulation/types.js";

const INITIAL_BALANCE = 500;

interface TopBarProps {
  levelNumber?: number;
  levelTitle?: string;
  mode?: SimulationMode;
  objectiveText?: string;
  onStartTraffic?: () => void;
  revenue?: number;
  revenueTarget?: number;
  startTrafficDisabled?: boolean;
}

const TopBar = ({
  levelNumber,
  levelTitle,
  mode = "DESIGN",
  objectiveText,
  onStartTraffic,
  revenue = INITIAL_BALANCE,
  revenueTarget,
  startTrafficDisabled = false,
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
          justifyContent: "space-between",
          padding: "0.75rem 1.25rem",
        }}
      >
        <span style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "0.02em" }}>
          {levelNumber !== undefined && levelTitle !== undefined
            ? `Level ${levelNumber}: ${levelTitle}`
            : "System Design Builder"}
        </span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>${revenue.toFixed(2)}</span>
        {revenueTarget !== undefined && (
          <span data-testid="revenue-target" style={{ fontSize: "0.85rem", opacity: 0.75 }}>
            Target: ${revenueTarget.toFixed(0)}
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
