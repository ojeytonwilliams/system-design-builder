import type { RouterResult, WeightedOption } from "./request-router.js";

/**
 * Deterministic weighted round-robin router.
 *
 * Accepts a fixed list of options with positive integer weights at construction
 * time. On each call to route(), selects the option most "owed" a selection
 * using the smooth WRR algorithm (i.e. the algorithm Nginx uses):
 *
 *   before each pick:  currentWeight[i] += weight[i]
 *   pick j = argmax(currentWeight)
 *   after pick:        currentWeight[j] -= totalWeight
 *
 * Ties are broken by position in the options array (first wins).
 *
 * Integer weights guarantee exact arithmetic with no floating-point
 * accumulation, so in any M consecutive calls each option i receives
 * between floor(M × wᵢ / W) and ceil(M × wᵢ / W) selections.
 */
class NodeRouter {
  private readonly options: WeightedOption[];
  private readonly totalWeight: number;
  private readonly currentWeights: number[];

  constructor(options: WeightedOption[]) {
    for (const { weight } of options) {
      if (!Number.isInteger(weight) || weight <= 0) {
        throw new Error(`NodeRouter requires positive integer weights, got: ${weight}`);
      }
    }
    this.options = options;
    this.totalWeight = options.reduce((sum, o) => sum + o.weight, 0);
    this.currentWeights = options.map(() => 0);
  }

  route(): RouterResult {
    if (this.options.length === 0) {
      return { status: "FULFILLED" };
    }

    for (let i = 0; i < this.currentWeights.length; i++) {
      this.currentWeights[i]! += this.options[i]!.weight;
    }

    let bestOption = 0;
    let bestCurrentWeight = this.currentWeights[0]!;

    for (let i = 1; i < this.options.length; i++) {
      if (this.currentWeights[i]! > bestCurrentWeight) {
        bestCurrentWeight = this.currentWeights[i]!;
        bestOption = i;
      }
    }

    this.currentWeights[bestOption]! -= this.totalWeight;

    return this.options[bestOption]!.option;
  }
}

export { NodeRouter };
