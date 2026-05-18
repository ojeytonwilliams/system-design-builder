#!/usr/bin/env node
// oxlint-disable
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";

const [, , slug] = process.argv;

if (!slug) {
  console.error("Usage: node scripts/new-level.mjs <slug>");
  console.error("Example: node scripts/new-level.mjs cdn-intro");
  process.exit(1);
}

const id = nanoid();
const varName = slug.replace(/-([a-z])/gv, (_, c) => c.toUpperCase());
const fileName = `${slug}.ts`;
const dir = fileURLToPath(new URL(".", import.meta.url));
const outPath = join(dir, "../src/levels", fileName);

const content = `import type { LevelDefinition } from "./types.js";

const ${varName}: LevelDefinition = {
  availableComponents: [],
  cacheHitRate: 0,
  coachMessages: [],
  componentUnlocks: [],
  feedbackText: [],
  id: "${id}",
  lockedNodeIds: [],
  monthlyBudget: 0,
  objectiveText: "",
  startingEdges: [],
  startingNodes: [],
  timeout: 60,
  title: "",
  trafficPeak: 0,
  trafficStart: 0,
  trafficTarget: 0,
};

export { ${varName} };
`;

writeFileSync(outPath, content);
console.log(`Created src/levels/${fileName}`);
console.log(`  id: "${id}"`);
console.log(`\nAdd to src/levels/index.ts:`);
console.log(`  import { ${varName} } from "./${slug}.js";`);
console.log(`  // then add ${varName} to the LEVELS array`);
