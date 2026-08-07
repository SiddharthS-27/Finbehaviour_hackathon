import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Engine tests only. No component tests — the engine is pure and worth
 * testing exhaustively; the UI is worth testing by hand at each phase gate.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.{test,spec}.ts", "content/**/*.{test,spec}.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
