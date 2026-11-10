import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { clearAccessories } from "../src/scripts/lib/clearAccessories.js";
import { createCatalog, resetDb } from "./helpers.js";

// La remise à zéro des accessoires (06/11, demande de Mehdi : « supprime ce qu'il y a
// dedans, je peux tout créer après moi-même »).
let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
});

describe("clearAccessories", () => {
  it("supprime les produits et les types des catégories d'accessoires, rien d'autre", async () => {
    const devicesBefore = await prisma.product.count({ where: { category: { kind: { not: "accessory" } } } });
    const report = await clearAccessories(prisma);

    expect(report.products).toBeGreaterThan(0);
    expect(await prisma.product.count({ where: { category: { kind: "accessory" } } })).toBe(0);
    expect(await prisma.brand.count({ where: { categoryId: catalog.accessories.id } })).toBe(0);
    // La catégorie reste, les appareils aussi.
    expect(await prisma.category.findUnique({ where: { id: catalog.accessories.id } })).not.toBeNull();
    expect(await prisma.product.count({ where: { category: { kind: { not: "accessory" } } } })).toBe(devicesBefore);
    // Les cadeaux des affaires étaient des accessoires : ils partent avec eux.
    expect(await prisma.variantGift.count()).toBe(0);
  });

  it("ne change rien au deuxième passage", async () => {
    await clearAccessories(prisma);
    expect(await clearAccessories(prisma)).toEqual({ products: 0, types: 0, images: [] });
  });
});
