import type { ComponentType } from "./component-library.js";

const TYPE_LABELS: Record<ComponentType, string> = {
  cache: "Cache",
  db: "Database",
  "db-large": "Large Database",
  "load-balancer": "Load Balancer",
  server: "Server",
  "server-large": "Large Server",
  users: "Traffic Source",
};

interface InspectorProps {
  componentType?: ComponentType | undefined;
  cost?: number | undefined;
  isOverloaded?: boolean | undefined;
  latencyMs?: number | undefined;
  loadPercent?: number | undefined;
  maxCapacity?: number | undefined;
  opsPerSec?: number | undefined;
  selectedNodeLabel?: string | undefined;
}

const Inspector = ({
  componentType,
  cost,
  isOverloaded = false,
  latencyMs,
  loadPercent,
  maxCapacity,
  opsPerSec,
  selectedNodeLabel,
}: InspectorProps) => {
  let loadText = "Load: —";

  if (loadPercent !== undefined) {
    const roundedLoad = Math.round(loadPercent);

    loadText = `Load: ${roundedLoad}%`;

    if (isOverloaded) {
      loadText = `${loadText} (Overloaded)`;
    }
  }

  const opsText = opsPerSec === undefined ? "— ops/s" : `${Math.round(opsPerSec)} ops/s`;

  let capacityText: string | undefined;

  if (maxCapacity !== undefined) {
    capacityText = maxCapacity === Infinity ? "Capacity: ∞" : `Capacity: ${maxCapacity} ops/s`;
  }

  const latencyText = latencyMs === undefined ? undefined : `Latency: ${latencyMs} ms`;

  const costText = cost === undefined ? undefined : `Cost: $${cost}/hr`;

  const typeLabel = componentType === undefined ? undefined : TYPE_LABELS[componentType];

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
          {typeLabel !== undefined && (
            <p style={{ color: "#6b6b6b", fontSize: "0.8125rem", margin: 0 }}>{typeLabel}</p>
          )}
          <p style={{ fontSize: "0.8125rem", margin: 0 }}>{loadText}</p>
          <p style={{ fontSize: "0.8125rem", margin: 0 }}>{opsText}</p>
          {capacityText !== undefined && (
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>{capacityText}</p>
          )}
          {latencyText !== undefined && (
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>{latencyText}</p>
          )}
          {costText !== undefined && <p style={{ fontSize: "0.8125rem", margin: 0 }}>{costText}</p>}
        </div>
      )}
    </div>
  );
};

export { Inspector };
export type { InspectorProps };
