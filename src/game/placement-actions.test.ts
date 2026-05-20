import { placeComponent } from "./placement-actions.js";

describe(placeComponent, () => {
  it("returns QUEUED when within budget", () => {
    const result = placeComponent("server", 100, 300, 500);
    expect(result).toStrictEqual({ componentType: "server", type: "QUEUED" });
  });

  it("returns OVER_BUDGET with a message when cost exceeds remaining budget", () => {
    const result = placeComponent("server", 100, 450, 500);
    expect(result).toStrictEqual({
      message: "Over budget — this component costs $100/mo but you only have $50 remaining.",
      type: "OVER_BUDGET",
    });
  });
});
