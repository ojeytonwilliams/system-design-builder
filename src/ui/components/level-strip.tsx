import { levelRegistry } from "../../levels/index.js";

type LevelStatus = "active" | "completed" | "locked";

interface LevelStripProps {
  completedLevelIds: string[];
  currentLevelId: string;
  onSelectLevel: (id: string) => void;
}

const getLevelStatus = (
  levelId: string,
  currentLevelId: string,
  completedLevelIds: string[],
): LevelStatus => {
  if (completedLevelIds.includes(levelId)) {
    return "completed";
  }

  if (levelId === currentLevelId) {
    return "active";
  }

  return levelRegistry.isLevelUnlocked(levelId, completedLevelIds) ? "active" : "locked";
};

const LevelStrip = ({ completedLevelIds, currentLevelId, onSelectLevel }: LevelStripProps) => (
  <nav
    aria-label="Level progression"
    style={{
      alignItems: "center",
      display: "flex",
      gap: "6px",
      overflowX: "auto",
    }}
  >
    {levelRegistry.levels.map((level) => {
      const status = getLevelStatus(level.id, currentLevelId, completedLevelIds);
      const isInteractive = status !== "locked";

      let background = "oklch(0.22 0.02 270 / 0.6)";
      let borderColor = "oklch(0.36 0.022 272 / 0.55)";
      let color = "oklch(0.58 0.022 252)";
      let opacity = 1;
      let cursor = "pointer";
      let boxShadow = "none";

      if (status === "completed") {
        background =
          "linear-gradient(135deg, oklch(0.5 0.13 160 / 0.25), oklch(0.45 0.1 200 / 0.25))";
        borderColor = "oklch(0.6 0.13 160 / 0.5)";
        color = "#a3e635";
      } else if (status === "active") {
        background = "linear-gradient(135deg, #22d3ee, #a78bfa)";
        borderColor = "transparent";
        color = "oklch(0.14 0.02 260)";
        boxShadow = "0 4px 12px -4px rgba(167,139,250,.5)";
      } else {
        opacity = 0.35;
        cursor = "not-allowed";
      }

      return (
        <button
          key={level.id}
          data-status={status}
          data-testid={`level-strip-level-${level.id}`}
          disabled={!isInteractive}
          onClick={
            isInteractive
              ? () => {
                  onSelectLevel(level.id);
                }
              : undefined
          }
          title={level.title}
          type="button"
          style={{
            background,
            border: `1px solid ${borderColor}`,
            borderRadius: "8px",
            boxShadow,
            color,
            cursor,
            flexShrink: 0,
            fontSize: "12px",
            fontWeight: 600,
            height: "30px",
            minWidth: "36px",
            opacity,
            padding: "0 10px",
          }}
        >
          {levelRegistry.getLevelNumber(level.id)}
        </button>
      );
    })}
  </nav>
);

export { LevelStrip };
