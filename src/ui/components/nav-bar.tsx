const NavBar = () => (
  <div
    style={{
      alignItems: "center",
      backdropFilter: "blur(10px)",
      background: "oklch(0.12 0.014 260 / 0.95)",
      borderBottom: "1px solid oklch(0.4 0.022 272 / 0.7)",
      boxShadow: "0 1px 0 oklch(0.4 0.022 272 / 0.18), 0 6px 18px -10px rgba(0,0,0,0.6)",
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      height: "60px",
      padding: "0 24px",
    }}
  >
    <div style={{ alignItems: "center", display: "flex", gap: "10px" }}>
      <div
        style={{
          background:
            "linear-gradient(135deg, oklch(0.3 0.07 220 / 0.35), oklch(0.3 0.08 290 / 0.4))",
          border: "1px solid oklch(0.36 0.022 272 / 0.55)",
          borderRadius: "9px",
          display: "grid",
          height: "32px",
          placeItems: "center",
          width: "32px",
        }}
      >
        <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
          <path d="M2 5l6-3 6 3-6 3-6-3z" fill="white" opacity="0.9" />
          <path d="M2 9l6 3 6-3" stroke="white" strokeLinejoin="round" strokeWidth="1.5" />
          <path
            d="M2 12l6 3 6-3"
            fill="none"
            opacity="0.5"
            stroke="white"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <div>
        <div
          style={{
            color: "oklch(0.96 0.01 250)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          StackCraft
        </div>
        <div style={{ color: "oklch(0.58 0.022 252)", fontSize: "11px" }}>
          System Design Playground
        </div>
      </div>
    </div>

    <div style={{ alignItems: "center", display: "flex" }}>
      <img alt="freeCodeCamp" src="/fcc-logo.svg" style={{ height: "26px", width: "auto" }} />
    </div>

    <div style={{ alignItems: "center", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
      <a
        href="#"
        style={{
          color: "oklch(0.78 0.018 252)",
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Donate
      </a>
      <button
        aria-label="Menu"
        style={{
          alignItems: "center",
          background: "oklch(0.22 0.022 268 / 0.6)",
          border: "1px solid oklch(0.36 0.022 272 / 0.55)",
          borderRadius: "8px",
          color: "oklch(0.78 0.018 252)",
          cursor: "pointer",
          display: "flex",
          height: "32px",
          justifyContent: "center",
          padding: 0,
          width: "32px",
        }}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14">
          <path
            d="M1 3h12M1 7h12M1 11h12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        </svg>
      </button>
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
          borderRadius: "50%",
          color: "oklch(0.14 0.02 260)",
          display: "grid",
          fontSize: "11px",
          fontWeight: 700,
          height: "32px",
          placeItems: "center",
          width: "32px",
        }}
      >
        JD
      </div>
    </div>
  </div>
);

export { NavBar };
