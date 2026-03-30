const STORAGE_KEY = "sdb_progress";
const SCHEMA_VERSION = 1;

interface PersistedProgress {
  completedLevels: number[];
  version: number;
}

const isPersistedProgress = (value: unknown): value is PersistedProgress => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return obj["version"] === SCHEMA_VERSION && Array.isArray(obj["completedLevels"]);
};

const loadProgress = (): PersistedProgress => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      return { completedLevels: [], version: SCHEMA_VERSION };
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isPersistedProgress(parsed)) {
      return { completedLevels: [], version: SCHEMA_VERSION };
    }

    return {
      completedLevels: parsed.completedLevels,
      version: SCHEMA_VERSION,
    };
  } catch {
    return { completedLevels: [], version: SCHEMA_VERSION };
  }
};

const saveProgress = (completedLevels: number[]): void => {
  const data: PersistedProgress = { completedLevels, version: SCHEMA_VERSION };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const getFirstIncompleteLevel = (completedLevels: number[], totalLevels: number): number => {
  for (let i = 1; i <= totalLevels; i++) {
    if (!completedLevels.includes(i)) {
      return i;
    }
  }

  return totalLevels;
};

export { getFirstIncompleteLevel, loadProgress, saveProgress };
export type { PersistedProgress };
