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
  if (totalMonthlyCost + addedCost > monthlyBudget) {
    return {
      message: `Over budget — this component costs $${addedCost}/mo but you only have $${monthlyBudget - totalMonthlyCost} remaining.`,
      type: "OVER_BUDGET",
    };
  }

  return { componentType, type: "QUEUED" };
};

export type { PlaceResult };
export { placeComponent };
