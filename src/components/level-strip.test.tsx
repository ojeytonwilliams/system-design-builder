import { fireEvent, render, screen } from "@testing-library/react";
import { LEVELS } from "../levels/index.js";
import { LevelStrip } from "./level-strip.js";

const noop = () => undefined;

describe("level strip", () => {
  it("renders a level progression navigation region", () => {
    render(
      <LevelStrip
        completedLevelIds={[]}
        currentLevelId={LEVELS[0]!.id}
        levels={LEVELS}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByRole("navigation", { name: /level progression/iv })).toBeInTheDocument();
  });

  it("renders a button for each level", () => {
    render(
      <LevelStrip
        completedLevelIds={[]}
        currentLevelId={LEVELS[0]!.id}
        levels={LEVELS}
        onSelectLevel={noop}
      />,
    );

    LEVELS.forEach((level) => {
      expect(screen.getByTestId(`level-strip-level-${level.id}`)).toBeInTheDocument();
    });
  });

  it("marks completed levels with data-status completed", () => {
    render(
      <LevelStrip
        completedLevelIds={[LEVELS[0]!.id, LEVELS[1]!.id]}
        currentLevelId={LEVELS[2]!.id}
        levels={LEVELS}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByTestId(`level-strip-level-${LEVELS[0]!.id}`)).toHaveAttribute(
      "data-status",
      "completed",
    );
    expect(screen.getByTestId(`level-strip-level-${LEVELS[1]!.id}`)).toHaveAttribute(
      "data-status",
      "completed",
    );
  });

  it("marks the current level with data-status active", () => {
    render(
      <LevelStrip
        completedLevelIds={[LEVELS[0]!.id]}
        currentLevelId={LEVELS[1]!.id}
        levels={LEVELS}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByTestId(`level-strip-level-${LEVELS[1]!.id}`)).toHaveAttribute(
      "data-status",
      "active",
    );
  });

  it("marks levels after the current as locked when prior levels are not completed", () => {
    render(
      <LevelStrip
        completedLevelIds={[]}
        currentLevelId={LEVELS[0]!.id}
        levels={LEVELS}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByTestId(`level-strip-level-${LEVELS[1]!.id}`)).toHaveAttribute(
      "data-status",
      "locked",
    );
    expect(screen.getByTestId(`level-strip-level-${LEVELS[5]!.id}`)).toHaveAttribute(
      "data-status",
      "locked",
    );
  });

  it("marks a level as active (not locked) when all prior levels are completed", () => {
    render(
      <LevelStrip
        completedLevelIds={[LEVELS[0]!.id]}
        currentLevelId={LEVELS[0]!.id}
        levels={LEVELS}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByTestId(`level-strip-level-${LEVELS[1]!.id}`)).toHaveAttribute(
      "data-status",
      "active",
    );
  });

  it("calls onSelectLevel with the level id when a completed level is clicked", () => {
    const onSelectLevel = vi.fn<() => void>();

    render(
      <LevelStrip
        completedLevelIds={[LEVELS[0]!.id]}
        currentLevelId={LEVELS[1]!.id}
        levels={LEVELS}
        onSelectLevel={onSelectLevel}
      />,
    );

    fireEvent.click(screen.getByTestId(`level-strip-level-${LEVELS[0]!.id}`));

    expect(onSelectLevel).toHaveBeenCalledWith(LEVELS[0]!.id);
  });

  it("does not call onSelectLevel when a locked level is clicked", () => {
    const onSelectLevel = vi.fn<() => void>();

    render(
      <LevelStrip
        completedLevelIds={[]}
        currentLevelId={LEVELS[0]!.id}
        levels={LEVELS}
        onSelectLevel={onSelectLevel}
      />,
    );

    fireEvent.click(screen.getByTestId(`level-strip-level-${LEVELS[1]!.id}`));

    expect(onSelectLevel).not.toHaveBeenCalled();
  });

  it("calls onSelectLevel when the active level is clicked", () => {
    const onSelectLevel = vi.fn<() => void>();

    render(
      <LevelStrip
        completedLevelIds={[]}
        currentLevelId={LEVELS[0]!.id}
        levels={LEVELS}
        onSelectLevel={onSelectLevel}
      />,
    );

    fireEvent.click(screen.getByTestId(`level-strip-level-${LEVELS[0]!.id}`));

    expect(onSelectLevel).toHaveBeenCalledWith(LEVELS[0]!.id);
  });
});
