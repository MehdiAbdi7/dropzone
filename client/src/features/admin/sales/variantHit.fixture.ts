import type { VariantHit } from "./ticket";

// Une variante trouvée par la recherche du comptoir, pour les tests : un neuf scellé, tous les champs de la
// fiche à leur valeur « vide ». Chaque test change seulement ce qui l'intéresse.
export function makeHit(over: Partial<VariantHit> = {}): VariantHit {
  return {
    sku: "IP-NEW-256",
    productName: "iPhone 15 Pro Max",
    options: { Stockage: "256 Go" },
    condition: "new",
    price: 245_000,
    stock: 3,
    conditionReport: null,
    image: null,
    grade: null,
    batteryHealth: null,
    replacedParts: [],
    compatibleParts: [],
    defects: [],
    limitations: [],
    withBox: null,
    details: null,
    warrantyMonths: null,
    origin: null,
    reference: null,
    purchasePrice: null,
    gifts: [],
    ...over,
  };
}
