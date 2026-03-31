interface EventLogEntry {
  id: string;
  text: string;
}

interface EventLogProps {
  entries: EventLogEntry[];
}

const EventLog = ({ entries }: EventLogProps) => (
  <section
    aria-label="Event Log"
    style={{
      background: "#fafaf7",
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
      Event Log
    </h2>
    <ul
      data-testid="event-log-list"
      style={{
        color: "#3c4b70",
        display: "grid",
        fontSize: "0.8rem",
        gap: "0.4rem",
        listStyle: "none",
        margin: 0,
        maxHeight: "11rem",
        overflowY: "auto",
        padding: 0,
      }}
    >
      {entries.map((entry) => (
        <li key={entry.id}>{entry.text}</li>
      ))}
    </ul>
  </section>
);

export { EventLog };
export type { EventLogEntry };
