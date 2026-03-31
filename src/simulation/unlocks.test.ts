import {
  computeAvailableComponents,
  evaluateUnlockTrigger,
  updateOverloadDurations,
} from "./unlocks.js";
import type { EvaluateUnlockInput } from "./unlocks.js";
import type { GraphNode, TrafficSnapshot } from "./types.js";

const emptyInput: EvaluateUnlockInput = {
  graphNodes: [],
  overloadDurations: new Map(),
  snapshot: {},
};

const overloadedSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 10, handledOps: 50, incomingOps: 60 },
};

const normalSnapshot: TrafficSnapshot = {
  "server-1": { droppedOps: 0, handledOps: 40, incomingOps: 40 },
};

const twoServerNodes: GraphNode[] = [
  { capacity: 50, id: "server-1", type: "server" },
  { capacity: 50, id: "server-2", type: "server" },
];

describe(evaluateUnlockTrigger, () => {
  describe("capacity reached", () => {
    it("returns true when any node has dropped ops", () => {
      const input: EvaluateUnlockInput = { ...emptyInput, snapshot: overloadedSnapshot };

      expect(evaluateUnlockTrigger({ type: "CAPACITY_REACHED" }, input)).toBe(true);
    });

    it("returns false when no nodes have dropped ops", () => {
      const input: EvaluateUnlockInput = { ...emptyInput, snapshot: normalSnapshot };

      expect(evaluateUnlockTrigger({ type: "CAPACITY_REACHED" }, input)).toBe(false);
    });

    it("returns false when snapshot is empty", () => {
      expect(evaluateUnlockTrigger({ type: "CAPACITY_REACHED" }, emptyInput)).toBe(false);
    });
  });

  describe("overload sustained", () => {
    it("returns true when any node has reached the required overload duration", () => {
      const overloadDurations = new Map([["server-1", 10]]);
      const input: EvaluateUnlockInput = { ...emptyInput, overloadDurations };

      expect(
        evaluateUnlockTrigger({ durationSeconds: 10, type: "OVERLOAD_SUSTAINED" }, input),
      ).toBe(true);
    });

    it("returns true when a node exceeds the required duration", () => {
      const overloadDurations = new Map([["server-1", 15]]);
      const input: EvaluateUnlockInput = { ...emptyInput, overloadDurations };

      expect(
        evaluateUnlockTrigger({ durationSeconds: 10, type: "OVERLOAD_SUSTAINED" }, input),
      ).toBe(true);
    });

    it("returns false when no node has reached the required duration", () => {
      const overloadDurations = new Map([["server-1", 5]]);
      const input: EvaluateUnlockInput = { ...emptyInput, overloadDurations };

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
      const input: EvaluateUnlockInput = { ...emptyInput, graphNodes: twoServerNodes };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(true);
    });

    it("returns true when more than the required number of servers are present", () => {
      const threeServers: GraphNode[] = [
        ...twoServerNodes,
        { capacity: 50, id: "server-3", type: "server" },
      ];
      const input: EvaluateUnlockInput = { ...emptyInput, graphNodes: threeServers };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(true);
    });

    it("counts server-large nodes toward the server count", () => {
      const mixedServers: GraphNode[] = [
        { capacity: 50, id: "server-1", type: "server" },
        { capacity: 150, id: "server-lg-1", type: "server-large" },
      ];
      const input: EvaluateUnlockInput = { ...emptyInput, graphNodes: mixedServers };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(true);
    });

    it("returns false when fewer than the required number of servers are present", () => {
      const oneServer: GraphNode[] = [{ capacity: 50, id: "server-1", type: "server" }];
      const input: EvaluateUnlockInput = { ...emptyInput, graphNodes: oneServer };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(false);
    });

    it("does not count non-server nodes toward the server count", () => {
      const mixedNodes: GraphNode[] = [
        { capacity: 50, id: "server-1", type: "server" },
        { capacity: 30, id: "db-1", type: "db" },
      ];
      const input: EvaluateUnlockInput = { ...emptyInput, graphNodes: mixedNodes };

      expect(evaluateUnlockTrigger({ count: 2, type: "SERVERS_PLACED" }, input)).toBe(false);
    });
  });
});

describe(updateOverloadDurations, () => {
  it("starts tracking a node that becomes overloaded", () => {
    const result = updateOverloadDurations(new Map(), overloadedSnapshot);

    expect(result.get("server-1")).toBe(1);
  });

  it("increments duration for a node that remains overloaded", () => {
    const prev = new Map([["server-1", 3]]);

    const result = updateOverloadDurations(prev, overloadedSnapshot);

    expect(result.get("server-1")).toBe(4);
  });

  it("resets duration for a node that is no longer overloaded", () => {
    const prev = new Map([["server-1", 5]]);

    const result = updateOverloadDurations(prev, normalSnapshot);

    expect(result.has("server-1")).toBe(false);
  });

  it("returns a new Map rather than mutating the previous one", () => {
    const prev = new Map([["server-1", 3]]);

    const result = updateOverloadDurations(prev, overloadedSnapshot);

    expect(result).not.toBe(prev);
  });
});

describe(computeAvailableComponents, () => {
  it("returns the base components when no unlocks are triggered", () => {
    const result = computeAvailableComponents(["server", "db"], [], emptyInput);

    expect(result).toStrictEqual(["server", "db"]);
  });

  it("appends unlocked components when the trigger fires", () => {
    const input: EvaluateUnlockInput = { ...emptyInput, graphNodes: twoServerNodes };
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
    const input: EvaluateUnlockInput = { ...emptyInput, graphNodes: twoServerNodes };
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
