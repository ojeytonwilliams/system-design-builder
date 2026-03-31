import { fireEvent, render, screen } from "@testing-library/react";
import { TopBar } from "./top-bar.js";

describe("top bar", () => {
  it("renders a Start Traffic button", () => {
    render(<TopBar />);

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeInTheDocument();
  });

  it("shows zero req/s by default", () => {
    render(<TopBar />);

    expect(screen.getByTestId("current-req-per-sec")).toBeInTheDocument();
    expect(screen.getByTestId("current-req-per-sec").textContent).toMatch(/0/);
  });

  it("displays the currentReqPerSec prop", () => {
    render(<TopBar currentReqPerSec={80} />);

    expect(screen.getByTestId("current-req-per-sec").textContent).toMatch(/80/);
  });

  it("shows the traffic target when provided", () => {
    render(<TopBar trafficTarget={120} />);

    expect(screen.getByTestId("traffic-target")).toBeInTheDocument();
    expect(screen.getByTestId("traffic-target").textContent).toMatch(/120/);
  });

  it("shows remaining budget when provided", () => {
    render(<TopBar remainingBudget={65} totalMonthlyCost={35} monthlyBudget={100} />);

    expect(screen.getByTestId("budget-display")).toBeInTheDocument();
    expect(screen.getByTestId("budget-display").textContent).toMatch(/\$35/);
    expect(screen.getByTestId("budget-display").textContent).toMatch(/\$100/);
  });

  it("calls onStartTraffic when Start Traffic is clicked", () => {
    const onStartTraffic = vi.fn();
    render(<TopBar onStartTraffic={onStartTraffic} />);

    fireEvent.click(screen.getByRole("button", { name: /start traffic/i }));

    expect(onStartTraffic).toHaveBeenCalledOnce();
  });

  it("shows Stop Traffic label when mode is SIMULATE", () => {
    render(<TopBar mode="SIMULATE" onStartTraffic={vi.fn()} />);

    expect(screen.getByRole("button", { name: /stop traffic/i })).toBeInTheDocument();
  });

  it("shows level number and title when provided", () => {
    render(<TopBar levelNumber={1} levelTitle="First Request" />);

    expect(screen.getByText(/level 1/i)).toBeInTheDocument();
    expect(screen.getByText(/first request/i)).toBeInTheDocument();
  });

  it("shows objective text when provided", () => {
    render(<TopBar objectiveText="Your server is overloaded. Fix it." />);

    expect(screen.getByText(/your server is overloaded/i)).toBeInTheDocument();
  });

  it("disables the Start Traffic button when startTrafficDisabled is true", () => {
    render(<TopBar startTrafficDisabled />);

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeDisabled();
  });
});
