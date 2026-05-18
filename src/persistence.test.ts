import { loadProgress, saveProgress } from "./persistence.js";

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
