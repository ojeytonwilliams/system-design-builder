import type { SimulationMode } from "../simulation/types.js";

const INITIAL_BALANCE = 500;

interface TopBarProps {
  mode?: SimulationMode;
  onStartTraffic?: () => void;
  revenue?: number;
}

const TopBar = ({ mode = "DESIGN", onStartTraffic, revenue = INITIAL_BALANCE }: TopBarProps) => {
  const isSimulating = mode === "SIMULATE";
  let buttonLabel = "Start Traffic";
  let buttonBackground = "#e5634d";

  if (isSimulating) {
    buttonLabel = "Stop Traffic";
    buttonBackground = "#6b7280";
  }

  return (
    <header
      style={{
        alignItems: "center",
        background: "#1a2744",
        color: "#f5f5f0",
        display: "flex",
        justifyContent: "space-between",
        padding: "0.75rem 1.25rem",
      }}
    >
      <span style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "0.02em" }}>
        System Design Builder
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>${revenue.toFixed(2)}</span>
      <button
        onClick={onStartTraffic}
        type="button"
        style={{
          background: buttonBackground,
          border: "none",
          borderRadius: "0.375rem",
          color: "#f5f5f0",
          cursor: "pointer",
          fontWeight: 600,
          padding: "0.5rem 1.25rem",
        }}
      >
        {buttonLabel}
      </button>
    </header>
  );
};

export { TopBar };
export type { TopBarProps };
