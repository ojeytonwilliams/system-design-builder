import { fireEvent, render, screen } from "@testing-library/react";
import type { GraphAction } from "../../game/graph-reducer.js";
import { GameCanvas } from "./game-canvas.js";

// oxlint-disable-next-line vitest/require-top-level-describe
beforeAll(() => {
  // Pixi mocks render unknown custom elements; suppress React's warnings about them.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const noop = () => {};

const INITIAL_NODES_TWO = [
  {
    componentType: "users",
    id: "users-1",
    position: { x: 0, y: 0 },
  },
  {
    componentType: "server",
    id: "server-1",
    position: { x: 96, y: 0 },
  },
] as const;

const LOCKED_USERS_NODE = [
  {
    componentType: "users" as const,
    id: "users-1",
    position: { x: 0, y: 0 },
  },
];

describe("game canvas", () => {
  it("dispatches PLACE_NODE when a component is dropped onto the canvas", () => {
    const dispatchGraph = vi.fn<(action: GraphAction) => void>();
    render(
      <GameCanvas
        dispatchGraph={dispatchGraph}
        edges={[]}
        nodes={[]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
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

    expect(dispatchGraph).toHaveBeenCalledWith(
      expect.objectContaining({ componentType: "server", type: "PLACE_NODE" }),
    );
  });

  it("calls onNodePlaced when a component is dropped onto the canvas", () => {
    const onNodePlaced = vi.fn<(componentType: string) => void>();
    render(
      <GameCanvas
        dispatchGraph={noop}
        edges={[]}
        nodes={[]}
        onEdgeCreated={noop}
        onNodePlaced={onNodePlaced}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
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

    expect(onNodePlaced).toHaveBeenCalledWith("server");
  });

  it("dispatches PLACE_NODE when componentToPlace is provided", () => {
    const dispatchGraph = vi.fn<(action: GraphAction) => void>();
    const onComponentPlaced = vi.fn<() => void>();

    render(
      <GameCanvas
        componentToPlace="server"
        dispatchGraph={dispatchGraph}
        edges={[]}
        nodes={[]}
        onComponentPlaced={onComponentPlaced}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    expect(dispatchGraph).toHaveBeenCalledWith(
      expect.objectContaining({ componentType: "server", type: "PLACE_NODE" }),
    );
    expect(onComponentPlaced).toHaveBeenCalledOnce();
  });

  it("dispatches REMOVE_NODE when Delete is pressed on a selected node", () => {
    const dispatchGraph = vi.fn<(action: GraphAction) => void>();
    render(
      <GameCanvas
        dispatchGraph={dispatchGraph}
        edges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        nodes={[...INITIAL_NODES_TWO]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId="server-1"
        transits={new Map()}
      />,
    );

    fireEvent.keyDown(window, { key: "Delete" });

    expect(dispatchGraph).toHaveBeenCalledWith({ nodeId: "server-1", type: "REMOVE_NODE" });
  });
});

describe("locked mode", () => {
  it("does not dispatch when isLocked is true and a palette item is dropped", () => {
    const dispatchGraph = vi.fn<(action: GraphAction) => void>();
    render(
      <GameCanvas
        dispatchGraph={dispatchGraph}
        edges={[]}
        isLocked
        nodes={[]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
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

    expect(dispatchGraph).not.toHaveBeenCalled();
  });
});

describe("overloaded node state", () => {
  it("renders overloaded styling for nodes included in overloadedNodeIds", () => {
    render(
      <GameCanvas
        dispatchGraph={noop}
        edges={[]}
        nodes={[
          {
            componentType: "server",
            id: "server-1",
            position: { x: 0, y: 0 },
          },
        ]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        overloadedNodeIds={["server-1"]}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute("data-overloaded", "true");
  });

  it("enters overloaded state immediately when node id is added", () => {
    const node = {
      componentType: "server" as const,
      id: "server-1",
      position: { x: 0, y: 0 },
    };
    const { rerender } = render(
      <GameCanvas
        dispatchGraph={noop}
        edges={[]}
        nodes={[node]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        overloadedNodeIds={[]}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    rerender(
      <GameCanvas
        dispatchGraph={noop}
        edges={[]}
        nodes={[node]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        overloadedNodeIds={["server-1"]}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute("data-overloaded", "true");
  });

  it("returns a node to normal state when it is removed from overloadedNodeIds", () => {
    const node = {
      componentType: "server" as const,
      id: "server-1",
      position: { x: 0, y: 0 },
    };
    const { rerender } = render(
      <GameCanvas
        dispatchGraph={noop}
        edges={[]}
        nodes={[node]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        overloadedNodeIds={["server-1"]}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    rerender(
      <GameCanvas
        dispatchGraph={noop}
        edges={[]}
        nodes={[node]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        overloadedNodeIds={[]}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    expect(screen.getByTestId("canvas-node-server-1")).toHaveAttribute("data-overloaded", "false");
  });
});

describe("escape key", () => {
  it("pressing Escape calls onSelectedNodeChange with null", () => {
    const onSelectedNodeChange = vi.fn<() => void>();

    render(
      <GameCanvas
        dispatchGraph={noop}
        edges={[]}
        nodes={[
          {
            componentType: "server",
            id: "server-1",
            position: { x: 0, y: 0 },
          },
        ]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={onSelectedNodeChange}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onSelectedNodeChange).toHaveBeenCalledWith(null);
  });
});

describe("edge deletion", () => {
  it("dispatches REMOVE_EDGE when Delete is pressed with a selected edge", () => {
    const dispatchGraph = vi.fn<(action: GraphAction) => void>();
    render(
      <GameCanvas
        dispatchGraph={dispatchGraph}
        edges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        initialSelectedEdgeId="edge-1"
        nodes={[...INITIAL_NODES_TWO]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    fireEvent.keyDown(window, { key: "Delete" });

    expect(dispatchGraph).toHaveBeenCalledWith({ edgeId: "edge-1", type: "REMOVE_EDGE" });
  });

  it("clicking Remove in the edge context menu dispatches REMOVE_EDGE", () => {
    const dispatchGraph = vi.fn<(action: GraphAction) => void>();
    render(
      <GameCanvas
        dispatchGraph={dispatchGraph}
        edges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        initialContextMenu={{ edgeId: "edge-1", kind: "edge", x: 200, y: 100 }}
        nodes={[...INITIAL_NODES_TWO]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /remove/iv }));

    expect(screen.queryByRole("button", { name: /remove/iv })).not.toBeInTheDocument();
    expect(dispatchGraph).toHaveBeenCalledWith({ edgeId: "edge-1", type: "REMOVE_EDGE" });
  });
});

describe("locked nodes", () => {
  it("does not dispatch when Delete is pressed on a locked node", () => {
    const dispatchGraph = vi.fn<(action: GraphAction) => void>();
    render(
      <GameCanvas
        dispatchGraph={dispatchGraph}
        edges={[]}
        lockedNodeIds={["users-1"]}
        nodes={LOCKED_USERS_NODE}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId="users-1"
        transits={new Map()}
      />,
    );

    fireEvent.keyDown(window, { key: "Delete" });

    expect(dispatchGraph).not.toHaveBeenCalled();
  });
});

describe("response transits", () => {
  it("renders without errors when responseTransits is provided", () => {
    render(
      <GameCanvas
        dispatchGraph={noop}
        edges={[]}
        nodes={[]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    expect(screen.getByTestId("game-canvas")).toBeInTheDocument();
  });
});

describe("static graph rendering", () => {
  it("renders nodes from nodes prop", () => {
    render(
      <GameCanvas
        dispatchGraph={noop}
        edges={[]}
        nodes={[
          {
            componentType: "server",
            id: "server-1",
            position: { x: 0, y: 0 },
          },
        ]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
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
        dispatchGraph={noop}
        edges={[{ id: "edge-1", source: "users-1", target: "server-1" }]}
        nodes={[...INITIAL_NODES_TWO]}
        onEdgeCreated={noop}
        onNodePlaced={noop}
        onSelectedNodeChange={noop}
        processing={new Map()}
        responseTransits={new Map()}
        selectedNodeId={null}
        transits={new Map()}
      />,
    );

    expect(screen.getByTestId("canvas-edge-edge-1")).toBeInTheDocument();
  });
});
