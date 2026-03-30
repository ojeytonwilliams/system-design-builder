import { render, screen } from "@testing-library/react";
import { Inspector } from "./inspector.js";

describe("inspector", () => {
  it("renders an Inspector heading", () => {
    render(<Inspector />);

    expect(screen.getByRole("heading", { name: /inspector/i })).toBeInTheDocument();
  });

  it("shows a prompt when no node is selected", () => {
    render(<Inspector />);

    expect(screen.getByText(/select a component/i)).toBeInTheDocument();
  });

  it("shows the component label when a node is selected", () => {
    render(<Inspector selectedNodeLabel="Server" />);

    expect(screen.getByText("Server")).toBeInTheDocument();
  });

  it("shows component type label when a node is selected", () => {
    render(<Inspector componentType="db" selectedNodeLabel="DB" />);

    expect(screen.getByText("Database")).toBeInTheDocument();
  });

  it("shows load percentage when a node is selected", () => {
    render(<Inspector isOverloaded={false} loadPercent={80} selectedNodeLabel="Server" />);

    expect(screen.getByText(/load:\s*80%/i)).toBeInTheDocument();
  });

  it("marks the load field as overloaded when load exceeds capacity", () => {
    render(<Inspector isOverloaded loadPercent={120} selectedNodeLabel="Server" />);

    expect(screen.getByText(/load:\s*120%\s*\(overloaded\)/i)).toBeInTheDocument();
  });

  it("shows ops/sec when simulation data is provided", () => {
    render(<Inspector opsPerSec={75} selectedNodeLabel="Server" />);

    expect(screen.getByText(/75\s*ops\/s/i)).toBeInTheDocument();
  });

  it("shows a dash for ops/sec when no simulation data", () => {
    render(<Inspector selectedNodeLabel="Server" />);

    expect(screen.getByText(/ops\/s.*—|—.*ops\/s/i)).toBeInTheDocument();
  });

  it("shows max capacity when provided", () => {
    render(<Inspector maxCapacity={100} selectedNodeLabel="Server" />);

    expect(screen.getByText(/capacity.*100|100.*ops\/s/i)).toBeInTheDocument();
  });

  it("shows ∞ for max capacity when node has no capacity limit", () => {
    render(<Inspector maxCapacity={Infinity} selectedNodeLabel="Load Balancer" />);

    expect(screen.getByText(/∞/)).toBeInTheDocument();
  });

  it("shows latency contribution when provided", () => {
    render(<Inspector latencyMs={10} selectedNodeLabel="Server" />);

    expect(screen.getByText(/10\s*ms/i)).toBeInTheDocument();
  });

  it("shows cost when provided", () => {
    render(<Inspector cost={50} selectedNodeLabel="Server" />);

    expect(screen.getByText(/\$50/i)).toBeInTheDocument();
  });
});
