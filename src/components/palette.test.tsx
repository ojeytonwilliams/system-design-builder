import { render, screen } from "@testing-library/react";
import { Palette } from "./palette.js";

describe("palette", () => {
  it("renders a Palette heading", () => {
    render(<Palette />);

    expect(screen.getByRole("heading", { name: /palette/i })).toBeInTheDocument();
  });

  it("renders placeholder text when no availableComponents prop", () => {
    render(<Palette />);

    expect(screen.getByText(/components will appear here/i)).toBeInTheDocument();
  });

  it("renders one PaletteItem for each available component", () => {
    render(<Palette availableComponents={["users", "server", "db"]} />);

    expect(screen.getAllByTestId(/^palette-item-/)).toHaveLength(3);
  });

  it("renders each component label when a list is provided", () => {
    render(<Palette availableComponents={["server"]} />);

    expect(screen.getByText("Server")).toBeInTheDocument();
  });

  it("does not render placeholder text when availableComponents is provided", () => {
    render(<Palette availableComponents={["server"]} />);

    expect(screen.queryByText(/components will appear here/i)).not.toBeInTheDocument();
  });
});
