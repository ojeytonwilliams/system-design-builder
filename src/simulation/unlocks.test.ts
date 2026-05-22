import type { ArchitectureNode } from "../domain/canvas-logic.js";
import {
  computeAvailableComponents,
  evaluateUnlockTrigger,
  updateOverloadDurations,
} from "./unlocks.js";
import type { TrafficSnapshot } from "./types.js";

const pos = { x: 0, y: 0 };

const emptyInput = {
  graphNodes: [] as ArchitectureNode[],
  overloadDurations: new Map<string, number>(),
  snapshot: {} as TrafficSnapshot,
};

const overloadedSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 10, handledOps: 50, incomingOps: 60 },
};

const normalSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 0, handledOps: 40, incomingOps: 40 },
};

const twoServerNodes: ArchitectureNode[] = [
  { componentType: "server", id: "server-1", position: pos },
  { componentType: "server", id: "server-2", position: pos },
];

describe(evaluateUnlockTrigger, () => {
  describe("capacity reached", () => {
    it("returns true when any node has dropped ops", () => {
      const input = { ...emptyInput, snapshot: overloadedSnapshot };

      expect(evaluateUnlockTrigger({ type: "CAPACITY_REACHED" }, input)).toBe(true);
    });

    it("returns false when no nodes have dropped ops", () => {
      const input = { ...emptyInput, snapshot: normalSnapshot };

      expect(evaluateUnlockTrigger({ type: "CAPACITY_REACHED" }, input)).toBe(false);
    });

    it("returns false when snapshot is empty", () => {
      expect(evaluateUnlockTrigger({ type: "CAPACITY_REACHED" }, emptyInput)).toBe(false);
    });
  });

  describe("overload sustained", () => {
    it("returns true when any node has reached the required overload duration", () => {
      const overloadDurations = new Map([["server-1", 10_000]]);
      const input = { ...emptyInput, overloadDurations };

      expect(
        evaluateUnlockTrigger({ durationSeconds: 10, type: "OVERLOAD_SUSTAINED" }, input),
      ).toBe(true);
    });

    it("returns true when a node exceeds the required duration", () => {
      const overloadDurations = new Map([["server-1", 15_000]]);
      const input = { ...emptyInput, overloadDurations };

      expect(
        evaluateUnlockTrigger({ durationSeconds: 10, type: "OVERLOAD_SUSTAINED" }, input),
      ).toBe(true);
    });

    it("returns false when no node has reached the required duration", () => {
      const overloadDurations = new Map([["server-1", 5_000]]);
      const input = { ...emptyInput, overloadDurations };

      expect(
        evaluateUnlockTrigger({ durationSeconds: 10, type: "OVERLOAD_SUSTAINED" }, input),
      ).toBe(false);
    });

    it("returns false when overload durations map is empty", () => {
      expect(
        evaluateUnlockTrigger({ durationSeconds: 10, type: "OVERLOAD_SUSTAINED" }, emptyInput),
      ).toBe(false);
    });
  });

  describe("servers placed", () => {
    it("returns true when the required number of servers are present", () => {
      const input = { ...emptyInput, graphNodes: twoServerNodes };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(true);
    });

    it("returns true when more than the required number of servers are present", () => {
      const threeServers: ArchitectureNode[] = [
        ...twoServerNodes,
        { componentType: "server", id: "server-3", position: pos },
      ];
      const input = { ...emptyInput, graphNodes: threeServers };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(true);
    });

    it("counts server-large nodes toward the server count", () => {
      const mixedServers: ArchitectureNode[] = [
        { componentType: "server", id: "server-1", position: pos },
        { componentType: "server-large", id: "server-lg-1", position: pos },
      ];
      const input = { ...emptyInput, graphNodes: mixedServers };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(true);
    });

    it("returns false when fewer than the required number of servers are present", () => {
      const oneServer: ArchitectureNode[] = [
        { componentType: "server", id: "server-1", position: pos },
      ];
      const input = { ...emptyInput, graphNodes: oneServer };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(false);
    });

    it("does not count non-server nodes toward the server count", () => {
      const mixedNodes: ArchitectureNode[] = [
        { componentType: "server", id: "server-1", position: pos },
        { componentType: "db", id: "db-1", position: pos },
      ];
      const input = { ...emptyInput, graphNodes: mixedNodes };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(false);
    });
  });
});

describe(updateOverloadDurations, () => {
  it("starts tracking a node that becomes overloaded", () => {
    const result = updateOverloadDurations(new Map(), overloadedSnapshot, 1000);

    expect(result.get("server-1")).toBe(1000);
  });

  it("accumulates ms for a node that remains overloaded", () => {
    const prev = new Map([["server-1", 3000]]);

    const result = updateOverloadDurations(prev, overloadedSnapshot, 1000);

    expect(result.get("server-1")).toBe(4000);
  });

  it("resets duration for a node that is no longer overloaded", () => {
    const prev = new Map([["server-1", 5000]]);

    const result = updateOverloadDurations(prev, normalSnapshot, 1000);

    expect(result.has("server-1")).toBe(false);
  });

  it("returns a new Map rather than mutating the previous one", () => {
    const prev = new Map([["server-1", 3000]]);

    const result = updateOverloadDurations(prev, overloadedSnapshot, 1000);

    expect(result).not.toBe(prev);
  });
});

describe(computeAvailableComponents, () => {
  it("returns the base components when no unlocks are triggered", () => {
    const result = computeAvailableComponents(["server", "db"], [], emptyInput);

    expect(result).toStrictEqual(["server", "db"]);
  });

  it("appends unlocked components when the trigger fires", () => {
    const input = { ...emptyInput, graphNodes: twoServerNodes };
    const componentUnlocks = [
      {
        components: ["load-balancer" as const],
        trigger: { count: 2, type: "SERVERS_PLACED" as const },
      },
    ];

    const result = computeAvailableComponents(["server", "db"], componentUnlocks, input);

    expect(result).toContain("load-balancer");
  });

  it("does not add unlocked components when the trigger has not fired", () => {
    const componentUnlocks = [
      {
        components: ["load-balancer" as const],
        trigger: { count: 2, type: "SERVERS_PLACED" as const },
      },
    ];

    const result = computeAvailableComponents(["server", "db"], componentUnlocks, emptyInput);

    expect(result).not.toContain("load-balancer");
  });

  it("does not duplicate components already in the base list", () => {
    const input = { ...emptyInput, graphNodes: twoServerNodes };
    const componentUnlocks = [
      {
        components: ["server" as const],
        trigger: { count: 2, type: "SERVERS_PLACED" as const },
      },
    ];

    const result = computeAvailableComponents(["server", "db"], componentUnlocks, input);

    const serverCount = result.filter((c) => c === "server").length;

    expect(serverCount).toBe(1);
  });
});
