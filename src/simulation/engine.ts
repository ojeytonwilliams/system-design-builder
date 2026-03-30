import type {
  FlowConfig,
  GraphEdge,
  GraphNode,
  RevenueConfig,
  TrafficScheduleEntry,
  TrafficSnapshot,
} from "./types.js";
import type { ComponentType } from "../components/component-library.js";

const REVENUE_PER_REQUEST = 0.1;

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

const getTrafficRate = (schedule: TrafficScheduleEntry[], elapsedSeconds: number): number => {
  let rate = 0;

  for (const entry of schedule) {
    if (entry.startTime <= elapsedSeconds) {
      rate = entry.opsPerSec;
    }
  }

  return rate;
};

const computeTrafficFlow = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: FlowConfig,
): TrafficSnapshot => {
  const { cacheHitRate, trafficRate } = config;
  const nodeMap = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const incoming = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    outgoing.get(e.source)?.push(e.target);
    incoming.get(e.target)?.push(e.source);
  }

  // BFS from Users nodes to establish processing order
  const visited = new Set<string>();
  const order: string[] = [];
  const queue: string[] = nodes.filter((n) => n.type === "users").map((n) => n.id);

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
      let incomingOps: number;

      if (node.type === "users") {
        incomingOps = trafficRate;
      } else {
        incomingOps = (incoming.get(nodeId) ?? []).reduce(
          (sum, parentId) => sum + (edgeFlow.get(`${parentId}->${nodeId}`) ?? 0),
          0,
        );
      }

      let handledOps: number;
      let droppedOps: number;

      if (node.type === "load-balancer") {
        handledOps = incomingOps;
        droppedOps = 0;
      } else {
        handledOps = Math.min(incomingOps, node.capacity);
        droppedOps = Math.max(0, incomingOps - node.capacity);
      }

      snapshot[nodeId] = { droppedOps, handledOps, incomingOps };

      const children = outgoing.get(nodeId) ?? [];
      const numChildren = children.length;

      if (numChildren > 0) {
        const forwarded = computeForwardedOps(node.type, handledOps, {
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

const computeRevenue = (
  snapshot: TrafficSnapshot,
  nodes: GraphNode[],
  config: RevenueConfig,
): number => {
  const { cacheHitRate, edges } = config;
  const sourceNodeIds = new Set(edges.map((e) => e.source));
  let total = 0;

  for (const node of nodes) {
    const state = snapshot[node.id];

    if (state !== undefined) {
      if (node.type === "cache") {
        // Cache hits are served from cache and count as completed requests
        total += state.handledOps * cacheHitRate;
      } else if (
        node.type !== "users" &&
        node.type !== "load-balancer" &&
        !sourceNodeIds.has(node.id)
      ) {
        // Sink nodes represent the final handler of a request
        total += state.handledOps;
      }
    }
  }

  return total * REVENUE_PER_REQUEST;
};

const hasRunnablePath = (nodes: GraphNode[], edges: GraphEdge[]): boolean => {
  const usersNodeIds = new Set(nodes.filter((n) => n.type === "users").map((n) => n.id));

  return edges.some((e) => usersNodeIds.has(e.source));
};

export { REVENUE_PER_REQUEST, computeRevenue, computeTrafficFlow, getTrafficRate, hasRunnablePath };
