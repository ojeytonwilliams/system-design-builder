import { fireEvent, render, screen } from "@testing-library/react";
import { testLevels } from "../../levels/test-fixtures.js";
import { LevelStrip } from "./level-strip.js";

vi.mock(import("../../levels/index.js"), async (importOriginal) => {
  const { testLevels: fixtures } = await import("../../levels/test-fixtures.js");
  const mod = await importOriginal();
  return {
    ...mod,
    levelRegistry: new mod.LevelRegistry(fixtures),
  };
});

const noop = () => undefined;

describe("level strip", () => {
  it("renders a level progression navigation region", () => {
    render(
      <LevelStrip completedLevelIds={[]} currentLevelId={testLevels[0]!.id} onSelectLevel={noop} />,
    );

    expect(screen.getByRole("navigation", { name: /level progression/iv })).toBeInTheDocument();
  });

  it("renders a button for each level", () => {
    render(
      <LevelStrip completedLevelIds={[]} currentLevelId={testLevels[0]!.id} onSelectLevel={noop} />,
    );

    testLevels.forEach((level) => {
      expect(screen.getByTestId(`level-strip-level-${level.id}`)).toBeInTheDocument();
    });
  });

  it("marks completed levels with data-status completed", () => {
    render(
      <LevelStrip
        completedLevelIds={[testLevels[0]!.id, testLevels[1]!.id]}
        currentLevelId={testLevels[2]!.id}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByTestId(`level-strip-level-${testLevels[0]!.id}`)).toHaveAttribute(
      "data-status",
      "completed",
    );
    expect(screen.getByTestId(`level-strip-level-${testLevels[1]!.id}`)).toHaveAttribute(
      "data-status",
      "completed",
    );
  });

  it("marks the current level with data-status active", () => {
    render(
      <LevelStrip
        completedLevelIds={[testLevels[0]!.id]}
        currentLevelId={testLevels[1]!.id}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByTestId(`level-strip-level-${testLevels[1]!.id}`)).toHaveAttribute(
      "data-status",
      "active",
    );
  });

  it("marks levels after the current as locked when prior levels are not completed", () => {
    render(
      <LevelStrip completedLevelIds={[]} currentLevelId={testLevels[0]!.id} onSelectLevel={noop} />,
    );

    expect(screen.getByTestId(`level-strip-level-${testLevels[1]!.id}`)).toHaveAttribute(
      "data-status",
      "locked",
    );
    expect(screen.getByTestId(`level-strip-level-${testLevels[2]!.id}`)).toHaveAttribute(
      "data-status",
      "locked",
    );
  });

  it("marks a level as active (not locked) when all prior levels are completed", () => {
    render(
      <LevelStrip
        completedLevelIds={[testLevels[0]!.id]}
        currentLevelId={testLevels[0]!.id}
        onSelectLevel={noop}
      />,
    );

    expect(screen.getByTestId(`level-strip-level-${testLevels[1]!.id}`)).toHaveAttribute(
      "data-status",
      "active",
    );
  });

  it("calls onSelectLevel with the level id when a completed level is clicked", () => {
    const onSelectLevel = vi.fn<(id: string) => void>();

    render(
      <LevelStrip
        completedLevelIds={[testLevels[0]!.id]}
        currentLevelId={testLevels[1]!.id}
        onSelectLevel={onSelectLevel}
      />,
    );

    fireEvent.click(screen.getByTestId(`level-strip-level-${testLevels[0]!.id}`));

    expect(onSelectLevel).toHaveBeenCalledWith(testLevels[0]!.id);
  });

  it("does not call onSelectLevel when a locked level is clicked", () => {
    const onSelectLevel = vi.fn<(id: string) => void>();

    render(
      <LevelStrip
        completedLevelIds={[]}
        currentLevelId={testLevels[0]!.id}
        onSelectLevel={onSelectLevel}
      />,
    );

    fireEvent.click(screen.getByTestId(`level-strip-level-${testLevels[1]!.id}`));

    expect(onSelectLevel).not.toHaveBeenCalled();
  });

  it("calls onSelectLevel when the active level is clicked", () => {
    const onSelectLevel = vi.fn<(id: string) => void>();

    render(
      <LevelStrip
        completedLevelIds={[]}
        currentLevelId={testLevels[0]!.id}
        onSelectLevel={onSelectLevel}
      />,
    );

    fireEvent.click(screen.getByTestId(`level-strip-level-${testLevels[0]!.id}`));

    expect(onSelectLevel).toHaveBeenCalledWith(testLevels[0]!.id);
  });
});
