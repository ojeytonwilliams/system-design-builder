import type { FC, SVGProps } from "react";
import { CacheIcon } from "../assets/icons/cache-icon.js";
import { DbIcon } from "../assets/icons/db-icon.js";
import { LoadBalancerIcon } from "../assets/icons/load-balancer-icon.js";
import { ServerIcon } from "../assets/icons/server-icon.js";
import { UsersIcon } from "../assets/icons/users-icon.js";
import { convertComponent, convertConnection } from "./component-converter.js";

interface ComponentDefinition {
  accentColor: string;
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
  cache: convertComponent({
    accentColor: "#facc15",
    description: "Caches frequent DB reads in memory",
    icon: CacheIcon,
    label: "Cache",
    latencyMs: 2.5,
    monthlyCost: 25,
  }),
  db: convertComponent({
    accentColor: "#f472b6",
    description: "Stores and retrieves application data",
    icon: DbIcon,
    label: "Small DB",
    latencyMs: 16.67,
    monthlyCost: 15,
  }),
  "db-large": convertComponent({
    accentColor: "#f472b6",
    description: "High-capacity managed database",
    icon: DbIcon,
    label: "Large DB",
    latencyMs: 5.56,
    monthlyCost: 50,
  }),
  "load-balancer": convertComponent({
    accentColor: "#a78bfa",
    description: "Splits traffic evenly across servers",
    icon: LoadBalancerIcon,
    label: "Load Balancer",
    latencyMs: 0.1,
    monthlyCost: 20,
  }),
  server: convertComponent({
    accentColor: "#22d3ee",
    description: "Handles incoming web requests",
    icon: ServerIcon,
    label: "Small Server",
    latencyMs: 10,
    monthlyCost: 20,
  }),
  "server-large": convertComponent({
    accentColor: "#22d3ee",
    description: "High-capacity web server",
    icon: ServerIcon,
    label: "Large Server",
    latencyMs: 3.33,
    monthlyCost: 80,
  }),
  users: convertComponent({
    accentColor: "#fb7185",
    description: "Traffic source",
    icon: UsersIcon,
    label: "Users",
    latencyMs: 0,
    monthlyCost: 0,
  }),
};

interface ConnectionDefinition {
  transitMs: number;
}

type ConnectionType = "standard";

type ConnectionLibrary = Record<ConnectionType, ConnectionDefinition>;

const CONNECTION_LIBRARY: ConnectionLibrary = {
  standard: convertConnection({ transitMs: 10 }),
};

const isComponentType = (value: string): value is ComponentType =>
  Object.hasOwn(COMPONENT_LIBRARY, value);

export { COMPONENT_LIBRARY, CONNECTION_LIBRARY, convertComponent, isComponentType };
export type {
  ComponentDefinition,
  ComponentType,
  ConnectionDefinition,
  ConnectionLibrary,
  ConnectionType,
};
