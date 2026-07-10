import { transitionRequest } from "./transition-request.js";
import type { Processing, RequestStatus, SimRequest, Transit } from "./request-types.js";
import type { RequestMaps } from "./transition-request.js";

const makeRequest = (id: string, status: RequestStatus): SimRequest => ({
  id,
  originNodeId: "users-1",
  status,
  visitedEdgeIds: [],
  visitedNodeIds: [],
});

const makeTransit = (requestId: string): Transit => ({
  durationMs: 1000,
  edgeId: "edge-1",
  elapsedMs: 0,
  progress: 0,
  requestId,
});

const makeProcessing = (requestId: string): Processing => ({
  durationMs: 500,
  elapsedMs: 0,
  nodeId: "node-1",
  progress: 0,
  requestId,
});

const makeMaps = (
  request: SimRequest,
  transit?: Transit,
  processing?: Processing,
): RequestMaps => ({
  processing:
    processing === undefined
      ? new Map<string, Processing>()
      : new Map([[processing.requestId, processing]]),
  requests: new Map([[request.id, request]]),
  transits:
    transit === undefined ? new Map<string, Transit>() : new Map([[transit.requestId, transit]]),
});

describe(transitionRequest, () => {
  describe("IN_TRANSIT → PROCESSING", () => {
    it("updates the request status to PROCESSING", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest(
        "r1",
        {
          processing: { durationMs: 500, elapsedMs: 0, nodeId: "server-1", progress: 0 },
          status: "PROCESSING",
        },
        maps,
      );

      expect(maps.requests.get("r1")?.status).toBe("PROCESSING");
    });

    it("removes the transit entry", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest(
        "r1",
        {
          processing: { durationMs: 500, elapsedMs: 0, nodeId: "server-1", progress: 0 },
          status: "PROCESSING",
        },
        maps,
      );

      expect(maps.transits.has("r1")).toBe(false);
    });

    it("adds the processing entry with the correct nodeId", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest(
        "r1",
        {
          processing: { durationMs: 500, elapsedMs: 0, nodeId: "server-1", progress: 0 },
          status: "PROCESSING",
        },
        maps,
      );

      expect(maps.processing.get("r1")?.nodeId).toBe("server-1");
    });

    it("sets requestId on the processing entry", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest(
        "r1",
        {
          processing: { durationMs: 500, elapsedMs: 0, nodeId: "server-1", progress: 0 },
          status: "PROCESSING",
        },
        maps,
      );

      expect(maps.processing.get("r1")?.requestId).toBe("r1");
    });

    it("appends the edgeId to visitedEdgeIds", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest(
        "r1",
        {
          processing: { durationMs: 500, elapsedMs: 0, nodeId: "server-1", progress: 0 },
          status: "PROCESSING",
        },
        maps,
      );

      expect(maps.requests.get("r1")?.visitedEdgeIds).toStrictEqual(["edge-1"]);
    });

    it("preserves previously visited edges", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      request.visitedEdgeIds = ["edge-0"];
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest(
        "r1",
        {
          processing: { durationMs: 500, elapsedMs: 0, nodeId: "server-1", progress: 0 },
          status: "PROCESSING",
        },
        maps,
      );

      expect(maps.requests.get("r1")?.visitedEdgeIds).toStrictEqual(["edge-0", "edge-1"]);
    });

    it("appends the nodeId to visitedNodeIds", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest(
        "r1",
        {
          processing: { durationMs: 500, elapsedMs: 0, nodeId: "server-1", progress: 0 },
          status: "PROCESSING",
        },
        maps,
      );

      expect(maps.requests.get("r1")?.visitedNodeIds).toStrictEqual(["server-1"]);
    });

    it("preserves previously visited nodes", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      request.visitedNodeIds = ["cache-1"];
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest(
        "r1",
        {
          processing: { durationMs: 500, elapsedMs: 0, nodeId: "server-1", progress: 0 },
          status: "PROCESSING",
        },
        maps,
      );

      expect(maps.requests.get("r1")?.visitedNodeIds).toStrictEqual(["cache-1", "server-1"]);
    });
  });

  describe("PROCESSING → IN_TRANSIT", () => {
    it("updates the request status to IN_TRANSIT", () => {
      const request = makeRequest("r1", "PROCESSING");
      const maps = makeMaps(request, undefined, makeProcessing("r1"));

      transitionRequest(
        "r1",
        {
          status: "IN_TRANSIT",
          transit: { durationMs: 1000, edgeId: "edge-2", elapsedMs: 0, progress: 0 },
        },
        maps,
      );

      expect(maps.requests.get("r1")?.status).toBe("IN_TRANSIT");
    });

    it("removes the processing entry", () => {
      const request = makeRequest("r1", "PROCESSING");
      const maps = makeMaps(request, undefined, makeProcessing("r1"));

      transitionRequest(
        "r1",
        {
          status: "IN_TRANSIT",
          transit: { durationMs: 1000, edgeId: "edge-2", elapsedMs: 0, progress: 0 },
        },
        maps,
      );

      expect(maps.processing.has("r1")).toBe(false);
    });

    it("adds a transit entry with the correct edgeId", () => {
      const request = makeRequest("r1", "PROCESSING");
      const maps = makeMaps(request, undefined, makeProcessing("r1"));

      transitionRequest(
        "r1",
        {
          status: "IN_TRANSIT",
          transit: { durationMs: 1000, edgeId: "edge-2", elapsedMs: 0, progress: 0 },
        },
        maps,
      );

      expect(maps.transits.get("r1")?.edgeId).toBe("edge-2");
    });

    it("sets requestId on the transit entry", () => {
      const request = makeRequest("r1", "PROCESSING");
      const maps = makeMaps(request, undefined, makeProcessing("r1"));

      transitionRequest(
        "r1",
        {
          status: "IN_TRANSIT",
          transit: { durationMs: 1000, edgeId: "edge-2", elapsedMs: 0, progress: 0 },
        },
        maps,
      );

      expect(maps.transits.get("r1")?.requestId).toBe("r1");
    });
  });

  describe("PROCESSING → terminal", () => {
    it("updates status to FULFILLED", () => {
      const request = makeRequest("r1", "PROCESSING");
      const maps = makeMaps(request, undefined, makeProcessing("r1"));

      transitionRequest("r1", { status: "FULFILLED" }, maps);

      expect(maps.requests.get("r1")?.status).toBe("FULFILLED");
    });

    it("removes the processing entry on FULFILLED", () => {
      const request = makeRequest("r1", "PROCESSING");
      const maps = makeMaps(request, undefined, makeProcessing("r1"));

      transitionRequest("r1", { status: "FULFILLED" }, maps);

      expect(maps.processing.has("r1")).toBe(false);
    });

    it("updates status to DROPPED", () => {
      const request = makeRequest("r1", "PROCESSING");
      const maps = makeMaps(request, undefined, makeProcessing("r1"));

      transitionRequest("r1", { status: "DROPPED" }, maps);

      expect(maps.requests.get("r1")?.status).toBe("DROPPED");
    });

    it("removes the processing entry on DROPPED", () => {
      const request = makeRequest("r1", "PROCESSING");
      const maps = makeMaps(request, undefined, makeProcessing("r1"));

      transitionRequest("r1", { status: "DROPPED" }, maps);

      expect(maps.processing.has("r1")).toBe(false);
    });
  });

  describe("IN_TRANSIT → QUEUED", () => {
    it("updates the request status to QUEUED", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest("r1", { nodeId: "server-1", status: "QUEUED" }, maps);

      expect(maps.requests.get("r1")?.status).toBe("QUEUED");
    });

    it("removes the transit entry", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest("r1", { nodeId: "server-1", status: "QUEUED" }, maps);

      expect(maps.transits.has("r1")).toBe(false);
    });

    it("does not add a processing entry", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest("r1", { nodeId: "server-1", status: "QUEUED" }, maps);

      expect(maps.processing.has("r1")).toBe(false);
    });

    it("appends the edgeId to visitedEdgeIds", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest("r1", { nodeId: "server-1", status: "QUEUED" }, maps);

      expect(maps.requests.get("r1")?.visitedEdgeIds).toStrictEqual(["edge-1"]);
    });

    it("appends the nodeId to visitedNodeIds", () => {
      const request = makeRequest("r1", "IN_TRANSIT");
      const maps = makeMaps(request, makeTransit("r1"));

      transitionRequest("r1", { nodeId: "server-1", status: "QUEUED" }, maps);

      expect(maps.requests.get("r1")?.visitedNodeIds).toStrictEqual(["server-1"]);
    });
  });

  describe("unknown request id", () => {
    it("is a no-op", () => {
      const maps: RequestMaps = {
        processing: new Map(),
        requests: new Map(),
        transits: new Map(),
      };

      transitionRequest("unknown", { status: "FULFILLED" }, maps);

      expect(maps.requests.size).toBe(0);
    });
  });
});
