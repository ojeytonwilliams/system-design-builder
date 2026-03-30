import { COMPONENT_LIBRARY } from "./component-library.js";
import type { ComponentType } from "./component-library.js";
import { PaletteItem } from "./palette-item.js";

interface PaletteProps {
  availableComponents?: ComponentType[];
  isDisabled?: boolean;
}

const Palette = ({ availableComponents, isDisabled = false }: PaletteProps) => {
  let content = (
    <p style={{ color: "#6b6b6b", fontSize: "0.8125rem", margin: 0 }}>
      Components will appear here.
    </p>
  );

  if (availableComponents !== undefined) {
    content = (
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {availableComponents.map((componentType) => {
          const componentDefinition = COMPONENT_LIBRARY[componentType];

          return (
            <PaletteItem
              componentType={componentType}
              icon={componentDefinition.icon}
              isDisabled={isDisabled}
              key={componentType}
              label={componentDefinition.label}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fafaf7",
        borderRight: "1px solid #d0cfc8",
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
