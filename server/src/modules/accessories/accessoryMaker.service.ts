import { findLibraryLogo } from "../../config/brandLogos.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { requireSlug } from "../../utils/slugify.js";
import type { AccessoryMakerPatch } from "./accessoryMaker.schema.js";

// Le slug sert dans l'adresse de la Boutique (/boutique/accessoires/chargeurs/anker).
const makerSlug = (name: string) => requireSlug(name, "Le nom de la marque doit contenir des lettres latines ou des chiffres");

// Toutes les marques, même sans produit : le back-office en a besoin pour les gérer, rangées par
// type puis dans l'ordre des tuiles de la Boutique.
export async function listAdminMakers() {
  const makers = await prisma.accessoryMaker.findMany({
    orderBy: [{ typeId: "asc" }, { position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return makers.map(({ _count, ...maker }) => ({ ...maker, productCount: _count.products }));
}

// Une marque se crée dans un type d'accessoires (la ligne de `brands` d'une catégorie
// d'accessoires), en fin de rangée, avec le logo de la bibliothèque s'il existe. Un doublon dans
// le type est refusé par la base (unique type + slug → 409).
export async function createMaker(typeId: number, input: { name: string }) {
  const type = await prisma.brand.findUnique({ where: { id: typeId }, select: { category: { select: { kind: true } } } });
  if (!type) {
    throw new AppError(404, "Type d'accessoires introuvable");
  }
  if (type.category.kind !== "accessory") {
    throw new AppError(400, "Les marques d'accessoires se rangent dans un type d'accessoires");
  }
  const last = await prisma.accessoryMaker.findFirst({
    where: { typeId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return prisma.accessoryMaker.create({
    data: {
      typeId,
      name: input.name,
      slug: makerSlug(input.name),
      logoUrl: findLibraryLogo(input.name),
      position: last ? last.position + 1 : 0,
    },
  });
}

export async function updateMaker(id: number, input: AccessoryMakerPatch) {
  return prisma.accessoryMaker.update({
    where: { id },
    data: { ...input, slug: input.name ? makerSlug(input.name) : undefined },
  });
}

// Le logo à soi d'une marque absente de la bibliothèque, envoyé sur Cloudinary.
export async function setMakerLogo(id: number, file: Express.Multer.File | undefined) {
  if (!file) {
    throw new AppError(400, "Choisissez une image");
  }
  const maker = await prisma.accessoryMaker.findUnique({ where: { id }, select: { id: true } });
  if (!maker) {
    throw new AppError(404, "Marque introuvable");
  }
  const uploaded = await uploadToCloudinary(file.buffer, "dropzone/brands");
  return prisma.accessoryMaker.update({ where: { id }, data: { logoUrl: uploaded.url } });
}

// ON DELETE RESTRICT : une marque utilisée par un produit est refusée par la base (P2003 → 409).
export async function deleteMaker(id: number) {
  await prisma.accessoryMaker.delete({ where: { id } });
}
