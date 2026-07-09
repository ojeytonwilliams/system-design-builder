const GAUGE_START_ANGLE = Math.PI;
const GAUGE_SWEEP_ANGLE = Math.PI;
const NEEDLE_TIME_CONSTANT_MS = 150;

const clampRatio = (ratio: number): number => Math.min(1, Math.max(0, ratio));

const hasLoad = (capacity: number): boolean => Number.isFinite(capacity);

const needleAngle = (loadRatio: number): number =>
  GAUGE_START_ANGLE + clampRatio(loadRatio) * GAUGE_SWEEP_ANGLE;

interface SegmentArc {
  end: number;
  start: number;
}

const segmentArcs = (count: number, gapRad: number): SegmentArc[] => {
  const arcLength = (GAUGE_SWEEP_ANGLE - (count - 1) * gapRad) / count;
  return Array.from({ length: count }, (_, i) => {
    const start = GAUGE_START_ANGLE + i * (arcLength + gapRad);
    return { end: start + arcLength, start };
  });
};

const stepNeedle = (current: number, target: number, deltaMS: number): number =>
  current + (target - current) * (1 - Math.exp(-deltaMS / NEEDLE_TIME_CONSTANT_MS));

export { GAUGE_START_ANGLE, GAUGE_SWEEP_ANGLE, hasLoad, needleAngle, segmentArcs, stepNeedle };
export type { SegmentArc };
