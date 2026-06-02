import type { RouterResult, WeightedOption } from "./request-router.js";

const optionKey = (option: RouterResult): string =>
  option.status === "IN_TRANSIT" ? option.edgeId : "FULFILLED";

/**
 * Deterministic weighted round-robin router.
 *
 * On each call to route(), selects the option most "owed" a selection:
 *   owed(i) = totalCalls × weightᵢ − selectionsᵢ
 *
 * Ties are broken by position in the options array (first wins).
 *
 * This guarantees that in any M consecutive calls, each option i receives
 * between floor(M × wᵢ) and ceil(M × wᵢ) selections — at most ±1 from
 * the expected fraction.
 *
 * For equal-weight options the comparison reduces to integer selection
 * counts, so the result is exact regardless of floating-point weight
 * representation.
 *
 * The static validator's formula (floor(W × r) + 1) / W equals this
 * upper bound, so a level that passes static validation is guaranteed
 * never to overload in simulation when this router is used.
 */
class NodeRouter {
  private totalCalls = 0;
  private readonly selections = new Map<string, number>();

  route(options: WeightedOption[]): RouterResult {
    if (options.length === 0) {
      return { status: "FULFILLED" };
    }

    this.totalCalls += 1;

    let bestOption = options[0]!;
    let bestOwed =
      this.totalCalls * options[0]!.weight -
      (this.selections.get(optionKey(options[0]!.option)) ?? 0);

    for (let i = 1; i < options.length; i++) {
      const opt = options[i]!;
      const owed = this.totalCalls * opt.weight - (this.selections.get(optionKey(opt.option)) ?? 0);
      if (owed > bestOwed) {
        bestOwed = owed;
        bestOption = opt;
      }
    }

    const key = optionKey(bestOption.option);
    this.selections.set(key, (this.selections.get(key) ?? 0) + 1);

    return bestOption.option;
  }
}

export { NodeRouter };
