import { describe, expect, it } from "vitest";
import { COST_IDLE_MS, MASKED_COST, costsVisible, digitsOnly, idleExpired, isCompletePin } from "./costVisibility";

// Quand le back-office montre les prix d'achat (27/11) : cachés par défaut, visibles avec le code, jamais par erreur.

describe("costsVisible", () => {
  it("sans code réglé, tout est visible (le comportement d'avant)", () => {
    expect(costsVisible({ loaded: true, configured: false, unlocked: false })).toBe(true);
  });

  it("avec un code réglé, tout est caché tant qu'on ne l'a pas tapé", () => {
    expect(costsVisible({ loaded: true, configured: true, unlocked: false })).toBe(false);
  });

  it("avec un code réglé et tapé, tout est visible", () => {
    expect(costsVisible({ loaded: true, configured: true, unlocked: true })).toBe(true);
  });

  it("tant que l'état du code n'est pas connu, tout reste caché : on cache en cas de doute, jamais l'inverse", () => {
    expect(costsVisible({ loaded: false, configured: false, unlocked: false })).toBe(false);
    expect(costsVisible({ loaded: false, configured: false, unlocked: true })).toBe(false);
  });
});

describe("idleExpired", () => {
  const start = 1_000_000;

  it("cinq minutes sans geste recachent les prix", () => {
    expect(idleExpired(start, start + COST_IDLE_MS)).toBe(true);
    expect(idleExpired(start, start + COST_IDLE_MS + 1)).toBe(true);
  });

  it("avant cinq minutes, ils restent visibles", () => {
    expect(idleExpired(start, start)).toBe(false);
    expect(idleExpired(start, start + COST_IDLE_MS - 1)).toBe(false);
  });

  it("la limite est cinq minutes, et se règle", () => {
    expect(COST_IDLE_MS).toBe(300_000);
    expect(idleExpired(start, start + 1_000, 1_000)).toBe(true);
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
