// Le remplacement des anciens verres et coques (refonte du 12/11, décision de Mehdi) : les verres
// par série d'iPhone et de Samsung (30 produits) deviennent 4 verres sans marque, un par qualité,
// une variante par taille d'écran ; les coques par série (37) deviennent 5, une par sorte et par
// famille. Les produits des types « Coques » et « Incassable Écran » qui ne sont pas dans la
// nouvelle liste sont supprimés, puis `fillNew` crée les nouveaux (rejouable : rien ne change au
// deuxième passage). Voir context/formation/ecommerce/boutique-sans-etape-marque-dropzone.md.
import type { Tx } from "../../config/db.js";
import { listScreenSizes } from "../../modules/models/model.service.js";
import { SCREEN_SIZES, buildAccessories } from "../fill-new/accessories.js";
import { type FillNewReport, fillNew } from "./fillNew.js";

const REPLACED_TYPES = ["Coques", "Incassable Écran"];

export type ReplaceReport = {
  // Les noms des anciens produits supprimés.
  deleted: string[];
  // Les marques des deux types restées sans produit, retirées (« Incassable Écran › iPhone »).
  makersRemoved: string[];
  // Les téléphones du catalogue dont la taille d'écran n'a pas de verre (« Galaxy S22 (5,9 pouces) »).
  phonesWithoutGlass: string[];
  fill: FillNewReport;
};

export async function replaceAccessories(db: Tx): Promise<ReplaceReport> {
  const keep = new Set(buildAccessories().map((item) => item.name));
  const old = await db.product.findMany({
    where: { brand: { name: { in: REPLACED_TYPES }, category: { kind: "accessory" } }, name: { notIn: [...keep] } },
    select: { id: true, name: true },
  });

  // Une affaire qui offre un de ces produits perdrait son cadeau sans prévenir (suppression en
  // cascade) : on s'arrête et on la nomme, rien n'est supprimé.
  const gifts = await db.variantGift.findMany({
    where: { giftVariant: { productId: { in: old.map((product) => product.id) } } },
    select: { variant: { select: { sku: true, product: { select: { name: true } } } }, giftVariant: { select: { product: { select: { name: true } } } } },
  });
  if (gifts.length > 0) {
    const lines = gifts.map((gift) => `${gift.variant.product.name} (${gift.variant.sku}) offre ${gift.giftVariant.product.name}`);
    throw new Error(`Des affaires offrent un produit à supprimer, rien n'est fait :\n${lines.join("\n")}`);
  }

  await db.product.deleteMany({ where: { id: { in: old.map((product) => product.id) } } });
  const fill = await fillNew(db, { accessoriesOnly: true });

  const empty = await db.accessoryMaker.findMany({
    where: { type: { name: { in: REPLACED_TYPES } }, products: { none: {} } },
    select: { id: true, name: true, type: { select: { name: true } } },
  });
  await db.accessoryMaker.deleteMany({ where: { id: { in: empty.map((maker) => maker.id) } } });

  // Les tailles des verres sont écrites dans le script (SCREEN_SIZES) ; un téléphone d'une autre
  // taille n'aurait aucun verre : le rapport le nomme, pour ajouter sa taille ou le régler à la main.
  const phonesWithoutGlass = (await listScreenSizes(db))
    .filter(({ size }) => !SCREEN_SIZES.includes(size))
    .flatMap(({ size, models }) => models.map((model) => `${model.name} (${size})`));

  return {
    deleted: old.map((product) => product.name),
    makersRemoved: empty.map((maker) => `${maker.type.name} › ${maker.name}`),
    phonesWithoutGlass,
    fill,
  };
}
