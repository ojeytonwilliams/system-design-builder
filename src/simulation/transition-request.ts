import type { Processing, RequestStatus, SimRequest, Transit } from "./request-types.js";

interface RequestMaps {
  processing: Map<string, Processing>;
  requests: Map<string, SimRequest>;
  transits: Map<string, Transit>;
}

type TransitionTarget =
  | { processing: Omit<Processing, "requestId">; status: "PROCESSING" }
  | { nodeId: string; status: "QUEUED" }
  | { status: Exclude<RequestStatus, "IN_TRANSIT" | "PROCESSING" | "QUEUED"> }
  | { status: "IN_TRANSIT"; transit: Omit<Transit, "requestId"> };

const transitionRequest = (
  requestId: string,
  target: TransitionTarget,
  maps: RequestMaps,
): void => {
  const request = maps.requests.get(requestId);

  if (request === undefined) {
    return;
  }

  const currentTransit = maps.transits.get(requestId);

  maps.transits.delete(requestId);
  maps.processing.delete(requestId);

  request.status = target.status;

  if (target.status === "IN_TRANSIT") {
    maps.transits.set(requestId, { ...target.transit, requestId });
  } else if (target.status === "PROCESSING") {
    if (currentTransit !== undefined) {
      request.visitedEdgeIds = [...request.visitedEdgeIds, currentTransit.edgeId];
    }
    request.visitedNodeIds = [...request.visitedNodeIds, target.processing.nodeId];
    maps.processing.set(requestId, { ...target.processing, requestId });
  } else if (target.status === "QUEUED") {
    if (currentTransit !== undefined) {
      request.visitedEdgeIds = [...request.visitedEdgeIds, currentTransit.edgeId];
    }
    request.visitedNodeIds = [...request.visitedNodeIds, target.nodeId];
  }
};

export { transitionRequest };
export type { RequestMaps, TransitionTarget };
