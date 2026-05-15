import { useCallback, useState } from "react";
import type { ArchitectureCanvasNode, Edge } from "../components/game-canvas.js";
import { LEVELS, getLevelById } from "../levels/index.js";
import { level1 } from "../levels/level1.js";
import type { LevelDefinition } from "../levels/types.js";
import { levelEdgeToCanvasEdge, levelNodeToCanvasNode } from "../layouts/level-canvas-adapters.js";
import { getFirstIncompleteLevel, loadProgress, saveProgress } from "../persistence.js";

interface LoadLevelResult {
  newEdges: Edge[];
  newNodes: ArchitectureCanvasNode[];
}

interface UseLevelResult {
  canvasKey: number;
  completedLevels: number[];
  currentLevel: LevelDefinition;
  levelStartEdges: Edge[];
  levelStartNodes: ArchitectureCanvasNode[];
  loadLevel: (level: LevelDefinition) => LoadLevelResult;
  markLevelComplete: (levelId: number) => void;
}

const toCanvasNodes = (level: LevelDefinition): ArchitectureCanvasNode[] =>
  level.startingNodes.map(levelNodeToCanvasNode);

const toCanvasEdges = (level: LevelDefinition): Edge[] =>
  level.startingEdges.map(levelEdgeToCanvasEdge);

const useLevel = (initialNodes: ArchitectureCanvasNode[], initialEdges: Edge[]): UseLevelResult => {
  const hasInitialNodes = initialNodes.length > 0;

  const [currentLevelId, setCurrentLevelId] = useState<number>(() => {
    const progress = loadProgress();
    return getFirstIncompleteLevel(progress.completedLevels, LEVELS.length);
  });
  const [completedLevels, setCompletedLevels] = useState<number[]>(
    () => loadProgress().completedLevels,
  );

  const currentLevel = getLevelById(currentLevelId) ?? level1;

  const [levelStartNodes, setLevelStartNodes] = useState<ArchitectureCanvasNode[]>(() =>
    hasInitialNodes ? initialNodes : toCanvasNodes(currentLevel),
  );
  const [levelStartEdges, setLevelStartEdges] = useState<Edge[]>(() =>
    hasInitialNodes ? initialEdges : toCanvasEdges(currentLevel),
  );
  const [canvasKey, setCanvasKey] = useState(0);

  const loadLevel = useCallback((level: LevelDefinition): LoadLevelResult => {
    const newNodes = toCanvasNodes(level);
    const newEdges = toCanvasEdges(level);

    setCurrentLevelId(level.id);
    setLevelStartNodes(newNodes);
    setLevelStartEdges(newEdges);
    setCanvasKey((k) => k + 1);

    return { newEdges, newNodes };
  }, []);

  const markLevelComplete = useCallback((levelId: number) => {
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
