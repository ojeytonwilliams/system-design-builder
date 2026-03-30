import { render, screen } from "@testing-library/react";
import { Inspector } from "./inspector.js";

describe("inspector", () => {
  it("renders an Inspector heading", () => {
    render(<Inspector />);

    expect(screen.getByRole("heading", { name: /inspector/i })).toBeInTheDocument();
  });
});
