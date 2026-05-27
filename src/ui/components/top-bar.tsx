interface TopBarProps {
  currentReqPerSec?: number;
  isSimulating?: boolean;
  levelNumber?: number;
  levelTitle?: string;
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
  isSimulating = false,
  levelNumber,
  levelTitle,
  monthlyBudget,
  objectiveText,
  onStartTraffic,
  remainingBudget: _remainingBudget,
  startTrafficDisabled = false,
  totalMonthlyCost,
  trafficTarget,
}: TopBarProps) => {
  const isButtonDisabled = startTrafficDisabled && !isSimulating;

  let btnBackground = "linear-gradient(135deg, #fde047, #f1be32 65%, #d99e10)";
  let btnBoxShadow = "0 10px 28px -10px rgba(241,190,50,.6), inset 0 1px 0 rgba(255,255,255,.45)";
  if (isButtonDisabled) {
    btnBackground = "oklch(0.28 0.02 270 / 0.6)";
    btnBoxShadow = "none";
  } else if (isSimulating) {
    btnBackground = "linear-gradient(135deg, #fb7185, #f472b6)";
    btnBoxShadow = "0 10px 28px -10px rgba(251,113,133,.6), inset 0 1px 0 rgba(255,255,255,.2)";
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, oklch(0.22 0.035 250 / 0.85), oklch(0.2 0.028 280 / 0.85))",
        border: "1px solid oklch(0.36 0.022 272 / 0.32)",
        borderRadius: "16px",
        display: "grid",
        gap: "16px",
        gridTemplateColumns: "44px 1fr",
        padding: "18px 22px 22px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
          borderRadius: "12px",
          boxShadow: "0 6px 18px -10px rgba(167,139,250,.5)",
          color: "oklch(0.14 0.02 260)",
          display: "grid",
          flexShrink: 0,
          height: "44px",
          placeItems: "center",
          width: "44px",
        }}
      >
        <svg aria-hidden="true" fill="currentColor" height="22" viewBox="0 0 24 24" width="22">
          <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
        </svg>
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: "#22d3ee",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            marginBottom: "6px",
            textTransform: "uppercase",
          }}
        >
          Mission
          {levelNumber !== undefined && ` · Level ${levelNumber}`}
          {levelTitle !== undefined && (
            <span
              style={{
                color: "oklch(0.58 0.022 252)",
                fontWeight: 400,
                letterSpacing: "0.04em",
                marginLeft: "8px",
                textTransform: "none",
              }}
            >
              {levelTitle}
            </span>
          )}
        </div>

        {objectiveText !== undefined && (
          <p
            style={{
              color: "oklch(0.96 0.01 250)",
              fontSize: "14px",
              lineHeight: 1.55,
              margin: "0 0 14px",
            }}
          >
            {objectiveText}
          </p>
        )}

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span
            data-testid="current-req-per-sec"
            style={{
              background: "oklch(0.22 0.024 270 / 0.6)",
              border: "1px solid oklch(0.36 0.022 272 / 0.32)",
              borderRadius: "6px",
              color: "oklch(0.78 0.018 252)",
              fontFamily: "'Hack', ui-monospace, monospace",
              fontSize: "11px",
              padding: "2px 8px",
            }}
          >
            {Math.round(currentReqPerSec)} req/s
          </span>

          {trafficTarget !== undefined && (
            <span
              data-testid="traffic-target"
              style={{
                background: "oklch(0.22 0.024 270 / 0.6)",
                border: "1px solid oklch(0.36 0.022 272 / 0.32)",
                borderRadius: "6px",
                color: "oklch(0.78 0.018 252)",
                fontFamily: "'Hack', ui-monospace, monospace",
                fontSize: "11px",
                padding: "2px 8px",
              }}
            >
              Target: {trafficTarget} req/s
            </span>
          )}

          {monthlyBudget !== undefined && (
            <span
              data-testid="budget-display"
              style={{
                background: "oklch(0.22 0.024 270 / 0.6)",
                border: "1px solid oklch(0.36 0.022 272 / 0.32)",
                borderRadius: "6px",
                color: "oklch(0.78 0.018 252)",
                fontFamily: "'Hack', ui-monospace, monospace",
                fontSize: "11px",
                padding: "2px 8px",
              }}
            >
              ${totalMonthlyCost ?? 0} / ${monthlyBudget}/mo
            </span>
          )}
        </div>

        <button
          disabled={isButtonDisabled}
          onClick={onStartTraffic}
          style={{
            alignItems: "center",
            background: btnBackground,
            border: "none",
            borderRadius: "999px",
            boxShadow: btnBoxShadow,
            color: isSimulating ? "oklch(0.14 0.02 260)" : "oklch(0.22 0.05 80)",
            cursor: isButtonDisabled ? "not-allowed" : "pointer",
            display: "inline-flex",
            fontSize: "13.5px",
            fontWeight: 600,
            gap: "8px",
            opacity: isButtonDisabled ? 0.5 : 1,
            padding: "11px 22px",
          }}
          type="button"
        >
          {isSimulating ? "⏹ Stop Traffic" : "▶ Start Traffic"}
        </button>
      </div>
    </div>
  );
};

export { TopBar };
