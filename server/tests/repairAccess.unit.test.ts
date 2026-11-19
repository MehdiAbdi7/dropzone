import { describe, expect, it } from "vitest";
import { canMoveTo, patchAllowed } from "../src/modules/repairs/repairAccess.js";

// Ce que chaque rôle peut faire dans une fiche (atelier, étape 5, cahier §14) : la route est la même, le geste non.
describe("canMoveTo", () => {
  it("le technicien fait avancer la réparation : Prêt toujours, En réparation sous garantie seulement", () => {
    expect(canMoveTo("technician", "ready", { underWarranty: false })).toBe(true);
    expect(canMoveTo("technician", "ready", { underWarranty: true })).toBe(true);
    expect(canMoveTo("technician", "in_repair", { underWarranty: true })).toBe(true);
    for (const status of ["received", "quote", "to_return", "returned"] as const) {
      expect(canMoveTo("technician", status, { underWarranty: true }), status).toBe(false);
    }
  });

  // Hors garantie, le « oui » du client est enregistré par la vente : le technicien ne valide jamais seul un devis
  // qu'il ne voit pas (relecture finale, étape 5).
  it("le technicien ne passe pas En réparation hors garantie : c'est la vente qui enregistre l'accord du client", () => {
    expect(canMoveTo("technician", "in_repair", { underWarranty: false })).toBe(false);
  });

  it("le vendeur, le responsable et l'admin font tous les passages", () => {
    for (const role of ["seller", "order_manager", "admin"] as const) {
      for (const status of ["received", "quote", "in_repair", "ready", "to_return", "returned"] as const) {
        expect(canMoveTo(role, status, { underWarranty: false }), `${role} ${status}`).toBe(true);
      }
    }
  });

  it("un client n'a aucun passage", () => {
    expect(canMoveTo("customer", "in_repair", { underWarranty: true })).toBe(false);
  });
});

describe("patchAllowed", () => {
  it("le technicien ne modifie que sa note", () => {
    expect(patchAllowed("technician", ["note"])).toBe(true);
    expect(patchAllowed("technician", ["note", "laborPrice"])).toBe(false);
    expect(patchAllowed("technician", ["laborPrice"])).toBe(false);
    expect(patchAllowed("technician", ["deviceName"])).toBe(false);
    // Une modification vide ne change rien : rien d'interdit.
    expect(patchAllowed("technician", [])).toBe(true);
  });

  it("le vendeur, le responsable et l'admin modifient tout", () => {
    for (const role of ["seller", "order_manager", "admin"] as const) {
      expect(patchAllowed(role, ["laborPrice", "note", "deviceName"]), role).toBe(true);
    }
  });
});
