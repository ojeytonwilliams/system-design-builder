type LevelStatus = "active" | "completed" | "locked";

interface LevelStripItem {
  id: number;
  title: string;
}

interface LevelStripProps {
  completedLevelIds: number[];
  currentLevelId: number;
  levels: LevelStripItem[];
  onSelectLevel: (id: number) => void;
}

const getLevelStatus = (
  levelId: number,
  currentLevelId: number,
  completedLevelIds: number[],
): LevelStatus => {
  if (completedLevelIds.includes(levelId)) {
    return "completed";
  }

  if (levelId === currentLevelId) {
    return "active";
  }

  return "locked";
};

const LevelStrip = ({
  completedLevelIds,
  currentLevelId,
  levels,
  onSelectLevel,
}: LevelStripProps) => (
  <nav
    aria-label="Level progression"
    style={{
      alignItems: "center",
      background: "#111e38",
      display: "flex",
      gap: "0.25rem",
      overflowX: "auto",
      padding: "0.4rem 1rem",
    }}
  >
    {levels.map((level) => {
      const status = getLevelStatus(level.id, currentLevelId, completedLevelIds);
      const isInteractive = status !== "locked";

      let background = "#1e2e54";
      let opacity = 1;
      let cursor = "pointer";

      if (status === "completed") {
        background = "#2d5a3d";
      } else if (status === "active") {
        background = "#3d4e7a";
      } else {
        background = "#1a2744";
        opacity = 0.45;
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
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "0.375rem",
            color: "#f5f5f0",
            cursor,
            flexShrink: 0,
            fontSize: "0.75rem",
            fontWeight: 600,
            opacity,
            padding: "0.3rem 0.6rem",
          }}
        >
          {level.id}
        </button>
      );
    })}
  </nav>
);

export { LevelStrip };
export type { LevelStatus, LevelStripItem, LevelStripProps };
