import { prisma } from "../../config/db.js";
import { computeShippingFee } from "../../config/shipping.js";
import { AppError } from "../../utils/AppError.js";
import { refreshMinPrice } from "../products/product.service.js";
import { getUnlimitedAdvance } from "../store/store.service.js";
import { issueDailyNumber } from "./dailyNumber.js";
import { pickupSlot, takeStock, variantCosts, withPickupDay } from "./order.service.js";
import type { PhoneOrderInput } from "./order.schema.js";
import { priceTicket, ticketItems } from "./ticket.service.js";

// Une commande prise par téléphone (19/11) : un client appelle, le vendeur saisit la livraison ou la réservation.
// Elle démarre comme une commande du site (« À confirmer » ou « Réservée »), sans compte client, et garde
// l'employé qui l'a saisie (`takenById`). Le calcul du ticket est celui du comptoir (`priceTicket`, partagé avec
// la vente et l'échange) : cadeaux d'une affaire, stock, limitations, prix accordés. Aucun argent n'entre : le
// client paie à la livraison, ou au retrait de sa réservation.
export async function createPhoneOrder(input: PhoneOrderInput, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    // Le lieu et le moment d'abord : une réservation refusée ne doit rien coûter, ni stock ni numéro du jour.
    let where;
    let shippingOf: (subtotal: number) => number;
    if (input.fulfillment === "delivery") {
      where = { type: "delivery" as const, status: "pending" as const, wilaya: input.wilaya, commune: input.commune, address: input.address };
      // Les frais saisis à la main priment ; sinon ceux du site.
      shippingOf = (subtotal) => input.shippingFee ?? computeShippingFee(subtotal);
    } else {
      // Illimitée : pas de date, mais l'avance et le numéro BaridiMob doivent être réglés (comme sur le site).
      const unlimited = input.reservationMode === "unlimited";
      const advance = unlimited ? await getUnlimitedAdvance(tx) : null;
      if (unlimited && advance === null) {
        throw new AppError(400, "La réservation illimitée n'est pas disponible pour le moment");
      }
      const pickup = unlimited
        ? { pickupDate: null, pickupTime: null, reservedUntil: null, reservationMode: "unlimited" as const, advanceAmount: advance }
        : { ...(await pickupSlot(tx, input, now)), reservationMode: "two_days" as const, advanceAmount: null };
      where = { type: "pickup" as const, status: "reserved" as const, ...pickup };
      shippingOf = () => 0;
    }

    const ticket = await priceTicket(tx, input.lines, input.acceptLimitations);
    const { cart, priced } = ticket;
    const shippingFee = shippingOf(priced.subtotal);

    await takeStock(tx, cart.lines, "la commande");
    // Le numéro du jour, dans la même transaction : une commande refusée plus haut n'en prend pas.
    const { dailyNumber, businessDate } = await issueDailyNumber(tx, now);
    const costs = await variantCosts(tx, cart.lines.map((line) => line.sku));

    const order = await tx.order.create({
      data: {
        dailyNumber,
        businessDate,
        ...where,
        takenById: userId,
        fullName: input.fullName,
        phone: input.phone,
        note: input.note,
        subtotal: priced.subtotal,
        shippingFee,
        total: priced.subtotal + shippingFee,
        limitationsAccepted: cart.limitations.length > 0,
        items: { create: ticketItems(ticket, costs, userId) },
      },
      select: {
        id: true,
        number: true,
        dailyNumber: true,
        total: true,
        type: true,
        status: true,
        pickupDate: true,
        pickupTime: true,
        reservationMode: true,
        advanceAmount: true,
      },
    });

    await refreshMinPrice(tx, cart.lines.map((line) => line.productId));
    // Un cadeau épuisé n'est PAS offert : le vendeur doit le dire au client.
    return { ...withPickupDay(order), notices: cart.notices };
  });
}
