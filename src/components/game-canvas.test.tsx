import {
  GameCanvas,
  chooseBestHandles,
  isConnectionValid,
  snapPositionToGrid,
} from "./game-canvas.js";
import { fireEvent, render, screen } from "@testing-library/react";

describe("game canvas", () => {
  it("renders a canvas container", () => {
    render(<GameCanvas />);

    expect(screen.getByTestId("game-canvas")).toBeInTheDocument();
  });

  it("canvas container fills its parent with 100% dimensions", () => {
    render(<GameCanvas />);

    expect(screen.getByTestId("game-canvas")).toHaveStyle({
      height: "100%",
      width: "100%",
    });
  });

  it("drops a palette item onto the canvas and renders its label", () => {
    render(<GameCanvas />);
    const dropzone = screen.getByTestId("game-canvas-dropzone");

    vi.spyOn(dropzone, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 500,
      left: 20,
      right: 820,
      toJSON: () => ({}),
      top: 20,
      width: 800,
      x: 20,
      y: 20,
    });

    fireEvent.drop(dropzone, {
      clientX: 145,
      clientY: 117,
      dataTransfer: { getData: () => "server" },
    });

    expect(screen.getByTestId("canvas-node-server-1")).toBeInTheDocument();
    expect(screen.getByText("Server")).toBeInTheDocument();
  });

  it("places a queued component when componentToPlace is provided", () => {
    const onComponentPlaced = vi.fn();

    render(<GameCanvas componentToPlace="server" onComponentPlaced={onComponentPlaced} />);

    expect(screen.getByTestId("canvas-node-server-1")).toBeInTheDocument();
    expect(onComponentPlaced).toHaveBeenCalledOnce();
  });

  it("removes a selected node and its connected edges when Delete is pressed", () => {
    render(
      <GameCanvas
        initialEdges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        initialNodes={[
          {
            data: { componentType: "users", label: "Users" },
            id: "users-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 96, y: 0 },
            type: "architecture",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId("canvas-node-server-1"));
    fireEvent.keyDown(window, { key: "Delete" });

    expect(screen.queryByTestId("canvas-node-server-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("canvas-edge-edge-1")).not.toBeInTheDocument();
  });

  it("removes a node and its connected edges from the context menu", () => {
    render(
      <GameCanvas
        initialEdges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        initialNodes={[
          {
            data: { componentType: "users", label: "Users" },
            id: "users-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 96, y: 0 },
            type: "architecture",
          },
        ]}
      />,
    );

    fireEvent.contextMenu(screen.getByTestId("canvas-node-server-1"), {
      clientX: 240,
      clientY: 160,
    });
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(screen.queryByTestId("canvas-node-server-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("canvas-edge-edge-1")).not.toBeInTheDocument();
  });
});

describe("grid snapping", () => {
  it("snaps a dropped position to the nearest grid cell", () => {
    expect(snapPositionToGrid({ x: 145, y: 117 })).toStrictEqual({ x: 144, y: 96 });
  });
});

const INITIAL_NODES_TWO = [
  {
    data: { componentType: "users", label: "Users" },
    id: "users-1",
    position: { x: 0, y: 0 },
    type: "architecture",
  },
  {
    data: { componentType: "server", label: "Server" },
    id: "server-1",
    position: { x: 96, y: 0 },
    type: "architecture",
  },
] as const;

describe("connection ports", () => {
  it("renders source handles on server nodes", () => {
    const { container } = render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
      />,
    );

    expect(
      container.querySelector('[data-testid="handle-server-1-source-right"]'),
    ).toBeInTheDocument();
  });

  it("renders target handles on server nodes", () => {
    const { container } = render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
      />,
    );

    expect(
      container.querySelector('[data-testid="handle-server-1-target-left"]'),
    ).toBeInTheDocument();
  });

  it("users node has no target handles", () => {
    const { container } = render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "users", label: "Users" },
            id: "users-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
      />,
    );

    expect(
      container.querySelector('[data-testid="handle-users-1-target-left"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="handle-users-1-source-right"]'),
    ).toBeInTheDocument();
  });
});

describe("connection validation", () => {
  it("allows server to server connections", () => {
    expect(isConnectionValid("server", "server")).toBe(true);
  });

  it("allows users to server connections", () => {
    expect(isConnectionValid("users", "server")).toBe(true);
  });

  it("allows server to db connections", () => {
    expect(isConnectionValid("server", "db")).toBe(true);
  });

  it("blocks server targeting users", () => {
    expect(isConnectionValid("server", "users")).toBe(false);
  });

  it("blocks db targeting users", () => {
    expect(isConnectionValid("db", "users")).toBe(false);
  });

  it("blocks cache targeting users", () => {
    expect(isConnectionValid("cache", "users")).toBe(false);
  });
});

describe("locked mode", () => {
  it("does not place a node when isLocked is true and a palette item is dropped", () => {
    render(<GameCanvas isLocked />);
    const dropzone = screen.getByTestId("game-canvas-dropzone");

    vi.spyOn(dropzone, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 500,
      left: 20,
      right: 820,
      toJSON: () => ({}),
      top: 20,
      width: 800,
      x: 20,
      y: 20,
    });

    fireEvent.drop(dropzone, {
      clientX: 145,
      clientY: 117,
      dataTransfer: { getData: () => "server" },
    });

    expect(screen.queryByTestId("canvas-node-server-1")).not.toBeInTheDocument();
  });
});

describe("onStateChange callback", () => {
  it("fires with updated nodes after a node is dropped", () => {
    const onStateChange = vi.fn();
    render(<GameCanvas onStateChange={onStateChange} />);
    const dropzone = screen.getByTestId("game-canvas-dropzone");

    vi.spyOn(dropzone, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 500,
      left: 20,
      right: 820,
      toJSON: () => ({}),
      top: 20,
      width: 800,
      x: 20,
      y: 20,
    });

    fireEvent.drop(dropzone, {
      clientX: 145,
      clientY: 117,
      dataTransfer: { getData: () => "server" },
    });

    expect(onStateChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "server-1" })]),
      expect.any(Array),
    );
  });
});

describe("overloaded node state", () => {
  it("renders overloaded styling for nodes included in overloadedNodeIds", () => {
    render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
        overloadedNodeIds={["server-1"]}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute("data-overloaded", "true");
  });

  it("enters overloaded state immediately when node id is added", () => {
    const { rerender } = render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
        overloadedNodeIds={[]}
      />,
    );

    rerender(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
        overloadedNodeIds={["server-1"]}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute("data-overloaded", "true");
  });

  it("returns a node to normal state when it is removed from overloadedNodeIds", () => {
    const { rerender } = render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
        overloadedNodeIds={["server-1"]}
      />,
    );

    rerender(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
        overloadedNodeIds={[]}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute("data-overloaded", "false");
  });
});

describe("escape key", () => {
  it("pressing Escape calls onSelectedNodeChange with null to close the inspector", () => {
    const onSelectedNodeChange = vi.fn();

    render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
        onSelectedNodeChange={onSelectedNodeChange}
      />,
    );

    fireEvent.click(screen.getByTestId("canvas-node-server-1"));
    onSelectedNodeChange.mockClear();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onSelectedNodeChange).toHaveBeenCalledWith(null);
  });
});

describe("edge deletion", () => {
  it("removes a selected edge when Delete is pressed", () => {
    render(
      <GameCanvas
        initialEdges={[{ id: "edge-1", selected: true, source: "users-1", target: "server-1" }]}
        initialNodes={[...INITIAL_NODES_TWO]}
      />,
    );

    fireEvent.keyDown(window, { key: "Delete" });

    expect(screen.queryByTestId("canvas-edge-edge-1")).not.toBeInTheDocument();
  });

  it("clicking Remove in the edge context menu removes the edge", () => {
    render(
      <GameCanvas
        initialContextMenu={{ edgeId: "edge-1", kind: "edge", x: 200, y: 100 }}
        initialEdges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        initialNodes={[...INITIAL_NODES_TWO]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });
});

const LOCKED_USERS_NODE = [
  {
    data: { componentType: "users" as const, label: "Users" },
    id: "users-1",
    position: { x: 0, y: 0 },
    type: "architecture" as const,
  },
];

describe("locked nodes", () => {
  it("does not remove a locked node when Delete is pressed", () => {
    render(<GameCanvas initialNodes={LOCKED_USERS_NODE} lockedNodeIds={["users-1"]} />);

    fireEvent.click(screen.getByTestId("canvas-node-users-1"));
    fireEvent.keyDown(window, { key: "Delete" });

    expect(screen.getByTestId("canvas-node-users-1")).toBeInTheDocument();
  });

  it("does not show a context menu for a locked node", () => {
    render(<GameCanvas initialNodes={LOCKED_USERS_NODE} lockedNodeIds={["users-1"]} />);

    fireEvent.contextMenu(screen.getByTestId("canvas-node-users-1"), {
      clientX: 100,
      clientY: 100,
    });

    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });
});

describe("static graph rendering", () => {
  it("renders nodes from initialNodes", () => {
    render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server", label: "Server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toBeInTheDocument();
    expect(screen.getByText("Server")).toBeInTheDocument();
  });

  it("renders edges from initialEdges", () => {
    render(
      <GameCanvas
        initialEdges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        initialNodes={[...INITIAL_NODES_TWO]}
      />,
    );

    expect(screen.getByTestId("canvas-edge-edge-1")).toBeInTheDocument();
  });
});

describe(chooseBestHandles, () => {
  const makeNode = (x: number, y: number) =>
    ({
      data: { componentType: "server" as const, label: "Server" },
      id: "n",
      position: { x, y },
      type: "architecture" as const,
    }) as const;

  it("returns right→left when target is to the right", () => {
    const result = chooseBestHandles(makeNode(0, 0), makeNode(200, 0));
    expect(result).toStrictEqual({ sourceHandle: "right", targetHandle: "left" });
  });

  it("returns left→right when target is to the left", () => {
    const result = chooseBestHandles(makeNode(200, 0), makeNode(0, 0));
    expect(result).toStrictEqual({ sourceHandle: "left", targetHandle: "right" });
  });

  it("returns bottom→top when target is below", () => {
    const result = chooseBestHandles(makeNode(0, 0), makeNode(0, 200));
    expect(result).toStrictEqual({ sourceHandle: "bottom", targetHandle: "top" });
  });

  it("returns top→bottom when target is above", () => {
    const result = chooseBestHandles(makeNode(0, 200), makeNode(0, 0));
    expect(result).toStrictEqual({ sourceHandle: "top", targetHandle: "bottom" });
  });

  it("prefers horizontal when dx equals dy", () => {
    const result = chooseBestHandles(makeNode(0, 0), makeNode(100, 100));
    expect(result).toStrictEqual({ sourceHandle: "right", targetHandle: "left" });
  });
});
