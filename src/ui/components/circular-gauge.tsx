const CX = 100;
const CY = 100;
const RADIUS = 80;
const START_DEG = 135;
const SWEEP_DEG = 270;
const STROKE_W = 14;

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
  currentReqPerSec?: number;
  maxValue?: number;
  trafficTarget?: number;
}

const CircularGauge = ({
  currentReqPerSec = 0,
  maxValue = 300,
  trafficTarget,
}: CircularGaugeProps) => {
  const ratio = Math.min(1, currentReqPerSec / maxValue);
  const fillEndDeg = START_DEG + ratio * SWEEP_DEG;
  const onTarget = trafficTarget !== undefined && currentReqPerSec >= trafficTarget;

  const trackPath = arcPath(START_DEG, START_DEG + SWEEP_DEG);
  const fillPath = ratio > 0.001 ? arcPath(START_DEG, fillEndDeg) : null;

  const startPos = polarToXY(START_DEG);
  const endPos = polarToXY(START_DEG + SWEEP_DEG);

  const targetDeg =
    trafficTarget === undefined ? null : START_DEG + (trafficTarget / maxValue) * SWEEP_DEG;
  const targetPos = targetDeg === null ? null : polarToXY(targetDeg);

  const numColor = onTarget ? "#a3e635" : "oklch(0.96 0.01 250)";
  const numShadow = onTarget ? "0 0 16px rgba(163,230,53,.4)" : undefined;

  return (
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(180deg, oklch(0.22 0.025 270 / 0.65), oklch(0.18 0.022 268 / 0.7))",
        border: "1px solid oklch(0.36 0.022 272 / 0.32)",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "10px 12px 14px",
      }}
    >
      <div style={{ height: "200px", position: "relative", width: "200px" }}>
        <svg height="200" viewBox="0 0 200 200" width="200">
          <defs>
            <linearGradient id="gaugeFill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a78bfa" />
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

          {targetPos !== null && trafficTarget !== undefined && (
            <>
              <circle cx={targetPos.x} cy={targetPos.y} fill="#a3e635" r="5" />
              <text
                fill="#a3e635"
                fontFamily="'Hack', ui-monospace, monospace"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                x={targetPos.x}
                y={targetPos.y - 11}
              >
                {trafficTarget}
              </text>
            </>
          )}

          <text
            fill="#64748b"
            fontFamily="'Hack', ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
            x={startPos.x}
            y={startPos.y + 18}
          >
            0
          </text>
          <text
            fill="#64748b"
            fontFamily="'Hack', ui-monospace, monospace"
            fontSize="10.5"
            textAnchor="middle"
            x={endPos.x}
            y={endPos.y + 18}
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
              color: numColor,
              fontFamily: "'Hack', 'ui-monospace', monospace",
              fontSize: "32px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              textShadow: numShadow,
            }}
          >
            {Math.round(currentReqPerSec)}
          </span>
          <span
            style={{
              color: "oklch(0.58 0.022 252)",
              fontFamily: "'Hack', 'ui-monospace', monospace",
              fontSize: "10px",
              letterSpacing: "0.14em",
              marginTop: "4px",
              textTransform: "uppercase",
            }}
          >
            req / sec
          </span>
        </div>
      </div>
    </div>
  );
};

export { CircularGauge };
export type { CircularGaugeProps };
