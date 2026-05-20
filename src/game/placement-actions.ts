import { canAfford, overBudgetMessage } from "../domain/budget.js";
import type { ComponentType } from "../domain/component-library.js";

type PlaceResult =
  | { componentType: ComponentType; type: "QUEUED" }
  | { message: string; type: "OVER_BUDGET" };

const placeComponent = (
  componentType: ComponentType,
  addedCost: number,
  totalMonthlyCost: number,
  monthlyBudget: number,
): PlaceResult => {
  if (!canAfford(totalMonthlyCost, addedCost, monthlyBudget)) {
    return {
      message: overBudgetMessage(addedCost, monthlyBudget - totalMonthlyCost),
      type: "OVER_BUDGET",
    };
  }

  return { componentType, type: "QUEUED" };
};

export type { PlaceResult };
export { placeComponent };
