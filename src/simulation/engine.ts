import { COMPONENT_LIBRARY } from "../domain/component-library.js";
import type { ComponentType } from "../domain/component-library.js";
import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import type { FlowConfig, TrafficSnapshot } from "./types.js";

interface ForwardingOptions {
  cacheHitRate: number;
  numChildren: number;
}

const computeForwardedOps = (
  nodeType: ComponentType,
  handledOps: number,
  options: ForwardingOptions,
): number => {
  if (nodeType === "load-balancer") {
    return handledOps / options.numChildren;
  }

  if (nodeType === "cache") {
    return handledOps * (1 - options.cacheHitRate);
  }

  return handledOps;
};

interface LinearTrafficRateParams {
  elapsed: number;
  timeout: number;
  trafficPeak: number;
  trafficStart: number;
}

const getLinearTrafficRate = ({
  elapsed,
  timeout,
  trafficPeak,
  trafficStart,
}: LinearTrafficRateParams): number => {
  if (timeout <= 0) {
    return trafficPeak;
  }

  const progress = Math.min(elapsed / timeout, 1);

  return trafficStart + (trafficPeak - trafficStart) * progress;
};

const MS_PER_SECOND = 1000;

const computeTrafficFlow = (
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  config: FlowConfig,
): TrafficSnapshot => {
  const { cacheHitRate, deltaMs, trafficRate } = config;
  const tickFraction = deltaMs / MS_PER_SECOND;
  const nodeMap = new Map<string, ArchitectureNode>(nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const incoming = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    outgoing.get(e.source)?.push(e.target);
    incoming.get(e.target)?.push(e.source);
  }

  // BFS from Users nodes to establish processing order
  const visited = new Set<string>();
  const order: string[] = [];
  const queue: string[] = nodes.filter((n) => n.componentType === "users").map((n) => n.id);

  while (queue.length > 0) {
    const nodeId = queue.shift();

    if (nodeId === undefined) {
      break;
    }

    if (!visited.has(nodeId)) {
      visited.add(nodeId);
      order.push(nodeId);

      for (const childId of outgoing.get(nodeId) ?? []) {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }
  }

  // Track how much traffic each directed edge carries
  const edgeFlow = new Map<string, number>();
  const snapshot: TrafficSnapshot = {};

  for (const nodeId of nodes.map((n) => n.id)) {
    snapshot[nodeId] = { droppedOps: 0, handledOps: 0, incomingOps: 0 };
  }

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);

    if (node !== undefined) {
      let incomingOps = 0;

      if (node.componentType === "users") {
        incomingOps = trafficRate * tickFraction;
      } else {
        incomingOps = (incoming.get(nodeId) ?? []).reduce(
          (sum, parentId) => sum + (edgeFlow.get(`${parentId}->${nodeId}`) ?? 0),
          0,
        );
      }

      let handledOps = 0;
      let droppedOps = 0;
      const { capacity } = COMPONENT_LIBRARY[node.componentType];
      const capacityPerTick = capacity * tickFraction;

      if (node.componentType === "load-balancer") {
        handledOps = incomingOps;
        droppedOps = 0;
      } else {
        handledOps = Math.min(incomingOps, capacityPerTick);
        droppedOps = Math.max(0, incomingOps - capacityPerTick);
      }

      snapshot[nodeId] = { droppedOps, handledOps, incomingOps };

      const children = outgoing.get(nodeId) ?? [];
      const numChildren = children.length;

      if (numChildren > 0) {
        const forwarded = computeForwardedOps(node.componentType, handledOps, {
          cacheHitRate,
          numChildren,
        });

        for (const childId of children) {
          edgeFlow.set(`${nodeId}->${childId}`, forwarded);
        }
      }
    }
  }

  return snapshot;
};

const hasRunnablePath = (nodes: ArchitectureNode[], edges: ArchitectureEdge[]): boolean => {
  const usersNodeIds = new Set(nodes.filter((n) => n.componentType === "users").map((n) => n.id));

  return edges.some((e) => usersNodeIds.has(e.source));
};

export { computeTrafficFlow, getLinearTrafficRate, hasRunnablePath };
