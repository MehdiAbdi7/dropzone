import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { Category, ProductCard } from "@/types/api";

// sitemap.xml : les pages fixes, les catégories et leurs marques, et chaque produit publié.
// Lu à chaque demande (les lectures de l'API sont en `no-store`) : un produit publié dans
// le back-office y entre tout de suite. Si l'API ne répond pas, seules les pages fixes restent.
const STATIC_PAGES = [
  "",
  "/boutique",
  "/produits",
  "/suivi",
  "/conditions-generales-de-vente",
  "/mentions-legales",
];

// 50 produits par page (le maximum de l'API) : 40 pages suffisent largement au catalogue.
const PAGE_SIZE = 50;
const MAX_PAGES = 40;

async function allProducts(): Promise<ProductCard[]> {
  const products: ProductCard[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await publicFetchPage<ProductCard>(`/products?limit=${PAGE_SIZE}&page=${page}`);
    if (!result) {
      break;
    }
    products.push(...result.data);
    if (page >= result.pagination.pages) {
      break;
    }
  }
  return products;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    publicFetch<Category[]>("/categories"),
    allProducts(),
  ]);

  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "daily",
    priority,
  });

  return [
    ...STATIC_PAGES.map((path) => entry(path, path === "" ? 1 : 0.5)),
    ...(categories ?? [])
      .filter((category) => category.productCount > 0)
      .flatMap((category) => [
        entry(`/boutique/${category.slug}`, 0.7),
        ...category.brands.map((brand) => entry(`/boutique/${category.slug}/${brand.slug}`, 0.6)),
      ]),
    ...products.map((product) => entry(`/produits/${product.slug}`, 0.8)),
  ];
}
