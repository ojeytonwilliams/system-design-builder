import {
  GAUGE_START_ANGLE,
  GAUGE_SWEEP_ANGLE,
  hasLoad,
  needleAngle,
  segmentArcs,
  stepNeedle,
} from "./node-gauge-utils.js";

const SEGMENT_COUNT = 5;
const SEGMENT_GAP_RAD = 0.05;
const FRAME_DELTA_MS = 16;

describe(needleAngle, () => {
  it("points at the start of the sweep when load is 0", () => {
    const angle = needleAngle(0);

    expect(angle).toBeCloseTo(GAUGE_START_ANGLE);
  });

  it("points at the end of the sweep when load is 1", () => {
    const angle = needleAngle(1);

    expect(angle).toBeCloseTo(GAUGE_START_ANGLE + GAUGE_SWEEP_ANGLE);
  });

  it("points at the middle of the sweep when load is 0.5", () => {
    const angle = needleAngle(0.5);

    expect(angle).toBeCloseTo(GAUGE_START_ANGLE + GAUGE_SWEEP_ANGLE / 2);
  });

  it("clamps loads below 0 to the start of the sweep", () => {
    const angle = needleAngle(-1);

    expect(angle).toBeCloseTo(GAUGE_START_ANGLE);
  });

  it("clamps loads above 1 to the end of the sweep", () => {
    const angle = needleAngle(2);

    expect(angle).toBeCloseTo(GAUGE_START_ANGLE + GAUGE_SWEEP_ANGLE);
  });
});

describe(segmentArcs, () => {
  it("returns one arc per segment", () => {
    const arcs = segmentArcs(SEGMENT_COUNT, SEGMENT_GAP_RAD);

    expect(arcs).toHaveLength(SEGMENT_COUNT);
  });

  it("starts the first arc at the start of the sweep", () => {
    const arcs = segmentArcs(SEGMENT_COUNT, SEGMENT_GAP_RAD);

    expect(arcs[0]?.start).toBeCloseTo(GAUGE_START_ANGLE);
  });

  it("ends the last arc at the end of the sweep", () => {
    const arcs = segmentArcs(SEGMENT_COUNT, SEGMENT_GAP_RAD);

    expect(arcs.at(-1)?.end).toBeCloseTo(GAUGE_START_ANGLE + GAUGE_SWEEP_ANGLE);
  });

  it("separates consecutive arcs by the given gap", () => {
    const arcs = segmentArcs(SEGMENT_COUNT, SEGMENT_GAP_RAD);

    const laterStarts = arcs.slice(1).reduce((sum, arc) => sum + arc.start, 0);
    const earlierEnds = arcs.slice(0, -1).reduce((sum, arc) => sum + arc.end, 0);

    expect(laterStarts - earlierEnds).toBeCloseTo((SEGMENT_COUNT - 1) * SEGMENT_GAP_RAD);
  });

  it("gives every arc the same length", () => {
    const arcs = segmentArcs(SEGMENT_COUNT, SEGMENT_GAP_RAD);

    const lengths = arcs.map((a) => a.end - a.start);

    expect(Math.max(...lengths) - Math.min(...lengths)).toBeCloseTo(0);
  });
});

describe(hasLoad, () => {
  it("returns true for a finite capacity", () => {
    expect(hasLoad(0.4)).toBe(true);
  });

  it("returns false for an infinite capacity", () => {
    expect(hasLoad(Infinity)).toBe(false);
  });
});

describe(stepNeedle, () => {
  it("moves the needle towards a higher target", () => {
    const next = stepNeedle(0, 1, FRAME_DELTA_MS);

    expect(next).toBeGreaterThan(0);
  });

  it("does not overshoot the target", () => {
    const next = stepNeedle(0, 1, FRAME_DELTA_MS);

    expect(next).toBeLessThanOrEqual(1);
  });

  it("moves the needle towards a lower target", () => {
    const next = stepNeedle(1, 0, FRAME_DELTA_MS);

    expect(next).toBeLessThan(1);
  });

  it("stays put when already at the target", () => {
    const next = stepNeedle(0.5, 0.5, FRAME_DELTA_MS);

    expect(next).toBeCloseTo(0.5);
  });

  it("moves further with a larger time delta", () => {
    const shortStep = stepNeedle(0, 1, FRAME_DELTA_MS);

    const longStep = stepNeedle(0, 1, FRAME_DELTA_MS * 4);

    expect(longStep).toBeGreaterThan(shortStep);
  });
});
