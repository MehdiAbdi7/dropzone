import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { importDropzone } from "../src/scripts/import/catalog.js";
import { importSku, type RawRow } from "../src/scripts/import/listing.js";
import { OFFICIAL_SPECS } from "../src/scripts/import/official-specs.js";
import { createCatalog, resetDb } from "./helpers.js";

const row = (fields: Partial<RawRow>): RawRow => ({
  date: "2026-10-01",
  code: "TEST",
  type: "tel",
  modele: "",
  cpu: "",
  ram: "",
  stockage: "",
  ecran: "",
  gpu: "",
  prix_da: "",
  reference: "",
  garantie: "",
  etat: "",
  batterie: "",
  origine: "",
  sim: "",
  neuf: "",
  ...fields,
});

// Six lignes inspirées du relevé, plus trois qu'on n'importe pas.
const rows = (latitudePrice = "68000") => [
  // Un modèle qui a déjà un produit (catalogue de test) : l'annonce s'y ajoute.
  row({ code: "C-IP15PM", modele: "iPhone 15 Pro Max", stockage: "256 Go", prix_da: "175000", garantie: "6 mois", etat: "comme-neuf", origine: "EU" }),
  // Sans garantie dans l'annonce : celle de DropZone (6 mois pour une affaire de téléphone).
  row({ code: "C-S24", date: "2026-10-28", modele: "Galaxy S24", ram: "8 Go", stockage: "256 Go", prix_da: "82000", etat: "comme-neuf", sim: "2SIM" }),
  // La même annonce republiée 10 jours plus tôt : un seul exemplaire.
  row({ code: "C-S24-BIS", date: "2026-10-18", modele: "Galaxy S24", ram: "8 Go", stockage: "256 Go", prix_da: "82000", etat: "comme-neuf", sim: "2SIM" }),
  row({ code: "C-IPADMINI", type: "tab", modele: "iPad mini 6", stockage: "256 Go", prix_da: "79000", garantie: "6 mois", etat: "comme-neuf", batterie: "90 %", origine: "EU" }),
  row({
    code: "C-LAT7400",
    type: "pc",
    modele: "Dell Latitude 7400",
    cpu: "i7-8665U",
    ram: "8 Go DDR4",
    stockage: "256 Go SSD NVMe",
    ecran: "14 FHD tactile",
    gpu: "UHD 620",
    prix_da: latitudePrice,
    reference: "41240",
    garantie: "3 mois",
  }),
  row({
    code: "C-L13",
    type: "pc",
    modele: "Lenovo ThinkPad L13 2-in-1 Gen 3",
    cpu: "Core 5 120U",
    ram: "16 Go DDR5",
    stockage: "512 Go SSD NVMe",
    ecran: "13,3 WUXGA tactile",
    gpu: "Intel Graphics",
    prix_da: "165000",
    reference: "61119",
    garantie: "3 mois",
    sim: "neuf",
  }),
  // Une référence déjà prise par un autre appareil (posée dans beforeEach).
  row({ code: "C-REF", type: "pc", modele: "Dell Latitude 5440", cpu: "i5-1345U", prix_da: "99000", reference: "51057" }),
  row({ code: "C-SANS-PRIX", modele: "iPhone 11" }),
  row({ code: "C-IGNORE", type: "pc", modele: "Apple MacBook Pro « M3 15,4 pouces » (2024) Minuit, à vérifier", prix_da: "228000" }),
];

const variant = (code: string) => prisma.productVariant.findUniqueOrThrow({ where: { sku: importSku(code) }, include: { product: true } });

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-R-WIFI" }, data: { reference: "51057" } });
  // Une catégorie que DropZone ne vend pas, avec un produit cité par une commande.
  const watches = await prisma.category.create({ data: { name: "Montres connectées", slug: "montres-connectees", kind: "watch" } });
  const watchBrand = await prisma.brand.create({ data: { categoryId: watches.id, name: "Apple Watch", slug: "apple-watch", makerName: "Apple" } });
  await prisma.series.create({ data: { brandId: watchBrand.id, name: "Apple Watch", slug: "apple-watch" } });
  const watch = await prisma.product.create({
    data: {
      name: "Apple Watch Series 9",
      slug: "apple-watch-series-9",
      description: "Montre",
      categoryId: watches.id,
      brandId: watchBrand.id,
      status: "published",
      variants: { create: [{ sku: "AW9-41", price: 60000, stock: 2, warrantyMonths: 12 }] },
    },
  });
  await prisma.order.create({
    data: {
      fullName: "Client",
      phone: "0555000000",
      wilaya: "Alger",
      commune: "Kouba",
      address: "Rue",
      subtotal: 60000,
      shippingFee: 0,
      total: 60000,
      items: { create: [{ productId: watch.id, sku: "AW9-41", name: "Apple Watch Series 9", unitPrice: 60000, quantity: 1 }] },
    },
  });
});

describe("importDropzone : le premier import", () => {
  it("crée un exemplaire par annonce, dans le bon produit, et dit ce qu'il n'importe pas", async () => {
    const report = await importDropzone(prisma, rows());

    expect(report.created).toMatchObject({ products: 4, variants: 5 });
    expect(report.updated.variants).toBe(0);
    expect(report.skipped.map((skip) => [skip.code, skip.reason]).sort()).toEqual(
      [
        ["C-IGNORE", "format qui n'existe pas chez Apple, à vérifier avec le gérant"],
        ["C-REF", "référence déjà utilisée"],
        ["C-S24-BIS", "annonce republiée"],
        ["C-SANS-PRIX", "sans prix"],
      ].sort(),
    );

    // L'iPhone 15 Pro Max s'ajoute au produit existant.
    const iphone = await variant("C-IP15PM");
    expect(iphone.product.slug).toBe("iphone-15-pro-max");
    expect(await prisma.product.count({ where: { deviceModel: { name: "iPhone 15 Pro Max" } } })).toBe(1);
    expect(iphone).toMatchObject({ stock: 1, condition: "refurbished", withBox: null, warrantyMonths: 6, origin: "Europe", details: "Comme neuf" });
  });

  it("donne la garantie de DropZone quand l'annonce n'en dit rien, et lit les options", async () => {
    await importDropzone(prisma, rows());
    const s24 = await variant("C-S24");
    expect(s24).toMatchObject({ warrantyMonths: 6, options: { Stockage: "256 Go", RAM: "8 Go", SIM: "Double SIM" } });
    expect(s24.product).toMatchObject({ name: "Samsung Galaxy S24", status: "published" });
  });

  it("importe un PC neuf scellé avec sa référence, et écrit les caractéristiques d'un PC", async () => {
    await importDropzone(prisma, rows());
    expect(await variant("C-L13")).toMatchObject({ condition: "new", withBox: null, reference: "61119", warrantyMonths: 3, stock: 1 });
    const latitude = await variant("C-LAT7400");
    expect(latitude.product.name).toBe("Dell Latitude 7400");
    expect(latitude.product.specs).toEqual({ Écran: "14 FHD tactile", Processeur: "Intel Core i7-8665U", "Carte graphique": "UHD 620" });
  });

  it("donne à une tablette les caractéristiques officielles et sa catégorie", async () => {
    await importDropzone(prisma, rows());
    const ipad = await variant("C-IPADMINI");
    expect(ipad.product.specs).toEqual(OFFICIAL_SPECS["Apple|iPad mini (6e génération)"]);
    const category = await prisma.category.findUniqueOrThrow({ where: { id: ipad.product.categoryId } });
    expect(category).toMatchObject({ slug: "tablettes", kind: "tablet" });
  });

  it("range chaque nouveau modèle dans sa série, sous la marque de son fabricant", async () => {
    await importDropzone(prisma, rows());
    const models = await prisma.deviceModel.findMany({
      where: { name: { in: ["Galaxy S24", "iPad mini (6e génération)", "Latitude 7400", "ThinkPad L13 2-in-1"] } },
      include: { series: { include: { brand: true } } },
    });
    expect(models.map((model) => [model.name, model.series?.name, model.series?.brand.name]).sort()).toEqual(
      [
        ["Galaxy S24", "Galaxy S24", "Samsung"],
        ["iPad mini (6e génération)", "iPad mini", "iPad"],
        ["Latitude 7400", "Latitude", "Dell"],
        ["ThinkPad L13 2-in-1", "ThinkPad", "Lenovo"],
      ].sort(),
    );
  });

  it("retire les montres, sans effacer la commande qui en citait une", async () => {
    const report = await importDropzone(prisma, rows());
    expect(report.removed).toMatchObject({ categories: 1, products: 1 });
    expect(await prisma.category.findUnique({ where: { slug: "montres-connectees" } })).toBeNull();
    const line = await prisma.orderItem.findFirstOrThrow({ where: { sku: "AW9-41" } });
    expect(line).toMatchObject({ name: "Apple Watch Series 9", productId: null });
  });
});

describe("importDropzone : un relevé incohérent", () => {
  it("refuse deux annonces avec le même code, qui deviendraient un seul exemplaire", async () => {
    const twice = [
      row({ code: "C-DOUBLE", modele: "iPhone 13", prix_da: "58000" }),
      row({ code: "C-DOUBLE", modele: "iPhone 13", prix_da: "78000" }),
    ];
    await expect(importDropzone(prisma, twice)).rejects.toThrow("C-DOUBLE");
  });
});

describe("importDropzone : le rejeu", () => {
  it("ne crée rien la deuxième fois et met à jour les exemplaires", async () => {
    await importDropzone(prisma, rows());
    const report = await importDropzone(prisma, rows());
    expect(report.created).toEqual({ brands: 0, models: 0, series: 0, choices: 0, products: 0, variants: 0 });
    expect(report.updated.variants).toBe(5);
    expect(report.removed).toEqual({ categories: 0, products: 0, brands: 0 });
  });

  it("suit un prix changé dans le relevé, jusqu'au prix « dès » du produit", async () => {
    await importDropzone(prisma, rows());
    await importDropzone(prisma, rows("65000"));
    const latitude = await variant("C-LAT7400");
    expect(latitude.price).toBe(65000);
    expect(latitude.product.minPrice).toBe(65000);
  });

  it("ne remet pas en stock un exemplaire vendu, et garde la boîte corrigée par le gérant", async () => {
    await importDropzone(prisma, rows());
    await prisma.productVariant.update({ where: { sku: importSku("C-S24") }, data: { stock: 0, withBox: true } });
    await importDropzone(prisma, rows());
    expect(await variant("C-S24")).toMatchObject({ stock: 0, withBox: true });
  });
});
