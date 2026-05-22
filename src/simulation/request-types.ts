const EDGE_TRANSIT_INTERNAL_MS = 10;
const TIME_SCALE = 100;

type RequestStatus = "DROPPED" | "FULFILLED" | "IN_TRANSIT" | "PROCESSING" | "TIMED_OUT";

interface SimRequest {
  id: string;
  originNodeId: string;
  spawnedAtSimMs: number;
  status: RequestStatus;
  visitedNodeIds: string[];
}

interface Transit {
  durationMs: number;
  edgeId: string;
  elapsedMs: number;
  progress: number;
  requestId: string;
}

interface Processing {
  durationMs: number;
  elapsedMs: number;
  nodeId: string;
  progress: number;
  requestId: string;
}

export { EDGE_TRANSIT_INTERNAL_MS, TIME_SCALE };
export type { Processing, RequestStatus, SimRequest, Transit };
