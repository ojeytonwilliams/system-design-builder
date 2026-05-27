import { COMPONENT_LIBRARY } from "../../domain/component-library.js";
import type { ComponentType } from "../../domain/component-library.js";

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

const KvCell = ({ label, value }: { label: string; value: string }) => (
  <div
    style={{
      background: "oklch(0.22 0.024 270 / 0.6)",
      border: "1px solid oklch(0.36 0.022 272 / 0.32)",
      borderRadius: "8px",
      padding: "7px 9px",
    }}
  >
    <div
      style={{
        color: "oklch(0.58 0.022 252)",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
    <div
      style={{
        color: "oklch(0.96 0.01 250)",
        fontFamily: "'Hack', ui-monospace, monospace",
        fontSize: "13px",
        fontWeight: 500,
        marginTop: "2px",
      }}
    >
      {value}
    </div>
  </div>
);

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

  let capacityText: string | undefined = undefined;
  if (maxCapacity !== undefined) {
    capacityText = maxCapacity === Infinity ? "Capacity: ∞" : `Capacity: ${maxCapacity} ops/s`;
  }

  const latencyText = latencyMs === undefined ? undefined : `Latency: ${latencyMs} ms`;
  const costText = cost === undefined ? undefined : `Cost: $${cost}/hr`;
  const typeLabel =
    componentType === undefined ? undefined : COMPONENT_LIBRARY[componentType].label;

  return (
    <div
      style={{
        background: "oklch(0.21 0.022 268 / 0.78)",
        border: "1px solid oklch(0.36 0.022 272 / 0.32)",
        borderRadius: "16px",
        padding: "14px",
      }}
    >
      <h2
        style={{
          color: "oklch(0.58 0.022 252)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.11em",
          margin: "0 0 12px",
          textTransform: "uppercase",
        }}
      >
        Inspector
      </h2>

      {selectedNodeLabel === undefined ? (
        <p style={{ color: "oklch(0.58 0.022 252)", fontSize: "13px", margin: 0 }}>
          Select a component to inspect it.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <p
              style={{
                color: "oklch(0.96 0.01 250)",
                fontSize: "14px",
                fontWeight: 700,
                margin: "0 0 2px",
              }}
            >
              {selectedNodeLabel}
            </p>
            {typeLabel !== undefined && (
              <p style={{ color: "oklch(0.58 0.022 252)", fontSize: "12px", margin: 0 }}>
                {typeLabel}
              </p>
            )}
          </div>

          <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "1fr 1fr" }}>
            <KvCell label="Load" value={loadText} />
            <KvCell label="Ops" value={opsText} />
            {capacityText !== undefined && <KvCell label="Capacity" value={capacityText} />}
            {latencyText !== undefined && <KvCell label="Latency" value={latencyText} />}
            {costText !== undefined && <KvCell label="Cost" value={costText} />}
          </div>
        </div>
      )}
    </div>
  );
};

export { Inspector };
export type { InspectorProps };
