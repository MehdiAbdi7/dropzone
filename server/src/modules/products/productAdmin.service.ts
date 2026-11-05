import { prisma } from "../../config/db.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../../config/cloudinary.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { escapeLike } from "../../utils/escapeLike.js";
import { paginate, paginationMeta } from "../../utils/pagination.js";
import { slugify } from "../../utils/slugify.js";
import type { AdminProductListQuery, ProductBody } from "./product.schema.js";
import { addMissingModelColors, alignVariantColors, variantColors } from "../models/modelColors.js";
import { DEVICE_KINDS, computeMinPrice, refreshMinPrice } from "./product.service.js";

const MAX_IMAGES = 6;

export async function listAdminProducts(query: AdminProductListQuery) {
  // La recherche du gérant : le nom du produit, ou le SKU ou la référence d'une variante
  // (« 51057 », la référence qu'un client donne au téléphone).
  const contains = query.q ? { contains: escapeLike(query.q), mode: "insensitive" as const } : null;
  const where: Prisma.ProductWhereInput = {
    status: query.status,
    category: query.category ? { slug: query.category } : undefined,
    OR: contains
      ? [{ name: contains }, { variants: { some: { OR: [{ sku: contains }, { reference: contains }] } } }]
      : undefined,
  };
  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(query.page, query.limit),
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        minPrice: true,
        category: { select: { name: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        variants: { select: { condition: true, stock: true } },
      },
    }),
  ]);
  const data = products.map(({ variants, images, ...product }) => ({
    ...product,
    image: images[0]?.url ?? null,
    variantCount: variants.length,
    newStock: variants.filter((v) => v.condition === "new").reduce((sum, v) => sum + v.stock, 0),
    refurbishedAvailable: variants.filter((v) => v.condition === "refurbished" && v.stock > 0).length,
  }));
  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

export async function getAdminProduct(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, kind: true } },
      deviceModel: { select: { id: true, brand: true, name: true } },
      brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
      compatibleModels: { select: { id: true, brand: true, name: true } },
      images: { orderBy: { position: "asc" } },
      variants: {
        orderBy: [{ condition: "asc" }, { id: "asc" }],
        include: { gifts: { select: { giftVariantId: true, quantity: true } } },
      },
    },
  });
  if (!product) {
    throw new AppError(404, "Produit introuvable");
  }
  return product;
}

// Un neuf scellé n'a pas de fiche d'état : on vide ce que le formulaire aurait pu envoyer.
// Aussi utilisé par l'ajout d'un exemplaire depuis la page d'une couleur.
export function withoutDealSheet<V extends ProductBody["variants"][number]>(variant: V): V {
  if (variant.condition === "refurbished") {
    return variant;
  }
  return {
    ...variant,
    grade: null,
    batteryHealth: null,
    replacedParts: [],
    compatibleParts: [],
    defects: [],
    limitations: [],
    withBox: null,
  };
}

// Les règles qui dépendent de la base (catégorie, modèle, cadeaux) : Zod a déjà
// vérifié la forme, le service vérifie le sens. Renvoie les données nettoyées.
async function checkRules(input: ProductBody, productId?: number) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    throw new AppError(400, "Catégorie inconnue");
  }
  const isDevice = DEVICE_KINDS.includes(category.kind);

  let deviceModelId: number | null = null;
  if (isDevice) {
    if (!input.deviceModelId) {
      throw new AppError(400, "Choisissez le modèle de l'appareil");
    }
    const model = await prisma.deviceModel.findUnique({ where: { id: input.deviceModelId } });
    if (!model || model.kind !== category.kind) {
      throw new AppError(400, "Ce modèle ne correspond pas à la catégorie");
    }
    deviceModelId = model.id;
    // Un modèle n'a qu'une fiche : la page d'une couleur du back-office ajoute toujours
    // dans celle-là (étape Couleur, 05/11). L'index unique de la base le garantit aussi.
    const taken = await prisma.product.findFirst({
      where: { deviceModelId: model.id, ...(productId ? { id: { not: productId } } : {}) },
      select: { id: true },
    });
    if (taken) {
      throw new AppError(409, "Ce modèle a déjà sa fiche produit");
    }
  }

  if (!isDevice && input.variants.some((variant) => variant.condition === "refurbished")) {
    throw new AppError(400, "Le reconditionné est réservé aux appareils");
  }

  // Chaque appareil annonce sa garantie (3 à 12 mois chez DropZone) ; un accessoire, pas forcément.
  if (isDevice && input.variants.some((variant) => variant.warrantyMonths === null)) {
    throw new AppError(400, "Indiquez la garantie de chaque appareil, en mois");
  }

  // Une référence du magasin désigne un seul appareil, dans tout le catalogue. L'index
  // unique de la base le garantit aussi ; ici, le gérant reçoit un message clair.
  const references = input.variants.flatMap((variant) => (variant.reference ? [variant.reference] : []));
  if (references.length > 0) {
    const taken = await prisma.productVariant.findFirst({
      where: { reference: { in: references }, ...(productId ? { productId: { not: productId } } : {}) },
      select: { reference: true },
    });
    if (taken) {
      // Un envoi peut porter plusieurs références : le message dit laquelle.
      throw new AppError(409, `La référence ${taken.reference} est déjà utilisée`);
    }
  }

  // Les marques sont rangées par catégorie : « iPhone » des Smartphones ne va pas sur une coque.
  if (input.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: input.brandId }, select: { categoryId: true } });
    if (!brand || brand.categoryId !== input.categoryId) {
      throw new AppError(400, "Cette marque n'appartient pas à la catégorie");
    }
  }

  // Les articles offerts : des variantes d'accessoires neuves, jamais la variante elle-même.
  const giftIds = [...new Set(input.variants.flatMap((v) => v.gifts.map((g) => g.giftVariantId)))];
  if (giftIds.length > 0) {
    const gifts = await prisma.productVariant.findMany({
      where: { id: { in: giftIds } },
      select: { id: true, productId: true, condition: true, product: { select: { category: { select: { kind: true } } } } },
    });
    const valid = gifts.filter(
      (gift) =>
        gift.condition === "new" &&
        gift.product.category.kind === "accessory" &&
        gift.productId !== productId,
    );
    if (valid.length !== giftIds.length) {
      throw new AppError(400, "Un article offert doit être un accessoire neuf d'un autre produit");
    }
  }

  const variants = input.variants.map(withoutDealSheet);

  return {
    deviceModelId,
    compatibleModelIds: category.kind === "accessory" ? input.compatibleModelIds : [],
    variants,
  };
}

export async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "produit";
  let slug = base;
  for (let n = 2; await prisma.product.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

function variantData(variant: Awaited<ReturnType<typeof checkRules>>["variants"][number]) {
  const { id: _id, gifts: _gifts, ...data } = variant;
  return data;
}

export async function createProduct(input: ProductBody) {
  const rules = await checkRules(input);
  const slug = await uniqueSlug(input.name);
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        categoryId: input.categoryId,
        deviceModelId: rules.deviceModelId,
        brandId: input.brandId,
        specs: input.specs,
        status: input.status,
        minPrice: computeMinPrice(rules.variants),
        compatibleModels: { connect: rules.compatibleModelIds.map((id) => ({ id })) },
        variants: {
          create: rules.variants.map((variant) => ({
            ...variantData(variant),
            gifts: { create: variant.gifts },
          })),
        },
      },
      select: { id: true, slug: true },
    });
    // Une couleur que le modèle n'a pas encore devient une de ses couleurs (étape Couleur).
    if (rules.deviceModelId) {
      const colors = await addMissingModelColors(tx, rules.deviceModelId, variantColors(rules.variants));
      await alignVariantColors(tx, product.id, colors);
    }
    return product;
  });
}

// Le slug ne change pas : une adresse partagée sur Instagram doit rester valable.
export async function updateProduct(id: number, input: ProductBody) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { variants: { select: { id: true } } },
  });
  if (!existing) {
    throw new AppError(404, "Produit introuvable");
  }
  const rules = await checkRules(input, id);
  const existingIds = new Set(existing.variants.map((variant) => variant.id));
  const keptIds = rules.variants.flatMap((variant) => (variant.id ? [variant.id] : []));
  if (keptIds.some((variantId) => !existingIds.has(variantId))) {
    throw new AppError(400, "Une variante n'appartient pas à ce produit");
  }

  return prisma.$transaction(async (tx) => {
    // Les variantes retirées du formulaire sont supprimées. Les commandes passées
    // n'en dépendent pas : elles ont recopié le SKU, le nom et le prix.
    await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: keptIds } } });
    for (const variant of rules.variants) {
      if (variant.id) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { ...variantData(variant), gifts: { deleteMany: {}, create: variant.gifts } },
        });
      } else {
        await tx.productVariant.create({
          data: { ...variantData(variant), productId: id, gifts: { create: variant.gifts } },
        });
      }
    }
    await tx.product.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        deviceModelId: rules.deviceModelId,
        brandId: input.brandId,
        specs: input.specs,
        status: input.status,
        compatibleModels: { set: rules.compatibleModelIds.map((modelId) => ({ id: modelId })) },
      },
    });
    await refreshMinPrice(tx, [id]);
    if (rules.deviceModelId) {
      const colors = await addMissingModelColors(tx, rules.deviceModelId, variantColors(rules.variants));
      await alignVariantColors(tx, id, colors);
    }
    return { id };
  });
}

export async function deleteProduct(id: number) {
  const product = await prisma.product.delete({
    where: { id },
    select: { images: { select: { publicId: true } } },
  });
  await Promise.allSettled(product.images.map((image) => deleteFromCloudinary(image.publicId)));
}

export async function addImage(productId: number, file: Express.Multer.File | undefined) {
  if (!file) {
    throw new AppError(400, "Aucune image reçue (champ « image »)");
  }
  const count = await prisma.productImage.count({ where: { productId } });
  if (count >= MAX_IMAGES) {
    throw new AppError(409, `${MAX_IMAGES} images au maximum par produit`);
  }
  const uploaded = await uploadToCloudinary(file.buffer);
  return prisma.productImage.create({
    data: { productId, url: uploaded.url, publicId: uploaded.publicId, position: count },
  });
}

export async function removeImage(productId: number, imageId: number) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) {
    throw new AppError(404, "Image introuvable");
  }
  await prisma.productImage.delete({ where: { id: image.id } });
  await deleteFromCloudinary(image.publicId);
}

// Les variantes qu'on peut offrir dans une affaire : les accessoires neufs.
export async function listGiftOptions() {
  const variants = await prisma.productVariant.findMany({
    where: { condition: "new", product: { category: { kind: "accessory" } } },
    orderBy: [{ product: { name: "asc" } }, { price: "asc" }],
    select: { id: true, sku: true, options: true, price: true, stock: true, product: { select: { name: true } } },
  });
  return variants.map(({ product, options, ...variant }) => {
    const details = Object.values(options as Record<string, string>).join(", ");
    return { ...variant, label: details ? `${product.name} (${details})` : product.name };
  });
}
