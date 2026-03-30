import { fireEvent, render, screen } from "@testing-library/react";
import { LEVELS } from "../levels/index.js";
import { LevelStrip } from "./level-strip.js";

const noop = () => undefined;

describe("level strip", () => {
  it("renders a level progression navigation region", () => {
    render(
      <LevelStrip completedLevelIds={[]} currentLevelId={1} levels={LEVELS} onSelectLevel={noop} />,
    );

    expect(screen.getByRole("navigation", { name: /level progression/i })).toBeInTheDocument();
  });

  it("renders a button for each level", () => {
    render(
      <LevelStrip completedLevelIds={[]} currentLevelId={1} levels={LEVELS} onSelectLevel={noop} />,
    );

    LEVELS.forEach((level) => {
      expect(screen.getByTestId(`level-strip-level-${level.id}`)).toBeInTheDocument();
    });
  });

  it("marks completed levels with data-status completed", () => {
    render(
      <LevelStrip
        completedLevelIds={[1, 2]}
        currentLevelId={3}
        levels={LEVELS}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByTestId("level-strip-level-1")).toHaveAttribute("data-status", "completed");
    expect(screen.getByTestId("level-strip-level-2")).toHaveAttribute("data-status", "completed");
  });

  it("marks the current level with data-status active", () => {
    render(
      <LevelStrip
        completedLevelIds={[1]}
        currentLevelId={2}
        levels={LEVELS}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByTestId("level-strip-level-2")).toHaveAttribute("data-status", "active");
  });

  it("marks levels after the current as locked", () => {
    render(
      <LevelStrip completedLevelIds={[]} currentLevelId={1} levels={LEVELS} onSelectLevel={noop} />,
    );

    expect(screen.getByTestId("level-strip-level-2")).toHaveAttribute("data-status", "locked");
    expect(screen.getByTestId("level-strip-level-6")).toHaveAttribute("data-status", "locked");
  });

  it("calls onSelectLevel with the level id when a completed level is clicked", () => {
    const onSelectLevel = vi.fn();

    render(
      <LevelStrip
        completedLevelIds={[1]}
        currentLevelId={2}
        levels={LEVELS}
        onSelectLevel={onSelectLevel}
      />,
    );

    fireEvent.click(screen.getByTestId("level-strip-level-1"));

    expect(onSelectLevel).toHaveBeenCalledWith(1);
  });

  it("does not call onSelectLevel when a locked level is clicked", () => {
    const onSelectLevel = vi.fn();

    render(
      <LevelStrip
        completedLevelIds={[]}
        currentLevelId={1}
        levels={LEVELS}
        onSelectLevel={onSelectLevel}
      />,
    );

    fireEvent.click(screen.getByTestId("level-strip-level-2"));

    expect(onSelectLevel).not.toHaveBeenCalled();
  });

  it("calls onSelectLevel when the active level is clicked", () => {
    const onSelectLevel = vi.fn();

    render(
      <LevelStrip
        completedLevelIds={[]}
        currentLevelId={1}
        levels={LEVELS}
        onSelectLevel={onSelectLevel}
      />,
    );

    fireEvent.click(screen.getByTestId("level-strip-level-1"));

    expect(onSelectLevel).toHaveBeenCalledWith(1);
  });
});
