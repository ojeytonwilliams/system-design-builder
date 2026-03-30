import { render, screen } from "@testing-library/react";
import { GameLayout } from "./game-layout.js";

describe("game layout", () => {
  it("renders the top bar", () => {
    render(<GameLayout />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the palette region", () => {
    render(<GameLayout />);

    expect(screen.getByRole("region", { name: /palette/i })).toBeInTheDocument();
  });

  it("renders the canvas area", () => {
    render(<GameLayout />);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the inspector region", () => {
    render(<GameLayout />);

    expect(screen.getByRole("region", { name: /inspector/i })).toBeInTheDocument();
  });

  it("renders a Start Traffic button", () => {
    render(<GameLayout />);

    expect(screen.getByRole("button", { name: /start traffic/i })).toBeInTheDocument();
  });

  it("renders the cash balance", () => {
    render(<GameLayout />);

    expect(screen.getByText(/\$500/)).toBeInTheDocument();
  });
});
