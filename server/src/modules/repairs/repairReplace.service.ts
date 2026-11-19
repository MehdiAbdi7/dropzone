import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { requireOpenCashDay } from "../cash/cash.service.js";
import { requireTradeInModel } from "../exchanges/exchange.service.js";
import { issueDailyNumber } from "../orders/dailyNumber.js";
import { takeStock, variantCosts } from "../orders/order.service.js";
import { priceTicket, ticketItems } from "../orders/ticket.service.js";
import { refreshMinPrice } from "../products/product.service.js";
import { getRepair } from "./repair.service.js";
import type { ReplaceInput } from "./repair.schema.js";
import { isSameModel, replacementDifference, storageOf } from "./replacementRules.js";
import { returnConsumedLines } from "./repairStatus.service.js";
import { lockRepair, setStatus } from "./repairStock.js";
import { warrantyOf } from "./warranty.service.js";

// Remplacer l'appareil d'une fiche sous garantie (atelier, étape 6, cahier §7). Tout dans UNE transaction, la fiche
// verrouillée d'abord : deux envois en même temps passent l'un après l'autre, et le second voit une fiche déjà rendue.
//  - l'appareil donné se vend comme à l'Échange (même ticket, même stock), dans une commande `exchange` liée à la fiche ;
//  - l'appareil en panne devient une reprise à 0 DA (le magasin a déjà payé l'appareil qu'il donne) ;
//  - la différence se calcule avec le prix PAYÉ à l'origine (`replacementDifference`), jamais avec le prix de reprise ;
//  - l'appareil donné garde le reste de l'ancienne garantie (`warrantyUntil`) ;
//  - la fiche passe « Rendu » : l'argent (la différence, même 0) est écrit une fois, lié à la fiche ET à la commande,
//    et le bénéfice se fige : `paidAmount` = la différence, `partsCost` = ce que l'appareil donné a coûté.
export async function replaceRepair(repairId: number, input: ReplaceInput, userId: number, now: Date = new Date()) {
  const outcome = await prisma.$transaction(async (tx) => {
    const repair = await lockRepair(tx, repairId);
    if (!repair.underWarranty) {
      throw new AppError(409, "Seule une réparation sous garantie peut être remplacée");
    }
    if (repair.status !== "received" && repair.status !== "in_repair") {
      throw new AppError(409, "L'appareil ne peut plus être remplacé : la réparation n'est plus en cours");
    }
    const fiche = await tx.repair.findUniqueOrThrow({
      where: { id: repairId },
      select: { fullName: true, phone: true, originItemId: true, replacementOrderId: true },
    });
    if (fiche.replacementOrderId !== null) {
      throw new AppError(409, "Cet appareil a déjà été remplacé");
    }
    if (fiche.originItemId === null) {
      throw new AppError(400, "La commande d'origine est introuvable : le prix payé est inconnu, le remplacement ne peut pas se calculer");
    }
    // Deux fiches ouvertes sur le même article se verrouillent chacune leur ligne : on verrouille aussi l'article d'origine,
    // sinon les deux verraient « pas encore remplacé » et passeraient ensemble.
    await tx.$queryRaw`SELECT id FROM order_items WHERE id = ${fiche.originItemId} FOR UPDATE`;
    // Un article déjà remplacé ne se remplace pas une seconde fois : c'est son remplacement qui porte la garantie.
    const alreadyReplaced = await tx.repair.count({ where: { originItemId: fiche.originItemId, replacementOrderId: { not: null } } });
    if (alreadyReplaced > 0) {
      throw new AppError(409, "L'appareil d'origine a déjà été remplacé : ouvrez la fiche sur son appareil de remplacement");
    }
    const origin = await tx.orderItem.findUniqueOrThrow({
      where: { id: fiche.originItemId },
      select: { id: true, name: true, productId: true, options: true, unitPrice: true, warrantyMonths: true, warrantyUntil: true, order: { select: { number: true, createdAt: true } } },
    });
    // La fin de garantie à garder : celle de l'article d'origine, explicite s'il était déjà un remplacement.
    const warrantyEnd = warrantyOf(origin, algiersDate(now)).warrantyEndsAt;

    const variant = await tx.productVariant.findUnique({ where: { sku: input.line.sku }, select: { options: true, product: { select: { id: true } } } });
    if (!variant) {
      throw new AppError(400, "Cet article n'existe pas");
    }
    const sameModel = isSameModel(
      { productId: origin.productId, storage: storageOf(origin.options) },
      { productId: variant.product.id, storage: storageOf(variant.options) },
    );

    await requireTradeInModel(tx, input.tradeIn.deviceModelId);
    // Même modèle : l'appareil est donné au prix payé, donc sans écart ; sinon le prix catalogue ou négocié.
    const ticket = await priceTicket(tx, [{ sku: input.line.sku, quantity: 1, unitPrice: sameModel ? origin.unitPrice : input.line.unitPrice }], input.acceptLimitations);
    const { cart, priced } = ticket;
    const difference = replacementDifference({ sameModel, paidPrice: origin.unitPrice, givenPrice: priced.subtotal });
    if (difference !== 0) {
      await requireOpenCashDay(tx, now);
    }

    // Les pièces déjà sorties pour cette fiche reviennent au stock : l'appareil n'est plus réparé.
    const lines = await tx.repairPart.findMany({ where: { repairId }, orderBy: { partId: "asc" } });
    await returnConsumedLines(tx, repair, lines, userId);

    await takeStock(tx, cart.lines, "le ticket");
    const { dailyNumber, businessDate } = await issueDailyNumber(tx, now);
    const costs = await variantCosts(tx, cart.lines.map((line) => line.sku));
    // Sans prix d'achat, le bénéfice de la fiche serait faux (un coût de 0) : on refuse plutôt que de le figer.
    const unknownCost = cart.lines.find((line) => costs.get(line.sku) == null);
    if (unknownCost) {
      throw new AppError(409, `Saisissez le prix d'achat de « ${unknownCost.name} » dans le Catalogue avant de le donner en remplacement`);
    }
    const costKnown = true;
    const givenCost = cart.lines.reduce((sum, line) => sum + line.quantity * (costs.get(line.sku) ?? 0), 0);

    const { deviceModelId, color, ...sheet } = input.tradeIn;
    const warrantyUntil = new Date(`${warrantyEnd}T00:00:00Z`);
    const items = ticketItems(ticket, costs, userId).map((item, index) =>
      cart.lines[index].isGift ? item : { ...item, warrantyMonths: origin.warrantyMonths, warrantyUntil },
    );
    const order = await tx.order.create({
      data: {
        dailyNumber,
        businessDate,
        type: "exchange",
        status: "picked_up",
        fullName: fiche.fullName,
        phone: fiche.phone,
        note: `Remplacement sous garantie, réparation R-${repair.number}`,
        subtotal: priced.subtotal,
        shippingFee: 0,
        total: priced.subtotal,
        limitationsAccepted: cart.limitations.length > 0,
        items: { create: items },
        tradeIn: { create: { deviceModelId, color, price: 0, sheet } },
      },
      select: { id: true, number: true, tradeIn: { select: { id: true } } },
    });

    const day = new Date(`${algiersDate(now)}T00:00:00Z`);
    // Un mouvement même à 0 DA, comme l'Échange : c'est lui qui dit « payé ». Il porte `repairId` : l'Historique le
    // range dans l'onglet Réparations.
    await tx.moneyMovement.create({
      data: { businessDate: day, amount: difference, method: input.method, kind: "exchange", orderType: "exchange", orderId: order.id, repairId, userId, note: `Remplacement R-${repair.number}` },
    });
    await tx.repair.update({
      where: { id: repairId },
      data: { returnedOn: day, paidAmount: difference, partsCost: givenCost, payMethod: difference !== 0 ? input.method : null, replacementOrderId: order.id },
    });
    await setStatus(tx, repairId, "returned", userId);
    await refreshMinPrice(tx, cart.lines.map((line) => line.productId));
    return { difference, costKnown, orderNumber: order.number, tradeInId: order.tradeIn!.id, notices: cart.notices };
  });
  return { repair: await getRepair(repairId), ...outcome };
}
