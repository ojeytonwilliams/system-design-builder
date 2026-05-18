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
    saveProgress(["id-a", "id-b", "id-c"]);

    const result = loadProgress();

    expect(result.completedLevels).toStrictEqual(["id-a", "id-b", "id-c"]);
  });

  it("returns empty completedLevels when the stored version does not match", () => {
    localStorage.setItem(
      "sdb_progress",
      JSON.stringify({ completedLevels: ["id-a", "id-b"], version: 0 }),
    );

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
    saveProgress(["id-a"]);
    saveProgress(["id-a", "id-b"]);

    const result = loadProgress();

    expect(result.completedLevels).toStrictEqual(["id-a", "id-b"]);
  });
});

describe(getFirstIncompleteLevel, () => {
  const ALL_IDS = ["a", "b", "c", "d", "e", "f"];

  it("returns the first id when no levels are completed", () => {
    expect(getFirstIncompleteLevel([], ALL_IDS)).toBe("a");
  });

  it("returns the second id when only the first is completed", () => {
    expect(getFirstIncompleteLevel(["a"], ALL_IDS)).toBe("b");
  });

  it("returns the next id when several early levels are completed", () => {
    expect(getFirstIncompleteLevel(["a", "b", "c"], ALL_IDS)).toBe("d");
  });

  it("returns the last id when all but the last are completed", () => {
    expect(getFirstIncompleteLevel(["a", "b", "c", "d", "e"], ALL_IDS)).toBe("f");
  });

  it("returns the last id (not beyond) when every level is completed", () => {
    expect(getFirstIncompleteLevel(["a", "b", "c", "d", "e", "f"], ALL_IDS)).toBe("f");
  });
});
