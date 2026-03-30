import { fireEvent, render, screen } from "@testing-library/react";
import { TopBar } from "./top-bar.js";

describe("top bar", () => {
  it("renders a Start Traffic button", () => {
    render(<TopBar />);

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeInTheDocument();
  });

  it("renders the cash balance", () => {
    render(<TopBar />);

    expect(screen.getByText(/\$500/)).toBeInTheDocument();
  });

  it("displays the revenue prop as the current balance", () => {
    render(<TopBar revenue={750.5} />);

    expect(screen.getByText(/\$750\.50/)).toBeInTheDocument();
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
    render(<TopBar objectiveText="Place a Server and DB, then connect them." />);

    expect(screen.getByText(/place a server and db/i)).toBeInTheDocument();
  });

  it("shows the revenue target when provided", () => {
    render(<TopBar revenueTarget={800} />);

    expect(screen.getByTestId("revenue-target")).toBeInTheDocument();
    expect(screen.getByTestId("revenue-target").textContent).toMatch(/800/);
  });

  it("disables the Start Traffic button when startTrafficDisabled is true", () => {
    render(<TopBar startTrafficDisabled />);

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeDisabled();
  });
});
