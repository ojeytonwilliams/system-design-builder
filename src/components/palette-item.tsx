import type { ComponentType } from "./component-library.js";
import type { DragEvent } from "react";

interface PaletteItemProps {
  componentType: ComponentType;
  icon?: string;
  label: string;
}

const handleDragStart = (componentType: ComponentType) => (event: DragEvent<HTMLButtonElement>) => {
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/component-type", componentType);
  event.dataTransfer.setData("text/plain", componentType);
};

const PaletteItem = ({ componentType, icon, label }: PaletteItemProps) => (
  <button
    data-component-type={componentType}
    data-testid={`palette-item-${componentType}`}
    draggable
    onDragStart={handleDragStart(componentType)}
    style={{
      alignItems: "center",
      background: "#ffffff",
      border: "1px solid #d7d4ca",
      borderRadius: "0.875rem",
      color: "#1a2744",
      cursor: "grab",
      display: "flex",
      gap: "0.75rem",
      justifyContent: "flex-start",
      padding: "0.75rem 0.875rem",
      width: "100%",
    }}
    type="button"
  >
    <span aria-hidden="true" style={{ fontSize: "1.25rem", lineHeight: 1 }}>
      {icon}
    </span>
    <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{label}</span>
  </button>
);

export { PaletteItem };
