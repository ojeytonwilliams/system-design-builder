import { GameCanvas } from "./game-canvas.js";
import { fireEvent, render, screen } from "@testing-library/react";

const INITIAL_NODES_TWO = [
  {
    data: { componentType: "users" },
    id: "users-1",
    position: { x: 0, y: 0 },
    type: "architecture",
  },
  {
    data: { componentType: "server" },
    id: "server-1",
    position: { x: 96, y: 0 },
    type: "architecture",
  },
] as const;

const LOCKED_USERS_NODE = [
  {
    data: { componentType: "users" as const },
    id: "users-1",
    position: { x: 0, y: 0 },
    type: "architecture" as const,
  },
];

describe("game canvas", () => {
  beforeAll(() => {
    // The pixi mocks replace the pixi elements with custom elements that react
    // does not recognize, which causes React to log errors during tests.
    vi.spyOn(console, "error").mockImplementation(() => {});
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

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute(
      "data-label",
      "Small Server",
    );
  });

  it("places a queued component when componentToPlace is provided", () => {
    const onComponentPlaced = vi.fn<() => void>();

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
            data: { componentType: "users" },
            id: "users-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
          {
            data: { componentType: "server" },
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
    const onStateChange = vi.fn<() => void>();
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
            data: { componentType: "server" },
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
            data: { componentType: "server" },
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
            data: { componentType: "server" },
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
            data: { componentType: "server" },
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
            data: { componentType: "server" },
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
    const onSelectedNodeChange = vi.fn<() => void>();

    render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server" },
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

    fireEvent.click(screen.getByRole("button", { name: /remove/iv }));

    expect(screen.queryByRole("button", { name: /remove/iv })).not.toBeInTheDocument();
  });
});

describe("locked nodes", () => {
  it("does not remove a locked node when Delete is pressed", () => {
    render(<GameCanvas initialNodes={LOCKED_USERS_NODE} lockedNodeIds={["users-1"]} />);

    fireEvent.click(screen.getByTestId("canvas-node-users-1"));
    fireEvent.keyDown(window, { key: "Delete" });

    expect(screen.getByTestId("canvas-node-users-1")).toBeInTheDocument();
  });
});

describe("static graph rendering", () => {
  it("renders nodes from initialNodes", () => {
    render(
      <GameCanvas
        initialNodes={[
          {
            data: { componentType: "server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute(
      "data-label",
      "Small Server",
    );
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
