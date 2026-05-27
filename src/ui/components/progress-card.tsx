import { levelRegistry } from "../../levels/index.js";
import { LevelStrip } from "./level-strip.js";

interface ProgressCardProps {
  completedLevelIds: string[];
  currentLevelId: string;
  monthlyBudget: number;
  onSelectLevel: (id: string) => void;
  totalMonthlyCost: number;
}

const ProgressCard = ({
  completedLevelIds,
  currentLevelId,
  monthlyBudget,
  onSelectLevel,
  totalMonthlyCost,
}: ProgressCardProps) => {
  const currentLevelNumber = levelRegistry.getLevelNumber(currentLevelId);
  const totalLevels = levelRegistry.levels.length;
  const budgetPercent = Math.min(100, (totalMonthlyCost / monthlyBudget) * 100);

  return (
    <div
      style={{
        background: "oklch(0.21 0.022 268 / 0.78)",
        border: "1px solid oklch(0.36 0.022 272 / 0.32)",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "14px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          color: "oklch(0.58 0.022 252)",
          display: "flex",
          fontSize: "11px",
          fontWeight: 600,
          justifyContent: "space-between",
          letterSpacing: "0.11em",
          textTransform: "uppercase",
        }}
      >
        <span>Progress</span>
        <span>
          Level {currentLevelNumber} / {totalLevels}
        </span>
      </div>

      <LevelStrip
        completedLevelIds={completedLevelIds}
        currentLevelId={currentLevelId}
        onSelectLevel={onSelectLevel}
      />

      <div>
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              color: "oklch(0.58 0.022 252)",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Monthly budget
          </span>
          <span style={{ fontFamily: "'Hack', ui-monospace, monospace", fontSize: "13px" }}>
            <span style={{ color: "oklch(0.96 0.01 250)", fontWeight: 600 }}>
              ${totalMonthlyCost}
            </span>
            <span style={{ color: "oklch(0.58 0.022 252)" }}> / ${monthlyBudget}</span>
          </span>
        </div>
        <div
          style={{
            background: "oklch(0.3 0.02 270 / 0.6)",
            borderRadius: "3px",
            height: "5px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "linear-gradient(90deg, #22d3ee, #a78bfa)",
              borderRadius: "3px",
              height: "100%",
              transition: "width 0.3s ease",
              width: `${budgetPercent}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export { ProgressCard };
