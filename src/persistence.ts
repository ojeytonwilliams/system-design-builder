const STORAGE_KEY = "sdb_progress";
const SCHEMA_VERSION = 1;

interface PersistedProgress {
  completedLevels: string[];
  version: number;
}

const isPersistedProgress = (value: unknown): value is PersistedProgress => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("version" in value) || !("completedLevels" in value)) {
    return false;
  }

  return value.version === SCHEMA_VERSION && Array.isArray(value.completedLevels);
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

const saveProgress = (completedLevels: string[]): void => {
  const data: PersistedProgress = { completedLevels, version: SCHEMA_VERSION };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export { loadProgress, saveProgress };
