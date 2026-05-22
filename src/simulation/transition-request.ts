import type { Processing, RequestStatus, SimRequest, Transit } from "./request-types.js";

interface RequestMaps {
  processing: Map<string, Processing>;
  requests: Map<string, SimRequest>;
  transits: Map<string, Transit>;
}

type TransitionTarget =
  | { processing: Omit<Processing, "requestId">; status: "PROCESSING" }
  | { status: Exclude<RequestStatus, "IN_TRANSIT" | "PROCESSING"> }
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

  maps.transits.delete(requestId);
  maps.processing.delete(requestId);

  request.status = target.status;

  if (target.status === "IN_TRANSIT") {
    maps.transits.set(requestId, { ...target.transit, requestId });
  } else if (target.status === "PROCESSING") {
    request.visitedNodeIds = [...request.visitedNodeIds, target.processing.nodeId];
    maps.processing.set(requestId, { ...target.processing, requestId });
  }
};

export { transitionRequest };
export type { RequestMaps, TransitionTarget };
