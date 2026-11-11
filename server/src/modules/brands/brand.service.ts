import { findLibraryLogo } from "../../config/brandLogos.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { requireSlug } from "../../utils/slugify.js";
import type { BrandPatch } from "./brand.schema.js";

// Le slug sert dans l'URL de la Boutique (/boutique/smartphones/samsung).
const brandSlug = (name: string) => requireSlug(name, "Le nom de la marque doit contenir des lettres latines ou des chiffres");

// Toutes les marques, même sans produit : le back-office en a besoin pour les gérer.
export async function listAdminBrands() {
  const brands = await prisma.brand.findMany({
    orderBy: [{ categoryId: "asc" }, { position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return brands.map(({ _count, ...brand }) => ({ ...brand, productCount: _count.products }));
}

// Une nouvelle marque se place en fin de rangée, avec le logo de la bibliothèque s'il existe.
// Un doublon dans la catégorie est refusé par la base (unique categoryId + slug → 409).
export async function createBrand(categoryId: number, input: { name: string; makerName?: string | null }) {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) {
    throw new AppError(404, "Catégorie introuvable");
  }
  const last = await prisma.brand.findFirst({
    where: { categoryId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return prisma.brand.create({
    data: {
      categoryId,
      name: input.name,
      slug: brandSlug(input.name),
      makerName: input.makerName ?? null,
      logoUrl: findLibraryLogo(input.name),
      position: last ? last.position + 1 : 0,
    },
  });
}

export async function updateBrand(id: number, input: BrandPatch) {
  return prisma.brand.update({
    where: { id },
    data: { ...input, slug: input.name ? brandSlug(input.name) : undefined },
  });
}

// Le logo à soi d'une marque absente de la bibliothèque, envoyé sur Cloudinary.
export async function setBrandLogo(id: number, file: Express.Multer.File | undefined) {
  if (!file) {
    throw new AppError(400, "Choisissez une image");
  }
  const brand = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
  if (!brand) {
    throw new AppError(404, "Marque introuvable");
  }
  const uploaded = await uploadToCloudinary(file.buffer, "dropzone/brands");
  return prisma.brand.update({ where: { id }, data: { logoUrl: uploaded.url } });
}

// La photo de la marque sur sa tuile de la Boutique (11/11) : déjà sans fond, comme celles du
// socle de l'accueil. L'ancienne part de Cloudinary.
export async function setBrandPhoto(id: number, file: Express.Multer.File | undefined) {
  if (!file) {
    throw new AppError(400, "Choisissez une image");
  }
  const brand = await prisma.brand.findUnique({ where: { id }, select: { photoPublicId: true } });
  if (!brand) {
    throw new AppError(404, "Marque introuvable");
  }
  const uploaded = await uploadToCloudinary(file.buffer, "dropzone/brands");
  await prisma.brand.update({ where: { id }, data: { photoUrl: uploaded.url, photoPublicId: uploaded.publicId } });
  await deleteFromCloudinary(brand.photoPublicId);
  return { url: uploaded.url };
}

// Sans photo à elle, la tuile reprend celle du produit le plus récent de la marque.
export async function removeBrandPhoto(id: number) {
  const brand = await prisma.brand.findUnique({ where: { id }, select: { photoPublicId: true } });
  if (!brand) {
    return;
  }
  await prisma.brand.update({ where: { id }, data: { photoUrl: null, photoPublicId: null } });
  await deleteFromCloudinary(brand.photoPublicId);
}

// ON DELETE RESTRICT : une marque utilisée par un produit est refusée par la base (P2003 → 409).
export async function deleteBrand(id: number) {
  const brand = await prisma.brand.findUnique({ where: { id }, select: { photoPublicId: true } });
  await prisma.brand.delete({ where: { id } });
  await deleteFromCloudinary(brand?.photoPublicId ?? null);
}
