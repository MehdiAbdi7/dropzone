import { describe, expect, it } from "vitest";
import {
  COST_REVEAL_MS,
  MASKED_COST,
  costsHiddenByDefault,
  digitsOnly,
  isCompletePin,
  isCostVisible,
  nextExpiry,
  stillRevealed,
  withReveal,
  withoutReveal,
} from "./costVisibility";

// Quand le back-office montre un prix d'achat (27/11) : caché par défaut, débloqué par le code POUR CE PRIX SEUL, et recaché
// ensuite. Jamais montré par erreur.

describe("costsHiddenByDefault", () => {
  it("sans code réglé, rien n'est caché (le comportement d'avant)", () => {
    expect(costsHiddenByDefault({ loaded: true, configured: false })).toBe(false);
  });

  it("avec un code réglé, tout est caché par défaut", () => {
    expect(costsHiddenByDefault({ loaded: true, configured: true })).toBe(true);
  });

  it("tant que l'état du code n'est pas connu, tout reste caché : on cache en cas de doute, jamais l'inverse", () => {
    expect(costsHiddenByDefault({ loaded: false, configured: false })).toBe(true);
    expect(costsHiddenByDefault({ loaded: false, configured: true })).toBe(true);
  });
});

describe("isCostVisible : un prix à la fois", () => {
  const now = 1_000_000;
  const protectedStore = { loaded: true, configured: true };

  it("sans code réglé, le prix se voit sans rien faire", () => {
    expect(isCostVisible({ loaded: true, configured: false, expiresAt: undefined, now })).toBe(true);
  });

  it("avec un code réglé, un prix non débloqué reste caché", () => {
    expect(isCostVisible({ ...protectedStore, expiresAt: undefined, now })).toBe(false);
  });

  it("un prix débloqué se voit jusqu'à la fin de son délai, pas après", () => {
    expect(isCostVisible({ ...protectedStore, expiresAt: now + 1, now })).toBe(true);
    expect(isCostVisible({ ...protectedStore, expiresAt: now, now })).toBe(false);
    expect(isCostVisible({ ...protectedStore, expiresAt: now - 1, now })).toBe(false);
  });

  it("tant que l'état du code n'est pas connu, un prix jamais débloqué reste caché ; un prix dont le code a été vérifié se voit", () => {
    expect(isCostVisible({ loaded: false, configured: false, expiresAt: undefined, now })).toBe(false);
    expect(isCostVisible({ loaded: false, configured: false, expiresAt: now + 10_000, now })).toBe(true);
  });
});

describe("Les déblocages, un par prix", () => {
  const now = 5_000;

  it("débloquer un prix ne débloque pas les autres", () => {
    const revealed = withReveal({}, "hit:IP-R-DEAL", now);
    expect(revealed["hit:IP-R-DEAL"]).toBe(now + COST_REVEAL_MS);
    expect(revealed["hit:AUTRE"]).toBeUndefined();
    expect(Object.keys(revealed)).toEqual(["hit:IP-R-DEAL"]);
  });

  it("le délai est de trente secondes", () => {
    expect(COST_REVEAL_MS).toBe(30_000);
  });

  it("retaper le code d'un prix déjà débloqué repart pour trente secondes", () => {
    const first = withReveal({}, "a", now);
    const again = withReveal(first, "a", now + 20_000);
    expect(again.a).toBe(now + 20_000 + COST_REVEAL_MS);
  });

  it("recacher un prix tout de suite ne touche pas aux autres", () => {
    const revealed = withReveal(withReveal({}, "a", now), "b", now);
    expect(withoutReveal(revealed, "a")).toEqual({ b: now + COST_REVEAL_MS });
    expect(withoutReveal(revealed, "inconnu")).toEqual(revealed);
  });

  it("garde les déblocages encore valables et retire ceux dont le délai est écoulé", () => {
    const revealed = { vieux: now - 1, limite: now, frais: now + 100 };
    expect(stillRevealed(revealed, now)).toEqual({ frais: now + 100 });
  });

  it("donne le prochain déblocage à finir, pour programmer le recachage", () => {
    expect(nextExpiry({})).toBeNull();
    expect(nextExpiry({ a: 300, b: 100, c: 200 })).toBe(100);
  });
});

describe("le code tapé", () => {
  it("ne garde que quatre chiffres, quoi qu'on tape ou colle", () => {
    expect(digitsOnly("12a3-4")).toBe("1234");
    expect(digitsOnly("123456")).toBe("1234");
    expect(digitsOnly("abcd")).toBe("");
    expect(digitsOnly("")).toBe("");
  });

  it("n'est complet qu'à quatre chiffres exactement", () => {
    expect(isCompletePin("1234")).toBe(true);
    expect(isCompletePin("0000")).toBe(true);
    expect(isCompletePin("123")).toBe(false);
    expect(isCompletePin("12345")).toBe(false);
    expect(isCompletePin("12 4")).toBe(false);
    expect(isCompletePin("")).toBe(false);
  });
});

describe("MASKED_COST", () => {
  it("ne contient aucun chiffre : jamais de quoi deviner la taille d'un prix", () => {
    expect(MASKED_COST).not.toMatch(/\d/);
  });
});
