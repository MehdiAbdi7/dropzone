import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { getRepair } from "./repair.service.js";
import { afterQuoteChange, assertEditable, insufficientStock, lockPartRow, lockRepair, moveStock } from "./repairStock.js";

// Les pièces d'une fiche (18/11, étape 2). Le prix et le nom de la pièce sont COPIÉS sur la ligne : changer la
// pièce après ne change jamais une réparation. Une ligne n'est « sortie » (`consumed`) que quand la fiche passe En
// réparation ; une fiche déjà En réparation sort ses nouvelles pièces tout de suite, et chaque changement d'une
// ligne sortie ajuste le stock de la différence.
const MAX_QUANTITY = 100;

export async function addLine(repairId: number, input: { partId: number; quantity: number }, userId: number) {
  await prisma.$transaction(async (tx) => {
    const repair = await lockRepair(tx, repairId);
    assertEditable(repair);
    const part = await lockPartRow(tx, input.partId);

    const existing = await tx.repairPart.findUnique({ where: { repairId_partId: { repairId, partId: part.id } } });
    const quantity = (existing?.quantity ?? 0) + input.quantity;
    if (quantity > MAX_QUANTITY) {
      throw new AppError(400, `${MAX_QUANTITY} pièces au plus par ligne`);
    }

    // Ce qui doit exister en stock pour ajouter : toute la ligne si elle n'est pas encore sortie, sinon seulement
    // l'ajout (le reste est déjà sorti).
    const needed = existing?.consumed ? input.quantity : quantity;
    if (part.stock < needed) {
      throw part.stock === 0 ? new AppError(409, `Pièce épuisée : « ${part.name} »`) : insufficientStock(part.name, part.stock, needed);
    }

    // En réparation, tout est déjà sorti : la nouvelle pièce l'est aussi.
    const consumed = repair.status === "in_repair" || (existing?.consumed ?? false);
    if (existing) {
      await tx.repairPart.update({ where: { id: existing.id }, data: { quantity } });
    } else {
      await tx.repairPart.create({
        data: { repairId, partId: part.id, name: part.name, quantity, unitCost: part.purchasePrice, unitPrice: part.salePrice, consumed },
      });
    }
    if (consumed) {
      await moveStock(tx, { partId: part.id, delta: -input.quantity, repair, userId });
    }
    await afterQuoteChange(tx, repair, userId);
  });
  return getRepair(repairId);
}

async function lockedLine(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], repairId: number, lineId: number) {
  const line = await tx.repairPart.findFirst({ where: { id: lineId, repairId } });
  if (!line) {
    throw new AppError(404, "Pièce introuvable sur cette fiche");
  }
  return line;
}

export async function updateLine(repairId: number, lineId: number, quantity: number, userId: number) {
  await prisma.$transaction(async (tx) => {
    const repair = await lockRepair(tx, repairId);
    assertEditable(repair);
    const line = await lockedLine(tx, repairId, lineId);
    const part = await lockPartRow(tx, line.partId);
    const difference = quantity - line.quantity;

    if (line.consumed) {
      if (difference !== 0) {
        await moveStock(tx, { partId: line.partId, delta: -difference, repair, userId });
      }
    } else if (quantity > part.stock) {
      throw insufficientStock(line.name, part.stock, quantity);
    }
    await tx.repairPart.update({ where: { id: line.id }, data: { quantity } });
    await afterQuoteChange(tx, repair, userId);
  });
  return getRepair(repairId);
}

export async function removeLine(repairId: number, lineId: number, userId: number) {
  await prisma.$transaction(async (tx) => {
    const repair = await lockRepair(tx, repairId);
    assertEditable(repair);
    const line = await lockedLine(tx, repairId, lineId);
    if (line.consumed) {
      await moveStock(tx, { partId: line.partId, delta: line.quantity, repair, userId });
    }
    await tx.repairPart.delete({ where: { id: line.id } });
    await afterQuoteChange(tx, repair, userId);
  });
  return getRepair(repairId);
}
