// Le remplissage de l'étape Couleur (05/11) : chaque exemplaire d'appareil reçoit une couleur
// de son modèle, sinon il ne serait rangé sous aucune tuile et disparaîtrait de la Boutique.
// Utilisé par `npm run colors:variants`, le seed et l'import. Rejouable : un deuxième
// passage ne change rien, et une couleur déjà posée (ou corrigée par le gérant) reste.
//
// Décision de Mehdi : un exemplaire sans couleur reçoit une des couleurs officielles de son
// modèle (choix de Claude : la première). C'est une couleur de démo, pas la vraie couleur de
// l'appareil : le gérant la corrige dans le back-office.
import type { Tx } from "../../config/db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { addMissingModelColors, sameColor } from "../../modules/models/modelColors.js";
import { applyOfficialColors } from "./applyOfficialColors.js";

const DEVICE_KINDS = ["phone", "tablet", "laptop", "watch"] as const;

// Les couleurs en base au nom non officiel, renommées quand l'équivalent est évident (accord
// de Mehdi du 05/11, comme « Orange » devenu « Orange cosmique »). Galaxy A55 : produit
// d'exemple du seed, sans noir officiel, bleu ambigu (choix de Claude).
const RENAMES: Record<string, Record<string, string>> = {
  "Apple|iPhone 15 Pro": { Blanc: "Titane blanc" },
  "Apple|iPhone Air": { Noir: "Noir sidéral" },
  "Apple|MacBook Air 13 pouces Intel (2018)": { "Or rose": "Or" },
  "Apple|MacBook Pro 14 pouces M3 Pro": { Noir: "Noir sidéral" },
  "Samsung|Galaxy A55": { Noir: "Navy", Bleu: "Iceblue" },
};

export type FillReport = {
  filled: number;
  renamed: number;
  appended: { model: string; color: string }[];
  withoutColors: string[];
};

export async function fillVariantColors(db: Tx): Promise<FillReport> {
  await applyOfficialColors(db);
  const report: FillReport = { filled: 0, renamed: 0, appended: [], withoutColors: [] };

  const models = await db.deviceModel.findMany({
    where: { kind: { in: [...DEVICE_KINDS] } },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    select: {
      id: true,
      brand: true,
      name: true,
      colors: true,
      products: {
        select: { variants: { select: { id: true, options: true } } },
      },
    },
  });

  for (const model of models) {
    const key = `${model.brand}|${model.name}`;
    const variants = model.products.flatMap((product) => product.variants);
    if (model.colors.length === 0) {
      report.withoutColors.push(key);
      continue;
    }
    const first = model.colors[0];
    const seen: string[] = [];
    for (const variant of variants) {
      const options = variant.options as Record<string, string>;
      const current = options.Couleur?.trim();
      const renamed = current ? RENAMES[key]?.[current] : undefined;
      const wanted = !current ? first : (renamed ?? current);
      // L'orthographe du modèle : la boutique compare les couleurs à l'identique.
      const next = model.colors.find((color) => sameColor(color, wanted)) ?? wanted;
      if (next !== options.Couleur) {
        await db.productVariant.update({
          where: { id: variant.id },
          data: { options: { ...options, Couleur: next } as Prisma.InputJsonObject },
        });
        if (current) report.renamed += 1;
        else report.filled += 1;
      }
      if (!model.colors.some((color) => sameColor(color, next)) && !seen.some((color) => sameColor(color, next))) {
        seen.push(next);
      }
    }
    if (seen.length > 0) {
      await addMissingModelColors(db, model.id, seen);
      report.appended.push(...seen.map((color) => ({ model: key, color })));
    }
  }
  return report;
}
