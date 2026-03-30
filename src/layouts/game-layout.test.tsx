import { act, fireEvent, render, screen } from "@testing-library/react";
import { GameLayout } from "./game-layout.js";
import type { LevelConfig } from "../simulation/types.js";
import type { ArchitectureCanvasNode } from "../components/game-canvas.js";
import type { Edge } from "@xyflow/react";

const testLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  revenueTarget: 99999,
  timeout: 10,
  trafficSchedule: [{ opsPerSec: 100, startTime: 0 }],
};

const overloadLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  revenueTarget: 99999,
  timeout: 10,
  trafficSchedule: [{ opsPerSec: 300, startTime: 0 }],
};

const resolvingOverloadLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  revenueTarget: 99999,
  timeout: 10,
  trafficSchedule: [
    { opsPerSec: 300, startTime: 0 },
    { opsPerSec: 50, startTime: 2 },
  ],
};

const overloadNodes: ArchitectureCanvasNode[] = [
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
];

const overloadEdges: Edge[] = [{ id: "edge-1", source: "users-1", target: "server-1" }];

describe("game layout", () => {
  it("renders the top bar", () => {
    render(<GameLayout />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the palette region", () => {
    render(<GameLayout />);

    expect(screen.getByRole("region", { name: /palette/i })).toBeInTheDocument();
  });

  it("renders the canvas area", () => {
    render(<GameLayout />);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the inspector region", () => {
    render(<GameLayout />);

    expect(screen.getByRole("region", { name: /inspector/i })).toBeInTheDocument();
  });

  it("renders a Start Traffic button", () => {
    render(<GameLayout />);

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeInTheDocument();
  });

  it("renders the cash balance", () => {
    render(<GameLayout />);

    expect(screen.getByText(/\$500/)).toBeInTheDocument();
  });
});

describe("simulation mode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clicking Start Traffic transitions to simulate mode", () => {
    render(<GameLayout levelConfig={testLevelConfig} />);

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));

    expect(screen.getByRole("button", { name: /stop traffic/i })).toBeInTheDocument();
  });

  it("clicking Stop Traffic returns to design mode", () => {
    render(<GameLayout levelConfig={testLevelConfig} />);

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));
    fireEvent.click(screen.getByRole("button", { name: /stop traffic/i }));

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeInTheDocument();
  });

  it("simulation ends automatically after the timeout expires", () => {
    render(<GameLayout levelConfig={testLevelConfig} />);

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));

    act(() => {
      vi.advanceTimersByTime(testLevelConfig.timeout * 1000 + 500);
    });

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeInTheDocument();
  });

  it("resets revenue to $500 when starting a new simulation", () => {
    render(<GameLayout levelConfig={testLevelConfig} />);

    // Start and tick a few seconds to accumulate revenue
    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Stop and restart
    fireEvent.click(screen.getByRole("button", { name: /stop traffic/i }));
    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));

    expect(screen.getByText(/\$500\.00/)).toBeInTheDocument();
  });

  it("inspector load field reflects overloaded state for the selected node", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={overloadLevelConfig}
      />,
    );

    fireEvent.click(screen.getByTestId("canvas-node-server-1"));
    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/load:\s*300%\s*\(overloaded\)/i)).toBeInTheDocument();
  });

  it("returns the selected node to normal load state when traffic drops below capacity", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={resolvingOverloadLevelConfig}
      />,
    );

    fireEvent.click(screen.getByTestId("canvas-node-server-1"));
    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/load:\s*50%$/i)).toBeInTheDocument();
  });
});
