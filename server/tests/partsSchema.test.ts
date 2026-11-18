import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { resetDb } from "./helpers.js";

// Les garde-fous de la base pour les pièces de l'atelier (18/11) : même si le code se trompe, la base refuse un
// stock négatif, un prix négatif, un mouvement de 0 et deux pièces au même nom. Écrits en SQL brut : ils
// vérifient la migration, pas le client Prisma.
beforeEach(resetDb);

const addPart = (name: string, over: { purchase?: number; sale?: number; stock?: number } = {}) =>
  prisma.$executeRaw`INSERT INTO parts (name, purchase_price, sale_price, stock)
    VALUES (${name}, ${over.purchase ?? 0}, ${over.sale ?? 0}, ${over.stock ?? 0})`;

describe("la table parts", () => {
  it("accepte une pièce valide", async () => {
    await expect(addPart("Batterie iPhone 13", { purchase: 3_500, sale: 6_000, stock: 2 })).resolves.toBe(1);
  });

  it("refuse un stock négatif", async () => {
    await expect(addPart("A", { stock: -1 })).rejects.toThrow();
  });

  it("refuse un prix d'achat ou de vente négatif", async () => {
    await expect(addPart("A", { purchase: -1 })).rejects.toThrow();
    await expect(addPart("B", { sale: -1 })).rejects.toThrow();
  });

  it("refuse deux noms identiques à la casse et aux espaces près", async () => {
    await addPart("Batterie iPhone 13");
    await expect(addPart("  batterie iphone 13 ")).rejects.toThrow();
  });
});

describe("la table part_movements", () => {
  const addMovement = (partId: number, delta: number, stockAfter: number) =>
    prisma.$executeRaw`INSERT INTO part_movements (part_id, kind, delta, stock_after)
      VALUES (${partId}, 'arrival'::"PartMovementKind", ${delta}, ${stockAfter})`;
  const partId = async () => {
    await addPart("Écran iPhone 13");
    return (await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM parts LIMIT 1`)[0].id;
  };

  it("refuse un mouvement de 0 et un stock après négatif", async () => {
    const id = await partId();
    await expect(addMovement(id, 0, 1)).rejects.toThrow();
    await expect(addMovement(id, 1, -1)).rejects.toThrow();
    await expect(addMovement(id, 2, 2)).resolves.toBe(1);
  });

  it("garde le journal : on ne supprime pas une pièce qui a des mouvements", async () => {
    const id = await partId();
    await addMovement(id, 2, 2);
    await expect(prisma.$executeRaw`DELETE FROM parts WHERE id = ${id}`).rejects.toThrow();
  });
});
