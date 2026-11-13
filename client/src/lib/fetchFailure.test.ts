import { describe, expect, it } from "vitest";
import { describeFailure } from "./fetchFailure";

// Le journal des échecs de publicFetch (13/11) : une ligne lisible dans les logs de Vercel,
// pour trouver la cause de « Le catalogue ne répond pas ».
describe("describeFailure", () => {
  it("dit l'adresse, le code de réponse et la durée", () => {
    expect(describeFailure("/products?sort=arrivages", { status: 500 }, 2034.6)).toBe(
      "[publicFetch] échec GET /products?sort=arrivages : réponse 500 après 2035 ms",
    );
  });

  it("dit le message d'une erreur réseau, avec sa cause quand fetch la donne", () => {
    const error = new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED") });
    expect(describeFailure("/stage", { error }, 30001)).toBe(
      "[publicFetch] échec GET /stage : erreur fetch failed (connect ECONNREFUSED) après 30001 ms",
    );
  });

  // Cas vu en vrai (13/11) : une connexion refusée donne une cause AggregateError au message
  // VIDE, la raison est dans son `code`. Sans ça, le journal affichait « fetch failed () ».
  it("prend le code de la cause quand son message est vide", () => {
    const cause = Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" });
    const error = new TypeError("fetch failed", { cause });
    expect(describeFailure("/stage", { error }, 70)).toBe("[publicFetch] échec GET /stage : erreur fetch failed (ECONNREFUSED) après 70 ms");
  });

  it("tient une erreur qui n'est pas un objet Error", () => {
    expect(describeFailure("/stage", { error: "boum" }, 5)).toBe("[publicFetch] échec GET /stage : erreur boum après 5 ms");
  });
});
