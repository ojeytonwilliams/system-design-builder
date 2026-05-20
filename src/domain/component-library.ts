interface ComponentDefinition {
  accentColor: string;
  capacity: number;
  description: string;
  icon: string;
  label: string;
  latencyMs: number;
  monthlyCost: number;
}

type ComponentType =
  | "cache"
  | "db"
  | "db-large"
  | "load-balancer"
  | "server"
  | "server-large"
  | "users";

const COMPONENT_LIBRARY: Record<ComponentType, ComponentDefinition> = {
  cache: {
    accentColor: "#d9a65b",
    capacity: 200,
    description: "Caches frequent DB reads in memory",
    icon: "⚡",
    label: "Cache",
    latencyMs: 5,
    monthlyCost: 25,
  },
  db: {
    accentColor: "#5f8ca8",
    capacity: 30,
    description: "Stores and retrieves application data",
    icon: "🛢️",
    label: "Small DB",
    latencyMs: 15,
    monthlyCost: 15,
  },
  "db-large": {
    accentColor: "#3d6b87",
    capacity: 90,
    description: "High-capacity managed database",
    icon: "🛢️",
    label: "Large DB",
    latencyMs: 10,
    monthlyCost: 50,
  },
  "load-balancer": {
    accentColor: "#7f6bd8",
    capacity: Infinity,
    description: "Splits traffic evenly across servers",
    icon: "⇄",
    label: "Load Balancer",
    latencyMs: 2,
    monthlyCost: 20,
  },
  server: {
    accentColor: "#4f8f73",
    capacity: 50,
    description: "Handles incoming web requests",
    icon: "🖥️",
    label: "Small Server",
    latencyMs: 10,
    monthlyCost: 20,
  },
  "server-large": {
    accentColor: "#2e6b4e",
    capacity: 150,
    description: "High-capacity web server",
    icon: "🖥️",
    label: "Large Server",
    latencyMs: 8,
    monthlyCost: 80,
  },
  users: {
    accentColor: "#e5634d",
    capacity: Infinity,
    description: "Traffic source",
    icon: "👥",
    label: "Users",
    latencyMs: 0,
    monthlyCost: 0,
  },
};

const isComponentType = (value: string): value is ComponentType =>
  Object.hasOwn(COMPONENT_LIBRARY, value);

export { COMPONENT_LIBRARY, isComponentType };
export type { ComponentDefinition, ComponentType };
