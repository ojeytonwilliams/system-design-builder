import type { ComponentType } from "./component-library.js";
import type { DragEvent } from "react";

interface ResourceItemProps {
  capacity: number;
  componentType: ComponentType;
  description: string;
  icon?: string;
  isDisabled?: boolean;
  label: string;
  monthlyCost: number;
  onPlaceComponent?: (componentType: ComponentType) => void;
}

const handleDragStart = (componentType: ComponentType) => (event: DragEvent<HTMLButtonElement>) => {
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/component-type", componentType);
  event.dataTransfer.setData("text/plain", componentType);
};

const ResourceItem = ({
  capacity,
  componentType,
  description,
  icon,
  isDisabled = false,
  label,
  monthlyCost,
  onPlaceComponent,
}: ResourceItemProps) => {
  let cursor = "grab";
  let opacity = 1;

  if (isDisabled) {
    cursor = "default";
    opacity = 0.5;
  }

  const handleClick = () => {
    if (isDisabled || onPlaceComponent === undefined) {
      return;
    }

    onPlaceComponent(componentType);
  };

  const capacityText = Number.isFinite(capacity) ? `${capacity} req/s` : "∞ req/s";

  return (
    <button
      data-component-type={componentType}
      data-testid={`resource-item-${componentType}`}
      disabled={isDisabled}
      draggable={!isDisabled}
      onClick={handleClick}
      onDragStart={handleDragStart(componentType)}
      style={{
        alignItems: "flex-start",
        background: "#ffffff",
        border: "1px solid #d7d4ca",
        borderRadius: "0.875rem",
        color: "#1a2744",
        cursor,
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        opacity,
        padding: "0.75rem 0.875rem",
        textAlign: "left",
        width: "100%",
      }}
      type="button"
    >
      <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", width: "100%" }}>
        {icon !== undefined && (
          <span aria-hidden="true" style={{ fontSize: "1.1rem", lineHeight: 1 }}>
            {icon}
          </span>
        )}
        <span style={{ flex: 1, fontSize: "0.9rem", fontWeight: 600 }}>{label}</span>
        <span style={{ color: "#4f8f73", fontSize: "0.8rem", fontWeight: 700 }}>
          ${monthlyCost}/mo
        </span>
      </div>
      <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>{capacityText}</div>
      <div style={{ color: "#4f5b6b", fontSize: "0.75rem", lineHeight: 1.4 }}>{description}</div>
    </button>
  );
};

export { ResourceItem };
export type { ResourceItemProps };
