import { CacheIcon } from "../assets/icons/cache-icon";
import { DbIcon } from "../assets/icons/db-icon";
import { LoadBalancerIcon } from "../assets/icons/load-balancer-icon";
import { ServerIcon } from "../assets/icons/server-icon";
import { UsersIcon } from "../assets/icons/users-icon";
import type { ComponentDefinition, ComponentType } from "./component-library";
import { convertConnection } from "./component-converter";
import { convertComponent } from "./component-library";

const COMPONENT_LIBRARY_FIXTURE: Record<ComponentType, ComponentDefinition> = {
  cache: convertComponent({
    accentColor: "#facc15",
    capacity: 0.2,
    description: "Caches frequent DB reads in memory",
    icon: CacheIcon,
    label: "Cache",
    latencyMs: 5,
    monthlyCost: 25,
  }),
  db: convertComponent({
    accentColor: "#f472b6",
    capacity: 0.03,
    description: "Stores and retrieves application data",
    icon: DbIcon,
    label: "Small DB",
    latencyMs: 15,
    monthlyCost: 15,
  }),
  "db-large": convertComponent({
    accentColor: "#f472b6",
    capacity: 0.09,
    description: "High-capacity managed database",
    icon: DbIcon,
    label: "Large DB",
    latencyMs: 10,
    monthlyCost: 50,
  }),
  "load-balancer": convertComponent({
    accentColor: "#a78bfa",
    capacity: Infinity,
    description: "Splits traffic evenly across servers",
    icon: LoadBalancerIcon,
    label: "Load Balancer",
    latencyMs: 2,
    monthlyCost: 20,
  }),
  server: convertComponent({
    accentColor: "#22d3ee",
    capacity: 0.05,
    description: "Handles incoming web requests",
    icon: ServerIcon,
    label: "Small Server",
    latencyMs: 10,
    monthlyCost: 20,
  }),
  "server-large": convertComponent({
    accentColor: "#22d3ee",
    capacity: 0.15,
    description: "High-capacity web server",
    icon: ServerIcon,
    label: "Large Server",
    latencyMs: 8,
    monthlyCost: 80,
  }),
  users: convertComponent({
    accentColor: "#fb7185",
    capacity: Infinity,
    description: "Traffic source",
    icon: UsersIcon,
    label: "Users",
    latencyMs: 0,
    monthlyCost: 0,
  }),
};

const CONNECTION_LIBRARY_FIXTURE = {
  standard: convertConnection({ transitMs: 10 }),
};

export { COMPONENT_LIBRARY_FIXTURE, CONNECTION_LIBRARY_FIXTURE };
