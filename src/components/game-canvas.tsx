import { Background, BackgroundVariant, BaseEdge, ReactFlow, getBezierPath } from "@xyflow/react";
import type { CSSProperties, DragEvent, ReactElement } from "react";
import type { Edge, EdgeProps, Node, NodeMouseHandler, NodeProps } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";

const GRID_SIZE = 48;
const BACKGROUND_GAP = 24;
const BACKGROUND_SIZE = 0.8;
const CANVAS_BACKGROUND = "#f8f5ec";
const NODE_WIDTH = 88;
const NODE_MIN_HEIGHT = 96;
const CANVAS_COMPONENT_LIBRARY = {
  cache: {
    accentColor: "#d9a65b",
    icon: "⚡",
    label: "Cache",
  },
  db: {
    accentColor: "#5f8ca8",
    icon: "🛢️",
    label: "DB",
  },
  "load-balancer": {
    accentColor: "#7f6bd8",
    icon: "⇄",
    label: "Load Balancer",
  },
  server: {
    accentColor: "#4f8f73",
    icon: "🖥️",
    label: "Server",
  },
  users: {
    accentColor: "#e5634d",
    icon: "👥",
    label: "Users",
  },
} as const;

type ComponentType = keyof typeof CANVAS_COMPONENT_LIBRARY;

interface Point {
  x: number;
  y: number;
}

type ArchitectureNodeData = Record<string, unknown> & {
  componentType: ComponentType;
  icon?: string;
  isSelected?: boolean;
  label: string;
};

type ArchitectureCanvasNode = Node<ArchitectureNodeData, "architecture">;

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

interface GameCanvasProps {
  initialEdges?: Edge[];
  initialNodes?: ArchitectureCanvasNode[];
}

const canvasDropzoneStyles: CSSProperties = {
  background: "radial-gradient(circle at 1px 1px, rgba(26, 39, 68, 0.11) 1px, transparent 0)",
  backgroundColor: CANVAS_BACKGROUND,
  backgroundPosition: "center",
  backgroundSize: `${BACKGROUND_GAP}px ${BACKGROUND_GAP}px`,
  height: "100%",
  width: "100%",
};

const isComponentType = (value: string): value is ComponentType =>
  Object.hasOwn(CANVAS_COMPONENT_LIBRARY, value);

const snapPositionToGrid = ({ x, y }: Point): Point => ({
  x: Math.round(x / GRID_SIZE) * GRID_SIZE,
  y: Math.round(y / GRID_SIZE) * GRID_SIZE,
});

const createNodeData = (componentType: ComponentType, isSelected = false): ArchitectureNodeData => {
  const componentDefinition = CANVAS_COMPONENT_LIBRARY[componentType];

  return {
    componentType,
    icon: componentDefinition.icon,
    isSelected,
    label: componentDefinition.label,
  };
};

const withDefaultNodeShape = (node: ArchitectureCanvasNode): ArchitectureCanvasNode => ({
  ...node,
  data: {
    ...createNodeData(node.data.componentType, node.data.isSelected),
    ...node.data,
  },
  type: "architecture",
});

const withDefaultEdgeShape = (edge: Edge): Edge => ({
  ...edge,
  animated: true,
  type: "architecture-edge",
});

const setSelectedNode = (
  nodes: ArchitectureCanvasNode[],
  selectedNodeId: string | null,
): ArchitectureCanvasNode[] =>
  nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      isSelected: node.id === selectedNodeId,
    },
  }));

const getNextNodeId = (componentType: ComponentType, nodes: ArchitectureCanvasNode[]): string => {
  const nextIndex = nodes.filter((node) => node.data.componentType === componentType).length + 1;

  return `${componentType}-${nextIndex}`;
};

const removeNodeAndConnections = (
  nodeId: string,
  nodes: ArchitectureCanvasNode[],
  edges: Edge[],
) => ({
  edges: edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
  nodes: nodes.filter((node) => node.id !== nodeId),
});

const ArchitectureNode = ({ data, id }: NodeProps<ArchitectureCanvasNode>) => {
  const { accentColor } = CANVAS_COMPONENT_LIBRARY[data.componentType];
  const isSelected = data.isSelected === true;
  let backgroundColor = "#fffdf8";
  let borderColor = "#1a2744";
  let boxShadow = "0 10px 25px rgba(26, 39, 68, 0.08)";

  if (isSelected) {
    backgroundColor = "#fff3ea";
    borderColor = "#e5634d";
    boxShadow = "0 0 0 4px rgba(229, 99, 77, 0.12)";
  }

  return (
    <div
      data-component-type={data.componentType}
      data-testid={`canvas-node-${id}`}
      style={{
        alignItems: "center",
        background: backgroundColor,
        border: `2px solid ${borderColor}`,
        borderRadius: "1rem",
        boxShadow,
        color: "#1a2744",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        justifyContent: "center",
        minHeight: `${NODE_MIN_HEIGHT}px`,
        padding: "0.875rem 0.75rem 0.75rem",
        textAlign: "center",
        width: `${NODE_WIDTH}px`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          alignItems: "center",
          background: `${accentColor}22`,
          borderRadius: "999px",
          display: "inline-flex",
          fontSize: "1.5rem",
          height: "2.5rem",
          justifyContent: "center",
          width: "2.5rem",
        }}
      >
        {data.icon}
      </span>
      <span style={{ fontSize: "0.9rem", fontWeight: 700, lineHeight: 1.2 }}>{data.label}</span>
    </div>
  );
};

const ArchitectureEdge = ({
  id,
  markerEnd,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  const isSelected = selected === true;
  let stroke = "#7b8cb2";
  let strokeWidth = 2;
  let edgeElement: ReactElement;

  if (isSelected) {
    stroke = "#e5634d";
    strokeWidth = 3;
  }

  if (markerEnd === undefined) {
    edgeElement = (
      <BaseEdge
        path={edgePath}
        style={{
          opacity: 0.9,
          stroke,
          strokeWidth,
        }}
      />
    );
  } else {
    edgeElement = (
      <BaseEdge
        markerEnd={markerEnd}
        path={edgePath}
        style={{
          opacity: 0.9,
          stroke,
          strokeWidth,
        }}
      />
    );
  }

  return <g data-testid={`canvas-edge-${id}`}>{edgeElement}</g>;
};

const nodeTypes = { architecture: ArchitectureNode };
const edgeTypes = { "architecture-edge": ArchitectureEdge };

const GameCanvas = ({ initialEdges = [], initialNodes = [] }: GameCanvasProps) => {
  const [nodes, setNodes] = useState<ArchitectureCanvasNode[]>(() =>
    initialNodes.map(withDefaultNodeShape),
  );
  const [edges, setEdges] = useState<Edge[]>(() => initialEdges.map(withDefaultEdgeShape));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    setNodes((currentNodes) => setSelectedNode(currentNodes, selectedNodeId));
  }, [selectedNodeId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" || selectedNodeId === null) {
        return;
      }

      setNodes((currentNodes) => {
        const nextState = removeNodeAndConnections(selectedNodeId, currentNodes, edges);

        setEdges(nextState.edges);

        return setSelectedNode(nextState.nodes, null);
      });
      setSelectedNodeId(null);
      setContextMenu(null);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [edges, selectedNodeId]);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const componentType = event.dataTransfer.getData("application/component-type");

    if (!isComponentType(componentType)) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const position = snapPositionToGrid({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    setNodes((currentNodes) => {
      const nodeId = getNextNodeId(componentType, currentNodes);
      const nextNode: ArchitectureCanvasNode = {
        data: createNodeData(componentType),
        id: nodeId,
        position,
        type: "architecture",
      };

      return [...setSelectedNode(currentNodes, null), nextNode];
    });
    setSelectedNodeId(null);
    setContextMenu(null);
  };

  const handleNodeClick: NodeMouseHandler<ArchitectureCanvasNode> = (_event, node) => {
    setSelectedNodeId(node.id);
    setContextMenu(null);
  };

  const handleNodeContextMenu: NodeMouseHandler<ArchitectureCanvasNode> = (event, node) => {
    event.preventDefault();
    setSelectedNodeId(node.id);
    setContextMenu({
      nodeId: node.id,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleNodeDragStop: NodeMouseHandler<ArchitectureCanvasNode> = (_event, draggedNode) => {
    const snappedPosition = snapPositionToGrid(draggedNode.position);

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== draggedNode.id) {
          return node;
        }

        return {
          ...node,
          position: snappedPosition,
        };
      }),
    );
  };

  const handlePaneClick = () => {
    setContextMenu(null);
    setSelectedNodeId(null);
  };

  const handleRemoveFromMenu = () => {
    if (contextMenu === null) {
      return;
    }

    setNodes((currentNodes) => {
      const nextState = removeNodeAndConnections(contextMenu.nodeId, currentNodes, edges);

      setEdges(nextState.edges);

      return setSelectedNode(nextState.nodes, null);
    });
    setSelectedNodeId(null);
    setContextMenu(null);
  };

  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 1 }), []);
  let contextMenuElement: ReactElement | null = null;

  if (contextMenu !== null) {
    contextMenuElement = (
      <div
        style={{
          left: `${contextMenu.x}px`,
          position: "absolute",
          top: `${contextMenu.y}px`,
          zIndex: 10,
        }}
      >
        <button
          onClick={handleRemoveFromMenu}
          style={{
            background: "#1a2744",
            border: "none",
            borderRadius: "0.625rem",
            color: "#f5f5f0",
            cursor: "pointer",
            padding: "0.6rem 0.9rem",
          }}
          type="button"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div data-testid="game-canvas" style={{ height: "100%", position: "relative", width: "100%" }}>
      <div
        data-testid="game-canvas-dropzone"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={canvasDropzoneStyles}
      >
        <ReactFlow<ArchitectureCanvasNode>
          defaultViewport={defaultViewport}
          edgeTypes={edgeTypes}
          edges={edges}
          fitView={false}
          maxZoom={1}
          minZoom={1}
          nodeTypes={nodeTypes}
          nodes={nodes}
          nodesDraggable
          onNodeClick={handleNodeClick}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={handlePaneClick}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            color="rgba(26, 39, 68, 0.18)"
            gap={BACKGROUND_GAP}
            size={BACKGROUND_SIZE}
            variant={BackgroundVariant.Dots}
          />
        </ReactFlow>
      </div>

      {contextMenuElement}
    </div>
  );
};

export { GameCanvas, snapPositionToGrid };
