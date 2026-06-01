import { COMPONENT_LIBRARY, CONNECTION_LIBRARY } from "./component-library.js";
import { toRealDuration, toRealRate } from "./sim-time-converter.js";

describe("component library", () => {
  it("latencyMs values are pre-converted to simulation time", () => {
    expect(toRealDuration(COMPONENT_LIBRARY.server.latencyMs)).toBe(10);
    expect(toRealDuration(COMPONENT_LIBRARY.cache.latencyMs)).toBe(5);
    expect(toRealDuration(COMPONENT_LIBRARY.db.latencyMs)).toBe(15);
  });

  it("finite capacity values are pre-converted to simulation rate", () => {
    expect(toRealRate(COMPONENT_LIBRARY.server.capacity)).toBeCloseTo(0.05);
    expect(toRealRate(COMPONENT_LIBRARY.db.capacity)).toBeCloseTo(0.03);
  });

  it("infinity capacities are unchanged", () => {
    expect(COMPONENT_LIBRARY["load-balancer"].capacity).toBe(Infinity);
    expect(COMPONENT_LIBRARY.users.capacity).toBe(Infinity);
  });
});

describe("connection library", () => {
  it("transitMs is pre-converted to simulation time", () => {
    expect(toRealDuration(CONNECTION_LIBRARY.standard.transitMs)).toBe(10);
  });
});
