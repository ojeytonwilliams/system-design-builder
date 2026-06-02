import { levelRegistry } from "../levels/index.js";
import type { LevelDefinition, LevelSolution } from "../levels/types.js";
import { SimulationEngine, TICK_INTERVAL_MS } from "../simulation/simulation-engine.js";
import { WinConditionChecker } from "../simulation/subscribers/win-condition-checker.js";

const runLevelSolution = (level: LevelDefinition, solution: LevelSolution): boolean => {
  let won = false;
  const engine = new SimulationEngine();
  const checker = new WinConditionChecker(engine, level, {
    onWin: () => {
      won = true;
    },
  });

  engine.setConfig(level);
  engine.setGraph(solution.nodes, solution.edges);

  const maxTicks = Math.ceil(level.timeout / TICK_INTERVAL_MS) + 1;
  for (let i = 0; i < maxTicks; i++) {
    engine.tick(TICK_INTERVAL_MS);
    if (won) {
      break;
    }
  }

  checker.destroy();
  return won;
};

// oxlint-disable-next-line vitest/no-disabled-tests
describe.skip("level solutions", () => {
  it.each(levelRegistry.levels)("level $title solution wins within the timeout", (level) => {
    expect(runLevelSolution(level, level.solution)).toBe(true);
  });

  it.each(levelRegistry.levels)("level $title fails for the initial conditions", (level) => {
    expect(
      runLevelSolution(level, {
        edges: level.startingEdges,
        nodes: level.startingNodes,
      }),
    ).toBe(false);
  });
});
