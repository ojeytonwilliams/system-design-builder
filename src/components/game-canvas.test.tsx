import { GameCanvas, snapPositionToGrid } from "./game-canvas.js";
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

  it("renders a React Flow dotted background", () => {
    const { container } = render(<GameCanvas />);

    expect(container.querySelector(".react-flow__background")).toBeInTheDocument();
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
