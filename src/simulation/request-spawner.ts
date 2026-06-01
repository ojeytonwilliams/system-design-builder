import type { SimRequest, Transit } from "./request-types.js";

const MS_PER_SECOND = 1000;

interface SpawnParams {
  deltaMs: number;
  edgeTransitMs: number;
  idGenerator?: () => string;
  outgoingEdgeId: string;
  pendingSpawns: number;
  trafficRate: number;
  usersNodeId: string;
  wallClockElapsedMs: number;
}

interface SpawnResult {
  pendingSpawns: number;
  requests: SimRequest[];
  transits: Transit[];
}

const spawnRequests = ({
  deltaMs,
  edgeTransitMs,
  idGenerator = () => crypto.randomUUID(),
  outgoingEdgeId,
  pendingSpawns,
  trafficRate,
  usersNodeId,
  wallClockElapsedMs,
}: SpawnParams): SpawnResult => {
  const accumulated = pendingSpawns + trafficRate * (deltaMs / MS_PER_SECOND);
  const count = Math.floor(accumulated);
  const remaining = accumulated - count;

  const requests: SimRequest[] = [];
  const transits: Transit[] = [];

  for (let i = 0; i < count; i++) {
    const id = idGenerator();
    const elapsedMs = (i / count) * deltaMs;
    const progress = elapsedMs / edgeTransitMs;

    requests.push({
      id,
      originNodeId: usersNodeId,
      spawnedAtSimMs: wallClockElapsedMs,
      status: "IN_TRANSIT",
      visitedEdgeIds: [],
      visitedNodeIds: [],
    });

    transits.push({
      durationMs: edgeTransitMs,
      edgeId: outgoingEdgeId,
      elapsedMs,
      progress,
      requestId: id,
    });
  }

  return { pendingSpawns: remaining, requests, transits };
};

export { spawnRequests };
export type { SpawnParams, SpawnResult };
