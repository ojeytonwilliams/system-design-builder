import {
  COMPONENT_LIBRARY,
  CONNECTION_LIBRARY,
  convertConnectionLibrary,
  convertDuration,
  convertRate,
  convertSimComponentLibrary,
  TIME_SCALE,
  toRealRate,
} from "./component-library.js";

describe(convertDuration, () => {
  it("multiplies by TIME_SCALE", () => {
    expect(convertDuration(10)).toBe(10 * TIME_SCALE);
  });

  it("handles zero", () => {
    expect(convertDuration(0)).toBe(0);
  });
});

describe(convertRate, () => {
  it("divides by TIME_SCALE", () => {
    expect(convertRate(1)).toBeCloseTo(1 / TIME_SCALE);
  });

  it("handles zero", () => {
    expect(convertRate(0)).toBe(0);
  });
});

describe(toRealRate, () => {
  it("multiplies by TIME_SCALE (inverse of convertRate)", () => {
    expect(toRealRate(1 / TIME_SCALE)).toBeCloseTo(1);
  });

  it("handles zero", () => {
    expect(toRealRate(0)).toBe(0);
  });
});

describe(convertSimComponentLibrary, () => {
  it("applies convertDuration to latencyMs for each component type", () => {
    const lib = convertSimComponentLibrary(COMPONENT_LIBRARY);
    expect(lib.server.latencyMs).toBe(convertDuration(COMPONENT_LIBRARY.server.latencyMs));
    expect(lib.cache.latencyMs).toBe(convertDuration(COMPONENT_LIBRARY.cache.latencyMs));
    expect(lib.db.latencyMs).toBe(convertDuration(COMPONENT_LIBRARY.db.latencyMs));
  });

  it("applies convertRate to finite capacities", () => {
    const lib = convertSimComponentLibrary(COMPONENT_LIBRARY);
    expect(lib.server.capacity).toBeCloseTo(convertRate(COMPONENT_LIBRARY.server.capacity));
    expect(lib.db.capacity).toBeCloseTo(convertRate(COMPONENT_LIBRARY.db.capacity));
  });

  it("leaves Infinity capacities unchanged", () => {
    const lib = convertSimComponentLibrary(COMPONENT_LIBRARY);
    expect(lib["load-balancer"].capacity).toBe(Infinity);
    expect(lib.users.capacity).toBe(Infinity);
  });
});

describe(convertConnectionLibrary, () => {
  it("applies convertDuration to transitMs", () => {
    const lib = convertConnectionLibrary(CONNECTION_LIBRARY);
    expect(lib.standard.transitMs).toBe(convertDuration(CONNECTION_LIBRARY.standard.transitMs));
  });
});
