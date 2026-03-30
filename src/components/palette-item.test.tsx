import { fireEvent, render, screen } from "@testing-library/react";
import { PaletteItem } from "./palette-item.js";

describe("palette item", () => {
  it("renders the component label as visible text", () => {
    render(<PaletteItem componentType="server" label="Server" />);

    expect(screen.getByText("Server")).toBeInTheDocument();
  });

  it("is draggable", () => {
    render(<PaletteItem componentType="server" label="Server" />);

    expect(screen.getByTestId("palette-item-server")).toHaveAttribute("draggable", "true");
  });

  it("has a data-component-type attribute matching the type prop", () => {
    render(<PaletteItem componentType="server" label="Server" />);

    expect(screen.getByTestId("palette-item-server")).toHaveAttribute(
      "data-component-type",
      "server",
    );
  });

  it("sets drag transfer data to the component type on drag start", () => {
    render(<PaletteItem componentType="server" label="Server" />);
    const item = screen.getByTestId("palette-item-server");
    const setData = vi.fn();

    fireEvent.dragStart(item, { dataTransfer: { setData } });

    expect(setData).toHaveBeenCalledWith("application/component-type", "server");
  });
});
