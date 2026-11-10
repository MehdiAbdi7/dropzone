import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Les règles de l'affiche que les tests de fonctions ne voient pas, lues dans styles/series-posters.css.
const css = readFileSync(fileURLToPath(new URL("../../styles/series-posters.css", import.meta.url)), "utf-8");

describe("Les animations de l'affiche", () => {
  // WCAG 2.2.2 : un mouvement qui démarre tout seul ne dure pas plus de 5 secondes.
  it("arrête la flèche du texte « Glisse pour voir… » avant 5 secondes", () => {
    const rule = css.match(/\.poster-hint-arrow \{[^}]*animation:\s*poster-go ([\d.]+)s [^;]*?(\d+|infinite);/);
    expect(rule, "règle .poster-hint-arrow introuvable").not.toBeNull();
    const [, duration, count] = rule!;
    expect(count).not.toBe("infinite");
    expect(Number(duration) * Number(count)).toBeLessThanOrEqual(5);
  });
});
