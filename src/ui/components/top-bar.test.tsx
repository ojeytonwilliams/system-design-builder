import { fireEvent, render, screen } from "@testing-library/react";
import { TopBar } from "./top-bar.js";

describe("top bar", () => {
  it("renders a Start Traffic button", () => {
    render(<TopBar />);

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeInTheDocument();
  });

  it("calls onStartTraffic when Start Traffic is clicked", () => {
    const onStartTraffic = vi.fn<() => void>();
    render(<TopBar onStartTraffic={onStartTraffic} />);

    fireEvent.click(screen.getByRole("button", { name: /start traffic/iv }));

    expect(onStartTraffic).toHaveBeenCalledOnce();
  });

  it("shows Stop Traffic label when simulating", () => {
    render(<TopBar isSimulating onStartTraffic={vi.fn<() => void>()} />);

    expect(screen.getByRole("button", { name: /stop traffic/iv })).toBeInTheDocument();
  });

  it("shows objective text when provided", () => {
    render(<TopBar objectiveText="Your server is overloaded. Fix it." />);

    expect(screen.getByText(/your server is overloaded/iv)).toBeInTheDocument();
  });

  it("disables the Start Traffic button when startTrafficDisabled is true", () => {
    render(<TopBar startTrafficDisabled />);

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeDisabled();
  });
});
