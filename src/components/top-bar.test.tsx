import { fireEvent, render, screen } from "@testing-library/react";
import { TopBar } from "./top-bar.js";

describe("top bar", () => {
  it("renders a Start Traffic button", () => {
    render(<TopBar />);

    expect(screen.getByRole("button", { name: /start traffic/iv })).toBeInTheDocument();
  });

  it("shows zero req/s by default", () => {
    render(<TopBar />);

    expect(screen.getByTestId("current-req-per-sec")).toBeInTheDocument();
    expect(screen.getByTestId("current-req-per-sec").textContent).toMatch(/0/u);
  });

  it("displays the currentReqPerSec prop", () => {
    render(<TopBar currentReqPerSec={80} />);

    expect(screen.getByTestId("current-req-per-sec").textContent).toMatch(/80/u);
  });

  it("shows the traffic target when provided", () => {
    render(<TopBar trafficTarget={120} />);

    expect(screen.getByTestId("traffic-target")).toBeInTheDocument();
    expect(screen.getByTestId("traffic-target").textContent).toMatch(/120/u);
  });

  it("shows remaining budget when provided", () => {
    render(<TopBar remainingBudget={65} totalMonthlyCost={35} monthlyBudget={100} />);

    expect(screen.getByTestId("budget-display")).toBeInTheDocument();
    expect(screen.getByTestId("budget-display").textContent).toMatch(/\$35/u);
    expect(screen.getByTestId("budget-display").textContent).toMatch(/\$100/u);
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

  it("shows level number and title when provided", () => {
    render(<TopBar levelNumber={1} levelTitle="First Request" />);

    expect(screen.getByText(/level 1/iv)).toBeInTheDocument();
    expect(screen.getByText(/first request/iv)).toBeInTheDocument();
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
