import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ArchitectureEdge, ArchitectureNode } from "./components/game-canvas.js";
import { useLevel } from "./hooks/use-level.js";
import { GameLayout, GameScene } from "./game-layout.js";
import { convertRate } from "../domain/sim-time-converter.js";
import { levelRegistry } from "../levels/index.js";
import { level1 } from "../levels/level1.js";
import { level3 } from "../levels/level3.js";
import { loadProgress } from "../persistence.js";
import { SimulationEngine } from "../simulation/simulation-engine.js";
import type { LevelConfig } from "../simulation/types.js";

// Win after 3 sustained seconds: 40 real ops/s < server capacity (50), no drops
const winLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 60_000,
  trafficPeak: convertRate(0.04),
  trafficStart: convertRate(0.04),
  trafficTarget: convertRate(0.04),
  winSustainMs: 3_000,
};

const testLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 10_000,
  trafficPeak: convertRate(0.1),
  trafficStart: convertRate(0.1),
  trafficTarget: convertRate(0.1),
  winSustainMs: 10_000,
};

// 150 real ops/s → 300% of server capacity (50); overload shows after rolling window fills (~t=4s)
const overloadLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 60_000,
  trafficPeak: convertRate(0.15),
  trafficStart: convertRate(0.15),
  trafficTarget: convertRate(0.15),
  winSustainMs: 10_000,
};

// 25 real ops/s → 50% of server capacity (50); steady-state load shown after rolling window fills (~t=4s)
const normalLoadLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 60_000,
  trafficPeak: convertRate(0.025),
  trafficStart: convertRate(0.025),
  trafficTarget: convertRate(0.025),
  winSustainMs: 10_000,
};

// Traffic ramps down from 100 → 0 real ops/s over 4 seconds:
// T=1: 75 real ops/s (overloaded, server capacity=50)
// T=2: 50 real ops/s (resolves — exactly at capacity, no drops)
// T=3: 25 real ops/s (50% load)
const resolvingOverloadLevelConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 4_000,
  trafficPeak: 0,
  trafficStart: convertRate(0.1),
  trafficTarget: convertRate(0.04),
  winSustainMs: 10_000,
};

// Traffic drops from 100 to 50 real ops/s over 6s; rolling-window overload starts ~t=3.3s,
// resolves ~t=4.5s — used to test overload start/resolution events
const overloadResolvingConfig: LevelConfig = {
  cacheHitRate: 0,
  monthlyBudget: 99999,
  timeout: 6_000,
  trafficPeak: 0,
  trafficStart: convertRate(0.1),
  trafficTarget: convertRate(0.05),
  winSustainMs: 99_000,
};

const overloadNodes: ArchitectureNode[] = [
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
];

const unlockedLevel3Nodes: ArchitectureNode[] = [
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
  {
    componentType: "server",
    id: "server-2",
    position: { x: 192, y: 0 },
  },
];

const overloadEdges: ArchitectureEdge[] = [{ id: "edge-1", source: "users-1", target: "server-1" }];

// Default props for GameScene in tests — override per-test as needed
const defaultSceneProps = {
  completedLevels: [] as string[],
  currentLevel: level1,
  engine: undefined as SimulationEngine | undefined,
  initLevel: (): { newEdges: ArchitectureEdge[]; newNodes: ArchitectureNode[] } => ({
    newEdges: [],
    newNodes: [],
  }),
  initialEdges: [] as ArchitectureEdge[],
  initialNodes: [] as ArchitectureNode[],
  levelConfig: {
    cacheHitRate: 0,
    monthlyBudget: 99999,
    timeout: 60_000,
    trafficPeak: 0,
    trafficStart: 0,
    trafficTarget: 0,
    winSustainMs: 10_000,
  } as LevelConfig,
  markLevelComplete: (): void => {},
};

const renderScene = (overrides: Partial<typeof defaultSceneProps> = {}) => {
  const p = { ...defaultSceneProps, ...overrides };
  return render(
    <GameScene
      completedLevels={p.completedLevels}
      currentLevel={p.currentLevel}
      engine={p.engine}
      initialEdges={p.initialEdges}
      initialNodes={p.initialNodes}
      levelConfig={p.levelConfig}
      initLevel={p.initLevel}
      markLevelComplete={p.markLevelComplete}
    />,
  );
};

// Wrapper for tests that need real level-progression state (initLevel / markLevelComplete)
const GameSceneHarness = ({
  engine,
  initialEdges,
  initialNodes,
  levelConfig,
}: {
  engine: SimulationEngine;
  initialEdges: ArchitectureEdge[];
  initialNodes: ArchitectureNode[];
  levelConfig: LevelConfig;
}) => {
  const { completedLevels, currentLevel, loadLevel, markLevelComplete } = useLevel();

  return (
    <GameScene
      completedLevels={completedLevels}
      currentLevel={currentLevel}
      engine={engine}
      initialEdges={initialEdges}
      initialNodes={initialNodes}
      levelConfig={levelConfig}
      initLevel={loadLevel}
      markLevelComplete={markLevelComplete}
    />
  );
};

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
  it("clicking Start Traffic transitions to simulate mode", () => {
    renderScene({
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: testLevelConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));

    expect(screen.getByRole("button", { name: /stop traffic/iv })).toBeInTheDocument();
  });

  it("clicking Stop Traffic returns to design mode", () => {
    renderScene({
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: testLevelConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    fireEvent.click(screen.getByRole("button", { name: /stop traffic/iv }));

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeInTheDocument();
  });

  it("simulation ends automatically after the timeout expires", () => {
    const engine = new SimulationEngine();
    renderScene({
      engine,
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: testLevelConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));

    act(() => {
      for (let t = 0; t < testLevelConfig.timeout + 500; t += 16) {
        engine.tick(16);
      }
    });

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeInTheDocument();
  });

  it("inspector load field reflects overloaded state for the selected node", () => {
    const engine = new SimulationEngine();
    renderScene({
      engine,
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: overloadLevelConfig,
    });

    fireEvent.click(screen.getByTestId("canvas-node-server-1"));
    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));

    act(() => {
      for (let t = 0; t < 5000; t += 16) {
        engine.tick(16);
      }
    });

    expect(screen.getByText(/\d+%.*\(overloaded\)/iv)).toBeInTheDocument();
  });

  it("returns the selected node to normal load state when traffic drops below capacity", () => {
    const engine = new SimulationEngine();
    renderScene({
      engine,
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: normalLoadLevelConfig,
    });

    fireEvent.click(screen.getByTestId("canvas-node-server-1"));
    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));

    act(() => {
      for (let t = 0; t < 5000; t += 16) {
        engine.tick(16);
      }
    });

    const inspector = screen.getByTestId("inspector");

    expect(inspector).not.toHaveTextContent(/\(overloaded\)/iv);
  });
});

describe("level system", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
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
    const engine = new SimulationEngine();
    renderScene({
      engine,
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: winLevelConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      for (let t = 0; t < 4000; t += 16) {
        engine.tick(16);
      }
    });

    expect(screen.getByRole("heading", { name: /level complete/iv })).toBeInTheDocument();
  });

  it("replay button dismisses end-of-level screen and returns to design mode", () => {
    const engine = new SimulationEngine();
    renderScene({
      engine,
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: winLevelConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      for (let t = 0; t < 4000; t += 16) {
        engine.tick(16);
      }
    });
    fireEvent.click(screen.getByRole("button", { name: /replay/iv }));

    expect(screen.queryByRole("heading", { name: /level complete/iv })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeInTheDocument();
  });

  it("continue button dismisses end-of-level screen", () => {
    const engine = new SimulationEngine();
    renderScene({
      engine,
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: winLevelConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      for (let t = 0; t < 4000; t += 16) {
        engine.tick(16);
      }
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/iv }));

    expect(screen.queryByRole("heading", { name: /level complete/iv })).not.toBeInTheDocument();
  });

  it("saves completed level to localStorage when a level is won", () => {
    const engine = new SimulationEngine();
    render(
      <GameSceneHarness
        engine={engine}
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      for (let t = 0; t < 4000; t += 16) {
        engine.tick(16);
      }
    });

    expect(loadProgress().completedLevels).toContain(levelRegistry.levels[0]!.id);
  });

  it("starts on the first incomplete level derived from saved progress", () => {
    localStorage.setItem(
      "sdb_progress",
      JSON.stringify({ completedLevels: [levelRegistry.levels[0]!.id], version: 1 }),
    );

    render(<GameLayout />);

    expect(screen.getByTestId(`level-strip-level-${levelRegistry.levels[1]!.id}`)).toHaveAttribute(
      "data-status",
      "active",
    );
  });

  it("loads the correct canvas nodes and resources for the first incomplete level on page load", () => {
    localStorage.setItem(
      "sdb_progress",
      JSON.stringify({ completedLevels: [levelRegistry.levels[0]!.id], version: 1 }),
    );

    render(<GameLayout />);

    // Level 2 starts with two servers; level 1 starts with only a users node
    expect(screen.getByTestId("canvas-node-server-2")).toBeInTheDocument();
    // Level 2 has load-balancer in its palette; level 1 does not
    expect(screen.getByTestId("resource-item-load-balancer")).toBeInTheDocument();
  });

  it("loads the next level after continue is clicked", () => {
    const engine = new SimulationEngine();
    render(
      <GameSceneHarness
        engine={engine}
        initialEdges={overloadEdges}
        initialNodes={overloadNodes}
        levelConfig={winLevelConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      for (let t = 0; t < 4000; t += 16) {
        engine.tick(16);
      }
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/iv }));

    expect(screen.getByTestId(`level-strip-level-${levelRegistry.levels[1]!.id}`)).toHaveAttribute(
      "data-status",
      "active",
    );
  });
});

describe("level context UI", () => {
  it("shows the active level objective in the UI", () => {
    render(<GameLayout />);

    expect(screen.getAllByText(/fix the architecture/iv).length).toBeGreaterThan(0);
  });

  it("shows the level objective text", () => {
    render(<GameLayout />);

    expect(
      screen.getByText("Your server is overloaded. Fix the architecture to handle 70 ops/s."),
    ).toBeInTheDocument();
  });
});

describe("simulation gating", () => {
  it("start traffic button is disabled when canvas has no runnable path", () => {
    renderScene({ initialEdges: [], initialNodes: overloadNodes });

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeDisabled();
  });

  it("start traffic button is enabled when users node has an outgoing connection", () => {
    renderScene({ initialEdges: overloadEdges, initialNodes: overloadNodes });

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
    localStorage.setItem(
      "sdb_progress",
      JSON.stringify({ completedLevels: [levelRegistry.levels[0]!.id], version: 1 }),
    );

    render(<GameLayout />);

    expect(screen.getByTestId(`level-strip-level-${levelRegistry.levels[0]!.id}`)).toHaveAttribute(
      "data-status",
      "completed",
    );
  });

  it("selecting a completed level from the strip loads that level", () => {
    localStorage.setItem(
      "sdb_progress",
      JSON.stringify({
        completedLevels: [levelRegistry.levels[0]!.id, levelRegistry.levels[1]!.id],
        version: 1,
      }),
    );

    render(<GameLayout />);
    fireEvent.click(screen.getByTestId(`level-strip-level-${levelRegistry.levels[0]!.id}`));

    expect(screen.getAllByText(/fix the architecture/iv).length).toBeGreaterThan(0);
  });
});

describe("coach panel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("shows an opening mission message when a level starts", () => {
    render(<GameLayout />);

    expect(screen.getByRole("heading", { name: /coach/iv })).toBeInTheDocument();
    expect(screen.getByText(/mission: your server is overloaded/iv)).toBeInTheDocument();
  });

  it("shows a timed coach message during simulation", () => {
    // Level 3 has a coachMessage at atMs: 2_000 about the database bottleneck
    const engine = new SimulationEngine();
    renderScene({
      currentLevel: level3,
      engine,
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: overloadLevelConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      for (let t = 0; t < 3000; t += 16) {
        engine.tick(16);
      }
    });

    expect(screen.getByText(/database is the bottleneck/iv)).toBeInTheDocument();
  });

  it("shows a coaching message the first time overload occurs in a level", () => {
    const engine = new SimulationEngine();
    renderScene({
      currentLevel: { ...level1, coachMessages: [] },
      engine,
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: overloadLevelConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      for (let t = 0; t < 5000; t += 16) {
        engine.tick(16);
      }
    });

    expect(screen.getByText(/overload detected/iv)).toBeInTheDocument();
  });
});

describe("event log", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("logs placement and connections in chronological order", () => {
    const engine = new SimulationEngine();
    renderScene({
      engine,
      initialEdges: overloadEdges,
      initialNodes: unlockedLevel3Nodes,
      levelConfig: resolvingOverloadLevelConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      for (let t = 0; t < 3000; t += 16) {
        engine.tick(16);
      }
    });

    expect(screen.getByRole("heading", { name: /event log/iv })).toBeInTheDocument();
    expect(screen.getByText(/component placed: users/iv)).toBeInTheDocument();
    expect(screen.getAllByText(/component placed: small server/iv)).toHaveLength(2);
    expect(screen.getByText(/connection created/iv)).toBeInTheDocument();
  });

  it("logs overload start and resolution events", () => {
    const engine = new SimulationEngine();
    renderScene({
      engine,
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: overloadResolvingConfig,
    });

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));
    act(() => {
      // This is slightly brittle, so if it fails the may simply need
      // increasing.
      for (let t = 0; t < 7000; t += 16) {
        engine.tick(16);
      }
    });

    const eventLog = screen.getByTestId("event-log-list");

    expect(eventLog).toHaveTextContent(/overload started/iv);
    expect(eventLog).toHaveTextContent(/overload resolved/iv);
  });
});

describe("budget enforcement", () => {
  it("shows a budget warning when a placed component would exceed the monthly budget", () => {
    // OverloadNodes = users ($0) + server ($20) = $20 total; budget $20 → no room for another
    const tightBudgetConfig: LevelConfig = {
      cacheHitRate: 0,
      monthlyBudget: 20,
      timeout: 60_000,
      trafficPeak: 0.0004,
      trafficStart: 0.0004,
      trafficTarget: 0.0004,
      winSustainMs: 10_000,
    };

    renderScene({
      initialEdges: overloadEdges,
      initialNodes: overloadNodes,
      levelConfig: tightBudgetConfig,
    });

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
