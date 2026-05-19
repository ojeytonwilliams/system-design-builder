import { useCallback, useState } from "react";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import { levelRegistry } from "../levels/index.js";
import { level1 } from "../levels/level1.js";
import type { LevelDefinition } from "../levels/types.js";
import { loadProgress, saveProgress } from "../persistence.js";

interface LoadLevelResult {
  newEdges: ArchitectureEdge[];
  newNodes: ArchitectureNode[];
}

interface UseLevelResult {
  canvasKey: number;
  completedLevels: string[];
  currentLevel: LevelDefinition;
  loadLevel: (level: LevelDefinition) => LoadLevelResult;
  markLevelComplete: (levelId: string) => void;
}

const useLevel = (): UseLevelResult => {
  const [currentLevelId, setCurrentLevelId] = useState<string>(() => {
    const progress = loadProgress();
    return levelRegistry.getFirstIncompleteLevel(progress.completedLevels);
  });
  const [completedLevels, setCompletedLevels] = useState<string[]>(
    () => loadProgress().completedLevels,
  );
  const [canvasKey, setCanvasKey] = useState(0);

  const currentLevel = levelRegistry.getLevelById(currentLevelId) ?? level1;

  const loadLevel = useCallback((level: LevelDefinition): LoadLevelResult => {
    setCurrentLevelId(level.id);
    setCanvasKey((k) => k + 1);
    return { newEdges: level.startingEdges, newNodes: level.startingNodes };
  }, []);

  const markLevelComplete = useCallback((levelId: string) => {
    setCompletedLevels((prev) => {
      const updated = [...new Set([...prev, levelId])];

      saveProgress(updated);

      return updated;
    });
  }, []);

  return {
    canvasKey,
    completedLevels,
    currentLevel,
    loadLevel,
    markLevelComplete,
  };
};

export { useLevel };
