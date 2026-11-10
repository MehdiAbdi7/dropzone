import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { slugify } from "../../utils/slugify.js";
import type { CategoryBody, CategoryPatch } from "./category.schema.js";

export async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      _count: { select: { products: { where: { status: "published" } } } },
      brands: {
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: {
          name: true,
          slug: true,
          logoUrl: true,
          _count: { select: { products: { where: { status: "published" } } } },
        },
      },
    },
  });
  // Les catégories qui ont des produits publiés sans marque : la Boutique leur ajoute une carte « Autres ».
  const unbranded = await prisma.product.groupBy({
    by: ["categoryId"],
    where: { status: "published", brandId: null },
  });
  const withUnbranded = new Set(unbranded.map((group) => group.categoryId));
  return categories.map(({ _count, brands, ...category }) => ({
    ...category,
    productCount: _count.products,
    hasUnbranded: withUnbranded.has(category.id),
    // Une marque sans produit publié n'aurait qu'une liste vide derrière sa puce.
    brands: brands
      .filter((brand) => brand._count.products > 0)
      .map(({ _count: brandCount, ...brand }) => ({ ...brand, productCount: brandCount.products })),
  }));
}

export async function createCategory(body: CategoryBody) {
  return prisma.category.create({
    data: { name: body.name, slug: slugify(body.name), kind: body.kind },
  });
}

export async function updateCategory(id: number, body: CategoryPatch) {
  // Changer la sorte d'une catégorie qui a des produits casserait leurs règles
  // (un reconditionné dans les accessoires) : refusé.
  if (body.kind) {
    const current = await prisma.category.findUnique({
      where: { id },
      select: { kind: true, _count: { select: { products: true } } },
    });
    if (current && current.kind !== body.kind && current._count.products > 0) {
      throw new AppError(409, "Impossible de changer la sorte d'une catégorie qui a des produits");
    }
  }
  return prisma.category.update({
    where: { id },
    data: {
      ...body,
      slug: body.name ? slugify(body.name) : undefined,
    },
  });
}

// ON DELETE RESTRICT : une catégorie utilisée est refusée par la base (P2003 → 409).
export async function deleteCategory(id: number) {
  await prisma.category.delete({ where: { id } });
}
