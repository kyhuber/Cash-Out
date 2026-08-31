import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Mirrors the `@/*` path alias from tsconfig.json.
 *
 * Next resolves it during a build, but vitest runs the modules directly and
 * needs to be told. Without this, any non-type import across the alias fails to
 * resolve and the whole suite is skipped rather than failing loudly.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
