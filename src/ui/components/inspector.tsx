import { COMPONENT_LIBRARY } from "../../domain/component-library.js";
import type { ComponentType } from "../../domain/component-library.js";

interface InspectorProps {
  componentType?: ComponentType | undefined;
  cost?: number | undefined;
  isOverloaded?: boolean | undefined;
  latencyMs?: number | undefined;
  loadPercent?: number | undefined;
  maxCapacity?: number | undefined;
  opsPerMs?: number | undefined;
  selectedNodeLabel?: string | undefined;
}

const KvCell = ({ label, value }: { label: string; value: string }) => (
  <div
    style={{
      background: "rgba(42, 42, 64, 0.6)",
      border: "1px solid rgba(59, 59, 79, 0.4)",
      borderRadius: "8px",
      padding: "7px 9px",
    }}
  >
    <div
      style={{
        color: "#d0d0d5",
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
        color: "#f5f6f7",
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
  opsPerMs,
  selectedNodeLabel,
}: InspectorProps) => {
  let loadText = "—";

  if (loadPercent !== undefined) {
    const roundedLoad = Math.round(loadPercent);
    loadText = isOverloaded ? `${roundedLoad}% (Overloaded)` : `${roundedLoad}%`;
  }

  const opsText = opsPerMs === undefined ? "—" : `${Math.round(opsPerMs * 1000)} ops/s`;

  let capacityText: string | undefined = undefined;
  if (maxCapacity !== undefined) {
    capacityText = maxCapacity === Infinity ? "∞" : `${Math.round(maxCapacity * 1000)} ops/s`;
  }

  const latencyText = latencyMs === undefined ? undefined : `${latencyMs} ms`;
  const costText = cost === undefined ? undefined : `$${cost}/hr`;
  const description =
    componentType === undefined ? undefined : COMPONENT_LIBRARY[componentType].description;
  const Icon = componentType === undefined ? undefined : COMPONENT_LIBRARY[componentType].icon;
  const accentColor =
    componentType === undefined ? undefined : COMPONENT_LIBRARY[componentType].accentColor;

  return (
    <div
      data-testid="inspector"
      style={{
        background: "rgba(27, 27, 50, 0.85)",
        border: "1px solid rgba(59, 59, 79, 0.4)",
        borderRadius: "16px",
        padding: "14px",
      }}
    >
      <h2
        style={{
          color: "#d0d0d5",
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
        <p style={{ color: "#d0d0d5", fontSize: "13px", margin: 0 }}>
          Select a component to inspect it.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ alignItems: "center", display: "flex", gap: "10px" }}>
            {Icon !== undefined && accentColor !== undefined && (
              <div
                style={{
                  alignItems: "center",
                  background: `rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.22)`,
                  borderRadius: "9999px",
                  display: "flex",
                  flexShrink: 0,
                  height: "28px",
                  justifyContent: "center",
                  width: "28px",
                }}
              >
                <Icon aria-hidden="true" height="16" stroke={accentColor} width="16" />
              </div>
            )}
            <div>
              <p
                style={{
                  color: "#f5f6f7",
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "0 0 2px",
                }}
              >
                {selectedNodeLabel}
              </p>
              {description !== undefined && (
                <p style={{ color: "#d0d0d5", fontSize: "12px", margin: 0 }}>{description}</p>
              )}
            </div>
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
