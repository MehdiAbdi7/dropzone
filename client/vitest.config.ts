import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Les tests du front : seulement les fonctions pures (calculs de la Boutique), sans navigateur.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
