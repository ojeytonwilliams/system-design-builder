import { useCallback, useState } from "react";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import { LEVELS, getLevelById } from "../levels/index.js";
import { level1 } from "../levels/level1.js";
import type { LevelDefinition } from "../levels/types.js";
import { getFirstIncompleteLevel, loadProgress, saveProgress } from "../persistence.js";

interface LoadLevelResult {
  newEdges: ArchitectureEdge[];
  newNodes: ArchitectureNode[];
}

interface UseLevelResult {
  canvasKey: number;
  completedLevels: string[];
  currentLevel: LevelDefinition;
  levelStartEdges: ArchitectureEdge[];
  levelStartNodes: ArchitectureNode[];
  loadLevel: (level: LevelDefinition) => LoadLevelResult;
  markLevelComplete: (levelId: string) => void;
}

const useLevel = (
  initialNodes: ArchitectureNode[],
  initialEdges: ArchitectureEdge[],
): UseLevelResult => {
  const hasInitialNodes = initialNodes.length > 0;

  const [currentLevelId, setCurrentLevelId] = useState<string>(() => {
    const progress = loadProgress();
    return getFirstIncompleteLevel(
      progress.completedLevels,
      LEVELS.map((l) => l.id),
    );
  });
  const [completedLevels, setCompletedLevels] = useState<string[]>(
    () => loadProgress().completedLevels,
  );

  const currentLevel = getLevelById(currentLevelId) ?? level1;

  const [levelStartNodes, setLevelStartNodes] = useState<ArchitectureNode[]>(() =>
    hasInitialNodes ? initialNodes : currentLevel.startingNodes,
  );
  const [levelStartEdges, setLevelStartEdges] = useState<ArchitectureEdge[]>(() =>
    hasInitialNodes ? initialEdges : currentLevel.startingEdges,
  );
  const [canvasKey, setCanvasKey] = useState(0);

  const loadLevel = useCallback((level: LevelDefinition): LoadLevelResult => {
    const newNodes = level.startingNodes;
    const newEdges = level.startingEdges;

    setCurrentLevelId(level.id);
    setLevelStartNodes(newNodes);
    setLevelStartEdges(newEdges);
    setCanvasKey((k) => k + 1);

    return { newEdges, newNodes };
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
    levelStartEdges,
    levelStartNodes,
    loadLevel,
    markLevelComplete,
  };
};

export { useLevel };
