import { render, screen } from "@testing-library/react";
import { Palette } from "./palette.js";

describe("palette", () => {
  it("renders a Palette heading", () => {
    render(<Palette />);

    expect(screen.getByRole("heading", { name: /palette/i })).toBeInTheDocument();
  });
});
