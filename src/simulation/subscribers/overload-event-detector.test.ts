import type { Mock } from "vitest";
import { SimulationEngine } from "../simulation-engine.js";
import { OverloadEventDetector } from "./overload-event-detector.js";
import type { TrafficSnapshot } from "../types.js";

const cleanSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 0, handledOps: 100, incomingOps: 100 },
};

const overloadSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 50, handledOps: 50, incomingOps: 100 },
};

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

  const run = (snapshot: TrafficSnapshot): void => {
    detector.run(snapshot, { onOverloadResolved, onOverloadStarted }, DELTA_MS);
  };

  describe("event detection", () => {
    it("fires onOverloadStarted on the first overloaded tick", () => {
      run(overloadSnapshot);

      expect(onOverloadStarted).toHaveBeenCalledOnce();
      expect(onOverloadResolved).not.toHaveBeenCalled();
    });

    it("does not fire onOverloadStarted on subsequent overloaded ticks", () => {
      run(overloadSnapshot);
      run(overloadSnapshot);

      expect(onOverloadStarted).toHaveBeenCalledOnce();
    });

    it("fires onOverloadResolved when overload clears", () => {
      run(overloadSnapshot);
      run(cleanSnapshot);

      expect(onOverloadResolved).toHaveBeenCalledOnce();
    });

    it("does not fire onOverloadResolved on a clean tick when not overloaded", () => {
      run(cleanSnapshot);

      expect(onOverloadResolved).not.toHaveBeenCalled();
    });

    it("fires onOverloadStarted again after a resolved overload", () => {
      run(overloadSnapshot);
      run(cleanSnapshot);
      run(overloadSnapshot);

      expect(onOverloadStarted).toHaveBeenCalledTimes(2);
    });
  });

  describe("overloadDurations", () => {
    it("starts empty", () => {
      expect(detector.getOverloadDurations().size).toBe(0);
    });

    it("accumulates duration in ms for an overloaded node", () => {
      run(overloadSnapshot);

      expect(detector.getOverloadDurations().get("server-1")).toBe(DELTA_MS);
    });

    it("accumulates ms on sustained overload", () => {
      run(overloadSnapshot);
      run(overloadSnapshot);

      expect(detector.getOverloadDurations().get("server-1")).toBe(DELTA_MS * 2);
    });

    it("removes a node entry when it recovers", () => {
      run(overloadSnapshot);
      run(cleanSnapshot);

      expect(detector.getOverloadDurations().has("server-1")).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears overloadDurations", () => {
      run(overloadSnapshot);
      detector.reset();

      expect(detector.getOverloadDurations().size).toBe(0);
    });

    it("allows onOverloadStarted to fire again on the next overloaded tick", () => {
      run(overloadSnapshot);
      detector.reset();
      onOverloadStarted.mockClear();

      run(overloadSnapshot);

      expect(onOverloadStarted).toHaveBeenCalledOnce();
    });

    it("does not fire onOverloadResolved when reset while overloaded", () => {
      run(overloadSnapshot);
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
