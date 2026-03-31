import { fireEvent, render, screen } from "@testing-library/react";
import { EndOfLevelScreen } from "./end-of-level-screen.js";

const defaultFeedback = ["You did great.", "Keep going!"];

const renderScreen = ({
  feedbackLines = defaultFeedback,
  monthlyBudget = 100,
  onContinue = () => {},
  onReplay = () => {},
  remainingBudget = 40,
  title = "First Request",
}: Partial<Parameters<typeof EndOfLevelScreen>[0]> = {}) =>
  render(
    <EndOfLevelScreen
      feedbackLines={feedbackLines}
      monthlyBudget={monthlyBudget}
      onContinue={onContinue}
      onReplay={onReplay}
      remainingBudget={remainingBudget}
      title={title}
    />,
  );

describe(EndOfLevelScreen, () => {
  it("renders a level complete heading", () => {
    renderScreen();

    expect(screen.getByRole("heading", { name: /level complete/i })).toBeInTheDocument();
  });

  it("renders the level title", () => {
    renderScreen();

    expect(screen.getByText("First Request")).toBeInTheDocument();
  });

  it("renders each feedback line", () => {
    renderScreen();

    expect(screen.getByText("You did great.")).toBeInTheDocument();
    expect(screen.getByText("Keep going!")).toBeInTheDocument();
  });

  it("renders a Continue button", () => {
    renderScreen();

    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("renders a Replay button", () => {
    renderScreen();

    expect(screen.getByRole("button", { name: /replay/i })).toBeInTheDocument();
  });

  it("calls onContinue when the Continue button is clicked", () => {
    const onContinue = vi.fn();
    renderScreen({ onContinue });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("calls onReplay when the Replay button is clicked", () => {
    const onReplay = vi.fn();
    renderScreen({ onReplay });

    fireEvent.click(screen.getByRole("button", { name: /replay/i }));

    expect(onReplay).toHaveBeenCalledOnce();
  });

  it("displays the remaining budget", () => {
    renderScreen({ monthlyBudget: 100, remainingBudget: 40 });

    expect(screen.getByText(/\$40/)).toBeInTheDocument();
  });

  it("shows 3 stars when budget headroom is high (≥50% remaining)", () => {
    renderScreen({ monthlyBudget: 100, remainingBudget: 60 });

    expect(screen.getByText("★★★")).toBeInTheDocument();
  });

  it("shows 2 stars when budget headroom is moderate (20–49% remaining)", () => {
    renderScreen({ monthlyBudget: 100, remainingBudget: 30 });

    expect(screen.getByText("★★☆")).toBeInTheDocument();
  });

  it("shows 1 star when budget headroom is low (<20% remaining)", () => {
    renderScreen({ monthlyBudget: 100, remainingBudget: 10 });

    expect(screen.getByText("★☆☆")).toBeInTheDocument();
  });
});
