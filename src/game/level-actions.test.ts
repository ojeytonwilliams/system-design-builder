import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import type { ComponentType } from "../domain/component-library.js";
import { convertLevel } from "../levels/index.js";
import type { LevelDefinition } from "../levels/types.js";
import type { GraphAction } from "./graph-reducer.js";
import type { PhaseAction } from "./phase-machine.js";
import { continueLevel, loadLevel, replayLevel, selectLevel } from "./level-actions.js";

const nodeA: ArchitectureNode = { componentType: "users", id: "users-1", position: { x: 0, y: 0 } };
const edgeAB: ArchitectureEdge = { id: "edge-1", source: "users-1", target: "server-1" };

const stubLevel = convertLevel({
  availableComponents: ["server"],
  cacheHitRate: 0,
  coachMessages: [],
  componentUnlocks: [],
  feedbackText: [],
  id: "level-1",
  lockedNodeIds: [],
  monthlyBudget: 500,
  objectiveText: "Build a server",
  solutions: [{ edges: [], nodes: [] }],
  startingEdges: [],
  startingNodes: [],
  timeout: 60_000,
  title: "Level 1",
  trafficPeak: 0.1,
  trafficStart: 0.05,
  trafficTarget: 0.1,
  winSustainMs: 10_000,
});

const stubLevel2: LevelDefinition = { ...stubLevel, id: "level-2", title: "Level 2" };

const makeParams = () => ({
  dispatchGraph: vi.fn<(action: GraphAction) => void>(),
  dispatchPhase: vi.fn<(action: PhaseAction) => void>(),
  initialiseLevel: vi
    .fn<
      (level: LevelDefinition) => { newEdges: ArchitectureEdge[]; newNodes: ArchitectureNode[] }
    >()
    .mockReturnValue({ newEdges: [edgeAB], newNodes: [nodeA] }),
  resetEvents: vi.fn<(nodes: ArchitectureNode[], edges: ArchitectureEdge[]) => void>(),
  setCoachMessage: vi.fn<(msg: string) => void>(),
  setPrevAvailableComponents: vi.fn<(components: ComponentType[]) => void>(),
  setQueuedComponentType: vi.fn<(type: string | null) => void>(),
  setSelectedNodeId: vi.fn<(id: string | null) => void>(),
});

describe(loadLevel, () => {
  it("calls initialiseLevel with the given level", () => {
    const params = makeParams();
    loadLevel(stubLevel, params);
    expect(params.initialiseLevel).toHaveBeenCalledWith(stubLevel);
  });

  it("dispatches LOAD_LEVEL to the graph with nodes and edges from initialiseLevel", () => {
    const params = makeParams();
    loadLevel(stubLevel, params);
    expect(params.dispatchGraph).toHaveBeenCalledWith({
      edges: [edgeAB],
      nodes: [nodeA],
      type: "LOAD_LEVEL",
    });
  });

  it("dispatches LOAD_LEVEL to the phase", () => {
    const params = makeParams();
    loadLevel(stubLevel, params);
    expect(params.dispatchPhase).toHaveBeenCalledWith({ type: "LOAD_LEVEL" });
  });

  it("sets the coach message to the level objective", () => {
    const params = makeParams();
    loadLevel(stubLevel, params);
    expect(params.setCoachMessage).toHaveBeenCalledWith("Mission: Build a server");
  });

  it("clears the selected node", () => {
    const params = makeParams();
    loadLevel(stubLevel, params);
    expect(params.setSelectedNodeId).toHaveBeenCalledWith(null);
  });

  it("clears the queued component type", () => {
    const params = makeParams();
    loadLevel(stubLevel, params);
    expect(params.setQueuedComponentType).toHaveBeenCalledWith(null);
  });

  it("resets events with the new nodes and edges", () => {
    const params = makeParams();
    loadLevel(stubLevel, params);
    expect(params.resetEvents).toHaveBeenCalledWith([nodeA], [edgeAB]);
  });

  it("calls setPrevAvailableComponents with the level's available components", () => {
    const params = makeParams();
    loadLevel(stubLevel, params);
    expect(params.setPrevAvailableComponents).toHaveBeenCalledWith(["server"]);
  });
});

describe(continueLevel, () => {
  const allLevels = [stubLevel, stubLevel2];

  it("calls onLoadLevel with the next level", () => {
    const dispatchPhase = vi.fn<(action: PhaseAction) => void>();
    const onLoadLevel = vi.fn<(level: LevelDefinition) => void>();
    continueLevel("level-1", allLevels, dispatchPhase, onLoadLevel);
    expect(onLoadLevel).toHaveBeenCalledWith(stubLevel2);
  });

  it("dispatches LOAD_LEVEL and does not call onLoadLevel when already on the last level", () => {
    const dispatchPhase = vi.fn<(action: PhaseAction) => void>();
    const onLoadLevel = vi.fn<(level: LevelDefinition) => void>();
    continueLevel("level-2", allLevels, dispatchPhase, onLoadLevel);
    expect(dispatchPhase).toHaveBeenCalledWith({ type: "LOAD_LEVEL" });
    expect(onLoadLevel).not.toHaveBeenCalled();
  });
});

describe(replayLevel, () => {
  it("calls onLoadLevel with the current level", () => {
    const onLoadLevel = vi.fn<(level: LevelDefinition) => void>();
    replayLevel(stubLevel, onLoadLevel);
    expect(onLoadLevel).toHaveBeenCalledWith(stubLevel);
  });
});

describe(selectLevel, () => {
  const allLevels = [stubLevel, stubLevel2];
  const getLevelById = (id: string) => allLevels.find((l) => l.id === id);

  it("calls onLoadLevel with the matching level", () => {
    const onLoadLevel = vi.fn<(level: LevelDefinition) => void>();
    selectLevel("level-2", getLevelById, onLoadLevel);
    expect(onLoadLevel).toHaveBeenCalledWith(stubLevel2);
  });

  it("does nothing when the level id is not found", () => {
    const onLoadLevel = vi.fn<(level: LevelDefinition) => void>();
    selectLevel("unknown", getLevelById, onLoadLevel);
    expect(onLoadLevel).not.toHaveBeenCalled();
  });
});
