import { describe, expect, it } from "vitest";
import { initialsOf, roleLabel, todayLabel } from "./adminIdentity";

// Qui est connecté, montré dans la barre latérale et la barre du haut du back-office (19/11).
describe("initialsOf", () => {
  it("prend la première lettre du prénom et du nom, en majuscules", () => {
    expect(initialsOf("Mehdi", "Abdi")).toBe("MA");
    expect(initialsOf("amine", "test")).toBe("AT");
  });

  it("garde une lettre accentuée entière", () => {
    expect(initialsOf("Élodie", "Ouali")).toBe("ÉO");
  });

  it("se contente d'une lettre quand un des deux manque", () => {
    expect(initialsOf("Mehdi", "")).toBe("M");
    expect(initialsOf("", "Abdi")).toBe("A");
  });

  it("ignore les espaces autour et rend un point d'interrogation sans nom", () => {
    expect(initialsOf("  Mehdi ", " Abdi  ")).toBe("MA");
    expect(initialsOf(" ", "")).toBe("?");
  });
});

// La date en tête de la barre du haut : le jour à Alger, en français, sans l'année.
describe("todayLabel", () => {
  it("donne le jour de la semaine et la date à Alger", () => {
    expect(todayLabel(new Date("2026-11-19T10:00:00+01:00"))).toBe("jeudi 19 novembre");
  });

  it("change de jour à minuit à Alger, pas à minuit UTC", () => {
    // 23h30 UTC le 19 = 00h30 à Alger le 20.
    expect(todayLabel(new Date("2026-11-19T23:30:00Z"))).toBe("vendredi 20 novembre");
    expect(todayLabel(new Date("2026-11-19T22:30:00Z"))).toBe("jeudi 19 novembre");
  });
});

describe("roleLabel", () => {
  it("donne le libellé français de chaque rôle du back-office", () => {
    expect(roleLabel("admin")).toBe("Administrateur");
    expect(roleLabel("order_manager")).toBe("Responsable commande");
    expect(roleLabel("seller")).toBe("Vendeur");
    expect(roleLabel("technician")).toBe("Technicien");
  });
});
