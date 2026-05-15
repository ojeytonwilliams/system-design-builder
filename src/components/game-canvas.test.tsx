import { fireEvent, render, screen } from "@testing-library/react";
import { GameCanvas } from "./game-canvas.js";

// oxlint-disable-next-line vitest/require-top-level-describe
beforeAll(() => {
  // Pixi mocks render unknown custom elements; suppress React's warnings about them.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const noop = () => {};

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
  it("drops a palette item onto the canvas and calls onStateChange with the new node", () => {
    const onStateChange = vi.fn<() => void>();
    render(
      <GameCanvas
        edges={[]}
        nodes={[]}
        onSelectedNodeChange={noop}
        onStateChange={onStateChange}
        selectedNodeId={null}
      />,
    );
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

  it("places a queued component when componentToPlace is provided", () => {
    const onComponentPlaced = vi.fn<() => void>();
    const onStateChange = vi.fn<() => void>();

    render(
      <GameCanvas
        componentToPlace="server"
        edges={[]}
        nodes={[]}
        onComponentPlaced={onComponentPlaced}
        onSelectedNodeChange={noop}
        onStateChange={onStateChange}
        selectedNodeId={null}
      />,
    );

    expect(onStateChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "server-1" })]),
      expect.any(Array),
    );
    expect(onComponentPlaced).toHaveBeenCalledOnce();
  });

  it("removes a selected node and its connected edges when Delete is pressed", () => {
    const onStateChange = vi.fn<() => void>();
    render(
      <GameCanvas
        edges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        nodes={[...INITIAL_NODES_TWO]}
        onSelectedNodeChange={noop}
        onStateChange={onStateChange}
        selectedNodeId="server-1"
      />,
    );

    fireEvent.keyDown(window, { key: "Delete" });

    expect(onStateChange).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ id: "server-1" })]),
      [],
    );
  });
});

describe("locked mode", () => {
  it("does not call onStateChange when isLocked is true and a palette item is dropped", () => {
    const onStateChange = vi.fn<() => void>();
    render(
      <GameCanvas
        edges={[]}
        isLocked
        nodes={[]}
        onSelectedNodeChange={noop}
        onStateChange={onStateChange}
        selectedNodeId={null}
      />,
    );
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

    expect(onStateChange).not.toHaveBeenCalled();
  });
});

describe("onStateChange callback", () => {
  it("fires with updated nodes after a node is dropped", () => {
    const onStateChange = vi.fn<() => void>();
    render(
      <GameCanvas
        edges={[]}
        nodes={[]}
        onSelectedNodeChange={noop}
        onStateChange={onStateChange}
        selectedNodeId={null}
      />,
    );
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
        edges={[]}
        nodes={[
          {
            data: { componentType: "server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
        onSelectedNodeChange={noop}
        onStateChange={noop}
        overloadedNodeIds={["server-1"]}
        selectedNodeId={null}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute("data-overloaded", "true");
  });

  it("enters overloaded state immediately when node id is added", () => {
    const node = {
      data: { componentType: "server" as const },
      id: "server-1",
      position: { x: 0, y: 0 },
      type: "architecture" as const,
    };
    const { rerender } = render(
      <GameCanvas
        edges={[]}
        nodes={[node]}
        onSelectedNodeChange={noop}
        onStateChange={noop}
        overloadedNodeIds={[]}
        selectedNodeId={null}
      />,
    );

    rerender(
      <GameCanvas
        edges={[]}
        nodes={[node]}
        onSelectedNodeChange={noop}
        onStateChange={noop}
        overloadedNodeIds={["server-1"]}
        selectedNodeId={null}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute("data-overloaded", "true");
  });

  it("returns a node to normal state when it is removed from overloadedNodeIds", () => {
    const node = {
      data: { componentType: "server" as const },
      id: "server-1",
      position: { x: 0, y: 0 },
      type: "architecture" as const,
    };
    const { rerender } = render(
      <GameCanvas
        edges={[]}
        nodes={[node]}
        onSelectedNodeChange={noop}
        onStateChange={noop}
        overloadedNodeIds={["server-1"]}
        selectedNodeId={null}
      />,
    );

    rerender(
      <GameCanvas
        edges={[]}
        nodes={[node]}
        onSelectedNodeChange={noop}
        onStateChange={noop}
        overloadedNodeIds={[]}
        selectedNodeId={null}
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
        edges={[]}
        nodes={[
          {
            data: { componentType: "server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
        onSelectedNodeChange={onSelectedNodeChange}
        onStateChange={noop}
        selectedNodeId={null}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onSelectedNodeChange).toHaveBeenCalledWith(null);
  });
});

describe("edge deletion", () => {
  it("removes a selected edge when Delete is pressed", () => {
    const onStateChange = vi.fn<() => void>();
    render(
      <GameCanvas
        edges={[{ id: "edge-1", selected: true, source: "users-1", target: "server-1" }]}
        nodes={[...INITIAL_NODES_TWO]}
        onSelectedNodeChange={noop}
        onStateChange={onStateChange}
        selectedNodeId={null}
      />,
    );

    fireEvent.keyDown(window, { key: "Delete" });

    expect(onStateChange).toHaveBeenCalledWith(expect.any(Array), []);
  });

  it("clicking Remove in the edge context menu removes the edge", () => {
    const onStateChange = vi.fn<() => void>();
    render(
      <GameCanvas
        edges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        initialContextMenu={{ edgeId: "edge-1", kind: "edge", x: 200, y: 100 }}
        nodes={[...INITIAL_NODES_TWO]}
        onSelectedNodeChange={noop}
        onStateChange={onStateChange}
        selectedNodeId={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /remove/iv }));

    expect(screen.queryByRole("button", { name: /remove/iv })).not.toBeInTheDocument();
    expect(onStateChange).toHaveBeenCalledWith(expect.any(Array), []);
  });
});

describe("locked nodes", () => {
  it("does not call onStateChange when Delete is pressed on a locked node", () => {
    const onStateChange = vi.fn<() => void>();
    render(
      <GameCanvas
        edges={[]}
        lockedNodeIds={["users-1"]}
        nodes={LOCKED_USERS_NODE}
        onSelectedNodeChange={noop}
        onStateChange={onStateChange}
        selectedNodeId="users-1"
      />,
    );

    fireEvent.keyDown(window, { key: "Delete" });

    expect(onStateChange).not.toHaveBeenCalled();
  });
});

describe("static graph rendering", () => {
  it("renders nodes from nodes prop", () => {
    render(
      <GameCanvas
        edges={[]}
        nodes={[
          {
            data: { componentType: "server" },
            id: "server-1",
            position: { x: 0, y: 0 },
            type: "architecture",
          },
        ]}
        onSelectedNodeChange={noop}
        onStateChange={noop}
        selectedNodeId={null}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute(
      "data-label",
      "Small Server",
    );
  });

  it("renders edges from edges prop", () => {
    render(
      <GameCanvas
        edges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        nodes={[...INITIAL_NODES_TWO]}
        onSelectedNodeChange={noop}
        onStateChange={noop}
        selectedNodeId={null}
      />,
    );

    expect(screen.getByTestId("canvas-edge-edge-1")).toBeInTheDocument();
  });
});
