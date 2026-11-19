import { prisma } from "../../config/db.js";
import { computeShippingFee } from "../../config/shipping.js";
import { refreshMinPrice } from "../products/product.service.js";
import { issueDailyNumber } from "./dailyNumber.js";
import { takeStock, variantCosts } from "./order.service.js";
import type { PhoneOrderInput } from "./order.schema.js";
import { priceTicket, ticketItems } from "./ticket.service.js";

// Une commande prise par téléphone (19/11) : un client appelle, le vendeur saisit la livraison. Elle démarre comme
// une commande du site (« À confirmer »), sans compte client, et garde l'employé qui l'a saisie (`takenById`).
// Le calcul du ticket est celui du comptoir (`priceTicket`, partagé avec la vente et l'échange) : cadeaux d'une
// affaire, stock, limitations, prix accordés. Aucun argent n'entre : le client paiera à la livraison.
export async function createPhoneOrder(input: PhoneOrderInput, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    const ticket = await priceTicket(tx, input.lines, input.acceptLimitations);
    const { cart, priced } = ticket;

    // Les frais saisis à la main priment ; sinon ceux du site.
    const shippingFee = input.shippingFee ?? computeShippingFee(priced.subtotal);

    await takeStock(tx, cart.lines, "la commande");
    // Le numéro du jour, dans la même transaction : une commande refusée plus haut n'en prend pas.
    const { dailyNumber, businessDate } = await issueDailyNumber(tx, now);
    const costs = await variantCosts(tx, cart.lines.map((line) => line.sku));

    const order = await tx.order.create({
      data: {
        dailyNumber,
        businessDate,
        type: "delivery",
        status: "pending",
        takenById: userId,
        fullName: input.fullName,
        phone: input.phone,
        wilaya: input.wilaya,
        commune: input.commune,
        address: input.address,
        note: input.note,
        subtotal: priced.subtotal,
        shippingFee,
        total: priced.subtotal + shippingFee,
        limitationsAccepted: cart.limitations.length > 0,
        items: { create: ticketItems(ticket, costs, userId) },
      },
      select: { id: true, number: true, dailyNumber: true, total: true, type: true, status: true },
    });

    await refreshMinPrice(tx, cart.lines.map((line) => line.productId));
    // Un cadeau épuisé n'est PAS offert : le vendeur doit le dire au client.
    return { ...order, notices: cart.notices };
  });
}
