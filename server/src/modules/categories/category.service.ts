import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { slugify } from "../../utils/slugify.js";
import { categoryCompositions, removeCategoryStage } from "../stage/stage.service.js";
import type { CategoryBody, CategoryPatch } from "./category.schema.js";

// Pour chaque catégorie (ou marque), la première photo du produit publié le plus récent qui en a
// une : le secours d'une tuile sans photo à elle. Une seule requête, pas une par catégorie.
type LatestImage = { id: number; url: string };
const latestImageByCategory = () => prisma.$queryRaw<LatestImage[]>`
  SELECT DISTINCT ON (p.category_id) p.category_id AS id, i.url
  FROM products p JOIN product_images i ON i.product_id = p.id
  WHERE p.status = 'published'
  ORDER BY p.category_id, p.id DESC, i.position ASC, i.id ASC`;
const latestImageByBrand = () => prisma.$queryRaw<LatestImage[]>`
  SELECT DISTINCT ON (p.brand_id) p.brand_id AS id, i.url
  FROM products p JOIN product_images i ON i.product_id = p.id
  WHERE p.status = 'published' AND p.brand_id IS NOT NULL
  ORDER BY p.brand_id, p.id DESC, i.position ASC, i.id ASC`;

const urlById = (rows: LatestImage[]) => new Map(rows.map((row) => [row.id, row.url]));

export async function listCategories() {
  const published = { status: "published" } as const;
  const [categories, unbranded, categoryPrices, brandPrices, categoryImages, brandImages, compositions] = await Promise.all([
    prisma.category.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        kind: true,
        featured: true,
        _count: { select: { products: { where: published } } },
        brands: {
          orderBy: [{ position: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            photoUrl: true,
            _count: { select: { products: { where: published } } },
          },
        },
      },
    }),
    // Les catégories qui ont des produits publiés sans marque : la Boutique leur ajoute une carte « Autres ».
    prisma.product.groupBy({ by: ["categoryId"], where: { ...published, brandId: null } }),
    // Le prix de départ de chaque catégorie et de chaque marque : « dès 38 000 DA » sur les tuiles.
    prisma.product.groupBy({ by: ["categoryId"], where: published, _min: { minPrice: true } }),
    prisma.product.groupBy({ by: ["brandId"], where: { ...published, brandId: { not: null } }, _min: { minPrice: true } }),
    latestImageByCategory(),
    latestImageByBrand(),
    categoryCompositions(),
  ]);
  const withUnbranded = new Set(unbranded.map((group) => group.categoryId));
  const priceOfCategory = new Map(categoryPrices.map((group) => [group.categoryId, group._min.minPrice]));
  const priceOfBrand = new Map(brandPrices.map((group) => [group.brandId, group._min.minPrice]));
  const imageOfCategory = urlById(categoryImages);
  const imageOfBrand = urlById(brandImages);

  // La catégorie mise en avant : celle que le gérant a choisie si elle a des produits, sinon la
  // plus fournie (les égalités vont à la plus ancienne).
  const chosen = categories.find((category) => category.featured && category._count.products > 0);
  const biggest = [...categories].sort((a, b) => b._count.products - a._count.products || a.id - b.id)[0];
  const featuredId = (chosen ?? biggest)?.id;

  return categories.map(({ _count, brands, featured: _featured, ...category }) => ({
    ...category,
    featured: category.id === featuredId,
    productCount: _count.products,
    minPrice: priceOfCategory.get(category.id) ?? null,
    hasUnbranded: withUnbranded.has(category.id),
    // La composition de photos réglée dans Personnalisation, et la photo de secours.
    photos: compositions.get(category.id) ?? [],
    fallbackImage: imageOfCategory.get(category.id) ?? null,
    // Une marque sans produit publié n'aurait qu'une liste vide derrière sa puce.
    brands: brands
      .filter((brand) => brand._count.products > 0)
      .map(({ id, _count: brandCount, photoUrl, ...brand }) => ({
        ...brand,
        productCount: brandCount.products,
        minPrice: priceOfBrand.get(id) ?? null,
        // La photo de la marque, sinon celle de son produit le plus récent.
        photoUrl: photoUrl ?? imageOfBrand.get(id) ?? null,
      })),
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
  const update = prisma.category.update({
    where: { id },
    data: {
      ...body,
      slug: body.name ? slugify(body.name) : undefined,
    },
  });
  if (!body.featured) {
    return update;
  }
  // Une seule catégorie mise en avant : l'index unique partiel refuse une deuxième, donc les
  // autres sont retirées d'abord, dans la même transaction.
  const [, category] = await prisma.$transaction([
    prisma.category.updateMany({ where: { featured: true, id: { not: id } }, data: { featured: false } }),
    update,
  ]);
  return category;
}

// ON DELETE RESTRICT : une catégorie utilisée est refusée par la base (P2003 → 409). Une fois
// supprimée, sa composition de photos part aussi.
export async function deleteCategory(id: number) {
  await prisma.category.delete({ where: { id } });
  await removeCategoryStage(id);
}
