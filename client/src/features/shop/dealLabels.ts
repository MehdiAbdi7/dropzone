import { warrantyLabel } from "@/config/warranty";
import type { Variant } from "@/types/api";

// Les mots de la radiographie d'une affaire. Une réponse de l'API mise en cache avant
// une mise à jour (jusqu'à une minute après la mise en ligne) n'a pas encore tous ces
// champs : on ne dit alors rien, plutôt que de planter ou d'annoncer quelque chose à tort.

export function partOrigin(variant: Pick<Variant, "compatibleParts">, part: string): "compatible" | "d'origine" | null {
  if (!variant.compatibleParts) {
    return null;
  }
  return variant.compatibleParts.includes(part) ? "compatible" : "d'origine";
}

// true : avec sa boîte ; false : sans ; null : l'annonce importée n'en parlait pas (le
// gérant la corrige dans le back-office) ; undefined : réponse en cache sans ce champ.
export function boxLabel(withBox: boolean | null | undefined): string | null {
  if (withBox === true) {
    return "Avec sa boîte d'origine";
  }
  if (withBox === false) {
    return "Sans boîte";
  }
  return withBox === null ? "Boîte non précisée" : null;
}

// Les lignes d'information d'un appareil, dans cet ordre : la garantie, l'origine (une
// information ; un choix seulement entre deux neufs identiques, voir stock.ts) et la référence
// du magasin, à donner au téléphone.
export function dealFacts(variant: Partial<Pick<Variant, "warrantyMonths" | "origin" | "reference">>): string[] {
  const warranty = warrantyLabel(variant.warrantyMonths);
  return [
    ...(warranty ? [warranty] : []),
    ...(variant.origin ? [`Origine : ${variant.origin}`] : []),
    ...(variant.reference ? [`Réf. ${variant.reference}`] : []),
  ];
}
