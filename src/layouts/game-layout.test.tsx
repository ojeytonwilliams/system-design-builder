import { act, fireEvent, render, screen } from "@testing-library/react";
import { GameLayout } from "./game-layout.js";
import { loadProgress } from "../persistence.js";
import type { LevelConfig } from "../simulation/types.js";
import type { ArchitectureCanvasNode, Edge } from "../components/game-canvas.js";

// Win after 10 sustained seconds: traffic=40 < server capacity=50, no drops
const winLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 60,
  trafficPeak: 40,
  trafficStart: 40,
  trafficTarget: 40,
};

const testLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 10,
  trafficPeak: 100,
  trafficStart: 100,
  trafficTarget: 100,
};

// 150 req/s on a 50 req/s server = 300% load
const overloadLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 10,
  trafficPeak: 150,
  trafficStart: 150,
  trafficTarget: 150,
};

// Traffic ramps down from 100 → 0 over 4 seconds:
// T=1: 75 req/s (overloaded, server capacity=50)
// T=2: 50 req/s (resolves — exactly at capacity, no drops)
// T=3: 25 req/s (50% load)
const resolvingOverloadLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 4,
  trafficPeak: 0,
  trafficStart: 100,
  trafficTarget: 40,
};

const overloadNodes: ArchitectureCanvasNode[] = [
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
];

const unlockedLevel3Nodes: ArchitectureCanvasNode[] = [
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
  {
    data: { componentType: "server" },
    id: "server-2",
    position: { x: 192, y: 0 },
    type: "architecture",
  },
];

const overloadEdges: Edge[] = [{ id: "edge-1", source: "users-1", target: "server-1" }];

// oxlint-disable-next-line vitest/require-top-level-describe
beforeAll(() => {
  // The pixi mocks replace the pixi elements with custom elements that react
  // does not recognize, which causes React to log errors during tests.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("game layout", () => {
  it("renders the top bar", () => {
    render(<GameLayout />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the resources region", () => {
    render(<GameLayout />);

    expect(screen.getByRole("region", { name: /resources/iv })).toBeInTheDocument();
  });

  it("renders the canvas area", () => {
    render(<GameLayout />);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the inspector region", () => {
    render(<GameLayout />);

    expect(screen.getByRole("region", { name: /inspector/iv })).toBeInTheDocument();
  });

  it("renders a Start Traffic button", () => {
    render(<GameLayout />);

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));

    expect(screen.getByRole("button", { name: /stop traffic/iv })).toBeInTheDocument();
  });

  it("clicking Stop Traffic returns to design mode", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={testLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    fireEvent.click(screen.getByRole("button", { name: /stop traffic/iv }));

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeInTheDocument();
  });

  it("simulation ends automatically after the timeout expires", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={testLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));

    act(() => {
      vi.advanceTimersByTime(testLevelConfig.timeout * 1000 + 500);
    });

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/load:\s*300%\s*\(overloaded\)/iv)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/load:\s*50%$/iv)).toBeInTheDocument();
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

  it("resources panel shows server, server-large and db for level 1", () => {
    render(<GameLayout />);

    expect(screen.getByTestId("resource-item-server")).toBeInTheDocument();
    expect(screen.getByTestId("resource-item-server-large")).toBeInTheDocument();
    expect(screen.getByTestId("resource-item-db")).toBeInTheDocument();
  });

  it("resources panel does not show users, cache or load-balancer for level 1", () => {
    render(<GameLayout />);

    expect(screen.queryByTestId("resource-item-users")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resource-item-cache")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resource-item-load-balancer")).not.toBeInTheDocument();
  });

  it("shows the end-of-level screen when win condition is met", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByRole("heading", { name: /level complete/iv })).toBeInTheDocument();
  });

  it("replay button dismisses end-of-level screen and returns to design mode", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    fireEvent.click(screen.getByRole("button", { name: /replay/iv }));

    expect(screen.queryByRole("heading", { name: /level complete/iv })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeInTheDocument();
  });

  it("continue button dismisses end-of-level screen", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/iv }));

    expect(screen.queryByRole("heading", { name: /level complete/iv })).not.toBeInTheDocument();
  });

  it("saves completed level to localStorage when a level is won", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(loadProgress().completedLevels).toContain(1);
  });

  it("starts on the first incomplete level derived from saved progress", () => {
    localStorage.setItem("sdb_progress", JSON.stringify({ completedLevels: [1], version: 1 }));

    render(<GameLayout />);

    expect(screen.getByTestId("level-strip-level-2")).toHaveAttribute("data-status", "active");
  });

  it("loads the correct canvas nodes and resources for the first incomplete level on page load", () => {
    localStorage.setItem("sdb_progress", JSON.stringify({ completedLevels: [1], version: 1 }));

    render(<GameLayout />);

    // Level 2 starts with two servers; level 1 starts with only a users node
    expect(screen.getByTestId("canvas-node-server-2")).toBeInTheDocument();
    // Level 2 has load-balancer in its palette; level 1 does not
    expect(screen.getByTestId("resource-item-load-balancer")).toBeInTheDocument();
  });

  it("loads the next level after continue is clicked", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/iv }));

    expect(screen.getByTestId("level-strip-level-2")).toHaveAttribute("data-status", "active");
  });
});

describe("level context UI", () => {
  it("shows the active level title in the UI", () => {
    render(<GameLayout />);

    expect(screen.getByText(/first request/iv)).toBeInTheDocument();
  });

  it("shows the level objective text", () => {
    render(<GameLayout />);

    expect(
      screen.getByText("Your server is overloaded. Fix the architecture to handle 70 req/s."),
    ).toBeInTheDocument();
  });
});

describe("simulation gating", () => {
  it("start traffic button is disabled when canvas has no runnable path", () => {
    render(<GameLayout initialNodes={overloadNodes} initialEdges={[]} />);

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeDisabled();
  });

  it("start traffic button is enabled when users node has an outgoing connection", () => {
    render(<GameLayout initialEdges={overloadEdges} initialNodes={overloadNodes} />);

    expect(screen.getByRole("button", { name: /start traffic/iv })).not.toBeDisabled();
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

    expect(screen.getByRole("navigation", { name: /level progression/iv })).toBeInTheDocument();
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

    expect(screen.getByText(/first request/iv)).toBeInTheDocument();
  });
});

describe("coach panel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("shows an opening mission message when a level starts", () => {
    render(<GameLayout />);

    expect(screen.getByRole("heading", { name: /coach/iv })).toBeInTheDocument();
    expect(screen.getByText(/mission: your server is overloaded/iv)).toBeInTheDocument();
  });

  it("shows a timed coach message during simulation", () => {
    // Level 3 has a coachMessage at atSecond: 2 about the database bottleneck
    localStorage.setItem("sdb_progress", JSON.stringify({ completedLevels: [1, 2], version: 1 }));

    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={overloadLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/database is the bottleneck/iv)).toBeInTheDocument();
  });

  it("shows a coaching message the first time overload occurs in a level", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={overloadLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/overload detected/iv)).toBeInTheDocument();
  });
});

describe("event log", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("logs placement and connections in chronological order", () => {
    localStorage.setItem("sdb_progress", JSON.stringify({ completedLevels: [1, 2], version: 1 }));

    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={unlockedLevel3Nodes}
        levelConfig={resolvingOverloadLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByRole("heading", { name: /event log/iv })).toBeInTheDocument();
    expect(screen.getByText(/component placed: users/iv)).toBeInTheDocument();
    expect(screen.getAllByText(/component placed: small server/iv)).toHaveLength(2);
    expect(screen.getByText(/connection created/iv)).toBeInTheDocument();
  });

  it("logs overload start and resolution events", () => {
    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={resolvingOverloadLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/overload started/iv)).toBeInTheDocument();
    expect(screen.getByText(/overload resolved/iv)).toBeInTheDocument();
  });
});

describe("budget enforcement", () => {
  it("shows a budget warning when a placed component would exceed the monthly budget", () => {
    // OverloadNodes = users ($0) + server ($20) = $20 total; budget $20 → no room for another
    const tightBudgetConfig: LevelConfig = {
      cacheHitRate: 0,
      monthlyBudget: 20,
      timeout: 60,
      trafficPeak: 40,
      trafficStart: 40,
      trafficTarget: 40,
    };

    render(
      <GameLayout
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={tightBudgetConfig}
      />,
    );

    fireEvent.click(screen.getByTestId("resource-item-server"));

    expect(screen.getByText(/over budget/iv)).toBeInTheDocument();
  });
});

describe("responsive layout", () => {
  it("reflows controls for narrow screens and keeps each panel accessible", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375, writable: true });
    fireEvent(window, new Event("resize"));

    render(<GameLayout />);

    expect(screen.getByRole("region", { name: /resources/iv })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /inspector/iv })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /coach/iv })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /event log/iv })).toBeInTheDocument();
    expect(screen.getByTestId("game-layout-shell")).toHaveStyle({ overflowX: "hidden" });
  });
});
