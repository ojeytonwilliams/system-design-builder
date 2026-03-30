interface InspectorProps {
  isOverloaded?: boolean | undefined;
  loadPercent?: number | undefined;
  selectedNodeLabel?: string | undefined;
}

const Inspector = ({ isOverloaded = false, loadPercent, selectedNodeLabel }: InspectorProps) => {
  let loadText = "Load: —";

  if (loadPercent !== undefined) {
    const roundedLoad = Math.round(loadPercent);

    loadText = `Load: ${roundedLoad}%`;

    if (isOverloaded) {
      loadText = `${loadText} (Overloaded)`;
    }
  }

  return (
    <div
      style={{
        background: "#fafaf7",
        borderLeft: "1px solid #d0cfc8",
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
        Inspector
      </h2>
      {selectedNodeLabel === undefined ? (
        <p style={{ color: "#6b6b6b", fontSize: "0.8125rem", margin: 0 }}>
          Select a component to inspect it.
        </p>
      ) : (
        <div style={{ color: "#1a2744", display: "grid", gap: "0.4rem" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, margin: 0 }}>{selectedNodeLabel}</p>
          <p style={{ fontSize: "0.8125rem", margin: 0 }}>{loadText}</p>
        </div>
      )}
    </div>
  );
};

export { Inspector };
export type { InspectorProps };
