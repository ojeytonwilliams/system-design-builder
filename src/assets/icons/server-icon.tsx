import type { SVGProps } from "react";

const ServerIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    {...props}
  >
    <rect height="8" rx="2" ry="2" width="20" x="2" y="2" />
    <rect height="8" rx="2" ry="2" width="20" x="2" y="14" />
    <line x1="6" x2="6.01" y1="6" y2="6" />
    <line x1="6" x2="6.01" y1="18" y2="18" />
  </svg>
);

export { ServerIcon };
