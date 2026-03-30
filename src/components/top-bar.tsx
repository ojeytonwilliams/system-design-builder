const INITIAL_BALANCE = 500;

const TopBar = () => (
  <header
    style={{
      alignItems: "center",
      background: "#1a2744",
      color: "#f5f5f0",
      display: "flex",
      justifyContent: "space-between",
      padding: "0.75rem 1.25rem",
    }}
  >
    <span style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "0.02em" }}>
      System Design Builder
    </span>
    <span style={{ fontVariantNumeric: "tabular-nums" }}>${INITIAL_BALANCE}</span>
    <button
      type="button"
      style={{
        background: "#e5634d",
        border: "none",
        borderRadius: "0.375rem",
        color: "#f5f5f0",
        cursor: "pointer",
        fontWeight: 600,
        padding: "0.5rem 1.25rem",
      }}
    >
      Start Traffic
    </button>
  </header>
);

export { TopBar };
