const Inspector = () => (
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
    <p style={{ color: "#6b6b6b", fontSize: "0.8125rem", margin: 0 }}>
      Select a component to inspect it.
    </p>
  </div>
);

export { Inspector };
