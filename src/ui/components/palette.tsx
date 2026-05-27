import { COMPONENT_LIBRARY } from "../../domain/component-library.js";
import type { ComponentType } from "../../domain/component-library.js";
import { ResourceItem } from "./palette-item.js";

interface ResourcesProps {
  availableComponents?: ComponentType[];
  isCompact?: boolean;
  isDisabled?: boolean;
  onPlaceComponent?: (componentType: ComponentType) => void;
}

const Resources = ({
  availableComponents,
  isCompact = false,
  isDisabled = false,
  onPlaceComponent,
}: ResourcesProps) => {
  let content = (
    <p style={{ color: "oklch(0.58 0.022 252)", fontSize: "13px", margin: 0 }}>
      Components will appear here.
    </p>
  );

  if (availableComponents !== undefined) {
    content = (
      <div
        style={{
          display: isCompact ? "flex" : "grid",
          gap: isCompact ? "8px" : "8px",
          overflowX: isCompact ? "auto" : "visible",
          paddingBottom: isCompact ? "4px" : undefined,
        }}
      >
        {availableComponents.map((componentType) => {
          const def = COMPONENT_LIBRARY[componentType];

          if (onPlaceComponent === undefined) {
            return (
              <ResourceItem
                capacity={def.capacity}
                componentType={componentType}
                description={def.description}
                iconSvg={def.iconSvg}
                isDisabled={isDisabled}
                key={componentType}
                label={def.label}
                monthlyCost={def.monthlyCost}
              />
            );
          }

          return (
            <ResourceItem
              capacity={def.capacity}
              componentType={componentType}
              description={def.description}
              iconSvg={def.iconSvg}
              isDisabled={isDisabled}
              key={componentType}
              label={def.label}
              monthlyCost={def.monthlyCost}
              onPlaceComponent={onPlaceComponent}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "oklch(0.21 0.022 268 / 0.78)",
        border: "1px solid oklch(0.36 0.022 272 / 0.32)",
        borderBottom: isCompact ? "none" : "1px solid oklch(0.36 0.022 272 / 0.32)",
        borderRadius: isCompact ? "0" : "16px",
        borderRight: isCompact ? "none" : "1px solid oklch(0.36 0.022 272 / 0.32)",
        height: "100%",
        padding: "14px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <h2
          style={{
            color: "oklch(0.58 0.022 252)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.11em",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Resources
        </h2>
        {!isCompact && (
          <span
            style={{
              color: "oklch(0.45 0.018 252)",
              fontSize: "10px",
              letterSpacing: "0.04em",
            }}
          >
            Drag onto canvas
          </span>
        )}
      </div>

      {content}
    </div>
  );
};

export { Resources };
