// Le rangement de départ des modèles en séries. Ce n'est qu'un point de départ : la
// Boutique ne devine jamais la série dans le nom, elle lit `device_models.series_id`,
// et le gérant range ensuite ses modèles lui-même dans le back-office (« Catalogue »).
import type { Tx } from "../config/db.js";
import type { ProductKind } from "../generated/prisma/client.js";
import { slugify } from "../utils/slugify.js";

type Rule = [pattern: RegExp, series: string | ((match: RegExpMatchArray) => string)];

// Les règles de chaque fabricant, par type d'appareil, essayées dans l'ordre.
const RULES: Record<string, Partial<Record<ProductKind, Rule[]>>> = {
  Apple: {
    phone: [
      // L'iPhone Air est sorti avec l'iPhone 17, sans « 17 » dans son nom.
      [/^iPhone Air/, "iPhone 17"],
      [/^iPhone (\d+)/, (m) => `iPhone ${m[1]}`],
      [/^iPhone X/, "iPhone X"],
      [/^iPhone SE/, "iPhone SE"],
    ],
    tablet: [
      [/^iPad Pro/, "iPad Pro"],
      [/^iPad Air/, "iPad Air"],
      [/^iPad mini/, "iPad mini"],
      [/^iPad/, "iPad"],
    ],
    laptop: [
      [/^MacBook Air/, "MacBook Air"],
      [/^MacBook Pro/, "MacBook Pro"],
    ],
    watch: [[/^Apple Watch/, "Apple Watch"]],
  },
  Samsung: {
    phone: [
      [/^Galaxy S(\d+)/, (m) => `Galaxy S${m[1]}`],
      [/^Galaxy Z (?:Flip|Fold)(\d+)/, (m) => `Galaxy Z${m[1]}`],
      [/^Galaxy A/, "Galaxy A"],
      [/^Galaxy XCover/, "Galaxy XCover"],
    ],
    tablet: [[/^Galaxy Tab S(\d+)/, (m) => `Galaxy Tab S${m[1]}`]],
    laptop: [[/^Galaxy Book/, "Galaxy Book"]],
    watch: [[/^Galaxy Watch/, "Galaxy Watch"]],
  },
  // Le nom du fabricant devant la série, pour que le bouton de l'affiche se lise bien :
  // « Acheter un Vivo X200 », pas « Acheter un X200 ».
  Honor: {
    phone: [
      [/^Honor (\d+)/, (m) => `Honor ${m[1]}`],
      [/^Magic(\d+)/, (m) => `Honor Magic${m[1]}`],
    ],
  },
  Vivo: { phone: [[/^X(\d+)/, (m) => `Vivo X${m[1]}`]] },
  Huawei: { phone: [[/^P(\d+)/, (m) => `Huawei P${m[1]}`]] },
  Dell: {
    laptop: [
      [/^Pro Max\b/, "Dell Pro Max"],
      [/^Pro\b/, "Dell Pro"],
    ],
  },
  HP: {
    laptop: [
      [/^Elite Dragonfly/, "Elite Dragonfly"],
      [/^(\d{3}) G\d+/, (m) => `HP ${m[1]}`],
    ],
  },
  Google: { phone: [[/^Pixel (\d+)/, (m) => `Pixel ${m[1]}`]] },
  Xiaomi: {
    phone: [
      [/^Xiaomi (\d+)/, (m) => `Xiaomi ${m[1]}`],
      [/^Redmi Note (\d+)/, (m) => `Redmi Note ${m[1]}`],
      [/^Poco/, "Poco"],
    ],
  },
  Microsoft: {
    laptop: [
      [/^Surface Laptop/, "Surface Laptop"],
      [/^Surface Pro/, "Surface Pro"],
    ],
  },
  Asus: {
    laptop: [
      [/^ROG/, "ROG"],
      [/^TUF Gaming/, "TUF Gaming"],
    ],
  },
};

// Les autres PC portables : le premier mot du nom est la gamme (Latitude, EliteBook, ThinkPad…).
const LAPTOP_MAKERS = new Set(["Asus", "Dell", "HP", "Lenovo", "Acer", "MSI", "Gigabyte", "Toshiba", "Honor"]);

export function seriesNameOf(maker: string, kind: ProductKind, modelName: string): string | null {
  for (const [pattern, series] of RULES[maker]?.[kind] ?? []) {
    const match = modelName.match(pattern);
    if (match) {
      return typeof series === "string" ? series : series(match);
    }
  }
  if (kind === "laptop" && LAPTOP_MAKERS.has(maker)) {
    return modelName.split(" ")[0] || null;
  }
  return null;
}

// Range chaque modèle sans série dans la série de son nom, sous la marque de son fabricant
// (une catégorie du même type). Crée la série si elle manque. Ne touche jamais un modèle
// déjà rangé : relancer le script ne change rien au travail du gérant. `onlyModelIds`
// limite le rangement à ces modèles (l'import des annonces : seulement les siens, pas
// ceux que le gérant a laissés sans série).
export async function fillSeries(db: Tx, onlyModelIds?: number[]): Promise<{ created: number; assigned: number }> {
  const brands = await db.brand.findMany({
    where: { makerName: { not: null } },
    orderBy: [{ categoryId: "asc" }, { position: "asc" }],
    select: { id: true, makerName: true, category: { select: { kind: true } } },
  });
  const models = await db.deviceModel.findMany({
    where: { seriesId: null, ...(onlyModelIds ? { id: { in: onlyModelIds } } : {}) },
    orderBy: { id: "asc" },
    select: { id: true, brand: true, kind: true, name: true },
  });

  let created = 0;
  let assigned = 0;
  for (const model of models) {
    const name = seriesNameOf(model.brand, model.kind, model.name);
    const brand = brands.find((b) => b.makerName === model.brand && b.category.kind === model.kind);
    if (!name || !brand) {
      continue;
    }
    const slug = slugify(name);
    let series = await db.series.findUnique({ where: { brandId_slug: { brandId: brand.id, slug } } });
    if (!series) {
      series = await db.series.create({ data: { brandId: brand.id, name, slug } });
      created += 1;
    }
    const last = await db.deviceModel.findFirst({
      where: { seriesId: series.id },
      orderBy: { seriesPosition: "desc" },
      select: { seriesPosition: true },
    });
    await db.deviceModel.update({
      where: { id: model.id },
      data: { seriesId: series.id, seriesPosition: last ? last.seriesPosition + 1 : 0 },
    });
    assigned += 1;
  }
  return { created, assigned };
}
