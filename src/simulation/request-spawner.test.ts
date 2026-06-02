// oxlint-disable oxc/no-accumulating-spread
import { spawnRequests } from "./request-spawner.js";
import type { SpawnResult } from "./request-spawner.js";

// Delta is arbitrary, but this is divisible by 2 and (2/3) which makes the
// maths easier.
const DELTA_MS = 30;

// 1/30 per ms.
const RATE_ONE_PER_TICK = 1 / DELTA_MS;
const RATE_TWO_PER_TICK = RATE_ONE_PER_TICK * 2;
const RATE_HALF_PER_TICK = RATE_ONE_PER_TICK / 2;
// 3/100 per ms -> interval of 20ms.
const RATE_ONE_POINT_FIVE_PER_TICK = RATE_ONE_PER_TICK * 1.5;

const baseParams = {
  deltaMs: DELTA_MS,
  edgeTransitMs: 1000,
  firstSpawnTime: 0,
  idGenerator: (() => {
    let n = 0;
    return () => `req-${++n}`;
  })(),
  nextSpawn: 0,
  outgoingEdgeId: "edge-1",
  trafficRate: RATE_ONE_PER_TICK,
  usersNodeId: "users-1",
  wallClockElapsedMs: 0,
};

const repeatedSpawn = (params: Partial<typeof baseParams>, ticks: number) => {
  let allRequests: SpawnResult["requests"] = [];
  let allTransits: SpawnResult["transits"] = [];
  let spawnParams = { ...baseParams, ...params };

  for (let i = 0; i < ticks; i++) {
    const result = spawnRequests(spawnParams);
    allRequests = [...allRequests, ...result.requests];
    allTransits = [...allTransits, ...result.transits];
    spawnParams = {
      ...spawnParams,
      firstSpawnTime: result.nextSpawn,
    };
  }

  return { allRequests, allTransits };
};

describe(spawnRequests, () => {
  describe("spawn count", () => {
    it("spawns 1 request immediately", () => {
      // the spawner starts immediately, so even if the rate is close to zero, it should spawn a request on the first call.
      const result = spawnRequests({
        ...baseParams,
        trafficRate: 0.00000001,
      });

      expect(result.requests).toHaveLength(1);
    });

    it("spawns one request in the first tick if the rate is 1 per tick", () => {
      const result = spawnRequests({
        ...baseParams,
        trafficRate: RATE_ONE_PER_TICK,
      });

      expect(result.requests).toHaveLength(1);
    });

    it("spawns two requests in the first tick if the rate is 1 + delta per tick", () => {
      const result = spawnRequests({
        ...baseParams,
        trafficRate: RATE_ONE_PER_TICK + 0.00000001,
      });

      expect(result.requests).toHaveLength(2);
    });

    it("spawns 2n requests over n ticks if the average is two per tick", () => {
      const result = spawnRequests({
        ...baseParams,
        trafficRate: RATE_TWO_PER_TICK,
      });
      const second = spawnRequests({
        ...baseParams,
        firstSpawnTime: result.nextSpawn,
        trafficRate: RATE_TWO_PER_TICK,
      });
      const third = spawnRequests({
        ...baseParams,
        firstSpawnTime: second.nextSpawn,
        trafficRate: RATE_TWO_PER_TICK,
      });

      const allRequests = [...result.requests, ...second.requests, ...third.requests];

      expect(allRequests).toHaveLength(6);
    });

    it("accumulates pending spawns across ticks", () => {
      const first = spawnRequests({
        ...baseParams,
        trafficRate: RATE_ONE_POINT_FIVE_PER_TICK,
      });
      // At 1.5 req/tick, the first request spawns immediately and the second
      // after 2/3s of the tick, so the next should be at 4/3s of a tick (i.e.)
      // nextSpawn should be 1/3
      expect(first.requests).toHaveLength(2);
      expect(first.nextSpawn).toBeCloseTo(DELTA_MS / 3);

      const second = spawnRequests({
        ...baseParams,
        firstSpawnTime: first.nextSpawn,
        trafficRate: RATE_ONE_POINT_FIVE_PER_TICK,
      });
      // spawn at 1/3, but the next spawn is at the start of the next tick.
      expect(second.requests).toHaveLength(1);
    });

    it("spreads the spawns evenly across multiple ticks", () => {
      const first = spawnRequests({
        ...baseParams,
        trafficRate: RATE_ONE_POINT_FIVE_PER_TICK,
      });
      const second = spawnRequests({
        ...baseParams,
        firstSpawnTime: first.nextSpawn,
        trafficRate: RATE_ONE_POINT_FIVE_PER_TICK,
      });

      const elapsed = [
        ...first.transits.map((t) => t.elapsedMs),
        ...second.transits.map((t) => t.elapsedMs),
      ];

      // The model is that the request travels for whatever time is left in the
      // tick after it spawns, so the first spawn has the entire tick (elapsed =
      // 1 tick). The second spawn happens 2/3s of the way through the tick
      // (elapsed = 1/3 tick). At this point, the spawnRequest has to return the
      // remaining 1/3 tick as nextSpawn.

      // Then the next tick happens and the third requests at 1/3 tick (so,
      // elapsed = 2/3 tick). Finally, the fourth spawns in the next tick.
      expect(elapsed).toStrictEqual([DELTA_MS, DELTA_MS / 3, (DELTA_MS * 2) / 3]);
    });

    it("handles slow traffic rates correctly", () => {
      const result = repeatedSpawn({ trafficRate: RATE_HALF_PER_TICK }, 10);

      const allElapsed = result.allTransits.map((t) => t.elapsedMs);
      expect(result.allRequests).toHaveLength(5);
      expect(allElapsed).toStrictEqual([DELTA_MS, DELTA_MS, DELTA_MS, DELTA_MS, DELTA_MS]);
    });
  });

  describe("nextSpawn", () => {
    it("returns fractional remainder when count is below 1", () => {
      const result = spawnRequests({
        ...baseParams,
        trafficRate: RATE_HALF_PER_TICK,
      });

      // spawns immediately, then the next spawn is due at DELTA_MS * 2, but
      // we've already spent DELTA_MS, so the remainder is DELTA_MS.
      expect(result.nextSpawn).toBeCloseTo(DELTA_MS);
    });

    it("returns zero remainder when accumulation is exactly 1", () => {
      const result = spawnRequests({
        ...baseParams,
        trafficRate: RATE_ONE_PER_TICK,
      });

      expect(result.nextSpawn).toBeCloseTo(0);
    });

    it("never goes below zero", () => {
      const result = spawnRequests({ ...baseParams, trafficRate: 0 });

      expect(result.nextSpawn).toBeGreaterThanOrEqual(0);
    });

    it("carries over existing nextSpawn", () => {
      const result = spawnRequests({
        ...baseParams,
        firstSpawnTime: 0.9 * DELTA_MS,
        trafficRate: RATE_ONE_PER_TICK,
      });

      expect(result.requests).toHaveLength(1);
      expect(result.nextSpawn).toBeCloseTo(0.9 * DELTA_MS);
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
      const result = spawnRequests({
        ...baseParams,
        trafficRate: RATE_TWO_PER_TICK,
        wallClockElapsedMs: 500,
      });

      expect(result.requests[0]?.spawnedAtSimMs).toBe(500);
      expect(result.requests[1]?.spawnedAtSimMs).toBe(500 + DELTA_MS / 2);
    });

    it("starts with empty visitedNodeIds", () => {
      const result = spawnRequests({ ...baseParams });

      expect(result.requests[0]?.visitedNodeIds).toStrictEqual([]);
    });

    it("uses the idGenerator for request ids", () => {
      let counter = 0;
      const idGenerator = () => `id-${++counter}`;
      const result = spawnRequests({
        ...baseParams,
        idGenerator,
        trafficRate: RATE_TWO_PER_TICK,
      });

      expect(result.requests[0]?.id).toBe("id-1");
      expect(result.requests[1]?.id).toBe("id-2");
    });
  });

  describe("transit shape", () => {
    it("assigns the correct edgeId", () => {
      const result = spawnRequests({
        ...baseParams,
        outgoingEdgeId: "edge-abc",
      });

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

    it("gives the first spawn elapsedMs of an entire tick", () => {
      const result = spawnRequests({
        ...baseParams,
        trafficRate: RATE_ONE_PER_TICK,
      });

      expect(result.transits[0]?.elapsedMs).toBe(DELTA_MS);
    });

    it("spreads two spawns evenly across the tick", () => {
      const result = spawnRequests({
        ...baseParams,
        trafficRate: RATE_TWO_PER_TICK,
      });

      expect(result.transits[0]?.elapsedMs).toBe(DELTA_MS);
      expect(result.transits[1]?.elapsedMs).toBe(DELTA_MS / 2);
    });

    it("sets progress as elapsedMs / durationMs", () => {
      const result = spawnRequests({
        ...baseParams,
        trafficRate: RATE_TWO_PER_TICK,
      });

      expect(result.transits[0]?.progress).toBe(DELTA_MS / baseParams.edgeTransitMs);
      expect(result.transits[1]?.progress).toBeCloseTo(DELTA_MS / 2 / baseParams.edgeTransitMs);
    });
  });
});
