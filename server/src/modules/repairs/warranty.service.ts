import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/db.js";
import { algiersDate } from "../../utils/algiersTime.js";
import type { WarrantyQuery } from "./repair.schema.js";
import { isUnderWarranty, warrantyEndDate } from "./warranty.js";

// Retrouver l'appareil vendu par DropZone (18/11, étape 2). Un article ouvre une garantie quand il a été REMIS au
// client (vente au magasin, retrait récupéré, livraison livrée ou encaissée, échange) : jamais une commande
// attendue, annulée ou retournée. Un cadeau et un article sans garantie n'en ouvrent pas.
const HANDED_OVER = ["picked_up", "delivered", "collected"] as const;

export const warrantyItemWhere: Prisma.OrderItemWhereInput = {
  isGift: false,
  warrantyMonths: { not: null },
  order: { status: { in: [...HANDED_OVER] } },
};

const ITEM = {
  id: true,
  name: true,
  warrantyMonths: true,
  order: { select: { number: true, createdAt: true } },
} as const;

type ItemRow = { id: number; name: string; warrantyMonths: number | null; order: { number: number; createdAt: Date } };

export type WarrantyHit = {
  itemId: number;
  orderNumber: number;
  soldOn: string;
  name: string;
  warrantyMonths: number;
  warrantyEndsAt: string;
  underWarranty: boolean;
};

// La garantie d'un article vendu : le jour de la vente est celui d'Alger, pas celui d'UTC.
export function warrantyOf(item: ItemRow, today: string): WarrantyHit {
  const months = item.warrantyMonths ?? 0;
  const soldOn = algiersDate(item.order.createdAt);
  const warrantyEndsAt = warrantyEndDate(soldOn, months);
  return {
    itemId: item.id,
    orderNumber: item.order.number,
    soldOn,
    name: item.name,
    warrantyMonths: months,
    warrantyEndsAt,
    underWarranty: isUnderWarranty(warrantyEndsAt, today),
  };
}

export async function findWarranty(query: WarrantyQuery, now: Date = new Date()): Promise<WarrantyHit[]> {
  const today = algiersDate(now);
  const match: Prisma.OrderWhereInput[] = [];
  if (query.phone !== undefined) match.push({ phone: query.phone });
  if (query.order !== undefined) match.push({ number: query.order });
  const items = await prisma.orderItem.findMany({
    where: { ...warrantyItemWhere, order: { status: { in: [...HANDED_OVER] }, OR: match } },
    orderBy: [{ order: { createdAt: "desc" } }, { id: "desc" }],
    take: 50,
    select: ITEM,
  });
  return items.map((item) => warrantyOf(item, today));
}

// L'article d'origine d'une fiche, s'il ouvre bien une garantie ; sinon null.
export async function findWarrantyItem(itemId: number) {
  return prisma.orderItem.findFirst({ where: { ...warrantyItemWhere, id: itemId }, select: ITEM });
}
