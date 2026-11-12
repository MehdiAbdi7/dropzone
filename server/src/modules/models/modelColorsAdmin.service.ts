// Les pages Couleur du Catalogue (étape Couleur, 05/11) : Catalogue › modèle › couleur. Le
// gérant y voit le stock de chaque couleur, change sa photo, et ajoute un exemplaire avec le
// modèle et la couleur déjà remplis.
import { deleteFromCloudinary, uploadToCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";
import { OFFICIAL_SPECS } from "../../scripts/import/official-specs.js";
import { AppError } from "../../utils/AppError.js";
import { refreshMinPrice } from "../products/product.service.js";
import { uniqueSlug, withoutDealSheet } from "../products/productAdmin.service.js";
import type { UnitBody } from "./modelColors.schema.js";
import { addMissingModelColors, alignVariantColors, sameColor } from "./modelColors.js";

const colorOf = (options: unknown) => (options as Record<string, string> | null)?.Couleur ?? "";

async function findModel(id: number) {
  const model = await prisma.deviceModel.findUnique({
    where: { id },
    select: {
      id: true,
      brand: true,
      name: true,
      kind: true,
      colors: true,
      series: { select: { id: true, name: true, brandId: true, brand: { select: { categoryId: true } } } },
      colorPhotos: { select: { color: true, url: true, publicId: true } },
      products: { select: { id: true }, take: 1 },
    },
  });
  if (!model) {
    throw new AppError(404, "Modèle introuvable");
  }
  return model;
}

type Model = Awaited<ReturnType<typeof findModel>>;

const modelHeader = (model: Model) => ({
  id: model.id,
  brand: model.brand,
  name: model.name,
  kind: model.kind,
  series: model.series ? { id: model.series.id, name: model.series.name } : null,
});

const photoOf = (model: Model, color: string) =>
  model.colorPhotos.find((photo) => sameColor(photo.color, color)) ?? null;

// La couleur telle que le modèle l'écrit, ou 404 si le modèle ne l'a pas.
function knownColor(model: Model, color: string): string {
  const known = model.colors.find((name) => sameColor(name, color));
  if (!known) {
    throw new AppError(404, "Couleur inconnue pour ce modèle");
  }
  return known;
}

export async function modelColors(id: number) {
  const model = await findModel(id);
  const productId = model.products[0]?.id ?? null;
  const variants = productId
    ? await prisma.productVariant.findMany({
        where: { productId },
        select: { options: true, condition: true, stock: true },
      })
    : [];
  return {
    model: modelHeader(model),
    productId,
    colors: model.colors.map((name) => {
      const own = variants.filter((variant) => sameColor(colorOf(variant.options), name));
      return {
        name,
        photoUrl: photoOf(model, name)?.url ?? null,
        newStock: own.filter((v) => v.condition === "new").reduce((sum, v) => sum + v.stock, 0),
        refurbishedCount: own
          .filter((variant) => variant.condition === "refurbished")
          .reduce((sum, variant) => sum + variant.stock, 0),
      };
    }),
  };
}

export async function modelColor(id: number, color: string) {
  const model = await findModel(id);
  const name = knownColor(model, color);
  const productId = model.products[0]?.id ?? null;
  const variants = productId
    ? await prisma.productVariant.findMany({
        where: { productId },
        orderBy: [{ condition: "asc" }, { id: "asc" }],
      })
    : [];
  return {
    model: modelHeader(model),
    productId,
    color: { name, photoUrl: photoOf(model, name)?.url ?? null },
    variants: variants.filter((variant) => sameColor(colorOf(variant.options), name)),
  };
}

export async function setColorPhoto(id: number, color: string, file: Express.Multer.File | undefined) {
  if (!file) {
    throw new AppError(400, "Choisissez une image");
  }
  const model = await findModel(id);
  // Envoyée depuis une variante du formulaire produit (06/11), la couleur peut être nouvelle
  // pour le modèle : elle y entre, comme à l'enregistrement d'une variante.
  const known = model.colors.find((name) => sameColor(name, color));
  const name =
    known ??
    (await prisma.$transaction((tx) => addMissingModelColors(tx, id, [color]))).find((name) => sameColor(name, color)) ??
    color.trim();
  const previous = photoOf(model, name);
  const uploaded = await uploadToCloudinary(file.buffer, "dropzone/colors");
  await prisma.modelColorPhoto.upsert({
    where: { deviceModelId_color: { deviceModelId: id, color: previous?.color ?? name } },
    create: { deviceModelId: id, color: name, url: uploaded.url, publicId: uploaded.publicId },
    update: { url: uploaded.url, publicId: uploaded.publicId },
  });
  await deleteFromCloudinary(previous?.publicId ?? null);
  return { photoUrl: uploaded.url };
}

export async function removeColorPhoto(id: number, color: string) {
  const model = await findModel(id);
  const photo = photoOf(model, knownColor(model, color));
  if (!photo) {
    return;
  }
  await prisma.modelColorPhoto.delete({
    where: { deviceModelId_color: { deviceModelId: id, color: photo.color } },
  });
  await deleteFromCloudinary(photo.publicId);
}

// Un exemplaire ajouté dans une couleur : dans la fiche du modèle, créée et publiée s'il n'en
// a pas (décision de Mehdi du 05/11 : le gérant ajoute du stock pour le vendre).
export async function addUnit(id: number, input: UnitBody) {
  const model = await findModel(id);
  // Un appareil n'a pas de téléphones compatibles (c'est une règle des accessoires).
  const { color, id: _id, gifts: _gifts, ...unit } = input;
  const variant = withoutDealSheet({ ...unit, gifts: [] });
  const { gifts: _none, compatibleModelIds: _models, ...data } = variant;

  // Chaque appareil annonce sa garantie, comme dans le formulaire produit.
  if (data.warrantyMonths === null) {
    throw new AppError(400, "Indiquez la garantie de chaque appareil, en mois");
  }
  if (data.reference) {
    const taken = await prisma.productVariant.findFirst({ where: { reference: data.reference }, select: { id: true } });
    if (taken) {
      throw new AppError(409, `La référence ${data.reference} est déjà utilisée`);
    }
  }
  let productId = model.products[0]?.id ?? null;
  if (!productId && !model.series) {
    throw new AppError(400, "Rangez d'abord ce modèle dans une série");
  }

  return prisma.$transaction(async (tx) => {
    if (!productId) {
      const series = model.series!;
      const product = await tx.product.create({
        data: {
          name: model.name,
          slug: await uniqueSlug(model.name),
          description: `${model.name} chez DropZone : neuf scellé ou affaire testée, garantie et livraison dans 58 wilayas.`,
          categoryId: series.brand.categoryId,
          deviceModelId: model.id,
          brandId: series.brandId,
          specs: OFFICIAL_SPECS[`${model.brand}|${model.name}`] ?? {},
          status: "published",
        },
        select: { id: true },
      });
      productId = product.id;
    }
    const created = await tx.productVariant.create({
      data: { ...data, options: { ...data.options, Couleur: color }, productId },
      select: { id: true },
    });
    const colors = await addMissingModelColors(tx, model.id, [color]);
    await alignVariantColors(tx, productId, colors);
    await refreshMinPrice(tx, [productId]);
    return { productId, variantId: created.id };
  });
}
