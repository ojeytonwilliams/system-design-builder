import { act, fireEvent, render, screen } from "@testing-library/react";
import { GameLayout } from "./game-layout.js";
import { loadProgress } from "../persistence.js";
import type { LevelConfig } from "../simulation/types.js";
import type { ArchitectureCanvasNode } from "../components/game-canvas.js";
import type { Edge } from "@xyflow/react";

// Level config that is won after 1 tick (100 ops/s * $0.10 = $10, target $510)
const winLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  revenueTarget: 510,
  timeout: 60,
  trafficSchedule: [{ opsPerSec: 100, startTime: 0 }],
};

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
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={testLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));

    expect(screen.getByRole("button", { name: /stop traffic/i })).toBeInTheDocument();
  });

  it("clicking Stop Traffic returns to design mode", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={testLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));
    fireEvent.click(screen.getByRole("button", { name: /stop traffic/i }));

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeInTheDocument();
  });

  it("simulation ends automatically after the timeout expires", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={testLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));

    act(() => {
      vi.advanceTimersByTime(testLevelConfig.timeout * 1000 + 500);
    });

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeInTheDocument();
  });

  it("resets revenue to $500 when starting a new simulation", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={testLevelConfig}
      />,
    );

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

describe("level system", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("palette shows users, server and db for level 1", () => {
    render(<GameLayout />);

    expect(screen.getByTestId("palette-item-users")).toBeInTheDocument();
    expect(screen.getByTestId("palette-item-server")).toBeInTheDocument();
    expect(screen.getByTestId("palette-item-db")).toBeInTheDocument();
    expect(screen.queryByTestId("palette-item-cache")).not.toBeInTheDocument();
    expect(screen.queryByTestId("palette-item-load-balancer")).not.toBeInTheDocument();
  });

  it("shows the end-of-level screen when revenue target is reached", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("heading", { name: /level complete/i })).toBeInTheDocument();
  });

  it("replay button dismisses end-of-level screen and returns to design mode", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(screen.getByRole("button", { name: /replay/i }));

    expect(screen.queryByRole("heading", { name: /level complete/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start traffic/i })).toBeInTheDocument();
  });

  it("continue button dismisses end-of-level screen", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.queryByRole("heading", { name: /level complete/i })).not.toBeInTheDocument();
  });

  it("saves completed level to localStorage when a level is won", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(loadProgress().completedLevels).toContain(1);
  });

  it("starts on the first incomplete level derived from saved progress", () => {
    localStorage.setItem("sdb_progress", JSON.stringify({ completedLevels: [1], version: 1 }));

    render(<GameLayout />);

    expect(screen.getByText(/over capacity/i)).toBeInTheDocument();
  });

  it("loads the next level after continue is clicked", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText(/over capacity/i)).toBeInTheDocument();
  });
});

describe("level context UI", () => {
  it("shows the active level title in the UI", () => {
    render(<GameLayout />);

    expect(screen.getByText(/first request/i)).toBeInTheDocument();
  });

  it("shows the level objective text", () => {
    render(<GameLayout />);

    expect(screen.getByText(/place a server and db/i)).toBeInTheDocument();
  });
});

describe("simulation gating", () => {
  it("start traffic button is disabled when canvas has no runnable path", () => {
    render(<GameLayout />);

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeDisabled();
  });

  it("start traffic button is enabled when users node has an outgoing connection", () => {
    render(<GameLayout initialEdges={overloadEdges} initialNodes={overloadNodes} />);

    expect(screen.getByRole("button", { name: /start traffic/i })).not.toBeDisabled();
  });
});

describe("level progression strip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders a level progression navigation region", () => {
    render(<GameLayout />);

    expect(screen.getByRole("navigation", { name: /level progression/i })).toBeInTheDocument();
  });

  it("marks completed levels as completed in the strip", () => {
    localStorage.setItem("sdb_progress", JSON.stringify({ completedLevels: [1], version: 1 }));

    render(<GameLayout />);

    expect(screen.getByTestId("level-strip-level-1")).toHaveAttribute("data-status", "completed");
  });

  it("selecting a completed level from the strip loads that level", () => {
    localStorage.setItem("sdb_progress", JSON.stringify({ completedLevels: [1, 2], version: 1 }));

    render(<GameLayout />);
    fireEvent.click(screen.getByTestId("level-strip-level-1"));

    expect(screen.getByText(/first request/i)).toBeInTheDocument();
  });
});
