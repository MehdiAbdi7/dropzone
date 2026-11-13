import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, resetDb } from "./helpers.js";

// L'étape Couleur (05/11) : une photo par modèle et couleur, un seul produit par modèle d'appareil.
describe("La base de l'étape Couleur", () => {
  beforeEach(async () => {
    await resetDb();
    await createCatalog();
  });

  it("refuse un deuxième produit pour le même modèle", async () => {
    const first = await prisma.product.findUniqueOrThrow({ where: { slug: "iphone-15-pro-max" } });
    await expect(
      prisma.product.create({
        data: { name: "Doublon", slug: "doublon", description: "x", categoryId: first.categoryId, deviceModelId: first.deviceModelId },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("laisse plusieurs accessoires sans modèle", async () => {
    const charger = await prisma.product.findUniqueOrThrow({ where: { slug: "chargeur-usb-c-20-w" } });
    const other = await prisma.product.create({
      data: { name: "Câble", slug: "cable-test", description: "x", categoryId: charger.categoryId },
    });
    expect([charger.deviceModelId, other.deviceModelId]).toEqual([null, null]);
  });

  it("garde une seule photo par modèle et couleur", async () => {
    const model = await prisma.deviceModel.findUniqueOrThrow({ where: { slug: "apple-iphone-15-pro-max" } });
    await prisma.modelColorPhoto.create({ data: { deviceModelId: model.id, color: "Titane bleu", url: "https://x/1.webp" } });
    await expect(
      prisma.modelColorPhoto.create({ data: { deviceModelId: model.id, color: "Titane bleu", url: "https://x/2.webp" } }),
    ).rejects.toMatchObject({ code: "P2002" });
    await prisma.modelColorPhoto.create({ data: { deviceModelId: model.id, color: "Titane noir", url: "https://x/3.webp" } });
    expect(await prisma.modelColorPhoto.count({ where: { deviceModelId: model.id } })).toBe(2);
  });
});

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

  // Un arrivage peut apporter plusieurs appareils identiques (même état, même couleur) :
  // une seule fiche avec leur nombre (décision de Mehdi, 10/11). La base garde un plafond.
  it("accepte une affaire en plusieurs exemplaires", async () => {
    await expect(affaire("IG-DEUX", { stock: 3 })).resolves.toMatchObject({ stock: 3 });
  });

  it("refuse un stock au-delà du plafond de la base", async () => {
    await expect(affaire("IG-TROP", { stock: 10001 })).rejects.toThrow();
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
        dailyNumber: 1,
        businessDate: new Date("2026-11-14"),
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
