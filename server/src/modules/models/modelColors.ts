// Les couleurs d'un modèle suivent ses exemplaires (étape Couleur, décision de Mehdi du
// 05/11) : une couleur enregistrée sur un appareil que le modèle n'a pas encore s'ajoute à
// la fin de ses couleurs. Un modèle sans couleurs gagne ainsi l'étape Couleur de la Boutique.
import type { Tx } from "../../config/db.js";
import { COLOR_HEX } from "../../scripts/device-models.js";

// « Noir » et « noir  » sont la même couleur : on compare sans la casse ni les espaces.
export const sameColor = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Les couleurs des variantes (option « Couleur »), sans doublon, dans leur ordre.
export function variantColors(variants: { options: Record<string, string> }[]): string[] {
  const colors: string[] = [];
  for (const variant of variants) {
    const color = variant.options.Couleur?.trim();
    if (color && !colors.some((known) => sameColor(known, color))) {
      colors.push(color);
    }
  }
  return colors;
}

// Ajoute au modèle les couleurs qu'il n'a pas (le nom déjà présent est gardé), et à la liste
// « Couleurs » du back-office celles qui y manquent, avec leur teinte connue. Renvoie les
// couleurs finales du modèle. À appeler dans la transaction qui enregistre les variantes.
export async function addMissingModelColors(tx: Tx, deviceModelId: number, colors: string[]): Promise<string[]> {
  const model = await tx.deviceModel.findUniqueOrThrow({ where: { id: deviceModelId }, select: { colors: true } });
  const fresh = colors
    .map((color) => color.trim())
    .filter((color, index, list) => color && list.findIndex((other) => sameColor(other, color)) === index)
    .filter((color) => !model.colors.some((known) => sameColor(known, color)));
  if (fresh.length === 0) {
    return model.colors;
  }

  // Une couleur déjà dans la liste garde l'écriture de la liste (« noir » devient « Noir »).
  const listed = await tx.choice.findMany({ where: { group: "color" }, select: { label: true } });
  const added = fresh.map((color) => listed.find((choice) => sameColor(choice.label, color))?.label ?? color);
  const missing = added.filter((color) => !listed.some((choice) => sameColor(choice.label, color)));
  if (missing.length > 0) {
    await tx.choice.createMany({
      data: missing.map((label) => ({ group: "color" as const, label, hex: COLOR_HEX[label] ?? null })),
      skipDuplicates: true,
    });
  }
  const updated = await tx.deviceModel.update({
    where: { id: deviceModelId },
    data: { colors: [...model.colors, ...added] },
    select: { colors: true },
  });
  return updated.colors;
}

// La boutique compare les couleurs à l'identique (relecture du 05/11) : chaque exemplaire
// du produit reprend l'orthographe du modèle (« noir » devient « Noir »). Renvoie le nombre
// d'exemplaires réécrits. À appeler après addMissingModelColors, dans la même transaction.
export async function alignVariantColors(tx: Tx, productId: number, colors: string[]): Promise<number> {
  const variants = await tx.productVariant.findMany({ where: { productId }, select: { id: true, options: true } });
  let aligned = 0;
  for (const variant of variants) {
    const options = variant.options as Record<string, string>;
    const color = options.Couleur;
    const spelled = color ? colors.find((known) => sameColor(known, color)) : undefined;
    if (spelled && spelled !== color) {
      await tx.productVariant.update({ where: { id: variant.id }, data: { options: { ...options, Couleur: spelled } } });
      aligned += 1;
    }
  }
  return aligned;
}
