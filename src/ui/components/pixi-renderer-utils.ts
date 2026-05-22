import { chooseBestHandles, getHandlePosition } from "../../domain/canvas-logic";
import { getBezierControlPoints, sampleCubicBezier } from "./bezier-utils";

const computeNodeFillRatio = (
  nodeId: string,
  capacity: number,
  processing: Map<string, { nodeId: string }>,
): number => {
  if (!isFinite(capacity)) {
    return 0;
  }
  const count = [...processing.values()].filter((p) => p.nodeId === nodeId).length;
  return Math.min(count / capacity, 1);
};

const getTransitDotPosition = (
  transit: { edgeId: string; progress: number },
  edges: { id: string; source: string; target: string }[],
  nodes: { id: string; position: { x: number; y: number } }[],
): { x: number; y: number } | null => {
  const edge = edges.find((e) => e.id === transit.edgeId);
  if (edge === undefined) {
    return null;
  }
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  if (sourceNode === undefined || targetNode === undefined) {
    return null;
  }
  const { sourceHandle, targetHandle } = chooseBestHandles(sourceNode, targetNode);
  const src = getHandlePosition(sourceNode, sourceHandle);
  const tgt = getHandlePosition(targetNode, targetHandle);
  const { cp1, cp2 } = getBezierControlPoints(src, tgt);
  return sampleCubicBezier(transit.progress, { cp1, cp2, p0: src, p3: tgt });
};

export { computeNodeFillRatio, getTransitDotPosition };
