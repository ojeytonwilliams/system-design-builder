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

const step = (engine: SimulationEngine, snapshot: TrafficSnapshot, elapsed = 1): void => {
  engine.step({ elapsed, rate: 100, trafficSnapshot: snapshot });
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

  describe("event detection", () => {
    it("fires onOverloadStarted on the first overloaded tick", () => {
      step(engine, overloadSnapshot);

      expect(onOverloadStarted).toHaveBeenCalledOnce();
      expect(onOverloadResolved).not.toHaveBeenCalled();
    });

    it("does not fire onOverloadStarted on subsequent overloaded ticks", () => {
      step(engine, overloadSnapshot);
      step(engine, overloadSnapshot, 2);

      expect(onOverloadStarted).toHaveBeenCalledOnce();
    });

    it("fires onOverloadResolved when overload clears", () => {
      step(engine, overloadSnapshot);
      step(engine, cleanSnapshot, 2);

      expect(onOverloadResolved).toHaveBeenCalledOnce();
    });

    it("does not fire onOverloadResolved on a clean tick when not overloaded", () => {
      step(engine, cleanSnapshot);

      expect(onOverloadResolved).not.toHaveBeenCalled();
    });

    it("fires onOverloadStarted again after a resolved overload", () => {
      step(engine, overloadSnapshot);
      step(engine, cleanSnapshot, 2);
      step(engine, overloadSnapshot, 3);

      expect(onOverloadStarted).toHaveBeenCalledTimes(2);
    });
  });

  describe("overloadDurations", () => {
    it("starts empty", () => {
      expect(detector.getOverloadDurations().size).toBe(0);
    });

    it("accumulates duration for an overloaded node", () => {
      step(engine, overloadSnapshot);

      expect(detector.getOverloadDurations().get("server-1")).toBe(1);
    });

    it("increments on sustained overload", () => {
      step(engine, overloadSnapshot);
      step(engine, overloadSnapshot, 2);

      expect(detector.getOverloadDurations().get("server-1")).toBe(2);
    });

    it("removes a node entry when it recovers", () => {
      step(engine, overloadSnapshot);
      step(engine, cleanSnapshot, 2);

      expect(detector.getOverloadDurations().has("server-1")).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears overloadDurations", () => {
      step(engine, overloadSnapshot);
      detector.reset();

      expect(detector.getOverloadDurations().size).toBe(0);
    });

    it("allows onOverloadStarted to fire again on the next overloaded tick", () => {
      step(engine, overloadSnapshot);
      detector.reset();
      onOverloadStarted.mockClear();

      step(engine, overloadSnapshot, 2);

      expect(onOverloadStarted).toHaveBeenCalledOnce();
    });

    it("does not fire onOverloadResolved when reset while overloaded", () => {
      step(engine, overloadSnapshot);
      detector.reset();
      engine.reset();

      expect(onOverloadResolved).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("stops receiving engine updates", () => {
      detector.destroy();
      step(engine, overloadSnapshot);

      expect(onOverloadStarted).not.toHaveBeenCalled();
    });
  });
});
