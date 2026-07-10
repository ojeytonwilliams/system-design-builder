type RequestStatus = "DROPPED" | "FULFILLED" | "IN_TRANSIT" | "PROCESSING" | "QUEUED" | "TIMED_OUT";

interface SimRequest {
  id: string;
  originNodeId: string;
  spawnedAtSimMs: number;
  status: RequestStatus;
  visitedEdgeIds: string[];
  visitedNodeIds: string[];
}

interface SimResponse {
  id: string;
  requestId: string;
  remainingEdgeIds: string[];
  status: "DELIVERED" | "IN_TRANSIT";
}

interface ResponseTransit {
  durationMs: number;
  edgeId: string;
  elapsedMs: number;
  progress: number;
  responseId: string;
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

interface QueuedRequest {
  nodeId: string;
  requestId: string;
}

export type {
  Processing,
  QueuedRequest,
  RequestStatus,
  ResponseTransit,
  SimRequest,
  SimResponse,
  Transit,
};
