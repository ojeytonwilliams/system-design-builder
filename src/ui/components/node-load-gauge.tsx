import { extend, useTick } from "@pixi/react";
import { Graphics } from "pixi.js";
import { useRef } from "react";
import { needleAngle, segmentArcs, stepNeedle } from "./node-gauge-utils.js";

// oxlint-disable-next-line jest/require-hook
extend({ Graphics });

const SEGMENT_COLORS = [0x22c55e, 0xa3e635, 0xfacc15, 0xf97316, 0xef4444];
const SEGMENT_GAP_RAD = 0;
const GAUGE_RADIUS = 11;
const ARC_STROKE_WIDTH = 5;
const NEEDLE_LENGTH = 8;
const NEEDLE_WIDTH = 2.5;
const PIVOT_RADIUS = 3;
const PIVOT_HOLE_RADIUS = 1.5;
const PIVOT_HOLE_COLOR = 0x1b1b32;
const NEEDLE_COLOR = 0xf5f6f7;
const GAUGE_OUTER_RADIUS = GAUGE_RADIUS + ARC_STROKE_WIDTH / 2;

const SEGMENTS = segmentArcs(SEGMENT_COLORS.length, SEGMENT_GAP_RAD).map((arc, i) => ({
  color: SEGMENT_COLORS[i] ?? NEEDLE_COLOR,
  end: arc.end,
  start: arc.start,
}));

interface NodeLoadGaugeProps {
  loadRatio: number;
  x: number;
  y: number;
}

const NodeLoadGauge = ({ loadRatio, x, y }: NodeLoadGaugeProps) => {
  const graphicsRef = useRef<Graphics>(null);
  const displayedRatioRef = useRef(0);
  const loadRatioRef = useRef(loadRatio);
  loadRatioRef.current = loadRatio;

  useTick((ticker) => {
    const g = graphicsRef.current;
    if (!g) {
      return;
    }
    displayedRatioRef.current = stepNeedle(
      displayedRatioRef.current,
      loadRatioRef.current,
      ticker.deltaMS,
    );

    g.clear();
    for (const segment of SEGMENTS) {
      g.moveTo(GAUGE_RADIUS * Math.cos(segment.start), GAUGE_RADIUS * Math.sin(segment.start));
      g.arc(0, 0, GAUGE_RADIUS, segment.start, segment.end);
      g.stroke({ cap: "butt", color: segment.color, width: ARC_STROKE_WIDTH });
    }

    const angle = needleAngle(displayedRatioRef.current);
    g.moveTo(0, 0);
    g.lineTo(NEEDLE_LENGTH * Math.cos(angle), NEEDLE_LENGTH * Math.sin(angle));
    g.stroke({ cap: "round", color: NEEDLE_COLOR, width: NEEDLE_WIDTH });
    g.circle(0, 0, PIVOT_RADIUS);
    g.fill({ color: NEEDLE_COLOR });
    g.circle(0, 0, PIVOT_HOLE_RADIUS);
    g.fill({ color: PIVOT_HOLE_COLOR });
  });

  return <pixiGraphics ref={graphicsRef} draw={() => {}} x={x} y={y} />;
};

export { GAUGE_OUTER_RADIUS, NodeLoadGauge };
