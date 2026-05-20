interface CoachProps {
  message: string;
}

const Coach = ({ message }: CoachProps) => (
  <section
    aria-label="Coach"
    style={{
      background: "#f8f7f2",
      borderBottom: "1px solid #d0cfc8",
      padding: "0.85rem",
    }}
  >
    <h2
      style={{
        color: "#1a2744",
        fontSize: "0.875rem",
        letterSpacing: "0.06em",
        margin: "0 0 0.5rem",
        textTransform: "uppercase",
      }}
    >
      Coach
    </h2>
    <p
      style={{
        color: "#2f3d5f",
        fontSize: "0.85rem",
        lineHeight: 1.4,
        margin: 0,
      }}
    >
      {message}
    </p>
  </section>
);

export { Coach };
