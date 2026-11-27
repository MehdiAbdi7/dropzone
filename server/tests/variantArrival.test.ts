import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { variantCosts } from "../src/modules/orders/order.service.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Un arrivage de neuf (27/11, demande de Mehdi) : un iPhone neuf acheté 350 000 DA, puis 340 000 DA, reste UNE variante dont le
// prix d'achat devient la moyenne pondérée. Le stock, le prix d'achat et le journal changent ensemble.

describe("Arrivage d'un neuf, de bout en bout", () => {
  let admin: Awaited<ReturnType<typeof loginAs>>["agent"];
  let adminId: number;
  let variantId: number;

  // Un neuf en stock : 3 exemplaires achetés 350 000 DA l'unité.
  async function stockOf(id: number, stock: number, purchasePrice: number | null) {
    await prisma.productVariant.update({ where: { id }, data: { stock, purchasePrice } });
  }
  const read = (id = variantId) => prisma.productVariant.findUniqueOrThrow({ where: { id } });
  const arrive = (body: Record<string, unknown>, id = variantId, agent = admin) => agent.post(`/admin/variants/${id}/arrivals`).send(body);

  beforeEach(async () => {
    await resetDb();
    await createCatalog();
    const login = await loginAs("admin");
    admin = login.agent;
    adminId = (await prisma.user.findFirstOrThrow({ where: { role: "admin" } })).id;
    variantId = (await prisma.productVariant.findUniqueOrThrow({ where: { sku: "IP-NEW-256" } })).id;
    await stockOf(variantId, 3, 350_000);
  });

  it("ajoute le stock et fait la moyenne pondérée : 3 à 350 000 puis 5 à 340 000 donnent 343 750 DA", async () => {
    const response = await arrive({ quantity: 5, unitCost: 340_000 });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ id: variantId, stock: 8, purchasePrice: 343_750 });
    expect(await read()).toMatchObject({ stock: 8, purchasePrice: 343_750 });
  });

  it("ne touche pas au prix de vente", async () => {
    const before = await read();
    await arrive({ quantity: 5, unitCost: 340_000 });
    expect((await read()).price).toBe(before.price);
  });

  it("garde une ligne au journal : la quantité, le prix, le stock et le prix moyen d'après, et qui l'a saisie", async () => {
    await arrive({ quantity: 5, unitCost: 340_000 });

    const rows = await prisma.variantArrival.findMany({ where: { variantId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: 5, unitCost: 340_000, stockAfter: 8, costAfter: 343_750, userId: adminId });
  });

  it("deux arrivages de suite : la deuxième moyenne part de la première (3@350 000, +5@340 000, +2@330 000 = 341 000)", async () => {
    await arrive({ quantity: 5, unitCost: 340_000 });
    const second = await arrive({ quantity: 2, unitCost: 330_000 });

    expect(second.body.data).toMatchObject({ stock: 10, purchasePrice: 341_000 });
    const rows = await prisma.variantArrival.findMany({ where: { variantId }, orderBy: { id: "asc" } });
    expect(rows.map((row) => row.costAfter)).toEqual([343_750, 341_000]);
  });

  it("arrondit au dinar", async () => {
    await stockOf(variantId, 2, 100);
    const response = await arrive({ quantity: 1, unitCost: 101 });
    // (2 × 100 + 1 × 101) ÷ 3 = 100,33 → 100
    expect(response.body.data.purchasePrice).toBe(100);
  });

  it("un lot offert à 0 DA fait baisser la moyenne : 3 à 350 000 puis 3 à 0 donnent 175 000 DA", async () => {
    const response = await arrive({ quantity: 3, unitCost: 0 });
    expect(response.body.data).toMatchObject({ stock: 6, purchasePrice: 175_000 });
  });

  it("sans stock, le prix devient celui de l'arrivage (rien à moyenner)", async () => {
    await stockOf(variantId, 0, 350_000);
    const response = await arrive({ quantity: 4, unitCost: 340_000 });
    expect(response.body.data).toMatchObject({ stock: 4, purchasePrice: 340_000 });
  });

  it("les ventes suivantes lisent le nouveau prix d'achat moyen", async () => {
    await arrive({ quantity: 5, unitCost: 340_000 });
    const costs = await prisma.$transaction((tx) => variantCosts(tx, ["IP-NEW-256"]));
    expect(costs.get("IP-NEW-256")).toBe(343_750);
  });

  it("le produit remonte dans les derniers arrivages (le stock ajouté est un arrivage)", async () => {
    const variant = await read();
    const productBefore = await prisma.product.findUniqueOrThrow({ where: { id: variant.productId } });
    await new Promise((resolve) => setTimeout(resolve, 15));

    await arrive({ quantity: 1, unitCost: 340_000 });

    expect((await read()).stockedAt.getTime()).toBeGreaterThan(variant.stockedAt.getTime());
    expect((await prisma.product.findUniqueOrThrow({ where: { id: variant.productId } })).stockedAt.getTime()).toBeGreaterThan(
      productBefore.stockedAt.getTime(),
    );
  });

  describe("quand le prix d'achat du stock actuel est inconnu", () => {
    it("refuse (400) sans le prix du stock actuel, et ne change rien", async () => {
      await stockOf(variantId, 3, null);
      const response = await arrive({ quantity: 5, unitCost: 340_000 });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain("prix d'achat du stock actuel");
      expect(await read()).toMatchObject({ stock: 3, purchasePrice: null });
      expect(await prisma.variantArrival.count({ where: { variantId } })).toBe(0);
    });

    it("avec le prix du stock actuel, fait la moyenne", async () => {
      await stockOf(variantId, 3, null);
      const response = await arrive({ quantity: 5, unitCost: 340_000, currentUnitCost: 350_000 });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({ stock: 8, purchasePrice: 343_750 });
    });

    it("sans stock, il n'y a rien à demander : le prix de l'arrivage suffit", async () => {
      await stockOf(variantId, 0, null);
      const response = await arrive({ quantity: 2, unitCost: 340_000 });

      expect(response.status).toBe(201);
      expect(response.body.data.purchasePrice).toBe(340_000);
    });

    it("le prix du stock actuel est ignoré quand le prix d'achat est déjà connu", async () => {
      const response = await arrive({ quantity: 5, unitCost: 340_000, currentUnitCost: 1 });
      expect(response.body.data.purchasePrice).toBe(343_750);
    });
  });

  describe("ce qui est refusé", () => {
    it("une occasion : un arrivage ne se fait que sur un neuf scellé (400)", async () => {
      const deal = await prisma.productVariant.findUniqueOrThrow({ where: { sku: "IP-R-DEAL" } });
      const response = await arrive({ quantity: 1, unitCost: 1000 }, deal.id);

      expect(response.status).toBe(400);
      expect((await read(deal.id)).stock).toBe(1);
    });

    it("une variante inconnue (404)", async () => {
      expect((await arrive({ quantity: 1, unitCost: 1000 }, 999_999)).status).toBe(404);
    });

    it("une quantité ou un prix qui n'en sont pas (400), sans rien écrire", async () => {
      const bad = [
        { quantity: 0, unitCost: 1000 },
        { quantity: -2, unitCost: 1000 },
        { quantity: 1.5, unitCost: 1000 },
        { quantity: 10_001, unitCost: 1000 },
        { quantity: "5", unitCost: 1000 },
        { quantity: 1, unitCost: -1 },
        { quantity: 1, unitCost: 10_000_001 },
        { quantity: 1, unitCost: "mille" },
        { quantity: 1 },
        { unitCost: 1000 },
        { quantity: 1, unitCost: 1000, currentUnitCost: -5 },
      ];
      for (const body of bad) {
        expect((await arrive(body)).status, JSON.stringify(body)).toBe(400);
      }
      expect(await read()).toMatchObject({ stock: 3, purchasePrice: 350_000 });
      expect(await prisma.variantArrival.count()).toBe(0);
    });

    it("un stock qui dépasserait 10 000 (400), et 10 000 pile passe", async () => {
      expect((await arrive({ quantity: 9_998, unitCost: 1000 })).status).toBe(400);
      expect((await read()).stock).toBe(3);
      expect((await arrive({ quantity: 9_997, unitCost: 1000 })).status).toBe(201);
      expect((await read()).stock).toBe(10_000);
    });
  });

  describe("les droits", () => {
    it("seul l'admin ajoute un arrivage : le vendeur, le responsable, le technicien et le client sont refusés (403)", async () => {
      for (const role of ["seller", "order_manager", "technician", "customer"] as const) {
        const { agent } = await loginAs(role, `${role}@exemple.dz`);
        expect((await arrive({ quantity: 1, unitCost: 1000 }, variantId, agent)).status, role).toBe(403);
        expect((await agent.get(`/admin/variants/${variantId}/arrivals`)).status, role).toBe(403);
      }
      expect(await read()).toMatchObject({ stock: 3, purchasePrice: 350_000 });
    });

    it("un visiteur non connecté est refusé (401)", async () => {
      expect((await request(app).post(`/admin/variants/${variantId}/arrivals`).send({ quantity: 1, unitCost: 1000 })).status).toBe(401);
      expect((await request(app).get(`/admin/variants/${variantId}/arrivals`)).status).toBe(401);
    });
  });

  describe("deux arrivages en même temps", () => {
    it("aucun n'est perdu : le stock les compte tous, et le journal a les deux lignes", async () => {
      const [first, second] = await Promise.all([arrive({ quantity: 2, unitCost: 340_000 }), arrive({ quantity: 3, unitCost: 330_000 })]);

      expect([first.status, second.status]).toEqual([201, 201]);
      expect((await read()).stock).toBe(8);
      const rows = await prisma.variantArrival.findMany({ where: { variantId }, orderBy: { id: "asc" } });
      expect(rows).toHaveLength(2);
      // La deuxième ligne a lu le résultat de la première : les stocks s'enchaînent sans trou.
      expect(rows.map((row) => row.stockAfter)).toEqual([rows[0].quantity + 3, 8]);
      expect((await read()).purchasePrice).toBe(rows[1].costAfter);
    });
  });

  describe("le journal", () => {
    it("liste les arrivages, du plus récent au plus ancien", async () => {
      await arrive({ quantity: 5, unitCost: 340_000 });
      await arrive({ quantity: 2, unitCost: 330_000 });

      const response = await admin.get(`/admin/variants/${variantId}/arrivals`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({ quantity: 2, unitCost: 330_000, stockAfter: 10, costAfter: 341_000 });
      expect(response.body.data[1]).toMatchObject({ quantity: 5, unitCost: 340_000, stockAfter: 8, costAfter: 343_750 });
      expect(Object.keys(response.body.data[0]).sort()).toEqual(["costAfter", "createdAt", "id", "quantity", "stockAfter", "unitCost"]);
    });

    it("est vide sans arrivage, et 404 pour une variante inconnue", async () => {
      expect((await admin.get(`/admin/variants/${variantId}/arrivals`)).body.data).toEqual([]);
      expect((await admin.get("/admin/variants/999999/arrivals")).status).toBe(404);
    });

    it("disparaît avec la variante supprimée", async () => {
      await arrive({ quantity: 5, unitCost: 340_000 });
      await prisma.productVariant.delete({ where: { id: variantId } });
      expect(await prisma.variantArrival.count()).toBe(0);
    });
  });
});
