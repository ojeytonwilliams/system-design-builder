interface ComponentDefinition {
  accentColor: string;
  capacity: number;
  description: string;
  iconSvg: string;
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
    accentColor: "#facc15",
    capacity: 200,
    description: "Caches frequent DB reads in memory",
    iconSvg: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    label: "Cache",
    latencyMs: 5,
    monthlyCost: 25,
  },
  db: {
    accentColor: "#f472b6",
    capacity: 30,
    description: "Stores and retrieves application data",
    iconSvg:
      '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    label: "Small DB",
    latencyMs: 15,
    monthlyCost: 15,
  },
  "db-large": {
    accentColor: "#f472b6",
    capacity: 90,
    description: "High-capacity managed database",
    iconSvg:
      '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    label: "Large DB",
    latencyMs: 10,
    monthlyCost: 50,
  },
  "load-balancer": {
    accentColor: "#a78bfa",
    capacity: Infinity,
    description: "Splits traffic evenly across servers",
    iconSvg:
      '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    label: "Load Balancer",
    latencyMs: 2,
    monthlyCost: 20,
  },
  server: {
    accentColor: "#22d3ee",
    capacity: 50,
    description: "Handles incoming web requests",
    iconSvg:
      '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    label: "Small Server",
    latencyMs: 10,
    monthlyCost: 20,
  },
  "server-large": {
    accentColor: "#22d3ee",
    capacity: 150,
    description: "High-capacity web server",
    iconSvg:
      '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    label: "Large Server",
    latencyMs: 8,
    monthlyCost: 80,
  },
  users: {
    accentColor: "#fb7185",
    capacity: Infinity,
    description: "Traffic source",
    iconSvg:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    label: "Users",
    latencyMs: 0,
    monthlyCost: 0,
  },
};

const isComponentType = (value: string): value is ComponentType =>
  Object.hasOwn(COMPONENT_LIBRARY, value);

export { COMPONENT_LIBRARY, isComponentType };
export type { ComponentDefinition, ComponentType };
