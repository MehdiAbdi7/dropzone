import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Applique les migrations à la base de test, une fois avant tous les tests.
    globalSetup: "./tests/globalSetup.ts",
    setupFiles: "./tests/setup.ts",
    // Les fichiers partagent la même base : ils passent un par un, pas en parallèle.
    fileParallelism: false,
  },
});
