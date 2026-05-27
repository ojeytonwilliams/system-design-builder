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
      background: "rgba(27, 27, 50, 0.85)",
      border: "1px solid rgba(59, 59, 79, 0.4)",
      borderRadius: "16px",
      padding: "14px",
    }}
  >
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "10px",
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
        Event Log
      </h2>
      {entries.length > 0 && (
        <span
          style={{
            background: "rgba(59, 59, 79, 0.8)",
            borderRadius: "999px",
            color: "#d0d0d5",
            fontSize: "10px",
            fontWeight: 600,
            padding: "1px 7px",
          }}
        >
          {entries.length}
        </span>
      )}
    </div>
    <ul
      data-testid="event-log-list"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        listStyle: "none",
        margin: 0,
        maxHeight: "180px",
        overflowY: "auto",
        padding: 0,
      }}
    >
      {entries.map((entry) => (
        <li
          key={entry.id}
          style={{
            borderRadius: "6px",
            color: "#d0d0d5",
            display: "flex",
            fontFamily: "'Hack', ui-monospace, monospace",
            fontSize: "11px",
            padding: "5px 7px",
          }}
        >
          {entry.text}
        </li>
      ))}
    </ul>
  </section>
);

export { EventLog };
export type { EventLogEntry };
