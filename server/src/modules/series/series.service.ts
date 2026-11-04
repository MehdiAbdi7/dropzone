import { prisma } from "../../config/db.js";
import type { Condition, Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { lowestInStock } from "../products/product.service.js";

type VariantLite = { condition: Condition; price: number; stock: number; options: Prisma.JsonValue };
type Color = { name: string; inStock: boolean };

// Les couleurs d'un modèle, dans l'ordre d'apparition : toutes celles du neuf (même
// épuisées, pour les barrer) et celles des affaires en stock. Une affaire vendue a quitté
// la boutique : sa couleur ne s'affiche plus.
export function colorsOf(variants: VariantLite[]): Color[] {
  const colors = new Map<string, boolean>();
  for (const variant of variants) {
    if (variant.condition === "refurbished" && variant.stock <= 0) {
      continue;
    }
    const color = (variant.options as Record<string, string> | null)?.Couleur;
    if (color) {
      colors.set(color, (colors.get(color) ?? false) || variant.stock > 0);
    }
  }
  return [...colors].map(([name, inStock]) => ({ name, inStock }));
}

// La couleur de la lueur : celle choisie par le gérant, sinon la première en stock,
// sinon la première tout court (null : lueur neutre).
export function resolvePosterColor(chosen: string | null, colors: Color[]): string | null {
  return chosen ?? colors.find((color) => color.inStock)?.name ?? colors[0]?.name ?? null;
}

// Les caractéristiques les plus parlantes d'abord. JSONB ne garde pas l'ordre de saisie
// (il range les clés par longueur) : sans cet ordre, l'affiche montrerait « Puce » avant
// « Écran » et oublierait « Appareil photo », clé trop longue.
const SPEC_ORDER = [
  "Écran",
  "Puce",
  "Processeur",
  // Juste après le processeur : sur l'affiche d'une série de PC, c'est la ligne qui compte.
  "Carte graphique",
  "Appareil photo",
  "Batterie",
  "Autonomie",
  "RAM",
  "Stockage",
  "Connecteur",
  "Ports",
];

export function posterSpecs(specs: Record<string, string>, count = 4): [string, string][] {
  const rank = (key: string) => {
    const index = SPEC_ORDER.indexOf(key);
    return index === -1 ? SPEC_ORDER.length : index;
  };
  return Object.entries(specs)
    .sort(([a], [b]) => rank(a) - rank(b))
    .slice(0, count);
}

// L'ordre des séries d'une marque : la plus récente d'abord. On compare l'année la plus
// haute de leurs modèles, puis la plus basse : l'iPhone 16e (2025) ne fait pas passer la
// série 16 (2024 et 2025) devant la 17 (2025 seulement). Puis le nom.
export function compareSeries(
  a: { name: string; years: (number | null)[] },
  b: { name: string; years: (number | null)[] },
): number {
  const known = (years: (number | null)[]) => years.filter((year): year is number => year !== null);
  const [yearsA, yearsB] = [known(a.years), known(b.years)];
  const newest = (years: number[]) => (years.length ? Math.max(...years) : -Infinity);
  const oldest = (years: number[]) => (years.length ? Math.min(...years) : -Infinity);
  return newest(yearsB) - newest(yearsA) || oldest(yearsB) - oldest(yearsA) || a.name.localeCompare(b.name, "fr");
}

// Ce qu'il faut lire d'une série : ses modèles dans l'ordre de l'affiche, et pour chacun
// son produit publié (le plus ancien s'il y en a plusieurs), sa photo et ses variantes.
const SERIES_SELECT = {
  name: true,
  slug: true,
  coverUrl: true,
  brand: { select: { name: true, slug: true, category: { select: { name: true, slug: true } } } },
  models: {
    orderBy: [{ seriesPosition: "asc" }, { id: "asc" }],
    select: {
      name: true,
      releaseYear: true,
      posterColor: true,
      products: {
        where: { status: "published" },
        orderBy: { id: "asc" },
        take: 1,
        select: {
          slug: true,
          specs: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
          variants: { orderBy: { id: "asc" }, select: { condition: true, price: true, stock: true, options: true } },
        },
      },
    },
  },
} satisfies Prisma.SeriesSelect;

type SeriesRow = Prisma.SeriesGetPayload<{ select: typeof SERIES_SELECT }>;

// Les modèles de la série qui ont un produit publié, prêts pour l'affiche.
function posterModels(series: SeriesRow) {
  return series.models.flatMap((model) => {
    const product = model.products[0];
    if (!product) {
      return [];
    }
    const colors = colorsOf(product.variants);
    const newFrom = lowestInStock(product.variants.filter((variant) => variant.condition === "new"));
    const dealFrom = lowestInStock(product.variants.filter((variant) => variant.condition === "refurbished"));
    return [
      {
        name: model.name,
        releaseYear: model.releaseYear,
        productSlug: product.slug,
        image: product.images[0]?.url ?? null,
        specs: posterSpecs(product.specs as Record<string, string>),
        colors,
        newFrom,
        dealFrom,
        soldOut: newFrom === null && dealFrom === null,
        posterColor: resolvePosterColor(model.posterColor, colors),
        prices: product.variants,
      },
    ];
  });
}

// Les séries d'une marque, de la plus récente à la plus ancienne (l'année la plus haute
// de ses modèles), puis par nom. Une série sans produit publié n'apparaît pas.
export async function listSeries(category: string, brand: string) {
  const rows = await prisma.series.findMany({
    where: { brand: { slug: brand, category: { slug: category } } },
    select: SERIES_SELECT,
  });
  const series = rows.flatMap((row) => {
    const models = posterModels(row);
    if (models.length === 0) {
      return [];
    }
    const fromPrice = lowestInStock(models.flatMap((model) => model.prices));
    const withImage = models.find((model) => model.image);
    return [
      {
        years: models.map((model) => model.releaseYear),
        summary: {
          name: row.name,
          slug: row.slug,
          coverUrl: row.coverUrl,
          models: models.map((model) => model.name),
          fromPrice,
          soldOut: fromPrice === null,
          fallback: { image: withImage?.image ?? null, color: models[0].posterColor },
        },
      },
    ];
  });
  return series
    .sort((a, b) => compareSeries({ name: a.summary.name, years: a.years }, { name: b.summary.name, years: b.years }))
    .map(({ summary }) => summary);
}

// L'affiche d'une série. Une série inconnue, ou sans produit publié, n'a pas d'affiche.
export async function getSeries(category: string, brand: string, serie: string) {
  const row = await prisma.series.findFirst({
    where: { slug: serie, brand: { slug: brand, category: { slug: category } } },
    select: SERIES_SELECT,
  });
  const models = row ? posterModels(row) : [];
  if (!row || models.length === 0) {
    throw new AppError(404, "Série introuvable");
  }
  return {
    name: row.name,
    slug: row.slug,
    category: row.brand.category,
    brand: { name: row.brand.name, slug: row.brand.slug },
    models: models.map(({ releaseYear: _year, prices: _prices, ...model }) => model),
  };
}
