import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { IPHONE_SERIES, SAMSUNG_SERIES } from "../src/scripts/fill-new/accessories.js";
import { replaceAccessories } from "../src/scripts/lib/replaceAccessories.js";
import { createCatalog, resetDb } from "./helpers.js";

// Le remplacement des anciens verres et coques (refonte du 12/11) : 30 verres par série
// deviennent 4 verres par qualité et par taille, 37 coques par série deviennent 5 par famille.
let catalog: Awaited<ReturnType<typeof createCatalog>>;
let glassType: { id: number };
let caseType: { id: number };
let oldGlass: { id: number; variants: { id: number }[] };

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  // Les téléphones que nomment les coques (le catalogue de test a déjà l'iPhone 15 Pro Max).
  const names = [...Object.values(IPHONE_SERIES).flat(), ...Object.values(SAMSUNG_SERIES).flat()];
  for (const name of names) {
    const brand = name.startsWith("iPhone") ? "Apple" : "Samsung";
    await prisma.deviceModel.upsert({
      where: { brand_name: { brand, name } },
      update: {},
      create: { brand, name, slug: `${brand}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), kind: "phone" },
    });
  }
  // La fiche de l'iPhone 15 Pro Max dit sa taille d'écran.
  await prisma.product.update({ where: { id: catalog.phone.id }, data: { specs: { Écran: "6,7 pouces OLED" } } });

  glassType = await prisma.brand.create({ data: { categoryId: catalog.accessories.id, name: "Incassable Écran", slug: "incassable-ecran", position: 3 } });
  caseType = await prisma.brand.create({ data: { categoryId: catalog.accessories.id, name: "Coques", slug: "coques", position: 2 } });
  const glassMaker = await prisma.accessoryMaker.create({ data: { typeId: glassType.id, name: "iPhone", slug: "iphone" } });
  const caseMaker = await prisma.accessoryMaker.create({ data: { typeId: caseType.id, name: "iPhone", slug: "iphone" } });
  oldGlass = await prisma.product.create({
    data: {
      name: "Verre trempé incassable iPhone 15",
      slug: "verre-trempe-incassable-iphone-15",
      description: "Ancien verre",
      categoryId: catalog.accessories.id,
      brandId: glassType.id,
      makerId: glassMaker.id,
      status: "published",
      variants: { create: [{ sku: "VERT-IPHONE-15", price: 1500, stock: 10, options: { Modèle: "iPhone 15" } }] },
    },
    select: { id: true, variants: { select: { id: true } } },
  });
  await prisma.product.create({
    data: {
      name: "Coque antichoc transparente iPhone 15",
      slug: "coque-antichoc-transparente-iphone-15",
      description: "Ancienne coque",
      categoryId: catalog.accessories.id,
      brandId: caseType.id,
      makerId: caseMaker.id,
      status: "published",
      // Même SKU qu'une variante de la nouvelle coque : il doit être libéré avant la création.
      variants: { create: [{ sku: "COQT-IPHONE-15", price: 2500, stock: 10, options: { Modèle: "iPhone 15" } }] },
    },
  });
});

const run = () => prisma.$transaction((tx) => replaceAccessories(tx), { timeout: 120_000 });
const named = (name: string) =>
  prisma.product.findFirst({
    where: { name },
    include: { variants: { orderBy: { id: "asc" }, include: { compatibleModels: { select: { name: true } } } } },
  });

describe("replaceAccessories", () => {
  it("remplace les anciens verres et coques par les nouveaux", async () => {
    const report = await run();
    expect(report.deleted.sort()).toEqual(["Coque antichoc transparente iPhone 15", "Verre trempé incassable iPhone 15"]);
    expect(await prisma.product.count({ where: { name: { startsWith: "Verre trempé" } } })).toBe(0);
    const glasses = await prisma.product.findMany({ where: { brandId: glassType.id }, include: { variants: true } });
    expect(glasses.map((g) => g.name).sort()).toEqual([
      "Verre incassable Céramique 9D",
      "Verre incassable Full glue 9H",
      "Verre incassable Privacy",
      "Verre incassable Standard 9H",
    ]);
    expect(glasses.every((g) => g.variants.length === 13)).toBe(true);
    expect(await prisma.product.count({ where: { brandId: caseType.id } })).toBe(5);
  });

  it("un verre n'a pas de marque", async () => {
    await run();
    const glasses = await prisma.product.findMany({ where: { brandId: glassType.id }, select: { makerId: true } });
    expect(glasses.every((g) => g.makerId === null)).toBe(true);
  });

  it("chaque taille reçoit les téléphones de sa taille", async () => {
    await run();
    const standard = await named("Verre incassable Standard 9H");
    const bySize = (size: string) =>
      standard!.variants.find((v) => (v.options as Record<string, string>)["Taille de l'écran"] === size)!.compatibleModels.map((m) => m.name);
    expect(bySize("6,7 pouces")).toEqual(["iPhone 15 Pro Max"]);
    expect(bySize("6,8 pouces")).toEqual([]);
    expect(standard!.variants[0]).toMatchObject({ sku: "VER-STD-47", price: 1000, stock: 10 });
  });

  it("refuse si un ancien produit est offert en cadeau", async () => {
    const deal = await prisma.productVariant.findFirstOrThrow({ where: { sku: "IP-R-DEAL" } });
    await prisma.variantGift.create({ data: { variantId: deal.id, giftVariantId: oldGlass.variants[0].id, quantity: 1 } });
    await expect(run()).rejects.toThrow(/iPhone 15 Pro Max/);
    expect(await prisma.product.findUnique({ where: { id: oldGlass.id } })).not.toBeNull();
  });

  it("relancé, il ne change rien", async () => {
    await run();
    const before = await prisma.product.count();
    const second = await run();
    expect(second.deleted).toEqual([]);
    expect(second.fill.created.products).toBe(0);
    expect(await prisma.product.count()).toBe(before);
  });

  it("retire les marques vides", async () => {
    const report = await run();
    expect(report.makersRemoved).toEqual(["Incassable Écran › iPhone"]);
    expect(await prisma.accessoryMaker.count({ where: { typeId: glassType.id } })).toBe(0);
    // La marque iPhone des coques sert aux nouvelles coques : elle reste.
    expect(await prisma.accessoryMaker.count({ where: { typeId: caseType.id, slug: "iphone" } })).toBe(1);
  });
});
