import { useEffect, useRef, useState } from "react";

const CX = 100;
const CY = 100;
const RADIUS = 80;
const START_DEG = 135;
const SWEEP_DEG = 270;
const STROKE_W = 14;

const RISING_LERP = 0.055;
const RISING_JITTER_SCALE = 0.14;
const JITTER_TOP_AMPLITUDE = 8;
const JITTER_TOP_DURATION_MS = 2000;

type AnimPhase = "JITTER_TOP" | "RISING" | "SETTLED";

const DEFAULT_MAX = 300;

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

interface CircularGaugeProps {
  bottleneckOpsPerSec?: number | undefined;
  currentReqPerSec?: number;
  trafficTarget?: number;
}

const CircularGauge = ({
  bottleneckOpsPerSec,
  currentReqPerSec = 0,
  trafficTarget,
}: CircularGaugeProps) => {
  const maxValue = trafficTarget ?? DEFAULT_MAX;

  const [displayValue, setDisplayValue] = useState(0);
  const prevDisplayRef = useRef(0);
  const phaseRef = useRef<AnimPhase>("RISING");
  const jitterTopElapsedRef = useRef(0);
  const lastTimestampRef = useRef(0);
  const trafficRef = useRef(currentReqPerSec);
  const bottleneckRef = useRef(bottleneckOpsPerSec);

  trafficRef.current = currentReqPerSec;
  bottleneckRef.current = bottleneckOpsPerSec;

  useEffect(() => {
    let animId = 0;

    const tick = (timestamp: number) => {
      const dt =
        lastTimestampRef.current === 0 ? 16 : Math.min(timestamp - lastTimestampRef.current, 100);
      lastTimestampRef.current = timestamp;

      const prev = prevDisplayRef.current;
      const traffic = trafficRef.current;
      const bottleneck = bottleneckRef.current;
      const phase = phaseRef.current;
      let newValue = prev;

      if (traffic === 0) {
        phaseRef.current = "RISING";
        jitterTopElapsedRef.current = 0;
        newValue = prev < 0.5 ? 0 : prev * 0.88;
      } else if (phase === "RISING") {
        const risingTarget = bottleneck ?? traffic;
        const diff = risingTarget - prev;
        if (Math.abs(diff) < 2) {
          phaseRef.current = "JITTER_TOP";
          jitterTopElapsedRef.current = 0;
          newValue = risingTarget + (Math.random() - 0.5) * JITTER_TOP_AMPLITUDE;
        } else {
          newValue = Math.max(
            0,
            prev +
              diff * RISING_LERP +
              (Math.random() - 0.5) * Math.abs(diff) * RISING_JITTER_SCALE,
          );
        }
      } else if (phase === "JITTER_TOP") {
        jitterTopElapsedRef.current += dt;
        if (jitterTopElapsedRef.current >= JITTER_TOP_DURATION_MS) {
          phaseRef.current = "SETTLED";
          newValue = bottleneck ?? traffic;
        } else {
          const jitterCenter = bottleneck ?? traffic;
          newValue = Math.max(0, jitterCenter + (Math.random() - 0.5) * JITTER_TOP_AMPLITUDE);
        }
      } else {
        // SETTLED
        const settled = bottleneck ?? traffic;
        if (Math.abs(settled - prev) > 2) {
          // Value shifted significantly (new bottleneck or traffic change)
          phaseRef.current = "RISING";
          newValue = prev;
        } else {
          newValue = settled;
        }
      }

      prevDisplayRef.current = newValue;
      setDisplayValue(newValue);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const ratio = Math.min(1, displayValue / maxValue);
  const fillEndDeg = START_DEG + ratio * SWEEP_DEG;

  const trackPath = arcPath(START_DEG, START_DEG + SWEEP_DEG);
  const fillPath = ratio > 0.001 ? arcPath(START_DEG, fillEndDeg) : null;

  const isGood = ratio >= 0.7;
  const isWarning = ratio >= 0.3 && !isGood;

  let gradientStart = "#f472b6";
  let gradientEnd = "#ef4444";
  if (isGood) {
    gradientStart = "#a3e635";
    gradientEnd = "#22d3ee";
  } else if (isWarning) {
    gradientStart = "#facc15";
    gradientEnd = "#f97316";
  }

  const startPos = polarToXY(START_DEG);
  const endPos = polarToXY(START_DEG + SWEEP_DEG);

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
        Capacity Goal
      </h2>

      <div style={{ height: "200px", margin: "0 auto", position: "relative", width: "200px" }}>
        <svg height="200" viewBox="0 0 200 200" width="200">
          <defs>
            <linearGradient id="gaugeFill" x1="0" x2="1" y1="0" y2="1">
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
              stroke="url(#gaugeFill)"
              strokeLinecap="round"
              strokeWidth={STROKE_W}
              style={{ filter: "blur(6px)" }}
            />
          )}
          {fillPath !== null && (
            <path
              d={fillPath}
              fill="none"
              stroke="url(#gaugeFill)"
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
            {maxValue}
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
              fontFamily: "'Hack', 'ui-monospace', monospace",
              fontSize: "32px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {Math.round(displayValue)}
          </span>
          <span
            style={{
              color: "#d0d0d5",
              fontFamily: "'Hack', 'ui-monospace', monospace",
              fontSize: "10px",
              letterSpacing: "0.14em",
              marginTop: "4px",
              textTransform: "uppercase",
            }}
          >
            ops/s
          </span>
        </div>
      </div>
    </div>
  );
};

export { CircularGauge };
export type { CircularGaugeProps };
