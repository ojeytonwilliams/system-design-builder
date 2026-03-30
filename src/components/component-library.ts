interface ComponentDefinition {
  accentColor: string;
  icon: string;
  label: string;
}

type ComponentType = "cache" | "db" | "load-balancer" | "server" | "users";

const COMPONENT_LIBRARY: Record<ComponentType, ComponentDefinition> = {
  cache: {
    accentColor: "#d9a65b",
    icon: "⚡",
    label: "Cache",
  },
  db: {
    accentColor: "#5f8ca8",
    icon: "🛢️",
    label: "DB",
  },
  "load-balancer": {
    accentColor: "#7f6bd8",
    icon: "⇄",
    label: "Load Balancer",
  },
  server: {
    accentColor: "#4f8f73",
    icon: "🖥️",
    label: "Server",
  },
  users: {
    accentColor: "#e5634d",
    icon: "👥",
    label: "Users",
  },
};

const PHASE_TWO_AVAILABLE_COMPONENTS: ComponentType[] = ["users", "server", "db"];

const isComponentType = (value: string): value is ComponentType =>
  Object.hasOwn(COMPONENT_LIBRARY, value);

export { COMPONENT_LIBRARY, PHASE_TWO_AVAILABLE_COMPONENTS, isComponentType };
export type { ComponentDefinition, ComponentType };
