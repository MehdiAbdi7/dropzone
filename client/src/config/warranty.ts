import type { Condition, ProductKind } from "@/types/api";

// La garantie que DropZone annonce sur Instagram : 12 mois sur un téléphone ou une
// tablette neufs scellés, 6 mois en affaire, 3 mois sur un PC, rien sur un accessoire.
// La même règle que l'API (server/src/modules/products/warranty.ts) : le formulaire
// du back-office la propose, le gérant peut la changer.
export function defaultWarrantyMonths(kind: ProductKind, condition: Condition): number | null {
  switch (kind) {
    case "laptop":
      return 3;
    case "phone":
    case "tablet":
    case "watch":
      return condition === "new" ? 12 : 6;
    default:
      return null;
  }
}

// « Garantie 6 mois ». Rien pour un accessoire sans garantie, ni pour une réponse de
// l'API mise en cache avant l'ajout de la garantie (le champ manque alors).
export function warrantyLabel(months: number | null | undefined): string | null {
  return typeof months === "number" ? `Garantie ${months} mois` : null;
}

// La garantie d'une carte de l'étape 4 (Neuf scellé ou Affaire) : celle des variantes en
// stock, « Garantie 12 mois » ou « Garantie 6 à 12 mois » quand elles diffèrent.
export function warrantyRange(variants: { warrantyMonths?: number | null; stock: number }[]): string | null {
  const months = variants.flatMap((variant) =>
    variant.stock > 0 && typeof variant.warrantyMonths === "number" ? [variant.warrantyMonths] : [],
  );
  if (months.length === 0) {
    return null;
  }
  const low = Math.min(...months);
  const high = Math.max(...months);
  return low === high ? `Garantie ${low} mois` : `Garantie ${low} à ${high} mois`;
}
