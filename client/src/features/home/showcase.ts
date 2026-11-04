import type { Variant } from "@/types/api";

// Une fiche d'état qui dit vraiment la note, la batterie et la boîte : la seule qu'on
// montre en vitrine, à côté de « vous voyez la note, la batterie et tout ce qui a été
// changé ». Une annonce importée n'en dit souvent rien.
const isComplete = (unit: Variant) =>
  typeof unit.grade === "number" && typeof unit.batteryHealth === "number" && typeof unit.withBox === "boolean";

// L'affaire montrée sur l'accueil : d'abord une fiche complète, puis l'exemple le plus
// rassurant (un article offert, aucune limitation). Null s'il n'y a aucune affaire.
export function showcaseUnit(variants: Variant[]): Variant | null {
  const units = variants.filter((variant) => variant.condition === "refurbished");
  const free = (unit: Variant) => unit.limitations.length === 0;
  const gifted = (unit: Variant) => unit.gifts.length > 0;
  const preferences = [
    (unit: Variant) => isComplete(unit) && gifted(unit) && free(unit),
    (unit: Variant) => isComplete(unit) && free(unit),
    (unit: Variant) => isComplete(unit),
    (unit: Variant) => gifted(unit) && free(unit),
    free,
  ];
  for (const preference of preferences) {
    const found = units.find(preference);
    if (found) {
      return found;
    }
  }
  return units[0] ?? null;
}
