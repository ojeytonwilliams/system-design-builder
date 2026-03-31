import { COMPONENT_LIBRARY } from "./component-library.js";
import type { ComponentType } from "./component-library.js";
import { PaletteItem } from "./palette-item.js";

interface PaletteProps {
  availableComponents?: ComponentType[];
  isCompact?: boolean;
  isDisabled?: boolean;
  onPlaceComponent?: (componentType: ComponentType) => void;
}

const Palette = ({
  availableComponents,
  isCompact = false,
  isDisabled = false,
  onPlaceComponent,
}: PaletteProps) => {
  let contentDisplay = "grid";
  let contentGap = "0.75rem";
  let contentOverflowX: "auto" | "visible" = "visible";
  let contentPaddingBottom: string | undefined;

  if (isCompact) {
    contentDisplay = "flex";
    contentGap = "0.5rem";
    contentOverflowX = "auto";
    contentPaddingBottom = "0.25rem";
  }

  let content = (
    <p style={{ color: "#6b6b6b", fontSize: "0.8125rem", margin: 0 }}>
      Components will appear here.
    </p>
  );

  if (availableComponents !== undefined) {
    content = (
      <div
        style={{
          display: contentDisplay,
          gap: contentGap,
          overflowX: contentOverflowX,
          paddingBottom: contentPaddingBottom,
        }}
      >
        {availableComponents.map((componentType) => {
          const componentDefinition = COMPONENT_LIBRARY[componentType];

          if (onPlaceComponent === undefined) {
            return (
              <PaletteItem
                componentType={componentType}
                icon={componentDefinition.icon}
                isDisabled={isDisabled}
                key={componentType}
                label={componentDefinition.label}
              />
            );
          }

          return (
            <PaletteItem
              componentType={componentType}
              icon={componentDefinition.icon}
              isDisabled={isDisabled}
              key={componentType}
              label={componentDefinition.label}
              onPlaceComponent={onPlaceComponent}
            />
          );
        })}
      </div>
    );
  }

  let borderRight = "1px solid #d0cfc8";
  let borderTop = "none";

  if (isCompact) {
    borderRight = "none";
    borderTop = "1px solid #d0cfc8";
  }

  return (
    <div
      style={{
        background: "#fafaf7",
        borderRight,
        borderTop,
        height: "100%",
        padding: "1rem",
      }}
    >
      <h2
        style={{
          color: "#1a2744",
          fontSize: "0.875rem",
          letterSpacing: "0.06em",
          margin: "0 0 0.75rem",
          textTransform: "uppercase",
        }}
      >
        Palette
      </h2>

      {content}
    </div>
  );
};

export { Palette };
