import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { STATUS_LABELS, type Status } from "./repairRules.js";

// Tout ce qui touche au stock de pièces ou à l'état d'une fiche se passe DANS une transaction, sur des lignes
// verrouillées (`FOR UPDATE`) : deux gestes en même temps sur la même pièce ou la même fiche passent l'un après
// l'autre, jamais ensemble. Ordre des verrous : la fiche d'abord, puis ses pièces par numéro croissant, pour que
// deux fiches qui veulent les mêmes pièces ne s'attendent pas en rond.
export type LockedRepair = {
  id: number;
  number: number;
  status: Status;
  underWarranty: boolean;
  laborPrice: number | null;
};

export async function lockRepair(tx: Prisma.TransactionClient, id: number): Promise<LockedRepair> {
  const [row] = await tx.$queryRaw<{ id: number; number: number; status: Status; under_warranty: boolean; labor_price: number | null }[]>`
    SELECT id, number, status::text AS status, under_warranty, labor_price FROM repairs WHERE id = ${id} FOR UPDATE`;
  if (!row) {
    throw new AppError(404, "Fiche de réparation introuvable");
  }
  return { id: row.id, number: row.number, status: row.status, underWarranty: row.under_warranty, laborPrice: row.labor_price };
}

export type LockedPart = { id: number; name: string; stock: number; purchasePrice: number; salePrice: number };

export async function lockPartRow(tx: Prisma.TransactionClient, id: number): Promise<LockedPart> {
  const [row] = await tx.$queryRaw<{ id: number; name: string; stock: number; purchase_price: number; sale_price: number }[]>`
    SELECT id, name, stock, purchase_price, sale_price FROM parts WHERE id = ${id} FOR UPDATE`;
  if (!row) {
    throw new AppError(404, "Pièce introuvable");
  }
  return { id: row.id, name: row.name, stock: row.stock, purchasePrice: row.purchase_price, salePrice: row.sale_price };
}

export const insufficientStock = (name: string, stock: number, needed: number) =>
  new AppError(409, `Stock insuffisant : « ${name} » (il en reste ${stock}, il en faut ${needed})`);

// Fait bouger le stock d'une pièce de `delta` (négatif : une sortie) et l'écrit dans le journal. Refuse, en
// nommant la pièce, un stock qui deviendrait négatif. `needed` est ce que l'appelant voulait sortir en tout.
export async function moveStock(
  tx: Prisma.TransactionClient,
  input: { partId: number; delta: number; repair: Pick<LockedRepair, "id" | "number">; userId: number },
  needed: number = -input.delta,
) {
  const part = await lockPartRow(tx, input.partId);
  const stock = part.stock + input.delta;
  if (stock < 0) {
    throw insufficientStock(part.name, part.stock, needed);
  }
  await tx.part.update({ where: { id: part.id }, data: { stock } });
  await tx.partMovement.create({
    data: {
      partId: part.id,
      kind: input.delta < 0 ? "repair" : "repair_return",
      delta: input.delta,
      stockAfter: stock,
      userId: input.userId,
      repairId: input.repair.id,
      note: `R-${input.repair.number}`,
    },
  });
}

// Le changement d'étape, écrit avec son auteur (le suivi du client lira ces dates).
export async function setStatus(tx: Prisma.TransactionClient, repairId: number, status: Status, userId: number) {
  await tx.repair.update({ where: { id: repairId }, data: { status } });
  await tx.repairEvent.create({ data: { repairId, status, userId } });
}

// Hors garantie, tout ce qui change le prix pendant la réparation (une pièce, la main-d'œuvre) demande un nouvel
// accord du client : la fiche revient à « Devis à valider » (cahier §14). Sous garantie rien ne change : le
// client ne paie rien.
export async function afterQuoteChange(tx: Prisma.TransactionClient, repair: LockedRepair, userId: number) {
  if (repair.status === "in_repair" && !repair.underWarranty) {
    await setStatus(tx, repair.id, "quote", userId);
  }
}

// Les étapes où l'on peut encore changer les pièces d'une fiche.
export const EDITABLE: Status[] = ["received", "quote", "in_repair"];

export function assertEditable(repair: LockedRepair) {
  if (!EDITABLE.includes(repair.status)) {
    throw new AppError(409, `Les pièces ne changent plus : la réparation est « ${STATUS_LABELS[repair.status]} »`);
  }
}
