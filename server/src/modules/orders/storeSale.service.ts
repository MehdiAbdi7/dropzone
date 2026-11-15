import { prisma } from "../../config/db.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { requireOpenCashDay } from "../cash/cash.service.js";
import { refreshMinPrice } from "../products/product.service.js";
import { issueDailyNumber } from "./dailyNumber.js";
import { takeStock, variantCosts } from "./order.service.js";
import type { StoreSaleInput } from "./order.schema.js";
import { priceTicket, ticketItems } from "./ticket.service.js";

// Une vente au magasin (16/11, lot 3) : le vendeur saisit le ticket, le client paie tout de suite.
// Créée et encaissée dans la MÊME transaction : la commande est « récupérée » et le journal reçoit
// un mouvement `sale` du total, à la date du jour. Sans journée de caisse ouverte, rien n'est fait.
// Le calcul du ticket est celui du site (`priceTicket`, partagé avec l'échange).
export async function createStoreSale(input: StoreSaleInput, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    await requireOpenCashDay(tx, now);

    const ticket = await priceTicket(tx, input.lines, input.acceptLimitations);
    const { cart, priced } = ticket;

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
        items: { create: ticketItems(ticket, costs, userId) },
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
        orderType: "in_store",
        orderId: order.id,
        userId,
      },
    });
    await refreshMinPrice(tx, cart.lines.map((line) => line.productId));
    // Les mises en garde du calcul du ticket : un cadeau épuisé n'est PAS offert, et le vendeur doit
    // le savoir (la page les affiche à l'encaissement).
    return { ...order, notices: cart.notices };
  });
}
