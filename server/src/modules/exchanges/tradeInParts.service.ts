import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { weightedAveragePrice } from "../parts/partMath.js";
import { insufficientStock, lockPartRow } from "../repairs/repairStock.js";

// Les pièces d'une reprise (atelier, étape 6, cahier §8). Chaque geste se fait dans UNE transaction, la reprise
// verrouillée d'abord (`FOR UPDATE`, comme `publishTradeIn`), puis ses pièces par numéro croissant : deux gestes en
// même temps passent l'un après l'autre, et deux fiches qui veulent les mêmes pièces ne s'attendent pas en rond.

type TradeInLock = { price: number; repair_cost: number; listed_at: Date | null };

async function lockTradeIn(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], id: number): Promise<TradeInLock> {
  const [row] = await tx.$queryRaw<TradeInLock[]>`SELECT price, repair_cost, listed_at FROM trade_ins WHERE id = ${id} FOR UPDATE`;
  if (!row) {
    throw new AppError(404, "Reprise introuvable");
  }
  return row;
}

// Démonter une reprise à 0 DA pour pièces : l'appareil en panne n'est plus réparable, on récupère ce qui sert. Les
// pièces entrent au stock à 0 DA l'unité (le prix d'achat devient la moyenne pondérée), la reprise disparaît des
// Reprises, sa commande d'échange reste. Refusé pour une reprise payée au client (son prix de reprise disparaîtrait
// du bénéfice sans trace : elle se répare puis se revend), déjà remise en état ou déjà en vente.
export async function dismantleTradeIn(id: number, parts: { partId: number; quantity: number }[], userId: number) {
  return prisma.$transaction(async (tx) => {
    const tradeIn = await lockTradeIn(tx, id);
    if (tradeIn.listed_at) {
      throw new AppError(409, "Cette reprise est déjà en vente : retirez l'affaire du catalogue d'abord");
    }
    if (tradeIn.price !== 0 || tradeIn.repair_cost !== 0) {
      throw new AppError(409, "Seule une reprise à 0 DA, sans remise en état commencée, se démonte pour pièces");
    }
    // Seul l'appareil en panne d'un remplacement sous garantie se démonte (cahier §14) : une reprise à 0 DA d'un échange
    // ordinaire, supprimée ensuite avec son échange, laisserait des pièces récupérées au stock sans appareil.
    const repair = await tx.repair.findFirst({ where: { replacementOrder: { tradeIn: { id } } }, select: { number: true } });
    if (!repair) {
      throw new AppError(409, "Seul l'appareil en panne d'un remplacement sous garantie se démonte pour pièces");
    }
    const note = `Démontage de la reprise ${id} (réparation R-${repair.number})`;

    let added = 0;
    for (const line of [...parts].sort((a, b) => a.partId - b.partId)) {
      const part = await lockPartRow(tx, line.partId);
      const stock = part.stock + line.quantity;
      await tx.part.update({
        where: { id: part.id },
        data: { stock, purchasePrice: weightedAveragePrice({ stock: part.stock, price: part.purchasePrice }, { quantity: line.quantity, unitCost: 0 }) },
      });
      await tx.partMovement.create({
        data: { partId: part.id, kind: "salvage", delta: line.quantity, unitCost: 0, stockAfter: stock, userId, tradeInId: id, note },
      });
      added += line.quantity;
    }
    await tx.tradeIn.delete({ where: { id } });
    return { id, added };
  });
}

// Utiliser une pièce du stock pour remettre une reprise en état : la pièce sort du stock et son prix d'achat s'ajoute aux
// frais de remise en état, donc au prix d'achat de l'affaire une fois en vente (`publishTradeIn`). Refusé, en nommant la
// pièce, si le stock ne suffit pas.
export async function useTradeInPart(id: number, input: { partId: number; quantity: number }, userId: number) {
  return prisma.$transaction(async (tx) => {
    const tradeIn = await lockTradeIn(tx, id);
    if (tradeIn.listed_at) {
      throw new AppError(409, "Cette reprise est déjà en vente : la remise en état est terminée");
    }
    const part = await lockPartRow(tx, input.partId);
    if (part.stock < input.quantity) {
      throw insufficientStock(part.name, part.stock, input.quantity);
    }
    const stock = part.stock - input.quantity;
    await tx.part.update({ where: { id: part.id }, data: { stock } });
    await tx.partMovement.create({
      data: { partId: part.id, kind: "trade_in_use", delta: -input.quantity, unitCost: part.purchasePrice, stockAfter: stock, userId, tradeInId: id, note: `Remise en état de la reprise ${id}` },
    });
    const repairCost = tradeIn.repair_cost + input.quantity * part.purchasePrice;
    await tx.tradeIn.update({ where: { id }, data: { repairCost } });
    return { id, repairCost };
  });
}
