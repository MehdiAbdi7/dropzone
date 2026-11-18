import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { resetDb } from "./helpers.js";

// Les garde-fous de l'argent des réparations (18/11, étape 3) : même si le code se trompe, la base refuse un
// montant négatif et une fiche rendue sans jour de Rendu. Écrits en SQL brut : ils vérifient la migration.
beforeEach(resetDb);

const addRepair = async (extra: { status?: string; paid?: number | null; returnedOn?: string | null } = {}) => {
  const status = extra.status ?? "received";
  const paid = extra.paid === undefined ? null : extra.paid;
  const returnedOn = extra.returnedOn === undefined ? null : extra.returnedOn;
  return prisma.$executeRaw`INSERT INTO repairs (full_name, phone, device_name, issue, under_warranty, status, paid_amount, returned_on, updated_at)
    VALUES ('Karim Benali', '0550123456', 'iPhone 13', 'Écran noir', false, ${status}::"RepairStatus", ${paid}, ${returnedOn}::date, now())`;
};

describe("les colonnes de l'argent d'une réparation", () => {
  it("refuse un montant payé négatif", async () => {
    await expect(addRepair({ paid: -1 })).rejects.toThrow();
    await expect(addRepair({ paid: 0 })).resolves.toBe(1);
  });

  it("refuse un coût de pièces négatif", async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO repairs (full_name, phone, device_name, issue, under_warranty, parts_cost, updated_at)
        VALUES ('Karim Benali', '0550123456', 'iPhone 13', 'Écran noir', false, -5, now())`,
    ).rejects.toThrow();
  });

  it("refuse une fiche rendue sans jour de Rendu", async () => {
    await expect(addRepair({ status: "returned", returnedOn: null })).rejects.toThrow();
    await expect(addRepair({ status: "returned", returnedOn: "2026-11-18" })).resolves.toBe(1);
  });

  it("garde le moyen de paiement parmi ceux de la vente", async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO repairs (full_name, phone, device_name, issue, under_warranty, pay_method, updated_at)
        VALUES ('Karim Benali', '0550123456', 'iPhone 13', 'Écran noir', false, 'bitcoin', now())`,
    ).rejects.toThrow();
  });
});

describe("le journal d'argent et la trace", () => {
  it("accepte un mouvement repair lié à une fiche", async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO money_movements (business_date, amount, method, kind, repair_id, note)
        VALUES ('2026-11-18', 8000, 'cash'::"PaymentMethod", 'repair'::"MovementKind", 7, 'Réparation R-1001')`,
    ).resolves.toBe(1);
  });

  it("une trace de suppression peut porter un numéro de réparation sans commande", async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO order_events (kind, order_number, repair_number, summary)
        VALUES ('deleted'::"OrderEventKind", 1001, 1001, 'Réparation supprimée')`,
    ).resolves.toBe(1);
  });
});
