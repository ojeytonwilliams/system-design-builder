interface CoachProps {
  hasBottleneck?: boolean;
  message: string;
}

const Coach = ({ hasBottleneck = false, message }: CoachProps) => (
  <section
    aria-label="Coach"
    style={{
      background: "linear-gradient(140deg, rgba(42, 42, 64, 0.7), rgba(27, 27, 50, 0.7))",
      border: "1px solid rgba(59, 59, 79, 0.4)",
      borderRadius: "16px",
      padding: "14px",
    }}
  >
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: "8px",
        justifyContent: "space-between",
        marginBottom: "10px",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: "8px" }}>
        <div
          style={{
            alignItems: "center",
            background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
            borderRadius: "8px",
            display: "grid",
            height: "28px",
            placeItems: "center",
            width: "28px",
          }}
        >
          <svg aria-hidden="true" fill="#0a0a23" height="16" viewBox="0 0 24 24" width="16">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
        <h2
          style={{
            color: "#f5f6f7",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.11em",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          Coach
        </h2>
      </div>

      {hasBottleneck && (
        <span
          style={{
            background: "oklch(0.4 0.12 30 / 0.22)",
            border: "1px solid oklch(0.55 0.13 70 / 0.45)",
            borderRadius: "999px",
            color: "#facc15",
            fontSize: "10px",
            fontWeight: 600,
            padding: "2px 8px",
          }}
        >
          Bottleneck
        </span>
      )}
    </div>

    <p
      style={{
        color: "#d0d0d5",
        fontSize: "13px",
        lineHeight: 1.5,
        margin: 0,
      }}
    >
      {message}
    </p>
  </section>
);

export { Coach };
