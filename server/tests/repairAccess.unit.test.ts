import { describe, expect, it } from "vitest";
import { canMoveTo, createAllowed, patchAllowed } from "../src/modules/repairs/repairAccess.js";

// Ce que chaque rôle peut faire dans une fiche (atelier, étape 5, cahier §14) : la route est la même, le geste non.
// Depuis le 21/11 (décision de Mehdi) : le technicien a toutes les infos de son travail et fixe le prix ; seul le
// Rendu (qui encaisse dans la caisse) reste à la vente.
describe("canMoveTo", () => {
  it("le technicien fait avancer toute la réparation : devis, accord, refus, Prêt, garantie ou non", () => {
    for (const status of ["quote", "in_repair", "ready", "to_return"] as const) {
      expect(canMoveTo("technician", status), status).toBe(true);
    }
  });

  // Rendre l'appareil écrit l'argent dans la caisse du jour : un geste de la vente, pas du technicien.
  it("le technicien ne rend jamais l'appareil", () => {
    expect(canMoveTo("technician", "returned")).toBe(false);
  });

  it("le vendeur, le responsable et l'admin font tous les passages", () => {
    for (const role of ["seller", "order_manager", "admin"] as const) {
      for (const status of ["received", "quote", "in_repair", "ready", "to_return", "returned"] as const) {
        expect(canMoveTo(role, status), `${role} ${status}`).toBe(true);
      }
    }
  });

  it("un client n'a aucun passage", () => {
    expect(canMoveTo("customer", "in_repair")).toBe(false);
  });
});

describe("patchAllowed et createAllowed", () => {
  it("le technicien, le vendeur, le responsable et l'admin modifient et créent toute la fiche, prix compris", () => {
    for (const role of ["technician", "seller", "order_manager", "admin"] as const) {
      expect(patchAllowed(role), role).toBe(true);
      expect(createAllowed(role), role).toBe(true);
    }
  });

  it("un client ne modifie ni ne crée rien", () => {
    expect(patchAllowed("customer")).toBe(false);
    expect(createAllowed("customer")).toBe(false);
  });
});
