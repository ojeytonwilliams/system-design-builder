import { render, screen } from "@testing-library/react";
import { Inspector } from "./inspector.js";

describe("inspector", () => {
  it("renders an Inspector heading", () => {
    render(<Inspector />);

    expect(screen.getByRole("heading", { name: /inspector/iv })).toBeInTheDocument();
  });

  it("shows a prompt when no node is selected", () => {
    render(<Inspector />);

    expect(screen.getByText(/select a component/iv)).toBeInTheDocument();
  });

  it("shows the component label when a node is selected", () => {
    render(<Inspector selectedNodeLabel="Server" />);

    expect(screen.getByText("Server")).toBeInTheDocument();
  });

  it("shows component type label when a node is selected", () => {
    render(<Inspector componentType="db" selectedNodeLabel="DB" />);

    expect(screen.getByText("DB")).toBeInTheDocument();
  });

  it("shows load percentage when a node is selected", () => {
    render(<Inspector isOverloaded={false} loadPercent={80} selectedNodeLabel="Server" />);

    expect(screen.getByText(/80%/iv)).toBeInTheDocument();
  });

  it("marks the load field as overloaded when load exceeds capacity", () => {
    render(<Inspector isOverloaded loadPercent={120} selectedNodeLabel="Server" />);

    expect(screen.getByText(/120%.*overloaded/iv)).toBeInTheDocument();
  });

  it("shows ops/sec when simulation data is provided", () => {
    render(<Inspector opsPerMs={0.075} selectedNodeLabel="Server" />);

    expect(screen.getByText(/75\s*ops\/s/iv)).toBeInTheDocument();
  });

  it("shows a dash for ops/sec when no simulation data", () => {
    render(<Inspector selectedNodeLabel="Server" />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows max capacity when provided", () => {
    render(<Inspector maxCapacity={0.1} selectedNodeLabel="Server" />);

    expect(screen.getByText(/capacity.*100|100.*ops\/s/iv)).toBeInTheDocument();
  });

  it("shows ∞ for max capacity when node has no capacity limit", () => {
    render(<Inspector maxCapacity={Infinity} selectedNodeLabel="Load Balancer" />);

    expect(screen.getByText(/∞/u)).toBeInTheDocument();
  });

  it("shows latency contribution when provided", () => {
    render(<Inspector latencyMs={10} selectedNodeLabel="Server" />);

    expect(screen.getByText(/10\s*ms/iv)).toBeInTheDocument();
  });

  it("shows cost when provided", () => {
    render(<Inspector cost={50} selectedNodeLabel="Server" />);

    expect(screen.getByText(/\$50/iv)).toBeInTheDocument();
  });
});
