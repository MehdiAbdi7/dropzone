import { describe, expect, it } from "vitest";
import { generatePassword, resetPasswordProblem } from "./resetPassword";

// Réinitialiser le mot de passe d'un client depuis la page Clients : ce que la page refuse tout de suite, et le
// mot de passe qu'elle peut proposer à l'administrateur.
describe("resetPasswordProblem", () => {
  it("accepte de 8 à 72 caractères", () => {
    expect(resetPasswordProblem("motdepasse")).toBeNull();
    expect(resetPasswordProblem("x".repeat(8))).toBeNull();
    expect(resetPasswordProblem("x".repeat(72))).toBeNull();
  });

  it("refuse un mot de passe trop court ou trop long", () => {
    expect(resetPasswordProblem("court")).toMatch(/8 caractères/);
    expect(resetPasswordProblem("x".repeat(73))).toMatch(/72/);
  });
});

describe("generatePassword", () => {
  it("fait 10 caractères, acceptés par la règle de l'API", () => {
    const password = generatePassword();
    expect(password).toHaveLength(10);
    expect(resetPasswordProblem(password)).toBeNull();
  });

  it("n'utilise jamais de caractère qu'on confond (0 O o, 1 l I)", () => {
    for (let i = 0; i < 200; i++) {
      expect(generatePassword()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{10}$/);
    }
  });

  it("donne un mot de passe différent à chaque fois", () => {
    expect(new Set(Array.from({ length: 20 }, generatePassword)).size).toBe(20);
  });
});
