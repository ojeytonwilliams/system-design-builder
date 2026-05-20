import type { Graphics } from "pixi.js";

interface BezierCurve {
  cp1: Point;
  cp2: Point;
  p0: Point;
  p3: Point;
}

interface DashStyle {
  alpha: number;
  color: number;
  dashLen: number;
  gapLen: number;
  offset: number;
  width: number;
}

interface WalkState {
  dashLen: number;
  drawing: boolean;
  gapLen: number;
  remaining: number;
}

interface Point {
  x: number;
  y: number;
}

const BEZIER_STEPS = 80;

const sampleCubicBezier = (t: number, { cp1, cp2, p0, p3 }: BezierCurve): Point => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t2 * t * p3.y,
  };
};

const walkDashSegment = (
  g: Graphics,
  state: WalkState,
  opts: { curr: Point; prev: Point; segLen: number },
): void => {
  const { curr, prev, segLen } = opts;
  const { dashLen, gapLen } = state;
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  let consumed = 0;
  while (consumed < segLen) {
    const available = segLen - consumed;
    if (state.remaining <= available) {
      const frac = (consumed + state.remaining) / segLen;
      const mx = prev.x + dx * frac;
      const my = prev.y + dy * frac;
      if (state.drawing) {
        g.lineTo(mx, my);
      }
      consumed += state.remaining;
      state.drawing = !state.drawing;
      state.remaining = state.drawing ? dashLen : gapLen;
      if (state.drawing) {
        g.moveTo(mx, my);
      }
    } else {
      state.remaining -= available;
      if (state.drawing) {
        g.lineTo(curr.x, curr.y);
      }
      consumed = segLen;
    }
  }
};

const drawDashedBezier = (g: Graphics, curve: BezierCurve, style: DashStyle): void => {
  const { alpha, color, dashLen, gapLen, offset, width } = style;
  const pts: Point[] = [];
  for (let i = 0; i <= BEZIER_STEPS; i++) {
    pts.push(sampleCubicBezier(i / BEZIER_STEPS, curve));
  }
  const period = dashLen + gapLen;
  const distInPattern = offset % period;
  const drawing = distInPattern < dashLen;
  const state: WalkState = {
    dashLen,
    drawing,
    gapLen,
    remaining: drawing ? dashLen - distInPattern : period - distInPattern,
  };
  let prev = pts[0]!;
  if (state.drawing) {
    g.moveTo(prev.x, prev.y);
  }
  for (let i = 1; i < pts.length; i++) {
    const curr = pts[i]!;
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen > 0) {
      walkDashSegment(g, state, { curr, prev, segLen });
    }
    prev = curr;
  }
  g.stroke({ alpha, color, width });
};

const getBezierControlPoints = (src: Point, tgt: Point) => {
  const dx = Math.abs(tgt.x - src.x);
  const dy = Math.abs(tgt.y - src.y);
  const curvature = Math.min(Math.max(dx, dy) * 0.5, 120);
  if (dx >= dy) {
    return {
      cp1: { x: src.x + curvature, y: src.y },
      cp2: { x: tgt.x - curvature, y: tgt.y },
    };
  }
  return {
    cp1: { x: src.x, y: src.y + curvature },
    cp2: { x: tgt.x, y: tgt.y - curvature },
  };
};

const drawArrowHead = (g: Graphics, from: Point, { color, to }: { color: number; to: Point }) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return;
  }
  const ux = dx / len;
  const uy = dy / len;
  g.moveTo(to.x, to.y);
  g.lineTo(to.x - ux * 10 - uy * 5, to.y - uy * 10 + ux * 5);
  g.lineTo(to.x - ux * 10 + uy * 5, to.y - uy * 10 - ux * 5);
  g.closePath();
  g.fill({ color });
};

export { drawArrowHead, drawDashedBezier, getBezierControlPoints };
