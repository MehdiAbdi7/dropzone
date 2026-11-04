import type { Condition, ProductKind } from "../../generated/prisma/client.js";

// La garantie que DropZone annonce sur Instagram, proposée par défaut dans le
// back-office et par l'import quand une annonce n'en dit rien : 12 mois sur un
// téléphone ou une tablette neufs scellés, 6 mois en affaire, 3 mois sur un PC.
// Un accessoire (souvent offert avec un appareil) n'en a pas.
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
