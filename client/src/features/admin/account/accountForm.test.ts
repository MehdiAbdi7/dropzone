import { describe, expect, it } from "vitest";
import { emailProblem, passwordProblem } from "./accountForm";

// Mon compte du back-office : ce que la page refuse tout de suite, avant d'appeler l'API (qui refuserait de toute façon).
describe("passwordProblem", () => {
  const ok = { current: "ancienmotdepasse", next: "nouveaumotdepasse", confirm: "nouveaumotdepasse" };

  it("accepte un changement complet", () => {
    expect(passwordProblem(ok)).toBeNull();
  });

  it("demande d'abord le mot de passe actuel", () => {
    expect(passwordProblem({ ...ok, current: "" })).toMatch(/actuel/i);
  });

  it("refuse un nouveau mot de passe trop court ou trop long", () => {
    expect(passwordProblem({ ...ok, next: "court", confirm: "court" })).toMatch(/8 caractères/);
    expect(passwordProblem({ ...ok, next: "x".repeat(73), confirm: "x".repeat(73) })).toMatch(/72/);
  });

  it("refuse deux saisies différentes", () => {
    expect(passwordProblem({ ...ok, confirm: "nouveaumotdepasse2" })).toMatch(/identiques/);
  });

  it("refuse le même mot de passe que l'actuel", () => {
    expect(passwordProblem({ current: "motdepasse1", next: "motdepasse1", confirm: "motdepasse1" })).toMatch(/différent/i);
  });
});

describe("emailProblem", () => {
  it("accepte un email valide avec le mot de passe actuel", () => {
    expect(emailProblem({ current: "motdepasse1", email: "Nouveau@Mail.com", currentEmail: "ancien@mail.com" })).toBeNull();
  });

  it("demande le mot de passe actuel", () => {
    expect(emailProblem({ current: "", email: "nouveau@mail.com", currentEmail: "ancien@mail.com" })).toMatch(/actuel/i);
  });

  it("refuse un email invalide", () => {
    for (const email of ["", "pas-un-email", "a@b", "a b@mail.com"]) {
      expect(emailProblem({ current: "motdepasse1", email, currentEmail: "ancien@mail.com" }), email).toMatch(/email/i);
    }
  });

  it("refuse l'email déjà utilisé par ce compte, sans tenir compte des majuscules", () => {
    expect(emailProblem({ current: "motdepasse1", email: "ANCIEN@mail.com", currentEmail: "ancien@mail.com" })).toMatch(/déjà/i);
  });
});
