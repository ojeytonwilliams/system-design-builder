import { toRealDuration, toRealRate } from "./sim-time-converter.js";

describe(toRealRate, () => {
  it("converts simulation rate to real-world rate", () => {
    expect(toRealRate(0.01)).toBeCloseTo(1);
  });

  it("handles zero", () => {
    expect(toRealRate(0)).toBe(0);
  });
});

describe(toRealDuration, () => {
  it("converts simulation duration to real-world duration", () => {
    expect(toRealDuration(1000)).toBe(10);
  });

  it("handles zero", () => {
    expect(toRealDuration(0)).toBe(0);
  });
});
