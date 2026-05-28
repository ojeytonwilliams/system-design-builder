import { useRef, useState } from "react";
import { useAnimationFrame } from "../hooks/use-animation-frame.js";

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
const GOOD_RATIO_THRESHOLD = 0.7;
const WARNING_RATIO_THRESHOLD = 0.3;

const DEFAULT_MAX = 300;

const TIER_COLORS = {
  GOOD: { end: "#22d3ee", start: "#a3e635" },
  LOW: { end: "#ef4444", start: "#f472b6" },
  WARNING: { end: "#f97316", start: "#facc15" },
} as const;

type AnimPhase = "JITTER_TOP" | "RISING" | "SETTLED";
type GradientTier = keyof typeof TIER_COLORS;

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

const toGradientTier = (ratio: number): GradientTier => {
  if (ratio >= GOOD_RATIO_THRESHOLD) {
    return "GOOD";
  }
  if (ratio >= WARNING_RATIO_THRESHOLD) {
    return "WARNING";
  }
  return "LOW";
};

interface GaugeState {
  jitterElapsed: number;
  phase: AnimPhase;
  prevValue: number;
}

interface StepResult {
  nextJitterElapsed: number;
  nextPhase: AnimPhase;
  value: number;
}

const stepGaugeAnim = (
  state: GaugeState,
  delta: number,
  traffic: number,
  bottleneck: number | undefined,
): StepResult => {
  const { jitterElapsed, phase, prevValue: prev } = state;

  if (traffic === 0) {
    return { nextJitterElapsed: 0, nextPhase: "RISING", value: prev < 0.5 ? 0 : prev * 0.88 };
  }

  if (phase === "RISING") {
    const target = bottleneck ?? traffic;
    const diff = target - prev;
    if (Math.abs(diff) < 2) {
      return {
        nextJitterElapsed: 0,
        nextPhase: "JITTER_TOP",
        value: target + (Math.random() - 0.5) * JITTER_TOP_AMPLITUDE,
      };
    }
    const jitter = (Math.random() - 0.5) * Math.abs(diff) * RISING_JITTER_SCALE;
    return {
      nextJitterElapsed: jitterElapsed,
      nextPhase: "RISING",
      value: Math.max(0, prev + diff * RISING_LERP + jitter),
    };
  }

  if (phase === "JITTER_TOP") {
    const elapsed = jitterElapsed + delta;
    if (elapsed >= JITTER_TOP_DURATION_MS) {
      return { nextJitterElapsed: elapsed, nextPhase: "SETTLED", value: bottleneck ?? traffic };
    }
    const center = bottleneck ?? traffic;
    return {
      nextJitterElapsed: elapsed,
      nextPhase: "JITTER_TOP",
      value: Math.max(0, center + (Math.random() - 0.5) * JITTER_TOP_AMPLITUDE),
    };
  }

  // SETTLED
  const settled = bottleneck ?? traffic;
  if (Math.abs(settled - prev) > 2) {
    return { nextJitterElapsed: jitterElapsed, nextPhase: "RISING", value: prev };
  }
  return { nextJitterElapsed: jitterElapsed, nextPhase: "SETTLED", value: settled };
};

interface GaugeArcProps {
  bottleneckOpsPerSec?: number | undefined;
  maxValue: number;
  reqPerSec: number;
}

const GaugeArc = ({ bottleneckOpsPerSec, maxValue, reqPerSec }: GaugeArcProps) => {
  const prevValueRef = useRef(0);
  const phaseRef = useRef<AnimPhase>("RISING");
  const jitterElapsedRef = useRef(0);
  const fillPathRef = useRef<SVGPathElement>(null);
  const blurPathRef = useRef<SVGPathElement>(null);
  const displayedOpsRef = useRef<SVGTextElement>(null);
  const [gradientTier, setGradientTier] = useState<GradientTier>("LOW");

  useAnimationFrame((_timestamp, delta) => {
    if (!displayedOpsRef.current) {
      return;
    }

    const {
      value: displayedOps,
      nextPhase,
      nextJitterElapsed,
    } = stepGaugeAnim(
      {
        jitterElapsed: jitterElapsedRef.current,
        phase: phaseRef.current,
        prevValue: prevValueRef.current,
      },
      delta,
      reqPerSec,
      bottleneckOpsPerSec,
    );

    phaseRef.current = nextPhase;
    jitterElapsedRef.current = nextJitterElapsed;
    prevValueRef.current = displayedOps;

    const ratio = Math.min(1, displayedOps / maxValue);

    const newFillPath = arcPath(START_DEG, START_DEG + ratio * SWEEP_DEG);
    fillPathRef.current?.setAttribute("d", newFillPath);
    blurPathRef.current?.setAttribute("d", newFillPath);

    displayedOpsRef.current.textContent = displayedOps.toFixed(0);
    setGradientTier(toGradientTier(ratio));
  });

  const { end: gradEnd, start: gradStart } = TIER_COLORS[gradientTier];
  const startPos = polarToXY(START_DEG);
  const endPos = polarToXY(START_DEG + SWEEP_DEG);
  const trackPath = arcPath(START_DEG, START_DEG + SWEEP_DEG);

  return (
    <svg
      height="200"
      style={{ display: "block", margin: "0 auto" }}
      viewBox="0 0 200 200"
      width="200"
    >
      <defs>
        <linearGradient id="gaugeFill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={gradStart} />
          <stop offset="100%" stopColor={gradEnd} />
        </linearGradient>
      </defs>

      <path
        d={trackPath}
        fill="none"
        stroke="rgba(148,163,184,0.16)"
        strokeLinecap="round"
        strokeWidth={STROKE_W}
      />

      <path
        ref={blurPathRef}
        fill="none"
        opacity="0.35"
        stroke="url(#gaugeFill)"
        strokeLinecap="round"
        strokeWidth={STROKE_W}
        style={{ filter: "blur(6px)" }}
      />
      <path
        ref={fillPathRef}
        fill="none"
        stroke="url(#gaugeFill)"
        strokeLinecap="round"
        strokeWidth={STROKE_W}
      />

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

      <text
        ref={displayedOpsRef}
        dominantBaseline="central"
        fill="#f5f6f7"
        fontFamily="'Hack', 'ui-monospace', monospace"
        fontSize="32"
        fontWeight="600"
        letterSpacing="-0.02em"
        textAnchor="middle"
        x="100"
        y="93"
      >
        0
      </text>
      <text
        dominantBaseline="central"
        fill="#d0d0d5"
        fontFamily="'Hack', 'ui-monospace', monospace"
        fontSize="10"
        letterSpacing="0.14em"
        textAnchor="middle"
        x="100"
        y="116"
      >
        OPS/S
      </text>
    </svg>
  );
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
}: CircularGaugeProps) => (
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
    <GaugeArc
      bottleneckOpsPerSec={bottleneckOpsPerSec}
      maxValue={trafficTarget ?? DEFAULT_MAX}
      reqPerSec={currentReqPerSec}
    />
  </div>
);

export { CircularGauge };
export type { CircularGaugeProps };
