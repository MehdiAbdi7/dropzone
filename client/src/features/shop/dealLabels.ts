import type { Variant } from "@/types/api";

// Les mots de la radiographie d'une affaire. Une réponse de l'API mise en cache avant le
// 03/11 (jusqu'à une minute après la mise en ligne) n'a pas encore ces champs : on ne dit
// alors rien, plutôt que de planter ou d'annoncer « d'origine » ou « sans boîte » à tort.

export function partOrigin(variant: Pick<Variant, "compatibleParts">, part: string): "compatible" | "d'origine" | null {
  if (!variant.compatibleParts) {
    return null;
  }
  return variant.compatibleParts.includes(part) ? "compatible" : "d'origine";
}

export function boxLabel(withBox: boolean | null | undefined): string | null {
  if (withBox === true) {
    return "Avec sa boîte d'origine";
  }
  return withBox === false ? "Sans boîte" : null;
}
