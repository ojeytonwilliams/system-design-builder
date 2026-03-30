import { Inspector } from "../components/inspector.js";
import { Palette } from "../components/palette.js";
import { TopBar } from "../components/top-bar.js";

const GameLayout = () => (
  <div
    style={{
      background: "#f5f5f0",
      display: "flex",
      flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
      height: "100dvh",
    }}
  >
    <TopBar />
    <div
      style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
      }}
    >
      <section aria-label="Palette" style={{ flexShrink: 0, overflowY: "auto", width: "14rem" }}>
        <Palette />
      </section>
      <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Canvas — Phase 2 */}
      </main>
      <section aria-label="Inspector" style={{ flexShrink: 0, overflowY: "auto", width: "16rem" }}>
        <Inspector />
      </section>
    </div>
  </div>
);

export { GameLayout };
