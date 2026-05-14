import type { Graphics } from "pixi.js";
import { drawArrowHead, drawDashedBezier, getBezierControlPoints } from "./bezier-utils.js";

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
