import { toDisplayDuration, toDisplayRate } from "./sim-time-converter.js";

describe(toDisplayRate, () => {
  it("converts simulation rate to display rate", () => {
    expect(toDisplayRate(0.01)).toBeCloseTo(1);
  });

  it("handles zero", () => {
    expect(toDisplayRate(0)).toBe(0);
  });
});

describe(toDisplayDuration, () => {
  it("converts simulation duration to display duration", () => {
    expect(toDisplayDuration(1000)).toBe(10);
  });

  it("handles zero", () => {
    expect(toDisplayDuration(0)).toBe(0);
  });
});
