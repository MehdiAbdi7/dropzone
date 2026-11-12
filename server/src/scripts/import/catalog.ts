// L'écriture du vrai catalogue de DropZone en base, à partir du relevé de ses annonces.
// Rejouable : tout est cherché avant d'être créé (catégories, marques, valeurs de listes,
// modèles, séries, produits, variantes par SKU), et un rejeu ne touche jamais au stock ni
// à la boîte d'un exemplaire : le relevé décrit le passé, le back-office décrit le présent.
import { findLibraryLogo } from "../../config/brandLogos.js";
import type { Tx } from "../../config/db.js";
import type { ChoiceGroup, Prisma, ProductKind } from "../../generated/prisma/client.js";
import { modelSlug } from "../../modules/models/modelSlug.js";
import { refreshMinPrice } from "../../modules/products/product.service.js";
import { defaultWarrantyMonths } from "../../modules/products/warranty.js";
import { slugify } from "../../utils/slugify.js";
import { CHOICES, COLOR_HEX } from "../device-models.js";
import { fillVariantColors } from "../lib/fillVariantColors.js";
import { fillSeries } from "../lib/series.js";
import { dedupe, importSku, type Listing, parseListing, type RawRow } from "./listing.js";
import { IGNORED, MODEL_MAP } from "./models-map.js";
import { OFFICIAL_SPECS } from "./official-specs.js";

export type ImportReport = {
  removed: { categories: number; products: number; brands: number };
  created: { brands: number; models: number; series: number; choices: number; products: number; variants: number };
  updated: { variants: number };
  skipped: { code: string; reason: string }[];
};

// Ce que DropZone ne vend pas (relevé du 04/11) : retiré de la boutique et de la base.
const REMOVED_CATEGORIES = ["montres-connectees", "audiovisuel"];
const REMOVED_PRODUCTS = [
  "google-pixel-8-pro",
  "xiaomi-redmi-note-13-pro",
  "samsung-galaxy-z-flip6",
  "dell-latitude-5430",
  "lenovo-thinkpad-t14-gen-3",
];
// Les marques devenues vides une fois ces produits retirés.
const REMOVED_BRANDS = [{ category: "smartphones", slug: "google" }, { category: "smartphones", slug: "xiaomi" }];

const CATEGORIES: Record<Listing["kind"], { name: string; slug: string }> = {
  phone: { name: "Smartphones", slug: "smartphones" },
  tablet: { name: "Tablettes", slug: "tablettes" },
  laptop: { name: "Ordinateurs portables", slug: "ordinateurs-portables" },
};

// Le nom de la marque dans chaque catégorie, d'après le fabricant (« iPhone » pour Apple
// dans Smartphones, « MacBook » dans PC portables, « Surface » pour Microsoft).
const BRAND_NAMES: Record<string, string> = {
  "smartphones|Apple": "iPhone",
  "tablettes|Apple": "iPad",
  "ordinateurs-portables|Apple": "MacBook",
  "ordinateurs-portables|Asus": "ASUS",
  "ordinateurs-portables|Microsoft": "Surface",
};

// L'illustration de chaque type, en attendant les photos de Mehdi (rien de DropZone).
const IMAGES: Record<Listing["kind"], string> = {
  phone: "/products/phone.svg",
  tablet: "/products/tablet.svg",
  laptop: "/products/laptop.svg",
};

// Les vraies photos (npm run photos : détourées, à l'échelle réelle), par modèle. Un
// produit créé par l'import la reçoit, pour qu'une base refaite ne la perde pas.
const CLOUDINARY = "https://res.cloudinary.com/nscawk7d/image/upload";
const PHOTOS: Record<string, string> = {
  "Apple|iPhone 17 Pro Max": `${CLOUDINARY}/v1793821024/dropzone/products/iphone-17-pro-max.webp`,
  "Apple|iPhone 17 Pro": `${CLOUDINARY}/v1793821025/dropzone/products/iphone-17-pro.webp`,
};

// La liste du back-office de chaque option de variante.
const OPTION_GROUPS: Record<string, ChoiceGroup> = {
  Stockage: "storage",
  RAM: "ram",
  Couleur: "color",
  SIM: "sim",
  Connectivité: "connectivity",
  Processeur: "processor",
  "Carte graphique": "gpu",
};

const DESCRIPTION = "Chaque exemplaire est décrit sur sa fiche : état, batterie, origine et garantie.";

// « iPhone 13 », mais « Samsung Galaxy S22+ », « Dell Latitude 5440 », « ASUS Vivobook 14 ».
export function productNameOf(maker: string, name: string): string {
  if (maker === "Apple" || name.toLowerCase().startsWith(maker.toLowerCase())) {
    return name;
  }
  return `${maker === "Asus" ? "ASUS" : maker} ${name}`;
}

// Les caractéristiques d'un PC : celles que tous ses exemplaires ont en commun, pour ne
// jamais annoncer sur la fiche ce qu'un exemplaire n'a pas.
function laptopSpecs(listings: Listing[]): Record<string, string> {
  const shared = (values: (string | null | undefined)[]) =>
    values.every((value) => value && value === values[0]) ? (values[0] as string) : null;
  const specs: Record<string, string> = {};
  const screen = shared(listings.map((listing) => listing.screen));
  const processor = shared(listings.map((listing) => listing.options.Processeur));
  const gpu = shared(listings.map((listing) => listing.options["Carte graphique"]));
  if (screen) {
    specs.Écran = screen;
  }
  if (processor) {
    specs.Processeur = processor;
  }
  if (gpu) {
    specs["Carte graphique"] = gpu;
  }
  return specs;
}

async function uniqueProductSlug(db: Tx, name: string): Promise<string> {
  const base = slugify(name) || "produit";
  let slug = base;
  for (let n = 2; await db.product.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function importDropzone(db: Tx, rows: RawRow[]): Promise<ImportReport> {
  const report: ImportReport = {
    removed: { categories: 0, products: 0, brands: 0 },
    created: { brands: 0, models: 0, series: 0, choices: 0, products: 0, variants: 0 },
    updated: { variants: 0 },
    skipped: [],
  };

  // ---------- 1. Lire le relevé ----------
  const parsed: Listing[] = [];
  for (const row of rows) {
    const result = parseListing(row);
    if ("skip" in result) {
      report.skipped.push({ code: row.code, reason: result.skip });
    } else if (result.modelKey in IGNORED) {
      report.skipped.push({ code: row.code, reason: IGNORED[result.modelKey] });
    } else if (!(result.modelKey in MODEL_MAP)) {
      throw new Error(`Modèle absent de models-map.ts : « ${result.modelKey} » (${row.code})`);
    } else {
      parsed.push(result);
    }
  }
  // Le SKU vient du code de la publication : deux annonces au même code fusionneraient.
  const codes = parsed.map((listing) => listing.code);
  const repeated = codes.find((code, index) => codes.indexOf(code) !== index);
  if (repeated) {
    throw new Error(`Deux annonces du relevé ont le même code : ${repeated}`);
  }
  const unique = dedupe(parsed);
  for (const listing of parsed.filter((listing) => !unique.includes(listing))) {
    report.skipped.push({ code: listing.code, reason: "annonce republiée" });
  }
  // Une référence désigne un seul appareil : déjà portée par un autre SKU en base, ou
  // réclamée par une annonce plus récente du même relevé, l'annonce n'est pas importée.
  const listings: Listing[] = [];
  const claimed = new Set<string>();
  for (const listing of [...unique].sort((a, b) => b.date.localeCompare(a.date))) {
    if (listing.reference) {
      const taken =
        claimed.has(listing.reference) ||
        (await db.productVariant.findFirst({
          where: { reference: listing.reference, sku: { not: importSku(listing.code) } },
          select: { id: true },
        })) !== null;
      if (taken) {
        report.skipped.push({ code: listing.code, reason: "référence déjà utilisée" });
        continue;
      }
      claimed.add(listing.reference);
    }
    listings.push(listing);
  }

  // ---------- 2. Ce que l'import sait déjà : sa mémoire, et les variantes en base ----------
  const skus = listings.map((listing) => importSku(listing.code));
  const records = new Map(
    (await db.importRecord.findMany({ where: { sku: { in: skus } } })).map((record) => [
      record.sku,
      record.snapshot as Record<string, unknown>,
    ]),
  );
  const variants = new Map(
    (await db.productVariant.findMany({ where: { sku: { in: skus } }, select: { sku: true, productId: true, options: true } })).map(
      (variant) => [variant.sku, variant],
    ),
  );
  // Le premier import : rien n'a encore été importé, ni noté dans la mémoire.
  const firstImport =
    (await db.importRecord.count()) === 0 &&
    (await db.productVariant.count({ where: { sku: { startsWith: "IG-" } } })) === 0;
  // Un exemplaire déjà importé puis supprimé dans le back-office n'est jamais recréé.
  const live = listings.filter((listing) => {
    const sku = importSku(listing.code);
    if (records.has(sku) && !variants.has(sku)) {
      report.skipped.push({ code: listing.code, reason: "supprimé dans le back-office" });
      return false;
    }
    return true;
  });
  // Les nouvelles annonces, et celles dont l'exemplaire existe déjà.
  const fresh = live.filter((listing) => !variants.has(importSku(listing.code)));
  const known = live.filter((listing) => variants.has(importSku(listing.code)));

  // ---------- 3. Retirer ce que DropZone ne vend pas, au premier import seulement ----------
  // Ensuite, c'est le gérant qui décide : une catégorie ou un produit qu'il recrée reste.
  // Les produits d'abord (une marque utilisée ne se supprime pas) ; les lignes de commande
  // gardent leur copie du nom et du prix (product_id passe à NULL).
  if (firstImport) {
    const removedProducts = await db.product.deleteMany({
      where: { OR: [{ category: { slug: { in: REMOVED_CATEGORIES } } }, { slug: { in: REMOVED_PRODUCTS } }] },
    });
    report.removed.products = removedProducts.count;
    const emptyBrands = await db.brand.findMany({
      where: {
        products: { none: {} },
        OR: [
          { category: { slug: { in: REMOVED_CATEGORIES } } },
          ...REMOVED_BRANDS.map((brand) => ({ slug: brand.slug, category: { slug: brand.category } })),
        ],
      },
      select: { id: true },
    });
    const emptyBrandIds = emptyBrands.map((brand) => brand.id);
    // Les séries avant leurs marques (RESTRICT) ; leurs modèles repassent sans série.
    await db.series.deleteMany({ where: { brandId: { in: emptyBrandIds } } });
    report.removed.brands = (await db.brand.deleteMany({ where: { id: { in: emptyBrandIds } } })).count;
    report.removed.categories = (
      await db.category.deleteMany({ where: { slug: { in: REMOVED_CATEGORIES }, products: { none: {} } } })
    ).count;
  }

  // ---------- 4. Ajouter ce qui manque aux nouvelles annonces : catégories, marques,
  // valeurs, modèles, séries ----------
  const categoryIds = new Map<Listing["kind"], number>();
  for (const kind of [...new Set(fresh.map((listing) => listing.kind))]) {
    const { name, slug } = CATEGORIES[kind];
    const category =
      (await db.category.findUnique({ where: { slug } })) ??
      (await db.category.create({ data: { name, slug, kind: kind as ProductKind } }));
    categoryIds.set(kind, category.id);
  }

  const brandIds = new Map<string, number>();
  for (const listing of fresh) {
    const { maker } = MODEL_MAP[listing.modelKey];
    const categorySlug = CATEGORIES[listing.kind].slug;
    const key = `${categorySlug}|${maker}`;
    if (brandIds.has(key)) {
      continue;
    }
    const categoryId = categoryIds.get(listing.kind)!;
    let brand = await db.brand.findFirst({ where: { categoryId, makerName: maker }, orderBy: { position: "asc" } });
    if (!brand) {
      const name = BRAND_NAMES[key] ?? maker;
      const last = await db.brand.findFirst({ where: { categoryId }, orderBy: { position: "desc" } });
      brand = await db.brand.create({
        data: {
          categoryId,
          name,
          slug: slugify(name),
          makerName: maker,
          logoUrl: findLibraryLogo(name),
          position: (last?.position ?? -1) + 1,
        },
      });
      report.created.brands += 1;
    }
    brandIds.set(key, brand.id);
  }

  // Les valeurs de départ des listes du vrai catalogue (une base remplie avant n'en a
  // aucune), au premier import seulement : ensuite, une valeur supprimée par le gérant ne
  // revient pas. Puis chaque valeur dont une nouvelle annonce a besoin.
  const starters = firstImport
    ? (["sim", "origin", "connectivity"] as const).flatMap((group) => CHOICES[group].map((label) => ({ group, label })))
    : [];
  const choices = [...starters, ...fresh.flatMap((listing) => [
    ...Object.entries(listing.options).map(([key, label]) => {
      const group = OPTION_GROUPS[key];
      if (!group) {
        throw new Error(`Option sans liste : « ${key} » (${listing.code})`);
      }
      // Une couleur reçoit sa teinte de départ (pastille et lueur de l'affiche), si on la connaît.
      return { group, label, hex: group === "color" ? (COLOR_HEX[label] ?? null) : null };
    }),
    ...(listing.origin ? [{ group: "origin" as const, label: listing.origin }] : []),
  ])];
  // skipDuplicates : une couleur déjà dans la liste garde la teinte réglée par le gérant.
  report.created.choices = (await db.choice.createMany({ data: choices, skipDuplicates: true })).count;

  const modelIds = new Map<string, number>();
  for (const listing of fresh) {
    const { maker, name, year } = MODEL_MAP[listing.modelKey];
    const slug = modelSlug(maker, name);
    if (modelIds.has(slug)) {
      continue;
    }
    // Cherché par slug : « ZenBook » et « Zenbook » sont le même modèle.
    let model = await db.deviceModel.findUnique({ where: { slug } });
    if (!model) {
      model = await db.deviceModel.create({ data: { brand: maker, name, slug, kind: listing.kind, releaseYear: year } });
      report.created.models += 1;
    }
    modelIds.set(slug, model.id);
  }
  // Seulement les modèles des nouvelles annonces : un modèle que le gérant a laissé sans
  // série (ou retiré d'une série) n'est pas rangé à sa place.
  report.created.series = (await fillSeries(db, [...modelIds.values()])).created;

  // ---------- 5. Un produit par modèle, seulement pour de nouveaux exemplaires ----------
  const slugOf = (listing: Listing) => modelSlug(MODEL_MAP[listing.modelKey].maker, MODEL_MAP[listing.modelKey].name);
  const byModel = new Map<string, Listing[]>();
  for (const listing of fresh) {
    byModel.set(slugOf(listing), [...(byModel.get(slugOf(listing)) ?? []), listing]);
  }
  const productIds = new Map<string, number>();
  for (const [slug, group] of byModel) {
    const first = group[0];
    const { maker, name } = MODEL_MAP[first.modelKey];
    const deviceModelId = modelIds.get(slug)!;
    // Le produit d'un exemplaire déjà importé du même modèle (même si le gérant a changé
    // le modèle du produit), sinon celui du modèle : jamais de produit en double ni vide.
    const sibling = known.find((listing) => slugOf(listing) === slug);
    const existing = sibling
      ? { id: variants.get(importSku(sibling.code))!.productId }
      : await db.product.findFirst({ where: { deviceModelId }, orderBy: { id: "asc" }, select: { id: true } });
    if (existing) {
      // Les caractéristiques d'un produit qui existait déjà ne sont pas touchées.
      productIds.set(slug, existing.id);
      continue;
    }
    const productName = productNameOf(maker, name);
    const specs: Prisma.InputJsonObject =
      first.kind === "laptop" ? laptopSpecs(group) : (OFFICIAL_SPECS[`${maker}|${name}`] ?? {});
    const product = await db.product.create({
      data: {
        name: productName,
        slug: await uniqueProductSlug(db, productName),
        description: DESCRIPTION,
        categoryId: categoryIds.get(first.kind)!,
        brandId: brandIds.get(`${CATEGORIES[first.kind].slug}|${maker}`)!,
        deviceModelId,
        specs,
        status: "published",
        images: { create: [{ url: PHOTOS[`${maker}|${name}`] ?? IMAGES[first.kind], position: 0 }] },
      },
      select: { id: true },
    });
    productIds.set(slug, product.id);
    report.created.products += 1;
  }

  // ---------- 6. Une variante par annonce, cherchée par SKU ----------
  const touched: number[] = [];
  for (const listing of live) {
    const sku = importSku(listing.code);
    // Ce que l'annonce dit de l'exemplaire, gardé aussi dans la mémoire de l'import.
    const data = {
      options: listing.options,
      price: listing.price,
      condition: listing.condition,
      grade: listing.grade,
      batteryHealth: listing.batteryHealth,
      details: listing.details,
      origin: listing.origin,
      warrantyMonths: listing.warrantyMonths ?? defaultWarrantyMonths(listing.kind, listing.condition),
      reference: listing.reference,
    };
    const snapshot = data as Prisma.InputJsonObject;
    const variant = variants.get(sku);
    if (!variant) {
      const productId = productIds.get(slugOf(listing))!;
      await db.productVariant.create({ data: { ...data, productId, sku, stock: 1, withBox: null } });
      await db.importRecord.create({ data: { sku, snapshot } });
      report.created.variants += 1;
      touched.push(productId);
      continue;
    }
    const previous = records.get(sku);
    if (!previous) {
      // Un exemplaire importé avant que l'import ait une mémoire : on note l'annonce sans
      // rien réécrire (la base peut déjà contenir des corrections du gérant).
      await db.importRecord.create({ data: { sku, snapshot } });
      continue;
    }
    // Seuls les champs dont l'annonce a changé depuis l'import précédent sont réécrits :
    // une note, une batterie, un prix ou des options corrigés par le gérant restent. Ni le
    // stock (un exemplaire vendu reste vendu) ni la boîte ne viennent jamais du relevé.
    const changes = Object.fromEntries(
      Object.entries(data).filter(([key, value]) => stableJson(value) !== stableJson(previous[key] ?? null)),
    );
    if (Object.keys(changes).length === 0) {
      continue;
    }
    // Étape Couleur (05/11) : une annonce sans couleur qui change une autre option garde la
    // couleur de l'exemplaire (posée par le remplissage ou corrigée par le gérant).
    const currentColor = (variant.options as Record<string, string> | null)?.Couleur;
    if (changes.options && !listing.options.Couleur && currentColor) {
      changes.options = { ...listing.options, Couleur: currentColor };
    }
    await db.productVariant.update({
      where: { sku },
      // Un neuf scellé n'a jamais de boîte à dire (CHECK).
      data: { ...changes, ...(changes.condition === "new" ? { withBox: null } : {}) } as Prisma.ProductVariantUpdateInput,
    });
    await db.importRecord.update({ where: { sku }, data: { snapshot } });
    report.updated.variants += 1;
    touched.push(variant.productId);
  }

  await refreshMinPrice(db, touched);
  // Les modèles créés par cet import reçoivent leurs couleurs officielles (pastilles de
  // l'affiche) ; ceux que le gérant a déjà réglés ne sont pas touchés. Puis chaque exemplaire
  // sans couleur reçoit la première couleur de son modèle (étape Couleur, 05/11).
  await fillVariantColors(db);
  return report;
}

// Un JSON qui ne dépend pas de l'ordre des clés : PostgreSQL range celles d'un JSONB par
// longueur, donc des options relues de la base ne sont pas dans l'ordre de l'annonce.
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
}
