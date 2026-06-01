import type { FC, SVGProps } from "react";
import { CacheIcon } from "../assets/icons/cache-icon.js";
import { DbIcon } from "../assets/icons/db-icon.js";
import { LoadBalancerIcon } from "../assets/icons/load-balancer-icon.js";
import { ServerIcon } from "../assets/icons/server-icon.js";
import { UsersIcon } from "../assets/icons/users-icon.js";

/** Ratio of visual animation time to real-world time. A component with a
 * real-world latency of 10ms will animate for 10 * TIME_SCALE = 1000ms. */
const TIME_SCALE = 100;

interface ComponentDefinition {
  accentColor: string;
  capacity: number;
  description: string;
  icon: FC<SVGProps<SVGSVGElement>>;
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
    icon: CacheIcon,
    label: "Cache",
    latencyMs: 5 * TIME_SCALE,
    monthlyCost: 25,
  },
  db: {
    accentColor: "#f472b6",
    capacity: 30,
    description: "Stores and retrieves application data",
    icon: DbIcon,
    label: "Small DB",
    latencyMs: 15 * TIME_SCALE,
    monthlyCost: 15,
  },
  "db-large": {
    accentColor: "#f472b6",
    capacity: 90,
    description: "High-capacity managed database",
    icon: DbIcon,
    label: "Large DB",
    latencyMs: 10 * TIME_SCALE,
    monthlyCost: 50,
  },
  "load-balancer": {
    accentColor: "#a78bfa",
    capacity: Infinity,
    description: "Splits traffic evenly across servers",
    icon: LoadBalancerIcon,
    label: "Load Balancer",
    latencyMs: 2 * TIME_SCALE,
    monthlyCost: 20,
  },
  server: {
    accentColor: "#22d3ee",
    capacity: 50,
    description: "Handles incoming web requests",
    icon: ServerIcon,
    label: "Small Server",
    latencyMs: 10 * TIME_SCALE,
    monthlyCost: 20,
  },
  "server-large": {
    accentColor: "#22d3ee",
    capacity: 150,
    description: "High-capacity web server",
    icon: ServerIcon,
    label: "Large Server",
    latencyMs: 8 * TIME_SCALE,
    monthlyCost: 80,
  },
  users: {
    accentColor: "#fb7185",
    capacity: Infinity,
    description: "Traffic source",
    icon: UsersIcon,
    label: "Users",
    latencyMs: 0,
    monthlyCost: 0,
  },
};

interface ConnectionDefinition {
  transitMs: number;
}

type ConnectionType = "standard";

type ConnectionLibrary = Record<ConnectionType, ConnectionDefinition>;

const CONNECTION_LIBRARY: ConnectionLibrary = {
  standard: { transitMs: 10 * TIME_SCALE },
};

const isComponentType = (value: string): value is ComponentType =>
  Object.hasOwn(COMPONENT_LIBRARY, value);

export { COMPONENT_LIBRARY, CONNECTION_LIBRARY, isComponentType, TIME_SCALE };
export type {
  ComponentDefinition,
  ComponentType,
  ConnectionDefinition,
  ConnectionLibrary,
  ConnectionType,
};
