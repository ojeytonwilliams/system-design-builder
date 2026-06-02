import { NodeRouter } from "./node-router.js";
import type { WeightedOption } from "./request-router.js";

const transit = (edgeId: string): WeightedOption["option"] => ({ edgeId, status: "IN_TRANSIT" });
const fulfilled: WeightedOption["option"] = { status: "FULFILLED" };

describe(NodeRouter, () => {
  describe("two equal-weight options", () => {
    it("routes to the first option on the first call", () => {
      const router = new NodeRouter();
      const options: WeightedOption[] = [
        { option: transit("e1"), weight: 0.5 },
        { option: transit("e2"), weight: 0.5 },
      ];

      expect(router.route(options)).toStrictEqual(transit("e1"));
    });

    it("alternates strictly between the two options", () => {
      const router = new NodeRouter();
      const options: WeightedOption[] = [
        { option: transit("e1"), weight: 0.5 },
        { option: transit("e2"), weight: 0.5 },
      ];

      const results = Array.from({ length: 6 }, () => router.route(options));

      expect(results).toStrictEqual([
        transit("e1"),
        transit("e2"),
        transit("e1"),
        transit("e2"),
        transit("e1"),
        transit("e2"),
      ]);
    });

    it("continues to alternate correctly over 20 calls", () => {
      const router = new NodeRouter();
      const options: WeightedOption[] = [
        { option: transit("e1"), weight: 0.5 },
        { option: transit("e2"), weight: 0.5 },
      ];
      const e1 = transit("e1");
      const e2 = transit("e2");
      const results = Array.from({ length: 20 }, () => router.route(options));
      expect(results).toStrictEqual([
        e1,
        e2,
        e1,
        e2,
        e1,
        e2,
        e1,
        e2,
        e1,
        e2,
        e1,
        e2,
        e1,
        e2,
        e1,
        e2,
        e1,
        e2,
        e1,
        e2,
      ]);
    });
  });

  describe("three equal-weight options", () => {
    it("cycles through all three options in order", () => {
      const router = new NodeRouter();
      const options: WeightedOption[] = [
        { option: transit("e1"), weight: 1 / 3 },
        { option: transit("e2"), weight: 1 / 3 },
        { option: transit("e3"), weight: 1 / 3 },
      ];

      const results = Array.from({ length: 6 }, () => router.route(options));

      expect(results).toStrictEqual([
        transit("e1"),
        transit("e2"),
        transit("e3"),
        transit("e1"),
        transit("e2"),
        transit("e3"),
      ]);
    });

    it("continues to cycle correctly over 30 calls", () => {
      const router = new NodeRouter();
      const options: WeightedOption[] = [
        { option: transit("e1"), weight: 1 / 3 },
        { option: transit("e2"), weight: 1 / 3 },
        { option: transit("e3"), weight: 1 / 3 },
      ];
      const e1 = transit("e1");
      const e2 = transit("e2");
      const e3 = transit("e3");
      const cycle = [e1, e2, e3];
      const results = Array.from({ length: 30 }, () => router.route(options));
      expect(results).toStrictEqual([
        ...cycle,
        ...cycle,
        ...cycle,
        ...cycle,
        ...cycle,
        ...cycle,
        ...cycle,
        ...cycle,
        ...cycle,
        ...cycle,
      ]);
    });
  });

  describe("0.6 / 0.4 weighted options (cache hit rate)", () => {
    it("produces the correct sequence over one period of 5", () => {
      const router = new NodeRouter();
      const options: WeightedOption[] = [
        { option: fulfilled, weight: 0.6 },
        { option: transit("db"), weight: 0.4 },
      ];

      const results = Array.from({ length: 5 }, () => router.route(options));

      expect(results).toStrictEqual([
        fulfilled,
        transit("db"),
        fulfilled,
        transit("db"),
        fulfilled,
      ]);
    });

    it("delivers exactly 2 db-bound requests in every period of 5", () => {
      const router = new NodeRouter();
      const options: WeightedOption[] = [
        { option: fulfilled, weight: 0.6 },
        { option: transit("db"), weight: 0.4 },
      ];
      const results = Array.from({ length: 20 }, () => router.route(options));

      for (let i = 0; i < results.length; i += 5) {
        const period = results.slice(i, i + 5);
        const dbCount = period.filter((r) => r.status === "IN_TRANSIT").length;
        expect(dbCount).toBe(2);
      }
    });
  });

  describe("single option", () => {
    it("always returns the only option", () => {
      const router = new NodeRouter();
      const options: WeightedOption[] = [{ option: fulfilled, weight: 1 }];

      const results = Array.from({ length: 5 }, () => router.route(options));

      expect(results).toStrictEqual([fulfilled, fulfilled, fulfilled, fulfilled, fulfilled]);
    });
  });

  describe("empty options", () => {
    it("returns FULFILLED when no options are provided", () => {
      const router = new NodeRouter();

      expect(router.route([])).toStrictEqual(fulfilled);
    });
  });
});
