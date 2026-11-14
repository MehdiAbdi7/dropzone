import type { Tx } from "../../config/db.js";
import type { OrderStatus } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { applyPrices, PriceError } from "./negotiation.js";
import { lockOrder } from "./orderLock.js";
import { groupThousands } from "./orderMath.js";
import { STATUS_LABELS } from "./orderStatus.js";

// Sous la limite d'un entier de 32 bits de la base, avec de la marge pour les sommes.
const MAX_TOTAL = 2_000_000_000;

// Les états d'une commande dont l'argent n'est pas encore entré : on peut en négocier les prix.
const NEGOTIABLE: OrderStatus[] = ["pending", "confirmed", "reserved"];

// Négocier le prix de chaque ligne d'une commande PAS ENCORE PAYÉE (16/11, lot 3), avant de valider
// un retrait ou de confirmer une livraison. Le prix accordé remplace le prix de la ligne, le prix
// catalogue d'origine est gardé, et le nom de qui l'a accordé aussi. Les frais de livraison ne
// changent pas. Une trace `edited` dit ce qui a bougé. Une commande déjà payée se corrige par
// « Modifier » (correction d'argent), jamais ici.
// `allowed` : les états acceptés ; la validation d'un retrait y ajoute « récupérée », puisqu'elle
// appelle cette fonction une fois la commande marquée récupérée mais avant d'écrire l'argent.
export async function negotiateOrderPrices(
  tx: Tx,
  orderId: number,
  prices: { id: number; unitPrice: number }[],
  userId: number,
  allowed: OrderStatus[] = NEGOTIABLE,
): Promise<{ total: number; changed: boolean }> {
  await lockOrder(tx, orderId);
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { orderBy: { id: "asc" } } } });
  if (!allowed.includes(order.status)) {
    throw new AppError(409, `Les prix d'une commande ${STATUS_LABELS[order.status]} ne se négocient plus : utilisez « Modifier »`);
  }
  const payments = await tx.moneyMovement.count({ where: { orderId, kind: { not: "correction" } } });
  if (payments > 0) {
    throw new AppError(409, "Cette commande est déjà payée : utilisez « Modifier » pour corriger un prix");
  }

  let result;
  try {
    result = applyPrices(order.items, prices);
  } catch (error) {
    if (error instanceof PriceError) throw new AppError(400, error.message);
    throw error;
  }
  if (result.changes.length === 0) {
    return { total: order.total, changed: false };
  }
  const total = result.subtotal + order.shippingFee;
  if (total > MAX_TOTAL) {
    throw new AppError(400, "Le total de la commande est trop élevé");
  }

  for (const change of result.changes) {
    const line = result.lines.find((candidate) => candidate.id === change.id)!;
    await tx.orderItem.update({
      where: { id: change.id },
      data: { unitPrice: change.to, listPrice: line.listPrice, grantedById: userId },
    });
  }
  await tx.order.update({ where: { id: orderId }, data: { subtotal: result.subtotal, total } });
  await tx.orderEvent.create({
    data: {
      kind: "edited",
      orderId,
      orderNumber: order.number,
      userId,
      summary: `Prix négocié : ${result.changes.map((c) => `${c.name} : ${groupThousands(c.from)} → ${groupThousands(c.to)} DA`).join(" ; ")}`,
      amountDelta: total - order.total,
    },
  });
  return { total, changed: true };
}
