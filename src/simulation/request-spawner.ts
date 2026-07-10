import type { SimRequest, Transit } from "./request-types.js";

interface SpawnParams {
  deltaMs: number;
  edgeTransitMs: number;
  idGenerator?: () => string;
  outgoingEdgeId: string;
  firstSpawnTime: number;
  trafficRate: number;
  usersNodeId: string;
}

interface SpawnResult {
  nextSpawn: number;
  requests: SimRequest[];
  transits: Transit[];
}

const spawnRequests = ({
  deltaMs,
  edgeTransitMs,
  idGenerator = () => crypto.randomUUID(),
  outgoingEdgeId,
  firstSpawnTime,
  trafficRate,
  usersNodeId,
}: SpawnParams): SpawnResult => {
  const intervalPerRequest = 1 / trafficRate;

  const requests: SimRequest[] = [];
  const transits: Transit[] = [];

  let elapsedMs = deltaMs - firstSpawnTime;

  while (elapsedMs > 0) {
    const id = idGenerator();

    const progress = elapsedMs / edgeTransitMs;

    requests.push({
      id,
      originNodeId: usersNodeId,
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
    elapsedMs -= intervalPerRequest;
  }

  return { nextSpawn: -elapsedMs, requests, transits };
};

export { spawnRequests };
export type { SpawnParams, SpawnResult };
