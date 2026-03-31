import { render, screen } from "@testing-library/react";
import { Coach } from "./coach.js";

describe("coach", () => {
  it("renders a coach heading", () => {
    render(<Coach message="Mission: Connect users to a server." />);

    expect(screen.getByRole("heading", { name: /coach/i })).toBeInTheDocument();
  });

  it("renders the latest coaching message", () => {
    render(<Coach message="Mission: Connect users to a server." />);

    expect(screen.getByText(/mission: connect users to a server/i)).toBeInTheDocument();
  });
});
