import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { lowestInStock } from "../products/product.service.js";

// Le catalogue d'une catégorie d'accessoires en un appel (12/11) : la page Accessoires de la
// Boutique filtre par type (Chargeurs, Coques…) et par marque (Anker…) sur place.
// Seulement les produits publiés et rangés dans un type : un produit sans type ne se filtre pas.
// Types et marques dans l'ordre du back-office ; un type ou une marque sans produit publié n'y est pas.
export async function getAccessoryCatalog(categorySlug: string) {
  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, kind: "accessory" },
    select: { id: true, name: true, slug: true },
  });
  if (!category) {
    throw new AppError(404, "Catégorie d'accessoires introuvable");
  }

  const types = await prisma.brand.findMany({
    where: { categoryId: category.id },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: {
      name: true,
      slug: true,
      makers: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, name: true, slug: true, logoUrl: true } },
      products: {
        where: { status: "published" },
        orderBy: [{ name: "asc" }],
        select: {
          name: true,
          slug: true,
          makerId: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
          variants: { where: { condition: "new" }, orderBy: { id: "asc" }, select: { options: true, price: true, stock: true } },
        },
      },
    },
  });

  return {
    category: { name: category.name, slug: category.slug },
    types: types
      .filter((type) => type.products.length > 0)
      .map((type) => ({
        name: type.name,
        slug: type.slug,
        makers: type.makers
          .filter((maker) => type.products.some((product) => product.makerId === maker.id))
          .map(({ id: _id, ...maker }) => maker),
      })),
    // Dans l'ordre des types, puis des marques (sans marque en dernier), puis du nom.
    products: types.flatMap((type) => {
      const rank = (makerId: number | null) => {
        const index = type.makers.findIndex((maker) => maker.id === makerId);
        return index === -1 ? type.makers.length : index;
      };
      return [...type.products]
        .sort((a, b) => rank(a.makerId) - rank(b.makerId))
        .map((product) => {
          const maker = type.makers.find((one) => one.id === product.makerId);
          const prices = product.variants.map((variant) => variant.price);
          return {
            name: product.name,
            slug: product.slug,
            image: product.images[0]?.url ?? null,
            type: type.slug,
            maker: maker ? { name: maker.name, slug: maker.slug } : null,
            // Le plus bas en stock ; rien en stock : le plus bas tout court.
            minPrice: lowestInStock(product.variants) ?? (prices.length ? Math.min(...prices) : 0),
            hasRange: new Set(prices).size > 1,
            inStock: product.variants.some((variant) => variant.stock > 0),
            options: distinctOptions(product.variants.map((variant) => variant.options as Record<string, string> | null)),
          };
        });
    }),
  };
}

// Les valeurs de chaque option, sans doublon, dans l'ordre des variantes.
function distinctOptions(options: (Record<string, string> | null)[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const one of options) {
    for (const [key, value] of Object.entries(one ?? {})) {
      result[key] ??= [];
      if (!result[key].includes(value)) {
        result[key].push(value);
      }
    }
  }
  return result;
}
