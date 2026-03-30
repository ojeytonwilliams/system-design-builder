import { fireEvent, render, screen } from "@testing-library/react";
import { EndOfLevelScreen } from "./end-of-level-screen.js";
import { INITIAL_REVENUE } from "../store.js";

const defaultFeedback = ["You did great.", "Keep going!"];

describe(EndOfLevelScreen, () => {
  it("renders a level complete heading", () => {
    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={() => {}}
        revenue={1000}
        revenueTarget={800}
        title="First Request"
      />,
    );

    expect(screen.getByRole("heading", { name: /level complete/i })).toBeInTheDocument();
  });

  it("renders the level title", () => {
    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={() => {}}
        revenue={1000}
        revenueTarget={800}
        title="First Request"
      />,
    );

    expect(screen.getByText("First Request")).toBeInTheDocument();
  });

  it("renders each feedback line", () => {
    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={() => {}}
        revenue={1000}
        revenueTarget={800}
        title="First Request"
      />,
    );

    expect(screen.getByText("You did great.")).toBeInTheDocument();
    expect(screen.getByText("Keep going!")).toBeInTheDocument();
  });

  it("renders a Continue button", () => {
    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={() => {}}
        revenue={1000}
        revenueTarget={800}
        title="First Request"
      />,
    );

    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("renders a Replay button", () => {
    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={() => {}}
        revenue={1000}
        revenueTarget={800}
        title="First Request"
      />,
    );

    expect(screen.getByRole("button", { name: /replay/i })).toBeInTheDocument();
  });

  it("calls onContinue when the Continue button is clicked", () => {
    const onContinue = vi.fn();

    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={onContinue}
        onReplay={() => {}}
        revenue={1000}
        revenueTarget={800}
        title="First Request"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("calls onReplay when the Replay button is clicked", () => {
    const onReplay = vi.fn();

    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={onReplay}
        revenue={1000}
        revenueTarget={800}
        title="First Request"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /replay/i }));

    expect(onReplay).toHaveBeenCalledOnce();
  });

  it("displays the earned revenue", () => {
    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={() => {}}
        revenue={1000}
        revenueTarget={800}
        title="First Request"
      />,
    );

    const earned = (1000 - INITIAL_REVENUE).toFixed(2);

    expect(screen.getByText(new RegExp(`\\$${earned}`))).toBeInTheDocument();
  });

  it("shows 3 stars when revenue is well above target", () => {
    // Efficiency >= 1.5: earned >= 1.5 * (target - INITIAL_REVENUE)
    // Target = 800, need = 300, 1.5x = 450 earned → revenue = 950
    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={() => {}}
        revenue={INITIAL_REVENUE + 450}
        revenueTarget={800}
        title="First Request"
      />,
    );

    expect(screen.getByText("★★★")).toBeInTheDocument();
  });

  it("shows 2 stars when revenue just meets the target", () => {
    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={() => {}}
        revenue={800}
        revenueTarget={800}
        title="First Request"
      />,
    );

    expect(screen.getByText("★★☆")).toBeInTheDocument();
  });

  it("shows 1 star when revenue barely exceeds the starting balance", () => {
    // Efficiency < 1.0: earned < (target - INITIAL_REVENUE)
    render(
      <EndOfLevelScreen
        feedbackLines={defaultFeedback}
        onContinue={() => {}}
        onReplay={() => {}}
        revenue={INITIAL_REVENUE + 100}
        revenueTarget={800}
        title="First Request"
      />,
    );

    expect(screen.getByText("★☆☆")).toBeInTheDocument();
  });
});
