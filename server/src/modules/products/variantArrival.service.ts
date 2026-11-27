import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { weightedAveragePrice } from "../parts/partMath.js";
import { refreshMinPrice } from "./product.service.js";

// Un arrivage de neuf (27/11, demande de Mehdi). Un iPhone neuf acheté 350 000 DA, puis 340 000 DA : on n'ajoute pas une
// deuxième variante identique, on ajoute du stock à la variante qui existe. Son prix d'achat devient la moyenne pondérée de
// ce qu'il y avait et de ce qui arrive (la formule des pièces de l'atelier). Le prix de vente ne bouge pas, et le bénéfice
// des ventes déjà faites non plus : chaque ligne vendue a figé son prix d'achat. Chaque arrivage laisse une ligne au journal.

// Le plafond du stock d'une variante (variantSchema) : un arrivage ne le dépasse pas.
const MAX_STOCK = 10_000;

export type ArrivalInput = {
  quantity: number;
  unitCost: number;
  // Le prix d'achat du stock qu'on a DÉJÀ, quand il n'est pas connu : sans lui, la moyenne n'aurait pas de sens.
  currentUnitCost?: number;
};

// Ajoute un arrivage à une variante neuve : le stock, le prix d'achat moyen et le journal changent ensemble, sous le verrou
// de la ligne de la variante (deux arrivages en même temps ne s'écrasent pas, une vente ne passe pas entre les deux).
export async function addVariantArrival(variantId: number, input: ArrivalInput, userId: number | undefined) {
  return prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ stock: number; purchase_price: number | null; condition: string; product_id: number }[]>`
      SELECT stock, purchase_price, condition::text AS condition, product_id
      FROM product_variants WHERE id = ${variantId} FOR UPDATE`;
    if (!row) {
      throw new AppError(404, "Variante introuvable");
    }
    // Une occasion est un exemplaire unique, avec sa propre fiche d'état : on n'y reçoit pas de stock.
    if (row.condition !== "new") {
      throw new AppError(400, "Un arrivage ne se fait que sur un neuf scellé");
    }
    const stock = row.stock + input.quantity;
    if (stock > MAX_STOCK) {
      throw new AppError(400, `Le stock ne peut pas dépasser ${MAX_STOCK} (il y en a déjà ${row.stock})`);
    }

    // Le prix d'achat du stock actuel. Inconnu avec du stock en rayon (un neuf créé sans prix d'achat) : le gérant doit le
    // dire, sinon on moyennerait avec un faux zéro. Sans stock, il n'y a rien à moyenner : le prix devient celui de l'arrivage.
    let current = row.purchase_price;
    if (row.stock > 0 && current === null) {
      if (input.currentUnitCost === undefined) {
        throw new AppError(400, "Indiquez le prix d'achat du stock actuel : il n'est pas renseigné, la moyenne ne peut pas se calculer");
      }
      current = input.currentUnitCost;
    }
    const average = weightedAveragePrice({ stock: row.stock, price: current ?? 0 }, input);

    const now = new Date();
    const variant = await tx.productVariant.update({
      where: { id: variantId },
      data: { stock, purchasePrice: average, stockedAt: now },
      select: { id: true, stock: true, purchasePrice: true },
    });
    // Un arrivage : le produit remonte sur l'accueil, comme tout stock ajouté (12/11), et son prix « à partir de » se recalcule
    // (une variante épuisée qui revient entre dans les prix affichés).
    await tx.product.update({ where: { id: row.product_id }, data: { stockedAt: now } });
    await refreshMinPrice(tx, [row.product_id]);
    await tx.variantArrival.create({
      data: { variantId, quantity: input.quantity, unitCost: input.unitCost, stockAfter: stock, costAfter: average, userId: userId ?? null },
    });
    return variant;
  });
}

// Les 50 derniers arrivages de la variante, du plus récent au plus ancien.
export async function listVariantArrivals(variantId: number) {
  const exists = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
  if (!exists) {
    throw new AppError(404, "Variante introuvable");
  }
  return prisma.variantArrival.findMany({
    where: { variantId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: { id: true, createdAt: true, quantity: true, unitCost: true, stockAfter: true, costAfter: true },
  });
}
