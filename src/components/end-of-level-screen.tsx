const STAR_FILLED = "★";
const STAR_EMPTY = "☆";
const THREE_STAR_THRESHOLD = 0.5;
const TWO_STAR_THRESHOLD = 0.2;

interface EndOfLevelScreenProps {
  feedbackLines: string[];
  monthlyBudget: number;
  onContinue: () => void;
  onReplay: () => void;
  remainingBudget: number;
  title: string;
}

const computeStars = (remainingBudget: number, monthlyBudget: number): 1 | 2 | 3 => {
  const headroom = monthlyBudget > 0 ? remainingBudget / monthlyBudget : 0;

  if (headroom >= THREE_STAR_THRESHOLD) {
    return 3;
  }

  if (headroom >= TWO_STAR_THRESHOLD) {
    return 2;
  }

  return 1;
};

const buildStarRow = (stars: 1 | 2 | 3): string => {
  if (stars === 3) {
    return `${STAR_FILLED}${STAR_FILLED}${STAR_FILLED}`;
  }

  if (stars === 2) {
    return `${STAR_FILLED}${STAR_FILLED}${STAR_EMPTY}`;
  }

  return `${STAR_FILLED}${STAR_EMPTY}${STAR_EMPTY}`;
};

const StarRow = ({ stars }: { stars: 1 | 2 | 3 }) => {
  const row = buildStarRow(stars);

  return (
    <p
      aria-label={`${stars} out of 3 stars`}
      style={{ fontSize: "2rem", letterSpacing: "0.15em", margin: "0.5rem 0" }}
    >
      {row}
    </p>
  );
};

const EndOfLevelScreen = ({
  feedbackLines,
  monthlyBudget,
  onContinue,
  onReplay,
  remainingBudget,
  title,
}: EndOfLevelScreenProps) => {
  const stars = computeStars(remainingBudget, monthlyBudget);

  return (
    <div
      style={{
        alignItems: "center",
        background: "rgba(26, 39, 68, 0.72)",
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        left: 0,
        position: "fixed",
        right: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "#fafaf7",
          borderRadius: "1.25rem",
          boxShadow: "0 24px 64px rgba(26, 39, 68, 0.28)",
          maxWidth: "26rem",
          padding: "2rem 2.5rem",
          textAlign: "center",
          width: "90vw",
        }}
      >
        <h2
          style={{
            color: "#1a2744",
            fontSize: "0.75rem",
            letterSpacing: "0.1em",
            margin: "0 0 0.25rem",
            textTransform: "uppercase",
          }}
        >
          Level Complete
        </h2>
        <p
          style={{
            color: "#1a2744",
            fontSize: "1.375rem",
            fontWeight: 700,
            margin: "0 0 0.25rem",
          }}
        >
          {title}
        </p>
        <StarRow stars={stars} />
        <p style={{ color: "#4f5b6b", fontSize: "0.875rem", margin: "0.5rem 0 1.25rem" }}>
          Budget remaining: <strong>${remainingBudget}</strong> / ${monthlyBudget}/mo
        </p>
        <div
          style={{
            borderTop: "1px solid #e8e6de",
            marginBottom: "1.5rem",
            paddingTop: "1rem",
            textAlign: "left",
          }}
        >
          {feedbackLines.map((line) => (
            <p
              key={line}
              style={{
                color: "#2e3a52",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                margin: "0 0 0.4rem",
              }}
            >
              {line}
            </p>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={onReplay}
            style={{
              background: "transparent",
              border: "2px solid #1a2744",
              borderRadius: "0.625rem",
              color: "#1a2744",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              padding: "0.6rem 1.25rem",
            }}
            type="button"
          >
            Replay
          </button>
          <button
            onClick={onContinue}
            style={{
              background: "#1a2744",
              border: "none",
              borderRadius: "0.625rem",
              color: "#f5f5f0",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              padding: "0.6rem 1.25rem",
            }}
            type="button"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export { EndOfLevelScreen };
export type { EndOfLevelScreenProps };
