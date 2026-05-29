import type { ComponentType } from "../../domain/component-library.js";
import type { DragEvent, FC, SVGProps } from "react";

interface ResourceItemProps {
  accentColor?: string | undefined;
  capacity: number;
  componentType: ComponentType;
  description: string;
  icon?: FC<SVGProps<SVGSVGElement>>;
  isDisabled?: boolean;
  label: string;
  monthlyCost: number;
  onPlaceComponent?: (componentType: ComponentType) => void;
}

const withAlpha = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const handleDragStart = (componentType: ComponentType) => (event: DragEvent<HTMLButtonElement>) => {
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/component-type", componentType);
  event.dataTransfer.setData("text/plain", componentType);
};

const ResourceItem = ({
  accentColor,
  capacity,
  componentType,
  description,
  icon: Icon,
  isDisabled = false,
  label,
  monthlyCost,
  onPlaceComponent,
}: ResourceItemProps) => {
  const iconColor = accentColor ?? "#d0d0d5";
  const cursor = isDisabled ? "default" : "grab";
  const opacity = isDisabled ? 0.45 : 1;

  const handleClick = () => {
    if (isDisabled || onPlaceComponent === undefined) {
      return;
    }
    onPlaceComponent(componentType);
  };

  const capacityText = Number.isFinite(capacity) ? `${capacity} ops/s` : "∞ ops/s";

  return (
    <button
      data-component-type={componentType}
      data-testid={`resource-item-${componentType}`}
      disabled={isDisabled}
      draggable={!isDisabled}
      onClick={handleClick}
      onDragStart={handleDragStart(componentType)}
      style={{
        background: "linear-gradient(160deg, rgba(42, 42, 64, 0.85), rgba(27, 27, 50, 0.85))",
        border: "1px solid rgba(59, 59, 79, 0.4)",
        borderRadius: "12px",
        color: "#f5f6f7",
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
        {Icon !== undefined && (
          <div
            style={{
              alignItems: "center",
              background: withAlpha(iconColor, 0.22),
              borderRadius: "9999px",
              display: "flex",
              flexShrink: 0,
              height: "28px",
              justifyContent: "center",
              width: "28px",
            }}
          >
            <Icon aria-hidden="true" height="16" stroke={iconColor} width="16" />
          </div>
        )}
        <span
          style={{
            color: "#f5f6f7",
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
        <span style={{ color: "#d0d0d5", flex: 1, fontSize: "12px", lineHeight: 1.4 }}>
          {description}
        </span>
        <span
          style={{
            background: "rgba(59, 59, 79, 0.8)",
            border: "1px solid rgba(59, 59, 79, 0.4)",
            borderRadius: "4px",
            color: "#d0d0d5",
            flexShrink: 0,
            fontFamily: "'Hack', ui-monospace, monospace",
            fontSize: "10px",
            padding: "1px 5px",
          }}
        >
          {capacityText}
        </span>
      </div>
    </button>
  );
};

export { ResourceItem };
