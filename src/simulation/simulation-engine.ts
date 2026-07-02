import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { COMPONENT_LIBRARY, CONNECTION_LIBRARY } from "../domain/component-library.js";
import type { ComponentType, ConnectionLibrary } from "../domain/component-library.js";
import { getLinearTrafficRate } from "./engine.js";
import { addBucket, computeDeliveryOpsPerMs, computeNodeMetrics } from "./metrics.js";
import type { MetricsWindow, NodeEventCounts, NodeMetricsSnapshot } from "./metrics.js";
import { NodeRouter } from "./node-router.js";
import { getRoutingOptions } from "./request-router.js";
import { spawnRequests } from "./request-spawner.js";
import type {
  Processing,
  RequestStatus,
  ResponseTransit,
  SimRequest,
  SimResponse,
  Transit,
} from "./request-types.js";
import { transitionRequest } from "./transition-request.js";
import type { RequestMaps } from "./transition-request.js";
import type { LevelConfig } from "./types.js";

type SimComponentLibrary = Record<ComponentType, { capacity: number; latencyMs: number }>;

const REQUEST_TIMEOUT_MS = 10_000;

const shouldTimeOut = (
  request: { spawnedAtSimMs: number; status: RequestStatus },
  wallClockMs: number,
  timeoutMs: number,
): boolean => {
  if (
    request.status === "FULFILLED" ||
    request.status === "DROPPED" ||
    request.status === "TIMED_OUT"
  ) {
    return false;
  }
  return wallClockMs - request.spawnedAtSimMs >= timeoutMs;
};

interface SimulationSnapshot {
  currentTrafficRate: number;
  deliveryOpsPerMs: number;
  elapsedMs: number;
  nodeMetrics: NodeMetricsSnapshot;
  prevResponseTransitProgresses: Map<string, number>;
  prevTransitProgresses: Map<string, number>;
  processing: Map<string, Processing>;
  requests: Map<string, SimRequest>;
  responses: Map<string, SimResponse>;
  responseTransits: Map<string, ResponseTransit>;
  tickDeltaMs: number;
  transits: Map<string, Transit>;
}

const getInitialSnapshot = (): SimulationSnapshot => ({
  currentTrafficRate: 0,
  deliveryOpsPerMs: 0,
  elapsedMs: 0,
  nodeMetrics: new Map(),
  prevResponseTransitProgresses: new Map(),
  prevTransitProgresses: new Map(),
  processing: new Map(),
  requests: new Map(),
  responseTransits: new Map(),
  responses: new Map(),
  tickDeltaMs: 0,
  transits: new Map(),
});

class SimulationEngine {
  private readonly componentLibrary: SimComponentLibrary;
  private readonly connectionLibrary: ConnectionLibrary;
  private state: SimulationSnapshot = getInitialSnapshot();
  private readonly listeners = new Set<() => void>();

  constructor(
    componentLibrary: SimComponentLibrary = COMPONENT_LIBRARY,
    connectionLibrary: ConnectionLibrary = CONNECTION_LIBRARY,
  ) {
    this.componentLibrary = componentLibrary;
    this.connectionLibrary = connectionLibrary;
  }
  private graphNodes: ArchitectureNode[] = [];
  private graphEdges: ArchitectureEdge[] = [];
  private config: LevelConfig | null = null;
  private readonly requests = new Map<string, SimRequest>();
  private readonly transits = new Map<string, Transit>();
  private readonly processing = new Map<string, Processing>();
  private readonly responses = new Map<string, SimResponse>();
  private readonly responseTransits = new Map<string, ResponseTransit>();
  private nextSpawn = 0;
  private wallClockElapsedMs = 0;
  private metricsWindow: MetricsWindow = new Map();
  private readonly nodeRouters = new Map<string, NodeRouter>();

  getSnapshot = (): SimulationSnapshot => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setGraph(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): void {
    this.graphNodes = nodes;
    this.graphEdges = edges;
    this.nodeRouters.clear();
  }

  setConfig(config: LevelConfig): void {
    this.config = config;
  }

  tick(deltaMs: number): void {
    if (this.config === null) {
      return;
    }

    const prevTransitProgresses = new Map<string, number>();
    for (const [id, t] of this.transits) {
      prevTransitProgresses.set(id, t.progress);
    }
    const prevResponseTransitProgresses = new Map<string, number>();
    for (const [id, rt] of this.responseTransits) {
      prevResponseTransitProgresses.set(id, rt.progress);
    }

    this.wallClockElapsedMs += deltaMs;

    const elapsed = this.state.elapsedMs + deltaMs;
    const rate = getLinearTrafficRate({
      elapsed,
      timeout: this.config.timeout,
      trafficPeak: this.config.trafficPeak,
      trafficStart: this.config.trafficStart,
    });

    const usersNode = this.graphNodes.find((n) => n.componentType === "users");
    const outgoingEdge =
      usersNode === undefined ? undefined : this.graphEdges.find((e) => e.source === usersNode.id);

    const maps: RequestMaps = {
      processing: this.processing,
      requests: this.requests,
      transits: this.transits,
    };

    const tickEvents = new Map<string, NodeEventCounts>();
    const usersNodeId = usersNode?.id ?? "";

    this.advanceTransits(deltaMs, maps, tickEvents);
    this.advanceProcessing(deltaMs, maps, this.config.cacheHitRate, tickEvents);
    this.advanceResponseTransits(deltaMs, tickEvents, usersNodeId);
    this.timeoutRequests(maps);

    if (usersNode !== undefined && outgoingEdge !== undefined) {
      const result = spawnRequests({
        deltaMs,
        edgeTransitMs: this.connectionLibrary.standard.transitMs,
        firstSpawnTime: this.nextSpawn,
        outgoingEdgeId: outgoingEdge.id,
        trafficRate: rate,
        usersNodeId: usersNode.id,
        wallClockElapsedMs: this.wallClockElapsedMs,
      });
      this.nextSpawn = result.nextSpawn;
      for (const req of result.requests) {
        this.requests.set(req.id, req);
      }
      for (const transit of result.transits) {
        this.transits.set(transit.requestId, transit);
      }
    }

    this.metricsWindow = addBucket(this.metricsWindow, {
      nodeEvents: tickEvents,
      wallClockMs: this.wallClockElapsedMs,
    });

    const nodeCapacities = new Map(
      this.graphNodes.map((n) => [n.id, this.componentLibrary[n.componentType].capacity]),
    );
    const rawMetrics = computeNodeMetrics(this.metricsWindow, nodeCapacities);
    const nodeMetrics: NodeMetricsSnapshot = new Map(
      this.graphNodes.map((n) => [
        n.id,
        rawMetrics.get(n.id) ?? { incomingOpsPerMs: 0, isOverloaded: false, opsPerMs: 0 },
      ]),
    );
    const deliveryOpsPerMs = computeDeliveryOpsPerMs(this.metricsWindow, usersNodeId);

    this.state = {
      currentTrafficRate: rate,
      deliveryOpsPerMs,
      elapsedMs: elapsed,
      nodeMetrics,
      prevResponseTransitProgresses,
      prevTransitProgresses,
      processing: this.processing,
      requests: this.requests,
      responseTransits: this.responseTransits,
      responses: this.responses,
      tickDeltaMs: deltaMs,
      transits: this.transits,
    };
    this.notify();
  }

  reset(): void {
    this.requests.clear();
    this.transits.clear();
    this.processing.clear();
    this.responses.clear();
    this.responseTransits.clear();
    this.nextSpawn = 0;
    this.wallClockElapsedMs = 0;
    this.metricsWindow = new Map();
    this.nodeRouters.clear();
    this.state = getInitialSnapshot();
    this.notify();
  }

  private advanceTransits(
    deltaMs: number,
    maps: RequestMaps,
    tickEvents: Map<string, NodeEventCounts>,
  ): void {
    for (const [requestId, transit] of [...this.transits]) {
      const newElapsed = transit.elapsedMs + deltaMs;

      const excessTime = newElapsed - transit.durationMs;

      if (excessTime >= 0) {
        const edge = this.graphEdges.find((e) => e.id === transit.edgeId);
        const targetNode =
          edge === undefined ? undefined : this.graphNodes.find((n) => n.id === edge.target);

        if (targetNode === undefined) {
          transitionRequest(requestId, { status: "FULFILLED" }, maps);
        } else {
          const { latencyMs } = this.componentLibrary[targetNode.componentType];

          transitionRequest(
            requestId,
            {
              processing: {
                durationMs: latencyMs,
                elapsedMs: excessTime,
                nodeId: targetNode.id,
                progress: excessTime / latencyMs,
              },
              status: "PROCESSING",
            },
            maps,
          );

          const existing = tickEvents.get(targetNode.id) ?? {
            arrivalCount: 0,
            completedCount: 0,
            deliveryCount: 0,
          };
          tickEvents.set(targetNode.id, {
            ...existing,
            arrivalCount: existing.arrivalCount + 1,
          });
        }
      } else {
        transit.elapsedMs = newElapsed;
        transit.progress = newElapsed / transit.durationMs;
      }
    }
  }

  private advanceProcessing(
    deltaMs: number,
    maps: RequestMaps,
    cacheHitRate: number,
    tickEvents: Map<string, NodeEventCounts>,
  ): void {
    for (const [requestId, proc] of [...this.processing]) {
      const newElapsed = proc.elapsedMs + deltaMs;

      const excessTime = newElapsed - proc.durationMs;

      if (excessTime >= 0) {
        const node = this.graphNodes.find((n) => n.id === proc.nodeId);
        const outgoingEdges = this.graphEdges.filter((e) => e.source === proc.nodeId);
        const options =
          node === undefined
            ? []
            : getRoutingOptions(node.componentType, outgoingEdges, cacheHitRate);
        let router = this.nodeRouters.get(proc.nodeId);
        if (router === undefined) {
          router = new NodeRouter(options);
          this.nodeRouters.set(proc.nodeId, router);
        }
        const result = router.route();

        const existing = tickEvents.get(proc.nodeId) ?? {
          arrivalCount: 0,
          completedCount: 0,
          deliveryCount: 0,
        };
        tickEvents.set(proc.nodeId, {
          ...existing,
          completedCount: existing.completedCount + 1,
        });

        if (result.status === "FULFILLED") {
          transitionRequest(requestId, { status: "FULFILLED" }, maps);
          this.spawnResponse(requestId, maps);
        } else {
          transitionRequest(
            requestId,
            {
              status: "IN_TRANSIT",
              transit: {
                durationMs: this.connectionLibrary.standard.transitMs,
                edgeId: result.edgeId,
                elapsedMs: excessTime,
                progress: excessTime / this.connectionLibrary.standard.transitMs,
              },
            },
            maps,
          );
        }
      } else {
        proc.elapsedMs = newElapsed;
        proc.progress = newElapsed / proc.durationMs;
      }
    }
  }

  private timeoutRequests(maps: RequestMaps): void {
    for (const [requestId, request] of [...this.requests]) {
      if (shouldTimeOut(request, this.wallClockElapsedMs, REQUEST_TIMEOUT_MS)) {
        transitionRequest(requestId, { status: "TIMED_OUT" }, maps);
      }
    }
  }

  private advanceResponseTransits(
    deltaMs: number,
    tickEvents: Map<string, NodeEventCounts>,
    usersNodeId: string,
  ): void {
    for (const [responseId, transit] of [...this.responseTransits]) {
      const newElapsed = transit.elapsedMs + deltaMs;

      if (newElapsed >= transit.durationMs) {
        this.responseTransits.delete(responseId);

        const response = this.responses.get(responseId);
        if (response !== undefined) {
          const [nextEdgeId, ...remaining] = response.remainingEdgeIds;

          if (nextEdgeId === undefined) {
            this.responses.delete(responseId);
            this.recordDelivery(tickEvents, usersNodeId);
          } else {
            response.remainingEdgeIds = remaining;
            this.responseTransits.set(responseId, {
              durationMs: this.connectionLibrary.standard.transitMs,
              edgeId: nextEdgeId,
              elapsedMs: 0,
              progress: 0,
              responseId,
            });
          }
        }
      } else {
        transit.elapsedMs = newElapsed;
        transit.progress = newElapsed / transit.durationMs;
      }
    }
  }

  private recordDelivery(tickEvents: Map<string, NodeEventCounts>, usersNodeId: string): void {
    if (usersNodeId === "") {
      return;
    }
    const existing = tickEvents.get(usersNodeId) ?? {
      arrivalCount: 0,
      completedCount: 0,
      deliveryCount: 0,
    };
    tickEvents.set(usersNodeId, {
      ...existing,
      deliveryCount: existing.deliveryCount + 1,
    });
  }

  private spawnResponse(requestId: string, maps: RequestMaps): void {
    const request = maps.requests.get(requestId);
    if (request === undefined || request.visitedEdgeIds.length === 0) {
      return;
    }

    const reversed = [...request.visitedEdgeIds].reverse();
    const [firstEdgeId] = reversed;
    if (firstEdgeId === undefined) {
      return;
    }

    const responseId = crypto.randomUUID();
    this.responses.set(responseId, {
      id: responseId,
      remainingEdgeIds: reversed.slice(1),
      requestId,
      status: "IN_TRANSIT",
    });
    this.responseTransits.set(responseId, {
      durationMs: this.connectionLibrary.standard.transitMs,
      edgeId: firstEdgeId,
      elapsedMs: 0,
      progress: 0,
      responseId,
    });
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

const TICK_INTERVAL_MS = 1000 / 60;

export { shouldTimeOut, SimulationEngine, TICK_INTERVAL_MS };
export type { SimulationSnapshot };
