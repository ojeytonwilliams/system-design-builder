import { LevelStrip } from "./level-strip.js";

interface TopBarProps {
  completedLevelIds?: string[];
  currentLevelId?: string;
  isSimulating?: boolean;
  objectiveText?: string;
  onSelectLevel?: (id: string) => void;
  onStartTraffic?: () => void;
  startTrafficDisabled?: boolean;
}

const TopBar = ({
  completedLevelIds = [],
  currentLevelId,
  isSimulating = false,
  objectiveText,
  onSelectLevel,
  onStartTraffic,
  startTrafficDisabled = false,
}: TopBarProps) => {
  const isButtonDisabled = startTrafficDisabled && !isSimulating;

  let btnBackground = "linear-gradient(135deg, #fde047, #f1be32 65%, #d99e10)";
  let btnBoxShadow = "0 10px 28px -10px rgba(241,190,50,.6), inset 0 1px 0 rgba(255,255,255,.45)";
  if (isButtonDisabled) {
    btnBackground = "rgba(59, 59, 79, 0.6)";
    btnBoxShadow = "none";
  } else if (isSimulating) {
    btnBackground = "linear-gradient(135deg, #fb7185, #f472b6)";
    btnBoxShadow = "0 10px 28px -10px rgba(251,113,133,.6), inset 0 1px 0 rgba(255,255,255,.2)";
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(42, 42, 64, 0.85), rgba(27, 27, 50, 0.85))",
        border: "1px solid rgba(59, 59, 79, 0.4)",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "18px 22px 22px",
      }}
    >
      {currentLevelId !== undefined && onSelectLevel !== undefined && (
        <LevelStrip
          completedLevelIds={completedLevelIds}
          currentLevelId={currentLevelId}
          onSelectLevel={onSelectLevel}
        />
      )}

      {objectiveText !== undefined && (
        <p
          style={{
            color: "#f5f6f7",
            fontSize: "17px",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {objectiveText}
        </p>
      )}

      <button
        disabled={isButtonDisabled}
        onClick={onStartTraffic}
        style={{
          alignItems: "center",
          alignSelf: "flex-start",
          background: btnBackground,
          border: "none",
          borderRadius: "999px",
          boxShadow: btnBoxShadow,
          color: "#0a0a23",
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
  );
};

export { TopBar };
