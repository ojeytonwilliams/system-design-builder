import { getFirstIncompleteLevel, loadProgress, saveProgress } from "./persistence.js";

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty completedLevels when nothing is saved", () => {
    const result = loadProgress();

    expect(result.completedLevels).toStrictEqual([]);
  });

  it("saves and restores completed levels", () => {
    saveProgress([1, 2, 3]);

    const result = loadProgress();

    expect(result.completedLevels).toStrictEqual([1, 2, 3]);
  });

  it("returns empty completedLevels when the stored version does not match", () => {
    localStorage.setItem("sdb_progress", JSON.stringify({ completedLevels: [1, 2], version: 0 }));

    const result = loadProgress();

    expect(result.completedLevels).toStrictEqual([]);
  });

  it("returns empty completedLevels when stored data is malformed JSON", () => {
    localStorage.setItem("sdb_progress", "not-valid-json");

    const result = loadProgress();

    expect(result.completedLevels).toStrictEqual([]);
  });

  it("returns empty completedLevels when stored data is not an object", () => {
    localStorage.setItem("sdb_progress", JSON.stringify(42));

    const result = loadProgress();

    expect(result.completedLevels).toStrictEqual([]);
  });

  it("overwrites previously saved progress", () => {
    saveProgress([1]);
    saveProgress([1, 2]);

    const result = loadProgress();

    expect(result.completedLevels).toStrictEqual([1, 2]);
  });
});

describe(getFirstIncompleteLevel, () => {
  const TOTAL = 6;

  it("returns 1 when no levels are completed", () => {
    expect(getFirstIncompleteLevel([], TOTAL)).toBe(1);
  });

  it("returns 2 when only level 1 is completed", () => {
    expect(getFirstIncompleteLevel([1], TOTAL)).toBe(2);
  });

  it("returns the next sequential level when several early levels are completed", () => {
    expect(getFirstIncompleteLevel([1, 2, 3], TOTAL)).toBe(4);
  });

  it("returns the total when all levels except the last are completed", () => {
    expect(getFirstIncompleteLevel([1, 2, 3, 4, 5], TOTAL)).toBe(6);
  });

  it("returns the total (not beyond) when every level is completed", () => {
    expect(getFirstIncompleteLevel([1, 2, 3, 4, 5, 6], TOTAL)).toBe(TOTAL);
  });
});
