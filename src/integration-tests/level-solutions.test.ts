import { COMPONENT_LIBRARY } from "../domain/component-library.js";
import { validateLevelSolution } from "../levels/level-validator.js";
import { levelRegistry } from "../levels/index.js";
import type { LevelDefinition, LevelSolution } from "../levels/types.js";
import { SimulationEngine, TICK_INTERVAL_MS } from "../simulation/simulation-engine.js";
import { WinConditionChecker } from "../simulation/subscribers/win-condition-checker.js";
import { computeTotalCost } from "../domain/budget.js";

const runLevelSolution = (level: LevelDefinition, solution: LevelSolution): boolean => {
  const inBudget = computeTotalCost(solution.nodes) <= level.monthlyBudget;
  if (!inBudget) {
    return false;
  }

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

describe.each(levelRegistry.levels)("$title", (level) => {
  it.each(level.solutions.map((solution, index) => ({ index: String(index), solution })))(
    "solution $index passes static capacity validation",
    ({ solution }) => {
      expect(validateLevelSolution(level, solution, COMPONENT_LIBRARY).valid).toBe(true);
    },
  );

  it.each(level.solutions.map((solution, index) => ({ index: String(index), solution })))(
    "solution $index wins within the timeout",
    ({ solution }) => {
      expect(runLevelSolution(level, solution)).toBe(true);
    },
  );

  it("fails for the initial conditions", () => {
    expect(
      runLevelSolution(level, {
        edges: level.startingEdges,
        nodes: level.startingNodes,
      }),
    ).toBe(false);
  });
});
