import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { COMPONENT_LIBRARY, CONNECTION_LIBRARY } from "../domain/component-library.js";
import type { ComponentType, ConnectionLibrary } from "../domain/component-library.js";
import { getLinearTrafficRate } from "./engine.js";
import { computeDeliveryOpsPerMs, computeNodeMetrics, evictWindow, pushEvent } from "./metrics.js";
import type { MetricsWindow, NodeMetricsSnapshot } from "./metrics.js";
import { NodeRouter } from "./node-router.js";
import { getRoutingOptions } from "./request-router.js";
import { spawnRequests } from "./request-spawner.js";
import type {
  Processing,
  ResponseTransit,
  SimRequest,
  SimResponse,
  Transit,
} from "./request-types.js";
import { transitionRequest } from "./transition-request.js";
import type { RequestMaps } from "./transition-request.js";
import type { LevelConfig } from "./types.js";

type SimComponentLibrary = Record<ComponentType, { latencyMs: number }>;

interface SimulationSnapshot {
  currentTrafficRate: number;
  deliveryOpsPerMs: number;
  elapsedMs: number;
  nodeMetrics: NodeMetricsSnapshot;
  nodeQueues: Map<string, string[]>;
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
  nodeQueues: new Map(),
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
  private readonly nodeQueues = new Map<string, string[]>();
  private readonly nodeExcessTime = new Map<string, number>();
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
    evictWindow(this.metricsWindow, this.wallClockElapsedMs);

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

    const usersNodeId = usersNode?.id ?? "";

    this.advanceTransits(deltaMs, maps);
    this.advanceProcessing(deltaMs, maps, this.config.cacheHitRate);
    this.drainQueues(maps);
    this.advanceResponseTransits(deltaMs, usersNodeId);

    if (usersNode !== undefined && outgoingEdge !== undefined) {
      const result = spawnRequests({
        deltaMs,
        edgeTransitMs: this.connectionLibrary.standard.transitMs,
        firstSpawnTime: this.nextSpawn,
        outgoingEdgeId: outgoingEdge.id,
        trafficRate: rate,
        usersNodeId: usersNode.id,
      });
      this.nextSpawn = result.nextSpawn;
      for (const req of result.requests) {
        this.requests.set(req.id, req);
      }
      for (const transit of result.transits) {
        this.transits.set(transit.requestId, transit);
      }
    }

    const nodeCapacities = new Map(
      this.graphNodes.map((n) => {
        const { latencyMs } = this.componentLibrary[n.componentType];
        return [n.id, latencyMs === 0 ? Infinity : 1 / latencyMs];
      }),
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
      nodeQueues: this.nodeQueues,
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
    this.nodeQueues.clear();
    this.nodeExcessTime.clear();
    this.nextSpawn = 0;
    this.wallClockElapsedMs = 0;
    this.metricsWindow = new Map();
    this.nodeRouters.clear();
    this.state = getInitialSnapshot();
    this.notify();
  }

  private advanceTransits(deltaMs: number, maps: RequestMaps): void {
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
          transitionRequest(requestId, { nodeId: targetNode.id, status: "QUEUED" }, maps);

          const queue = this.nodeQueues.get(targetNode.id);
          if (queue === undefined) {
            this.nodeQueues.set(targetNode.id, [requestId]);
          } else {
            queue.push(requestId);
          }

          pushEvent(
            this.metricsWindow,
            targetNode.id,
            "arrival",
            this.wallClockElapsedMs - excessTime,
          );
        }
      } else {
        transit.elapsedMs = newElapsed;
        transit.progress = newElapsed / transit.durationMs;
      }
    }
  }

  private advanceProcessing(deltaMs: number, maps: RequestMaps, cacheHitRate: number): void {
    this.nodeExcessTime.clear();
    for (const [requestId, proc] of [...this.processing]) {
      const newElapsed = proc.elapsedMs + deltaMs;

      const excessTime = newElapsed - proc.durationMs;

      if (excessTime >= 0) {
        this.nodeExcessTime.set(proc.nodeId, excessTime);
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

        pushEvent(
          this.metricsWindow,
          proc.nodeId,
          "completion",
          this.wallClockElapsedMs - excessTime,
        );

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

  private drainQueues(maps: RequestMaps): void {
    for (const [nodeId, queue] of this.nodeQueues) {
      if (queue.length > 0) {
        const node = this.graphNodes.find((n) => n.id === nodeId);
        if (node === undefined) {
          throw new Error(
            `drainQueues: node "${nodeId}" has ${queue.length} queued request(s) but does not exist in graphNodes`,
          );
        }

        const { latencyMs } = this.componentLibrary[node.componentType];

        if (latencyMs === 0) {
          while (queue.length > 0) {
            const requestId = queue.shift()!;
            transitionRequest(
              requestId,
              {
                processing: {
                  durationMs: 0,
                  elapsedMs: 0,
                  nodeId,
                  progress: 1,
                },
                status: "PROCESSING",
              },
              maps,
            );
          }
        } else {
          const isProcessing = [...this.processing.values()].some((p) => p.nodeId === nodeId);
          if (!isProcessing) {
            const requestId = queue.shift()!;
            const excessTime = this.nodeExcessTime.get(nodeId) ?? 0;
            transitionRequest(
              requestId,
              {
                processing: {
                  durationMs: latencyMs,
                  elapsedMs: excessTime,
                  nodeId,
                  progress: excessTime / latencyMs,
                },
                status: "PROCESSING",
              },
              maps,
            );
          }
        }
      }
    }
  }

  private advanceResponseTransits(deltaMs: number, usersNodeId: string): void {
    for (const [responseId, transit] of [...this.responseTransits]) {
      const newElapsed = transit.elapsedMs + deltaMs;

      const excessTime = newElapsed - transit.durationMs;

      if (excessTime >= 0) {
        this.responseTransits.delete(responseId);
        this.completeResponseTransit(responseId, excessTime, usersNodeId);
      } else {
        transit.elapsedMs = newElapsed;
        transit.progress = newElapsed / transit.durationMs;
      }
    }
  }

  private completeResponseTransit(
    responseId: string,
    excessTime: number,
    usersNodeId: string,
  ): void {
    const response = this.responses.get(responseId);
    if (response === undefined) {
      return;
    }

    const [nextEdgeId, ...remaining] = response.remainingEdgeIds;

    if (nextEdgeId === undefined) {
      this.responses.delete(responseId);
      if (usersNodeId !== "") {
        pushEvent(
          this.metricsWindow,
          usersNodeId,
          "delivery",
          this.wallClockElapsedMs - excessTime,
        );
      }
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

export { SimulationEngine, TICK_INTERVAL_MS };
export type { SimulationSnapshot };
