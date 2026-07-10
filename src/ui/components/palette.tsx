import { COMPONENT_LIBRARY } from "../../domain/component-library.js";
import { toRealDuration } from "../../domain/sim-time-converter.js";
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
    <p style={{ color: "#d0d0d5", fontSize: "13px", margin: 0 }}>Components will appear here.</p>
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
          const realLatencyMs = toRealDuration(def.latencyMs);
          const capacity = realLatencyMs === 0 ? Infinity : 1 / realLatencyMs;

          if (onPlaceComponent === undefined) {
            return (
              <ResourceItem
                accentColor={def.accentColor}
                capacity={capacity}
                componentType={componentType}
                description={def.description}
                icon={def.icon}
                isDisabled={isDisabled}
                key={componentType}
                label={def.label}
                monthlyCost={def.monthlyCost}
              />
            );
          }

          return (
            <ResourceItem
              accentColor={def.accentColor}
              capacity={capacity}
              componentType={componentType}
              description={def.description}
              icon={def.icon}
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
        background: "rgba(27, 27, 50, 0.85)",
        border: "1px solid rgba(59, 59, 79, 0.4)",
        borderBottom: isCompact ? "none" : "1px solid rgba(59, 59, 79, 0.4)",
        borderRadius: isCompact ? "0" : "16px",
        borderRight: isCompact ? "none" : "1px solid rgba(59, 59, 79, 0.4)",
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
            color: "#d0d0d5",
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
              color: "#d0d0d5",
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
