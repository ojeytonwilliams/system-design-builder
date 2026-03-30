// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// https://astro.build/config
// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  integrations: [react()],
  server: { host: true },
});
