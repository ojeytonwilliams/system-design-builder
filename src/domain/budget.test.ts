import { canAfford, computeStars, computeTotalCost, overBudgetMessage } from "./budget.js";

const makeNode = (id: string, componentType: "server" | "db" | "cache" | "users") => ({
  componentType,
  id,
  position: { x: 0, y: 0 },
});

describe(computeTotalCost, () => {
  it("returns 0 for empty nodes", () => {
    expect(computeTotalCost([])).toBe(0);
  });

  it("returns cost of a single node", () => {
    // server costs $20/mo per component-library
    expect(computeTotalCost([makeNode("n1", "server")])).toBe(20);
  });

  it("sums costs across multiple nodes", () => {
    // server $20 + db $15 = $35
    expect(computeTotalCost([makeNode("n1", "server"), makeNode("n2", "db")])).toBe(35);
  });

  it("includes zero-cost nodes without error", () => {
    // users $0 + cache $25 = $25
    expect(computeTotalCost([makeNode("n1", "users"), makeNode("n2", "cache")])).toBe(25);
  });
});

describe(canAfford, () => {
  it("returns true when total plus added cost is within budget", () => {
    expect(canAfford(30, 20, 100)).toBe(true);
  });

  it("returns true when total plus added cost equals the budget exactly", () => {
    expect(canAfford(80, 20, 100)).toBe(true);
  });

  it("returns false when total plus added cost exceeds budget", () => {
    expect(canAfford(90, 20, 100)).toBe(false);
  });
});

describe(overBudgetMessage, () => {
  it("includes the component cost and remaining budget", () => {
    expect(overBudgetMessage(20, 10)).toBe(
      "Over budget — this component costs $20/mo but you only have $10 remaining.",
    );
  });
});

describe(computeStars, () => {
  it("returns 3 stars when remaining budget is 50% or more", () => {
    expect(computeStars(50, 100)).toBe(3);
    expect(computeStars(100, 100)).toBe(3);
  });

  it("returns 2 stars when remaining budget is between 20% and 50%", () => {
    expect(computeStars(20, 100)).toBe(2);
    expect(computeStars(49, 100)).toBe(2);
  });

  it("returns 1 star when remaining budget is below 20%", () => {
    expect(computeStars(19, 100)).toBe(1);
    expect(computeStars(0, 100)).toBe(1);
  });

  it("returns 1 star when budget is zero", () => {
    expect(computeStars(0, 0)).toBe(1);
  });
});
