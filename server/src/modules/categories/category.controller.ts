import type { Request, Response } from "express";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { slugify } from "../../utils/slugify.js";

export async function getCategories(_req: Request, res: Response) {
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
  res.json({
    data: categories.map(({ _count, brands, ...category }) => ({
      ...category,
      productCount: _count.products,
      hasUnbranded: withUnbranded.has(category.id),
      // Une marque sans produit publié n'aurait qu'une liste vide derrière sa puce.
      brands: brands
        .filter((brand) => brand._count.products > 0)
        .map(({ _count: brandCount, ...brand }) => ({ ...brand, productCount: brandCount.products })),
    })),
  });
}

export async function postCategory(req: Request, res: Response) {
  const category = await prisma.category.create({
    data: { name: req.body.name, slug: slugify(req.body.name), kind: req.body.kind },
  });
  res.status(201).json({ data: category });
}

export async function patchCategory(req: Request, res: Response) {
  const id = Number(req.params.id);
  // Changer la sorte d'une catégorie qui a des produits casserait leurs règles
  // (un reconditionné dans les accessoires) : refusé.
  if (req.body.kind) {
    const current = await prisma.category.findUnique({
      where: { id },
      select: { kind: true, _count: { select: { products: true } } },
    });
    if (current && current.kind !== req.body.kind && current._count.products > 0) {
      throw new AppError(409, "Impossible de changer la sorte d'une catégorie qui a des produits");
    }
  }
  const category = await prisma.category.update({
    where: { id },
    data: {
      ...req.body,
      slug: req.body.name ? slugify(req.body.name) : undefined,
    },
  });
  res.json({ data: category });
}

// ON DELETE RESTRICT : une catégorie utilisée est refusée par la base (P2003 → 409).
export async function deleteCategory(req: Request, res: Response) {
  await prisma.category.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
}
