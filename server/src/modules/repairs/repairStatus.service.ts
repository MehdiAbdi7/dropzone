import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { getRepair } from "./repair.service.js";
import { hasQuote, nextStatuses, STATUS_LABELS, type Status } from "./repairRules.js";
import { lockRepair, moveStock, setStatus } from "./repairStock.js";

// Les étapes d'une fiche et sa suppression (18/11, étape 2). Chaque geste verrouille la fiche : un second envoi du
// même passage attend le premier, puis voit une étape qui ne le permet plus et se fait refuser.

export async function changeStatus(repairId: number, target: Status, userId: number) {
  await prisma.$transaction(async (tx) => {
    const repair = await lockRepair(tx, repairId);

    if (target === "quote" && repair.underWarranty && repair.status === "received") {
      throw new AppError(400, "Sous garantie : pas de devis");
    }
    if (!nextStatuses(repair.status, repair.underWarranty).includes(target)) {
      throw new AppError(409, `Passage impossible de « ${STATUS_LABELS[repair.status]} » à « ${STATUS_LABELS[target]} »`);
    }

    const lines = await tx.repairPart.findMany({ where: { repairId }, orderBy: { partId: "asc" } });
    // Hors garantie, le client ne peut ni valider ni accepter un prix qui n'existe pas encore.
    if ((target === "quote" || target === "in_repair") && !repair.underWarranty && !hasQuote(repair.laborPrice, lines.length)) {
      throw new AppError(400, "Fixez le devis avant de le proposer au client");
    }

    // Les pièces sortent du stock à « En réparation » : toutes, ou aucune (la transaction s'annule au premier manque).
    if (target === "in_repair") {
      for (const line of lines.filter((candidate) => !candidate.consumed)) {
        await moveStock(tx, { partId: line.partId, delta: -line.quantity, repair, userId });
        await tx.repairPart.update({ where: { id: line.id }, data: { consumed: true } });
      }
    }
    // Un devis refusé ne garde aucune pièce sortie : celles déjà sorties reviennent au stock.
    if (target === "to_return") {
      await returnConsumedLines(tx, repair, lines, userId);
      // La main-d'œuvre du devis refusé ne sera pas due : des frais de diagnostic seront une saisie voulue.
      await tx.repair.update({ where: { id: repairId }, data: { laborPrice: null } });
    }
    await setStatus(tx, repairId, target, userId);
  });
  return getRepair(repairId);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function returnConsumedLines(
  tx: Tx,
  repair: { id: number; number: number },
  lines: { id: number; partId: number; quantity: number; consumed: boolean }[],
  userId: number,
) {
  for (const line of lines.filter((candidate) => candidate.consumed)) {
    await moveStock(tx, { partId: line.partId, delta: line.quantity, repair, userId });
    await tx.repairPart.update({ where: { id: line.id }, data: { consumed: false } });
  }
}

// Supprimer une fiche non rendue : ses pièces sorties reviennent au stock, le journal des pièces garde le
// mouvement (avec le numéro de la fiche). Une fiche rendue se corrige avec l'argent, à l'étape 3.
export async function deleteRepair(repairId: number, userId: number) {
  await prisma.$transaction(async (tx) => {
    const repair = await lockRepair(tx, repairId);
    if (repair.status === "returned") {
      throw new AppError(409, "Cette réparation est rendue : elle ne se supprime pas");
    }
    const lines = await tx.repairPart.findMany({ where: { repairId }, orderBy: { partId: "asc" } });
    await returnConsumedLines(tx, repair, lines, userId);
    await tx.repair.delete({ where: { id: repairId } });
  });
  return { ok: true };
}
