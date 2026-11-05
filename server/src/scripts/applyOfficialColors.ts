// Pose les couleurs officielles (official-colors.ts) sur les modèles de la base, et ajoute à
// la liste « Couleurs » celles qui y manquent, avec leur teinte de départ (COLOR_HEX).
// Utilisé par le seed, par l'import des annonces et par `npm run colors:official`.
//
// Le gérant a le dernier mot : un modèle qui a déjà des couleurs n'est pas touché, et une
// couleur déjà dans la liste garde sa teinte (skipDuplicates). Une lueur qui n'est pas une
// couleur officielle du modèle est oubliée : la lueur revient à la première couleur.
import type { Tx } from "../config/db.js";
import { COLOR_HEX } from "./device-models.js";
import { OFFICIAL_COLORS } from "./official-colors.js";

// `db` : le client normal ou celui d'une transaction (le type commun du projet).
export async function applyOfficialColors(db: Tx) {
  const models = await db.deviceModel.findMany({
    where: { colors: { isEmpty: true } },
    select: { id: true, brand: true, name: true, posterColor: true },
  });

  let updated = 0;
  const used = new Set<string>();
  for (const model of models) {
    const colors = OFFICIAL_COLORS[`${model.brand}|${model.name}`];
    if (!colors) {
      continue;
    }
    colors.forEach((color) => used.add(color));
    await db.deviceModel.update({
      where: { id: model.id },
      data: {
        colors,
        ...(model.posterColor && !colors.includes(model.posterColor) ? { posterColor: null } : {}),
      },
    });
    updated += 1;
  }

  const created = await db.choice.createMany({
    data: [...used].map((label) => ({ group: "color" as const, label, hex: COLOR_HEX[label] ?? null })),
    skipDuplicates: true,
  });
  return { models: updated, colorsAdded: created.count };
}
