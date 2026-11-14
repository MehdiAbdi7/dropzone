import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { requireOpenCashDay } from "../cash/cash.service.js";
import { refreshMinPrice } from "../products/product.service.js";
import { issueDailyNumber } from "./dailyNumber.js";
import { applyPrices, PriceError } from "./negotiation.js";
import { priceCart, takeStock, variantCosts } from "./order.service.js";
import type { StoreSaleInput } from "./order.schema.js";

// Sous la limite d'un entier de 32 bits de la base, avec de la marge pour les sommes.
const MAX_TOTAL = 2_000_000_000;

// Une vente au magasin (16/11, lot 3) : le vendeur saisit le ticket, le client paie tout de suite.
// Créée et encaissée dans la MÊME transaction : la commande est « récupérée » et le journal reçoit
// un mouvement `sale` du total, à la date du jour. Sans journée de caisse ouverte, rien n'est fait.
// Le calcul du ticket est celui du site (`priceCart` : cadeaux d'une affaire, stock, limitations).
export async function createStoreSale(input: StoreSaleInput, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    await requireOpenCashDay(tx, now);

    const cart = await priceCart(tx, input.lines.map(({ sku, quantity }) => ({ sku, quantity })), "pickup");
    if (!cart.canOrder) {
      throw new AppError(409, "Le ticket contient un article indisponible ou une quantité trop grande", {
        unavailable: cart.unavailable,
        problems: cart.lines.filter((line) => line.problem).map((line) => ({ sku: line.sku, problem: line.problem })),
      });
    }
    if (cart.limitations.length > 0 && !input.acceptLimitations) {
      throw new AppError(400, "Le client doit accepter les limitations des appareils reconditionnés du ticket");
    }

    // Les prix accordés : un prix absent garde le prix catalogue. Les lignes du panier n'ont pas
    // encore d'id : leur position en tient lieu pour `applyPrices`.
    const requested = new Map<string, number>();
    for (const line of input.lines) {
      if (line.unitPrice === undefined) continue;
      if (requested.has(line.sku) && requested.get(line.sku) !== line.unitPrice) {
        throw new AppError(400, "Un article ne peut avoir qu'un seul prix sur le ticket");
      }
      requested.set(line.sku, line.unitPrice);
    }
    let priced;
    try {
      priced = applyPrices(
        cart.lines.map((line, index) => ({
          id: index,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          listPrice: null,
          isGift: line.isGift,
        })),
        cart.lines.flatMap((line, index) =>
          !line.isGift && requested.has(line.sku) ? [{ id: index, unitPrice: requested.get(line.sku) as number }] : [],
        ),
      );
    } catch (error) {
      if (error instanceof PriceError) throw new AppError(400, error.message);
      throw error;
    }
    if (priced.subtotal > MAX_TOTAL) {
      throw new AppError(400, "Le total du ticket est trop élevé");
    }

    await takeStock(tx, cart.lines, "le ticket");
    const { dailyNumber, businessDate } = await issueDailyNumber(tx, now);
    const costs = await variantCosts(tx, cart.lines.map((line) => line.sku));

    const order = await tx.order.create({
      data: {
        dailyNumber,
        businessDate,
        type: "in_store",
        status: "picked_up",
        fullName: input.fullName,
        phone: input.phone,
        note: input.note,
        subtotal: priced.subtotal,
        shippingFee: 0,
        total: priced.subtotal,
        limitationsAccepted: cart.limitations.length > 0,
        items: {
          create: cart.lines.map((line, index) => {
            const priceLine = priced.lines[index];
            // Le prix catalogue de chaque ligne payante ; qui a accordé le prix quand il diffère.
            const listPrice = line.isGift ? null : (priceLine.listPrice ?? priceLine.unitPrice);
            return {
              productId: line.productId,
              sku: line.sku,
              name: line.name,
              options: line.options ?? {},
              condition: line.condition,
              conditionReport: line.conditionReport,
              warrantyMonths: line.warrantyMonths,
              unitPrice: priceLine.unitPrice,
              listPrice,
              grantedById: listPrice !== null && listPrice !== priceLine.unitPrice ? userId : null,
              quantity: line.quantity,
              isGift: line.isGift,
              unitCost: costs.get(line.sku) ?? null,
            };
          }),
        },
      },
      select: { id: true, number: true, dailyNumber: true, total: true, status: true },
    });

    // Un mouvement `sale` même à 0 DA : c'est lui qui dit « payée » (voir editOrder).
    await tx.moneyMovement.create({
      data: {
        businessDate: new Date(`${algiersDate(now)}T00:00:00Z`),
        amount: order.total,
        method: input.method,
        kind: "sale",
        orderId: order.id,
        userId,
      },
    });
    await refreshMinPrice(tx, cart.lines.map((line) => line.productId));
    return order;
  });
}
