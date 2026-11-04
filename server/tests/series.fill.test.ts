import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { fillSeries, seriesNameOf } from "../src/scripts/series.js";
import { createCatalog, resetDb } from "./helpers.js";

describe("seriesNameOf : la série d'un modèle d'après son nom", () => {
  it.each([
    ["Apple", "phone", "iPhone 15 Pro Max", "iPhone 15"],
    ["Apple", "phone", "iPhone 16e", "iPhone 16"],
    // Lancé avec l'iPhone 17, sans « 17 » dans son nom.
    ["Apple", "phone", "iPhone Air", "iPhone 17"],
    ["Apple", "phone", "iPhone XR", "iPhone X"],
    ["Apple", "phone", "iPhone SE (3e génération)", "iPhone SE"],
    ["Samsung", "phone", "Galaxy S24 Ultra", "Galaxy S24"],
    ["Samsung", "phone", "Galaxy A55", "Galaxy A"],
    ["Samsung", "phone", "Galaxy Z Flip6", "Galaxy Z6"],
    ["Apple", "laptop", "MacBook Air 13 pouces M2", "MacBook Air"],
    ["HP", "laptop", "EliteBook 840 G8", "EliteBook"],
    ["Lenovo", "laptop", "ThinkPad T14 Gen 3", "ThinkPad"],
    ["Microsoft", "laptop", "Surface Laptop 5", "Surface Laptop"],
    // Le vrai catalogue de DropZone (partie B) : tablettes et nouveaux fabricants.
    ["Apple", "tablet", "iPad Air 11 pouces (M2)", "iPad Air"],
    ["Apple", "tablet", "iPad Pro 12,9 pouces (4e génération)", "iPad Pro"],
    ["Apple", "tablet", "iPad mini (6e génération)", "iPad mini"],
    ["Apple", "tablet", "iPad (10e génération)", "iPad"],
    ["Samsung", "tablet", "Galaxy Tab S10 Ultra", "Galaxy Tab S10"],
    ["Samsung", "phone", "Galaxy XCover 7", "Galaxy XCover"],
    ["Honor", "phone", "Honor 200", "Honor 200"],
    ["Honor", "phone", "Magic8 Pro", "Honor Magic8"],
    ["Vivo", "phone", "X200 Ultra", "Vivo X200"],
    ["Huawei", "phone", "P30 Pro", "Huawei P30"],
    ["Dell", "laptop", "Pro 14 Plus", "Dell Pro"],
    ["Dell", "laptop", "Pro Max 16", "Dell Pro Max"],
    ["HP", "laptop", "250 G10", "HP 250"],
    ["HP", "laptop", "Elite Dragonfly G3", "Elite Dragonfly"],
    ["Acer", "laptop", "Nitro V 15", "Nitro"],
    ["MSI", "laptop", "Modern 14", "Modern"],
    ["Toshiba", "laptop", "Tecra A40", "Tecra"],
    ["Honor", "laptop", "MagicBook 14", "MagicBook"],
    ["Samsung", "laptop", "Galaxy Book3", "Galaxy Book"],
  ] as const)("%s %s « %s » → « %s »", (maker, kind, name, expected) => {
    expect(seriesNameOf(maker, kind, name)).toBe(expected);
  });

  it("ne devine rien pour un fabricant inconnu", () => {
    expect(seriesNameOf("Inconnu", "phone", "Téléphone X")).toBeNull();
  });
});

describe("fillSeries : le rangement de départ", () => {
  let catalog: Awaited<ReturnType<typeof createCatalog>>;

  beforeEach(async () => {
    await resetDb();
    catalog = await createCatalog();
  });

  it("crée la série de chaque modèle sous la marque de son fabricant", async () => {
    await fillSeries(prisma);

    const iphone = await prisma.deviceModel.findUniqueOrThrow({
      where: { id: catalog.iphone.id },
      include: { series: true },
    });
    expect(iphone.series).toMatchObject({ name: "iPhone 15", slug: "iphone-15", brandId: catalog.iphoneBrand.id });

    const galaxy = await prisma.deviceModel.findUniqueOrThrow({
      where: { id: catalog.galaxy.id },
      include: { series: { include: { brand: true } } },
    });
    expect(galaxy.series?.name).toBe("Galaxy S24");
    expect(galaxy.series?.brand.slug).toBe("samsung");
  });

  it("ne crée rien la deuxième fois", async () => {
    const first = await fillSeries(prisma);
    expect(first).toEqual({ created: 2, assigned: 2 });
    expect(await fillSeries(prisma)).toEqual({ created: 0, assigned: 0 });
    expect(await prisma.series.count()).toBe(2);
  });

  it("ne déplace pas un modèle déjà rangé à la main", async () => {
    const manual = await prisma.series.create({
      data: { brandId: catalog.iphoneBrand.id, name: "Rangement du gérant", slug: "rangement-du-gerant" },
    });
    await prisma.deviceModel.update({ where: { id: catalog.iphone.id }, data: { seriesId: manual.id } });

    await fillSeries(prisma);

    const iphone = await prisma.deviceModel.findUniqueOrThrow({ where: { id: catalog.iphone.id } });
    expect(iphone.seriesId).toBe(manual.id);
  });

  it("laisse sans série un modèle dont le fabricant n'a pas de marque dans ce type de catégorie", async () => {
    const pixel = await prisma.deviceModel.create({
      data: { brand: "Google", name: "Pixel 8 Pro", slug: "google-pixel-8-pro", kind: "phone", releaseYear: 2023 },
    });

    await fillSeries(prisma);

    const after = await prisma.deviceModel.findUniqueOrThrow({ where: { id: pixel.id } });
    expect(after.seriesId).toBeNull();
  });

  it("range les modèles d'une série dans l'ordre de la liste (id croissant), en fin de série", async () => {
    const pro = await prisma.deviceModel.create({
      data: { brand: "Apple", name: "iPhone 15 Pro", slug: "apple-iphone-15-pro", kind: "phone", releaseYear: 2023 },
    });

    await fillSeries(prisma);

    const models = await prisma.deviceModel.findMany({
      where: { series: { slug: "iphone-15" } },
      orderBy: { seriesPosition: "asc" },
      select: { id: true, seriesPosition: true },
    });
    expect(models).toEqual([
      { id: catalog.iphone.id, seriesPosition: 0 },
      { id: pro.id, seriesPosition: 1 },
    ]);
  });
});

describe("Les séries dans la base", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("remet sans série les modèles d'une série supprimée", async () => {
    const catalog = await createCatalog();
    await fillSeries(prisma);
    const series = await prisma.series.findFirstOrThrow({ where: { slug: "iphone-15" } });

    await prisma.series.delete({ where: { id: series.id } });

    const iphone = await prisma.deviceModel.findUniqueOrThrow({ where: { id: catalog.iphone.id } });
    expect(iphone.seriesId).toBeNull();
  });

  it("refuse de supprimer une marque qui a une série", async () => {
    const catalog = await createCatalog();
    await prisma.series.create({ data: { brandId: catalog.ankerBrand.id, name: "Chargeurs", slug: "chargeurs" } });

    await expect(prisma.brand.delete({ where: { id: catalog.ankerBrand.id } })).rejects.toMatchObject({ code: "P2003" });
  });
});
