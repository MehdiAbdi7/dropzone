// La remise à zéro des accessoires (06/11). Demande de Mehdi : « supprime ce qu'il y a dedans,
// je peux tout créer après moi-même ». Supprime les produits des catégories d'accessoires et
// leurs types (lignes de `brands`), garde les catégories. Par les clés étrangères : variantes
// et photos supprimées (CASCADE), cadeaux des affaires supprimés (CASCADE sur variant_gifts),
// lignes de commandes passées gardées sans produit (SET NULL).
// Utilisé par `npm run accessories:clear`. Rejouable : un deuxième passage ne change rien.
import type { Tx } from "../config/db.js";

export type ClearReport = {
  products: number;
  types: number;
  // Les photos envoyées sur Cloudinary, à y supprimer une fois la transaction écrite.
  images: string[];
};

export async function clearAccessories(db: Tx): Promise<ClearReport> {
  const where = { category: { kind: "accessory" as const } };
  const images = await db.productImage.findMany({
    where: { product: where, publicId: { not: null } },
    select: { publicId: true },
  });
  const products = await db.product.deleteMany({ where });
  const types = await db.brand.deleteMany({ where });
  return {
    products: products.count,
    types: types.count,
    images: images.flatMap((image) => (image.publicId ? [image.publicId] : [])),
  };
}
