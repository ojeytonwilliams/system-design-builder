import { render, screen } from "@testing-library/react";
import { Inspector } from "./inspector.js";

describe("inspector", () => {
  it("renders an Inspector heading", () => {
    render(<Inspector />);

    expect(screen.getByRole("heading", { name: /inspector/i })).toBeInTheDocument();
  });

  it("shows load percentage when a node is selected", () => {
    render(<Inspector isOverloaded={false} loadPercent={80} selectedNodeLabel="Server" />);

    expect(screen.getByText(/load:\s*80%/i)).toBeInTheDocument();
  });

  it("marks the load field as overloaded when load exceeds capacity", () => {
    render(<Inspector isOverloaded loadPercent={120} selectedNodeLabel="Server" />);

    expect(screen.getByText(/load:\s*120%\s*\(overloaded\)/i)).toBeInTheDocument();
  });
});
