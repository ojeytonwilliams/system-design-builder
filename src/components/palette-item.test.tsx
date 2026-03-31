import { fireEvent, render, screen } from "@testing-library/react";
import { ResourceItem } from "./palette-item.js";

describe("resource item", () => {
  it("renders the component label as visible text", () => {
    render(
      <ResourceItem
        capacity={50}
        componentType="server"
        description="Handles incoming web requests"
        label="Small Server"
        monthlyCost={20}
      />,
    );

    expect(screen.getByText("Small Server")).toBeInTheDocument();
  });

  it("renders the monthly cost", () => {
    render(
      <ResourceItem
        capacity={50}
        componentType="server"
        description="Handles incoming web requests"
        label="Small Server"
        monthlyCost={20}
      />,
    );

    expect(screen.getByText(/\$20\/mo/)).toBeInTheDocument();
  });

  it("renders the capacity", () => {
    render(
      <ResourceItem
        capacity={50}
        componentType="server"
        description="Handles incoming web requests"
        label="Small Server"
        monthlyCost={20}
      />,
    );

    expect(screen.getByText(/50 req\/s/)).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(
      <ResourceItem
        capacity={50}
        componentType="server"
        description="Handles incoming web requests"
        label="Small Server"
        monthlyCost={20}
      />,
    );

    expect(screen.getByText(/handles incoming web requests/i)).toBeInTheDocument();
  });

  it("is draggable", () => {
    render(
      <ResourceItem
        capacity={50}
        componentType="server"
        description="Handles incoming web requests"
        label="Small Server"
        monthlyCost={20}
      />,
    );

    expect(screen.getByTestId("resource-item-server")).toHaveAttribute("draggable", "true");
  });

  it("has a data-component-type attribute matching the type prop", () => {
    render(
      <ResourceItem
        capacity={50}
        componentType="server"
        description="Handles incoming web requests"
        label="Small Server"
        monthlyCost={20}
      />,
    );

    expect(screen.getByTestId("resource-item-server")).toHaveAttribute(
      "data-component-type",
      "server",
    );
  });

  it("sets drag transfer data to the component type on drag start", () => {
    render(
      <ResourceItem
        capacity={50}
        componentType="server"
        description="Handles incoming web requests"
        label="Small Server"
        monthlyCost={20}
      />,
    );
    const item = screen.getByTestId("resource-item-server");
    const setData = vi.fn();

    fireEvent.dragStart(item, { dataTransfer: { setData } });

    expect(setData).toHaveBeenCalledWith("application/component-type", "server");
  });

  it("calls onPlaceComponent when clicked", () => {
    const onPlaceComponent = vi.fn();

    render(
      <ResourceItem
        capacity={50}
        componentType="server"
        description="Handles incoming web requests"
        label="Small Server"
        monthlyCost={20}
        onPlaceComponent={onPlaceComponent}
      />,
    );
    fireEvent.click(screen.getByTestId("resource-item-server"));

    expect(onPlaceComponent).toHaveBeenCalledWith("server");
  });
});
