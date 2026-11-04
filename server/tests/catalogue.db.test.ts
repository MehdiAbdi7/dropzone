import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, resetDb } from "./helpers.js";

// Les règles que la base fait respecter pour le vrai catalogue de DropZone :
// note et batterie facultatives, boîte « non précisée », garantie et référence.
describe("La base du vrai catalogue", () => {
  let productId: number;

  beforeEach(async () => {
    await resetDb();
    await createCatalog();
    productId = (await prisma.product.findUniqueOrThrow({ where: { slug: "iphone-15-pro-max" } })).id;
  });

  const affaire = (sku: string, extra: Record<string, unknown> = {}) =>
    prisma.productVariant.create({
      data: { productId, sku, price: 100000, stock: 1, condition: "refurbished", ...extra },
    });

  it("accepte une affaire sans note, sans batterie et sans boîte connue (annonce importée)", async () => {
    const variant = await affaire("IG-SANS-NOTE", { grade: null, batteryHealth: null, withBox: null });
    expect(variant).toMatchObject({ grade: null, batteryHealth: null, withBox: null });
  });

  it("refuse toujours une affaire en plusieurs exemplaires", async () => {
    await expect(affaire("IG-DEUX", { stock: 2 })).rejects.toThrow();
  });

  it("refuse une boîte sur un neuf scellé", async () => {
    await expect(
      prisma.productVariant.create({ data: { productId, sku: "NEUF-BOITE", price: 1, stock: 1, withBox: true } }),
    ).rejects.toThrow();
  });

  it("borne la garantie entre 1 et 36 mois", async () => {
    await expect(affaire("IG-G0", { warrantyMonths: 0 })).rejects.toThrow();
    await expect(affaire("IG-G37", { warrantyMonths: 37 })).rejects.toThrow();
    const variant = await affaire("IG-G12", { warrantyMonths: 12 });
    expect(variant.warrantyMonths).toBe(12);
  });

  it("garde une référence unique, mais permet plusieurs variantes sans référence", async () => {
    await affaire("IG-REF-1", { reference: "51057" });
    await expect(affaire("IG-REF-2", { reference: "51057" })).rejects.toMatchObject({ code: "P2002" });
    await affaire("IG-SANS-REF-1");
    await affaire("IG-SANS-REF-2");
    expect(await prisma.productVariant.count({ where: { reference: null, sku: { startsWith: "IG-SANS-REF" } } })).toBe(2);
  });

  it("range l'origine d'un appareil", async () => {
    const variant = await affaire("IG-ORIGINE", { origin: "Europe" });
    expect(variant.origin).toBe("Europe");
  });

  it("accepte une catégorie de tablettes", async () => {
    const category = await prisma.category.create({ data: { name: "Tablettes", slug: "tablettes", kind: "tablet" } });
    expect(category.kind).toBe("tablet");
  });

  it("garde la garantie sur une ligne de commande", async () => {
    const order = await prisma.order.create({
      data: {
        fullName: "Test",
        phone: "0555000000",
        wilaya: "Alger",
        commune: "Kouba",
        address: "Rue",
        subtotal: 1,
        shippingFee: 0,
        total: 1,
        items: { create: [{ sku: "X", name: "X", unitPrice: 1, quantity: 1, warrantyMonths: 6 }] },
      },
      include: { items: true },
    });
    expect(order.items[0].warrantyMonths).toBe(6);
  });
});
