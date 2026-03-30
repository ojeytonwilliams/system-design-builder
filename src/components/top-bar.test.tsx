import { render, screen } from "@testing-library/react";
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
});
