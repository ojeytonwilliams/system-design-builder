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
});
