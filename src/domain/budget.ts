import { COMPONENT_LIBRARY } from "./component-library.js";
import type { ArchitectureNode } from "./canvas-logic.js";

const THREE_STAR_THRESHOLD = 0.5;
const TWO_STAR_THRESHOLD = 0.2;

const computeTotalCost = (nodes: ArchitectureNode[]): number =>
  nodes.reduce((sum, node) => sum + COMPONENT_LIBRARY[node.componentType].monthlyCost, 0);

const canAfford = (totalCost: number, addedCost: number, budget: number): boolean =>
  totalCost + addedCost <= budget;

const overBudgetMessage = (addedCost: number, remaining: number): string =>
  `Over budget — this component costs $${addedCost}/mo but you only have $${remaining} remaining.`;

const computeStars = (remainingBudget: number, monthlyBudget: number): 1 | 2 | 3 => {
  const headroom = monthlyBudget > 0 ? remainingBudget / monthlyBudget : 0;

  if (headroom >= THREE_STAR_THRESHOLD) {
    return 3;
  }

  if (headroom >= TWO_STAR_THRESHOLD) {
    return 2;
  }

  return 1;
};

export { canAfford, computeStars, computeTotalCost, overBudgetMessage };
