import type { ComponentType } from "../../domain/component-library.js";
import type { DragEvent } from "react";

interface ResourceItemProps {
  capacity: number;
  componentType: ComponentType;
  description: string;
  iconSvg?: string;
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
  iconSvg,
  isDisabled = false,
  label,
  monthlyCost,
  onPlaceComponent,
}: ResourceItemProps) => {
  const cursor = isDisabled ? "default" : "grab";
  const opacity = isDisabled ? 0.45 : 1;

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
        background:
          "linear-gradient(160deg, oklch(0.22 0.024 270 / 0.85), oklch(0.19 0.02 268 / 0.85))",
        border: "1px solid oklch(0.36 0.022 272 / 0.32)",
        borderRadius: "12px",
        color: "oklch(0.96 0.01 250)",
        cursor,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        opacity,
        padding: "10px 11px",
        textAlign: "left",
        width: "100%",
      }}
      type="button"
    >
      <div style={{ alignItems: "center", display: "flex", gap: "8px" }}>
        {iconSvg !== undefined && (
          <svg
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: iconSvg }}
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            width="16"
          />
        )}
        <span
          style={{
            color: "oklch(0.96 0.01 250)",
            flex: 1,
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {monthlyCost > 0 && (
          <span
            style={{
              color: "#22d3ee",
              fontFamily: "'Hack', ui-monospace, monospace",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {`$${monthlyCost}/mo`}
          </span>
        )}
      </div>

      <div style={{ alignItems: "center", display: "flex", gap: "8px" }}>
        <span
          style={{
            background: "oklch(0.28 0.024 270 / 0.8)",
            border: "1px solid oklch(0.36 0.022 272 / 0.32)",
            borderRadius: "4px",
            color: "oklch(0.78 0.018 252)",
            fontFamily: "'Hack', ui-monospace, monospace",
            fontSize: "10px",
            padding: "1px 5px",
          }}
        >
          {capacityText}
        </span>
        <span style={{ color: "oklch(0.58 0.022 252)", fontSize: "12px", lineHeight: 1.4 }}>
          {description}
        </span>
      </div>
    </button>
  );
};

export { ResourceItem };
