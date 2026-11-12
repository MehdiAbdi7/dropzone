import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";

// L'affiche d'une marque d'accessoires, avec ses produits publiés : le parcours de la Boutique
// (Accessoires › Chargeurs › Anker) arrive ici. « autres » : les produits du type sans marque.
// Chaque variante neuve est une colonne de l'affiche, dans l'ordre où le gérant les a créées.
export async function getAccessoryPoster(categorySlug: string, typeSlug: string, makerSlug: string) {
  const type = await prisma.brand.findFirst({
    where: { slug: typeSlug, category: { slug: categorySlug, kind: "accessory" } },
    select: { id: true, name: true, slug: true, logoUrl: true, category: { select: { name: true, slug: true } } },
  });
  if (!type) {
    throw new AppError(404, "Type d'accessoires introuvable");
  }
  const maker =
    makerSlug === "autres"
      ? { id: null, name: "Autres", slug: "autres", logoUrl: null }
      : await prisma.accessoryMaker.findUnique({
          where: { typeId_slug: { typeId: type.id, slug: makerSlug } },
          select: { id: true, name: true, slug: true, logoUrl: true },
        });
  if (!maker) {
    throw new AppError(404, "Marque introuvable");
  }

  const products = await prisma.product.findMany({
    where: { status: "published", brandId: type.id, makerId: maker.id },
    orderBy: { id: "asc" },
    select: {
      name: true,
      slug: true,
      description: true,
      specs: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      variants: {
        where: { condition: "new" },
        orderBy: { id: "asc" },
        select: { sku: true, options: true, price: true, stock: true },
      },
    },
  });
  // Une marque sans produit publié n'a rien à montrer : comme une adresse inconnue.
  if (products.length === 0) {
    throw new AppError(404, "Aucun produit pour cette marque");
  }

  const { category, ...typeInfo } = type;
  return {
    category,
    type: { name: typeInfo.name, slug: typeInfo.slug, logoUrl: typeInfo.logoUrl },
    maker: { name: maker.name, slug: maker.slug, logoUrl: maker.logoUrl },
    products: products.map(({ images, specs, ...product }) => ({
      ...product,
      image: images[0]?.url ?? null,
      specs: Object.entries(specs as Record<string, string>),
    })),
  };
}
