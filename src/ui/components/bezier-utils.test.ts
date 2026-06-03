import type { Graphics } from "pixi.js";
import {
  drawArrowHead,
  drawDashedBezier,
  getBezierControlPoints,
  getBezierLaneOffset,
  sampleCubicBezier,
  sampleCubicBezierByArcLength,
} from "./bezier-utils.js";

const makeGraphicsMock = () => ({
  bezierCurveTo: vi.fn<() => void>(),
  circle: vi.fn<() => void>(),
  clear: vi.fn<() => void>(),
  closePath: vi.fn<() => void>(),
  fill: vi.fn<() => void>(),
  lineTo: vi.fn<() => void>(),
  moveTo: vi.fn<() => void>(),
  roundRect: vi.fn<() => void>(),
  stroke: vi.fn<() => void>(),
});

describe(getBezierControlPoints, () => {
  it("uses horizontal control points when dx >= dy", () => {
    const result = getBezierControlPoints({ x: 0, y: 0 }, { x: 200, y: 0 });
    expect(result.cp1).toStrictEqual({ x: 100, y: 0 });
    expect(result.cp2).toStrictEqual({ x: 100, y: 0 });
  });

  it("uses vertical control points when dy > dx", () => {
    const result = getBezierControlPoints({ x: 0, y: 0 }, { x: 0, y: 200 });
    expect(result.cp1).toStrictEqual({ x: 0, y: 100 });
    expect(result.cp2).toStrictEqual({ x: 0, y: 100 });
  });

  it("caps curvature at 120", () => {
    const result = getBezierControlPoints({ x: 0, y: 0 }, { x: 1000, y: 0 });
    expect(result.cp1.x).toBe(120);
    expect(result.cp2.x).toBe(880);
  });
});

describe(getBezierLaneOffset, () => {
  it("returns a vertical offset for a horizontal curve", () => {
    expect(getBezierLaneOffset({ x: 0, y: 0 }, { x: 200, y: 0 }, 4)).toStrictEqual({ x: 0, y: 4 });
  });

  it("returns a horizontal offset for a vertical curve", () => {
    expect(getBezierLaneOffset({ x: 0, y: 0 }, { x: 0, y: 200 }, 4)).toStrictEqual({ x: 4, y: 0 });
  });

  it("negates correctly for a negative amount", () => {
    expect(getBezierLaneOffset({ x: 0, y: 0 }, { x: 200, y: 0 }, -4)).toStrictEqual({
      x: 0,
      y: -4,
    });
  });
});

describe(drawArrowHead, () => {
  it("draws a filled arrowhead at the target point", () => {
    const g = makeGraphicsMock();
    drawArrowHead(
      g as unknown as Graphics,
      { x: 0, y: 0 },
      { color: 0x7b8cb2, to: { x: 100, y: 0 } },
    );
    expect(g.moveTo).toHaveBeenCalledWith(100, 0);
    expect(g.fill).toHaveBeenCalledWith({ color: 0x7b8cb2 });
  });

  it("does nothing when source and target are the same point", () => {
    const g = makeGraphicsMock();
    drawArrowHead(
      g as unknown as Graphics,
      { x: 50, y: 50 },
      { color: 0x7b8cb2, to: { x: 50, y: 50 } },
    );
    expect(g.moveTo).not.toHaveBeenCalled();
  });
});

describe(sampleCubicBezier, () => {
  const straightLine = {
    cp1: { x: 33, y: 0 },
    cp2: { x: 67, y: 0 },
    p0: { x: 0, y: 0 },
    p3: { x: 100, y: 0 },
  };

  it("at t=0 returns p0", () => {
    expect(sampleCubicBezier(0, straightLine)).toStrictEqual({ x: 0, y: 0 });
  });

  it("at t=1 returns p3", () => {
    expect(sampleCubicBezier(1, straightLine)).toStrictEqual({ x: 100, y: 0 });
  });

  it("at t=0.5 on a symmetric straight line returns the midpoint", () => {
    const result = sampleCubicBezier(0.5, straightLine);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(0);
  });
});

describe(sampleCubicBezierByArcLength, () => {
  // S-curve: dx=100, dy=200 → vertical control points with curvature=100
  const curve = {
    cp1: { x: 0, y: 100 },
    cp2: { x: 100, y: 100 },
    p0: { x: 0, y: 0 },
    p3: { x: 100, y: 200 },
  };

  it("at progress=0 returns p0", () => {
    const result = sampleCubicBezierByArcLength(0, curve);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it("at progress=1 returns p3", () => {
    const result = sampleCubicBezierByArcLength(1, curve);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(200);
  });

  it("produces approximately equal chord lengths for equal progress steps", () => {
    const STEPS = 10;
    const pts = Array.from({ length: STEPS + 1 }, (_, i) =>
      sampleCubicBezierByArcLength(i / STEPS, curve),
    );
    const dists: number[] = [];
    for (let i = 0; i < STEPS; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      dists.push(Math.sqrt(dx * dx + dy * dy));
    }
    const mean = dists.reduce((s, d) => s + d, 0) / dists.length;
    for (const d of dists) {
      expect(Math.abs(d - mean) / mean).toBeLessThan(0.02);
    }
  });
});

describe(drawDashedBezier, () => {
  it("calls stroke with the provided color and width", () => {
    const g = makeGraphicsMock();
    drawDashedBezier(
      g as unknown as Graphics,
      { cp1: { x: 50, y: 0 }, cp2: { x: 50, y: 0 }, p0: { x: 0, y: 0 }, p3: { x: 100, y: 0 } },
      { alpha: 0.9, color: 0x7b8cb2, dashLen: 6, gapLen: 6, offset: 0, width: 2 },
    );
    expect(g.stroke).toHaveBeenCalledWith({ alpha: 0.9, color: 0x7b8cb2, width: 2 });
  });
});
