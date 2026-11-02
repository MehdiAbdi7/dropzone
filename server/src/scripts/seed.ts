// Remplit la base avec le catalogue de démo.
//   npm run seed              → simulation : affiche ce qui serait créé
//   npm run seed -- --apply   → vide le catalogue puis le recrée
// Refuse de tourner en production, sauf avec --force.
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import type { ChoiceGroup } from "../generated/prisma/client.js";
import { modelSlug } from "../modules/models/modelSlug.js";
import { computeMinPrice } from "../modules/products/product.service.js";
import { slugify } from "../utils/slugify.js";
import { CHOICES, DEVICE_MODELS } from "./device-models.js";
import { CATEGORIES, PRODUCTS } from "./seed-data.js";

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");

if (env.NODE_ENV === "production" && !force) {
  console.error("Production détectée : relance avec --force si c'est vraiment voulu.");
  process.exit(1);
}

const choiceCount = Object.values(CHOICES).reduce((sum, list) => sum + list.length, 0);
const variantCount = PRODUCTS.reduce((sum, product) => sum + product.variants.length, 0);

if (!apply) {
  console.log(
    `Simulation : ${CATEGORIES.length} catégories, ${DEVICE_MODELS.length} modèles, ` +
      `${choiceCount} valeurs de listes, ${PRODUCTS.length} produits, ${variantCount} variantes. ` +
      "Relance avec --apply pour écrire.",
  );
  await prisma.$disconnect();
  process.exit(0);
}

// Vider le catalogue, les enfants d'abord. Les commandes restent : leurs lignes
// perdent seulement le lien vers le produit (ON DELETE SET NULL).
await prisma.variantGift.deleteMany();
await prisma.productImage.deleteMany();
await prisma.productVariant.deleteMany();
await prisma.product.deleteMany();
await prisma.deviceModel.deleteMany();
await prisma.choice.deleteMany();
await prisma.category.deleteMany();

const categories = new Map<string, number>();
for (const category of CATEGORIES) {
  const slug = slugify(category.name);
  const created = await prisma.category.create({ data: { ...category, slug } });
  categories.set(slug, created.id);
}

await prisma.deviceModel.createMany({
  data: DEVICE_MODELS.map((model) => ({ ...model, slug: modelSlug(model.brand, model.name) })),
});
const models = new Map(
  (await prisma.deviceModel.findMany({ select: { id: true, brand: true, name: true } })).map((model) => [
    `${model.brand}|${model.name}`,
    model.id,
  ]),
);

await prisma.choice.createMany({
  data: Object.entries(CHOICES).flatMap(([group, labels]) =>
    labels.map((label) => ({ group: group as ChoiceGroup, label })),
  ),
});

const modelId = (key: string) => {
  const id = models.get(key);
  if (!id) {
    throw new Error(`Modèle inconnu dans seed-data.ts : ${key}`);
  }
  return id;
};

// Premier passage : les produits et leurs variantes, en une écriture par produit
// (création imbriquée). Les dates s'étalent pour que le tri « nouveautés » ait un sens.
let minutesAgo = PRODUCTS.length * 60;
for (const product of PRODUCTS) {
  minutesAgo -= 60;
  await prisma.product.create({
    data: {
      name: product.name,
      slug: slugify(product.name),
      description: product.description,
      categoryId: categories.get(product.category)!,
      deviceModelId: product.model ? modelId(product.model) : null,
      compatibleModels: { connect: (product.compatible ?? []).map((key) => ({ id: modelId(key) })) },
      specs: product.specs ?? {},
      status: product.status ?? "published",
      minPrice: computeMinPrice(product.variants),
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
      images: { create: [{ url: product.image, position: 0 }] },
      variants: {
        create: product.variants.map(({ gifts: _gifts, ...variant }) => variant),
      },
    },
  });
}

// Second passage : les affaires. Un cadeau est désigné par son SKU, qui n'existe
// qu'une fois tous les produits créés.
const variantIds = new Map(
  (await prisma.productVariant.findMany({ select: { id: true, sku: true } })).map((v) => [v.sku, v.id]),
);
const gifts = PRODUCTS.flatMap((product) =>
  product.variants.flatMap((variant) =>
    (variant.gifts ?? []).map((gift) => ({
      variantId: variantIds.get(variant.sku)!,
      giftVariantId: variantIds.get(gift.sku)!,
      quantity: gift.quantity ?? 1,
    })),
  ),
);
await prisma.variantGift.createMany({ data: gifts });

console.log(
  `Base remplie : ${CATEGORIES.length} catégories, ${DEVICE_MODELS.length} modèles, ${choiceCount} valeurs, ` +
    `${PRODUCTS.length} produits, ${variantCount} variantes, ${gifts.length} articles offerts.`,
);
await prisma.$disconnect();
