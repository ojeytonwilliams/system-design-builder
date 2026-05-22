import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import { COMPONENT_LIBRARY } from "../domain/component-library.js";
import { computeTrafficFlow, getLinearTrafficRate } from "./engine.js";
import { requestRouter } from "./request-router.js";
import { spawnRequests } from "./request-spawner.js";
import { EDGE_TRANSIT_INTERNAL_MS, TIME_SCALE } from "./request-types.js";
import type { Processing, SimRequest, Transit } from "./request-types.js";
import { transitionRequest } from "./transition-request.js";
import type { RequestMaps } from "./transition-request.js";
import type { LevelConfig, TrafficSnapshot } from "./types.js";

const VISUAL_TRANSIT_MS = EDGE_TRANSIT_INTERNAL_MS * TIME_SCALE;

const isAtCapacity = (
  node: { componentType: keyof typeof COMPONENT_LIBRARY; id: string },
  processingEntries: { nodeId: string }[],
): boolean => {
  const { capacity } = COMPONENT_LIBRARY[node.componentType];
  return processingEntries.filter((p) => p.nodeId === node.id).length >= capacity;
};

interface SimulationSnapshot {
  currentTrafficRate: number;
  elapsedMs: number;
  nodeStates: TrafficSnapshot;
  processing: Map<string, Processing>;
  requests: Map<string, SimRequest>;
  tickDeltaMs: number;
  transits: Map<string, Transit>;
}

const getInitialSnapshot = (): SimulationSnapshot => ({
  currentTrafficRate: 0,
  elapsedMs: 0,
  nodeStates: {},
  processing: new Map(),
  requests: new Map(),
  tickDeltaMs: 0,
  transits: new Map(),
});

class SimulationEngine {
  private state: SimulationSnapshot = getInitialSnapshot();
  private readonly listeners = new Set<() => void>();
  private graphNodes: ArchitectureNode[] = [];
  private graphEdges: ArchitectureEdge[] = [];
  private config: LevelConfig | null = null;
  private readonly requests = new Map<string, SimRequest>();
  private readonly transits = new Map<string, Transit>();
  private readonly processing = new Map<string, Processing>();
  private pendingSpawns = 0;
  private wallClockElapsedMs = 0;

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
  }

  setConfig(config: LevelConfig): void {
    this.config = config;
  }

  tick(deltaMs: number): void {
    if (this.config === null) {
      return;
    }

    this.wallClockElapsedMs += deltaMs;

    const elapsed = this.state.elapsedMs + deltaMs / 1000;
    const rate = getLinearTrafficRate({
      elapsed,
      timeout: this.config.timeout,
      trafficPeak: this.config.trafficPeak,
      trafficStart: this.config.trafficStart,
    });
    const trafficSnapshot = computeTrafficFlow(this.graphNodes, this.graphEdges, {
      cacheHitRate: this.config.cacheHitRate,
      deltaMs,
      trafficRate: rate,
    });

    const usersNode = this.graphNodes.find((n) => n.componentType === "users");
    const outgoingEdge =
      usersNode === undefined ? undefined : this.graphEdges.find((e) => e.source === usersNode.id);

    if (usersNode !== undefined && outgoingEdge !== undefined) {
      const result = spawnRequests({
        deltaMs,
        outgoingEdgeId: outgoingEdge.id,
        pendingSpawns: this.pendingSpawns,
        trafficRate: rate,
        usersNodeId: usersNode.id,
        wallClockElapsedMs: this.wallClockElapsedMs,
      });
      this.pendingSpawns = result.pendingSpawns;
      for (const req of result.requests) {
        this.requests.set(req.id, req);
      }
      for (const transit of result.transits) {
        this.transits.set(transit.requestId, transit);
      }
    }

    const maps: RequestMaps = {
      processing: this.processing,
      requests: this.requests,
      transits: this.transits,
    };

    this.advanceTransits(deltaMs, maps);
    this.advanceProcessing(deltaMs, maps, this.config.cacheHitRate);

    this.state = {
      currentTrafficRate: rate,
      elapsedMs: elapsed,
      nodeStates: trafficSnapshot,
      processing: this.processing,
      requests: this.requests,
      tickDeltaMs: deltaMs,
      transits: this.transits,
    };
    this.notify();
  }

  reset(): void {
    this.requests.clear();
    this.transits.clear();
    this.processing.clear();
    this.pendingSpawns = 0;
    this.wallClockElapsedMs = 0;
    this.state = getInitialSnapshot();
    this.notify();
  }

  private advanceTransits(deltaMs: number, maps: RequestMaps): void {
    for (const [requestId, transit] of [...this.transits]) {
      const newElapsed = transit.elapsedMs + deltaMs;

      if (newElapsed >= transit.durationMs) {
        const edge = this.graphEdges.find((e) => e.id === transit.edgeId);
        const targetNode =
          edge === undefined ? undefined : this.graphNodes.find((n) => n.id === edge.target);

        if (targetNode === undefined) {
          transitionRequest(requestId, { status: "FULFILLED" }, maps);
        } else {
          const { latencyMs } = COMPONENT_LIBRARY[targetNode.componentType];

          if (isAtCapacity(targetNode, [...maps.processing.values()])) {
            transitionRequest(requestId, { status: "DROPPED" }, maps);
          } else {
            transitionRequest(
              requestId,
              {
                processing: {
                  durationMs: latencyMs * TIME_SCALE,
                  elapsedMs: 0,
                  nodeId: targetNode.id,
                  progress: 0,
                },
                status: "PROCESSING",
              },
              maps,
            );
          }
        }
      } else {
        transit.elapsedMs = newElapsed;
        transit.progress = newElapsed / transit.durationMs;
      }
    }
  }

  private advanceProcessing(deltaMs: number, maps: RequestMaps, cacheHitRate: number): void {
    for (const [requestId, proc] of [...this.processing]) {
      const newElapsed = proc.elapsedMs + deltaMs;

      if (newElapsed >= proc.durationMs) {
        const result = requestRouter(proc.nodeId, {
          cacheHitRate,
          edges: this.graphEdges,
          nodes: this.graphNodes,
        });

        if (result.status === "FULFILLED") {
          transitionRequest(requestId, { status: "FULFILLED" }, maps);
        } else {
          transitionRequest(
            requestId,
            {
              status: "IN_TRANSIT",
              transit: {
                durationMs: VISUAL_TRANSIT_MS,
                edgeId: result.edgeId,
                elapsedMs: 0,
                progress: 0,
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

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export { isAtCapacity, SimulationEngine };
export type { SimulationSnapshot };
