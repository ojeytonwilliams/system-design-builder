import { extend } from "@pixi/react";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import { useCallback } from "react";
import { COMPONENT_LIBRARY } from "./component-library.js";
import { NODE_MIN_HEIGHT, NODE_WIDTH } from "./canvas-logic.js";
import type { HandleSide, PixiNode } from "./canvas-logic.js";

// oxlint-disable-next-line jest/require-hook
extend({ Container, Graphics, Text });

const PORT_HIT_SIZE = 44;
const HANDLE_RADIUS = PORT_HIT_SIZE / 2;
const HANDLE_DOT_RADIUS = 4;

interface HandleProps {
  isPendingConnection: boolean;
  kind: "source" | "target";
  onHandleClick: (side: HandleSide, kind: "source" | "target") => void;
  side: HandleSide;
  x: number;
  y: number;
}

const HandleGraphic = ({ x, y, side, kind, isPendingConnection, onHandleClick }: HandleProps) => {
  const draw = useCallback((g: Graphics) => {
    g.clear();
    g.circle(0, 0, HANDLE_RADIUS);
    g.fill({ alpha: 0, color: 0x000000 });
    g.circle(0, 0, HANDLE_DOT_RADIUS);
    g.fill({ color: 0x7b8cb2 });
  }, []);

  return (
    <pixiGraphics
      cursor="crosshair"
      draw={draw}
      eventMode="static"
      onClick={(e: FederatedPointerEvent) => {
        e.stopPropagation();
      }}
      onPointerDown={(e: FederatedPointerEvent) => {
        e.stopPropagation();
        if (kind === "source") {
          onHandleClick(side, kind);
        }
      }}
      onPointerUp={(e: FederatedPointerEvent) => {
        if (isPendingConnection) {
          e.stopPropagation();
          if (kind === "target") {
            onHandleClick(side, kind);
          }
        }
      }}
      x={x}
      y={y}
    />
  );
};

interface PixiNodeProps {
  containerRefs: { current: Map<string, Container> };
  isLocked: boolean;
  isOverloaded: boolean;
  isPendingConnection: boolean;
  isSelected: boolean;
  node: PixiNode;
  onContextMenu: (nodeId: string, pos: { clientX: number; clientY: number }) => void;
  onHandleClick: (nodeId: string, side: HandleSide, kind: "source" | "target") => void;
  onPointerDown: (nodeId: string, e: FederatedPointerEvent) => void;
  onSelect: (nodeId: string) => void;
}

const PixiNodeGraphic = ({
  node,
  containerRefs,
  isSelected,
  isOverloaded,
  isLocked,
  isPendingConnection,
  onSelect,
  onPointerDown,
  onHandleClick,
  onContextMenu,
}: PixiNodeProps) => {
  const handleRef = useCallback(
    (c: Container | null) => {
      if (c === null) {
        containerRefs.current.delete(node.id);
      } else {
        containerRefs.current.set(node.id, c);
      }
    },
    [node.id, containerRefs],
  );
  const def = COMPONENT_LIBRARY[node.data.componentType];
  const { accentColor } = def;

  let fillColor = 0xfffdf8;
  let borderColor = 0x1a2744;
  let borderWidth = 2;

  if (isSelected) {
    fillColor = 0xfff3ea;
    borderColor = 0xe5634d;
  }
  if (isOverloaded) {
    fillColor = 0xffe4dd;
    borderColor = 0xe5634d;
    borderWidth = 3;
  }

  const drawBackground = useCallback(
    (g: Graphics) => {
      g.clear();
      if (isOverloaded) {
        g.roundRect(-3, -3, NODE_WIDTH + 6, NODE_MIN_HEIGHT + 6, 18);
        g.stroke({ alpha: 0.5, color: 0xe5634d, width: borderWidth + 6 });
      }
      g.roundRect(0, 0, NODE_WIDTH, NODE_MIN_HEIGHT, 16);
      g.fill({ color: fillColor });
      g.stroke({ color: borderColor, width: borderWidth });
    },
    [fillColor, borderColor, borderWidth, isOverloaded],
  );

  const drawPill = useCallback(
    (g: Graphics) => {
      g.clear();
      g.roundRect(0, 0, 40, 40, 999);
      g.fill({ alpha: 0.13, color: accentColor });
    },
    [accentColor],
  );

  const isUsersNode = node.data.componentType === "users",
    nodeId = node.id;

  const handlePointerDown = useCallback(
    (e: FederatedPointerEvent) => {
      if (isLocked) {
        return;
      }
      onPointerDown(nodeId, e);
    },
    [isLocked, onPointerDown, nodeId],
  );

  const handleClick = useCallback(
    (e: FederatedPointerEvent) => {
      onSelect(nodeId);
      e.stopPropagation();
    },
    [onSelect, nodeId],
  );

  const handleRightClick = useCallback(
    (e: FederatedPointerEvent) => {
      if (isLocked) {
        return;
      }
      onContextMenu(nodeId, { clientX: e.client.x, clientY: e.client.y });
      e.stopPropagation();
    },
    [isLocked, onContextMenu, nodeId],
  );

  const handleHandleClick = useCallback(
    (side: HandleSide, kind: "source" | "target") => {
      onHandleClick(nodeId, side, kind);
    },
    [onHandleClick, nodeId],
  );

  const iconStyle = new TextStyle({ fontSize: 20 });
  const labelStyle = new TextStyle({
    fill: 0x1a2744,
    fontSize: 11,
    fontWeight: "700",
    wordWrap: true,
    wordWrapWidth: NODE_WIDTH - 8,
  });

  return (
    <pixiContainer
      ref={handleRef}
      cursor={isLocked ? "default" : "grab"}
      data-label={def.label}
      data-overloaded={isOverloaded}
      data-testid={`canvas-node-${nodeId}`}
      eventMode="static"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onRightClick={handleRightClick}
      x={node.position.x}
      y={node.position.y}
    >
      <pixiGraphics draw={drawBackground} />
      <pixiGraphics draw={drawPill} x={(NODE_WIDTH - 40) / 2} y={12} />
      <pixiText
        anchor={{ x: 0.5, y: 0.5 }}
        style={iconStyle}
        text={def.icon}
        x={NODE_WIDTH / 2}
        y={32}
      />
      <pixiText
        anchor={{ x: 0.5, y: 0 }}
        style={labelStyle}
        text={def.label}
        x={NODE_WIDTH / 2}
        y={60}
      />
      <HandleGraphic
        isPendingConnection={isPendingConnection}
        kind="source"
        onHandleClick={handleHandleClick}
        side="right"
        x={NODE_WIDTH}
        y={NODE_MIN_HEIGHT / 2}
      />
      <HandleGraphic
        isPendingConnection={isPendingConnection}
        kind="source"
        onHandleClick={handleHandleClick}
        side="bottom"
        x={NODE_WIDTH / 2}
        y={NODE_MIN_HEIGHT}
      />
      {!isUsersNode && (
        <>
          <HandleGraphic
            isPendingConnection={isPendingConnection}
            kind="target"
            onHandleClick={handleHandleClick}
            side="left"
            x={0}
            y={NODE_MIN_HEIGHT / 2}
          />
          <HandleGraphic
            isPendingConnection={isPendingConnection}
            kind="target"
            onHandleClick={handleHandleClick}
            side="top"
            x={NODE_WIDTH / 2}
            y={0}
          />
        </>
      )}
    </pixiContainer>
  );
};

export { HandleGraphic, PixiNodeGraphic };
export type { HandleProps, PixiNodeProps };
