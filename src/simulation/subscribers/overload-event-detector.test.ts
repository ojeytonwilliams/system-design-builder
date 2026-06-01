import type { Mock } from "vitest";
import { SimulationEngine } from "../simulation-engine.js";
import { OverloadEventDetector } from "./overload-event-detector.js";
import type { NodeMetricsSnapshot } from "../metrics.js";

const cleanMetrics: NodeMetricsSnapshot = new Map([
  ["server-1", { incomingOpsPerMs: 10, isOverloaded: false, opsPerMs: 10 }],
]);

const overloadMetrics: NodeMetricsSnapshot = new Map([
  ["server-1", { incomingOpsPerMs: 60, isOverloaded: true, opsPerMs: 30 }],
]);

describe(OverloadEventDetector, () => {
  let engine: SimulationEngine;
  let onOverloadResolved: Mock<() => void>;
  let onOverloadStarted: Mock<() => void>;
  let detector: OverloadEventDetector;

  beforeEach(() => {
    engine = new SimulationEngine();
    onOverloadResolved = vi.fn<() => void>();
    onOverloadStarted = vi.fn<() => void>();
    detector = new OverloadEventDetector(engine, { onOverloadResolved, onOverloadStarted });
  });

  afterEach(() => {
    detector.destroy();
  });

  const DELTA_MS = 1000;

  const run = (nodeMetrics: NodeMetricsSnapshot): void => {
    detector.run(nodeMetrics, { onOverloadResolved, onOverloadStarted }, DELTA_MS);
  };

  describe("event detection", () => {
    it("fires onOverloadStarted on the first overloaded tick", () => {
      run(overloadMetrics);

      expect(onOverloadStarted).toHaveBeenCalledOnce();
      expect(onOverloadResolved).not.toHaveBeenCalled();
    });

    it("does not fire onOverloadStarted on subsequent overloaded ticks", () => {
      run(overloadMetrics);
      run(overloadMetrics);

      expect(onOverloadStarted).toHaveBeenCalledOnce();
    });

    it("fires onOverloadResolved when overload clears", () => {
      run(overloadMetrics);
      run(cleanMetrics);

      expect(onOverloadResolved).toHaveBeenCalledOnce();
    });

    it("does not fire onOverloadResolved on a clean tick when not overloaded", () => {
      run(cleanMetrics);

      expect(onOverloadResolved).not.toHaveBeenCalled();
    });

    it("fires onOverloadStarted again after a resolved overload", () => {
      run(overloadMetrics);
      run(cleanMetrics);
      run(overloadMetrics);

      expect(onOverloadStarted).toHaveBeenCalledTimes(2);
    });
  });

  describe("overloadDurations", () => {
    it("starts empty", () => {
      expect(detector.getOverloadDurations().size).toBe(0);
    });

    it("accumulates duration in ms for an overloaded node", () => {
      run(overloadMetrics);

      expect(detector.getOverloadDurations().get("server-1")).toBe(DELTA_MS);
    });

    it("accumulates ms on sustained overload", () => {
      run(overloadMetrics);
      run(overloadMetrics);

      expect(detector.getOverloadDurations().get("server-1")).toBe(DELTA_MS * 2);
    });

    it("removes a node entry when it recovers", () => {
      run(overloadMetrics);
      run(cleanMetrics);

      expect(detector.getOverloadDurations().has("server-1")).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears overloadDurations", () => {
      run(overloadMetrics);
      detector.reset();

      expect(detector.getOverloadDurations().size).toBe(0);
    });

    it("allows onOverloadStarted to fire again on the next overloaded tick", () => {
      run(overloadMetrics);
      detector.reset();
      onOverloadStarted.mockClear();

      run(overloadMetrics);

      expect(onOverloadStarted).toHaveBeenCalledOnce();
    });

    it("does not fire onOverloadResolved when reset while overloaded", () => {
      run(overloadMetrics);
      detector.reset();
      engine.reset();

      expect(onOverloadResolved).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("stops receiving engine updates", () => {
      detector.destroy();
      engine.reset();

      expect(onOverloadStarted).not.toHaveBeenCalled();
    });
  });
});
