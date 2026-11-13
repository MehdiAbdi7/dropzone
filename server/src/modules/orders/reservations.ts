import { prisma, type Tx } from "../../config/db.js";
import { refreshMinPrice } from "../products/product.service.js";

// Remet en stock les articles d'une commande qui n'aboutit pas (annulée, retrait expiré).
export async function restockItems(tx: Tx, items: { sku: string; quantity: number; productId: number | null }[]) {
  for (const item of items) {
    await tx.productVariant.updateMany({
      where: { sku: item.sku },
      data: { stock: { increment: item.quantity } },
    });
  }
  await refreshMinPrice(tx, items.map((item) => item.productId));
}

// Les retraits non récupérés (14/11) : après minuit le jour choisi (`reservedUntil`), la commande
// passe « expirée » et ses articles reviennent en stock. Rien ne tourne à minuit (l'API dort sur
// Render) : cette fonction est appelée à la lecture (releaseReservationsMiddleware), avant de
// répondre. Renvoie le nombre de commandes expirées par CET appel.
export async function releaseExpiredReservations(now: Date): Promise<number> {
  const due = await prisma.order.findMany({
    where: { status: "reserved", reservedUntil: { lte: now } },
    select: { id: true },
  });
  let released = 0;
  for (const { id } of due) {
    released += await prisma.$transaction(async (tx) => {
      // Mise à jour conditionnelle : un autre appel, ou une validation au comptoir, a pu passer
      // avant. Seul celui qui fait passer la commande de « réservée » à « expirée » rend le stock.
      const { count } = await tx.order.updateMany({
        where: { id, status: "reserved", reservedUntil: { lte: now } },
        data: { status: "expired" },
      });
      if (count !== 1) return 0;
      await restockItems(tx, await tx.orderItem.findMany({ where: { orderId: id } }));
      return 1;
    });
  }
  return released;
}
