import { spawnRequests } from "./request-spawner.js";

// A tick interval that gives exactly 1 spawn per tick at rate RATE_ONE_PER_TICK
const DELTA_MS = 16;
// trafficRate * DELTA_MS = 1  →  trafficRate = 1 / DELTA_MS
// = 0.0625
const RATE_ONE_PER_TICK = 1 / DELTA_MS;
// = 0.125
const RATE_TWO_PER_TICK = RATE_ONE_PER_TICK * 2;
// = 0.03125
const RATE_HALF_PER_TICK = RATE_ONE_PER_TICK / 2;

const baseParams = {
  deltaMs: DELTA_MS,
  edgeTransitMs: 1000,
  idGenerator: (() => {
    let n = 0;
    return () => `req-${++n}`;
  })(),
  outgoingEdgeId: "edge-1",
  pendingSpawns: 0,
  trafficRate: RATE_ONE_PER_TICK,
  usersNodeId: "users-1",
  wallClockElapsedMs: 0,
};

describe(spawnRequests, () => {
  describe("spawn count", () => {
    it("spawns no requests when accumulation is below 1", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: RATE_HALF_PER_TICK });

      expect(result.requests).toHaveLength(0);
      expect(result.transits).toHaveLength(0);
    });

    it("spawns one request when accumulation reaches exactly 1", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: RATE_ONE_PER_TICK });

      expect(result.requests).toHaveLength(1);
      expect(result.transits).toHaveLength(1);
    });

    it("spawns two requests when accumulation reaches 2", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: RATE_TWO_PER_TICK });

      expect(result.requests).toHaveLength(2);
      expect(result.transits).toHaveLength(2);
    });

    it("accumulates pending spawns across calls when rate is below 1 per tick", () => {
      const first = spawnRequests({ ...baseParams, trafficRate: RATE_HALF_PER_TICK });
      const second = spawnRequests({
        ...baseParams,
        pendingSpawns: first.pendingSpawns,
        trafficRate: RATE_HALF_PER_TICK,
      });

      expect(second.requests).toHaveLength(1);
    });
  });

  describe("pendingSpawns", () => {
    it("returns fractional remainder when count is below 1", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: RATE_HALF_PER_TICK });

      expect(result.pendingSpawns).toBeCloseTo(0.5);
    });

    it("returns zero remainder when accumulation is exactly 1", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: RATE_ONE_PER_TICK });

      expect(result.pendingSpawns).toBeCloseTo(0);
    });

    it("never goes below zero", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: 0 });

      expect(result.pendingSpawns).toBeGreaterThanOrEqual(0);
    });

    it("carries over existing pendingSpawns", () => {
      const result = spawnRequests({
        ...baseParams,
        pendingSpawns: 0.9,
        trafficRate: RATE_HALF_PER_TICK,
      });

      // 0.9 + 0.5 = 1.4, count=1, remainder=0.4
      expect(result.requests).toHaveLength(1);
      expect(result.pendingSpawns).toBeCloseTo(0.4);
    });
  });

  describe("request shape", () => {
    it("assigns IN_TRANSIT status", () => {
      const result = spawnRequests({ ...baseParams });

      expect(result.requests[0]?.status).toBe("IN_TRANSIT");
    });

    it("assigns the correct originNodeId", () => {
      const result = spawnRequests({ ...baseParams, usersNodeId: "users-2" });

      expect(result.requests[0]?.originNodeId).toBe("users-2");
    });

    it("sets spawnedAtSimMs from wallClockElapsedMs", () => {
      const result = spawnRequests({ ...baseParams, wallClockElapsedMs: 500 });

      expect(result.requests[0]?.spawnedAtSimMs).toBe(500);
    });

    it("starts with empty visitedNodeIds", () => {
      const result = spawnRequests({ ...baseParams });

      expect(result.requests[0]?.visitedNodeIds).toStrictEqual([]);
    });

    it("uses the idGenerator for request ids", () => {
      let counter = 0;
      const idGenerator = () => `id-${++counter}`;
      const result = spawnRequests({ ...baseParams, idGenerator, trafficRate: RATE_TWO_PER_TICK });

      expect(result.requests[0]?.id).toBe("id-1");
      expect(result.requests[1]?.id).toBe("id-2");
    });
  });

  describe("transit shape", () => {
    it("assigns the correct edgeId", () => {
      const result = spawnRequests({ ...baseParams, outgoingEdgeId: "edge-abc" });

      expect(result.transits[0]?.edgeId).toBe("edge-abc");
    });

    it("sets durationMs to edgeTransitMs", () => {
      const result = spawnRequests({ ...baseParams });

      expect(result.transits[0]?.durationMs).toBe(baseParams.edgeTransitMs);
    });

    it("matches requestId in transit to request id", () => {
      let counter = 0;
      const idGenerator = () => `id-${++counter}`;
      const result = spawnRequests({ ...baseParams, idGenerator });

      expect(result.transits[0]?.requestId).toBe(result.requests[0]?.id);
    });

    it("gives the first spawn elapsedMs of 0", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: RATE_ONE_PER_TICK });

      expect(result.transits[0]?.elapsedMs).toBe(0);
    });

    it("spreads two spawns evenly across the tick", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: RATE_TWO_PER_TICK });

      expect(result.transits[0]?.elapsedMs).toBe(0);
      expect(result.transits[1]?.elapsedMs).toBe(DELTA_MS / 2);
    });

    it("sets progress as elapsedMs / durationMs", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: RATE_TWO_PER_TICK });

      expect(result.transits[0]?.progress).toBe(0);
      expect(result.transits[1]?.progress).toBeCloseTo(DELTA_MS / 2 / baseParams.edgeTransitMs);
    });
  });
});
