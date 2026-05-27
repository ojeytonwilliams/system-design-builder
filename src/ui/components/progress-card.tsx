import { useEffect, useRef, useState } from "react";

const CX = 100;
const CY = 100;
const RADIUS = 80;
const START_DEG = 135;
const SWEEP_DEG = 270;
const STROKE_W = 14;

const COST_LERP = 0.08;

const toRad = (deg: number) => (deg * Math.PI) / 180;

const polarToXY = (deg: number) => ({
  x: CX + RADIUS * Math.cos(toRad(deg)),
  y: CY + RADIUS * Math.sin(toRad(deg)),
});

const arcPath = (fromDeg: number, toDeg: number): string => {
  const s = polarToXY(fromDeg);
  const e = polarToXY(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
};

interface ProgressCardProps {
  monthlyBudget: number;
  totalMonthlyCost: number;
}

const ProgressCard = ({ monthlyBudget, totalMonthlyCost }: ProgressCardProps) => {
  const [displayCost, setDisplayCost] = useState(totalMonthlyCost);
  const targetCostRef = useRef(totalMonthlyCost);
  targetCostRef.current = totalMonthlyCost;

  useEffect(() => {
    let animId = 0;

    const tick = () => {
      setDisplayCost((prev) => {
        const target = targetCostRef.current;
        const diff = target - prev;
        if (Math.abs(diff) < 0.5) {
          return target;
        }
        return prev + diff * COST_LERP;
      });
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const ratio = Math.min(1, displayCost / monthlyBudget);
  const fillEndDeg = START_DEG + ratio * SWEEP_DEG;
  const isDanger = ratio >= 0.9;
  const isWarning = ratio >= 0.7 && !isDanger;

  const trackPath = arcPath(START_DEG, START_DEG + SWEEP_DEG);
  const fillPath = ratio > 0.001 ? arcPath(START_DEG, fillEndDeg) : null;

  const startPos = polarToXY(START_DEG);
  const endPos = polarToXY(START_DEG + SWEEP_DEG);

  let gradientStart = "#22d3ee";
  let gradientEnd = "#a78bfa";
  if (isDanger) {
    gradientStart = "#f472b6";
    gradientEnd = "#ef4444";
  } else if (isWarning) {
    gradientStart = "#facc15";
    gradientEnd = "#f97316";
  }

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(42, 42, 64, 0.7), rgba(27, 27, 50, 0.7))",
        border: "1px solid rgba(59, 59, 79, 0.4)",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        padding: "14px",
      }}
    >
      <h2
        style={{
          color: "#d0d0d5",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.11em",
          margin: "0 0 8px",
          textTransform: "uppercase",
        }}
      >
        Budget Limit
      </h2>

      <div style={{ height: "200px", margin: "0 auto", position: "relative", width: "200px" }}>
        <svg height="200" viewBox="0 0 200 200" width="200">
          <defs>
            <linearGradient id="budgetFill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor={gradientStart} />
              <stop offset="100%" stopColor={gradientEnd} />
            </linearGradient>
          </defs>

          <path
            d={trackPath}
            fill="none"
            stroke="rgba(148,163,184,0.16)"
            strokeLinecap="round"
            strokeWidth={STROKE_W}
          />

          {fillPath !== null && (
            <path
              d={fillPath}
              fill="none"
              opacity="0.35"
              stroke="url(#budgetFill)"
              strokeLinecap="round"
              strokeWidth={STROKE_W}
              style={{ filter: "blur(6px)" }}
            />
          )}
          {fillPath !== null && (
            <path
              d={fillPath}
              fill="none"
              stroke="url(#budgetFill)"
              strokeLinecap="round"
              strokeWidth={STROKE_W}
            />
          )}

          <text
            fill="#6b7280"
            fontFamily="'Hack', ui-monospace, monospace"
            fontSize="13"
            textAnchor="middle"
            x={startPos.x}
            y={startPos.y + 26}
          >
            0
          </text>
          <text
            fill="#6b7280"
            fontFamily="'Hack', ui-monospace, monospace"
            fontSize="13"
            textAnchor="middle"
            x={endPos.x}
            y={endPos.y + 26}
          >
            ${monthlyBudget}
          </text>
        </svg>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            inset: 0,
            justifyContent: "center",
            position: "absolute",
          }}
        >
          <span
            style={{
              color: "#f5f6f7",
              fontFamily: "'Hack', ui-monospace, monospace",
              fontSize: "28px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            ${Math.round(displayCost)}
          </span>
          <span
            style={{
              color: "#d0d0d5",
              fontFamily: "'Hack', ui-monospace, monospace",
              fontSize: "11px",
              marginTop: "4px",
            }}
          >
            /month
          </span>
        </div>
      </div>
    </div>
  );
};

export { ProgressCard };
