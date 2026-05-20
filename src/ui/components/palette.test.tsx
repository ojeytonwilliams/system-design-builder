import { render, screen } from "@testing-library/react";
import { Resources } from "./palette.js";

describe("resources panel", () => {
  it("renders a Resources heading", () => {
    render(<Resources />);

    expect(screen.getByRole("heading", { name: /resources/iv })).toBeInTheDocument();
  });

  it("renders placeholder text when no availableComponents prop", () => {
    render(<Resources />);

    expect(screen.getByText(/components will appear here/iv)).toBeInTheDocument();
  });

  it("renders one ResourceItem for each available component", () => {
    render(<Resources availableComponents={["server", "db"]} />);

    expect(screen.getAllByTestId(/^resource-item-/u)).toHaveLength(2);
  });

  it("renders each component label when a list is provided", () => {
    render(<Resources availableComponents={["server"]} />);

    expect(screen.getByText(/small server/iv)).toBeInTheDocument();
  });

  it("does not render placeholder text when availableComponents is provided", () => {
    render(<Resources availableComponents={["server"]} />);

    expect(screen.queryByText(/components will appear here/iv)).not.toBeInTheDocument();
  });

  it("shows the monthly cost for each component", () => {
    render(<Resources availableComponents={["server"]} />);

    expect(screen.getByText(/\$20\/mo/iv)).toBeInTheDocument();
  });

  it("shows the capacity for each component", () => {
    render(<Resources availableComponents={["server"]} />);

    expect(screen.getByText(/50 req\/s/iv)).toBeInTheDocument();
  });

  it("shows the description for each component", () => {
    render(<Resources availableComponents={["server"]} />);

    expect(screen.getByText(/handles incoming web requests/iv)).toBeInTheDocument();
  });
});
